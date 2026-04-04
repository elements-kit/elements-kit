import { effect } from "../signals";
import { Component, Child, Disposer } from "./types";
import { $slots, Slots, Slot } from "../slot";
import { PrimitiveNodeType, resolveNode } from "../lib";

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
): (() => void) | void {
  // ─ $slots ─────────────────────────────────────────────────────────────────
  if (hasSlots(node)) {
    const slotName = key.replace(/^slot:/, "");
    if (Slots.has(node[$slots], slotName)) {
      return applySlot(node[$slots][slotName], value);
    }
  }

  // ─ Children ─────────────────────────────────────────────────────────────────
  if (
    key === "children" &&
    (node instanceof Element || node instanceof DocumentFragment)
  ) {
    return mountChildren(node as Element | DocumentFragment, value);
  }

  // ─ Slots ─────────────────────────────────────────────────────────────────
  if (key in node) {
    const slot = (node as unknown as Record<typeof key, unknown>)[key];
    if (!(slot instanceof Slot)) return;
    return applySlot(slot, value);
  }
}

// ─ Helpers ────────────────────────────────────────────────────────────────────

/**
 * Sets a Slot's content from a Child value.
 */
function applySlot(slot: Slot, value: Child): (() => void) | void {
  if (typeof value === "function") {
    return effect(() => slot.set(resolveChild(value())));
  }
  slot.set(resolveChild(value));
}

function mountChildren(
  el: Element | DocumentFragment,
  value: Child,
): (() => void) | void {
  const children = ensureFlatArray(value);
  const disposers: Disposer[] = [];

  for (const child of children) {
    if (typeof child === "function") {
      const slot = Slot.new();
      el.appendChild(slot());
      disposers.push(effect(() => slot.set(resolveChild(child()))));
      continue;
    }

    el.appendChild(resolveChild(child as any));
  }

  return disposers.length > 0 ? () => disposers.forEach((d) => d()) : undefined;
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
