import {
  type Computed,
  type Signal,
  computed,
  onCleanup,
  signal,
  trigger,
} from "@/signals/index.ts";

/**
 * A subscribe function: registers a `notify` callback and returns an
 * unsubscribe cleanup. Same contract as `useSyncExternalStore`.
 */
export type Subscribe = (notify: () => void) => () => void;

/**
 * Returns a `Subscribe` for one or more DOM events on a target.
 *
 * @example
 * ```ts
 * const [playing, stop] = sync(fromEvent(el, ["play", "pause"]), () => !el.paused);
 * ```
 */
export function fromEvent(
  target: EventTarget,
  events: string | string[],
): Subscribe {
  return (notify) => {
    const evts = Array.isArray(events) ? events : [events];
    evts.forEach((ev) => target.addEventListener(ev, notify));
    return () => evts.forEach((ev) => target.removeEventListener(ev, notify));
  };
}

/**
 * Keeps a reactive value in sync with an external source by re-reading
 * `getter` whenever `subscribe` notifies of a change.
 *
 * Returns a `[value, cleanup]` tuple.
 *
 * Without `setter` → value is `Computed<T>` (read-only).
 * With `setter`    → value is `Signal<T>` (writable).
 *
 * @example
 * ```ts
 * const [playing, stop] = sync(fromEvent(el, ["play", "pause"]), () => !el.paused);
 *
 * const [volume, stopVolume] = sync(
 *   fromEvent(el, "volumechange"),
 *   () => el.volume,
 *   (v) => { el.volume = v; },
 * );
 *
 * // Any external store
 * const [data, unsub] = sync(
 *   (notify) => { store.on("change", notify); return () => store.off("change", notify); },
 *   () => store.getSnapshot(),
 * );
 * ```
 */
export function sync<T>(
  subscribe: Subscribe,
  getter: () => T,
): [Computed<T>, () => void];
export function sync<T>(
  subscribe: Subscribe,
  getter: () => T,
  setter: (value: T) => void,
): [Signal<T>, () => void];
export function sync<T>(
  subscribe: Subscribe,
  getter: () => T,
  setter?: (value: T) => void,
): [Computed<T> | Signal<T>, () => void] {
  const tick = signal<undefined>(undefined);
  const value = computed<T>(() => {
    tick();
    return getter();
  });
  value(); // eager initial evaluation
  const cleanup = subscribe(() => trigger(tick));
  onCleanup(cleanup);

  if (setter) {
    const proxy = (v?: T): T => {
      if (v === undefined) return value();
      setter(v);
      return v;
    };
    return [proxy as unknown as Signal<T>, cleanup];
  }

  return [value, cleanup];
}
