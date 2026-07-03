/**
 * @module signals
 *
 * High-level reactive primitives built on top of the low-level graph engine in
 * `./system`.
 *
 * The API surface intentionally mirrors alien-signals but extends it with
 * first-class **cleanup support** via {@link onCleanup}.
 *
 * ### Primitives
 * | Export | Role |
 * |--------|------|
 * | {@link signal}      | Mutable reactive value. |
 * | {@link computed}    | Derived, lazily-evaluated value. |
 * | {@link effect}      | Side-effect that re-runs when its deps change. |
 * | {@link effectScope} | Ownership scope that groups and disposes nested effects together. |
 * | {@link onCleanup}   | Register a teardown callback inside the currently running effect. |
 * | {@link batch}       | Defer flush until all synchronous mutations are done. |
 * | {@link untracked}   | Read signals without creating dependency links. |
 * | {@link trigger}     | Manually re-trigger subscribers of signals read inside `fn`. |
 *
 * ### Cleanup model
 * `onCleanup(fn)` registers a callback that fires:
 * 1. **Before each re-run** – so resources set up in the previous run are torn
 *    down before the effect body executes again.
 * 2. **On disposal** – whether the effect is stopped explicitly (calling the
 *    handle returned by `effect()`) or implicitly (an owning `effectScope` is
 *    disposed, cascading through all nested effects).
 *
 * Because `onCleanup` reads `activeSub` (the same module-level variable that
 * signals use for dependency tracking), it works correctly when called from
 * deeply nested helper functions during effect execution – no prop-drilling
 * required.
 */

import type { Computed, Updater } from "./index.ts";
import {
  createReactiveSystem,
  ReactiveFlags,
  type ReactiveNode,
} from "./system.js";

// ---------------------------------------------------------------------------
// Internal node types
// ---------------------------------------------------------------------------

/**
 * Internal shape of an effect node.
 * Extends {@link ReactiveNode} with the user function and an optional cleanup
 * callback registered via {@link onCleanup}.
 * @internal
 */
interface EffectNode extends ReactiveNode {
  /** The user-supplied side-effect function. */
  fn(): void;
  /**
   * Cleanup callbacks registered during the most recent execution of `fn` via
   * {@link onCleanup}.  Cleared to `undefined` immediately before they are
   * called so that re-entrant or recursive scenarios are safe.
   */
  onCleanup?: (() => void)[];
}

/**
 * Internal shape of a computed node.
 * @internal
 */
interface ComputedNode<T = any> extends ReactiveNode {
  value: T | undefined;
  getter: (previousValue?: T) => T;
  onCleanup?: (() => void)[];
}

/**
 * Internal shape of a signal node.
 * @internal
 */
interface SignalNode<T = any> extends ReactiveNode {
  currentValue: T;
  pendingValue: T;
}

// ---------------------------------------------------------------------------
// Module-level scheduler state
// ---------------------------------------------------------------------------

/**
 * Marks a parent (effect or scope) whose deps include at least one child
 * effect or child scope. Gates the dispose-children-first slow path in
 * `run` / `updateComputed` so leaf effects pay no extra cost.
 *
 * The bit lives outside the {@link ReactiveFlags} range and is never read by
 * `system.ts`.
 * @internal
 */
const HasChildEffect = 64;

/** Monotonically increasing counter; incremented on each tracking run to stamp links. */
let cycle = 0;
/**
 * Depth counter for nested effect / re-run frames. Used to gate
 * `innerWrite` propagation so that a write occurring inside an effect's
 * own run marks downstream subscribers `Recursed | Pending` instead of
 * just `Pending`.
 */
let runDepth = 0;
/** Depth counter for nested `batch` calls; flush is deferred while > 0. */
let batchDepth = 0;
/** Read cursor into the `queued` array during flush. */
let notifyIndex = 0;
/** Write cursor into the `queued` array (logical length of the queue). */
let queuedLength = 0;
/**
 * The currently executing subscriber (effect, computed, or effectScope).
 * Signals read while `activeSub !== undefined` automatically register a dep
 * link back to this node.
 */
