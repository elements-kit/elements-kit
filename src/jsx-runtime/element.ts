import type {
  Component,
  ComponentClass,
  ComponentFn,
  ComponentInstance,
  PropsTarget,
} from "./types";
import type { JSX } from ".";
import { applyProps } from "./properties";
import { effectScope, resolveProps, untracked } from "../signals";
import { attachDisposables } from "./dispose";
import "../polyfill";

// ─ Public API ─────────────────────────────────────────────────────────────────

export function createElement(
  type: string | Component,
  { ref, ...props }: JSX.IntrinsicAttributes & Record<string, unknown> = {},
): JSX.Element {
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
  type: ComponentFn,
  props: Record<string, unknown>,
  ref: ((el: Element) => void) | undefined,
): JSX.Element {
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
): JSX.Element {
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
  if (typeof type === "string") return document.createElement(type);
  if (type instanceof Element || type instanceof DocumentFragment) return type;
  return new (type as new (...args: any[]) => ComponentInstance)();
}

function renderNode(
  node: ComponentInstance | Element | DocumentFragment | null,
): Element | DocumentFragment | null {
  if (node instanceof Element || node instanceof DocumentFragment) return node;
  if (!node || typeof node.render !== "function") return null;
  return renderNode(node.render());
}

