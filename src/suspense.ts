import { createElement } from "@/jsx-runtime/element";
import type { Child } from "@/jsx-runtime/types";
import { isReactive } from "@/signals";
import { ASYNC_REGION, effectsInert } from "@/signals/lib";
import { promise, ReactivePromise } from "@/utilities/promise";
import { Async } from "@/utilities/async";

/**
 * A code-split component created by {@link lazy}. Render it like any other
 * component; call `preload()` to start the import ahead of time.
 */
export interface LazyComponent<P extends object = Record<string, unknown>> {
  // Keys come from the loaded component's props; values stay loose — the
  // loaded component may declare getter props (ReactiveProps) while JSX
  // callers pass raw values.
  (props?: { [K in keyof P]?: unknown }): Element;
  /** Start (or reuse) the import without rendering. */
  preload(): Promise<unknown>;
}

/**
 * Code-split a component behind a dynamic import.
 *
 * The rendered value is an async element: on the server the stream awaits the
 * import and emits the resolved markup in order; on the client the region
 * fills when the import lands (pair with {@link Suspense} for a loading
 * state); during hydration the server-rendered content stays visible until
 * the import resolves.
 *
 * The loader is memoized — one import per component, shared with `preload()`.
 *
 * @example
 * ```tsx
 * const Chart = lazy(() => import("./chart"));
 *
 * <Suspense fallback={() => <p>loading…</p>}>
 *   <Chart data={data} />
 * </Suspense>
 * ```
 */
export function lazy<P extends object = Record<string, unknown>>(
  loader: () => Promise<
    { default: (props: P) => unknown } | ((props: P) => unknown)
  >,
): LazyComponent<P> {
  let cached: Promise<(props: P) => unknown> | undefined;
  const load = () =>
    (cached ??= loader().then((m) => (typeof m === "function" ? m : m.default)));

  const LazyComponent = (props: object = {}) =>
    // Resolves to an element *factory*, not an element: each renderer
    // materializes it in its own mode (string chunks on the server, DOM on
    // the client). `resolveProps` is idempotent, so forwarding the getter
    // props through createElement is safe.
    promise(
      load().then(
        (Component) => () => createElement(Component as never, props as never),
      ),
    ) as unknown as Element;
  LazyComponent.preload = load;
  return LazyComponent as unknown as LazyComponent<P>;
}

interface AwaitableLike {
  state: "pending" | "fulfilled" | "rejected";
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    value != null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

function toAwaitables(value: unknown): (AwaitableLike & PromiseLike<unknown>)[] {
  const list = Array.isArray(value) ? (value as unknown[]).flat(Infinity) : [value];
  const out: (AwaitableLike & PromiseLike<unknown>)[] = [];
  for (const item of list) {
    if (item instanceof ReactivePromise || item instanceof Async) {
      out.push(item as AwaitableLike & PromiseLike<unknown>);
    } else if (isThenable(item)) {
      out.push(promise(item as Promise<unknown>));
    }
  }
  return out;
}

/**
 * Loading boundary for async children.
 *
 * Direct async children ({@link lazy} elements, `promise`/`async` values) are
 * detected automatically; pass `when` to gate on arbitrary awaitables
 * instead. While anything is pending the client renders `fallback`; once
 * everything settles the children show. The server never renders the
 * fallback — the stream awaits and emits the real content.
 *
 * Prefer a thunk fallback (`fallback={() => <Spinner/>}`) so it renders
 * fresh each time the boundary re-enters a pending state.
 *
 * @example
 * ```tsx
 * <Suspense fallback={() => <p>loading…</p>}>
 *   <LazyChart />
 * </Suspense>
 * ```
 */
export function Suspense(props: {
  fallback?: Child | (() => Child);
  when?: unknown;
  children?: Child;
}): Element {
  // Props arrive as resolveProps getters. Branded values (a ComputedPromise
  // child, a signal) pass through resolveProps unchanged — keep the object
  // itself; plain thunks unwrap.
  const read = (value: unknown): unknown =>
    typeof value === "function" && !isReactive(value as never)
      ? (value as () => unknown)()
      : value;

  const children = read(props.children);
  const when = read(props.when);
  // On the server, jsx evaluates children-first: lazy children are already
  // SNodes wrapping their own async chunks, so detection below only sees
  // client-side values (or explicit `when` awaitables) — which is exactly
  // the split the ek-data id math relies on.
  const gated = when != null;
  const fromChildren = toAwaitables(children);
  const awaitables = gated ? toAwaitables(when) : fromChildren;

  if (awaitables.length === 0) return children as Element;

  if (effectsInert()) {
    // Server render: never show the fallback — the stream awaits everything,
    // then emits the children (settled async children resolve instantly).
    return promise(
      Promise.all(awaitables).then(() => () => children),
    ) as unknown as Element;
  }

  const fallback = props.fallback as unknown;
  const region = () =>
    awaitables.some((a) => a.state === "pending")
      ? (read(fallback) as Child)
      : (children as Child);
  // Hydration alignment: the server consumed one ek-data id per async child
  // (their own chunks), plus one for the boundary itself only when `when`
  // made the server branch async. The claim walk advances its counter by
  // this and keeps the server content on the first run.
  (region as unknown as Record<symbol, number>)[ASYNC_REGION] =
    (gated ? 1 : 0) + fromChildren.length;
  return region as unknown as Element;
}
