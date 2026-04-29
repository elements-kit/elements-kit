import {
  batch,
  effect,
  effectScope,
  isReactive,
  onCleanup,
  signal,
  type Computed,
  type MaybeReactive,
  type Signal,
} from "@/signals/index.ts";

// ─ Types ──────────────────────────────────────────────────────────────────

type Root = Document | ShadowRoot;

interface Entry {
  el: Element | null;
  /** Cached `rootOf(el)` — avoids re-walking on every event. */
  root: Root | null;
  fn: (el: Element) => unknown;
  once: boolean;
  result: Signal<unknown>;
  connected: boolean;
  fired: boolean;
  innerDispose?: () => void;
}

// ─ Registry ───────────────────────────────────────────────────────────────

const observers = new WeakMap<Root, MutationObserver>();
// Element → entries watching it. Stores a single `Entry` directly for the
// common one-watcher-per-element case; promotes to a `Set` only when a
// second `onMount` registers on the same element. Saves one allocation
// per registration in the common path.
const elementIndex = new WeakMap<Element, Entry | Set<Entry>>();
// Closed shadow roots opted in via `observeRoot`. `el.shadowRoot` returns
// `null` for closed mode, so the composed-tree walk consults this registry
// as a fallback to descend into closed shadows owners explicitly registered.
const closedShadowsByHost = new WeakMap<Element, ShadowRoot>();
// Lets us skip the post-disconnect microtask kicker when no cross-root
// reconnect is possible.
let hasObservedShadow = false;

function rootOf(el: Element): Root {
  const r = el.getRootNode();
  return r instanceof ShadowRoot ? r : document;
}

function ensureObserver(root: Root): void {
  if (observers.has(root)) return;
  const obs = new MutationObserver((records) => flush(records));
  obs.observe(root, { childList: true, subtree: true });
  observers.set(root, obs);
  if (root instanceof ShadowRoot) hasObservedShadow = true;
}

function indexAdd(el: Element, entry: Entry): void {
  const found = elementIndex.get(el);
  if (found === undefined) {
    elementIndex.set(el, entry);
  } else if (found instanceof Set) {
    found.add(entry);
  } else if (found !== entry) {
    // Promote single → Set on second registration.
    const s = new Set<Entry>();
    s.add(found);
    s.add(entry);
    elementIndex.set(el, s);
  }
}

function indexRemove(el: Element, entry: Entry): void {
  const found = elementIndex.get(el);
  if (found === undefined) return;
  if (found === entry) {
    elementIndex.delete(el);
  } else if (found instanceof Set) {
    found.delete(entry);
    if (found.size === 0) elementIndex.delete(el);
  }
}

// ─ Lifecycle ──────────────────────────────────────────────────────────────

function runConnect(entry: Entry): void {
  if (entry.connected) return;
  if (entry.once && entry.fired) return;
  const el = entry.el!;
  let returned: unknown = undefined;
  entry.innerDispose = effectScope(() => {
    returned = entry.fn(el);
  });
  entry.result(returned);
  entry.connected = true;
  entry.fired = true;
}

function runDisconnect(entry: Entry): void {
  entry.innerDispose?.();
  entry.innerDispose = undefined;
  entry.connected = false;
  // Terminal: a `{ once: true }` entry that has fired won't fire again, and
  // cleanup just ran. Drop it from the lookup so future flushes don't pay
  // hash + iteration cost on it. `detach` still tears down the rest.
  if (entry.once && entry.fired && entry.el) {
    indexRemove(entry.el, entry);
    return;
  }
  if (hasObservedShadow && entry.el) scheduleOrphanKick(entry);
}

// Catches a synchronous re-attach onto a root that may not yet have an
// observer (between this MO callback and the next microtask).
function scheduleOrphanKick(entry: Entry): void {
  queueMicrotask(() => {
    if (entry.el && !entry.connected && entry.el.isConnected) {
      ensureObserver(rootOf(entry.el));
      reactToAdded(entry.el);
    }
  });
}

function attach(entry: Entry, el: Element): void {
  const root = rootOf(el);
  entry.el = el;
  entry.root = root;
  ensureObserver(root);
  indexAdd(el, entry);
  if (el.isConnected) {
    queueMicrotask(() => {
      if (entry.el === el && el.isConnected) runConnect(entry);
    });
  }
}

function detach(entry: Entry): void {
  if (entry.connected) runDisconnect(entry);
  entry.fired = false;
  if (entry.el) indexRemove(entry.el, entry);
  entry.el = null;
  entry.root = null;
}

// ─ Flush ──────────────────────────────────────────────────────────────────

function flush(records: MutationRecord[]): void {
  batch(() => {
    for (const r of records) {
      // Inline the NodeList iteration — for-of on NodeList allocates an
      // iterator; index access is allocation-free and ~the same speed.
      const removed = r.removedNodes;
      for (let i = 0; i < removed.length; i++) walkSubtree(removed[i], false);
      const added = r.addedNodes;
      for (let i = 0; i < added.length; i++) walkSubtree(added[i], true);
    }
  });
}

function walkSubtree(node: Node, isAdded: boolean): void {
  if (!(node instanceof Element)) return;
  if (isAdded) reactToAdded(node);
  else reactToRemoved(node);
  // Light-DOM children: standard recursion. Most leaf nodes early-out at
  // the first sibling check — no TreeWalker allocation.
  let child = node.firstElementChild;
  while (child) {
    walkSubtree(child, isAdded);
    child = child.nextElementSibling;
  }
  // Composed-tree descent: when a host is added/removed from its parent
  // tree, descendants inside its shadow root also (dis)connect — the
  // shadow's own MO won't fire because the mutation happened outside it.
  // Open shadows expose `node.shadowRoot`; closed ones are reachable only
  // when the owner opted in via `observeRoot(closedRoot)`.
  const shadow = node.shadowRoot ?? closedShadowsByHost.get(node);
  if (shadow) {
    let s = shadow.firstElementChild;
    while (s) {
      walkSubtree(s, isAdded);
      s = s.nextElementSibling;
    }
  }
}

