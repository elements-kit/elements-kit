import {
  computed,
  type Computed,
  effect,
  effectScope,
  onCleanup,
  type MaybeReactive,
  resolve,
  signal,
} from "@/signals/index.ts";
import { createResizeObserver } from "./resize-observer.ts";

/**
 * Observes the full bounding rect of `target` and returns it as ONE reactive
 * `DOMRect`, so every field a reader sees was measured at the same instant.
 * Change sources: a `ResizeObserver` for size, plus capture-phase `scroll` and
 * window `resize` for position — a `ResizeObserver` stays silent when an
 * element merely moves.
 *
 * `target` may be a getter, in which case the observer follows it: the previous
 * element is unobserved before the new one is observed. The returned computed
 * keeps its identity across a swap, so consumers never rebind.
 *
 * The value is CACHED, not measured per read: it refreshes when one of the
 * sources above fires, not at the moment you read it. Dispose explicitly, or
 * let the enclosing scope do it.
 */
export function createElementRect(
  target: MaybeReactive<Element>,
): Computed<DOMRect> & Disposable {
  const cache = signal(resolve(target).getBoundingClientRect());

  const updateRect = (el: Element) => {
    cache(el.getBoundingClientRect());
  };

  const stop = effectScope(() => {
    effect(() => {
      const el = resolve(target);
      createResizeObserver(el, (entries) => {
        for (const entry of entries) {
          updateRect(entry.target as Element);
        }
      });
      const remeasure = () => updateRect(el);
      window.addEventListener("scroll", remeasure, {
        capture: true,
        passive: true,
      });
      window.addEventListener("resize", remeasure, { passive: true });
      onCleanup(() => {
        window.removeEventListener("scroll", remeasure, { capture: true });
        window.removeEventListener("resize", remeasure);
      });
      updateRect(el);
    });
  });

  onCleanup(stop);
  const rect = computed(() => {
    cache();
    return resolve(target).getBoundingClientRect();
  }) as Computed<DOMRect> & Disposable;
  rect[Symbol.dispose] = stop;

  return rect;
}
