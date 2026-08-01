import { createElement } from "@/jsx-runtime/element";
import { render } from "@/render";
import { HMR_SLOT } from "./hmr-slot";

/**
 * A live island mount. `Component` and `dispose` are mutable: a hot swap
 * replaces both in place, so the `astro:unmount` listener closed over this
 * record still tears down whatever is currently mounted.
 */
export interface IslandRecord {
  element: Element;
  Component: unknown;
  props: Record<string, unknown>;
  dispose: () => void;
}

export interface ElementsKitHmr {
  /** Track a mount. Returns an unregister function for unmount. */
  register(record: IslandRecord): () => void;
  /**
   * Re-mount every island whose component came from a module that just
   * changed. `false` means nothing on the page matched — the caller falls
   * back to `import.meta.hot.invalidate()`.
   */
  swap(
    prev: Record<string, unknown>,
    next: Record<string, unknown>,
  ): boolean;
}

const slot = globalThis as Record<symbol, ElementsKitHmr | undefined>;

const records = new Set<IslandRecord>();

function register(record: IslandRecord): () => void {
  records.add(record);
  return () => {
    records.delete(record);
  };
}

/**
 * Islands are matched by export identity, not by module URL: the changed
 * module hands over its own exports, and a record belongs to it when one of
 * those exports *is* the mounted component. That keeps this independent of
 * Astro's `component-url` format and handles named exports for free.
 */
function swap(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  let swapped = false;

  for (const record of records) {
    const key = Object.keys(prev).find((name) => prev[name] === record.Component);
    if (key === undefined) continue;

    const Next = next[key];
    if (typeof Next !== "function") continue;
    swapped = true;
    // Re-evaluation normally yields a fresh function; identical means the
    // update never reached this export. Nothing to do, but the module did
    // own an island — report success so the caller doesn't force a reload.
    if (Next === record.Component) continue;

    record.dispose();
    // Always `render`, never `hydrate`: the server DOM is gone after the
    // first client render, so a swap is a fresh mount into an empty host.
    record.element.replaceChildren();
    record.Component = Next;
    record.dispose = render(record.element, () =>
      createElement(Next as never, record.props as never),
    );
  }

  return swapped;
}

// First copy to load wins; the rest reuse its registry.
slot[HMR_SLOT] ??= { register, swap };

export default slot[HMR_SLOT] as ElementsKitHmr;
