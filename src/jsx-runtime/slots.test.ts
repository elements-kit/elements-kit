import { describe, it, expect, vi } from "vitest";
import { signal, effect } from "../signals";
import { createElement, disposeElement } from "./element";
import { SLOTS, Slots, Slot } from "../slot";

// ─ Helpers ────────────────────────────────────────────────────────────────────

/** Class component with SLOTS. */
class Card {
  [SLOTS] = Slots.new(["header", "body"]);

  render() {
    const div = document.createElement("div");
    div.appendChild(this[SLOTS].header());
    div.appendChild(this[SLOTS].body());
    return div;
  }
}

/** Class component with direct Slot properties. */
class Panel {
  title = Slot.new();
  content = Slot.new();

  render() {
    const div = document.createElement("div");
    div.appendChild(this.title());
    div.appendChild(this.content());
    return div;
  }
}

// ─ SLOTS ─────────────────────────────────────────────────────────────────────

describe("SLOTS — Slots.new()", () => {
  it("fills a named slot with a static element", () => {
    const header = document.createElement("h1");
    header.textContent = "Hello";

    const el = createElement(Card, { "slot:header": header }) as Element;
    expect(el.querySelector("h1")?.textContent).toBe("Hello");
  });

  it("fills multiple named slots", () => {
    const header = document.createElement("h1");
    const body = document.createElement("p");
    header.textContent = "Title";
    body.textContent = "Body";

    const el = createElement(Card, {
      "slot:header": header,
      "slot:body": body,
    }) as Element;

    expect(el.querySelector("h1")?.textContent).toBe("Title");
    expect(el.querySelector("p")?.textContent).toBe("Body");
  });

  it("fills a slot with a reactive function", () => {
    const s = signal("initial");

    const el = createElement(Card, {
      "slot:header": () => {
        const h = document.createElement("h1");
        h.textContent = s();
        return h;
      },
    }) as Element;

    expect(el.querySelector("h1")?.textContent).toBe("initial");
    s("updated");
    expect(el.querySelector("h1")?.textContent).toBe("updated");
  });

  it("slot content is disposed when parent is disposed", () => {
    const spy = vi.fn();
    const s = signal(0);

    const child = createElement(() => {
      effect(() => {
        s();
        spy();
      });
      return document.createElement("span");
    }, {}) as Element;

    const el = createElement(Card, { "slot:header": child }) as Element;

    spy.mockClear();
    disposeElement(el);
    s(1);
    expect(spy).not.toHaveBeenCalled();
  });
});

// ─ Direct Slot properties ──────────────────────────────────────────────────────

describe("Slot properties on component", () => {
  it("fills a direct Slot property with a static element", () => {
    const h = document.createElement("h2");
    h.textContent = "Panel title";

    const el = createElement(Panel, { title: h }) as Element;
    expect(el.querySelector("h2")?.textContent).toBe("Panel title");
  });

  it("fills multiple direct Slot properties", () => {
    const title = document.createElement("h2");
    const content = document.createElement("p");
    title.textContent = "T";
    content.textContent = "C";

    const el = createElement(Panel, { title, content }) as Element;
    expect(el.querySelector("h2")?.textContent).toBe("T");
    expect(el.querySelector("p")?.textContent).toBe("C");
  });

  it("fills a direct Slot property with a reactive function", () => {
    const s = signal("v1");

    const el = createElement(Panel, {
      title: () => {
        const h = document.createElement("h2");
        h.textContent = s();
        return h;
      },
    }) as Element;

    expect(el.querySelector("h2")?.textContent).toBe("v1");
    s("v2");
    expect(el.querySelector("h2")?.textContent).toBe("v2");
  });
});
