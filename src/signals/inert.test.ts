// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { computed, effect, setInertEffects, signal } from "./lib";

describe("inert effects (server-render snapshot mode)", () => {
  it("does not execute effect bodies while inert", () => {
    const body = vi.fn();
    const prev = setInertEffects(true);
    try {
      const stop = effect(body);
      expect(body).not.toHaveBeenCalled();
      expect(() => stop()).not.toThrow();
    } finally {
      setInertEffects(prev);
    }
  });

  it("inert effects never re-run on signal writes", () => {
    const s = signal(0);
    const body = vi.fn(() => s());
    const prev = setInertEffects(true);
    try {
      effect(body);
      s(1);
      expect(body).not.toHaveBeenCalled();
    } finally {
      setInertEffects(prev);
    }
  });

  it("returns the previous flag for restoration", () => {
    expect(setInertEffects(true)).toBe(false);
    expect(setInertEffects(false)).toBe(true);
  });

  it("signals and computeds still work while inert", () => {
    const prev = setInertEffects(true);
    try {
      const s = signal(2);
      const double = computed(() => s() * 2);
      expect(double()).toBe(4);
      s(3);
      expect(double()).toBe(6);
    } finally {
      setInertEffects(prev);
    }
  });

  it("restores normal effect execution after inert mode ends", () => {
    setInertEffects(setInertEffects(true));
    const s = signal(0);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(s());
    });
    s(1);
    stop();
    expect(seen).toEqual([0, 1]);
  });
});
