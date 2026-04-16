import { describe, it, expect, vi, afterEach } from "vitest";
import { effect, effectScope, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createEventListener", () => {
  it("fires the handler when the event is dispatched", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const handler = vi.fn();

    effect(() => {
      createEventListener(el, "click", handler);
    });

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("removes the listener when the enclosing effect is disposed", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const handler = vi.fn();

    const stop = effect(() => {
      createEventListener(el, "click", handler);
    });

    stop();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("removes the listener when the enclosing scope is disposed", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const handler = vi.fn();

    const stop = effectScope(() => {
      createEventListener(el, "click", handler);
    });

    stop();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("re-registers the listener when a reactive target changes", () => {
    const el1 = document.createElement("div");
    const el2 = document.createElement("div");
    document.body.append(el1, el2);

    const target = signal<HTMLElement>(el1);
    const handler = vi.fn();

    effectScope(() => {
      createEventListener(() => target(), "click", handler);
    });

    el1.dispatchEvent(new MouseEvent("click"));
    expect(handler).toHaveBeenCalledTimes(1);

    target(el2);

    el1.dispatchEvent(new MouseEvent("click"));
    expect(handler).toHaveBeenCalledTimes(1); // old listener removed

    el2.dispatchEvent(new MouseEvent("click"));
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
