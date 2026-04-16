import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, signal } from "../index.ts";
import { createWatch } from "./watch.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createWatch", () => {
  it("does not call callback on initial run", () => {
    const s = signal(0);
    const cb = vi.fn();

    effectScope(() => {
      createWatch(() => s(), cb);
    });

    expect(cb).not.toHaveBeenCalled();
  });

  it("calls callback when the source changes", () => {
    const s = signal(0);
    const cb = vi.fn();

    effectScope(() => {
      createWatch(() => s(), cb);
    });

    s(1);
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(1, 0);
  });

  it("passes the previous value correctly", () => {
    const s = signal("a");
    const cb = vi.fn();

    effectScope(() => {
      createWatch(() => s(), cb);
    });

    s("b");
    s("c");
    expect(cb).toHaveBeenNthCalledWith(1, "b", "a");
    expect(cb).toHaveBeenNthCalledWith(2, "c", "b");
  });

  it("disposal stops the watch", () => {
    const s = signal(0);
    const cb = vi.fn();
    let stop!: () => void;

    effectScope(() => {
      stop = createWatch(() => s(), cb);
    });

    stop();
    s(1);
    expect(cb).not.toHaveBeenCalled();
  });
});
