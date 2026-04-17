import { describe, it, expect, vi } from "vitest";
import { signal, effect, effectScope, onCleanup } from "../signals";
import { createElement, disposeElement } from "./element";
import { For } from "./for";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal JSX-less way to call a function component through createElement. */
function mount(
  fn: (props: Record<string, unknown>) => Element | null,
  props = {},
) {
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
      effect(() => {
        s();
        spy();
      });
      return document.createElement("div");
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("effects inside component body re-run when deps change", () => {
    const spy = vi.fn();
    const s = signal(0);

    mount(() => {
      effect(() => {
        s();
        spy();
      });
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
      effect(() => {
        s();
        spy();
      });
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
        effect(() => {
          s();
          spy();
        });
        effect(() => {
          s();
          spy();
        });
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
      effect(() => {
        onCleanup(cleanup);
      });
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
      effect(() => {
        s();
        spy();
      });
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
      effect(() => {
        s();
        spy();
      });
      return null;
    });

    expect(el).toBeNull();
    spy.mockClear();
    s(1);
    // scope was disposed immediately, effect must not re-run
    expect(spy).not.toHaveBeenCalled();
  });

  // ── children disposal ──────────────────────────────────────────────────────

  it("all static children are disposed when parent is disposed", () => {
    // Previously only the last child's onCleanup fired because each call
    // overwrote the previous one in the same scope. Each child now gets its
    // own effectScope so all cleanups are independent.
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const s = signal(0);

    const child1 = createElement(() => {
      effect(() => {
        s();
        spy1();
      });
      return document.createElement("span");
    }, {}) as Element;

    const child2 = createElement(() => {
      effect(() => {
        s();
        spy2();
      });
      return document.createElement("span");
    }, {}) as Element;

    const parent = createElement("div", {
      children: [child1, child2],
    }) as Element;

    spy1.mockClear();
    spy2.mockClear();
    disposeElement(parent);
    s(1);

    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
  });

  it("conditional child is disposed when parent is disposed", () => {
    // The function child path creates a slot + reactive effect. The slot's
    // onCleanup must fire on parent teardown to dispose the current content.
    const spy = vi.fn();
    const s = signal(0);

    const parent = createElement("div", {
      children: () =>
        createElement(() => {
          effect(() => {
            s();
            spy();
          });
          return document.createElement("span");
        }, {}),
    }) as Element;

    spy.mockClear();
    disposeElement(parent);
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("For entries are cleaned up when parent is disposed", () => {
    // For returns a DocumentFragment. appendChild consumes the fragment's
    // children, but the JS object retains Symbol.dispose. The parent's
    // mountChildren must capture that dispose before appendChild and wire it
    // into a child effectScope so it fires on parent teardown.
    //
    // Each item must be rendered via createElement so it gets a Symbol.dispose
    // — For's cleanEntry calls disposeElement which requires it.
    const spy = vi.fn();
    const s = signal(0);

    const forEl = createElement(For, {
      each: [{ id: "1" }, { id: "2" }],
      by: (item: any) => item.id,
      children: () =>
        createElement(() => {
          effect(() => {
            s();
            spy();
          });
          return document.createElement("li");
        }, {}),
    }) as DocumentFragment;

    const container = document.createElement("div");
    // Capture Symbol.dispose before appendChild consumes the fragment's children.
    const disposeFor = (forEl as unknown as Partial<Disposable>)[
      Symbol.dispose
    ];
    container.appendChild(forEl);

    expect(disposeFor).toBeDefined();
    spy.mockClear();
    disposeFor?.();
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("For as static child is cleaned up when parent element is disposed", () => {
    // This exercises the mountChildren fragment path: For returns a
    // DocumentFragment which appendChild consumes. mountChildren must extract
    // Symbol.dispose before the transfer and wire it into a child effectScope
    // linked to the parent so the full chain fires on parent teardown.
    const spy = vi.fn();
    const s = signal(0);

    const forFragment = createElement(For, {
      each: [{ id: "1" }],
      by: (item: any) => item.id,
      children: () =>
        createElement(() => {
          effect(() => {
            s();
            spy();
          });
          return document.createElement("li");
        }, {}),
    });

    const parent = createElement("div", { children: forFragment }) as Element;

    spy.mockClear();
    disposeElement(parent);
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("onCleanup in body effect fires once on disposeElement and not on signal write after", () => {
    const bodyCleanup = vi.fn();
    const s = signal(0);

    const el = mount(() => {
      effect(() => {
        s();
        onCleanup(bodyCleanup);
      });
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
