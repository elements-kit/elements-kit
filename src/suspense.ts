import type { Child } from "@/jsx-runtime/types";
import { isReactive } from "@/signals";
import { ASYNC_REGION, effectsInert } from "@/signals/lib";
import { promise, ReactivePromise } from "@/utilities/promise";
import { Async } from "@/utilities/async";

interface AwaitableLike {
  state: "pending" | "fulfilled" | "rejected";
}

/** @internal Metadata stamped on a Suspense region getter (see claim walk). */
export interface AsyncRegionMeta {
  /** ek-data ids the server consumed for this region. */
  ids: number;
  /** True while any of the region's awaitables is pending. */
  pending(): boolean;
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
 * Direct async children (`promise`/`async` values — including the
 * code-splitting pattern `async(() => import("./chart"))`) are detected
 * automatically; pass `when` to gate on arbitrary awaitables instead. While
 * anything is pending the client renders `fallback`; once everything settles
 * the children show. The server never renders the fallback — the stream
 * awaits and emits the real content. During hydration the server content
 * stays visible while the region is pending (no fallback flash).
 *
 * Prefer a thunk fallback (`fallback={() => <Spinner/>}`) so it renders
 * fresh each time the boundary re-enters a pending state.
 *
 * @example Code splitting with `async` + dynamic import:
 * ```tsx
 * const chart = async(() => import("./chart").then((m) => m.default));
 *
 * function Panel() {
 *   chart.run(); // server: awaited · hydration: deferred · client: import
 *   return (
 *     <Suspense fallback={() => <em>loading…</em>}>{chart}</Suspense>
 *   );
 * }
 * ```
 *
 * @example Passing props to a code-split component:
 * ```tsx
 * const chart = async(() => import("./chart").then((m) => m.default));
 * chart.run();
 *
 * <Suspense fallback={() => <em>loading…</em>}>
 *   {promise(chart.then((C) => () => <C data={data} />))}
 * </Suspense>
 * ```
 */
export function Suspense(props: {
  fallback?: Child | (() => Child);
  when?: unknown;
  children?: Child;
}): Element {
  // Props arrive as resolveProps getters. Branded values (a ComputedPromise
  // or Async child, a signal) pass through resolveProps unchanged — keep the
  // object itself; plain thunks unwrap.
  const read = (value: unknown): unknown =>
    typeof value === "function" && !isReactive(value as never)
      ? (value as () => unknown)()
      : value;

  const children = read(props.children);
  const when = read(props.when);
  const fromChildren = toAwaitables(children);
  const awaitables = when != null ? toAwaitables(when) : fromChildren;

  if (awaitables.length === 0) return children as Element;

  if (effectsInert()) {
    // Server render: never show the fallback — the stream awaits everything,
    // then emits the children (settled async children resolve instantly).
    return promise(
      Promise.all(awaitables).then(() => () => children),
    ) as unknown as Element;
  }

  const fallback = props.fallback as unknown;
  const pending = () => awaitables.some((a) => a.state === "pending");
  const region = () =>
    pending() ? (read(fallback) as Child) : (children as Child);
  // Hydration metadata: the server consumed one ek-data id for the boundary
  // (it renders as an async insertion point when awaitables exist) plus one
  // per async child re-emitted inside; the claim walk advances its counter
  // by `ids` and keeps the server content while `pending()` holds.
  (region as unknown as Record<symbol, AsyncRegionMeta>)[ASYNC_REGION] = {
    ids: 1 + fromChildren.length,
    pending,
  };
  return region as unknown as Element;
}
