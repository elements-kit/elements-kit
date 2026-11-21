import { afterEach, describe, expect, it } from "vitest";
import { effect, signal } from "@/signals/index.ts";
import { Align } from "../overlay/area.ts";
import { ElementBox, MarginBox, VIEWPORT_BOX } from "../overlay/box.ts";
import { Toaster, type ToasterOptions } from "./toast.ts";

import "../styles/index.css";
import "../alert/alert.css";
import "../overlay/index.css";
import "../overlay/overlay.css";

// Real Chromium: top layer, popover display, measured heights.

let toaster: Toaster | undefined;
afterEach(() => {
  toaster?.[Symbol.dispose]();
  toaster = undefined;
  document.body.innerHTML = "";
  document.head.querySelectorAll("style[data-test]").forEach((s) => s.remove());
});

const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function setup(options: ToasterOptions = {}) {
  // Transitions off: measured where they land, removed at once.
  document.head.insertAdjacentHTML(
    "beforeend",
    "<style data-test>.x-overlay { transition: none !important; }</style>",
  );
  toaster = new Toaster(options);
  return toaster;
}

/** A toast element: an overlay frame around an alert. */
function alert(text: string, height = 40): HTMLElement {
  const frame = document.createElement("div");
  frame.className = "unset";
  frame.style.height = `${height}px`;
  frame.style.width = "300px";
  const el = document.createElement("div");
  el.className = "unset x-alert";
  el.textContent = text;
  frame.append(el);
  return frame;
}

const rect = (el: Element) => el.getBoundingClientRect();

/** Move the pointer to (x, y): the toaster tracks the stack's bounds. */
const point = (x: number, y: number) =>
  document.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y }));

