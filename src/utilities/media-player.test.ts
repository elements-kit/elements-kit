import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "@/signals/index.ts";
import { createMediaPlayer } from "./media-player.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("createMediaPlayer", () => {
  describe("with <audio>", () => {
    it("accepts an HTMLAudioElement", () => {
      const el = new Audio();
      let a!: ReturnType<typeof createMediaPlayer<HTMLAudioElement>>;
      effectScope(() => {
        a = createMediaPlayer(el);
      });
      expect(a.element).toBe(el);
    });

    it("starts as paused", () => {
      let a!: ReturnType<typeof createMediaPlayer<HTMLAudioElement>>;
      effectScope(() => {
        a = createMediaPlayer(new Audio());
      });
      expect(a.playing()).toBe(false);
    });

    it("muted(true) sets muted to true", () => {
      let a!: ReturnType<typeof createMediaPlayer<HTMLAudioElement>>;
      effectScope(() => {
        a = createMediaPlayer(new Audio());
      });
      a.muted(true);
      expect(a.element.muted).toBe(true);
    });

    it("volume() clamps to [0, 1]", () => {
      let a!: ReturnType<typeof createMediaPlayer<HTMLAudioElement>>;
      effectScope(() => {
        a = createMediaPlayer(new Audio());
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
      let a!: ReturnType<typeof createMediaPlayer<HTMLAudioElement>>;
      dispose = effectScope(() => {
        a = createMediaPlayer(el);
      });
      vi.spyOn(a.element, "removeEventListener").mockImplementation(removeSpy);
      dispose();
      expect(removeSpy).toHaveBeenCalled();
    });
  });

  describe("with <video>", () => {
    it("accepts an HTMLVideoElement", () => {
      const el = document.createElement("video");
      document.body.appendChild(el);
      let v!: ReturnType<typeof createMediaPlayer<HTMLVideoElement>>;
      effectScope(() => {
        v = createMediaPlayer(el);
      });
      expect(v.element).toBe(el);
    });

    it("starts as paused", () => {
      const el = document.createElement("video");
      document.body.appendChild(el);
      let v!: ReturnType<typeof createMediaPlayer<HTMLVideoElement>>;
      effectScope(() => {
        v = createMediaPlayer(el);
      });
      expect(v.playing()).toBe(false);
    });

    it("time(v) updates currentTime", () => {
      const el = document.createElement("video");
      document.body.appendChild(el);
      let v!: ReturnType<typeof createMediaPlayer<HTMLVideoElement>>;
      effectScope(() => {
        v = createMediaPlayer(el);
      });
      v.time(30);
      expect(el.currentTime).toBe(30);
    });

    it("removes event listeners when scope is disposed", () => {
      const el = document.createElement("video");
      document.body.appendChild(el);
      let dispose!: () => void;
      let v!: ReturnType<typeof createMediaPlayer<HTMLVideoElement>>;
      dispose = effectScope(() => {
        v = createMediaPlayer(el);
      });
      const removeSpy = vi.spyOn(el, "removeEventListener");
      dispose();
      expect(removeSpy).toHaveBeenCalled();
    });
  });
});
