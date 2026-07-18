import {
  effect,
  effectScope,
  onCleanup,
  signal,
  trigger,
  untracked,
} from "@/signals";
import { disposeElement } from "@/jsx-runtime/element";
import type { MaybeReactiveProps } from "./jsx-runtime/infer";

type KeyFn<T> = (item: T, index: number) => string | number;
type RenderFn<T> = (
  item: T,
  index: number,
) => Element | DocumentFragment | null;

export interface Entry {
  /** Marks the start of this item's DOM range. */
  start: Comment;
  /** Marks the end of this item's DOM range. */
  end: Comment;
  /** Disposes effects/onCleanup registered by the render callback for this item. */
  dispose: () => void;
}

/**
 * Props for `<For>`, derived from its public instance fields.
 * `each` and `children` are required; `by` is optional (identity keying by
 * default). Non-function props also accept a reactive getter — `each` takes a
 * signal of arrays.
 *
 * @example
 * ```tsx
 * import { signal } from "elements-kit/signals";
 * import { For } from "elements-kit";
 *
 * const todos = signal([{ id: 1, text: "write docs" }]);
 *
 * const props: ForProps<{ id: number; text: string }> = {
 *   each: todos,
 *   by: (t) => t.id,
 *   children: (t) => <li>{t.text}</li>,
 * };
 * ```
 */
type ForProps<T> = MaybeReactiveProps<{
  each: T[];
  by?: KeyFn<T>;
  children: RenderFn<T>;
}>;

/**
 * Keyed list renderer. See {@link ForProps} for prop details.
 *
 * @example
 * ```tsx
 * import { signal } from "elements-kit/signals";
 * import { For } from "elements-kit";
 *
 * const todos = signal([{ id: 1, text: "write docs" }]);
 *
 * <For each={todos} by={(t) => t.id}>
 *   {(t) => <li>{t.text}</li>}
 * </For>
 * ```
 */
export class For<T = unknown> {
  // Phantom signature: JSX reads it to infer T from props. Runtime constructs
  // with no args — createElement assigns each prop via property set afterwards.
  constructor(_props?: ForProps<T>) {}

  readonly #each = signal<T[] | (() => T[])>([]);
  get each(): T[] {
    // Unwrap plain thunks here: the read happens inside the reconcile
    // effect, so signals the thunk touches are tracked — `each={() => sig()}`
    // stays live even though applyProps only unwraps branded reactives.
    const v = this.#each();
    return typeof v === "function" ? v() : v;
  }
  set each(v: T[] | (() => T[])) {
    if (v === untracked(this.#each)) {
      trigger(this.#each);
      return;
    }
    this.#each(v);
  }

  by: KeyFn<T> = (_, i) => i;
  children: RenderFn<T> = () => null;

  // Mutable (not readonly): the hydrate claim pass rebinds them to
  // server-rendered comments via `hydrateRange`.
  #start = document.createComment("<For>");
  #end = document.createComment("</For>");
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

  /**
   * @internal Hydrate support: adopt server-rendered range markers and
   * pre-claimed entries instead of creating a fresh range. The first
   * reconcile run sees matching key order and performs no DOM operations;
   * later `each` changes reconcile against the adopted entries as usual.
   */
  hydrateRange(
    start: Comment,
    end: Comment,
    entries: ReadonlyMap<string | number, Entry>,
    order: ReadonlyArray<string | number>,
  ): void {
    this.#start = start;
    this.#end = end;
    for (const [key, entry] of entries) this.#cache.set(key, entry);
    this.#order = [...order];

    effect(() => this.#reconcile());
    onCleanup(() => {
      for (const entry of this.#cache.values()) cleanEntry(entry);
      this.#cache.clear();
      this.#order = [];
    });
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
        const { entry, rendered } = this.#makeEntry(key, items[i], i);
        insertEntry(parent, entry, cursor, rendered);
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
        const made = this.#makeEntry(key, items[i], i);
        entry = made.entry;
        insertEntry(parent, entry, cursor, made.rendered);
        this.#cache.set(key, entry);
      } else if (entry.end.nextSibling !== cursor) {
        moveEntry(parent, entry, cursor);
      }

      cursor = entry.start;
    }

    // After reconcile the DOM order matches b exactly.
    this.#order = [...b];
  }

  // Each item's render runs inside its own effectScope. onCleanup calls and
  // nested effects created during render are scoped to that entry — disposed
  // when the item is removed, not only on full list teardown.
  #makeEntry(
    key: string | number,
    item: T,
    index: number,
  ): { entry: Entry; rendered: Node | null } {
    let rendered: Node | null = null;
    let dispose!: () => void;
    // untracked prevents the scope from being linked to the enclosing
    // reconcile effect — otherwise the scope would be torn down when the
    // effect re-runs (on the next list change) instead of when the item
    // is actually removed.
    untracked(() => {
      dispose = effectScope(() => {
        rendered = this.children(item, index) as Node | null;
      });
    });
    return {
      entry: {
        start: document.createComment(`[${key}]`),
        end: document.createComment(`[/${key}]`),
        dispose,
      },
      rendered,
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
  entry.dispose();
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
  entry.dispose();
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

// Registry brand so duplicate runtime copies recognize each other's For.
const FOR_BRAND = Symbol.for("elements-kit.for");
(For as unknown as Record<symbol, boolean>)[FOR_BRAND] = true;

/** @internal Cross-instance-safe For check (identity or brand). */
export function isForComponent(type: unknown): boolean {
  return (
    type === For ||
    (typeof type === "function" &&
      (type as unknown as Record<symbol, boolean>)[FOR_BRAND] === true)
  );
}
