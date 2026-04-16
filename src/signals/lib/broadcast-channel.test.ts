import { describe, it, expect, vi, afterEach } from "vitest";
import { effectScope } from "../index.ts";
import { createBroadcastChannel } from "./broadcast-channel.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createBroadcastChannel", () => {
  it("receives messages posted to the channel", () => {
    const postMessageFn = vi.fn();
    let onmessage: ((e: MessageEvent) => void) | null = null;

    vi.stubGlobal(
      "BroadcastChannel",
      class {
        onmessage: ((e: MessageEvent) => void) | null = null;
        constructor() {
          setTimeout(() => {
            onmessage = this.onmessage;
          }, 0);
        }
        postMessage = postMessageFn;
        close = vi.fn();
      },
    );

    let ch!: ReturnType<typeof createBroadcastChannel<string>>;
    effectScope(() => {
      ch = createBroadcastChannel<string>("test");
    });

    expect(ch.data()).toBeUndefined();
  });

  it("post calls postMessage on the channel", () => {
    const postMessageFn = vi.fn();
    const closeFn = vi.fn();

    vi.stubGlobal(
      "BroadcastChannel",
      class {
        onmessage: ((e: MessageEvent) => void) | null = null;
        postMessage = postMessageFn;
        close = closeFn;
      },
    );

    let ch!: ReturnType<typeof createBroadcastChannel<string>>;
    effectScope(() => {
      ch = createBroadcastChannel<string>("test");
    });

    ch.post("hello");
    expect(postMessageFn).toHaveBeenCalledWith("hello");
  });

  it("closes channel on dispose", () => {
    const closeFn = vi.fn();
    vi.stubGlobal(
      "BroadcastChannel",
      class {
        onmessage: ((e: MessageEvent) => void) | null = null;
        postMessage = vi.fn();
        close = closeFn;
      },
    );

    let ch!: ReturnType<typeof createBroadcastChannel>;
    effectScope(() => {
      ch = createBroadcastChannel("test");
    });

    ch[Symbol.dispose]();
    expect(closeFn).toHaveBeenCalledOnce();
  });
});
