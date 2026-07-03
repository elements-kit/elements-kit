// @vitest-environment node
/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect } from "vitest";
import renderer from "./astro-server";
import { signal } from "../signals";

describe("astro-server renderer", () => {
  it("exposes the renderer contract", () => {
    expect(renderer.name).toBe("elements-kit");
    expect(renderer.supportsAstroStaticSlot).toBe(true);
    expect(typeof renderer.check).toBe("function");
    expect(typeof renderer.renderToStaticMarkup).toBe("function");
  });

  it("check accepts elements-kit function components", async () => {
    const C = () => <p>x</p>;
    expect(await renderer.check(C, {}, {})).toBe(true);
  });

  it("check rejects React-style components (foreign element objects)", async () => {
    const R = () => ({ $$typeof: Symbol.for("react.element"), type: "p" });
    expect(await renderer.check(R, {}, {})).toBe(false);
  });

  it("check rejects throwing components and non-functions", async () => {
    const Throwing = () => {
      throw new Error("hooks outside react");
    };
    expect(await renderer.check(Throwing, {}, {})).toBe(false);
    expect(await renderer.check(null, {}, {})).toBe(false);
    expect(await renderer.check("div", {}, {})).toBe(false);
  });

  it("renderToStaticMarkup renders with our markers and getter props", async () => {
    const C = (props: { name: () => string }) => <p>{props.name}</p>;
    const s = signal("wael");
    const { html } = await renderer.renderToStaticMarkup(C, { name: s }, {});
    expect(html).toBe("<p><!--{-->wael<!--}--></p>");
  });

  it("maps the default slot to children as a wrapped raw-HTML node", async () => {
    const Card = (props: { children?: unknown }) => (
      <section>{props.children as never}</section>
    );
    const { html } = await renderer.renderToStaticMarkup(
      Card,
      {},
      { default: "<p>body</p>" },
    );
    expect(html).toBe(
      "<section><!--{--><!--{--><astro-slot><!--{--><p>body</p><!--}--></astro-slot><!--}--><!--}--></section>",
    );
  });

  it("maps named slots to slot:<name> props", async () => {
    const Card = (props: { "slot:header"?: unknown }) => (
      <header>{props["slot:header"] as never}</header>
    );
    const { html } = await renderer.renderToStaticMarkup(
      Card,
      {},
      { header: "<h1>t</h1>" },
    );
    expect(html).toBe(
      '<header><!--{--><!--{--><astro-slot name="header"><!--{--><h1>t</h1><!--}--></astro-slot><!--}--><!--}--></header>',
    );
  });

  it("uses astro-static-slot wrappers for static-context renders", async () => {
    const Card = (props: { children?: unknown }) => (
      <section>{props.children as never}</section>
    );
    const { html } = await renderer.renderToStaticMarkup(
      Card,
      {},
      { default: "<p>b</p>" },
      { astroStaticSlot: true },
    );
    expect(html).toContain("<astro-static-slot><!--{--><p>b</p><!--}--></astro-static-slot>");
  });
});
