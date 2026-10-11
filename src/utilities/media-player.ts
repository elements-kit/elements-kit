import { type Computed, type Signal } from "@/signals/index.ts";
import { fromEvent, sync } from "./event-driven.ts";

type MediaPlayerResult<T extends HTMLMediaElement> = {
  element: T;
  playing: Computed<boolean>;
  muted: Signal<boolean>;
  volume: Signal<number>;
  duration: Computed<number>;
  time: Signal<number>;
  ended: Computed<boolean>;
  play(): void;
  pause(): void;
  toggle(): void;
} & Disposable;

/**
 * Wraps an `HTMLMediaElement` (`<audio>` or `<video>`) with reactive state
 * and playback controls.
 */
export function createMediaPlayer<T extends HTMLMediaElement>(
  element: T,
): MediaPlayerResult<T> {
  const el = element;

  const [playing] = sync(fromEvent(el, ["play", "pause"]), () => !el.paused);
  const [muted] = sync(
    fromEvent(el, "volumechange"),
    () => el.muted,
    (v) => {
      el.muted = v;
    },
  );
  const [volume] = sync(
    fromEvent(el, "volumechange"),
    () => el.volume,
    (v) => {
      el.volume = Math.min(1, Math.max(0, v));
    },
  );
  const [duration] = sync(
    fromEvent(el, "durationchange"),
    () => el.duration || 0,
  );
  const [time] = sync(
    fromEvent(el, "timeupdate"),
    () => el.currentTime,
    (v) => {
      el.currentTime = v;
    },
  );
  const [ended] = sync(fromEvent(el, "ended"), () => el.ended);

  return {
    element: el,
    playing: playing as Computed<boolean>,
    muted: muted as Signal<boolean>,
    volume: volume as Signal<number>,
    duration: duration as Computed<number>,
    time: time as Signal<number>,
    ended: ended as Computed<boolean>,
    play: () => el.play(),
    pause: () => el.pause(),
    toggle: () => (el.paused ? el.play() : el.pause()),
    [Symbol.dispose]: () => {},
  } as MediaPlayerResult<T>;
}
