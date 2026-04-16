import { type Computed, onCleanup, signal } from "../index.ts";

type FullscreenResult = {
  isFullscreen: Computed<boolean>;
  enter(): Promise<void>;
  exit(): Promise<void>;
  toggle(): Promise<void>;
} & Disposable;

/**
 * Wraps the Fullscreen API.  `target` defaults to `document.documentElement`.
 */
export function createFullscreen(
  target?: Element | (() => Element | null),
): FullscreenResult {
  const getTarget = () => {
    if (!target) return document.documentElement;
    return typeof target === "function"
      ? (target() ?? document.documentElement)
      : target;
  };

  const isFullscreen = signal(!!document.fullscreenElement);

  const onChange = () => isFullscreen(!!document.fullscreenElement);

  document.addEventListener("fullscreenchange", onChange);
  const cleanup = () =>
    document.removeEventListener("fullscreenchange", onChange);
  onCleanup(cleanup);

  const enter = () => getTarget().requestFullscreen();
  const exit = () => document.exitFullscreen();
  const toggle = () => (isFullscreen() ? exit() : enter());

  return Object.assign(
    { isFullscreen: isFullscreen as Computed<boolean>, enter, exit, toggle },
    { [Symbol.dispose]: cleanup },
  );
}
