import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createAudio } from "./audio.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("createAudio", () => {
  it("accepts an HTMLAudioElement", () => {
    const el = new Audio();
    let a!: ReturnType<typeof createAudio>;
    effectScope(() => {
      a = createAudio(el);
    });
    expect(a.element).toBe(el);
  });

  it("starts as paused", () => {
    let a!: ReturnType<typeof createAudio>;
    effectScope(() => {
      a = createAudio(new Audio());
    });
    expect(a.playing()).toBe(false);
  });

  it("muted(true) sets muted to true", () => {
    let a!: ReturnType<typeof createAudio>;
    effectScope(() => {
      a = createAudio(new Audio());
    });
    a.muted(true);
    expect(a.element.muted).toBe(true);
  });

  it("volume() clamps to [0, 1]", () => {
    let a!: ReturnType<typeof createAudio>;
    effectScope(() => {
      a = createAudio(new Audio());
    });
    a.volume(2);
    expect(a.element.volume).toBe(1);
    a.volume(-1);
    expect(a.element.volume).toBe(0);
  });

  it("removes event listeners when scope is disposed", () => {
    const removeSpy = vi.fn();
    const el = new Audio();
    let dispose!: () => void;
    let a!: ReturnType<typeof createAudio>;
    dispose = effectScope(() => {
      a = createAudio(el);
    });
    vi.spyOn(a.element, "removeEventListener").mockImplementation(removeSpy);
    dispose();
    expect(removeSpy).toHaveBeenCalled();
  });
});
