import { describe, it, expect } from "vitest";
import { Slot } from "./slot";

// ---------------------------------------------------------------------------
// Slot — direct API tests
//
// Pinned behaviour for the lazy-marker refactor:
//   - markers are created on first render(), not in the constructor
//   - set() before render() buffers in #pending
//   - the buffered value is applied when render() finally runs
//   - clear() / get() / isMounted() / parent() are safe before mount
// ---------------------------------------------------------------------------

describe("Slot — pre-mount (markers not yet created)", () => {
  it("isMounted() is false on a fresh Slot", () => {
    const s = new Slot();
    expect(s.isMounted()).toBe(false);
  });

  it("parent() returns null before render()", () => {
    const s = new Slot();
    expect(s.parent()).toBeNull();
  });

  it("get() returns null before render()", () => {
    const s = new Slot();
    expect(s.get()).toBeNull();
  });

  it("clear() is a no-op before render()", () => {
    const s = new Slot();
    expect(() => s.clear()).not.toThrow();
  });

  it("set() before render() buffers the value", () => {
    const s = new Slot();
    const node = document.createTextNode("buffered");
    s.set(node);
    // Still not mounted — markers haven't been created.
    expect(s.isMounted()).toBe(false);
    expect(s.parent()).toBeNull();

    // First render() flushes the buffer between fresh markers.
    const host = document.createElement("div");
    host.appendChild(s.render());
    expect(host.textContent).toBe("buffered");
    expect(s.isMounted()).toBe(true);
  });
});

describe("Slot — render() lazily creates markers", () => {
  it("first render() inserts the '{' / '}' marker comments", () => {
    const s = new Slot();
    const host = document.createElement("div");
    host.appendChild(s.render());
    const start = Array.from(host.childNodes).find(
      (n) => n.nodeType === Node.COMMENT_NODE && (n as Comment).data === "{",
    );
    const end = Array.from(host.childNodes).find(
      (n) => n.nodeType === Node.COMMENT_NODE && (n as Comment).data === "}",
    );
    expect(start).toBeDefined();
    expect(end).toBeDefined();
    // Markers must bracket any default placeholder.
    const idxStart = Array.from(host.childNodes).indexOf(start as ChildNode);
    const idxEnd = Array.from(host.childNodes).indexOf(end as ChildNode);
    expect(idxStart).toBeLessThan(idxEnd);
  });

  it("second render() extracts current content and reuses the same markers", () => {
    const s = new Slot();
    const host = document.createElement("div");
    host.appendChild(s.render());
    s.set(document.createTextNode("v1"));
    expect(host.textContent).toBe("v1");

    const extracted = s.render();
    expect(extracted).toBeInstanceOf(DocumentFragment);
    expect(extracted.textContent).toBe("v1");

    // Markers stay attached to host even though content was extracted.
    const remaining = Array.from(host.childNodes).filter(
      (n) => n.nodeType === Node.COMMENT_NODE,
    );
    expect(remaining.length).toBe(2);
  });

  it("default content is used when no value buffered", () => {
    const s = new Slot();
    const host = document.createElement("div");
    host.appendChild(s.render("fallback"));
    expect(host.textContent).toBe("fallback");
  });

  it("buffered set() takes precedence over render()'s default content", () => {
    const s = new Slot();
    s.set(document.createTextNode("buffered"));
    const host = document.createElement("div");
    host.appendChild(s.render("fallback"));
    expect(host.textContent).toBe("buffered");
  });
});

describe("Slot — set() after mount", () => {
  it("replaces content between markers", () => {
    const s = new Slot();
    const host = document.createElement("div");
    host.appendChild(s.render());

    s.set(document.createTextNode("a"));
    expect(host.textContent).toBe("a");
    s.set(document.createTextNode("b"));
    expect(host.textContent).toBe("b");
  });

  it("set() with the same node is a no-op (identity guard)", () => {
    const s = new Slot();
    const host = document.createElement("div");
    host.appendChild(s.render());

    const node = document.createTextNode("x");
    s.set(node);
    const before = node.parentNode;
    s.set(node);
    expect(node.parentNode).toBe(before);
  });
});

describe("Slot — clear() after mount", () => {
  it("removes everything between markers but keeps the markers", () => {
    const s = new Slot();
    const host = document.createElement("div");
    host.appendChild(s.render());
    s.set(document.createTextNode("content"));
    expect(host.textContent).toBe("content");

    s.clear();
    expect(host.textContent).toBe("");
    const comments = Array.from(host.childNodes).filter(
      (n) => n.nodeType === Node.COMMENT_NODE,
    );
    expect(comments.length).toBe(2);
    expect(s.isMounted()).toBe(true); // markers still attached
  });
});

describe("Slot — get()", () => {
  it("returns a DocumentFragment with the slot's current content", () => {
    const s = new Slot();
    const host = document.createElement("div");
    host.appendChild(s.render());
    s.set(document.createTextNode("hello"));

    const got = s.get();
    expect(got).toBeInstanceOf(DocumentFragment);
    expect(got!.textContent).toBe("hello");
    // get() extracts — host now empty (between markers).
    const between = Array.from(host.childNodes).filter(
      (n) => n.nodeType !== Node.COMMENT_NODE,
    );
    expect(between.length).toBe(0);
  });
});
