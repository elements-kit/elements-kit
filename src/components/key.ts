import { effect } from "../signals";
import { disposeElement } from "../jsx-runtime/element";

/**
 * Key-gated renderer. Fully tears down and re-renders children whenever the
 * value of `by` changes — analogous to Svelte's `{#key}` block.
 *
 * @example
 * ```tsx
 * <Key by={currentTab}>
 *   {() => <TabContent />}
 * </Key>
 * ```
 *
 * Props:
 *   by       — reactive getter; when its value changes, children are destroyed
 *              and re-rendered from scratch
 *   children — render function called fresh on every key change
 */
export class Key {
  by: () => string | number = () => 0;
  children: () => Element | DocumentFragment | null = () => null;

  readonly #start = document.createComment("<Key>");
  readonly #end = document.createComment("</Key>");

  render(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this.#start);
    fragment.appendChild(this.#end);

    effect(() => {
      this.by(); // subscribe — re-run on key change

      const parent = this.#start.parentNode;
      if (!parent) return;

      // Destroy existing subtree — dispose every element in range recursively
      let node: ChildNode | null = this.#start.nextSibling;
      while (node && node !== this.#end) {
        const next = node.nextSibling;
        destroyNode(node);
        node = next;
      }

      // Render fresh subtree
      const rendered = this.children();
      if (rendered) parent.insertBefore(rendered, this.#end);
    });

    return fragment;
  }
}

/** Recursively disposes all elements in a subtree then removes the root node. */
function destroyNode(node: ChildNode): void {
  if (node instanceof Element) {
    for (const child of node.querySelectorAll("*")) {
      disposeElement(child);
    }
    disposeElement(node);
  }
  node.remove();
}
