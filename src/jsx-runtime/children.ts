import { effect, onCleanup } from "../signals";
import { Component, Child } from "./types";
import { $slots, Slots, Slot } from "../slot";
import { PrimitiveNodeType, resolveNode } from "../lib";
import { disposeElement } from "./element";

// ─ Typed $slots accessor ──────────────────────────────────────────────────────

type SlotsMap = Slots<string> & Record<string, Slot>;
type WithSlots = Component & { [$slots]: SlotsMap };

function hasSlots(node: Component): node is WithSlots {
  return $slots in node;
}

// ─ Public API ─────────────────────────────────────────────────────────────────

export function isChildrenProperty(node: Component, key: string): boolean {
  if (
    key === "children" &&
    (node instanceof Element || node instanceof DocumentFragment)
  )
    return true;

  if (hasSlots(node)) {
    const slotName = key.replace(/^slot:/, "");
    if (Slots.has(node[$slots], slotName)) return true;
    // fall through — still check "children" and direct Slot properties
  }

  return key in node && (node as Record<string, any>)[key] instanceof Slot;
}

export function applyChildren(
  node: Component,
  key: string,
  value: Child,
): void {
  // ─ $slots ─────────────────────────────────────────────────────────────────
  if (hasSlots(node)) {
    const slotName = key.replace(/^slot:/, "");
    if (Slots.has(node[$slots], slotName)) {
      applySlot(node[$slots][slotName], value);
      return;
    }
  }

  // ─ Children ─────────────────────────────────────────────────────────────────
  if (
    key === "children" &&
    (node instanceof Element || node instanceof DocumentFragment)
  ) {
    mountChildren(node as Element | DocumentFragment, value);
    return;
  }

  // ─ Slots ─────────────────────────────────────────────────────────────────
  if (key in node) {
    const slot = (node as unknown as Record<typeof key, unknown>)[key];
    if (!(slot instanceof Slot)) return;
    applySlot(slot, value);
  }
}

// ─ Helpers ────────────────────────────────────────────────────────────────────

function applySlot(slot: Slot, value: Child): void {
  if (typeof value === "function") {
    effect(() => slot.set(resolveChild(value())));
    onCleanup(() => slot.clear());
    return;
  }
  slot.set(resolveChild(value));
  onCleanup(() => slot.clear());
}

function mountChildren(
  el: Element | DocumentFragment,
  value: Child,
): void {
  for (const child of ensureFlatArray(value)) {
    if (typeof child === "function") {
      const slot = Slot.new();
      el.appendChild(slot());
      effect(() => slot.set(resolveChild(child())));
      onCleanup(() => slot.clear());
      continue;
    }
    const node = resolveChild(child as any);
    el.appendChild(node);
    if (node instanceof Element) onCleanup(() => disposeElement(node));
  }
}

function resolveChild(value: Child): Node {
  if (Array.isArray(value)) {
    const fragment = document.createDocumentFragment();
    for (const item of value as any[]) {
      fragment.appendChild(resolveChild(item));
    }
    return fragment;
  }
  if (typeof value === "function") return resolveChild(value());
  return resolveNode(value as PrimitiveNodeType);
}

/** Normalises the children prop into a flat array. */
function ensureFlatArray<T>(raw: T | T[]): T[] {
  const r = Array.isArray(raw) ? raw : [raw];
  return r.flat(Infinity) as T[];
}
