import { rawHtml } from "@/lib";

/**
 * @internal Map Astro's pre-rendered slot HTML (`Record<name, html>`) into
 * elements-kit props: the `default` slot becomes `children`, named slots
 * become `slot:<name>` props. Each value is a script-inert {@link rawHtml}
 * node wrapped in Astro's slot element so the hydration claim pass can adopt
 * the server-emitted wrapper.
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
    if (name === "default") {
      base.children = rawHtml(html, tag);
    } else {
      base[`slot:${name}`] = rawHtml(html, tag, name);
    }
  }
  return base;
}
