import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createRaf } from "./raf.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("createRaf", () => {
  it("starts running immediately", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    let r!: ReturnType<typeof createRaf>;
    effectScope(() => {
      r = createRaf(vi.fn());
    });
    expect(r.isRunning()).toBe(true);
  });

  it("calls the callback via RAF", () => {
    let raf: ((time: number) => void) | undefined;
    vi.stubGlobal("requestAnimationFrame", (cb: (time: number) => void) => {
      raf = cb;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const cb = vi.fn();
    effectScope(() => {
      createRaf(cb);
    });

    raf?.(16);
    expect(cb).toHaveBeenCalledWith(16);
  });

  it("stop() halts the loop", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);

    let r!: ReturnType<typeof createRaf>;
    effectScope(() => {
      r = createRaf(vi.fn());
    });
    r.stop();
    expect(r.isRunning()).toBe(false);
    expect(cancel).toHaveBeenCalled();
  });

  it("Symbol.dispose stops the loop", () => {
    const cancel = vi.fn();
    vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", cancel);

    let r!: ReturnType<typeof createRaf>;
    effectScope(() => {
      r = createRaf(vi.fn());
    });
    r[Symbol.dispose]();
    expect(cancel).toHaveBeenCalled();
  });
});