let activeSub: ReactiveNode | undefined;
/**
 * The innermost effect or effectScope that owns the current execution frame.
 * Unlike `activeSub`, this is **not** cleared by `untracked`, so `onCleanup`
 * can be called from inside an untracked block and still register correctly.
 */
let activeOwner: ReactiveNode | undefined;

/** Ring-buffer of effects waiting to be flushed. */
const queued: (EffectNode | undefined)[] = [];

// ---------------------------------------------------------------------------
// Symbols for type-guard checking on bound handles
// ---------------------------------------------------------------------------

export const SIGNAL = Symbol("signal");
export const COMPUTED = Symbol("computed");
export const EFFECT = Symbol("effect");
export const EFFECT_SCOPE = Symbol("effectScope");

// ---------------------------------------------------------------------------
// Reactive system wiring
// ---------------------------------------------------------------------------

const { link, unlink, propagate, checkDirty, shallowPropagate } =
  createReactiveSystem({
    /**
     * Called by the graph engine when a Mutable+Dirty node needs to recompute.
     * Dispatches by tagged property:
     *
     * - `'getter' in node`     → computed: delegate to `updateComputed`.
     * - `'currentValue' in node` → signal: delegate to `updateSignal`.
     * - else                    → effectScope: mark `Mutable` and report
     *   "changed", so any parent effect re-evaluates as if the scope itself
     *   propagated.
     */
    update(node: SignalNode | ComputedNode | ReactiveNode): boolean {
      if ("getter" in node) {
        return updateComputed(node as ComputedNode);
      }
      if ("currentValue" in node) {
        return updateSignal(node as SignalNode);
      }
      node.flags = ReactiveFlags.Mutable;
      return true;
    },

    /**
     * Called when an effect node is notified that one of its deps is dirty.
     * Inserts the effect into the flush queue in dependency order (parents
     * before children) so that effects always run in topological order.
     */
    notify(effect: EffectNode) {
      let insertIndex = queuedLength;
      let firstInsertedIndex = insertIndex;

      do {
        queued[insertIndex++] = effect;
        effect.flags &= ~ReactiveFlags.Watching;
        effect = effect.subs?.sub as EffectNode;
        if (effect === undefined || !(effect.flags & ReactiveFlags.Watching)) {
          break;
        }
      } while (true);

      queuedLength = insertIndex;

      // Reverse the newly inserted slice so parent effects run before children.
      while (firstInsertedIndex < --insertIndex) {
        const left = queued[firstInsertedIndex];
        queued[firstInsertedIndex++] = queued[insertIndex];
        queued[insertIndex] = left;
      }
    },

    /**
     * Called when a dep node loses its last subscriber.
     *
     * Dispatch by tagged property:
     *
     * - **computed** (`'getter' in node`): if it had deps, reset to Dirty so
     *   it recomputes lazily if a new subscriber appears later. Cleanups
     *   registered via {@link onCleanup} during the previous run are flushed
     *   (outside any tracking context). Child effects/scopes created in the
     *   getter are released in LIFO order via {@link disposeAllDepsInReverse}.
     * - **signal** (`'currentValue' in node`): no-op. Signals stay live so a
     *   future subscriber can read the latest value.
     * - **effect** (`'fn' in node`): cascade-dispose via `effectOper`
     *   (children first, then own cleanup).
     * - **effectScope** (else): cascade-dispose via `effectScopeOper`.
     */
    unwatched(node) {
      if ("getter" in node) {
        const c = node as ComputedNode;
        if (c.depsTail !== undefined) {
          if (c.onCleanup !== undefined) {
            const fns = c.onCleanup;
            c.onCleanup = undefined;
            untracked(() => {
              for (const fn of fns) fn();
            });
          }
          c.flags = ReactiveFlags.Mutable | ReactiveFlags.Dirty;
          disposeAllDepsInReverse(c);
        }
      } else if ("currentValue" in node) {
        // Signals stay live until something else disposes them.
      } else if ("fn" in node) {
        effectOper.call(node as EffectNode);
      } else {
        effectScopeOper.call(node);
      }
    },
  });

