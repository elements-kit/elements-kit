import "./polyfill";

/**
 * A lightweight slot that reserves a region in the DOM using comment markers.
 * Content between the markers can be replaced dynamically without wrapper elements.
 */
export class Slot {
  // Comment markers are lazy: created on first get(). Until then the slot
  // exists as a JS object only — set() before get() buffers in #pending.
  // Saves 2 DOM nodes per slot that's constructed but never rendered.
  #start: Comment | undefined;
  #end: Comment | undefined;
  // Content buffered via set() before the slot is mounted — applied on first get() call.
  #pending: Node | undefined;

  /**
   * Bind a slot to an existing marker pair (server-rendered comments) instead
   * of creating new ones. Used by the hydrate claim pass: content between the
   * markers is adopted as the slot's current content.
   */
  static claim(start: Comment, end: Comment): Slot {
    const slot = new Slot();
    slot.#start = start;
    slot.#end = end;
    return slot;
  }

  /**
   * Render the slot as a DocumentFragment.
   * If not yet mounted, inserts the comment markers and any default content
   * (`Node`s or strings — native `append()` semantics; strings become text
   * nodes). If already mounted, extracts and returns the current content
   * WITHOUT disposing it — the caller takes ownership of the returned nodes
   * and is responsible for their disposal.
   */
  get(...nodes: (string | Node)[]): DocumentFragment {
    const fragment = document.createDocumentFragment();
    if (this.isMounted()) {
      const range = document.createRange();
      range.setStartAfter(this.#start!);
      range.setEndBefore(this.#end!);
      fragment.appendChild(range.extractContents());
      return fragment;
    }
    const start = (this.#start ??= document.createComment("{"));
    const end = (this.#end ??= document.createComment("}"));
    fragment.appendChild(start);
    fragment.appendChild(end);
    // Use content buffered before mount, or the provided default.
    const initialContent = this.#pending ?? toContent(nodes);
    if (initialContent) fragment.insertBefore(initialContent, end);
    this.#pending = undefined;
    return fragment;
  }

  /** Dispose reactive children and remove all content between the markers. */
  clear() {
    if (!this.#start || !this.#end) return;
    let node: ChildNode | null = this.#start.nextSibling;
    while (node && node !== this.#end) {
      // Save nextSibling before dispose — if dispose removes the node from DOM
      // the sibling pointer would be lost.
      const next = node.nextSibling;
      if (node instanceof Element)
        (node as unknown as Disposable)[Symbol.dispose]?.();
      node = next;
    }
    const range = document.createRange();
    range.setStartAfter(this.#start);
    range.setEndBefore(this.#end);
    range.deleteContents();
  }

  /**
   * Replace the slot's content with the given nodes/strings (native
   * `append()` semantics; strings become text nodes). No args clears the
   * slot. Buffers until mounted; no-op if the content is identical.
   */
  set(...nodes: (string | Node)[]) {
    const content = toContent(nodes);
    if (content == null) {
      this.clear();
      return;
    }
    const parent = this.parent();
    if (!parent) {
      this.#pending = content; // buffer until get() mounts the markers
      return;
    }
    if (this.#isSame(content)) return;
    this.clear();
    parent.insertBefore(content, this.#end!);
    this.#pending = undefined;
  }

  /**
   * Extract and return the current slot content as a DocumentFragment.
   * Returns `null` if the slot is not mounted.
   * Content is NOT disposed — the caller takes ownership and is responsible
   * for disposal.
   */
  current(): DocumentFragment | null {
    if (!this.isMounted()) return null;
    const range = document.createRange();
    range.setStartAfter(this.#start!);
    range.setEndBefore(this.#end!);
    return range.extractContents();
  }

  /** Returns the parent node if the slot is mounted, otherwise `null`. */
  parent() {
    return this.isMounted() ? this.#start!.parentNode : null;
  }

  /** Whether the slot's comment markers are attached to the DOM. */
  isMounted() {
    return (
      !!this.#start &&
      this.#start.parentNode !== null &&
      this.#start.parentNode === this.#end!.parentNode
    );
  }

  #isSame(element: Node) {
    return (
      this.#start!.nextSibling === element && this.#end === element.nextSibling
    );
  }
}

// Collapse variadic slot content into a single insertable node. A lone `Node`
// is returned as-is (preserves identity for `#isSame`'s no-op fast path);
// strings and multiple items go through a fragment (native `append()`).
function toContent(nodes: (string | Node)[]): Node | undefined {
  if (nodes.length === 0) return undefined;
  if (nodes.length === 1 && nodes[0] instanceof Node) return nodes[0];
  const frag = document.createDocumentFragment();
  frag.append(...nodes);
  return frag;
}

/**
 * What a `@slot()` property assignment accepts — the same content the
 * platform's `ParentNode.append()` takes (`Node` or string, strings become
 * text nodes), plus arrays of it (JSX passes multiple children as an array).
 */
export type SlotContent = Node | string | readonly (Node | string)[];

function toArgs(value: SlotContent): (string | Node)[] {
  return Array.isArray(value)
    ? (value.flat(Infinity) as (string | Node)[])
    : [value as string | Node];
}

/**
 * Field decorator declaring a slot as a plain property backed by a
 * {@link Slot}. Reading returns the slot's region (`slot.get()` — a fragment
 * to append into any template, elements-kit JSX or not); assigning fills it
 * (`null` clears). Values follow native `append()` semantics — a `Node`, a
 * string, or an array of them. Assignment buffers before mount, so consumers
 * can set content before the element renders.
 *
 * The getter is EFFECTFUL: it mounts the markers on first read and extracts
 * current content on later reads (the re-render semantic of
 * {@link Slot.get}). Read it to PLACE the region, not to inspect it.
 *
 * Declare the field as {@link SlotContent} to accept the full native
 * `append()` surface (`Node` | string | array); narrow it to `Node` when the
 * slot only ever holds an element.
 *
 * @example
 * ```tsx
 * class Card extends HTMLElement {
 *   \@slot() header!: SlotContent;
 *
 *   render() {
 *     return <header>{this.header}</header>; // or root.append(card.header)
 *   }
 * }
 *
 * // consumers — any framework, or none:
 * card.header = document.createElement("h1"); // Node
 * card.header = "plain text";                  // native append() content
 * card.header = null;                          // clear
 * ```
 */
export function slot() {
  const store = new WeakMap<object, Slot>();

  return function <This extends object, V extends SlotContent | null>(
    _target: unknown,
    context: ClassFieldDecoratorContext<This, V>,
  ) {
    // Same shape as `@reactive`: addInitializer runs after the field's
    // [[DefineOwnProperty]] step, so the accessor is installed on top of the
    // data property the runtime just wrote.
    context.addInitializer(function (this: This) {
      const s = store.get(this)!;
      Object.defineProperty(this, context.name, {
        get(): Node {
          return s.get();
        },
        set(value: V) {
          if (value == null) {
            s.clear();
            return;
          }
          s.set(...toArgs(value));
        },
        enumerable: true,
        configurable: true,
      });
    });

    return function (this: This, initialValue: V): V {
      const s = new Slot();
      store.set(this, s);
      if (initialValue != null) s.set(...toArgs(initialValue)); // buffered until mount
      return initialValue;
    };
  };
}
