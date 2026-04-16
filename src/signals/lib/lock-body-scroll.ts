import { onCleanup } from "../index.ts";

/**
 * Prevents the document body from scrolling while the returned scope is
 * active.  Restores the original `overflow` value on cleanup.
 */
export function createLockBodyScroll(): Disposable {
  const original = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const cleanup = () => {
    document.body.style.overflow = original;
  };
  onCleanup(cleanup);

  return { [Symbol.dispose]: cleanup };
}
