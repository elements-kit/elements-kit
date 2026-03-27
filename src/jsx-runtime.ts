import { toNode } from "./core";
import { effect, isReactive } from "./signals";
import { Slot } from "./slot";

type Children = string | Node;

function h(
  type: string,
  props: {
    children?: Children[] | Children;
  } | null,
) {
  const el = document.createElement(type);

  if (!props) {
    return el;
  }

  for (const [key, value] of Object.entries(props)) {
    if (key === "children") continue;

    if (key === "style" && typeof value === "object") {
      Object.assign(el.style, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      effect(() => {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
        return () => {
          el.removeEventListener(event, value);
        };
      });
    } else {
      el.setAttribute(key, String(value));
    }
  }

  if (!props.children) {
    return el;
  }

  const children = Array.isArray(props.children)
    ? props.children
    : [props.children];

  for (const child of children) {
    if (isReactive(child)) {
      const slot = Slot.new();
      el.appendChild(slot());

      effect(() => {
        const value = toNode(child());
        slot.set(value);
      });
      continue;
    }
    el.appendChild(toNode(child));
  }
  return el;
}

export { h as jsx, h as jsxs, h as jsxDEV };

type Map<T> = {
  [tag in keyof T]: Partial<Omit<T[tag], "children">> & {
    children?: Children[] | Children;
    [event: `on${string}`]: (event: Event) => void;
  };
};

export namespace JSX {
  // The return type of JSX expressions
  export type Element = HTMLElement;

  // Map of HTML tag names to their props
  export type IntrinsicElements = Map<HTMLElementTagNameMap>;

  // Tell TypeScript that the 'children' prop is special
  export interface ElementChildrenAttribute {
    children: {};
  }
}
