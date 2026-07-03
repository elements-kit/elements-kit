import { createElement } from "@/jsx-runtime/element";
import { setRenderer } from "@/jsx-runtime/renderer";
import { setInertEffects } from "@/signals/lib";
import { resolveProps } from "@/signals";
import { renderToString } from "@/server";
import { serverJsx, SNode } from "@/server/jsx";
import { withSlotProps } from "./astro-slots";

type RendererFn<T> = (
  Component: unknown,
  props: Record<string, unknown> | null | undefined,
  slots: Record<string, string>,
  metadata?: Record<string, unknown>,
) => Promise<T>;

interface ElementsKitSSRRenderer {
  name: string;
  check: RendererFn<boolean>;
  renderToStaticMarkup: RendererFn<{ html: string }>;
  supportsAstroStaticSlot: boolean;
}

/**
 * Decide whether `Component` is an elements-kit component. Invoked by Astro
 * for every candidate renderer, so this must reject foreign components: the
 * component body runs under the server renderer, and only elements-kit JSX
 * dispatches to it — the result is an `SNode`. A React component returns a
 * React element object (never `SNode`); components that throw (hooks outside
 * their framework, class components) are rejected by the catch.
 */
const check: RendererFn<boolean> = async (Component, props) => {
  if (typeof Component !== "function") return false;
  const prevInert = setInertEffects(true);
  setRenderer({ jsx: serverJsx as (type: never, props: never) => unknown });
  try {
    // Invoke the component itself, not serverJsx — serverJsx wraps any
    // function-component return in an SNode, which would accept everything.
    // Only elements-kit JSX inside the body dispatches to the active
    // renderer, so an elements-kit root returns an SNode; a React component
    // returns a React element object.
    const toGetterProps = resolveProps as unknown as (
      raw: object,
    ) => Record<string, unknown>;
    const call = Component as (p: Record<string, unknown>) => unknown;
    return call(toGetterProps(props ?? {})) instanceof SNode;
  } catch {
    return false;
  } finally {
    setRenderer(null);
    setInertEffects(prevInert);
  }
};

const renderToStaticMarkup: RendererFn<{ html: string }> = async (
  Component,
  props,
  slots,
  metadata,
) => {
  const merged = withSlotProps(
    props,
    slots,
    metadata?.astroStaticSlot === true,
  );
  const html = await renderToString(() =>
    createElement(Component as never, merged as never),
  );
  return { html };
};

const renderer: ElementsKitSSRRenderer = {
  name: "elements-kit",
  check,
  renderToStaticMarkup,
  supportsAstroStaticSlot: true,
};

export default renderer;
