import { Computed, effect, effectScope, signal } from "..";
import { useEffect, useMemo, useSyncExternalStore, useRef } from "react";

/**
 * Subscribe to any readable signal — writable or computed — returning its current value.
 *
 * Prefer this over `useSignal` when you only need to read a signal and have no
 * intention of writing to it (e.g. a `Computed<T>` derived from other signals).
 *
 * @template T - The type of the signal value.
 * @param signal - A writable `Signal<T>` or a derived `Computed<T>`.
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
 */
export function useSignal<T>(signal: Computed<T>): T {
  return useSyncExternalStore(
    (callback) =>
      effect(() => {
        signal(); // read to track dependency
        callback(); // tell React to re-render
      }),
    () => signal(), // getSnapshot (client)
    () => signal(), // getServerSnapshot (SSR)
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
  // callback() runs directly inside effectScope — no inner effect wrapper —
  // so computedRef is set synchronously and is available to useSignalValue
  // on the same render without relying on effect scheduling order.
  const stopScope = useMemo(() => {
    return effectScope(() => {
      computedRef.current = callback();
    });
  }, [callback]);

  // Subscribe to the computed signal using useSyncExternalStore
  const value = useSignal<T | undefined>(computedRef.current ?? fallbackSignal);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScope();
    };
  }, [stopScope]);

  return value;
}
const fallbackSignal = signal<undefined>(undefined);