describe("Toaster", () => {
  it("shows your element in the top-end corner by default", async () => {
    const t = setup();
    const { element } = t.show(alert("Saved")).box;
    await frame();

    expect(element.matches(":popover-open")).toBe(true);
    expect(rect(element).top).toBeCloseTo(16, 0);
    expect(rect(element).right).toBeCloseTo(innerWidth - 16, 0);
  });

  it("stacks from the area's bottom when its yalign is end", async () => {
    const t = setup({ area: new MarginBox(VIEWPORT_BOX, -16).toArea(Align.center, Align.end) });
    const { element } = t.show(alert("Saved")).box;
    await frame();

    expect(rect(element).bottom).toBeCloseTo(innerHeight - 16, 0);
    expect((rect(element).left + rect(element).right) / 2).toBeCloseTo(innerWidth / 2, 0);
  });

  it("stacks inside any box: a panel", async () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div data-panel style="position: absolute; left: 100px; top: 100px; width: 400px; height: 300px"></div>',
    );
    const panel = document.querySelector<HTMLElement>("[data-panel]")!;
    const t = setup({ area: new MarginBox(new ElementBox(panel), -12).toArea(Align.start, Align.start) });
    const { element } = t.show(alert("Saved")).box;
    await frame();

    expect(rect(element).left).toBeCloseTo(112, 0);
    expect(rect(element).top).toBeCloseTo(112, 0);
  });

  it("stacks down from the top by default: the ones behind peek below", async () => {
    const t = setup();
    const a = t.show(alert("A", 40)).box.element;
    const b = t.show(alert("B", 60)).box.element; // newest, in front
    await frame();

    expect(rect(b).top).toBeCloseTo(16, 0);
    expect(rect(a).bottom).toBeCloseTo(rect(b).bottom + 8, 0);
    expect(rect(a).top).toBeGreaterThanOrEqual(rect(b).top - 0.5);

    const r = rect(b);
    point(r.left + 10, r.top + 10);
    await frame();
    expect(rect(a).top).toBeCloseTo(rect(b).bottom + 8, 0);
  });

  it("is no wider than its area", async () => {
    document.body.insertAdjacentHTML("beforeend", '<div data-panel style="width: 200px; height: 300px"></div>');
    const panel = document.querySelector<HTMLElement>("[data-panel]")!;
    const t = setup({ area: new MarginBox(new ElementBox(panel), -12).toArea(Align.center, Align.start) });
    const { element } = t.show(alert("Saved")).box; // asks for 300px
    await frame();

    expect(rect(element).width).toBeCloseTo(176, 0);
    expect(rect(element).left).toBeCloseTo(rect(panel).left + 12, 0);
  });

  it("spreads by height while held, peeks while collapsed", async () => {
    const t = setup({ area: new MarginBox(VIEWPORT_BOX, -16).toArea(Align.end, Align.end) });
    const a = t.show(alert("A", 40)).box.element;
    const b = t.show(alert("B", 60)).box.element; // newest, in front
    await frame();

    // Collapsed: A's top is `gap` above B's; its bottom no lower than B's.
    expect(rect(b).bottom).toBeCloseTo(innerHeight - 16, 0);
    expect(rect(a).top).toBeCloseTo(rect(b).top - 8, 0);
    expect(rect(a).bottom).toBeLessThanOrEqual(rect(b).bottom + 0.5);

    const r = rect(b);
    point(r.left + 10, r.top + 10);
    await frame();
    expect(t.held()).toBe(true);
    expect(rect(a).bottom).toBeCloseTo(rect(b).top - 8, 0);
  });

  it("stays spread while expanded, without pausing timers", async () => {
    const t = setup({ expand: true });
    const a = t.show(alert("A", 40));
    const b = t.show(alert("B", 60)).box.element;
    a.duration(60);
    await frame();

    expect(t.held()).toBe(false);
    expect(rect(a.box.element).top).toBeCloseTo(rect(b).bottom + 8, 0);
    await wait(120);
    expect(a.box.element.isConnected).toBe(false);
  });

  it("centers toasts behind the front one while collapsed", async () => {
    const t = setup();
    const a = t.show(alert("A")).box.element;
    const b = t.show(alert("B")).box.element;
    await frame();

    const mid = (el: Element) => (rect(el).left + rect(el).right) / 2;
    expect(rect(a).width).toBeLessThan(rect(b).width); // scaled down
    expect(mid(a)).toBeCloseTo(mid(b), 0);
  });

  it("on touch, a tap on the stack holds it until a tap elsewhere", async () => {
    const t = setup();
    t.show(alert("A"));
    const { element } = t.show(alert("B")).box;
    await frame();
    const r = rect(element);
    const touch = (type: string, x: number, y: number, target: EventTarget = document) =>
      target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType: "touch" }));

    touch("pointerup", r.left + 10, r.top + 10);
    touch("pointerleave", r.left + 10, r.top + 10, document.documentElement); // the lifted finger
    expect(t.held()).toBe(true);

    touch("pointerup", 5, innerHeight - 5);
    expect(t.held()).toBe(false);
  });

  it("stays spread when a toast under the pointer is dismissed", async () => {
    const t = setup();
    const a = t.show(alert("A"));
    t.show(alert("B"));
    await frame();
    const r = rect(a.box.element);
    point(r.left + 10, r.bottom - 5);
    expect(t.held()).toBe(true);

    a.dismiss();
    expect(t.held()).toBe(true);
  });

  it("is placed before its first style, so it enters from its spot", () => {
    const t = setup();
    const { element } = t.show(alert("Saved")).box;
    expect(element.style.getPropertyValue("--x")).not.toBe("");
    expect(element.style.getPropertyValue("--y")).not.toBe("");
  });

  it("hides toasts past max; they still time out", async () => {
    const t = setup({ max: 1 });
    const [a, b] = ["A", "B"].map((s) => t.show(alert(s)));
    a!.duration(60);
    b!.duration(Infinity);
    await frame();

    expect(a!.box.element.inert).toBe(true);
    expect(a!.box.element.style.opacity).toBe("0");
    expect(b!.box.element.inert).toBe(false);
    await wait(120);
    expect(a!.box.element.isConnected).toBe(false);
  });
});

