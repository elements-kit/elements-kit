import type { PrimitiveNodeType } from "../lib";
import type { JSX } from ".";
import type { ReactiveProps } from "./infer";

/** An instance created by a component class — must expose `render()`. */
export interface ComponentInstance {
  render(): JSX.Element;
}

/** A class whose constructor returns a ComponentInstance. */
export type ComponentClass<P extends Record<PropertyKey, unknown> = any> = new (
  props: P,
) => ComponentInstance;
export type ComponentFn<P extends Record<PropertyKey, unknown> = any> = (
  props: ReactiveProps<P>,
) => JSX.Element;

/** Anything valid as the first arg to `createElement` / a JSX tag target. */
export type Component = NonNullable<JSX.Element> | ComponentClass | ComponentFn;

/** A resolved runtime node — what `applyProps` / `applyChildren` operate on. */
export type PropsTarget = NonNullable<JSX.Element> | ComponentInstance;

/** Anything that can appear as a JSX child. */
export type Child = PrimitiveNodeType | JSX.Element | AnyFn | Child[];

export type AnyFn = (...args: any[]) => Child;

export type Disposer = () => void;
