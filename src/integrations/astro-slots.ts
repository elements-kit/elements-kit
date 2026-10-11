import { createElement } from "@/jsx-runtime/element";
import { Fragment } from "@/jsx-runtime/fragment";

/**
 * @internal Map Astro's pre-rendered slot HTML (`Record<name, html>`) into
 * elements-kit props: the `default` slot becomes `children`, each named slot
 * becomes a plain `<name>` prop (named slots are plain properties now — the
 * same shape `<Card header={…}>` passes). Each value is a thunk building
 * Astro's slot wrapper element around a `<Fragment html>` region — deferred so
 * the jsx dispatches to whichever renderer is active when the component reads
 * the prop (string emission on the server, DOM on the client).
 */
export function withSlotProps(
  props: Record<string, unknown> | null | undefined,
  slots: Record<string, string> | null | undefined,
  staticSlot = false,
): Record<string, unknown> {
  const base = { ...(props ?? {}) };
  if (!slots) return base;
  const tag = staticSlot ? "astro-static-slot" : "astro-slot";
  for (const [name, html] of Object.entries(slots)) {
    const slot = () =>
      createElement(tag as never, {
        ...(name === "default" ? {} : { name }),
        children: createElement(Fragment as never, {
          html: true,
          children: html,
        }),
      } as never);
    if (name === "default") base.children = slot;
    else base[name] = slot;
  }
  return base;
}
