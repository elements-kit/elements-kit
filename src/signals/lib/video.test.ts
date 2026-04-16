import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createVideo } from "./video.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("createVideo", () => {
  it("accepts an HTMLVideoElement", () => {
    const el = document.createElement("video");
    document.body.appendChild(el);
    let v!: ReturnType<typeof createVideo>;
    effectScope(() => {
      v = createVideo(el);
    });
    expect(v.element).toBe(el);
  });

  it("starts as paused", () => {
    const el = document.createElement("video");
    document.body.appendChild(el);
    let v!: ReturnType<typeof createVideo>;
    effectScope(() => {
      v = createVideo(el);
    });
    expect(v.playing()).toBe(false);
  });

  it("time(v) updates currentTime", () => {
    const el = document.createElement("video");
    document.body.appendChild(el);
    let v!: ReturnType<typeof createVideo>;
    effectScope(() => {
      v = createVideo(el);
    });
    v.time(30);
    expect(el.currentTime).toBe(30);
  });

  it("removes event listeners when scope is disposed", () => {
    const el = document.createElement("video");
    document.body.appendChild(el);
    let dispose!: () => void;
    let v!: ReturnType<typeof createVideo>;
    dispose = effectScope(() => {
      v = createVideo(el);
    });
    const removeSpy = vi.spyOn(el, "removeEventListener");
    dispose();
    expect(removeSpy).toHaveBeenCalled();
  });
});
