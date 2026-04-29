import {
  computed,
  onCleanup,
  resolve,
  signal,
  type Computed,
  type MaybeReactive,
  type Signal,
} from "@/signals/index.ts";
import { onMount } from "./on-mount.ts";

const registry = new WeakMap<EventTarget, Map<PropertyKey, unknown>>();
const versions = new Map<PropertyKey, Signal<number>>();

function version(key: PropertyKey): Signal<number> {
  let v = versions.get(key);
  if (!v) versions.set(key, (v = signal(0)));
  return v;
}

/**
 * Register `value` under `key` on `host`. Calls to {@link getContext} from
 * any descendant of `host` (in the DOM tree, including across open shadow
 * roots) resolve to this value, unless an inner provider with the same key
 * shadows it. Returns `host` so the call can be used inline.
 *
 * Must be called inside an `effect` / `effectScope` (or a wrapped
 * `connectedCallback`). The entry is auto-removed via `onCleanup` when the
 * surrounding scope disposes. Passes `null` through unchanged.
 *
 * @example
 * Inline form — `setContext` returns the host so it composes directly:
 * ```tsx
 * import { signal } from "elements-kit/signals";
 * import { setContext } from "elements-kit/utilities/context";
 *
 * const THEME = Symbol("theme");
 *
 * function ThemeProvider({ children }: { children: JSX.Element }) {
 *   const theme = signal<"light" | "dark">("dark");
 *   return setContext(<div>{children}</div>, THEME, theme);
 * }
 * ```
 *
 * @example
 * Equivalent `ref` form:
 * ```tsx
 * function ThemeProvider({ children }: { children: JSX.Element }) {
 *   const theme = signal<"light" | "dark">("dark");
 *   return (
 *     <div ref={(el) => setContext(el, THEME, theme)}>
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function setContext<H extends EventTarget | null, T>(
  host: H,
  key: PropertyKey,
  value: T,
): H {
  if (host == null) return host;
  let map = registry.get(host);
  if (!map) registry.set(host, (map = new Map()));
  map.set(key, value);
  const owned = map;
  const v = version(key);
  v(v() + 1);
  onCleanup(() => {
    owned.delete(key);
    if (owned.size === 0) registry.delete(host);
    v(v() + 1);
  });
  return host;
}

/**
 * Walk up from `consumer` (across open shadow boundaries via
 * `getRootNode().host`) and return the first registered value for `key`,
 * or `undefined`.
 *
 * One-shot — does not subscribe to anything. If `value` is a
 * `Signal`/`Computed`, the caller reads it inside their own `effect` for
 * reactivity.
 *
 * @example
 * Inside a custom element's `connectedCallback`:
 * ```ts
 * const theme = getContext<() => "light" | "dark">(this, THEME);
 * effect(() => { this.dataset.theme = theme?.() ?? "light"; });
 * ```
 *
 * @example
 * From a JSX component — defer the lookup with `onMount`, since `ref` runs
 * before the element is inserted:
 * ```tsx
 * import { signal, type Signal } from "elements-kit/signals";
 * import { onMount } from "elements-kit/utilities/on-mount";
 *
 * function ThemeConsumer() {
 *   const elRef = signal<HTMLElement | null>(null);
 *   const theme = onMount(
 *     elRef,
 *     (el) => getContext<Signal<"light" | "dark">>(el, THEME),
 *     { once: true },
 *   );
 *   return <div ref={(el) => elRef(el)}>{() => theme()?.() ?? "light"}</div>;
 * }
 * ```
 */
export function getContext<T>(
  consumer: Element,
  key: PropertyKey,
): T | undefined {
  version(key)();
  let node: Node | null = consumer;
  while (node) {
    const map = registry.get(node);
    if (map?.has(key)) return map.get(key) as T;
    const parent: Node | null = node.parentNode;
    if (parent) {
      node = parent;
      continue;
    }
    const root = node.getRootNode();
    node = root instanceof ShadowRoot ? root.host : null;
  }
  return undefined;
}

/**
 * High-level JSX-friendly context lookup. Composes {@link onMount} and
 * {@link getContext}: waits until `target` is connected, walks ancestors for
 * `key`, and auto-flattens the result if the registered value is a
 * `Signal`/`Computed`. The returned `Computed<T | undefined>` is `undefined`
 * until the consumer is connected.
 *
 * Use this when consuming context from a component body — it removes the
 * `ref` / `onMount` / double-call boilerplate. For synchronous lookups inside
 * a `connectedCallback` or event handler where the element is already
 * connected and the registered value is known to be a plain value, prefer
 * {@link getContext} directly.
 *
 * @example
 * ```tsx
 * import { signal } from "elements-kit/signals";
 * import { useContext } from "elements-kit/utilities/context";
 *
 * function ThemeConsumer() {
 *   const elRef = signal<HTMLElement | null>(null);
 *   const theme = useContext<"light" | "dark">(elRef, THEME, { once: true });
 *   return <div ref={(el) => elRef(el)}>{() => theme() ?? "light"}</div>;
 * }
 * ```
 */
export function useContext<T>(
  target: MaybeReactive<Element | null>,
  key: PropertyKey,
  opts?: { once?: boolean },
): Computed<T | undefined> {
  const raw = onMount(
    target,
    (el) => getContext<MaybeReactive<T>>(el, key),
    opts,
  );
  return computed(() => {
    const v = raw();
    return v === undefined ? undefined : resolve(v);
  });
}
