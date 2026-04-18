import { describe, it, expect } from "vitest";
import { effect, onCleanup, signal } from "./index";
import { scope } from "./scope";

describe("scope", () => {
  it("returns [result, stop]", () => {
    const [result, stop] = scope(() => 42);
    expect(result).toBe(42);
    expect(typeof stop).toBe("function");
    stop();
  });

  it("runs effects inside the scope; stop halts them", () => {
    const count = signal(0);
    const seen: number[] = [];

    const [, stop] = scope(() => {
      effect(() => seen.push(count()));
    });

    expect(seen).toEqual([0]);
    count(1);
    expect(seen).toEqual([0, 1]);

    stop();
    count(2);
    expect(seen).toEqual([0, 1]);
  });

  it("fires onCleanup registered in setup when stop is called", () => {
    const log: string[] = [];
    const [, stop] = scope(() => {
      onCleanup(() => log.push("cleanup"));
    });
    expect(log).toEqual([]);
    stop();
    expect(log).toEqual(["cleanup"]);
  });

  it("is detached from an enclosing effect — not disposed when it re-runs", () => {
    const tick = signal(0);
    const log: string[] = [];
    let lastStop: (() => void) | undefined;

    const dispose = effect(() => {
      tick();
      const [, stop] = scope(() => {
        onCleanup(() => log.push("inner"));
      });
      lastStop = stop;
    });

    expect(log).toEqual([]);
    tick(1);
    expect(log).toEqual([]);

    lastStop?.();
    expect(log).toEqual(["inner"]);
    dispose();
  });
});
