/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi, afterEach } from "vitest";
import { setRenderer } from "./renderer";
import { createElement } from "./element";

afterEach(() => setRenderer(null));

describe("renderer dispatch", () => {
  it("routes createElement through the active renderer", () => {
    const sentinel = document.createElement("span");
    const jsx = vi.fn(() => sentinel);
    setRenderer({ jsx });

    const result = createElement("div", { id: "x" });

    expect(result).toBe(sentinel);
    expect(jsx).toHaveBeenCalledWith("div", { id: "x" });
  });

  it("passes ref through to the renderer untouched", () => {
    const ref = () => {};
    const jsx = vi.fn(() => null);
    setRenderer({ jsx });

    createElement("div", { ref });

    expect(jsx).toHaveBeenCalledWith("div", { ref });
  });

  it("routes function components through the renderer without executing them", () => {
    const cmp = vi.fn(() => document.createElement("p"));
    const jsx = vi.fn(() => null);
    setRenderer({ jsx });

    createElement(cmp, {});

    expect(jsx).toHaveBeenCalledWith(cmp, {});
    expect(cmp).not.toHaveBeenCalled();
  });

  it("uses the default DOM path when no renderer is set", () => {
    const el = createElement("div", { id: "y" }) as HTMLElement;

    expect(el.tagName).toBe("DIV");
    expect(el.id).toBe("y");
  });

  it("restores the default DOM path after setRenderer(null)", () => {
    setRenderer({ jsx: vi.fn(() => null) });
    setRenderer(null);

    const el = createElement("div", {}) as HTMLElement;

    expect(el.tagName).toBe("DIV");
  });

  it("JSX expressions flow through the active renderer", () => {
    const jsx = vi.fn(() => null);
    setRenderer({ jsx });

    void (<div class="a" />);

    expect(jsx).toHaveBeenCalledWith("div", { class: "a" });
  });
});
