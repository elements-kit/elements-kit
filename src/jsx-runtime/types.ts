import type { PrimitiveNodeType } from "../lib";
import type { JSX } from ".";
import type { Props } from "./infer";

/** An instance created by a component class — must expose `render()`. */
export interface ComponentInstance {
  render(): JSX.Element | null;
}

/** A class whose constructor returns a ComponentInstance. */
export type ComponentClass<P extends Record<PropertyKey, unknown> = any> = new (
  props: P,
) => ComponentInstance;
export type ComponentFn<P extends Record<PropertyKey, unknown> = any> = (
  props: Props<P>,
) => JSX.Element | null;

/** A resolved runtime node — what `applyProps` / `applyChildren` operate on. */
export type PropsTarget = JSX.Element | ComponentInstance;

export type Child = PrimitiveNodeType | JSX.Element | AnyFn;
/** Anything that can appear as a JSX child. */
export type Children = Child | Child[];

export type AnyFn = (...args: any[]) => Children;

export type Disposer = () => void;
