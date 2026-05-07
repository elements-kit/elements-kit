/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi } from "vitest";
import { signal, computed, effect } from "../signals";
import { disposeElement } from "./element";

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

// ---------------------------------------------------------------------------
// Static path — children that contain NO function don't subscribe to signals
// reachable from their values. The classifier should pick AllNode /
// AllPrimitive / Mixed and skip Slot + effect wiring entirely.
// ---------------------------------------------------------------------------

describe("children — static path (no function children)", () => {
  it("AllPrimitive: signal read once outside fn doesn't re-render", () => {
    const s = signal("first");
    // signal called eagerly — value is captured statically, not tracked.
    const el = (<p>{s()}</p>) as HTMLElement;
    expect(el.textContent).toBe("first");
    s("second");
    expect(el.textContent).toBe("first"); // static text — no update
  });

  it("AllNode: pre-built Element children don't re-render on signal change", () => {
    const s = signal(0);
    const a = document.createElement("span");
    a.textContent = String(s());
    const b = document.createElement("span");
    b.textContent = "B";
    const el = (
      <p>
        {a}
        {b}
      </p>
    ) as HTMLElement;
    expect(el.textContent).toBe("0B");
    s(1);
    expect(el.textContent).toBe("0B"); // a's text was set imperatively, no tracking
  });

  it("Mixed: Element + string list mounts in one shot, no Slot markers", () => {
    const el = (
      <p>
        <code>tag</code> hello
      </p>
    ) as HTMLElement;
    // Static path appends children directly — no Slot comment markers ('{' / '}')
    const comments = Array.from(el.childNodes).filter(
      (n) => n.nodeType === Node.COMMENT_NODE,
    );
    expect(comments.length).toBe(0);
    expect(el.childNodes.length).toBe(2);
  });

  it("AllPrimitive: produces only Text nodes (no comments)", () => {
    const el = (
      <p>
        {"a"}
        {"b"}
      </p>
    ) as HTMLElement;
    for (const n of Array.from(el.childNodes)) {
      expect(n.nodeType).toBe(Node.TEXT_NODE);
    }
  });
});

// ---------------------------------------------------------------------------
// Dynamic path — function children get a Slot and an effect; updates re-run
// without re-creating siblings.
// ---------------------------------------------------------------------------

describe("children — dynamic path (function children)", () => {
  it("function child creates Slot comment markers around its content", () => {
    const s = signal("x");
    const el = (<p>{() => s()}</p>) as HTMLElement;
    // Slot.render() inserts '{' and '}' comment markers.
    const comments = Array.from(el.childNodes).filter(
      (n) => n.nodeType === Node.COMMENT_NODE,
    );
    expect(comments.length).toBeGreaterThanOrEqual(2);
  });

  it("signal change updates only the dynamic slot, sibling Nodes untouched", () => {
    const s = signal("v1");
    const sibling = document.createElement("span");
    sibling.textContent = "static";
    const el = (
      <p>
        {sibling}
        {() => s()}
      </p>
    ) as HTMLElement;

    expect(sibling.parentNode).toBe(el);
    expect(el.textContent).toBe("staticv1");

    s("v2");
    expect(sibling.parentNode).toBe(el); // same DOM identity
    expect(sibling.textContent).toBe("static"); // never re-rendered
    expect(el.textContent).toBe("staticv2");
  });

  it("function child runs once on mount, then once per signal update", () => {
    const s = signal(0);
    const spy = vi.fn(() => s());
    const el = (<p>{spy}</p>) as HTMLElement;
    expect(spy).toHaveBeenCalledTimes(1);
    expect(el.textContent).toBe("0");

    s(1);
    expect(spy).toHaveBeenCalledTimes(2);
    s(2);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("function child only tracks signals it reads — unrelated signals don't trigger", () => {
    const a = signal("a");
    const b = signal("b");
    const spy = vi.fn(() => a());
    (<p>{spy}</p>) as HTMLElement;
    expect(spy).toHaveBeenCalledTimes(1);

    b("b2"); // unrelated
    expect(spy).toHaveBeenCalledTimes(1);

    a("a2");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("computed inside function child re-evaluates transitively", () => {
    const n = signal(2);
    const sq = computed(() => n() * n());
    const el = (<p>{() => sq()}</p>) as HTMLElement;
    expect(el.textContent).toBe("4");
    n(3);
    expect(el.textContent).toBe("9");
  });

  it("disposeElement stops subsequent updates to dynamic children", () => {
    const s = signal("a");
    const spy = vi.fn(() => s());
    const el = (<p>{spy}</p>) as HTMLElement;
    expect(spy).toHaveBeenCalledTimes(1);

    disposeElement(el);
    s("b");
    expect(spy).toHaveBeenCalledTimes(1); // effect torn down
  });

  it("two sibling function children stay independent across updates", () => {
    const a = signal("A");
    const b = signal("B");
    const spyA = vi.fn(() => a());
    const spyB = vi.fn(() => b());
    const el = (
      <p>
        {spyA}
        {spyB}
      </p>
    ) as HTMLElement;
    expect(el.textContent).toBe("AB");
    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledTimes(1);

    a("A2");
    expect(spyA).toHaveBeenCalledTimes(2);
    expect(spyB).toHaveBeenCalledTimes(1); // unaffected
    expect(el.textContent).toBe("A2B");

    b("B2");
    expect(spyA).toHaveBeenCalledTimes(2);
    expect(spyB).toHaveBeenCalledTimes(2);
    expect(el.textContent).toBe("A2B2");
  });

  it("function returning Element swaps without leaking the previous node", () => {
    const which = signal(0);
    const a = document.createElement("i");
    a.textContent = "A";
    const b = document.createElement("i");
    b.textContent = "B";
    const el = (<p>{() => (which() === 0 ? a : b)}</p>) as HTMLElement;
    expect(el.querySelectorAll("i").length).toBe(1);
    expect(el.querySelector("i")).toBe(a);

    which(1);
    expect(el.querySelectorAll("i").length).toBe(1);
    expect(el.querySelector("i")).toBe(b);

    which(0);
    expect(el.querySelectorAll("i").length).toBe(1);
    expect(el.querySelector("i")).toBe(a);
  });
});

// ---------------------------------------------------------------------------
// Mixed static + dynamic — proves the classifier's regression case stays
// fixed and the two regimes coexist.
// ---------------------------------------------------------------------------

describe("children — static + dynamic mix", () => {
  it("static-before-dynamic: leading Element + string aren't replaced on signal update", () => {
    const s = signal("v1");
    const el = (
      <p>
        <code>tag</code> head {() => s()}
      </p>
    ) as HTMLElement;
    const codeEl = el.querySelector("code")!;
    const headText = el.childNodes[1] as Text;

    expect(el.textContent).toBe("tag head v1");
    s("v2");

    expect(el.querySelector("code")).toBe(codeEl); // identity preserved
    expect(el.childNodes[1]).toBe(headText); // text node identity preserved
    expect(el.textContent).toBe("tag head v2");
  });

  it("dynamic-before-static: trailing Element survives slot updates", () => {
    const s = signal("dyn1");
    const el = (
      <p>
        {() => s()}
        <code>tail</code>
      </p>
    ) as HTMLElement;
    const codeEl = el.querySelector("code")!;
    expect(el.textContent).toBe("dyn1tail");

    s("dyn2");
    expect(el.querySelector("code")).toBe(codeEl);
    expect(el.textContent).toBe("dyn2tail");
  });
});
