import { computed, type Computed, onCleanup, signal } from "@/signals/index.ts";

type IntervalResult = {
  timestamp: Computed<number>;
  pending: Computed<boolean>;
  start(): void;
  stop(): void;
  reset(): void;
} & Disposable;

type Fn = () => void;
type Delay = number | (() => number);

/**
 * Pausable `setInterval` wrapper.  Starts running immediately on creation.
 */
export function createInterval(delay: Delay): IntervalResult;
export function createInterval(callback: Fn, delay: Delay): IntervalResult;
export function createInterval(arg1: Fn | Delay, arg2?: Delay): IntervalResult {
  const [callback, delay] = resolveArgs(arg1, arg2);
  const pending = signal(true);
  let id: ReturnType<typeof setInterval> | undefined;
  const timestamp = signal(Date.now());

  const getDelay = typeof delay === "function" ? delay : () => delay;

  const start = () => {
    if (id !== undefined) return;
    pending(true);
    id = setInterval(() => {
      callback?.();
      timestamp(Date.now());
    }, getDelay());
  };

  const stop = () => {
    clearInterval(id);
    id = undefined;
    pending(false);
  };

  const reset = () => {
    stop();
    start();
  };

  start();

  const cleanup = () => stop();
  onCleanup(cleanup);

  return {
    timestamp,
    pending,
    start,
    stop,
    reset,
    [Symbol.dispose]: cleanup,
  };
}

function resolveArgs(arg1: Fn | Delay, arg2?: Delay): [Fn, Delay] {
  if (arguments.length === 1) {
    [undefined, arg1 as number | (() => number)];
  }
  return [arg1, arg2] as [Fn, Delay];
}
