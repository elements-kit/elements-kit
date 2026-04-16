import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

type TextSelectionResult = {
  /** The currently selected text (empty string if nothing is selected). */
  text: Computed<string>;
  /** The Selection ranges, if any. */
  ranges: Computed<readonly Range[]>;
};

/**
 * Tracks the current text selection in the document.  Updates reactively
 * on `selectionchange` events.
 */
export function createTextSelection(): TextSelectionResult {
  const text = signal("");
  const ranges = signal<readonly Range[]>([]);

  const handler = () => {
    const sel = document.getSelection();
    text(sel?.toString() ?? "");
    const r: Range[] = [];
    if (sel) {
      for (let i = 0; i < sel.rangeCount; i++) {
        r.push(sel.getRangeAt(i));
      }
    }
    ranges(r);
  };

  createEventListener(document, "selectionchange", handler);

  return {
    text: text as Computed<string>,
    ranges: ranges as Computed<readonly Range[]>,
  };
}
