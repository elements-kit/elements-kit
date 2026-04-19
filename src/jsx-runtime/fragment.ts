import { mountChild } from "./children";
import type { Child } from "./types";

/**
 * Used by the JSX transform for `<>...</>` fragments.
 *
 * Each child is routed through `mountChild`, which handles Nodes, strings,
 * numbers, arrays, and reactive getters — matching the behavior of any other
 * JSX container. `mountChild` also wires each child's cleanup via its own
 * `effectScope`, which links to the enclosing `effectScope` created by
 * `createElement(Fragment, ...)` for disposal propagation.
 */
export function Fragment(props: { children?: () => Child }): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const raw = props.children?.();
  if (raw == null) return fragment;

  const nodes = Array.isArray(raw)
    ? (raw as unknown[]).flat(Infinity)
    : [raw];
  for (const child of nodes) mountChild(fragment, child as Child);

  return fragment;
}
