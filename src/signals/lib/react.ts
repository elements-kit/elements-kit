import {
  Computed,
  Signal,
  effect,
  effectScope,
  computed,
  signal,
  untracked,
} from "..";
import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  useCallback,
  useRef,
} from "react";

/**
 * A functional updater — receives the previous value and returns the next.
 * Mirrors the updater form of React's `useState` setter.
 */
type Updater<T> = (prev: T) => T;

/**
 * Any signal that can be read — either a writable `Signal<T>` or a derived `Computed<T>`.
 * Both are callable as `() => T` and can be passed to `useSyncExternalStore`.
 */
type ReadableSignal<T> = Signal<T> | Computed<T>;

/**
 * Subscribe to a writable signal, returning its current value and a setter.
 *
 * Built on `useSyncExternalStore` so updates are safe under React's concurrent
 * renderer — no tearing, no stale reads across render lanes.
 *
 * The setter accepts either a plain value or an updater function `(prev) => next`,
 * matching the API of React's own `useState`.
 *
 * @template T - The type of the signal value.
 * @param signal - The writable signal to subscribe to.
 * @returns A `[value, setValue]` tuple — identical shape to `useState`.
 *
 * @example
 * ```tsx
 * const count = signal(0);
 *
 * function Counter() {
 *   const [value, setValue] = useSignal(count);
 *   return <button onClick={() => setValue((n) => n + 1)}>{value}</button>;
 * }
 * ```
 */
export function useSignal<T>(
  signal: Signal<T>,
): [T, (val: T | Updater<T>) => void] {
  const value = useSyncExternalStore(
    // subscribe: run an effect that re-notifies React whenever the signal changes
    (callback) =>
      effect(() => {
        signal(); // read to track dependency
        callback(); // tell React to re-render
      }),
    () => signal(), // getSnapshot (client)
    () => signal(), // getServerSnapshot (SSR)
  );
  const setValue = useCallback(
    (val: T | Updater<T>) => {
      // support both `setValue(next)` and `setValue((prev) => next)`
      if (typeof val === "function") {
        signal((val as Updater<T>)(signal()));
      } else {
        signal(val);
      }
    },
    [signal],
  );

  return [value, setValue];
}

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
 *   const countValue = useSignalValue(count);
 *   const doubleValue = useSignalValue(double);
 *   return <div>{countValue} × 2 = {doubleValue}</div>;
 * }
 * ```
 */
export function useSignalValue<T>(signal: ReadableSignal<T>): T {
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
 * Run a reactive side effect inside a React component.
 *
 * `fn` is re-executed automatically whenever any signal read inside it changes,
 * without needing to declare a dependency array. If `fn` returns a function,
 * that function is called as a cleanup before the next run and on unmount —
 * the same contract as `useEffect`'s cleanup.
 *
 * @param fn - A reactive function, optionally returning a cleanup callback.
 *
 * @example
 * ```tsx
 * const query = signal("");
 *
 * function Search() {
 *   useSignalEffect(() => {
 *     const controller = new AbortController();
 *     fetch(`/search?q=${query()}`, { signal: controller.signal });
 *     return () => controller.abort();
 *   });
 * }
 * ```
 */
export function useSignalEffect(fn: () => void | (() => void)): void {
  useEffect(() => {
    let cleanup: void | (() => void);
    const stop = effect(() => {
      if (cleanup) untracked(() => cleanup!());
      cleanup = fn();
    });

    return () => {
      if (cleanup) untracked(() => cleanup!());
      stop();
    };
  }, [fn]); // re-creates signal effect (with cleanup) when fn changes identity
}

/**
 * Create a signal effect scope tied to a React component's lifetime.
 *
 * All effects registered inside `callback` are grouped into a single scope. The scope — and every effect within it — is automatically stopped when the component unmounts. The returned `stop` function lets you tear it down earlier if needed.
 *
 * If your callback returns a `Computed<T>` signal, the hook will always return its current value, updating reactively as dependencies change. If your callback returns `void`, the value will be `undefined`.
 *
 * Returns a tuple: `[value, stop]`, where `value` is the current value of the returned `Computed` (if any), and `stop` is a function that disposes all effects in the scope immediately.
 *
 * Use this when you want to create multiple related effects at once without individually managing each one's lifecycle. All effects and cleanups inside the callback are automatically cleaned up on unmount or when `stop()` is called.
 *
 * @template T - The type of the computed value (if any).
 * @param callback - A function that registers one or more signal effects, optionally returning a `Computed<T>`.
 * @returns `[value, stop]` — the current value of the computed signal (or `undefined`), and a function to stop all effects in the scope.
 *
 * @example
 * ```tsx
 * function Analytics() {
 *   useScoped(() => {
 *     effect(() => console.log("page:", currentPage()));
 *     effect(() => console.log("user:", currentUser()));
 *   });
 *   return null;
 * }
 *
 * // With computed value:
 * function DoubleCounter() {
 *   const double = useScoped(() => computed(() => count() * 2));
 *   return <div>{double}</div>;
 * }
 * ```
 */
export function useScoped<T>(callback: () => Computed<T> | void): T | void {
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
  const value = useSignalValue<T | undefined>(
    computedRef.current ?? fallbackSignal,
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

/**
 * Derive a computed value inside a component and subscribe to it.
 *
 * Creates a `computed` signal from `getter` (memoised for the component's
 * lifetime) and returns its current value. The component re-renders whenever
 * any signal read inside `getter` changes.
 *
 * Prefer this over an inline `useMemo` when the derived value depends on
 * signals, since it integrates with the reactive graph rather than React's
 * reconciler-level memoisation.
 *
 * @template T - The type of the computed value.
 * @param getter - A reactive function that reads one or more signals.
 * @returns The latest derived value.
 *
 * @example
 * ```tsx
 * const firstName = signal("Jane");
 * const lastName = signal("Doe");
 *
 * function Greeting() {
 *   const fullName = useComputed(() => `${firstName()} ${lastName()}`);
 *   return <p>Hello, {fullName}</p>;
 * }
 * ```
 */
export function useComputed<T>(getter: () => T): T {
  const sig = useMemo(() => computed(getter), [getter]);
  return useSignalValue(sig);
}
