import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

type DropZoneResult = {
  /** `true` while a dragged item is over the target. */
  isOver: Computed<boolean>;
  /** Files from the last drop event (empty until a drop occurs). */
  files: Computed<readonly File[]>;
} & Disposable;

/**
 * Makes `target` a drop zone.  Tracks whether a dragged item is hovering
 * and captures dropped files.
 *
 * @param target - The element to use as a drop zone.
 * @param onDrop  - Optional callback fired with dropped files.
 */
export function createDropZone(
  target: HTMLElement | (() => HTMLElement | null),
  onDrop?: (files: File[], e: DragEvent) => void,
): DropZoneResult {
  const el = typeof target === "function" ? target() : target;
  const isOver = signal(false);
  const files = signal<readonly File[]>([]);

  let counter = 0;
  const cleanups: Array<() => void> = [];

  if (el) {
    cleanups.push(
      createEventListener(el, "dragenter", (e: DragEvent) => {
        e.preventDefault();
        counter++;
        isOver(true);
      }),
    );

    cleanups.push(
      createEventListener(el, "dragleave", () => {
        counter--;
        if (counter === 0) isOver(false);
      }),
    );

    cleanups.push(
      createEventListener(el, "dragover", (e: DragEvent) => {
        e.preventDefault();
      }),
    );

    cleanups.push(
      createEventListener(el, "drop", (e: DragEvent) => {
        e.preventDefault();
        counter = 0;
        isOver(false);
        const dropped = Array.from(e.dataTransfer?.files ?? []);
        files(dropped);
        onDrop?.(dropped, e);
      }),
    );
  }

  const cleanup = () => cleanups.forEach((fn) => fn());

  return {
    isOver: isOver as Computed<boolean>,
    files: files as Computed<readonly File[]>,
    [Symbol.dispose]: cleanup,
  };
}
