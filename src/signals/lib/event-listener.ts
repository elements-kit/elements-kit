import { effect, onCleanup } from "../index.ts";

/**
 * Attaches a type-safe event listener to a target, with automatic cleanup.
 *
 * When called inside an `effect` or `effectScope` the listener is removed
 * when the scope is disposed.  When the target is a reactive getter the
 * listener is re-registered whenever the target changes.
 */
export function createEventListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement | (() => HTMLElement | null),
  type: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void;
export function createEventListener<K extends keyof DocumentEventMap>(
  target: Document | (() => Document | null),
  type: K,
  handler: (e: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void;
export function createEventListener<K extends keyof WindowEventMap>(
  target: Window | (() => Window | null),
  type: K,
  handler: (e: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void;
export function createEventListener(
  target: EventTarget | (() => EventTarget | null),
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
): void {
  if (typeof target === "function") {
    effect(() => {
      const el = target();
      if (!el) return;
      el.addEventListener(type, handler, options);
      onCleanup(() => el.removeEventListener(type, handler, options));
    });
  } else {
    target.addEventListener(type, handler, options);
    onCleanup(() => target.removeEventListener(type, handler, options));
  }
}
