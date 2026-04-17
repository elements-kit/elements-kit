import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "@/signals/index.ts";
import { createMutationObserver } from "./mutation-observer.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("createMutationObserver", () => {
  it("observes mutations on a target element", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    let observeCount = 0;
    let capturedCb: ((records: MutationRecord[]) => void) | undefined;

    vi.stubGlobal(
      "MutationObserver",
      function MockMO(cb: (records: MutationRecord[]) => void) {
        capturedCb = cb;
        return {
          observe: () => {
            observeCount++;
          },
          disconnect: vi.fn(),
        };
      },
    );

    effectScope(() => {
      createMutationObserver(target, { childList: true }, vi.fn());
    });

    expect(observeCount).toBe(1);
  });

  it("disconnects on Symbol.dispose", () => {
    const target = document.createElement("div");
    document.body.appendChild(target);

    const disconnect = vi.fn();
    vi.stubGlobal("MutationObserver", function MockMO() {
      return { observe: vi.fn(), disconnect };
    });

    let mo!: Disposable;
    effectScope(() => {
      mo = createMutationObserver(target, { childList: true }, vi.fn());
    });

    mo[Symbol.dispose]();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
