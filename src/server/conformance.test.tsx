// @vitest-environment node
/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
// Conformance cases adapted from the dom-expressions SSR test suite.
import { describe, it, expect } from "vitest";
import { renderToString } from "./index";
import { signal } from "../signals";

describe("SSR conformance — attributes", () => {
  it("skips undefined and null attributes entirely", async () => {
    expect(
      await renderToString(() => (
        <div id={undefined as never} title={null as never} lang="en" />
      )),
    ).toBe('<div lang="en"></div>');
  });

  it("renders zero and negative numbers as attribute values", async () => {
    expect(
      await renderToString(() => <div tabindex={0} data-n={-1 as never} />),
    ).toBe('<div tabindex="0" data-n="-1"></div>');
  });

  it("renders data- and aria- attributes verbatim", async () => {
    expect(
      await renderToString(() => (
        <div data-testid="t" aria-hidden="true" aria-label={'q"x'} />
      )),
    ).toBe('<div data-testid="t" aria-hidden="true" aria-label="q&quot;x"></div>');
  });

  it("emits SVG namespaced attributes", async () => {
    expect(
      await renderToString(() => (
        <svg>
          <use xlink:href="#icon" />
        </svg>
      )),
    ).toBe('<svg><use xlink:href="#icon"></use></svg>');
  });

  it("combines class, className and class: toggles into one attribute", async () => {
    expect(
      await renderToString(() => (
        <div
          class="a"
          class:b={true}
          class:c={false}
          {...({ className: "x" } as object)}
        />
      )),
    ).toBe('<div class="x b"></div>');
    // Last-write-wins between class/className, then toggles append —
    // mirrors the client, where className assignment replaces class.
  });

  it("merges string style with style: properties", async () => {
    expect(
      await renderToString(() => (
        <div style="color:red" style:opacity={0.5 as never} />
      )),
    ).toBe('<div style="color:red;opacity:0.5"></div>');
  });
});

describe("SSR conformance — children", () => {
  it("renders zero as text (falsy but visible)", async () => {
    expect(await renderToString(() => <span>{0}</span>)).toBe(
      "<span>0</span>",
    );
  });

  it("renders bigint children", async () => {
    expect(await renderToString(() => <span>{10n as never}</span>)).toBe(
      "<span>10</span>",
    );
  });

  it("renders deeply nested arrays flattened in order", async () => {
    expect(
      await renderToString(() => (
        <div>{["a", ["b", ["c", <b>d</b>]]] as never}</div>
      )),
    ).toBe("<div>abc<b>d</b></div>");
  });

  it("textContent wins over children", async () => {
    expect(
      await renderToString(() => (
        <div textContent="t">
          <span>ignored</span>
        </div>
      )),
    ).toBe("<div>t</div>");
  });

  it("renders fragments nested in fragments", async () => {
    expect(
      await renderToString(() => (
        <>
          a
          <>
            b<span>c</span>
          </>
        </>
      )),
    ).toBe("ab<span>c</span>");
  });

  it("conditional falsy children render nothing", async () => {
    const cond = false;
    expect(
      await renderToString(() => <div>{cond && (<span>x</span> as never)}</div>),
    ).toBe("<div></div>");
  });

  it("snapshot of a computed-style getter chain unwraps fully", async () => {
    const s = signal(2);
    expect(
      await renderToString(() => <span>{(() => () => s() * 2) as never}</span>),
    ).toBe("<span><!--{--><!--{-->4<!--}--><!--}--></span>");
    // A getter returning a getter nests slot markers — each level is a
    // live-binding boundary for the claim pass.
  });
});
