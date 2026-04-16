import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

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

  const r1 = createEventListener(window, "keydown", onDown);
  const r2 = createEventListener(window, "keyup", onUp);
  const cleanup = () => {
    r1();
    r2();
  };

  return {
    pressed: pressed as Computed<boolean>,
    [Symbol.dispose]: cleanup,
  };
}
