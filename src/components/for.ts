import { effect, onCleanup, signal, trigger, untracked } from "../signals";
import { disposeElement } from "../jsx-runtime/element";

type KeyFn<T> = (item: T, index: number) => string | number;
type RenderFn<T> = (
  item: T,
  index: number,
) => Element | DocumentFragment | null;

interface Entry {
  /** Marks the start of this item's DOM range. */
  start: Comment;
  /** Marks the end of this item's DOM range. */
  end: Comment;
}

/**
 * Keyed list renderer. Reconciles a reactive array into the DOM using a key
 * function to match existing nodes — minimising create/destroy churn.
 *
 * Reconciliation strategy (inspired by udomdiff / dom-expressions):
 *   1. Remove stale entries (keys absent from the new array).
 *   2. Skip unchanged common prefix and suffix.
 *   3. Pure-append fast path when the surviving old range is empty.
 *   4. Backward scan of the middle region — move or create entries so that
 *      each entry's range lands immediately before the already-correct cursor.
 *
 * @example
 * ```tsx
 * <For each={visibleTodos} by={(todo) => todo.id}>
 *   {(todo) => <li>{todo.text}</li>}
 * </For>
 * ```
 *
 * Props:
 *   each     — reactive getter returning the array (e.g. a `computed`)
 *   by       — extracts a stable key per item (default: index)
 *   children — render function called once per new key
 */
export class For<T = unknown> {
  readonly #each = signal<T[]>([]);
  get each(): T[] {
    return this.#each();
  }
  set each(v: T[]) {
    if (v === untracked(this.#each)) {
      trigger(this.#each);
      return;
    }
    this.#each(v);
  }

  by: KeyFn<T> = (_, i) => i;
  children: RenderFn<T> = () => null;

  readonly #start = document.createComment("<For>");
  readonly #end = document.createComment("</For>");
  readonly #cache = new Map<string | number, Entry>();
  /** Keys in current DOM order — needed for prefix/suffix optimisation. */
  #order: Array<string | number> = [];

  render(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this.#start);
    fragment.appendChild(this.#end);

    // Runs synchronously: initial render inserts into the fragment.
    // Subsequent runs (signal changes) operate on the live DOM parent.
    effect(() => this.#reconcile());
    // When the parent scope tears down (e.g. component containing <For> is
    // disposed), dispose child effectScopes for all live entries without
    // touching the DOM — the parent's removal handles the DOM cleanup.
    // removeEntry is only used during reconciliation where DOM removal is needed.
    onCleanup(() => {
      for (const entry of this.#cache.values()) cleanEntry(entry);
      this.#cache.clear();
      this.#order = [];
    });

    return fragment;
  }

  #reconcile(): void {
    const parent = this.#start.parentNode;
    if (!parent) return;

    const items = this.each;
    const b = items.map((item, i) => this.by(item, i)); // desired key order
    const bSet = new Set(b);

    // ─ Remove stale entries ────────────────────────────────────────────────
    for (const [key, entry] of this.#cache) {
      if (!bSet.has(key)) {
        removeEntry(entry);
        this.#cache.delete(key);
      }
    }

    // Surviving old keys in their current DOM order (stale keys removed).
    const a = this.#order.filter((k) => this.#cache.has(k));

    let aStart = 0,
      aEnd = a.length;
    let bStart = 0,
      bEnd = b.length;

    // ─ Common prefix ──────────────────────────────────────────────────────
    while (aStart < aEnd && bStart < bEnd && a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
    }

    // ─ Common suffix ──────────────────────────────────────────────────────
    while (aEnd > aStart && bEnd > bStart && a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }

    // Anchor: start of the (already-correct) suffix region, or </For>.
    const after: Node =
      bEnd < b.length ? this.#cache.get(b[bEnd])!.start : this.#end;

    // ─ Pure append (old range exhausted) ──────────────────────────────────
    if (aStart === aEnd) {
      let cursor: Node = after;
      for (let i = bEnd - 1; i >= bStart; i--) {
        const key = b[i];
        const entry = this.#makeEntry(key);
        insertEntry(
          parent,
          entry,
          cursor,
          untracked(() => this.children(items[i], i)),
        );
        this.#cache.set(key, entry);
        cursor = entry.start;
      }
      this.#order = [...b];
      return;
    }

    // ─ Insert / reorder middle region ─────────────────────────────────────
    // Backward scan: cursor starts just after the suffix and moves left as
    // each entry is placed in the correct position.
    let cursor: Node = after;
    for (let i = bEnd - 1; i >= bStart; i--) {
      const key = b[i];
      let entry = this.#cache.get(key);

      if (!entry) {
        entry = this.#makeEntry(key);
        insertEntry(
          parent,
          entry,
          cursor,
          untracked(() => this.children(items[i], i)),
        );
        this.#cache.set(key, entry);
      } else if (entry.end.nextSibling !== cursor) {
        moveEntry(parent, entry, cursor);
      }

      cursor = entry.start;
    }

    // After reconcile the DOM order matches b exactly.
    this.#order = [...b];
  }

  #makeEntry(key: string | number): Entry {
    return {
      start: document.createComment(`[${key}]`),
      end: document.createComment(`[/${key}]`),
    };
  }
}

// ─ Range helpers ──────────────────────────────────────────────────────────────

function insertEntry(
  parent: Node,
  entry: Entry,
  before: Node,
  rendered: Node | null,
): void {
  parent.insertBefore(entry.start, before);
  if (rendered) parent.insertBefore(rendered, before); // fragment children transfer inline
  parent.insertBefore(entry.end, before);
}

// Dispose reactive children without touching the DOM — used on parent teardown
// where the DOM is already being removed by the parent.
function cleanEntry(entry: Entry): void {
  let node: ChildNode | null = entry.start.nextSibling;
  while (node && node !== entry.end) {
    const next = node.nextSibling;
    if (node instanceof Element) disposeElement(node);
    node = next;
  }
}

// Dispose reactive children AND remove the entry's DOM range — used during
// reconciliation when a key is no longer present in the new array.
function removeEntry(entry: Entry): void {
  let node: ChildNode | null = entry.start.nextSibling;
  while (node && node !== entry.end) {
    const next = node.nextSibling;
    if (node instanceof Element) disposeElement(node);
    node = next;
  }
  const range = document.createRange();
  range.setStartBefore(entry.start);
  range.setEndAfter(entry.end);
  range.deleteContents();
}

function moveEntry(parent: Node, entry: Entry, before: Node): void {
  const range = document.createRange();
  range.setStartBefore(entry.start);
  range.setEndAfter(entry.end);
  parent.insertBefore(range.extractContents(), before);
}
