import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createStartTyping } from "./start-typing.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("createStartTyping", () => {
  it("calls handler on first keydown", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    effectScope(() => {
      createStartTyping(handler, 1000);
    });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not call handler again while still typing", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    effectScope(() => {
      createStartTyping(handler, 1000);
    });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("calls handler again after idle period", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    effectScope(() => {
      createStartTyping(handler, 1000);
    });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    vi.advanceTimersByTime(1100);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("ignores modifier keys", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    effectScope(() => {
      createStartTyping(handler, 1000);
    });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Control" }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("stops on Symbol.dispose", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    let st!: Disposable;
    effectScope(() => {
      st = createStartTyping(handler, 1000);
    });
    st[Symbol.dispose]();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(handler).not.toHaveBeenCalled();
  });
});
