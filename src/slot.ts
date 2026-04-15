import { ElementBuilder } from "./builder";
import "./polyfill";

/**
 * A lightweight slot that reserves a region in the DOM using comment markers.
 * Content between the markers can be replaced dynamically without wrapper elements.
 */
export class Slot {
  // Using comments as markers to avoid extra elements in the DOM
  private readonly start = document.createComment("{");
  private readonly end = document.createComment("}");

  /**
   * Render the slot as a DocumentFragment.
   * If not yet mounted, inserts the comment markers and optional default content.
   * If already mounted, extracts and returns the current content.
   */
  /**
   * Render the slot as a DocumentFragment.
   * If not yet mounted, inserts the comment markers and optional default content.
   * If already mounted, extracts and returns the current content WITHOUT disposing
   * it — the caller takes ownership of the returned nodes and is responsible for
   * their disposal.
   */
  slot(defaultContent?: string | Node | ElementBuilder) {
    const fragment = document.createDocumentFragment();
    if (this.isMounted()) {
      const range = document.createRange();
      range.setStartAfter(this.start);
      range.setEndBefore(this.end);
      fragment.appendChild(range.extractContents());
      return fragment;
    }
    fragment.appendChild(this.start);
    fragment.appendChild(this.end);
    if (defaultContent) {
      // TODO: refactor th
      const defaultNode =
        typeof defaultContent === "string"
          ? document.createTextNode(defaultContent)
          : defaultContent instanceof Node
            ? defaultContent
            : defaultContent.ref();
      fragment.insertBefore(defaultNode, this.end);
    }
    return fragment;
  }

  /** Dispose reactive children and remove all content between the markers. */
  clear() {
    let node: ChildNode | null = this.start.nextSibling;
    while (node && node !== this.end) {
      // Save nextSibling before dispose — if dispose removes the node from DOM
      // the sibling pointer would be lost.
      const next = node.nextSibling;
      if (node instanceof Element)
        (node as unknown as Disposable)[Symbol.dispose]?.();
      node = next;
    }
    const range = document.createRange();
    range.setStartAfter(this.start);
    range.setEndBefore(this.end);
    range.deleteContents();
  }

  /**
   * Replace the slot's content with the given element.
   * No-op if the slot is not mounted or the content is identical.
   */
  set(element: Node) {
    const parent = this.parent();
    if (!parent) return;
    if (this.isSame(element)) return;
    this.clear();

    parent.insertBefore(element, this.end);
  }

  /**
   * Extract and return the current slot content as a DocumentFragment.
   * Returns `null` if the slot is not mounted.
   * Content is NOT disposed — the caller takes ownership and is responsible
   * for disposal.
   */
  get(): DocumentFragment | null {
    if (!this.isMounted()) return null;
    const range = document.createRange();
    range.setStartAfter(this.start);
    range.setEndBefore(this.end);
    return range.extractContents();
  }

  /** Returns the parent node if the slot is mounted, otherwise `null`. */
  parent() {
    return this.isMounted() ? this.start.parentNode : null;
  }

  /** Whether the slot's comment markers are attached to the DOM. */
  isMounted() {
    return (
      this.start.parentNode === this.end.parentNode && !!this.start.parentNode
    );
  }

  private isSame(element: Node) {
    return (
      this.start.nextSibling === element && this.end === element.nextSibling
    );
  }

  /**
   * Create a callable slot instance.
   *
   * The returned value is both a function and an object:
   * - Call it to render the slot with optional default content.
   * - Access `.set()`, `.parent()`, `.isMounted()` for slot management.
   *
   * @example
   * ```ts
   * const slot = createSlot();
   * el.append(slot("default text"));  // mount with default
   * slot.set(newElement);              // replace content
   * ```
   */
  static new() {
    const instance = new Slot();
    return new Proxy(instance.slot.bind(instance), {
      apply(target, _thisArg, argArray) {
        return target(...argArray);
      },
      get(_target, prop) {
        return instance[prop as keyof Slot];
      },
      getPrototypeOf() {
        return Slot.prototype;
      },
    }) as Slot & typeof instance.slot;
  }
}
export type SlotInstance = ReturnType<typeof Slot.new>;

/** A callable slot — invoke to render, or access `.set()` / `.isMounted()` / `.parent()` for management. */

/**
 * Symbol key for attaching a `Slots` instance to a custom element instance.
 * This prevent collisions with Element properties and are not meant to be treated as JSX children.
 */
export const $slots: unique symbol = Symbol("slots");

const $map: unique symbol = Symbol("map");
const $keys: unique symbol = Symbol("keys");
const $has: unique symbol = Symbol("has");

/**
 * A keyed collection of slot instances.
 * Slots are pre-created from the provided keys and lazily created on first access for unknown keys.
 */
export class Slots<K extends string> implements Iterable<[K, SlotInstance]> {
  readonly [$map] = new Map<K, SlotInstance>();

  private constructor(keys: K[] = []) {
    for (const key of keys) {
      this[$map].set(key, Slot.new());
    }
  }

  [Symbol.iterator]() {
    return this[$map][Symbol.iterator]();
  }

  [Symbol.toStringTag]() {
    return "Slots";
  }

  [Symbol.hasInstance](instance: unknown) {
    return instance instanceof Slots;
  }

  [$has](key: K) {
    return this[$map].has(key);
  }

  /** Check whether a slot with the given key exists. */
  static has<K extends string>(slots: Slots<K>, key: K): boolean {
    return slots[$has](key);
  }

  [$keys]() {
    return this[$map].keys();
  }

  /** Iterate over all registered slot keys. */
  static keys<K extends string>(slots: Slots<K>): MapIterator<K> {
    return slots[$keys]();
  }
  static new<K extends string>(
    keys: K[],
  ): Slots<K> & { readonly [P in K]: SlotInstance } {
    const instance = new Slots(keys);
    return new Proxy(instance, {
      get(target, prop, receiver) {
        if (typeof prop === "string" && target[$map].has(prop as K)) {
          return target[$map].get(prop as K);
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as Slots<K> & { readonly [P in K]: SlotInstance };
  }
}
