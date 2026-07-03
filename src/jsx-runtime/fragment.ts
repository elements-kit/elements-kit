import { MaybeReactive, resolve } from "@/signals";
import { mountChild } from "./children";
import type { Child } from "./types";
import { Props } from ".";
import { Slot } from "@/slot";

/**
 * Used by the JSX transform for `<>...</>` fragments.
 *
 * Each child is routed through `mountChild`, which handles Nodes, strings,
 * numbers, arrays, and reactive getters — matching the behavior of any other
 * JSX container. `mountChild` also wires each child's cleanup via its own
 * `effectScope`, which links to the enclosing `effectScope` created by
 * `createElement(Fragment, ...)` for disposal propagation.
 */
export function Fragment(
  props:
    | Props<{
        children: Child;
      }>
    | {
        html: true;
        children: MaybeReactive<string>;
      },
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const slot = new Slot();
  fragment.append(slot.render());

  if ("html" in props) {
    const raw = resolve(props.children);
    if (raw != null)
      fragment.appendChild(
        document.createRange().createContextualFragment(raw),
      );
    return fragment;
  }

  const raw = resolve(props.children);
  if (raw == null) return fragment;

  const nodes = Array.isArray(raw) ? (raw as unknown[]).flat(Infinity) : [raw];
  for (const child of nodes) mountChild(fragment, child as Child);

  return fragment;
}
