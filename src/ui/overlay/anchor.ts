import { onCleanup } from "@/signals/index.ts";
import {
  arrow as floatingArrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  type Placement,
  shift,
} from "@floating-ui/dom";
import {
  type RectInit,
  type Region,
  resolveConstraint,
  resolveVarPx,
} from "./constraint.ts";

/**
 * The anchor — one of the two spatial primitives (with the constraint).
 * `anchor(overlay, follow?)` gives the overlay an anchor ELEMENT it
 * follows for its whole life; the anchor element follows `follow` until
 * something else moves it (a `draggable()` service, author code). The
 * overlay itself has no states — dragging, tearing off, re-pinning are
 * all things that happen to the anchor.
 *
 * Two engines, chosen once at wire time, never switched:
 *
 * - Native CSS anchor positioning (compound gate, no `within`/`arrow`):
 *   the overlay's `position-anchor` points at the anchor element; when
 *   `follow` is an element the anchor pins itself to it through a second
 *   native hop (`[data-follow]` rule in index.css mirrors the followed
 *   box via `anchor()`/`anchor-size()`). Placement, flip and scroll
 *   tracking are compositor-side through both hops — zero JS.
 * - Floating UI (below the gate, or `within`/`arrow` requested — native
 *   CSS has no boundary control and no flip signal): `autoUpdate` writes
 *   the box center into the `--overlay-x`/`-y` channels while the
 *   overlay is open; a `dragmove` event from the drag service triggers
 *   an immediate reposition. Tracking writes suppress transitions,
 *   except the first write of a bind made while already open — so
 *   re-anchoring an open popover morphs to the new trigger.
 *
 * `data-anchor="element"` is a static wiring marker (stamped here,
 * removed on dispose, never toggled). `data-placed` is output state —
 * the settled side, feeding the arrow and `transform-origin` (a hint
 * from `--overlay-area` under the native engine, the real side under
 * Floating UI). A first pointer-down from `draggable()` tears the
 * follow pin (the `data-follow` contract); a fresh open re-pins.
 */

