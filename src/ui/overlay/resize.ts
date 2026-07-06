import { onCleanup } from "@/signals/index.ts";
import { parseResize, type Session } from "./gesture-model.ts";
import { createFrameIO, createGestureRecognizer } from "./overlay-dom.ts";
import { resizeHeightSession } from "./resize-height-session.ts";
import { resizeSession } from "./resize-session.ts";
import {
  freeResize,
  type ResizeContext,
  type ResizeStrategy,
} from "./resize-strategy.ts";
import { resizeWidthSession } from "./resize-width-session.ts";
import type { Effect } from "./rubber.ts";

/**
 * The resize service — sizes a target through a space. The handle you
 * `attach()` is the whole gesture zone (unlike the markup gestures,
 * which zone-detect on the overlay surface); the side comes from the
 * target's `data-resize` value, same vocabulary as the stylesheet.
 *
 * The space is any `ResizeStrategy` — pass a `detents()` space to snap,
 * omit for `freeResize()`. Effects apply on release: each `settle` runs
 * over the strategy's rested size (`null` = dismiss). Live rubber past
 * the strategy bounds is built into the sessions.
 */

export interface ResizeService {
  /** Resize to a size (px) along the resize axis — animated by CSS. */
  update(size: number): void;
  /** Wire the pointer plumbing to a handle. */
  attach(handle: Element): { dispose(): void };
  dispose(): void;
  [Symbol.dispose](): void;
}

/** Chain settle effects after the strategy's rest. */
function withEffects(
  base: ResizeStrategy,
  effects: Effect[],
): ResizeStrategy {
  if (!effects.length) return base;
  return {
    bounds: base.bounds?.bind(base),
    rest(ctx: ResizeContext) {
      let rested = base.rest(ctx);
      if (rested === null) return null;
      for (const e of effects) {
        if (!e.settle) continue;
        const s = e.settle(rested, ctx.velocity, [ctx.min, ctx.max]);
        if (s === null) return null;
        rested = s;
      }
      return rested;
    },
  };
}

export function resize(
  target: HTMLElement,
  space?: ResizeStrategy,
  ...effects: Effect[]
): ResizeService {
  const io = createFrameIO(target, {
    strategy: withEffects(space ?? freeResize(), effects),
    dismissible: true,
    velocityThreshold: 0.5,
  });

  const buildSession = (): Session | null => {
    const parsed = parseResize(target.getAttribute("data-resize") ?? "");
    const { snapshot, resizer } = io.engage();
    if (parsed.block !== null && parsed.inline !== null)
      return resizeSession(snapshot, resizer, io, parsed.block, parsed.inline);
    if (parsed.block !== null)
      return resizeHeightSession(snapshot, resizer, io, parsed.block);
    if (parsed.inline !== null)
      return resizeWidthSession(snapshot, resizer, io, parsed.inline);
    return null;
  };

  const attachments: Array<() => void> = [];
  const attach = (handle: Element) => {
    const recognizer = createGestureRecognizer(handle as HTMLElement, {
      canEngage: () => true,
      engage: () => buildSession(),
    });
    attachments.push(recognizer.dispose);
    return { dispose: recognizer.dispose };
  };

  const update = (size: number) => {
    const parsed = parseResize(target.getAttribute("data-resize") ?? "");
    const key =
      parsed.block !== null && parsed.inline === null ? "h" : "w";
    io.commit({ [key]: size });
  };

  const dispose = () => {
    for (const detach of attachments.splice(0)) detach();
  };
  onCleanup(dispose);

  return { update, attach, dispose, [Symbol.dispose]: dispose };
}
