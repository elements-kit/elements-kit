import { effect, MaybeReactive, onCleanup } from "@/signals";
import { mountChild, Children } from "./children";
import type { Props } from "./infer";
import { MATHML_NAMESPACE, SVG_NAMESPACE } from "./constants";
import { Slot } from "@/slot";

/** Namespaces the HTML parser enters only on seeing an `<svg>`/`<math>` tag. */
export type ForeignNamespace = "svg" | "mathml";

const ForeignRoots: Record<ForeignNamespace, [ns: string, root: string]> = {
  svg: [SVG_NAMESPACE, "svg"],
  mathml: [MATHML_NAMESPACE, "math"],
};

/**
 * Parse an HTML string script-inertly — `<script>` never executes. Sanitizing
 * the input is the caller's responsibility.
 *
 * `ns` parses against a detached root of that namespace, so an interior
 * fragment lands in SVG/MathML rather than XHTML. The element is the parser's
 * context, not a text wrapper, so a stray `</svg>` can't escape the region.
 */
export function parseHtml(
  html: string,
  ns?: ForeignNamespace,
): DocumentFragment {
  if (ns === undefined) {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content;
  }
  const [namespace, root] = ForeignRoots[ns];
  const host = document.createElementNS(namespace, root);
  host.innerHTML = html;
  const fragment = document.createDocumentFragment();
  fragment.append(...host.childNodes);
  return fragment;
}

/**
 * Used by the JSX transform for `<>...</>` fragments.
 *
 * Each child is routed through `mountChild`, which handles Nodes, strings,
 * numbers, arrays, and reactive getters — matching the behavior of any other
 * JSX container. `mountChild` also wires each child's cleanup via its own
 * `effectScope`, which links to the enclosing `effectScope` created by
 * `createElement(Fragment, ...)` for disposal propagation.
 *
 * **Raw HTML mode** — `<Fragment html>{markup}</Fragment>`: the child is a
 * `MaybeReactive<string>` rendered as markup inside a Slot region (comment
 * markers), so the server renderer and the hydration claim pass share the
 * region boundary. Reactive sources re-render the region on change. This is
 * the library's only raw-HTML sink: the string is NOT escaped — sanitize
 * untrusted input at the call site. `<script>` tags never execute.
 *
 * `ns` marks the markup as interior foreign content —
 * `<svg><Fragment html ns="svg">{interior}</Fragment></svg>`. Generated code is
 * the expected caller (the SVG plugin knows the namespace at build time). The
 * server ignores it; the string is already inside its parent there.
 */
export function Fragment(
  props:
    | Props<{ children?: Children }>
    | { html: true; ns?: ForeignNamespace; children: MaybeReactive<string> },
): DocumentFragment {
  const fragment = document.createDocumentFragment();

  if ("html" in props && props.html) {
    const ns = "ns" in props ? props.ns : undefined;
    const slot = new Slot();
    fragment.appendChild(slot.get());
    const source = props.children as unknown;
    if (typeof source === "function") {
      // Signal, computed, or a plain thunk — a live region either way; a
      // thunk that tracks nothing simply runs once.
      effect(() => {
        const value = (source as () => unknown)();
        slot.set(parseHtml(value == null ? "" : String(value), ns));
      });
      onCleanup(() => slot.clear());
    } else if (source != null) {
      slot.set(parseHtml(String(source), ns));
    }
    return fragment;
  }

  // Children arrive as written. A function child is a reactive child, so hand
  // it to `mountChild` rather than calling it here — calling would flatten a
  // live getter into a one-time snapshot.
  const raw = props.children;
  if (raw == null) return fragment;

  const nodes = Array.isArray(raw) ? (raw as unknown[]).flat(Infinity) : [raw];
  for (const child of nodes) mountChild(fragment, child as Children);

  return fragment;
}

// Registry brand so duplicate runtime copies recognize each other's Fragment.
const FRAGMENT_BRAND = Symbol.for("elements-kit.fragment");
(Fragment as unknown as Record<symbol, boolean>)[FRAGMENT_BRAND] = true;

/** @internal Cross-instance-safe Fragment check (identity or brand). */
export function isFragmentComponent(type: unknown): boolean {
  return (
    type === Fragment ||
    (typeof type === "function" &&
      (type as unknown as Record<symbol, boolean>)[FRAGMENT_BRAND] === true)
  );
}
