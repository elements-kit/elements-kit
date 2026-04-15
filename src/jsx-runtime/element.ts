import {
  Component,
  ComponentClass,
  ComponentFn,
  ComponentInstance,
  Disposer,
} from "./types";
import { applyProps } from "./properties";
import { $ref } from "./ref";
import { effectScope } from "../signals";
import "../polyfill";

// ─ Public API ─────────────────────────────────────────────────────────────────

export function createElement(
  type: string | Element | DocumentFragment | ComponentClass | ComponentFn,
  rawProps: Record<string | symbol, unknown> = {},
): Element | DocumentFragment | null {
  // Extract $ref manually — esbuild drops computed Symbol keys in destructuring.
  const ref = rawProps[$ref] as ((el: Element) => void) | undefined;
  const props = Object.fromEntries(
    Object.entries(rawProps as Record<string, unknown>),
  ) as Record<string, unknown>;

  if (typeof type === "function" && !type.prototype?.render) {
    return createFunctionElement(
      type as (
        props: Record<string, unknown>,
      ) => Element | DocumentFragment | null,
      props,
      ref,
    );
  }

  return createNodeElement(
    type as string | Element | DocumentFragment | ComponentClass,
    props,
    ref,
  );
}

/** Runs all cleanup functions registered by JSX props/effects on `el`. */
export function disposeElement(el: Element): void {
  (el as unknown as Disposable)[Symbol.dispose]?.();
}

// ─ Component creators ─────────────────────────────────────────────────────────

function createFunctionElement(
  type: (props: Record<string, unknown>) => Element | DocumentFragment | null,
  props: Record<string, unknown>,
  ref: ((el: Element) => void) | undefined,
): Element | DocumentFragment | null {
  let el: Element | DocumentFragment | null | undefined;

  const dispose = effectScope(() => {
    el = type(props);
    if (typeof ref === "function" && el instanceof Element) ref(el);
  });

  const result = el as Element | DocumentFragment | null;

  if (result instanceof Element || result instanceof DocumentFragment) {
    attachDisposables(result, new Set([dispose]));
  } else {
    dispose();
  }

  return result;
}

function createNodeElement(
  type: string | Element | DocumentFragment | ComponentClass,
  props: Record<string, unknown>,
  ref: ((el: Element) => void) | undefined,
): Element | DocumentFragment | null {
  const node = resolveNode(type);
  if (!node) return null;

  let el: Element | DocumentFragment | null | undefined;

  const dispose = effectScope(() => {
    applyProps(node, props);
    el = renderNode(node);
    if (typeof ref === "function" && el instanceof Element) ref(el);
  });

  const result = el as Element | DocumentFragment | null;

  if (result instanceof Element || result instanceof DocumentFragment) {
    attachDisposables(result, new Set([dispose]));
  } else {
    dispose();
  }

  return result;
}

// ─ Node helpers ───────────────────────────────────────────────────────────────

function resolveNode(
  type: string | Element | DocumentFragment | ComponentClass,
): ComponentInstance | Element | DocumentFragment | null {
  if (typeof type === "string") return document.createElement(type);
  if (type instanceof Element || type instanceof DocumentFragment) return type;
  return new type();
}

function renderNode(
  node: ComponentInstance | Element | DocumentFragment | null,
): Element | DocumentFragment | null {
  if (node instanceof Element || node instanceof DocumentFragment) return node;
  if (!node || typeof node.render !== "function") return null;
  return renderNode(node.render());
}

// ─ Disposable attachment ──────────────────────────────────────────────────────

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
