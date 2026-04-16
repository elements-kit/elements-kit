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

  it("setTime updates currentTime", () => {
    const el = document.createElement("video");
    document.body.appendChild(el);
    let v!: ReturnType<typeof createVideo>;
    effectScope(() => {
      v = createVideo(el);
    });
    v.setTime(30);
    expect(el.currentTime).toBe(30);
  });

  it("removes event listeners on Symbol.dispose", () => {
    const el = document.createElement("video");
    document.body.appendChild(el);
    let v!: ReturnType<typeof createVideo>;
    effectScope(() => {
      v = createVideo(el);
    });
    const removeSpy = vi.spyOn(el, "removeEventListener");
    v[Symbol.dispose]();
    expect(removeSpy).toHaveBeenCalled();
  });
});
