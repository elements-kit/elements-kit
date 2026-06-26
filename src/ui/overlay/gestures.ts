import { onCleanup } from "@/signals/index.ts";
import {
  detectEngagement,
  type FrameIO,
  type MoveDeps,
  parseResize,
  type Resizer,
  type Session,
  type Snapshot,
} from "./gesture-model.ts";
import { moveSession } from "./move-session.ts";
import { createFrameIO, createGestureRecognizer } from "./overlay-dom.ts";
import { resizeHeightSession } from "./resize-height-session.ts";
import { resizeSession } from "./resize-session.ts";
import { resizeWidthSession } from "./resize-width-session.ts";
import { freeResize, type ResizeStrategy } from "./resize-strategy.ts";

export interface OverlayGestureOptions {
  /** How a resize drag rests. Default: `freeResize()`. */
  resize?: ResizeStrategy;
  /** Allow a drag/flick past the minimum to close. Default `true`. */
  dismissible?: boolean;
  /** Release velocity (px/ms, shrinking) that dismisses. Default `0.5`. */
  velocityThreshold?: number;
}

export interface OverlayGestures {
  /** Resize to a size (px) along the resize axis — animated by CSS. */
  resize(size: number): void;
  dispose(): void;
  [Symbol.dispose](): void;
}

type ParsedResize = ReturnType<typeof parseResize>;

/** The size a `data-resize` value persists: block edges drive the height,
 * everything else (inline edges, corners) the width. */
const resizeKey = (parsed: ParsedResize): "w" | "h" =>
  parsed.block !== null && parsed.inline === null ? "h" : "w";

/** Build the drag session for an engaged zone. */
function selectSession(
  key: "block" | "inline" | "resize" | "move",
  parsed: ParsedResize,
  snapshot: Snapshot,
  resizer: Resizer,
  move: MoveDeps,
  io: FrameIO,
): Session {
  if (key === "block")
    return resizeHeightSession(snapshot, resizer, io, parsed.block!);
  if (key === "inline")
    return resizeWidthSession(snapshot, resizer, io, parsed.inline!);
  if (key === "resize")
    return resizeSession(snapshot, resizer, io, parsed.block!, parsed.inline!);
  return moveSession(snapshot, move, io);
}

/**
 * Opt-in pointer gestures for `.x-overlay`, dispatched by the gesture
 * attributes (structure stays in markup; policy is options):
 *
 * - An edge word (`block-*` / `inline-*`) is a whole-surface size drag
 *   along that axis — block drags the height (sheets), inline the width
 *   (drawers), `:dir(rtl)` flips the inline sign. The side names the
 *   handle; the opposite edge stays put.
 * - A corner word (`start-start` / … — block side first) is a desktop-
 *   window resize from a square zone at that corner, anchored at the
 *   opposite corner so the surface never grows past the constraint. The
 *   width follows the `resize` strategy; the height is a free clamp.
 * - `data-draggable` moves the surface in x/y from the top strip,
 *   rubber-banding at the edges; flinging it off the constraint dismisses
 *   (when `dismissible`).
 *
 * Layered for testability: `gesture-model` owns the pure mode reducers +
 * math, and `overlay-dom` owns all DOM contact (pointer plumbing + channel
 * I/O). This function is the wiring — it picks a pure `Session` from
 * `detectEngagement` and adapts it to the recognizer through the io.
 * The `resize` strategy (`freeResize` by default, or `detents`) decides the
 * rested size, written to the public `--overlay-w`/`--overlay-h` channels;
 * CSS renders and animates them. JS never touches `translate`/`top`/`left`.
 *
 * Registers its cleanup with the current scope (`onCleanup`) and also
 * returns it as `dispose` / `Symbol.dispose`.
 *
 * @example
 * ```ts
 * import { createOverlayGestures, detents } from "elements-kit/ui/overlay";
 *
 * const el = document.querySelector("dialog.x-overlay")!;
 * createOverlayGestures(el, { resize: detents([0.25, 0.6, 0.9]) });
 * el.addEventListener("resizechange", (e) => console.log(e.detail));
 * ```
 */
export function createOverlayGestures(
  overlay: HTMLElement,
  options?: OverlayGestureOptions,
): OverlayGestures {
  const io = createFrameIO(overlay, {
    strategy: options?.resize ?? freeResize(),
    dismissible: options?.dismissible ?? true,
    velocityThreshold: options?.velocityThreshold ?? 0.5,
  });

  const canEngage = (event: PointerEvent): boolean => {
    const resize = overlay.getAttribute("data-resize") ?? "";
    const draggable = overlay.hasAttribute("data-draggable");
    if (!resize && !draggable) return false;
    // data-anchor is reserved for future element anchoring — don't drag it.
    if (overlay.getAttribute("data-anchor") === "element") return false;
    // Leave interactive elements alone — capturing the pointer would
    // retarget the pointerup to the overlay and swallow their click.
    const target = event.target as Element | null;
    if (
      target?.closest(
        "button, a, label, input, select, textarea, [contenteditable]",
      )
    ) {
      return false;
    }
    // Don't hijack a scroll-back gesture inside scrolled content.
    for (
      let el = target;
      el !== null && el !== overlay;
      el = el.parentElement
    ) {
      if (el.scrollTop > 0) return false;
    }
    return true;
  };

  const engage = (event: PointerEvent): Session | null => {
    const parsed = parseResize(overlay.getAttribute("data-resize") ?? "");
    const draggable = overlay.hasAttribute("data-draggable");
    const { snapshot, resizer, move } = io.engage();
    const key = detectEngagement({
      ...parsed,
      draggable,
      rect: snapshot.rect,
      pointer: { x: event.clientX, y: event.clientY },
      dir: snapshot.dir,
    });
    if (!key) return null;
    return selectSession(key, parsed, snapshot, resizer, move, io);
  };

  const recognizer = createGestureRecognizer(overlay, { canEngage, engage });
  const dispose = () => recognizer.dispose();
  onCleanup(dispose);

  return {
    resize(size) {
      const key = resizeKey(parseResize(overlay.getAttribute("data-resize") ?? ""));
      io.commit({ [key]: size });
    },
    dispose,
    [Symbol.dispose]: dispose,
  };
}
