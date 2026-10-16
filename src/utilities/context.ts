import { onCleanup, signal, type Signal, untracked } from "@/signals/index.ts";

// One signal per (host, key): a lookup tracks only the hosts on its path.
const NONE = Symbol("none");
const registry = new WeakMap<EventTarget, Map<PropertyKey, Signal<unknown>>>();

function slot(host: EventTarget, key: PropertyKey): Signal<unknown> {
  let map = registry.get(host);
  if (!map) registry.set(host, (map = new Map()));
  let s = map.get(key);
  if (!s) map.set(key, (s = signal<unknown>(NONE)));
  return s;
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
  const s = slot(host, key);
  s(value);
  onCleanup(() => {
    if (untracked(s) === value) s(NONE);
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
 * From a JSX component — defer the lookup with `<dom-lifecycle>`, since `ref`
 * runs before the element is inserted:
 * ```tsx
 * import { signal, type Signal } from "elements-kit/signals";
 * import "elements-kit/utilities/dom-lifecycle";
 *
 * function ThemeConsumer() {
 *   const theme = signal<Signal<"light" | "dark"> | undefined>(undefined);
 *   return (
 *     <div>
 *       <dom-lifecycle
 *         onConnect={(el) => theme(getContext(el, THEME))}
 *       />
 *       {() => theme()?.() ?? "light"}
 *     </div>
 *   );
 * }
 * ```
 */
export function getContext<T>(
  consumer: Element,
  key: PropertyKey,
): T | undefined {
  let node: Node | null = consumer;
  while (node) {
    // The consumer's own entry is read untracked: a node that reads and
    // provides the same key (e.g. a depth counter) must not re-run itself.
    const s = slot(node, key);
    const value = node === consumer ? untracked(s) : s();
    if (value !== NONE) return value as T;
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
