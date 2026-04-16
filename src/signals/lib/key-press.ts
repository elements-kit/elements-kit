import { type Computed, onCleanup, signal } from "../index.ts";

type KeyPressResult = {
  pressed: Computed<boolean>;
} & Disposable;

/**
 * Returns a reactive boolean that is `true` while the given keyboard `key`
 * is held down.
 */
export function createKeyPress(key: string): KeyPressResult {
  const pressed = signal(false);

  const onDown = (e: KeyboardEvent) => {
    if (e.key === key) pressed(true);
  };
  const onUp = (e: KeyboardEvent) => {
    if (e.key === key) pressed(false);
  };

  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);

  const cleanup = () => {
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
  };
  onCleanup(cleanup);

  return Object.assign(
    { pressed: pressed as Computed<boolean> },
    { [Symbol.dispose]: cleanup },
  );
}
