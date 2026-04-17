import { Computed, effect, onCleanup } from "../index.ts";

/**
 * Attaches a type-safe event listener to a target, with automatic cleanup.
 *
 * When called inside an `effect` or `effectScope` the listener is removed
 * when the scope is disposed.  When the target is a reactive getter the
 * listener is re-registered whenever the target changes.
 */
export function createEventListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement | Computed<HTMLElement | null>,
  type: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;
export function createEventListener<K extends keyof DocumentEventMap>(
  target: Document | Computed<Document | null>,
  type: K,
  handler: (e: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;
export function createEventListener<K extends keyof WindowEventMap>(
  target: Window | Computed<Window | null>,
  type: K,
  handler: (e: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void;
export function createEventListener(
  target: EventTarget | Computed<EventTarget | null>,
  type: string,
  handler: EventListener,
  options?: AddEventListenerOptions,
): () => void;
export function createEventListener(
  target: EventTarget | Computed<EventTarget | null>,
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
): () => void {
  const add = (t: EventTarget) =>
    options !== undefined
      ? t.addEventListener(type, handler, options)
      : t.addEventListener(type, handler);
  const del = (t: EventTarget) =>
    options !== undefined
      ? t.removeEventListener(type, handler, options)
      : t.removeEventListener(type, handler);

  if (typeof target === "function") {
    let currentRemove: () => void = () => {};
    const stopEffect = effect(() => {
      const el = target();
      if (!el) return;
      add(el);
      const remove = () => del(el);
      onCleanup(remove);
      currentRemove = remove;
    });
    return () => {
      stopEffect();
      currentRemove();
    };
  } else {
    const remove = () => del(target);
    add(target);
    onCleanup(remove);
    return remove;
  }
}
