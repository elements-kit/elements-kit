/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi } from "vitest";
import hydrator from "./astro-client";
import { renderToString } from "../server";
import { signal } from "../signals";

async function island(app: () => unknown): Promise<HTMLElement> {
  const el = document.createElement("astro-island");
  el.setAttribute("ssr", "");
  el.innerHTML = await renderToString(app);
  return el;
}

describe("astro-client hydrator", () => {
  it("hydrates server DOM: handlers attach, node identity preserved", async () => {
    const clicks = vi.fn();
    const App = () => <button on:click={clicks}>go</button>;
    const el = await island(() => <button>go</button>);
    const before = el.querySelector("button")!;

    await hydrator(el)(App, {}, {}, { client: "load" });

    const after = el.querySelector("button")!;
    expect(after).toBe(before);
    after.click();
    expect(clicks).toHaveBeenCalledTimes(1);
  });

  it("wires live bindings through hydration", async () => {
    const s = signal("a");
    const App = () => <p>{() => s()}</p>;
    const el = await island(App);

    await hydrator(el)(App, {}, {}, { client: "load" });

    s("b");
    expect(el.querySelector("p")!.textContent).toBe("b");
  });

  it("renders fresh for client:only", async () => {
    const App = () => <span>fresh</span>;
    const el = document.createElement("astro-island");
    el.setAttribute("ssr", "");

    await hydrator(el)(App, {}, {}, { client: "only" });

    expect(el.querySelector("span")!.textContent).toBe("fresh");
  });

  it("passes island props to the component as written", async () => {
    // Island props are serialized JSON, so they arrive static — the same
    // component and props render on both sides, so the shapes agree.
    const App = (props: { label: string }) => <em>{props.label}</em>;
    const el = await island(() => <App label="hi" />);

    await hydrator(el)(App, { label: "hi" }, {}, { client: "load" });

    expect(el.querySelector("em")!.textContent).toBe("hi");
  });

  it("disposes on astro:unmount", async () => {
    const s = signal("a");
    const App = () => <p>{() => s()}</p>;
    const el = await island(App);
    await hydrator(el)(App, {}, {}, { client: "load" });

    el.dispatchEvent(new Event("astro:unmount"));

    s("c");
    expect(el.querySelector("p")!.textContent).not.toBe("c");
  });

  it("hydrates islands with slot content, adopting the wrappers", async () => {
    const clicks = vi.fn();
    const Card = (props: { children?: unknown }) => (
      <section>
        <button on:click={clicks}>go</button>
        {props.children as never}
      </section>
    );
    const el = document.createElement("astro-island");
    el.setAttribute("ssr", "");
    el.innerHTML =
      "<section><button>go</button><!--{--><!--{--><astro-slot><!--{--><p>body</p><!--}--></astro-slot><!--}--><!--}--></section>";

    await hydrator(el)(Card, {}, { default: "<p>body</p>" }, {
      client: "load",
    });

    // Slot props flow through getter props → dynamic region: content is
    // re-rendered (not adopted) on hydrate, so assert structure, not identity.
    expect(el.querySelector("astro-slot p")!.textContent).toBe("body");
    expect(el.textContent).not.toContain("[object");
    el.querySelector("button")!.click();
    expect(clicks).toHaveBeenCalledTimes(1);
  });

  it("renders slot content fresh for client:only", async () => {
    const Card = (props: { children?: unknown }) => (
      <section>{props.children as never}</section>
    );
    const el = document.createElement("astro-island");
    el.setAttribute("ssr", "");

    await hydrator(el)(Card, {}, { default: "<p>solo</p>" }, {
      client: "only",
    });

    expect(el.querySelector("astro-slot p")!.textContent).toBe("solo");
  });

  it("is a no-op without the ssr attribute", async () => {
    const clicks = vi.fn();
    const App = () => <button on:click={clicks}>go</button>;
    const el = document.createElement("astro-island");
    el.innerHTML = "<button>go</button>";

    await hydrator(el)(App, {}, {}, { client: "load" });

    el.querySelector("button")!.click();
    expect(clicks).not.toHaveBeenCalled();
  });
});
