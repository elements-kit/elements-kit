// ═══════════════════════════════════════════════════════════════════════════════
// Child Types
// ═══════════════════════════════════════════════════════════════════════════════

import type { PrimitiveNodeType } from "../lib";

/** An instance created by a component class — must expose `render()`. */
export interface ComponentInstance {
  render(): Element | DocumentFragment | null;
}

/** A class whose constructor returns a ComponentInstance. */
export type ComponentClass<P = any> = new (props: P) => ComponentInstance;
export type ComponentFn = (
  props: Record<string | symbol, unknown>,
) => null | Element | DocumentFragment;

export type Component = Element | DocumentFragment | ComponentInstance;
/** Anything that can appear as a JSX child. */
export type Child = PrimitiveNodeType | AnyFn | Child[];

export type Disposer = () => void;

/** A function that renders props into an element or fragment. */
// export type ComponentFn<P = Record<string, unknown>> = (props?: P) => Child;

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type AnyFn = (...args: any[]) => any;
