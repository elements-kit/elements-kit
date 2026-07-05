import { onCleanup } from "@/signals/index.ts";
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  type Placement,
  shift,
} from "@floating-ui/dom";
import { resolveConstraint, resolveVarPx } from "./constrain.ts";

/**
 * The JS side of anchored mode (`data-anchor="element"`, index.css).
 * Where CSS anchor positioning exists this module only wires an explicit
 * `anchor-name`/`position-anchor` pair (so programmatic opens — which get
 * no implicit invoker anchor — still attach) and the native tier owns
 * placement. Everywhere else Floating UI drives the same `--overlay-x`/`-y`
 * channels the centered location scheme already renders, reading the same
 * authoring interface (`--overlay-area`, `--overlay-gap`).
 */

export interface OverlayAnchor {
  dispose(): void;
  [Symbol.dispose](): void;
}

/** The same compound gate as the index.css ANCHORED MODE block — both
 * halves or neither, so the CSS and JS tiers can never disagree. */
const nativeAnchorSupport = (): boolean =>
  typeof CSS !== "undefined" &&
  CSS.supports("anchor-name: --x") &&
  CSS.supports("position-area: block-end");

let anchorNames = 0;

/**
 * Maps a `position-area` value to the Floating UI placement. Spanning
 * toward an edge leaves the box flush with the *opposite* edge, so
 * `span-*-end` is a `-start` alignment (and vice versa) — Floating UI
 * resolves `-start`/`-end` logically, so the span tokens need no dir
 * check; only the physical inline sides do. Unknown values fall back to
 * `bottom` (the CSS default, `block-end`).
 */
export function areaToPlacement(area: string, rtl = false): Placement {
  const tokens = area.trim().split(/\s+/);
  const main = tokens.find((t) => !t.startsWith("span-"));
  const span = tokens.find((t) => t.startsWith("span-")) ?? "";
  const side =
    main === "block-start"
      ? "top"
      : main === "inline-start"
        ? rtl
          ? "right"
          : "left"
        : main === "inline-end"
          ? rtl
            ? "left"
            : "right"
          : "bottom";
  const align = span.endsWith("-end")
    ? "-start"
    : span.endsWith("-start")
      ? "-end"
      : "";
  return `${side}${align}` as Placement;
}

/**
 * Anchors an overlay to an element — the placement layer for popovers.
 * Sets `data-anchor="element"` (gestures never engage on anchored
 * overlays) and picks a tier:
 *
 * - Native CSS anchor positioning: wires an `anchor-name` /
 *   `position-anchor` pair and returns — `position-area` in index.css
 *   does the rest (flip, scroll tracking) with zero listeners.
 * - Fallback: `autoUpdate` + `computePosition` write the box center into
 *   the `--overlay-x`/`-y` channels while the overlay is open. Transitions
 *   are suspended while the loop runs so the box tracks its anchor
 *   instead of chasing it through the 300ms morph easing.
 *
 * `--overlay-area` (any `position-area` value) picks the side in both
 * tiers; `--overlay-gap` the distance. In the fallback tier the area is
 * read at each reposition, and the location clamp still confines the box
 * to the constraint rect.
 *
 * Registers its cleanup with the current scope (`onCleanup`) and also
 * returns it as `dispose` / `Symbol.dispose`.
 *
 * @example
 * ```ts
 * import { anchorOverlay } from "elements-kit/ui/overlay";
 *
 * const menu = document.querySelector("#menu")!;
 * const trigger = document.querySelector("#trigger")!;
 * anchorOverlay(menu, trigger);
 * ```
 */
export function anchorOverlay(
  overlay: HTMLElement,
  anchor: Element,
): OverlayAnchor {
  overlay.setAttribute("data-anchor", "element");

  if (nativeAnchorSupport()) {
    const name = `--overlay-anchor-${anchorNames++}`;
    const anchorStyle = (anchor as HTMLElement).style;
    anchorStyle?.setProperty("anchor-name", name);
    overlay.style.setProperty("position-anchor", name);
    const dispose = () => {
      anchorStyle?.removeProperty("anchor-name");
      overlay.style.removeProperty("position-anchor");
    };
    onCleanup(dispose);
    return { dispose, [Symbol.dispose]: dispose };
  }

  let stop: (() => void) | undefined;
  let disposed = false;

  const update = async () => {
    const style = getComputedStyle(overlay);
    const placement = areaToPlacement(
      style.getPropertyValue("--overlay-area"),
      style.direction === "rtl",
    );
    const gap = resolveVarPx(
      overlay,
      "--overlay-gap",
      "width",
      "var(--space-2, 8px)",
    );
    const { x, y } = await computePosition(anchor, overlay, {
      strategy: "fixed",
      placement,
      middleware: [offset(gap), flip(), shift()],
    });
    if (disposed) return;
    const rect = overlay.getBoundingClientRect();
    const constraint = resolveConstraint(overlay);
    // The channels hold the box CENTER relative to the constraint origin
    // (index.css LOCATION) — convert Floating UI's viewport top-left.
    overlay.style.setProperty(
      "--overlay-x",
      `${x + rect.width / 2 - constraint.left}px`,
    );
    overlay.style.setProperty(
      "--overlay-y",
      `${y + rect.height / 2 - constraint.top}px`,
    );
  };

  const isOpen = (): boolean => {
    if (overlay.hasAttribute("open")) return true;
    try {
      return overlay.matches(":popover-open");
    } catch {
      return false;
    }
  };

  const start = () => {
    if (stop) return;
    overlay.style.setProperty("transition-duration", "0s");
    stop = autoUpdate(anchor, overlay, () => void update());
  };
  const halt = () => {
    stop?.();
    stop = undefined;
    overlay.style.removeProperty("transition-duration");
  };
  const syncRunning = () => (isOpen() ? start() : halt());

  overlay.addEventListener("toggle", syncRunning);
  overlay.addEventListener("close", syncRunning);
  // show()/showModal() flip [open] without firing an event everywhere.
  const observer = new MutationObserver(syncRunning);
  observer.observe(overlay, { attributes: true, attributeFilter: ["open"] });
  syncRunning();

  const dispose = () => {
    disposed = true;
    halt();
    observer.disconnect();
    overlay.removeEventListener("toggle", syncRunning);
    overlay.removeEventListener("close", syncRunning);
    overlay.style.removeProperty("--overlay-x");
    overlay.style.removeProperty("--overlay-y");
  };
  onCleanup(dispose);
  return { dispose, [Symbol.dispose]: dispose };
}