export interface AnchorOptions {
  /** Flip/shift boundary — placement confined to this region instead of
   * the viewport. Forces the Floating UI engine. */
  within?: Region;
  /** Caret pointing at the anchor (`.x-overlay-arrow`, injected when not
   * authored; a number sets `--overlay-arrow-size` in px). Forces the
   * Floating UI engine. */
  arrow?: number | boolean;
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
 * Gives `overlay` its anchor element and returns it. The overlay follows
 * the anchor for life; the anchor follows `follow` (element or rect)
 * until something moves it. Pass the returned element to `draggable()`
 * to make the composition tearable — dragging moves the anchor.
 *
 * Registers all cleanup with the current scope (`onCleanup`): the anchor
 * element, the wiring, and the stamped attributes are removed together.
 *
 * @example
 * ```ts
 * import { anchor, draggable, rubber } from "elements-kit/ui/overlay";
 *
 * const a = anchor(panel, trigger);
 * draggable(a, undefined, rubber()).attach(panel);
 * ```
 */
export function anchor(
  overlay: HTMLElement,
  follow?: Element | RectInit,
  opts: AnchorOptions = {},
): HTMLElement {
  const native = nativeAnchorSupport() && !opts.within && !opts.arrow;
  let disposed = false;

  // --- the anchor element ---------------------------------------------
  const el = document.createElement("span");
  el.className = "x-overlay-anchor";
  el.setAttribute("aria-hidden", "true");
  document.body.append(el);

  const proxyName = `--overlay-anchor-${anchorNames++}`;
  const followName = `--overlay-follow-${anchorNames++}`;
  const followStyle =
    follow instanceof Element ? (follow as HTMLElement).style : undefined;

  const placeAtRect = (rect: RectInit) => {
    el.style.top = `${rect.top}px`;
    el.style.left = `${rect.left}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
  };

  /** Pin the anchor element to `follow` (the `data-follow` contract —
   * `draggable()` tears it on the first pointer-down). */
  let stopFollowSync: (() => void) | undefined;
  const pin = () => {
    if (!follow) {
      // Unfollowed anchor — start at the viewport center.
      el.style.top = "50vh";
      el.style.left = "50vw";
      return;
    }
    if (!(follow instanceof Element)) {
      placeAtRect(follow);
      return;
    }
    el.setAttribute("data-follow", "");
    if (nativeAnchorSupport()) {
      // Native chain — index.css [data-follow] mirrors the followed box.
      followStyle?.setProperty("anchor-name", followName);
      el.style.setProperty("position-anchor", followName);
    } else {
      const sync = () => {
        const r = follow.getBoundingClientRect();
        placeAtRect(r);
      };
      stopFollowSync = autoUpdate(follow, el, sync);
    }
  };
  const unpinCleanup = () => {
    stopFollowSync?.();
    stopFollowSync = undefined;
    followStyle?.removeProperty("anchor-name");
  };
  // The drag service removes [data-follow] when it takes over — release
  // the pinning machinery (the chain is inert without the attribute, but
  // the below-gate sync loop must stop).
  const followObserver = new MutationObserver(() => {
    if (!el.hasAttribute("data-follow")) unpinCleanup();
  });
  followObserver.observe(el, {
    attributes: true,
    attributeFilter: ["data-follow"],
  });

  const stampPlacedHint = () => {
    const style = getComputedStyle(overlay);
    const hint = areaToPlacement(
      style.getPropertyValue("--overlay-area"),
      style.direction === "rtl",
    );
    overlay.setAttribute("data-placed", hint.split("-")[0]);
  };

  const isOpen = (): boolean => {
    if (overlay.hasAttribute("open")) return true;
    try {
      return overlay.matches(":popover-open");
    } catch {
      return false;
    }
  };

  // --- wiring the overlay to the anchor element ------------------------
  let haltLoop: (() => void) | undefined;
  let engineDispose: (() => void) | undefined;

  if (native) {
    // data-anchor selects the native scheme (index.css) — stamped only
    // here, statically; the Floating UI engine renders through the
    // centered scheme's channels and must NOT activate the native block.
    overlay.setAttribute("data-anchor", "element");
    el.style.setProperty("anchor-name", proxyName);
    overlay.style.setProperty("position-anchor", proxyName);
    engineDispose = () => {
      overlay.style.removeProperty("position-anchor");
      overlay.removeAttribute("data-anchor");
    };
  } else {
    // Floating UI engine — reference is the anchor element itself.
    let arrowEl: HTMLElement | null = null;
    let arrowOwned = false;
    if (opts.arrow) {
      arrowEl = overlay.querySelector(":scope > .x-overlay-arrow");
      if (!arrowEl) {
        arrowEl = document.createElement("span");
        arrowEl.className = "x-overlay-arrow";
        arrowEl.setAttribute("aria-hidden", "true");
        overlay.append(arrowEl);
        arrowOwned = true;
      }
      if (typeof opts.arrow === "number")
        overlay.style.setProperty("--overlay-arrow-size", `${opts.arrow}px`);
    }

    const boundaryRect = () => {
      const w = opts.within;
      if (!w) return undefined;
      return { x: w.left(), y: w.top(), width: w.width(), height: w.height() };
    };

    const update = async () => {
      const style = getComputedStyle(overlay);
      const placementHint = areaToPlacement(
        style.getPropertyValue("--overlay-area"),
        style.direction === "rtl",
      );
      const gapPx = resolveVarPx(
        overlay,
        "--overlay-gap",
        "width",
        "var(--space-2, 8px)",
      );
      const boundary = boundaryRect();
      const middleware = [
        offset(gapPx),
        flip(boundary ? { boundary } : undefined),
        shift(boundary ? { boundary } : undefined),
      ];
      if (arrowEl) middleware.push(floatingArrow({ element: arrowEl }));
      const { x, y, placement, middlewareData } = await computePosition(
        el,
        overlay,
        { strategy: "fixed", placement: placementHint, middleware },
      );
      if (disposed) return;
      const rect = overlay.getBoundingClientRect();
      const constraint = resolveConstraint(overlay);
      // The channels hold the box CENTER relative to the constraint
      // origin (index.css LOCATION) — convert the viewport top-left.
      overlay.style.setProperty(
        "--overlay-x",
        `${x + rect.width / 2 - constraint.left}px`,
      );
      overlay.style.setProperty(
        "--overlay-y",
        `${y + rect.height / 2 - constraint.top}px`,
      );
      if (placement)
        overlay.setAttribute("data-placed", placement.split("-")[0]);
      const a = middlewareData.arrow;
      if (a) {
        if (a.x !== undefined)
          overlay.style.setProperty("--overlay-arrow-x", `${a.x}px`);
        if (a.y !== undefined)
          overlay.style.setProperty("--overlay-arrow-y", `${a.y}px`);
      }
    };

    let stop: (() => void) | undefined;
    const startLoop = (animateFirst = false) => {
      if (stop) return;
      if (!animateFirst)
        overlay.style.setProperty("transition-duration", "0s");
      let first = animateFirst;
      stop = autoUpdate(el, overlay, () =>
        update().then(() => {
          // Rebind-while-open: the arrival write animates (the morph to
          // the new anchor); every tracking write after it is suppressed.
          if (first && !disposed) {
            first = false;
            overlay.style.setProperty("transition-duration", "0s");
          }
        }),
      );
    };
    haltLoop = () => {
      stop?.();
      stop = undefined;
      overlay.style.removeProperty("transition-duration");
    };

    let initial = true;
    const sync = () => {
      if (disposed) return;
      const animateFirst = initial && isOpen();
      initial = false;
      if (isOpen()) startLoop(animateFirst);
      else haltLoop?.();
    };
    const onDragMove = () => void update();

    overlay.addEventListener("toggle", sync);
    overlay.addEventListener("close", sync);
    el.addEventListener("dragmove", onDragMove);
    // show()/showModal() flip [open] without firing an event everywhere.
    const openObserver = new MutationObserver(sync);
    openObserver.observe(overlay, {
      attributes: true,
      attributeFilter: ["open"],
    });
    sync();

    engineDispose = () => {
      haltLoop?.();
      openObserver.disconnect();
      overlay.removeEventListener("toggle", sync);
      overlay.removeEventListener("close", sync);
      el.removeEventListener("dragmove", onDragMove);
      overlay.style.removeProperty("--overlay-x");
      overlay.style.removeProperty("--overlay-y");
      overlay.style.removeProperty("--overlay-arrow-x");
      overlay.style.removeProperty("--overlay-arrow-y");
      if (typeof opts.arrow === "number")
        overlay.style.removeProperty("--overlay-arrow-size");
      if (arrowOwned) arrowEl?.remove();
    };
  }

  // A fresh open re-pins a torn-off anchor to its followed element.
  const repin = (event: Event) => {
    if (disposed || !follow) return;
    const opening =
      (event as { newState?: string }).newState === "open" ||
      (event.type !== "toggle" && isOpen());
    if (opening && !el.hasAttribute("data-follow")) {
      el.style.removeProperty("top");
      el.style.removeProperty("left");
      el.style.removeProperty("width");
      el.style.removeProperty("height");
      pin();
    }
  };
  overlay.addEventListener("toggle", repin);
  const repinObserver = new MutationObserver((mutations) => {
    if (mutations.some((m) => m.attributeName === "open"))
      repin(new Event("open"));
  });
  repinObserver.observe(overlay, {
    attributes: true,
    attributeFilter: ["open"],
  });

  stampPlacedHint();
  pin();

  const dispose = () => {
    disposed = true;
    engineDispose?.();
    unpinCleanup();
    followObserver.disconnect();
    repinObserver.disconnect();
    overlay.removeEventListener("toggle", repin);
    overlay.removeAttribute("data-placed");
    el.remove();
  };
  onCleanup(dispose);

  return el;
}
