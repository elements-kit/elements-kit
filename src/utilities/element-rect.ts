import {
  computed,
  type Computed,
  type MaybeReactive,
  onCleanup,
  resolve,
  signal,
} from "@/signals/index.ts";
import { COMPUTED, getActiveSub } from "@/signals/lib.ts";
import { createResizeObserver } from "./resize-observer.ts";

/** An element's viewport box, one reactive field each. */
export interface ElementRect extends Disposable {
  /** Left edge, in viewport pixels. */
  readonly x: Computed<number>;
  /** Top edge, in viewport pixels. */
  readonly y: Computed<number>;
  /** Border-box width. */
  readonly width: Computed<number>;
  /** Border-box height. */
  readonly height: Computed<number>;
}

type Rect = { x: number; y: number; width: number; height: number };

const EMPTY: Rect = { x: 0, y: 0, width: 0, height: 0 };

/**
 * `target`'s viewport box as four reactive fields. Size comes from a
 * `ResizeObserver`'s border box, not the bounding rect: a transform scales the
 * rect and never fires the observer. Position comes from the bounding rect,
 * refreshed on capture-phase `scroll` and window `resize`, since an element
 * that merely moves fires no observer.
 *
 * Each field notifies only when it changes: a scroll moves `y`, and a reader of
 * `width` alone doesn't re-run.
 *
 * Tracks only while an effect or computed reads a field: the observer and
 * listeners start with the first reader and stop with the last, so an unread
 * rect costs nothing on scroll. A returning reader is measured on the spot. A
 * read outside any effect or computed measures right then — a one-off question
 * that nothing would ever stop tracking for.
 *
 * A reactive `target` is followed. Dispose explicitly, or let the enclosing
 * scope do it; a disposed rect keeps its last values.
 */
export function createElementRect(target: MaybeReactive<Element>): ElementRect {
  // Carried across scroll/resize refreshes, which bring no entry. Horizontal
  // writing modes only.
  let size: { width: number; height: number } | undefined;

  const measure = (el: Element): Rect => {
    const r = el.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      width: size?.width ?? r.width,
      height: size?.height ?? r.height,
    };
  };

  // Refreshes land here, tagged with the tracking run they belong to, so a
  // restart never shows a rect left over from the run before.
  const fresh = signal<{ run: number; rect: Rect } | undefined>(undefined);
  let runs = 0;
  let halt: (() => void) | undefined;
  let disposed = false;
  let last: Rect | undefined;

  // Owns the observer and listeners. A computed's cleanups run when it loses
  // its last reader, or re-runs for a new target — so tracking lives exactly as
  // long as someone reads.
  const tracking = computed(() => {
    if (disposed) return { run: -1, rect: last ?? EMPTY };
    const el = resolve(target);
    const run = ++runs;
    // A swapped target's border box is its own.
    size = undefined;
    const update = () => fresh({ run, rect: measure(el) });
    const observer = createResizeObserver(el, (entries) => {
      for (const entry of entries) {
        const box = entry.borderBoxSize?.[0];
        if (box) size = { width: box.inlineSize, height: box.blockSize };
      }
      update();
    });
    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update, { passive: true });
    // The observer disconnects itself with this run (`createResizeObserver`
    // registers that); the listeners are ours. `halt` is for a `dispose` while
    // still read, which no cleanup reaches.
    const off = () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
      if (halt === stop) halt = undefined;
    };
    const stop = () => {
      off();
      observer[Symbol.dispose]();
    };
    halt = stop;
    onCleanup(off);
    return { run, rect: measure(el) };
  });

  const current = computed(() => {
    const start = tracking();
    const now = fresh();
    return (last = now?.run === start.run ? now.rect : start.rect);
  });

  const field = (key: keyof Rect): Computed<number> => {
    const tracked = computed(() => current()[key]);
    const read = () => {
      if (disposed) return (last ?? EMPTY)[key];
      if (getActiveSub()) return tracked();
      return (last = measure(resolve(target)))[key];
    };
    // A computed as far as `resolve`/`isReactive` can tell: it reads like one.
    Object.defineProperty(read, COMPUTED, { value: true });
    return read;
  };

  const dispose = () => {
    disposed = true;
    halt?.();
  };
  onCleanup(dispose);

  return {
    x: field("x"),
    y: field("y"),
    width: field("width"),
    height: field("height"),
    [Symbol.dispose]: dispose,
  };
}
