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
 * `target`'s bounding rect as one reactive `DOMRect`, every field from the
 * same instant. Refreshed by a `ResizeObserver` (size) and capture-phase
 * `scroll` / window `resize` (position), never on read. Size is the observer's
 * border box, not the rect's: a transform scales the rect and never fires the
 * observer.
 *
 * A reactive `target` is followed, keeping the computed's identity. Dispose
 * explicitly, or let the enclosing scope do it.
 */
export function createElementRect(
  target: MaybeReactive<Element>,
): Computed<DOMRect> & Disposable {
  // Carried across scroll/resize refreshes, which bring no entry. Horizontal
  // writing modes only.
  let size: { width: number; height: number } | undefined;

  const read = (el: Element) => {
    const r = el.getBoundingClientRect();
    return size ? new DOMRect(r.x, r.y, size.width, size.height) : r;
  };

  const cache = signal(read(resolve(target)));

  const updateRect = (el: Element) => {
    cache(read(el));
  };

  const stop = effectScope(() => {
    effect(() => {
      const el = resolve(target);
      // A swapped target's border box is its own.
      size = undefined;
      createResizeObserver(el, (entries) => {
        for (const entry of entries) {
          const box = entry.borderBoxSize?.[0];
          if (box) size = { width: box.inlineSize, height: box.blockSize };
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
  // A read must not be a measurement: re-measuring here would force a layout
  // and could report a rect no observer ever saw.
  const rect = computed(() => cache()) as Computed<DOMRect> & Disposable;
  rect[Symbol.dispose] = stop;

  return rect;
}
