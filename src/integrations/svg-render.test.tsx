/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi } from "vitest";
import { jsx, Fragment } from "../jsx-runtime";
import { renderToString } from "../server";
import { hydrate } from "../hydrate";
import { signal } from "../signals";
import { generateModule } from "./svg";

const SVG_NS = "http://www.w3.org/2000/svg";

const CLOSE = `<svg xmlns="${SVG_NS}" width="48" height="48" viewBox="0 -960 960 960"><path d="m250-218 230-262Z"/></svg>`;

/**
 * Evaluate the plugin's emitted module against the real runtime — the point is
 * to exercise the generated code, not a hand-written stand-in of it.
 */
function compile(
  source: string,
  options?: Parameters<typeof generateModule>[1],
): (props?: Record<string, unknown>) => SVGSVGElement {
  const body = generateModule(source, options)
    .replace(/^import .*$/m, "")
    .replace("export default ", "return ");
  return new Function("_jsx", "_Fragment", body)(jsx, Fragment);
}

describe("client rendering", () => {
  it("creates the root in the SVG namespace", () => {
    const el = compile(CLOSE)();
    expect(el.namespaceURI).toBe(SVG_NS);
    expect(el).toBeInstanceOf(SVGElement);
  });

  it("creates interior markup in the SVG namespace too", () => {
    const path = compile(CLOSE)().querySelector("path")!;
    expect(path.namespaceURI).toBe(SVG_NS);
    expect(path.getAttribute("d")).toBe("m250-218 230-262Z");
  });

  it("applies the normalized attributes", () => {
    const el = compile(CLOSE)();
    expect(el.getAttribute("viewBox")).toBe("0 -960 960 960");
    expect(el.getAttribute("fill")).toBe("currentColor");
    expect(el.hasAttribute("width")).toBe(false);
    expect(el.hasAttribute("height")).toBe(false);
  });

  it("accepts props on the root", () => {
    const el = compile(CLOSE)({ class: "x-icon", "aria-hidden": "true" });
    expect(el.getAttribute("class")).toBe("x-icon");
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("lets props override the file's own attributes", () => {
    const el = compile(CLOSE)({ fill: "red" });
    expect(el.getAttribute("fill")).toBe("red");
  });

  it("ignores a children prop rather than blanking the icon", () => {
    const el = compile(CLOSE)({ children: "nope" });
    expect(el.querySelector("path")).not.toBeNull();
    expect(el.textContent).not.toContain("nope");
  });

  it("wires event handlers and refs like any other element", () => {
    const fn = vi.fn();
    let captured: Element | undefined;
    const el = compile(CLOSE)({ "on:click": fn, ref: (n: Element) => (captured = n) });
    el.dispatchEvent(new Event("click"));
    expect(fn).toHaveBeenCalledOnce();
    expect(captured).toBe(el);
  });

  it("accepts reactive props", () => {
    const color = signal("red");
    const el = compile(CLOSE)({ fill: color });
    expect(el.getAttribute("fill")).toBe("red");
    color("blue");
    expect(el.getAttribute("fill")).toBe("blue");
  });
});

describe("server rendering", () => {
  it("serializes the root and interior without a DOM", async () => {
    const Close = compile(CLOSE);
    const html = await renderToString(() => Close({ class: "x-icon" }));
    expect(html).toContain(`viewBox="0 -960 960 960"`);
    expect(html).toContain(`fill="currentColor"`);
    expect(html).toContain(`class="x-icon"`);
    expect(html).toContain(`<path d="m250-218 230-262Z"/>`);
    expect(html).not.toContain(`width="48"`);
  });

  it("emits the interior inside slot markers the claim walk knows", async () => {
    const Close = compile(CLOSE);
    const html = await renderToString(() => Close());
    expect(html).toContain("<!--{-->");
    expect(html).toContain("<!--}-->");
  });
});

describe("hydration", () => {
  it("adopts the server-rendered icon without rebuilding it", async () => {
    const Close = compile(CLOSE);
    const app = () => Close({ class: "x-icon" });

    const container = document.createElement("div");
    container.innerHTML = await renderToString(app);
    const before = container.querySelector("path");

    hydrate(container, app);

    expect(container.querySelector("path")).toBe(before);
  });

  it("rebuilds a mismatched region in the SVG namespace", async () => {
    const Close = compile(CLOSE);

    // Server markup the claim walk cannot adopt, so the region is rebuilt
    // client-side — the path that re-parses rather than adopting.
    const container = document.createElement("div");
    container.innerHTML = "<span>stale</span>";

    hydrate(container, () => Close());

    const path = container.querySelector("path")!;
    expect(path.namespaceURI).toBe(SVG_NS);
  });

  it("re-parses a reactive region in the SVG namespace", async () => {
    const markup = signal('<path d="M0 0"/>');
    const app = () => (
      <svg viewBox="0 0 1 1">
        <Fragment html ns="svg">
          {markup}
        </Fragment>
      </svg>
    );

    const container = document.createElement("div");
    container.innerHTML = await renderToString(app);
    hydrate(container, app);

    markup('<circle r="1"/>');
    expect(container.querySelector("circle")!.namespaceURI).toBe(SVG_NS);
  });

  it("attaches handlers to the claimed root", async () => {
    const fn = vi.fn();
    const Close = compile(CLOSE);

    const container = document.createElement("div");
    container.innerHTML = await renderToString(() => Close());

    hydrate(container, () => Close({ "on:click": fn }));
    container.querySelector("svg")!.dispatchEvent(new Event("click"));

    expect(fn).toHaveBeenCalledOnce();
  });
});
