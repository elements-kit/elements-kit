import { effect, untracked } from "@/signals";

type RetryDelay = number | ((attempt: number) => number);

/**
 * Wraps `fn` to retry up to `attempts` times on failure.
 * Delay (if provided) is inserted between failures only — not after the last.
 * Each attempt runs in an effect scope so `onCleanup` inside `fn` fires before each retry.
 */
export function retry<T>(
  fn: () => Promise<T>,
  attempts: number,
  delay?: RetryDelay,
): () => Promise<T> {
  return async () => {
    let last: unknown;
    for (let i = 0; i < attempts; i++) {
      let stop = () => {};
      try {
        const result = await new Promise<T>((res, rej) => {
          stop = effect(() => untracked(() => fn().then(res, rej)));
        });
        stop();
        return result;
      } catch (err) {
        stop();
        last = err;
        if (i < attempts - 1 && delay !== undefined) {
          const ms = typeof delay === "function" ? delay(i) : delay;
          await new Promise((r) => setTimeout(r, ms));
        }
      }
    }
    throw last;
  };
}
