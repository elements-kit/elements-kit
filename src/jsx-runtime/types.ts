// ═══════════════════════════════════════════════════════════════════════════════
// Child Types
// ═══════════════════════════════════════════════════════════════════════════════

export type BaseChild =
  | string
  | number
  | bigint
  | symbol
  | Date
  | RegExp
  | boolean
  | null
  | undefined
  | Node
  | Element
  | DocumentFragment;

/** A class whose constructor returns an Element (custom elements). */
export type ComponentClass = new () => Child;

/** Anything that can appear as a JSX child. */
export type Child = BaseChild | ComponentClass | ComponentFn | Child[]; // nested arrays are flattened

export type Disposer = () => void;

/** A function that renders props into an element or fragment. */
export type ComponentFn<P = Record<string, unknown>> = (props?: P) => Child;

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type AnyFn = (...args: any[]) => any;