// ---------------------------------------------------------------------------
// Public API – scheduler utilities
// ---------------------------------------------------------------------------

/**
 * Returns the currently active subscriber node, or `undefined` when no
 * tracking context is active.
 *
 * Useful for low-level integrations that need to inspect or extend the active
 * tracking context.
 */
export function getActiveSub(): ReactiveNode | undefined {
  return activeSub;
}

/**
 * Replaces the active subscriber with `sub` and returns the previous value.
 *
 * Always restore the previous value in a `finally` block:
 *
 * ```ts
 * const prev = setActiveSub(myNode);
 * try { ... } finally { setActiveSub(prev); }
 * ```
 */
export function setActiveSub(sub?: ReactiveNode) {
  const prevSub = activeSub;
  activeSub = sub;
  return prevSub;
}

/**
 * Returns the current batch nesting depth.
 * A value greater than zero means a flush is deferred.
 */
export function getBatchDepth(): number {
  return batchDepth;
}

/**
 * Increments the batch depth, deferring effect flush until `endBatch` is
 * called a matching number of times.
 *
 * Prefer {@link batch} over calling `startBatch` / `endBatch` directly.
 */
export function startBatch() {
  ++batchDepth;
}

/**
 * Decrements the batch depth and flushes the effect queue when the depth
 * reaches zero.
 *
 * Prefer {@link batch} over calling `startBatch` / `endBatch` directly.
 */
export function endBatch() {
  if (!--batchDepth) {
    flush();
  }
}

// ---------------------------------------------------------------------------
// Public API – type guards
// ---------------------------------------------------------------------------

/**
 * Returns `true` if `fn` is a signal handle created by {@link signal}.
 *
 * Relies on the SIGNAL symbol.
 */
export function isSignal(fn: unknown): boolean {
  return fn != null && (fn as any)[SIGNAL] === true;
}

/**
 * Returns `true` if `fn` is a computed handle created by {@link computed}.
 *
 * Relies on the COMPUTED symbol.
 */
export function isComputed(fn: unknown): boolean {
  return fn != null && (fn as any)[COMPUTED] === true;
}

/**
 * Returns `true` if `fn` is an effect cleanup handle created by {@link effect}.
 *
 * Relies on the EFFECT symbol.
 */
export function isEffect(fn: unknown): boolean {
  return fn != null && (fn as any)[EFFECT] === true;
}

/**
 * Returns `true` if `fn` is an effectScope cleanup handle created by
 * {@link effectScope}.
 *
 * Relies on `Function.name` matching the internal `effectScopeOper` function name.
 */
export function isEffectScope(fn: () => void): boolean {
  return fn.name === "bound " + effectScopeOper.name;
}

// ---------------------------------------------------------------------------
// Public API – reactive primitives
// ---------------------------------------------------------------------------

/**
 * Creates a mutable reactive signal.
 *
 * - **Read**: call with no arguments → returns the current value and
 *   subscribes the active tracking context.
 * - **Write**: call with a value → updates the signal and schedules
 *   downstream effects if the value changed.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * count();        // → 0  (read)
 * count(1);       // write – effects depending on count will re-run
 * count();        // → 1
 * ```
 */
