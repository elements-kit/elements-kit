/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect } from "vitest";
import { signal } from "../signals";
import { createElement } from "./element";

// ---------------------------------------------------------------------------
// mountChildren — every permutation of child kinds
//
// Child kinds:
//   - Node (Element / Text / DocumentFragment)
//   - primitive (string / number)
//   - boolean / null / undefined  → comment marker
//   - function (reactive thunk)
//   - array (flat-mapped into the parent)
//
// The classifier in `children.ts` picks one of three mount paths:
//   AllNode | AllPrimitive | Mixed | Reactive
// These tests pin the behaviour of every cell in the mix, especially the
// regression that triggered this file: a function appearing AFTER a Node and
// a primitive must still be evaluated reactively.
// ---------------------------------------------------------------------------

const text = (s: string) => document.createTextNode(s);

describe("children — single child", () => {
  it("Node child appends as-is", () => {
    const child = document.createElement("span");
    const el = (<div>{child}</div>) as HTMLElement;
    expect(el.firstChild).toBe(child);
  });

  it("string child appends as text", () => {
    const el = (<div>hello</div>) as HTMLElement;
    expect(el.textContent).toBe("hello");
    expect(el.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  });

  it("number child appends as text", () => {
    const el = (<div>{42}</div>) as HTMLElement;
    expect(el.textContent).toBe("42");
  });

  it("null child renders empty (placeholder comment, no text)", () => {
    const el = (<div>{null}</div>) as HTMLElement;
    expect(el.textContent).toBe("");
  });

  it("false child renders empty (placeholder comment, no text)", () => {
    const el = (<div>{false}</div>) as HTMLElement;
    expect(el.textContent).toBe("");
  });

  it("function child becomes a reactive slot", () => {
    const s = signal("a");
    const el = (<div>{() => s()}</div>) as HTMLElement;
    expect(el.textContent).toBe("a");
    s("b");
    expect(el.textContent).toBe("b");
  });
});

describe("children — AllPrimitive path", () => {
  it("multiple strings concatenate as text nodes", () => {
    const el = (
      <p>
        {"hi "}
        {"there"}
      </p>
    ) as HTMLElement;
    expect(el.textContent).toBe("hi there");
    expect(el.childNodes.length).toBe(2);
  });

  it("string + number + boolean + null skips non-text", () => {
    const el = (
      <p>
        {"a"}
        {1}
        {true}
        {null}
      </p>
    ) as HTMLElement;
    expect(el.textContent).toBe("a1");
  });
});

describe("children — AllNode path", () => {
  it("multiple Element children append in order", () => {
    const a = document.createElement("a");
    const b = document.createElement("b");
    const el = (
      <div>
        {a}
        {b}
      </div>
    ) as HTMLElement;
    expect(el.children[0]).toBe(a);
    expect(el.children[1]).toBe(b);
  });

  it("text + element from raw nodes", () => {
    const t = text("x");
    const span = document.createElement("span");
    const el = (
      <div>
        {t}
        {span}
      </div>
    ) as HTMLElement;
    expect(el.childNodes[0]).toBe(t);
    expect(el.childNodes[1]).toBe(span);
  });
});

describe("children — Mixed (Node + primitive, no functions)", () => {
  it("Element followed by string", () => {
    const el = (
      <p>
        <code>tag</code> hello
      </p>
    ) as HTMLElement;
    expect(el.childNodes.length).toBe(2);
    expect((el.childNodes[0] as Element).tagName).toBe("CODE");
    expect(el.childNodes[1].textContent).toBe(" hello");
  });

  it("string followed by Element followed by string", () => {
    const el = (
      <p>
        before <span>mid</span> after
      </p>
    ) as HTMLElement;
    expect(el.textContent).toBe("before mid after");
  });
});

describe("children — Reactive path (function present anywhere in list)", () => {
  it("function as ONLY child", () => {
    const s = signal("v");
    const el = (<p>{() => s()}</p>) as HTMLElement;
    expect(el.textContent).toBe("v");
  });

  it("function FIRST in mixed list", () => {
    const s = signal("x");
    const el = (
      <p>
        {() => s()} after
      </p>
    ) as HTMLElement;
    expect(el.textContent.includes("x")).toBe(true);
    expect(el.textContent.includes("after")).toBe(true);
  });

  it("function LAST in mixed list — Element + string + function (regression)", () => {
    // This is the exact pattern that broke: classifier saw Element then
    // string, set kind=0, returned Mixed before checking the function — so
    // mountStatic ran String(fn) and dumped the source as text.
    const s = signal("Wael");
    const el = (
      <p>
        <code>[fn]</code> Hello {() => s()}
      </p>
    ) as HTMLElement;

    expect(el.textContent).toBe("[fn] Hello Wael");
    // Function child should NOT appear stringified.
    expect(el.textContent).not.toMatch(/=>/);
    expect(el.textContent).not.toMatch(/function/);

    s("Updated");
    expect(el.textContent).toBe("[fn] Hello Updated");
  });

  it("function in MIDDLE of list with Node/string on both sides", () => {
    const s = signal("M");
    const el = (
      <p>
        <code>L</code>
        {() => s()}
        <code>R</code>
      </p>
    ) as HTMLElement;
    expect(el.textContent).toBe("LMR");
    s("X");
    expect(el.textContent).toBe("LXR");
  });

  it("multiple consecutive functions update independently", () => {
    const a = signal("a");
    const b = signal("b");
    const el = (
      <p>
        {() => a()}
        {() => b()}
      </p>
    ) as HTMLElement;
    expect(el.textContent).toBe("ab");
    a("A");
    expect(el.textContent).toBe("Ab");
    b("B");
    expect(el.textContent).toBe("AB");
  });

  it("function returning null/boolean renders empty", () => {
    const s = signal<string | null>(null);
    const el = (<p>{() => s()}</p>) as HTMLElement;
    expect(el.textContent).toBe("");
    s("now");
    expect(el.textContent).toBe("now");
    s(null);
    expect(el.textContent).toBe("");
  });

  it("function returning a Node swaps the node in place", () => {
    const which = signal(0);
    const a = document.createElement("span");
    a.textContent = "A";
    const b = document.createElement("span");
    b.textContent = "B";
    const el = (<p>{() => (which() === 0 ? a : b)}</p>) as HTMLElement;
    expect(el.querySelector("span")?.textContent).toBe("A");
    which(1);
    expect(el.querySelector("span")?.textContent).toBe("B");
  });

  it("conditional ternary inside function child", () => {
    const flag = signal(false);
    const el = (
      <p>
        Status{() => (flag() ? "!" : ".")}
      </p>
    ) as HTMLElement;
    expect(el.textContent).toBe("Status.");
    flag(true);
    expect(el.textContent).toBe("Status!");
  });

  it("nested signal call inside function — props.name() pattern", () => {
    // Mirrors the Demo 6 FnGreeting bug: <p><code/> Hello {() => name()}{() => excited ? '!' : '.'}</p>
    const name = signal("World");
    const excited = signal(false);
    const el = (
      <p>
        <code>[fn]</code> Hello {() => name()}
        {() => (excited() ? "!" : ".")}
      </p>
    ) as HTMLElement;

    expect(el.textContent).toBe("[fn] Hello World.");
    name("Wael");
    excited(true);
    expect(el.textContent).toBe("[fn] Hello Wael!");
  });
});

describe("children — array children flatten", () => {
  it("array of strings", () => {
    const el = (<p>{["a", "b", "c"]}</p>) as HTMLElement;
    expect(el.textContent).toBe("abc");
  });

  it("nested arrays flatten", () => {
    const el = (<p>{[["a"], ["b", ["c"]]]}</p>) as HTMLElement;
    expect(el.textContent).toBe("abc");
  });

  it("array containing Element + string + function", () => {
    const s = signal("dyn");
    const span = document.createElement("span");
    span.textContent = "x";
    const el = (<p>{[span, " - ", () => s()]}</p>) as HTMLElement;
    expect(el.textContent).toBe("x - dyn");
    s("upd");
    expect(el.textContent).toBe("x - upd");
  });
});

describe("children — only-bool/null edge case", () => {
  it("list of only booleans/nulls renders empty", () => {
    const el = (
      <p>
        {true}
        {false}
        {null}
        {undefined}
      </p>
    ) as HTMLElement;
    expect(el.textContent).toBe("");
  });
});