describe("Toast", () => {
  it("dismisses after its duration, paused while held", async () => {
    const t = setup();
    const toast = t.show(alert("Saved"));
    toast.duration(80);
    await frame();
    const r = rect(toast.box.element);
    point(r.left + 10, r.top + 10);
    await wait(150);
    expect(toast.box.element.isConnected).toBe(true);

    point(0, 0);
    await wait(150);
    expect(toast.box.element.isConnected).toBe(false);
    expect(t.toasts()).toHaveLength(0);
  });

  it("stays while its duration is Infinity, then counts a fresh duration", async () => {
    const t = setup();
    const loading = signal(true);
    const toast = t.show((self) => {
      effect(() => self.duration(loading() ? Infinity : 60));
      return alert("Uploading…");
    });
    await wait(120);
    expect(toast.box.element.isConnected).toBe(true);

    loading(false);
    await wait(120);
    expect(toast.box.element.isConnected).toBe(false);
  });

  it("builds its content in its own scope: effects end with it", async () => {
    const t = setup();
    const ticks = signal(0);
    let runs = 0;
    const toast = t.show(() => {
      effect(() => {
        ticks();
        runs++;
      });
      return alert("Saved");
    });
    ticks(1);
    expect(runs).toBe(2);

    toast.dismiss();
    await frame();
    ticks(2);
    expect(runs).toBe(2);
  });

  it("hands its overlay over on release: out of the stack, no timer, content live", async () => {
    const t = setup();
    const label = signal("Toast");
    const toast = t.show((self) => {
      self.duration(60);
      const el = alert("");
      effect(() => (el.textContent = label()));
      return el;
    });
    await frame();

    const box = toast.release();
    expect(t.toasts()).toHaveLength(0);
    await wait(120);
    expect(box.element.isConnected).toBe(true);
    expect(box.element.matches(":popover-open")).toBe(true);
    label("Panel");
    expect(box.element.textContent).toBe("Panel");

    toast[Symbol.dispose]();
    expect(box.element.isConnected).toBe(false);
    label("gone");
    expect(box.element.textContent).toBe("Panel");
  });

  it("can be closed by an effect of yours", async () => {
    const t = setup();
    const online = signal(false);
    const toast = t.show(alert("Offline"));
    toast.duration(Infinity);
    effect(() => {
      if (online()) toast.dismiss();
    });

    online(true);
    await frame();
    expect(t.toasts()).toHaveLength(0);
  });
});

describe("Toaster host", () => {
  it("adds toasts where `host` says, asked on each show: a shadow root", async () => {
    const shell = document.createElement("div");
    document.body.append(shell);
    const shadow = shell.attachShadow({ mode: "open" });
    let reads = 0;
    const t = setup({
      host: () => {
        reads++;
        return shadow;
      },
    });
    const { element } = t.show(alert("Saved")).box;
    t.show(alert("Again"));
    await frame();

    expect(element.parentNode).toBe(shadow);
    expect(element.matches(":popover-open")).toBe(true);
    expect(reads).toBe(2);
  });

  it("takes a new host by assignment", async () => {
    const shelf = document.createElement("section");
    document.body.append(shelf);
    const t = setup();
    t.host = () => shelf;
    const { element } = t.show(alert("Saved")).box;
    await frame();

    expect(element.parentNode).toBe(shelf);
  });

  it("leaves an element that already has a parent where it is", async () => {
    const mine = document.createElement("section");
    document.body.append(mine);
    const t = setup();
    const { element } = t.show(() => {
      const el = alert("Saved");
      mine.append(el);
      return el;
    }).box;
    await frame();

    expect(element.parentNode).toBe(mine);
    expect(element.matches(":popover-open")).toBe(true);
  });
});

describe("Toaster over a modal", () => {
  it("is hit-testable above an open modal dialog", async () => {
    const t = setup();
    document.body.insertAdjacentHTML("beforeend", "<dialog>Modal</dialog>");
    document.querySelector("dialog")!.showModal();
    const { element } = t.show(alert("Saved")).box;
    await frame();

    const r = rect(element);
    expect(element.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))).toBe(true);
  });

  it("moves back to the page when the modal closes, still showing", async () => {
    const t = setup();
    document.body.insertAdjacentHTML("beforeend", "<dialog>Modal</dialog>");
    const dialog = document.querySelector("dialog")!;
    dialog.showModal();
    const { element } = t.show(alert("Saved")).box;
    dialog.close();
    await frame();

    expect(element.parentElement).toBe(document.body);
    expect(element.matches(":popover-open")).toBe(true);
  });
});
