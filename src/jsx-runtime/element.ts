import { Component, ComponentClass, Disposer } from "./types";
import { applyProps } from "./properties";
import { $ref } from "./ref";
import "../polyfill";

export function createElement(
  type: string | Element | ComponentClass,
  { [$ref]: ref, ...props }: Record<string | symbol, unknown> = {},
): Element | DocumentFragment | null {
  const node = resolveElement(type);
  if (!node) return null;

  // ─ Properties ─────────────────────────────────────────────────────────────
  const disposables = applyProps(node, props);

  if (disposables.size > 0) attachDisposables(node, disposables);

  const el = _render(node);

  // ref fires after render with the final Element
  if (typeof ref === "function" && el instanceof Element) ref(el);

  return el;
}

function _render(
  node: ComponentClass | Element | DocumentFragment | null,
): Element | DocumentFragment | null {
  if (node instanceof Element || node instanceof DocumentFragment) return node;
  if (!node || typeof node.render !== "function") return null;
  return _render(node.render());
}

/**
 * Resolves the `type` argument of createElement into a concrete DOM node:
 *   - string          → document.createElement(type)
 *   - Element         → the element itself  (apply props to an existing node)
 *   - class component → new type()
 */
function resolveElement(
  type: string | Element | ComponentClass,
): ComponentClass | Element | DocumentFragment | null {
  if (typeof type === "string") return document.createElement(type);
  if (type instanceof Element) return type;

  return new type();
}

// ─ Disposable attachment ─────────────────────────────────────────────────────

function hasOwnDisposable(el: Component): el is Component & Disposable {
  return Object.hasOwn(el, Symbol.dispose);
}
function attachDisposables(el: Component, disposables: Set<Disposer>): void {
  const existingDispose = hasOwnDisposable(el)
    ? el[Symbol.dispose].bind(el)
    : null;

  Object.defineProperty(el, Symbol.dispose, {
    value() {
      existingDispose?.();
      disposables.forEach((fn) => fn());
      disposables.clear();
    },
    configurable: true,
  });
}

/** Runs all cleanup functions registered by JSX props/effects on `el`. */
export function disposeElement(el: Element): void {
  (el as unknown as Disposable)[Symbol.dispose]?.();
}
