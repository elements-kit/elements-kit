/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect } from "vitest";
import { applyProps } from "./properties";
import { svgNamespace } from "./constants";

const XLINK = "http://www.w3.org/1999/xlink";
const XML = "http://www.w3.org/XML/1998/namespace";

describe("svgNamespace()", () => {
  it("returns the xlink URI for 'xlink'", () => {
    expect(svgNamespace("xlink")).toBe(XLINK);
  });

  it("returns the xml URI for 'xml'", () => {
    expect(svgNamespace("xml")).toBe(XML);
  });

  it("returns undefined for unknown prefixes", () => {
    expect(svgNamespace("foo")).toBeUndefined();
    expect(svgNamespace("")).toBeUndefined();
    expect(svgNamespace("svg")).toBeUndefined();
  });
});

describe("namespaced attributes via applyProps", () => {
  it("xlink:href is written via setAttributeNS", () => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "use");
    applyProps(el, { "xlink:href": "#icon" });
    expect(el.getAttributeNS(XLINK, "href")).toBe("#icon");
  });

  it("xml:lang is written via setAttributeNS", () => {
    const el = document.createElement("p");
    applyProps(el, { "xml:lang": "fr" });
    expect(el.getAttributeNS(XML, "lang")).toBe("fr");
  });

  it("nullish value writes empty string (not 'null'/'undefined')", () => {
    const el = document.createElement("p");
    applyProps(el, { "xlink:href": null });
    expect(el.getAttributeNS(XLINK, "href")).toBe("");
  });

  it("unknown namespace prefix falls through and is NOT written via setAttributeNS", () => {
    const el = document.createElement("div");
    applyProps(el, { "data:foo": "v" });
    // "data:foo" doesn't match xlink/xml, so it isn't routed to setAttributeNS
    // with a namespace URI. It falls through to plain setAttribute.
    expect(el.getAttributeNS(XLINK, "foo")).toBeNull();
    expect(el.getAttributeNS(XML, "foo")).toBeNull();
  });
});

describe("namespaced attributes via JSX", () => {
  it("xlink:href on an SVG <use> element renders correctly", () => {
    // dom-expressions JSX runs through createElement → applyProps; this is the
    // user-facing path.
    const el = (
      <svg>
        <use xlink:href="#sprite" />
      </svg>
    ) as SVGSVGElement;
    const useEl = el.querySelector("use")!;
    expect(useEl.getAttributeNS(XLINK, "href")).toBe("#sprite");
  });

  it("xml:lang on an SVG element renders correctly", () => {
    const el = (
      <svg xml:lang="en">
        <text>hi</text>
      </svg>
    ) as SVGSVGElement;
    expect(el.getAttributeNS(XML, "lang")).toBe("en");
  });
});
