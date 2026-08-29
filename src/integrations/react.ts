import { type Computed, effect, signal } from "@/signals/index.ts";
import { scope } from "@/signals/scope";
import { useEffect, useMemo, useSyncExternalStore, useRef } from "react";

/**
 * Subscribe to any readable signal — writable or computed — returning its current value.
 *
 * Accepts any zero-argument callable `() => T`, which includes both `Signal<T>` and
 * `Computed<T>`. Using `() => T` instead of `Computed<T>` prevents TypeScript from
 * picking the write overload of `Signal<T>` during type inference.
 *
 * **Server rendering:** pass `getServerSnapshot` for any component React renders
 * on the server — React requires it there and throws without one. It runs on
 * the server *and* again for the hydration render on the client, so it must
 * return the same value both times: whatever the server put in the HTML. A
 * signal reading browser state (`matchMedia`, `localStorage`, `location`) does
 * not qualify, since it answers differently in the browser.
 *
 * @template T - The type of the signal value.
 * @param value - A writable `Signal<T>` or a derived `Computed<T>`.
 * @param getServerSnapshot - Returns the value the server rendered. Required
 *   for server-rendered components; omit only for client-only ones.
 * @returns The current value, updated on every signal change.
 *
 * @example
 * ```tsx
 * const count = signal(0);
 * const double = computed(() => count() * 2);
 *
 * function Display() {
 *   const countValue = useSignal(count);
 *   const doubleValue = useSignal(double);
 *   return <div>{countValue} × 2 = {doubleValue}</div>;
 * }
 * ```
 *
 * @example
 * Server-rendered component reading a browser-only signal:
 * ```tsx
 * // `theme` resolves to "light" on the server — say so, or hydration mismatches.
 * const mode = useSignal(theme, () => "light");
 * ```
 */

export function useSignal<T>(value: () => T, getServerSnapshot?: () => T): T {
  return useSyncExternalStore(
    (callback) =>
      effect(() => {
        value(); // read to track dependency
        callback(); // tell React to re-render
      }),
    value, // getSnapshot (client)
    getServerSnapshot,
  );
}

/**
 * Create a signal effect scope tied to a React component's lifetime.
 *
 * All effects registered inside `callback` are grouped into a single scope. The scope — and every effect within it — is automatically stopped when the component unmounts.
 *
 * If your callback returns a `Computed<T>` signal, the hook will always return its current value, updating reactively as dependencies change. If your callback returns `void`, the value will be `undefined`.
 *
 * Returns the current value of the computed signal (or `undefined`).
 *
 * Use this when you want to create multiple related effects at once without individually managing each one's lifecycle. All effects and cleanups inside the callback are automatically cleaned up on unmount.
 *
 * @template T - The type of the computed value (if any).
 * @param callback - A function that registers one or more signal effects, optionally returning a `Computed<T>`.
 * @returns `value` — the current value of the computed signal (or `undefined`).
 *
 * @example
 * ```tsx
 * function Analytics() {
 *   useScope(() => {
 *     effect(() => console.log("page:", currentPage()));
 *     effect(() => console.log("user:", currentUser()));
 *   });
 *   return null;
 * }
 *
 * // With computed value:
 * function DoubleCounter() {
 *   const double = useScope(() => computed(() => count() * 2));
 *   return <div>{double}</div>;
 * }
 * ```
 */
export function useScope<T>(callback: () => Computed<T> | void): T | void {
  const computedRef = useRef<Computed<T> | void>(undefined);

  // Create/recreate the effect scope when callback changes.
  // `scope()` runs callback synchronously inside an effectScope detached via
  // untracked — so computedRef is set before we subscribe below, without
  // relying on effect scheduling order.
  const stopScope = useMemo(() => {
    const [result, stop] = scope(callback);
    computedRef.current = result;
    return stop;
  }, [callback]);

  // Subscribe to the computed signal using useSyncExternalStore
  const value = useSignal<T | undefined>(
    (computedRef.current ?? fallbackSignal) as () => T | undefined,
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScope();
    };
  }, [stopScope]);

  return value;
}
const fallbackSignal = signal<undefined>(undefined);
