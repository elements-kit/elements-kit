// @vitest-environment jsdom
//
// jsdom, not the suite's happy-dom: happy-dom's parser never enters MathML
// foreign content, so `ns="mathml"` is unassertable there. jsdom parses to
// spec, which also makes this a second opinion on the SVG path.

import { describe, it, expect } from "vitest";
import { signal } from "../signals";
import { Fragment } from "./fragment";

const SVG_NS = "http://www.w3.org/2000/svg";
const MATHML_NS = "http://www.w3.org/1998/Math/MathML";

function mount(frag: DocumentFragment, ns: string, tag: string): Element {
  const host = document.createElementNS(ns, tag);
  host.appendChild(frag);
  return host;
}

describe("Fragment html ns='mathml'", () => {
  it("parses the interior in the MathML namespace", () => {
    const host = mount(
      (
        <Fragment html ns="mathml">
          {"<mi>x</mi><mn>2</mn>"}
        </Fragment>
      ) as unknown as DocumentFragment,
      MATHML_NS,
      "math",
    );

    const [mi, mn] = [...host.children];
    expect(mi!.localName).toBe("mi");
    expect(mi!.namespaceURI).toBe(MATHML_NS);
    expect(mn!.namespaceURI).toBe(MATHML_NS);
  });

  it("drops the wrapper root, keeping only the interior", () => {
    const host = mount(
      (
        <Fragment html ns="mathml">
          {"<mi>x</mi>"}
        </Fragment>
      ) as unknown as DocumentFragment,
      MATHML_NS,
      "math",
    );

    expect(host.querySelector("math")).toBeNull();
    expect(host.querySelector("mi")!.textContent).toBe("x");
  });

  it("keeps the slot markers around the interior", () => {
    const host = mount(
      (
        <Fragment html ns="mathml">
          {"<mi>x</mi>"}
        </Fragment>
      ) as unknown as DocumentFragment,
      MATHML_NS,
      "math",
    );

    const comments = [...host.childNodes].filter(
      (n) => n.nodeType === Node.COMMENT_NODE,
    );
    expect(comments.map((c) => (c as Comment).data)).toEqual(["{", "}"]);
  });

  it("re-parses in the namespace when a reactive source changes", () => {
    const markup = signal("<mi>x</mi>");
    const host = mount(
      (
        <Fragment html ns="mathml">
          {markup}
        </Fragment>
      ) as unknown as DocumentFragment,
      MATHML_NS,
      "math",
    );

    markup("<mn>2</mn>");
    expect(host.querySelector("mi")).toBeNull();
    expect(host.querySelector("mn")!.namespaceURI).toBe(MATHML_NS);
  });

  it("cannot be escaped by a premature closing tag", () => {
    const host = mount(
      (
        <Fragment html ns="mathml">
          {"<mi>x</mi></math><mn>2</mn>"}
        </Fragment>
      ) as unknown as DocumentFragment,
      MATHML_NS,
      "math",
    );

    expect(host.querySelector("mi")).not.toBeNull();
    expect(host.querySelector("mn")!.namespaceURI).toBe(MATHML_NS);
  });

  it("leaves mathml content in the XHTML namespace without ns", () => {
    const frag = (
      <Fragment html>{"<mi>x</mi>"}</Fragment>
    ) as unknown as DocumentFragment;
    const host = document.createElement("div");
    host.appendChild(frag);

    expect(host.querySelector("mi")!.namespaceURI).toBe(
      "http://www.w3.org/1999/xhtml",
    );
  });
});

describe("Fragment html ns='svg' under a spec-complete parser", () => {
  it("namespaces tags that SvgElements deliberately omits", () => {
    // `title`/`a`/`style` are ambiguous, so element creation defaults them to
    // HTML — parsing inside a real <svg> root resolves them correctly instead.
    const host = mount(
      (
        <Fragment html ns="svg">
          {'<title>Close</title><path d="M0 0"/>'}
        </Fragment>
      ) as unknown as DocumentFragment,
      SVG_NS,
      "svg",
    );

    expect(host.querySelector("title")!.namespaceURI).toBe(SVG_NS);
    expect(host.querySelector("path")!.namespaceURI).toBe(SVG_NS);
  });
});