function reactToAdded(el: Element): void {
  const found = elementIndex.get(el);
  if (found === undefined) return;
  if (found instanceof Set) {
    for (const entry of found) handleAdded(entry);
  } else {
    handleAdded(found);
  }
}

function handleAdded(entry: Entry): void {
  if (!entry.el?.isConnected) return;
  const newRoot = rootOf(entry.el);
  if (entry.root !== newRoot) {
    ensureObserver(newRoot);
    entry.root = newRoot;
  }
  if (!entry.connected) runConnect(entry);
}

function reactToRemoved(el: Element): void {
  const found = elementIndex.get(el);
  if (found === undefined) return;
  if (found instanceof Set) {
    for (const entry of found) handleRemoved(entry);
  } else {
    handleRemoved(found);
  }
}

function handleRemoved(entry: Entry): void {
  if (entry.el?.isConnected) {
    // Element migrated to a different root rather than disconnected.
    const newRoot = rootOf(entry.el);
    if (newRoot !== entry.root) {
      ensureObserver(newRoot);
      entry.root = newRoot;
    }
  } else if (entry.connected) {
    runDisconnect(entry);
  }
}

// ─ Public API ─────────────────────────────────────────────────────────────

/**
 * Ensure a root (document or shadow) is observed by `onMount` so future
 * registrations and orphan reconnects on it are detected.
 *
 * Use this when you intend to portal an element into a shadow root that no
 * other `onMount` registration has touched. Without it, the orphan sweep
 * has no observer to fire on inside that root and an async cross-root
 * reconnect goes unnoticed (see `onMount` `@remarks`).
 *
 * Fire-and-forget: call once during setup; no teardown needed. Roots
 * outlive any single scope, so the observer is shared by every entry on
 * that root and persists for the root's lifetime.
 *
 * @example
 * ```ts
 * const widget = document.querySelector("third-party-widget")!;
 * observeRoot(widget.shadowRoot!);
 * // …later, code may move elements into widget.shadowRoot without losing
 * // onMount fires.
 * ```
 */
export function observeRoot(root: Document | ShadowRoot): void {
  ensureObserver(root);
  // Stash closed-shadow roots by host so `walkSubtree`'s composed-tree
  // descent can reach into them. Open shadow roots are read directly via
  // `host.shadowRoot`; the registry entry would be redundant but harmless.
  if (root instanceof ShadowRoot) {
    closedShadowsByHost.set(root.host, root);
  }
}

/**
 * Run `fn` once `target` is connected to the DOM, and re-run on every
 * subsequent (re)connection. Returns a {@link Computed} carrying `fn`'s last
 * return value (`undefined` until first connection). Cleanup for resources
 * allocated inside `fn` is registered via `onCleanup` from inside `fn` — the
 * runtime disposes that scope on disconnect.
 *
 * Must be called inside an `effect` / `effectScope` (or wrapped
 * `connectedCallback`) — the surrounding scope owns auto-cleanup of the
 * MutationObserver registration.
 *
 * @remarks
 * Reconnect detection works against any DOM root that has been observed by
 * at least one `onMount` registration (lazy per-root MutationObserver).
 * Same-root reconnect, cross-root migration while the element stays
 * connected, and orphan-then-reconnect across already-observed roots are
 * all handled. The one caveat: if an element fully detaches and is later
 * reattached to a shadow root that no `onMount` entry has ever touched,
 * there is no observer to fire and the reconnect is missed. To opt that
 * shadow root in explicitly, call {@link observeRoot} once during setup.
 *
 * @param target — Element to watch. Accepts a static `Element` (registers
 *   immediately) or a `Signal<Element | null>` / `Computed<Element | null>`
 *   (subscribed; the watch follows the current value, swapping when the
 *   target signal updates).
 * @param fn — Runs each time `target` connects. Its return value is exposed
 *   via the returned `Computed`.
 * @param opts.once — When `true`, `fn` runs once per element (not on every
 *   reconnection). With a reactive target, "once" means once per element —
 *   `fn` runs again if the target signal swaps in a different element.
 *
 * @example
 * Resolve context after the consumer is in the DOM:
 * ```tsx
 * const elRef = signal<HTMLElement | null>(null);
 * const theme = onMount(
 *   elRef,
 *   (el) => getContext<Signal<"light" | "dark">>(el, THEME),
 *   { once: true },
 * );
 * return <div ref={(el) => elRef(el)}>…</div>;
 * ```
 *
 * @example
 * Imperative side effect; ignore the return value:
 * ```ts
 * onMount(elRef, (el) => {
 *   const io = new IntersectionObserver(/* … *\/);
 *   io.observe(el);
 *   onCleanup(() => io.disconnect());
 * });
 * ```
 */
export function onMount<E extends Element, R>(
  target: MaybeReactive<E | null>,
  fn: (el: E) => R,
  opts: { once?: boolean } = {},
): Computed<R | undefined> {
  const result = signal<R | undefined>(undefined);
  const entry: Entry = {
    el: null,
    root: null,
    fn: fn as (el: Element) => unknown,
    once: opts.once ?? false,
    result: result as Signal<unknown>,
    connected: false,
    fired: false,
  };

  if (isReactive(target)) {
    effect(() => {
      const el = (target as Computed<E | null>)();
      if (el === entry.el) return;
      detach(entry);
      if (el) attach(entry, el);
    });
  } else if (target) {
    attach(entry, target as E);
  }

  onCleanup(() => detach(entry));

  return result;
}
