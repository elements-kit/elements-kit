import { createElement } from "@/jsx-runtime/element";
import { hydrate } from "@/hydrate";
import { render } from "@/render";
import { withSlotProps } from "./astro-slots";
import { HMR_SLOT } from "./hmr-slot";
import type { ElementsKitHmr, IslandRecord } from "./hmr-runtime";

// The registry itself is imported only by the dev HMR plugin's injected code,
// never from here — in production the slot is empty and the lookup below costs
// one property read.

/**
 * Astro client entrypoint: hydrate an elements-kit island.
 *
 * Astro calls this as `hydrator(element)(Component, props, slots, { client })`
 * once the island's client directive fires. `client:only` mounts fresh via
 * `render`; every other directive adopts the server DOM via `hydrate` —
 * handlers attach to existing nodes, nothing is rebuilt. The island's
 * `astro:unmount` event tears everything down.
 */
export default (element: HTMLElement) =>
  async (
    Component: unknown,
    props: Record<string, unknown>,
    slots: Record<string, string>,
    { client }: { client: string },
  ): Promise<void> => {
    if (!element.hasAttribute("ssr")) return;
    const merged = withSlotProps(props, slots);
    const app = () => createElement(Component as never, merged as never);

    // The record owns `dispose` rather than a local const: a dev hot swap
    // re-mounts the island and writes a new disposer back, and the unmount
    // listener has to tear down whatever is current, not the first mount.
    const record: IslandRecord = {
      element,
      Component,
      props: merged,
      dispose:
        client === "only"
          ? render(element, app as () => Node | null)
          : hydrate(element, app).dispose,
    };

    const hmr = (globalThis as Record<symbol, ElementsKitHmr | undefined>)[
      HMR_SLOT
    ];
    const unregister = hmr?.register(record);

    element.addEventListener(
      "astro:unmount",
      () => {
        unregister?.();
        record.dispose();
      },
      { once: true },
    );
  };
