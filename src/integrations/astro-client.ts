import { createElement } from "@/jsx-runtime/element";
import { hydrate } from "@/hydrate";
import { render } from "@/render";

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
    _slots: Record<string, string>,
    { client }: { client: string },
  ): Promise<void> => {
    if (!element.hasAttribute("ssr")) return;
    const app = () => createElement(Component as never, props as never);

    const dispose =
      client === "only"
        ? render(element, app as () => Node | null)
        : hydrate(element, app).dispose;

    element.addEventListener("astro:unmount", () => dispose(), { once: true });
  };
