import { type Computed, onCleanup, signal } from "../index.ts";

type VideoResult = {
  element: HTMLVideoElement;
  playing: Computed<boolean>;
  muted: Computed<boolean>;
  volume: Computed<number>;
  duration: Computed<number>;
  time: Computed<number>;
  ended: Computed<boolean>;
  play(): void;
  pause(): void;
  toggle(): void;
  setVolume(v: number): void;
  setTime(t: number): void;
  mute(): void;
  unmute(): void;
} & Disposable;

/**
 * Wraps an `HTMLVideoElement` with reactive state and playback controls.
 */
export function createVideo(element: HTMLVideoElement): VideoResult {
  const el = element;

  const playing = signal(!el.paused);
  const muted = signal(el.muted);
  const volume = signal(el.volume);
  const duration = signal(el.duration || 0);
  const time = signal(el.currentTime);
  const ended = signal(el.ended);

  const onPlay = () => playing(true);
  const onPause = () => playing(false);
  const onVolumeChange = () => {
    muted(el.muted);
    volume(el.volume);
  };
  const onDurationChange = () => duration(el.duration);
  const onTimeUpdate = () => time(el.currentTime);
  const onEnded = () => ended(true);

  el.addEventListener("play", onPlay);
  el.addEventListener("pause", onPause);
  el.addEventListener("volumechange", onVolumeChange);
  el.addEventListener("durationchange", onDurationChange);
  el.addEventListener("timeupdate", onTimeUpdate);
  el.addEventListener("ended", onEnded);

  const cleanup = () => {
    el.removeEventListener("play", onPlay);
    el.removeEventListener("pause", onPause);
    el.removeEventListener("volumechange", onVolumeChange);
    el.removeEventListener("durationchange", onDurationChange);
    el.removeEventListener("timeupdate", onTimeUpdate);
    el.removeEventListener("ended", onEnded);
  };
  onCleanup(cleanup);

  return Object.assign(
    {
      element: el,
      playing: playing as Computed<boolean>,
      muted: muted as Computed<boolean>,
      volume: volume as Computed<number>,
      duration: duration as Computed<number>,
      time: time as Computed<number>,
      ended: ended as Computed<boolean>,
      play: () => el.play(),
      pause: () => el.pause(),
      toggle: () => (el.paused ? el.play() : el.pause()),
      setVolume: (v: number) => {
        el.volume = Math.min(1, Math.max(0, v));
      },
      setTime: (t: number) => {
        el.currentTime = t;
      },
      mute: () => {
        el.muted = true;
      },
      unmute: () => {
        el.muted = false;
      },
    },
    { [Symbol.dispose]: cleanup },
  );
}
