import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createAnimationFrames } from "./animation-frames.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("createAnimationFrames", () => {
  it("starts paused", () => {
    let af!: ReturnType<typeof createAnimationFrames>;
    effectScope(() => {
      af = createAnimationFrames();
    });
    expect(af.isRunning()).toBe(false);
  });

  it("start() sets isRunning to true", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    let af!: ReturnType<typeof createAnimationFrames>;
    effectScope(() => {
      af = createAnimationFrames();
    });
    af.start();
    expect(af.isRunning()).toBe(true);
  });

  it("stop() sets isRunning to false", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    let af!: ReturnType<typeof createAnimationFrames>;
    effectScope(() => {
      af = createAnimationFrames();
    });
    af.start();
    af.stop();
    expect(af.isRunning()).toBe(false);
  });

  it("Symbol.dispose stops the loop", () => {
    const cancel = vi.fn();
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", cancel);

    let af!: ReturnType<typeof createAnimationFrames>;
    effectScope(() => {
      af = createAnimationFrames();
    });
    af.start();
    af[Symbol.dispose]();
    expect(cancel).toHaveBeenCalled();
  });
});
