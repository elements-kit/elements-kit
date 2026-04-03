// ═══════════════════════════════════════════════════════════════════════════════
// Child Types
// ═══════════════════════════════════════════════════════════════════════════════

import type { PrimitiveNodeType } from "../lib";

/** A class whose constructor returns an Element (custom elements). */
export type ComponentClass = {
  [key: string]: unknown;
  new (...args: any[]): ComponentClass;
  render(): Element;
};

export type Component = Element | DocumentFragment | ComponentClass;
/** Anything that can appear as a JSX child. */
export type Child = PrimitiveNodeType | AnyFn | Child[];

export type Disposer = () => void;

/** A function that renders props into an element or fragment. */
// export type ComponentFn<P = Record<string, unknown>> = (props?: P) => Child;

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type AnyFn = (...args: any[]) => any;
