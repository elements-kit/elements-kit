import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createAudio } from "./audio.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("createAudio", () => {
  it("creates an Audio element from a src string", () => {
    let a!: ReturnType<typeof createAudio>;
    effectScope(() => {
      a = createAudio("test.mp3");
    });
    expect(a.element).toBeInstanceOf(HTMLAudioElement);
  });

  it("starts as paused", () => {
    let a!: ReturnType<typeof createAudio>;
    effectScope(() => {
      a = createAudio("test.mp3");
    });
    expect(a.playing()).toBe(false);
  });

  it("mute() sets muted to true", () => {
    let a!: ReturnType<typeof createAudio>;
    effectScope(() => {
      a = createAudio("test.mp3");
    });
    a.mute();
    expect(a.element.muted).toBe(true);
  });

  it("setVolume clamps to [0, 1]", () => {
    let a!: ReturnType<typeof createAudio>;
    effectScope(() => {
      a = createAudio("test.mp3");
    });
    a.setVolume(2);
    expect(a.element.volume).toBe(1);
    a.setVolume(-1);
    expect(a.element.volume).toBe(0);
  });

  it("removes event listeners on Symbol.dispose", () => {
    const removeSpy = vi.fn();
    let a!: ReturnType<typeof createAudio>;
    effectScope(() => {
      a = createAudio("test.mp3");
    });
    vi.spyOn(a.element, "removeEventListener").mockImplementation(removeSpy);
    a[Symbol.dispose]();
    expect(removeSpy).toHaveBeenCalled();
  });
});
