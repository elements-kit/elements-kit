import { type Computed } from "../index.ts";
import { fromEvent, sync } from "./event-driven.ts";

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

  const [isFullscreen, cleanup] = sync(
    fromEvent(document, "fullscreenchange"),
    () => !!document.fullscreenElement,
  );

  const enter = () => getTarget().requestFullscreen();
  const exit = () => document.exitFullscreen();
  const toggle = () => (isFullscreen() ? exit() : enter());

  return {
    isFullscreen: isFullscreen as Computed<boolean>,
    enter,
    exit,
    toggle,
    [Symbol.dispose]: cleanup,
  } as FullscreenResult;
}
