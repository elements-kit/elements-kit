import { effect, isReactive } from "../signals";
import { Component, Child, AnyFn, Disposer } from "./types";
import { $slots, Slots, Slot } from "../slot";
import { resolveNode } from "../lib";

// ─ Typed $slots accessor ──────────────────────────────────────────────────────

type SlotsMap = Slots<string> & Record<string, Slot>;
type WithSlots = Component & { [$slots]: SlotsMap };

function hasSlots(node: Component): node is WithSlots {
  return $slots in node;
}

// ─ Public API ─────────────────────────────────────────────────────────────────

export function isChildrenProperty(node: Component, key: string): boolean {
  if (hasSlots(node)) {
    const slotName = key.replace(/^slot:/, "");
    if (Slots.has(node[$slots], slotName)) return true;
    // fall through — still check "children" and direct Slot properties
  }
  if (key === "children") return true;

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
    const slot = (node as Record<typeof key, unknown>)[key];
    if (!(slot instanceof Slot)) return;
    return applySlot(slot, value);
  }
}

// ─ Helpers ────────────────────────────────────────────────────────────────────

/**
 * Sets a Slot's content from a Child value.
 */
function applySlot(slot: Slot, value: Child): (() => void) | void {
  if (isReactive(value)) {
    return effect(() => slot.set(resolveNode((value as AnyFn)())));
  }
  slot.set(resolveNode(value));
}

function mountChildren(
  el: Element | DocumentFragment,
  value: Child,
): (() => void) | void {
  const children = ensureFlatArray(value);
  const disposers: Disposer[] = [];

  for (const child of children) {
    if (isReactive(child)) {
      const slot = Slot.new();
      el.appendChild(slot());
      disposers.push(effect(() => slot.set(resolveNode(child()))));
      continue;
    }

    el.appendChild(resolveNode(child as any));
  }

  return disposers.length > 0 ? () => disposers.forEach((d) => d()) : undefined;
}

/** Normalises the children prop into a flat array. */
function ensureFlatArray<T>(raw: T | T[]): T[] {
  const r = Array.isArray(raw) ? raw : [raw];
  return r.flat(Infinity) as T[];
}