export function signal<T>(): Updater<T> & Computed<T>;
export function signal<T>(initialValue: T): Updater<T> & Computed<T>;
export function signal<T>(initialValue?: T): {
  (): T | undefined;
  (value: T | undefined): void;
} {
  const handle = signalOper.bind({
    currentValue: initialValue,
    pendingValue: initialValue,
    subs: undefined,
    subsTail: undefined,
    flags: ReactiveFlags.Mutable,
  }) as () => T | undefined;
  Object.defineProperty(handle, SIGNAL, { value: true });
  return handle;
}
/**
 * Creates a lazily-evaluated computed value.
 *
 * The `getter` is only called when the computed value is read **and** one of
 * its dependencies has changed since the last evaluation.  If nothing has
 * changed the cached `value` is returned without re-running `getter`.
 *
 * Computed values are read-only; they cannot be set directly.
 *
 * @param getter - Pure function deriving a value from other reactive sources.
 *                 Receives the previous value as an optional optimisation hint.
 *
 * @example
 * ```ts
 * const a = signal(1);
 * const b = signal(2);
 * const sum = computed(() => a() + b());
 *
 * sum(); // → 3
 * a(10);
 * sum(); // → 12  (re-evaluated lazily)
 * ```
 */
export function computed<T>(getter: (previousValue?: T) => T): () => T {
  const handle = computedOper.bind({
    value: undefined,
    subs: undefined,
    subsTail: undefined,
    deps: undefined,
    depsTail: undefined,
    flags: ReactiveFlags.None,
    getter: getter as (previousValue?: unknown) => unknown,
  }) as () => T;
  Object.defineProperty(handle, COMPUTED, { value: true });
  return handle;
}

/**
 * Creates a reactive side-effect that runs immediately and re-runs whenever
 * any signal or computed it read during its last execution changes.
 *
 * Use {@link onCleanup} inside `fn` to register teardown logic that runs
 * before each re-execution and on final disposal.
 *
 * If `effect` is called inside an `effectScope` or another `effect`, the
 * new effect is automatically owned by the outer scope and will be disposed
 * when the scope is disposed.
 *
 * @param fn - The side-effect body.  Reactive reads inside this function
 *             establish dependency links.
 * @returns A disposal function.  Call it to stop the effect and run any
 *          registered cleanup.
 *
 * @example
 * ```ts
 * const url = signal('/api/data');
 *
 * const stop = effect(() => {
 *   const controller = new AbortController();
 *   fetch(url(), { signal: controller.signal });
 *   onCleanup(() => controller.abort());
 * });
 *
 * url('/api/other'); // previous fetch is aborted, new one starts
 * stop();            // final cleanup: abort the last fetch
 * ```
 */
let inertEffects = false;

/**
 * Toggle inert-effect mode. While inert, `effect()` neither executes its body
 * nor tracks dependencies — it returns a no-op stop function. Used by the
 * server renderer: a server render is a one-shot snapshot, effects are
 * client-only. Returns the previous flag so callers can restore it.
 */
export function setInertEffects(value: boolean): boolean {
  const prev = inertEffects;
  inertEffects = value;
  return prev;
}

const inertStop = (): void => {};

export function effect(fn: () => void): () => void {
  if (inertEffects) return inertStop;
  const e: EffectNode = {
    fn,
    subs: undefined,
    subsTail: undefined,
    deps: undefined,
    depsTail: undefined,
    flags: ReactiveFlags.Watching | ReactiveFlags.RecursedCheck,
  };
  const prevSub = setActiveSub(e);
  const prevOwner = activeOwner;
  activeOwner = e;
  if (prevSub !== undefined) {
    link(e, prevSub, 0);
    prevSub.flags |= HasChildEffect;
  }
  try {
    ++runDepth;
    e.fn();
  } finally {
    --runDepth;
    activeSub = prevSub;
    activeOwner = prevOwner;
    e.flags &= ~ReactiveFlags.RecursedCheck;
  }
  const handle = effectOper.bind(e);
  Object.defineProperty(handle, EFFECT, { value: true });
  return handle;
}

/**
 * Creates an ownership scope that groups reactive effects so they can all be
 * disposed at once.
 *
 * Effects and nested scopes created inside `fn` are linked to this scope.
 * When the returned disposal function is called, all owned effects are stopped
 * in cascade – triggering their registered {@link onCleanup} callbacks – and
 * the scope itself is removed from any parent scope that owns it.
 *
 * @param fn - Synchronous setup function.  Create effects and nested scopes
 *             here.
 * @returns A disposal function that tears down all owned effects and the scope
 *          itself.
 *
 * @example
 * ```ts
 * const stopAll = effectScope(() => {
 *   effect(() => console.log('a:', a()));
 *   effect(() => console.log('b:', b()));
 * });
 *
 * stopAll(); // both effects stopped simultaneously
 * ```
 */
