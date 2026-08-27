import type { ComponentFn, JSX } from ".";
import { applyProps, PropsTarget } from "./properties";
import {
  MATHML_NAMESPACE,
  MathMLElements,
  SVG_NAMESPACE,
  SvgElements,
} from "./constants";
import { effectScope, untracked } from "../signals";
import { getRenderer } from "./renderer";
import { attachDisposables } from "./dispose";
import "../polyfill";
import type { JSX as DomJSX } from "dom-expressions/src/jsx";

// dom-expressions' `DOMAttributes` mixes in several Solid namespaces the
// elements-kit runtime never wires: `applyProps`/`setProp` (properties.ts)
// handle only `on:`, `prop:`, `class:`, `style:`, `xlink:`/`xml:`, bare
// `class`/`style`, `children`, `ref`, and plain attributes. Left in the types,
// the rest would typecheck and then silently no-op — the same trap as the
// camelCase event handlers (a bare `onClick` routes to `setAttribute`; see
// element.test.ts). Omit every key the runtime can't honor. Preserved: `on:`
// (`OnAttributes` + the `CustomEventHandlersNamespaced` catalog), `aria-*` /
// `role` (valid HTML attributes), and our own `prop:`/`class:`/`style:` added
// back by `WithJsxNamespaces`.
//
// This union MUST stay concrete (each handler interface instantiated with
// `any`, not a generic `T`). The handler keys don't depend on the element type
// — `T` only appears in value positions. If any member were `keyof X<T>` with a
// generic `T`, the whole union defers inside `DOMIntrinsicElements`' mapped type
// and `Omit` silently keeps the plain-literal keys (`classList`, `$ServerOnly`)
// while still dropping the `keyof` ones — a partial, misleading strip.
//
// Omitting by `keyof <interface>` is augmentation-proof — the empty `use:` /
// `attr:` / `bool:` / `oncapture:` namespaces are stripped if a consumer ever
// augments Solid's `Directives` / `ExplicitAttributes` / etc.
type UnsupportedDomKeys =
  | "ref"
  | "children"
  | "classList"
  | "$ServerOnly" // CustomAttributes: ref/children re-added in index.ts
  | keyof DomJSX.CustomEventHandlersCamelCase<any> // onClick, onInput, …
  | keyof DomJSX.CustomEventHandlersLowerCase<any> // onclick, oninput, …
  | keyof DomJSX.DirectiveAttributes // use:  (empty unless augmented)
  | keyof DomJSX.DirectiveFunctionAttributes<any> // use:  (empty unless augmented)
  | keyof DomJSX.AttrAttributes // attr: (empty unless augmented)
  | keyof DomJSX.BoolAttributes // bool: (empty unless augmented)
  | keyof DomJSX.OnCaptureAttributes<any>; // oncapture: (empty unless augmented)

export type DOMIntrinsicElements = {
  [K in keyof DomJSX.IntrinsicElements]: Omit<
    DomJSX.IntrinsicElements[K],
    UnsupportedDomKeys
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
      el = type(props);
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
