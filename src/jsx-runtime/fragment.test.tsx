/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi } from "vitest";
import { signal, effect } from "../signals";
import { createElement, disposeElement } from "./element";
import { For } from "@/for";

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
