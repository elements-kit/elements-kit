import { effect, untracked } from "@/signals";

type RetryDelay = number | ((attempt: number) => number);

/**
 * Wraps `fn` to retry up to `attempts` times on failure.
 * Delay (if provided) is inserted between failures only — not after the last.
 * Each attempt runs in an effect scope so `onCleanup` inside `fn` fires before each retry.
 *
 * @example
 * ```ts
 * import { retry } from "elements-kit/utilities/retry";
 *
 * // Constant 500ms delay between retries
 * const load = retry(() => fetch("/api").then(r => r.json()), 3, 500);
 *
 * // Exponential backoff
 * const loadBackoff = retry(
 *   () => fetch("/api").then(r => r.json()),
 *   5,
 *   (attempt) => 2 ** attempt * 100,
 * );
 * ```
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
