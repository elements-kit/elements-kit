import { describe, it, expect } from "vitest";
import { effect, onCleanup, signal } from "./signals";
import {
  connectedScope,
  disconnectedScope,
  renderScope,
} from "./custom-elements";

describe("renderScope", () => {
  it("returns setup result and a working dispose handle", () => {
    const { result, dispose } = renderScope(() => 42);
    expect(result).toBe(42);
    expect(typeof dispose).toBe("function");
    dispose();
  });

  it("runs effects inside the scope; dispose stops them", () => {
    const count = signal(0);
    const seen: number[] = [];

    const { dispose } = renderScope(() => {
      effect(() => seen.push(count()));
    });

    expect(seen).toEqual([0]);
    count(1);
    expect(seen).toEqual([0, 1]);

    dispose();
    count(2);
    expect(seen).toEqual([0, 1]);
  });

  it("fires onCleanup registered in setup when dispose is called", () => {
    const log: string[] = [];
    const { dispose } = renderScope(() => {
      onCleanup(() => log.push("cleanup"));
    });
    expect(log).toEqual([]);
    dispose();
    expect(log).toEqual(["cleanup"]);
  });

  it("connectedScope/disconnectedScope: fires onCleanup on disconnect", () => {
    const el = document.createElement("div");
    const log: string[] = [];
    connectedScope(el, () => onCleanup(() => log.push("done")));
    expect(log).toEqual([]);
    disconnectedScope(el);
    expect(log).toEqual(["done"]);
  });

  it("connectedScope disposes the prior scope when called again (reconnect)", () => {
    const el = document.createElement("div");
    const log: string[] = [];
    connectedScope(el, () => onCleanup(() => log.push("first")));
    connectedScope(el, () => onCleanup(() => log.push("second")));
    expect(log).toEqual(["first"]);
    disconnectedScope(el);
    expect(log).toEqual(["first", "second"]);
  });

  it("disconnectedScope without a prior connect is a no-op", () => {
    const el = document.createElement("div");
    expect(() => disconnectedScope(el)).not.toThrow();
  });

  it("is detached from an enclosing effect — not disposed when it re-runs", () => {
    const tick = signal(0);
    const log: string[] = [];
    let lastDispose: (() => void) | undefined;

    const stop = effect(() => {
      tick(); // depend on tick
      const { dispose } = renderScope(() => {
        onCleanup(() => log.push("inner"));
      });
      lastDispose = dispose;
    });

    expect(log).toEqual([]);
    tick(1); // effect re-runs; the prior scope must NOT be auto-disposed
    expect(log).toEqual([]);

    lastDispose?.();
    expect(log).toEqual(["inner"]);
    stop();
  });
});
