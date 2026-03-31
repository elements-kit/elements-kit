import { ElementBuilder } from "./core";

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

  /**
   * Replace the slot's content with the given element.
   * No-op if the slot is not mounted or the content is identical.
   */
  set(element: Node) {
    const parent = this.parent();
    if (!parent) return;
    if (this.isSame(element)) return;

    const range = document.createRange();
    range.setStartAfter(this.start);
    range.setEndBefore(this.end);
    range.deleteContents();
    parent.insertBefore(element, this.end);
  }

  get(): DocumentFragment {
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
    }) as Slot & typeof instance.slot;
  }
}
export type SlotInstance = ReturnType<typeof Slot.new>;

/** A callable slot — invoke to render, or access `.set()` / `.isMounted()` / `.parent()` for management. */

/** Symbol key for attaching a `SlotManager` to a custom element instance. */
export const SLOTS: unique symbol = Symbol("slots");

const MAP: unique symbol = Symbol("map");
const KEYS: unique symbol = Symbol("keys");
const HAS: unique symbol = Symbol("has");

/**
 * A keyed collection of slot instances.
 * Slots are pre-created from the provided keys and lazily created on first access for unknown keys.
 */
class SlotManager<K extends string> implements Iterable<[K, SlotInstance]> {
  readonly [MAP] = new Map<K, SlotInstance>();

  constructor(keys: K[] = []) {
    for (const key of keys) {
      this[MAP].set(key, Slot.new());
    }
  }

  [Symbol.iterator]() {
    return this[MAP][Symbol.iterator]();
  }

  [Symbol.toStringTag]() {
    return "Slots";
  }

  [Symbol.hasInstance](instance: unknown) {
    return instance instanceof SlotManager;
  }

  [HAS](key: K) {
    return this[MAP].has(key);
  }

  /** Check whether a slot with the given key exists. */
  static has<K extends string>(slots: SlotManager<K>, key: K): boolean {
    return slots[HAS](key);
  }

  [KEYS]() {
    return this[MAP].keys();
  }

  /** Iterate over all registered slot keys. */
  static keys<K extends string>(slots: SlotManager<K>): MapIterator<K> {
    return slots[KEYS]();
  }
}

export function Slots<K extends string>(
  keys: K[],
): SlotManager<K> & { readonly [P in K]: SlotInstance } {
  const instance = new SlotManager(keys);
  return new Proxy(instance, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && target[MAP].has(prop as K)) {
        return target[MAP].get(prop as K);
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as SlotManager<K> & { readonly [P in K]: SlotInstance };
}