export function effectScope(fn: () => void): () => void {
  const e: ReactiveNode = {
    deps: undefined,
    depsTail: undefined,
    subs: undefined,
    subsTail: undefined,
    // `Mutable` so the scope participates in propagation — when a signal /
    // computed inside the scope is read, the scope's parent subscribers
    // (i.e. an enclosing effect) get notified through us.
    flags: ReactiveFlags.Mutable,
  };
  const prevSub = setActiveSub(e);
  const prevOwner = activeOwner;
  activeOwner = e;
  if (prevSub !== undefined) {
    link(e, prevSub, 0);
    prevSub.flags |= HasChildEffect;
  }
  try {
    fn();
  } finally {
    activeSub = prevSub;
    activeOwner = prevOwner;
  }
  const handle = effectScopeOper.bind(e);
  Object.defineProperty(handle, EFFECT_SCOPE, { value: true });
  return handle;
}

/**
 * Registers a cleanup callback for the currently executing effect or scope.
 *
 * The callback will be called:
 * 1. **Before the next re-run** of the enclosing effect (so resources from
 *    the previous run are released before the new run sets them up again).
 * 2. **On final disposal** of the effect, whether triggered explicitly by
 *    calling the effect's cleanup handle or implicitly by an owning
 *    `effectScope` being disposed.
 *
 * Calling `onCleanup` outside of a tracking context (no active effect) is a
 * no-op; it does **not** throw.
 *
 * Only one cleanup function per effect run is supported.  Calling `onCleanup`
 * multiple times within the same run overwrites the previous registration.
 *
 * @param fn - The teardown callback.
 *
 * @example
 * ```ts
 * effect(() => {
 *   const id = setInterval(() => tick(), 1000);
 *   onCleanup(() => clearInterval(id));
 * });
 * ```
 *
 * @example Composable helper – no prop-drilling needed:
 * ```ts
 * function useEventListener(target: EventTarget, type: string, handler: EventListener) {
 *   target.addEventListener(type, handler);
 *   onCleanup(() => target.removeEventListener(type, handler));
 * }
 *
 * effect(() => {
 *   useEventListener(window, 'resize', onResize);
 * });
 * ```
 */
export function onCleanup(fn: () => void): void {
  if (activeOwner !== undefined) {
    const node = activeOwner as EffectNode | ComputedNode;
    if (node.onCleanup === undefined) {
      node.onCleanup = [fn];
    } else {
      node.onCleanup.push(fn);
    }
  }
}

/**
 * Runs `fn` as a single atomic update: all signal writes inside `fn` are
 * collected and effects are flushed only once after `fn` returns, rather than
 * after each individual write.
 *
 * Batches can be nested; the flush only occurs when the outermost batch
 * completes.
 *
 * @example
 * ```ts
 * batch(() => {
 *   x(1);
 *   y(2);
 *   z(3);
 * }); // effects that depend on x, y, or z run once here
 * ```
 */
export function batch(fn: () => void): void {
  startBatch();
  try {
    fn();
  } finally {
    endBatch();
  }
}

/**
 * Executes `fn` in a non-tracking context: any signals read inside `fn` do
 * **not** create dependency links on the currently active subscriber.
 *
 * Useful when you need to read a signal's current value without subscribing to
 * future changes.
 *
 * @returns The value returned by `fn`.
 *
 * @example
 * ```ts
 * const logCount = effect(() => {
 *   console.log('triggered by a:', a());
 *   // read b without subscribing – effect won't re-run when b changes
 *   console.log('current b:', untracked(b));
 * });
 * ```
 */
export function untracked<T>(fn: Computed<T>): T {
  const prev = setActiveSub(undefined);
  try {
    return fn();
  } finally {
    setActiveSub(prev);
  }
}

