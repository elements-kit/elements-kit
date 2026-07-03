import { it } from "vitest";

it("dist repro: full astro slot flow", async () => {
  const renderer = (await import("../dist/integrations/astro-server.mjs" as string)).default;
  const hydrator = (await import("../dist/integrations/astro-client.mjs" as string)).default;
  const { signal, computed } = await import("../dist/signals/index.mjs" as string);
  const { jsx } = await import("../dist/jsx-runtime/index.mjs" as string);

  const Card = (props: Record<string, unknown>) => {
    const open = signal(true);
    const display = computed(() => (open() ? "block" : "none"));
    return jsx("section", {
      children: [
        jsx("header", {
          children: [
            (props as never)["slot:header"],
            jsx("button", {
              "on:click": () => open(!open()),
              children: () => (open() ? "collapse" : "expand"),
            }),
          ],
        }),
        jsx("div", { "style:display": display, children: (props as never)["children"] }),
      ],
    });
  };
  const slots = { default: "<p>body</p>", header: "<strong>H</strong>" };
  const { html } = await renderer.renderToStaticMarkup(Card, {}, slots, { astroStaticSlot: true });
  console.log("SSR:", html.slice(0, 300));
  const el = document.createElement("astro-island");
  el.setAttribute("ssr", "");
  el.innerHTML = html;
  await hydrator(el)(Card, {}, slots, { client: "load" });
  el.querySelector("button")!.click();
  console.log("btn after click:", el.querySelector("button")!.textContent);
});
