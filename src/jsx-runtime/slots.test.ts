import { describe, it, expect, vi } from "vitest";
import { signal, computed, effect } from "../signals";
import { createElement, disposeElement } from "./element";
import { slot } from "../slot";

// ─ Fixture ────────────────────────────────────────────────────────────────────

/**
 * Class component with `@slot()` properties. Reading the property yields the
 * slot's region (a fragment) — the template just places it; assignment fills
 * it from anywhere, before or after mount.
 */
class Card {
  @slot() header: Node | null = null;
  @slot() body: Node | null = null;

  render() {
    return createElement("div", {
      children: [this.header, this.body],
    }) as Element;
  }
}

// ─ Slots as plain props (elements-kit JSX) ───────────────────────────────────

describe("@slot — JSX props", () => {
  it("fills a named slot with a static element", () => {
    const header = document.createElement("h1");
    header.textContent = "Hello";

    const el = createElement(Card, { header }) as Element;
    expect(el.querySelector("h1")?.textContent).toBe("Hello");
  });

  it("fills multiple slots", () => {
    const header = document.createElement("h1");
    const body = document.createElement("p");
    header.textContent = "Title";
    body.textContent = "Body";

    const el = createElement(Card, { header, body }) as Element;

    expect(el.querySelector("h1")?.textContent).toBe("Title");
    expect(el.querySelector("p")?.textContent).toBe("Body");
  });

  it("accepts a reactive (computed) node and re-renders on change", () => {
    const s = signal("initial");
    const node = computed(() => {
      const h = document.createElement("h1");
      h.textContent = s();
      return h;
    });

    const el = createElement(Card, { header: node }) as Element;

    expect(el.querySelector("h1")?.textContent).toBe("initial");
    s("updated");
    expect(el.querySelector("h1")?.textContent).toBe("updated");
  });

  it("throws when slot value is not a Node", () => {
    expect(() =>
      createElement(Card, { header: "not-a-node" as unknown as Node }),
    ).toThrow("slot value must be a Node");
  });
});

// ─ Slots as plain properties (outside elements-kit JSX) ──────────────────────

describe("@slot — direct property assignment", () => {
  it("assignment fills the slot after mount", () => {
    const card = new Card();
    const host = document.createElement("div");
    host.appendChild(card.render());

    card.header = Object.assign(document.createElement("h1"), {
      textContent: "assigned",
    });
    expect(host.querySelector("h1")?.textContent).toBe("assigned");
  });

  it("assignment before mount buffers until the region is placed", () => {
    const card = new Card();
    card.header = Object.assign(document.createElement("h1"), {
      textContent: "early",
    });

    const host = document.createElement("div");
    host.appendChild(card.render());
    expect(host.querySelector("h1")?.textContent).toBe("early");
  });

  it("the region works in a plain-DOM template (no elements-kit render)", () => {
    const card = new Card();
    const host = document.createElement("section");
    host.append(card.header!); // vanilla placement — just a fragment

    card.header = document.createElement("h1");
    expect(host.querySelector("h1")).not.toBeNull();
  });

  it("assigning null clears the slot", () => {
    const card = new Card();
    const host = document.createElement("div");
    host.appendChild(card.render());

    card.header = document.createElement("h1");
    expect(host.querySelector("h1")).not.toBeNull();
    card.header = null;
    expect(host.querySelector("h1")).toBeNull();
  });

  it("replaced slot content is disposed", () => {
    const spy = vi.fn();
    const s = signal(0);

    const child = createElement(() => {
      effect(() => {
        s();
        spy();
      });
      return document.createElement("span");
    }, {}) as Element;

    const card = new Card();
    const host = document.createElement("div");
    host.appendChild(card.render());
    card.header = child;

    spy.mockClear();
    card.header = document.createElement("i");
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });
});

void disposeElement;