/**
 * Manually triggers all subscribers of every signal read inside `fn`.
 *
 * Unlike writing to a signal, `trigger` does not change the signal's value; it
 * only forces downstream effects and computeds to re-evaluate.
 *
 * @param fn - Function whose reactive reads identify the signals to trigger.
 *
 * @example
 * ```ts
 * const items = signal([1, 2, 3]);
 *
 * // Mutate in place (referential equality won't detect the change):
 * items().push(4);
 * trigger(items); // manually notify subscribers
 * ```
 */
export function trigger<T = void>(fn: Computed<T>) {
  return untracked(() => {
    const sub: ReactiveNode = {
      deps: undefined,
      depsTail: undefined,
      flags: ReactiveFlags.Watching,
    };
    const prevSub = setActiveSub(sub);
    try {
      fn();
    } finally {
      activeSub = prevSub;
      sub.flags = ReactiveFlags.None;
      let link = sub.deps;
      while (link !== undefined) {
        const dep = link.dep;
        link = unlink(link, sub);
        const subs = dep.subs;
        if (subs !== undefined) {
          propagate(subs, !!runDepth);
          shallowPropagate(subs);
        }
      }
      if (!batchDepth) {
        flush();
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Internal – node updaters
// ---------------------------------------------------------------------------

/**
 * Recomputes a computed node and returns whether its value changed.
 * Called by the graph engine's `update` callback and by `computedOper` itself.
 * @internal
 */
function updateComputed(c: ComputedNode): boolean {
  ++cycle;

  // If the previous evaluation created child effects/scopes, dispose them
  // in reverse creation order BEFORE running the getter and BEFORE the
  // computed's own cleanup. This matches the LIFO disposal contract.
  if (c.flags & HasChildEffect) {
    let l = c.depsTail;
    while (l !== undefined) {
      const prev = l.prevDep;
      const dep = l.dep;
      if (!("getter" in dep) && !("currentValue" in dep)) {
        unlink(l, c);
      }
      l = prev;
    }
  }

  if (c.onCleanup !== undefined) {
    const cleanups = c.onCleanup;
    c.onCleanup = undefined;
    untracked(() => {
      for (const fn of cleanups) fn();
    });
  }

  c.depsTail = undefined;
  c.flags = ReactiveFlags.Mutable | ReactiveFlags.RecursedCheck;
  const prevSub = setActiveSub(c);
  const prevOwner = activeOwner;
  activeOwner = c as unknown as ReactiveNode;
  try {
    const oldValue = c.value;
    return oldValue !== (c.value = c.getter(oldValue));
  } finally {
    activeSub = prevSub;
    activeOwner = prevOwner;
    c.flags &= ~ReactiveFlags.RecursedCheck;
    purgeDeps(c);
  }
}

/**
 * Commits a signal's pending value to its current value.
 * Returns `true` if the value actually changed.
 * @internal
 */
function updateSignal(s: SignalNode): boolean {
  s.flags = ReactiveFlags.Mutable;
  return s.currentValue !== (s.currentValue = s.pendingValue);
}

/**
 * Executes an effect node if it is dirty or pending-dirty.
 *
 * Before re-running the effect body, any cleanup registered during the
 * previous run is called and cleared.
 *
 * @internal
 */
function run(e: EffectNode): void {
  const flags = e.flags;
  if (
    flags & ReactiveFlags.Dirty ||
    (flags & ReactiveFlags.Pending && checkDirty(e.deps!, e))
  ) {
    ++cycle;

    // Dispose any child effects/scopes in reverse creation order BEFORE
    // running the previous-run cleanup or the new body. Their own
    // `effectOper` invocations cascade into their cleanups too.
    if (flags & HasChildEffect) {
      let l = e.depsTail;
      while (l !== undefined) {
        const prev = l.prevDep;
        const dep = l.dep;
        if (!("getter" in dep) && !("currentValue" in dep)) {
          unlink(l, e);
        }
        l = prev;
      }
    }

    // Run and clear any cleanup from the previous execution before re-running.
    if (e.onCleanup !== undefined) {
      const cleanups = e.onCleanup;
      e.onCleanup = undefined;
      untracked(() => {
        for (const fn of cleanups) fn();
      });
    }

    e.depsTail = undefined;
    e.flags = ReactiveFlags.Watching | ReactiveFlags.RecursedCheck;
    const prevSub = setActiveSub(e);
    const prevOwner = activeOwner;
    activeOwner = e;
    try {
      ++runDepth;
      e.fn();
    } finally {
      --runDepth;
      activeSub = prevSub;
      activeOwner = prevOwner;
      e.flags &= ~ReactiveFlags.RecursedCheck;
      purgeDeps(e);
    }
  } else if (e.deps !== undefined) {
    // Restore Watching when the effect was touched by the notify chain but
    // no dep is actually dirty. Preserve the HasChildEffect bit so a real
    // re-run later still enters the slow path.
    e.flags = ReactiveFlags.Watching | (flags & HasChildEffect);
  }
}

/**
 * Drains the queued-effects array, running each effect in order.
 *
 * If an effect throws, remaining effects are marked `Recursed | Watching` (so
 * they will retry next time) and the scheduler resets cleanly.
 *
 * @internal
 */
function flush(): void {
  try {
    while (notifyIndex < queuedLength) {
      const effect = queued[notifyIndex]!;
      queued[notifyIndex++] = undefined;
      run(effect);
    }
  } finally {
    while (notifyIndex < queuedLength) {
      const effect = queued[notifyIndex]!;
      queued[notifyIndex++] = undefined;
      effect.flags |= ReactiveFlags.Watching | ReactiveFlags.Recursed;
    }
    notifyIndex = 0;
    queuedLength = 0;
  }
}

// ---------------------------------------------------------------------------
// Internal – operation functions (bound to node objects as closures)
// ---------------------------------------------------------------------------

/**
 * The bound operation function for computed nodes.
 *
 * On read:
 * 1. Checks whether the node is dirty (or pending-dirty via `checkDirty`).
 * 2. Recomputes via `updateComputed` if needed, propagating to subscribers if
 *    the value changed.
 * 3. Links `this` to the current `activeSub` so future writes propagate here.
 *
 * @internal
 */
function computedOper<T>(this: ComputedNode<T>): T {
  const flags = this.flags;
  if (
    flags & ReactiveFlags.Dirty ||
    (flags & ReactiveFlags.Pending &&
      (checkDirty(this.deps!, this) ||
        ((this.flags = flags & ~ReactiveFlags.Pending), false)))
  ) {
    if (updateComputed(this)) {
      const subs = this.subs;
      if (subs !== undefined) {
        shallowPropagate(subs);
      }
    }
  } else if (!flags) {
    // First read: no deps yet, compute eagerly and start tracking.
    this.flags = ReactiveFlags.Mutable | ReactiveFlags.RecursedCheck;
    const prevSub = setActiveSub(this);
    const prevOwner = activeOwner;
    activeOwner = this as unknown as ReactiveNode;
    try {
      this.value = this.getter();
    } finally {
      activeSub = prevSub;
      activeOwner = prevOwner;
      this.flags &= ~ReactiveFlags.RecursedCheck;
    }
  }
  const sub = activeSub;
  if (sub !== undefined) {
    link(this, sub, cycle);
  }
  return this.value!;
}
/**
 * The bound operation function for signal nodes.
 *
 * - **Read** (no arguments): registers a dep link and returns `currentValue`.
 *   If the signal is dirty (pending write flushed by batch), commits the
 *   pending value first.
 * - **Write** (one argument): stages the new value as `pendingValue` and, if
 *   it differs from the current pending value, propagates dirtiness and
 *   schedules a flush.
 *
 * @internal
 */
function signalOper<T>(this: SignalNode<T>, ...value: [T]): T | void {
  if (value.length) {
    if (this.pendingValue !== (this.pendingValue = value[0])) {
      this.flags = ReactiveFlags.Mutable | ReactiveFlags.Dirty;
      const subs = this.subs;
      if (subs !== undefined) {
        propagate(subs, !!runDepth);
        if (!batchDepth) {
          flush();
        }
      }
    }
  } else {
    if (this.flags & ReactiveFlags.Dirty) {
      if (updateSignal(this)) {
        const subs = this.subs;
        if (subs !== undefined) {
          shallowPropagate(subs);
        }
      }
    }
    // Scopes are now `Mutable` themselves, so a direct link to `activeSub`
    // suffices — no need to walk up the sub chain looking for a Mutable
    // ancestor.
    const sub = activeSub;
    if (sub !== undefined) {
      link(this, sub, cycle);
    }
    return this.currentValue;
  }
}
/**
 * The bound disposal function for effect nodes.
 *
 * Calls the cleanup registered by the last run of the effect body (if any),
 * then delegates to `effectScopeOper` to release all dep links and unlink
 * the effect from any parent scope.
 *
 * @internal
 */
function effectOper(this: EffectNode): void {
  // Dispose children first (depth-first, reverse creation order), then
  // run this effect's own `onCleanup` callbacks. This keeps the LIFO
  // contract: a child's cleanup sees its parent's state intact, and an
  // outer cleanup runs after every descendant has been torn down.
  effectScopeOper.call(this);
  if (this.onCleanup !== undefined) {
    const cleanups = this.onCleanup;
    this.onCleanup = undefined;
    untracked(() => {
      for (const fn of cleanups) fn();
    });
  }
}

/**
 * The shared disposal implementation for both effect nodes and effectScope
 * nodes.
 *
 * Called directly to dispose an `effectScope` handle, and indirectly via
 * `effectOper` (effect disposal) and the `unwatched` callback (cascade
 * disposal when a parent scope is torn down).
 *
 * Steps:
 * 1. Reset `flags` so the node is inert.
 * 2. Dispose every dep link in **reverse creation order** — child effects /
 *    scopes get their `unwatched` callback fired in LIFO order, which
 *    cascades cleanup through the entire ownership tree.
 * 3. Run and clear any `onCleanup` registered on this node itself (covers
 *    `effectScope(() => { onCleanup(...) })`). For effects this is a no-op:
 *    `effectOper` already drained `onCleanup` after calling us.
 * 4. Unlink from any parent scope's sub-chain.
 *
 * @internal
 */
function effectScopeOper(this: ReactiveNode): void {
  this.flags = ReactiveFlags.None;
  disposeAllDepsInReverse(this);

  const cleanups = (this as EffectNode).onCleanup;
  if (cleanups !== undefined) {
    (this as EffectNode).onCleanup = undefined;
    untracked(() => {
      for (const fn of cleanups) fn();
    });
  }

  const sub = this.subs;
  if (sub !== undefined) {
    unlink(sub);
  }
}

/**
 * Disposes every dep link of `sub` in **reverse creation order**.
 *
 * Used for teardown: child effects and scopes are linked in the order they
 * were created, so walking from `depsTail` back to `deps` releases them
 * LIFO — descendants tear down before their parents.
 *
 * @internal
 */
function disposeAllDepsInReverse(sub: ReactiveNode): void {
  let l = sub.depsTail;
  while (l !== undefined) {
    const prev = l.prevDep;
    unlink(l, sub);
    l = prev;
  }
}

/**
 * Removes stale dep links from `sub` after a tracking run — anything that
 * was present before but not re-linked this run (lives past `depsTail`).
 *
 * Forward walk; used by `updateComputed` / `run` at the end of evaluation.
 * For full teardown, use {@link disposeAllDepsInReverse} instead.
 *
 * @internal
 */
function purgeDeps(sub: ReactiveNode) {
  const depsTail = sub.depsTail;
  let dep = depsTail !== undefined ? depsTail.nextDep : sub.deps;
  while (dep !== undefined) {
    dep = unlink(dep, sub);
  }
}
