import type { ComponentFn, JSX } from ".";
import { applyProps, PropsTarget } from "./properties";
import {
  MATHML_NAMESPACE,
  MathMLElements,
  SVG_NAMESPACE,
  SvgElements,
} from "./constants";
import { effectScope, resolveProps, untracked } from "../signals";
import { getRenderer } from "./renderer";
import { attachDisposables } from "./dispose";
import "../polyfill";
import type { JSX as DomJSX } from "dom-expressions/src/jsx";

// dom-expressions carries native DOM event handlers in two forms the runtime
// never wires: camelCase (`onClick`, `CustomEventHandlersCamelCase`) and
// all-lowercase (`onclick`, `CustomEventHandlersLowerCase`). `applyProps` only
// handles the `on:` namespace and routes a bare `onClick` to `setAttribute` — a
// silent no-op (see element.test.ts). Omitting exactly those two interfaces'
// keys keeps the types matched to the runtime; the namespaced `on:`/`oncapture:`
// handlers live in a separate interface (`CustomEventHandlersNamespaced`) and
// are preserved untouched.
type NativeEventKeys<T = any> =
  | keyof DomJSX.CustomEventHandlersCamelCase<T>
  | keyof DomJSX.CustomEventHandlersLowerCase<T>;

export type DOMIntrinsicElements = {
  [K in keyof DomJSX.IntrinsicElements]: Omit<
    DomJSX.IntrinsicElements[K],
    "children" | "ref" | NativeEventKeys<DomJSX.IntrinsicElements[K]>
  >;
};

// Per-tag concrete element type, extracted from dom-expressions' `ref` prop
// BEFORE DOMIntrinsicElements omits it (the attrs interfaces carry the element
// type nowhere else).
export type DOMElements = {
  [K in keyof DomJSX.IntrinsicElements]: DomJSX.IntrinsicElements[K] extends {
    ref?: infer R | undefined;
  }
    ? Extract<R, (el: any) => any> extends (el: infer E) => any
      ? E
      : Element
    : Element;
};

// ─ Public API ─────────────────────────────────────────────────────────────────

// Returns `JSX.Element | null` (not bare `JSX.Element`): null-returning
// function/class components propagate here. TS types JSX *expressions* via
// the `JSX.Element` namespace type, not this signature.
export function createElement(
  type: JSX.ElementType,
  allProps: { ref?: (el: Element) => void } & Record<string, unknown> = {},
): JSX.Element | null {
  const renderer = getRenderer();
  if (renderer) return renderer.jsx(type, allProps) as JSX.Element;

  const { ref, ...props } = allProps;
  if (typeof type === "function" && !type.prototype?.render) {
    return createFunctionElement(
      type as (
        props: Record<string, unknown>,
      ) => Element | DocumentFragment | null,
      props,
      ref,
    );
  }

  return createNodeElement(type, props, ref);
}

/** Runs all cleanup functions registered by JSX props/effects on `el`. */
export function disposeElement(el: Element): void {
  (el as unknown as Disposable)[Symbol.dispose]?.();
}

// ─ Component creators ─────────────────────────────────────────────────────────

function createFunctionElement(
  type: ComponentFn,
  props: Record<string, unknown>,
  ref: ((el: Element) => void) | undefined,
): JSX.Element | null {
  let el: Element | DocumentFragment | null | undefined;
  let dispose!: () => void;

  untracked(() => {
    dispose = effectScope(() => {
      el = type(resolveProps(props));
      if (typeof ref === "function" && el instanceof Element) ref(el);
    });
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
  type: JSX.ElementType,
  props: Record<string, unknown>,
  ref: ((el: Element) => void) | undefined,
): JSX.Element | null {
  const node = resolveNode(type);
  if (!node) return null;

  let el: Element | DocumentFragment | null | undefined;
  let dispose!: () => void;

  untracked(() => {
    dispose = effectScope(() => {
      applyProps(node, props);
      el = renderNode(node);
      if (typeof ref === "function" && el instanceof Element) ref(el);
    });
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

function resolveNode(type: JSX.ElementType): PropsTarget {
  if (typeof type === "string") {
    // SVG checked first — SVG appears far more often than MathML in real apps.
    if (SvgElements.has(type)) {
      return document.createElementNS(SVG_NAMESPACE, type);
    }
    if (MathMLElements.has(type)) {
      return document.createElementNS(MATHML_NAMESPACE, type);
    }
    return document.createElement(type);
  }
  if (type instanceof Element || type instanceof DocumentFragment) return type;
  return new (type as new (...args: any[]) => JSX.ElementClass)();
}

function renderNode(
  node: JSX.ElementClass | Element | DocumentFragment | null,
): Element | DocumentFragment | null {
  if (node instanceof Element || node instanceof DocumentFragment) return node;
  if (!node || typeof node.render !== "function") return null;
  return renderNode(node.render());
}
