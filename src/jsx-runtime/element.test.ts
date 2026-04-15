import { describe, it, expect, vi } from "vitest";
import { signal, effect, effectScope, onCleanup } from "../signals";
import { createElement, disposeElement } from "./element";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal JSX-less way to call a function component through createElement. */
function mount(fn: (props: Record<string, unknown>) => Element | null, props = {}) {
  return createElement(fn, props) as Element | null;
}

// ---------------------------------------------------------------------------
// Function component — scope lifecycle
// ---------------------------------------------------------------------------

describe("createElement (function component) — effectScope lifecycle", () => {
  it("effects inside component body run immediately", () => {
    const spy = vi.fn();
    const s = signal(0);

    mount(() => {
      effect(() => { s(); spy(); });
      return document.createElement("div");
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("effects inside component body re-run when deps change", () => {
    const spy = vi.fn();
    const s = signal(0);

    mount(() => {
      effect(() => { s(); spy(); });
      return document.createElement("div");
    });

    spy.mockClear();
    s(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("disposeElement stops effects created in component body", () => {
    const spy = vi.fn();
    const s = signal(0);

    const el = mount(() => {
      effect(() => { s(); spy(); });
      return document.createElement("div");
    })!;

    spy.mockClear();
    disposeElement(el);
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("effectScope inside component body is stopped on disposeElement", () => {
    const spy = vi.fn();
    const s = signal(0);

    const el = mount(() => {
      effectScope(() => {
        effect(() => { s(); spy(); });
        effect(() => { s(); spy(); });
      });
      return document.createElement("div");
    })!;

    spy.mockClear();
    disposeElement(el);
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("onCleanup registered in component effect fires on disposeElement", () => {
    const cleanup = vi.fn();
    const el = mount(() => {
      effect(() => { onCleanup(cleanup); });
      return document.createElement("div");
    })!;

    expect(cleanup).not.toHaveBeenCalled();
    disposeElement(el);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("disposeElement can be called twice safely", () => {
    const spy = vi.fn();
    const s = signal(0);

    const el = mount(() => {
      effect(() => { s(); spy(); });
      return document.createElement("div");
    })!;

    spy.mockClear();
    disposeElement(el);
    expect(() => disposeElement(el)).not.toThrow();
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("null-returning component does not throw and does not leak (scope disposed immediately)", () => {
    const spy = vi.fn();
    const s = signal(0);

    // null return — scope must be disposed inline
    const el = mount(() => {
      effect(() => { s(); spy(); });
      return null;
    });

    expect(el).toBeNull();
    spy.mockClear();
    s(1);
    // scope was disposed immediately, effect must not re-run
    expect(spy).not.toHaveBeenCalled();
  });

  it("onCleanup in body effect fires once on disposeElement and not on signal write after", () => {
    const bodyCleanup = vi.fn();
    const s = signal(0);

    const el = mount(() => {
      effect(() => { s(); onCleanup(bodyCleanup); });
      return document.createElement("div");
    })!;

    bodyCleanup.mockClear();
    disposeElement(el);
    expect(bodyCleanup).toHaveBeenCalledTimes(1);
    // clear again so we can check no extra calls after signal write
    bodyCleanup.mockClear();
    s(99);
    expect(bodyCleanup).not.toHaveBeenCalled();
  });
});
