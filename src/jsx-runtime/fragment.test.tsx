/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi } from "vitest";
import { signal, effect } from "../signals";
import { createElement, disposeElement } from "./element";
import { For } from "@/for";
import { Fragment } from "./fragment";

// ---------------------------------------------------------------------------
// Fragment — real JSX syntax
// ---------------------------------------------------------------------------

describe("Fragment (<>...</>) — JSX syntax", () => {
  it("renders children into a DocumentFragment", () => {
    const frag = (
      <>
        <div />
        <span />
      </>
    ) as DocumentFragment;

    expect(frag).toBeInstanceOf(DocumentFragment);
    expect(frag.childNodes.length).toBe(2);
  });

  it("empty fragment returns empty DocumentFragment", () => {
    const frag = (<></>) as DocumentFragment;
    expect(frag).toBeInstanceOf(DocumentFragment);
    expect(frag.childNodes.length).toBe(0);
  });

  it("fragment has Symbol.dispose attached", () => {
    const frag = (
      <>
        <div />
      </>
    ) as DocumentFragment;

    expect((frag as any)[Symbol.dispose]).toBeDefined();
  });

  it("function component inside <> — effects stop when fragment disposed", () => {
    const spy = vi.fn();
    const s = signal(0);

    function Comp() {
      effect(() => {
        s();
        spy();
      });
      return <div />;
    }

    const frag = (
      <>
        <Comp />
      </>
    ) as DocumentFragment;
    const dispose = (frag as any)[Symbol.dispose] as () => void;

    spy.mockClear();
    dispose();
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("multiple function components inside <> — all effects stop on dispose", () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const s = signal(0);

    function A() {
      effect(() => {
        s();
        spy1();
      });
      return <span />;
    }
    function B() {
      effect(() => {
        s();
        spy2();
      });
      return <span />;
    }

    const frag = (
      <>
        <A />
        <B />
      </>
    ) as DocumentFragment;
    const dispose = (frag as any)[Symbol.dispose] as () => void;

    spy1.mockClear();
    spy2.mockClear();
    dispose();
    s(1);
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
  });

  it("<For> inside <> — entries disposed when fragment disposed", () => {
    const spy = vi.fn();
    const s = signal(0);

    const frag = (
      <>
        <For each={[{ id: "1" }, { id: "2" }]} by={(item: any) => item.id}>
          {() =>
            createElement(() => {
              effect(() => {
                s();
                spy();
              });
              return document.createElement("li");
            }, {})
          }
        </For>
      </>
    ) as DocumentFragment;

    // Move to a container so fragment isn't consumed
    const container = document.createElement("div");
    const dispose = (frag as any)[Symbol.dispose] as () => void;
    expect(dispose).toBeDefined();
    container.appendChild(frag);

    spy.mockClear();
    dispose();
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("fragment as root — standalone dispose works without parent", () => {
    const spy = vi.fn();
    const s = signal(0);

    function Comp() {
      effect(() => {
        s();
        spy();
      });
      return <div />;
    }

    // Root — not mounted anywhere, just disposed directly
    const frag = (
      <>
        <Comp />
      </>
    ) as DocumentFragment;
    const dispose = (frag as any)[Symbol.dispose] as () => void;
    expect(dispose).toBeDefined();

    spy.mockClear();
    dispose();
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("renders a string child as a Text node", () => {
    const frag = (<>text</>) as DocumentFragment;
    const host = document.createElement("div");
    host.appendChild(frag);
    expect(host.textContent).toBe("text");
  });

  it("renders a number child as text", () => {
    const frag = (<>{42}</>) as DocumentFragment;
    const host = document.createElement("div");
    host.appendChild(frag);
    expect(host.textContent).toBe("42");
  });

  it("renders a mix of strings and elements in order", () => {
    const frag = (
      <>
        hello <span>mid</span> world
      </>
    ) as DocumentFragment;
    const host = document.createElement("div");
    host.appendChild(frag);
    expect(host.textContent).toBe("hello mid world");
    expect(host.querySelector("span")?.textContent).toBe("mid");
  });

  it("renders a reactive getter child and updates on signal change", () => {
    const s = signal("A");
    const frag = (<>{() => s()}</>) as DocumentFragment;
    const host = document.createElement("div");
    host.appendChild(frag);
    expect(host.textContent).toBe("A");

    s("B");
    expect(host.textContent).toBe("B");

    const dispose = (frag as any)[Symbol.dispose] as () => void;
    dispose();
    // After dispose the slot clears its content; subsequent writes have no effect.
    const afterDispose = host.textContent;
    s("C");
    expect(host.textContent).toBe(afterDispose);
  });

  it("renders null / undefined children without throwing", () => {
    expect(() => {
      const frag = (
        <>
          {null}
          {undefined}
        </>
      ) as DocumentFragment;
      const host = document.createElement("div");
      host.appendChild(frag);
    }).not.toThrow();
  });

  it("fragment inside element — disposed when parent element is disposed", () => {
    const spy = vi.fn();
    const s = signal(0);

    function Comp() {
      effect(() => {
        s();
        spy();
      });
      return <span />;
    }

    // Fragment as child of a div
    const frag = (
      <>
        <Comp />
      </>
    ) as DocumentFragment;
    const parent = createElement("div", { children: frag }) as Element;

    spy.mockClear();
    disposeElement(parent);
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Fragment html — raw HTML region
// ---------------------------------------------------------------------------

describe("Fragment html — raw HTML region", () => {
  it("renders a static raw HTML string", () => {
    const frag = (
      <Fragment html>{"<b>bold</b> & <i>italic</i>"}</Fragment>
    ) as unknown as DocumentFragment;
    const host = document.createElement("div");
    host.appendChild(frag);

    expect(host.querySelector("b")!.textContent).toBe("bold");
    expect(host.querySelector("i")!.textContent).toBe("italic");
  });

  it("wraps the region in slot markers for hydration claims", () => {
    const frag = (
      <Fragment html>{"<b>x</b>"}</Fragment>
    ) as unknown as DocumentFragment;
    const host = document.createElement("div");
    host.appendChild(frag);

    const comments = [...host.childNodes].filter(
      (n) => n.nodeType === Node.COMMENT_NODE,
    );
    expect(comments.map((c) => (c as Comment).data)).toEqual(["{", "}"]);
  });

  it("updates the region when the source signal changes", () => {
    const html = signal("<b>a</b>");
    const frag = (
      <Fragment html>{html}</Fragment>
    ) as unknown as DocumentFragment;
    const host = document.createElement("div");
    host.appendChild(frag);
    expect(host.querySelector("b")!.textContent).toBe("a");

    html("<i>b</i>");
    expect(host.querySelector("b")).toBeNull();
    expect(host.querySelector("i")!.textContent).toBe("b");
  });

  it("does not execute script tags (script-inert parsing)", () => {
    (globalThis as Record<string, unknown>).__ekRawProbe = vi.fn();
    const frag = (
      <Fragment html>{"<script>globalThis.__ekRawProbe()</script><p>ok</p>"}</Fragment>
    ) as unknown as DocumentFragment;
    const host = document.createElement("div");
    document.body.appendChild(host);
    host.appendChild(frag);

    expect(host.querySelector("p")!.textContent).toBe("ok");
    expect(
      (globalThis as Record<string, unknown>).__ekRawProbe,
    ).not.toHaveBeenCalled();
    host.remove();
  });

  it("renders nothing for a null source", () => {
    const frag = (
      <Fragment html>{null as unknown as string}</Fragment>
    ) as unknown as DocumentFragment;
    const host = document.createElement("div");
    host.appendChild(frag);
    expect(host.textContent).toBe("");
  });

  it("stops updating after dispose", () => {
    const html = signal("<b>a</b>");
    const frag = (
      <Fragment html>{html}</Fragment>
    ) as unknown as DocumentFragment;
    const host = document.createElement("div");
    host.appendChild(frag);
    const dispose = (frag as unknown as Record<symbol, () => void>)[
      Symbol.dispose
    ];
    dispose();

    html("<i>c</i>");
    expect(host.querySelector("i")).toBeNull();
  });
});

describe("Fragment html ns — foreign content", () => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  function svgHost(frag: DocumentFragment): SVGElement {
    const host = document.createElementNS(SVG_NS, "svg");
    host.appendChild(frag);
    return host;
  }

  it("parses the interior in the SVG namespace", () => {
    const host = svgHost(
      (
        <Fragment html ns="svg">
          {'<path d="M0 0"/>'}
        </Fragment>
      ) as unknown as DocumentFragment,
    );

    const path = host.querySelector("path")!;
    expect(path.namespaceURI).toBe(SVG_NS);
    expect(path.getAttribute("d")).toBe("M0 0");
  });

  it("drops the wrapper root, keeping only the interior", () => {
    const host = svgHost(
      (
        <Fragment html ns="svg">
          {"<g/><circle r=\"1\"/>"}
        </Fragment>
      ) as unknown as DocumentFragment,
    );

    // A nested <svg> would mean the wrapper leaked into the output.
    expect(host.querySelector("svg")).toBeNull();
    expect([...host.children].map((c) => c.localName)).toEqual([
      "g",
      "circle",
    ]);
  });

  it("cannot be escaped by a premature closing tag", () => {
    // Parsing against a real root element rather than a `<svg>…</svg>` text
    // wrapper: there is no wrapper for the string to close out of, so the
    // trailing markup stays inside the region instead of being dropped.
    const host = svgHost(
      (
        <Fragment html ns="svg">
          {'<path d="M0 0"/></svg><circle r="1"/>'}
        </Fragment>
      ) as unknown as DocumentFragment,
    );

    expect(host.querySelector("path")).not.toBeNull();
    expect(host.querySelector("circle")!.namespaceURI).toBe(SVG_NS);
  });

  it("leaves foreign content in the XHTML namespace without ns", () => {
    const frag = (
      <Fragment html>{'<path d="M0 0"/>'}</Fragment>
    ) as unknown as DocumentFragment;
    const host = document.createElement("div");
    host.appendChild(frag);

    expect(host.querySelector("path")!.namespaceURI).toBe(
      "http://www.w3.org/1999/xhtml",
    );
  });

  it("keeps the slot markers around the interior", () => {
    const host = svgHost(
      (
        <Fragment html ns="svg">
          {"<g/>"}
        </Fragment>
      ) as unknown as DocumentFragment,
    );

    const comments = [...host.childNodes].filter(
      (n) => n.nodeType === Node.COMMENT_NODE,
    );
    expect(comments.map((c) => (c as Comment).data)).toEqual(["{", "}"]);
  });

  it("re-parses in the namespace when a reactive source changes", () => {
    const markup = signal('<path d="M0 0"/>');
    const host = svgHost(
      (
        <Fragment html ns="svg">
          {markup}
        </Fragment>
      ) as unknown as DocumentFragment,
    );

    markup('<circle r="1"/>');
    expect(host.querySelector("path")).toBeNull();
    expect(host.querySelector("circle")!.namespaceURI).toBe(SVG_NS);
  });

  // No MathML coverage: happy-dom's parser never enters MathML foreign content
  // — `<math><mi>x</mi></math>` comes back fully XHTML-namespaced, by every
  // route (wrapper, MathML-namespaced template, or `mathEl.innerHTML`). The
  // `ns: "mathml"` path is browser-correct but cannot be asserted here.
  it("wraps a mathml region in <math>", () => {
    const host = document.createElement("div");
    host.appendChild(
      (
        <Fragment html ns="mathml">
          {"<mi>x</mi>"}
        </Fragment>
      ) as unknown as DocumentFragment,
    );

    // Namespace is unassertable; the wrapper still must not leak.
    expect(host.querySelector("math")).toBeNull();
    expect(host.querySelector("mi")!.textContent).toBe("x");
  });
});
