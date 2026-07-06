import { effect, onCleanup } from "@/signals/index.ts";
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
 *   an immediate reposition. The initial positioning write is instant;
 *   geometry transitions re-enable after it (Base UI's `data-instant`
 *   semantics), so re-pins and live area changes morph by the
 *   stylesheet. During an anchor drag, writes suppress geometry
 *   transitions again — the overlay must not ease behind the finger.
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

/** Measure whether the chain rule actually lands on the anchor's VISUAL
 * box — `CSS.supports` is a parser check, and Firefox 151 passes it
 * while resolving `anchor()` against the pre-transform layout box (a
 * `translate`d trigger pins half a box off). The probe host is
 * deliberately translated to catch exactly that. Inconclusive without a
 * layout engine (tests) — then trust the declared support. */
let chainMeasured: boolean | undefined;
function probeChain(): boolean {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;top:80px;left:60px;width:40px;height:20px;" +
    "translate:10px 5px;" + // visual box at (70, 85)
    "visibility:hidden;pointer-events:none;anchor-name:--ek-chain-probe";
  const pin = document.createElement("div");
  pin.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;" +
    "position-anchor:--ek-chain-probe;top:anchor(top);left:anchor(left);" +
    "width:anchor-size(width);height:anchor-size(height)";
  document.body.append(host, pin);
  const hostRect = host.getBoundingClientRect();
  const rect = pin.getBoundingClientRect();
  host.remove();
  pin.remove();
  if (Math.abs(hostRect.top - 85) > 1) return true; // no layout engine
  return (
    Math.abs(rect.top - 85) < 1 &&
    Math.abs(rect.left - 70) < 1 &&
    Math.abs(rect.width - 40) < 1
  );
}

/** The follow pin needs more than the placement gate — the chain rule
 * mirrors the followed box with `anchor()`/`anchor-size()`. A browser
 * that places but can't chain falls back to the JS rect copy. */
const chainSupport = (): boolean => {
  if (
    !nativeAnchorSupport() ||
    !CSS.supports("top: anchor(top)") ||
    !CSS.supports("width: anchor-size(width)")
  ) {
    return false;
  }
  chainMeasured ??= probeChain();
  return chainMeasured;
};

/** While the Floating UI loop tracks, geometry writes must land
 * instantly — but ONLY geometry. Enter/exit (opacity, scale) and
 * close (display) keep transitioning, so `@starting-style` still plays. */
const TRACKING_TRANSITIONS = "opacity, scale, display";

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
 * `follow` may be a getter reading a signal — re-pinning on change is
 * how a shared popover slides between nav triggers: the native chain
 * glides there on the anchor element's CSS transition; the channel
 * engine lets that one write animate.
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
 *
 * // shared nav popover — re-anchors (and glides) when the signal changes
 * const active = signal(firstTrigger);
 * anchor(menu, () => active(), { arrow: true });
 * ```
 */
export function anchor(
  overlay: HTMLElement,
  follow?: Element | RectInit | (() => Element | RectInit | null | undefined),
  opts: AnchorOptions = {},
): HTMLElement {
  const native = nativeAnchorSupport() && !opts.within && !opts.arrow;
  let disposed = false;

  const resolveFollow = (): Element | RectInit | undefined =>
    (typeof follow === "function" ? follow() : follow) ?? undefined;

  // --- the anchor element ---------------------------------------------
  const el = document.createElement("span");
  el.className = "x-overlay-anchor";
  el.setAttribute("aria-hidden", "true");
  // Under the CHANNEL engine the proxy is a measured reference — its
  // CSS glide transition must not ease JS writes, or the overlay
  // positions against a mid-flight rect (the channel morph provides the
  // glide there). Under the native engine the overlay follows the proxy
  // continuously, so the transition stays and IS the glide — even when
  // the follow is a JS rect copy (chain probe failed, e.g. Firefox).
  if (!native) el.style.transitionProperty = "none";
  document.body.append(el);

  const proxyName = `--overlay-anchor-${anchorNames++}`;
  const followName = `--overlay-follow-${anchorNames++}`;

  const placeAtRect = (rect: RectInit) => {
    el.style.top = `${rect.top}px`;
    el.style.left = `${rect.left}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${rect.height}px`;
  };

  /** Pin the anchor element to a follow target (the `data-follow`
   * contract — `draggable()` tears it on the first pointer-down).
   * Re-pinning to another element keeps the SAME `position-anchor` name,
   * so under the native chain the proxy's `anchor()` insets resolve to
   * the new box and its CSS transition GLIDES there — the nav slide. */
  let pinnedEl: HTMLElement | undefined;
  let hasPinned = false;
  let stopFollowSync: (() => void) | undefined;
  const releasePinMachinery = () => {
    stopFollowSync?.();
    stopFollowSync = undefined;
    pinnedEl?.style.removeProperty("anchor-name");
    pinnedEl = undefined;
  };
  const pin = (target: Element | RectInit | undefined) => {
    // FLIP handoff for a re-pin under the chain: freeze the current rect
    // inline BEFORE touching the names (same pixels — no motion), so the
    // release below transitions px → anchor() px on the same properties.
    // Anchor-reference changes alone don't reliably interpolate.
    const repositioning = hasPinned;
    const flip = repositioning && target instanceof Element && chainSupport();
    if (flip) placeAtRect(el.getBoundingClientRect());
    releasePinMachinery();
    if (!target) {
      // Unfollowed anchor — start at the viewport center.
      el.style.top = "50vh";
      el.style.left = "50vw";
      return;
    }
    hasPinned = true;
    if (!(target instanceof Element)) {
      el.removeAttribute("data-follow"); // a rect pin is one-shot
      placeAtRect(target);
      return;
    }
    el.setAttribute("data-follow", "");
    if (chainSupport()) {
      // Native chain — index.css [data-follow] mirrors the followed box.
      (target as HTMLElement).style?.setProperty("anchor-name", followName);
      pinnedEl = target as HTMLElement;
      el.style.setProperty("position-anchor", followName);
      // Commit the frozen state before releasing it, then clear the
      // inline geometry — the chain rule takes over and the proxy's CSS
      // transition glides there (the overlay follows natively).
      if (flip) void el.offsetTop;
      el.style.removeProperty("top");
      el.style.removeProperty("left");
      el.style.removeProperty("width");
      el.style.removeProperty("height");
    } else {
      // JS rect copy. The very first placement must not animate (the
      // proxy would glide in from wherever it was created) — but a
      // RE-pin glides from its valid position; later copies ride the
      // proxy's transition under the native engine — that's the glide.
      let first = !repositioning;
      const sync = () => {
        if (first) {
          first = false;
          const prev = el.style.transitionProperty;
          el.style.transitionProperty = "none";
          placeAtRect(target.getBoundingClientRect());
          void el.offsetTop;
          if (prev) el.style.transitionProperty = prev;
          else el.style.removeProperty("transition-property");
          return;
        }
        placeAtRect(target.getBoundingClientRect());
      };
      stopFollowSync = autoUpdate(target, el, sync);
    }
  };
  const unpinCleanup = () => releasePinMachinery();
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
  /** Channel engine only: reposition against a re-pinned target, letting
   * that one write animate (the morph to the new anchor). */
  let onRepoint: (() => void) | undefined;

  if (native) {
    // data-anchor selects the native scheme (index.css) — stamped only
    // here, statically; the Floating UI engine renders through the
    // centered scheme's channels and must NOT activate the native block.
    overlay.setAttribute("data-anchor", "element");
    el.style.setProperty("anchor-name", proxyName);
    overlay.style.setProperty("position-anchor", proxyName);
    engineDispose = () => {
      // Leave the overlay where it was: seed the location channels from
      // the rendered rect (inert while the native block still applies,
      // pixel-identical when the attribute drops) — releasing a binding
      // must not snap the box to the centered default.
      const rect = overlay.getBoundingClientRect();
      if (isOpen() && rect.width > 0) {
        const c = resolveConstraint(overlay);
        overlay.style.setProperty(
          "--overlay-x",
          `${rect.left + rect.width / 2 - c.left}px`,
        );
        overlay.style.setProperty(
          "--overlay-y",
          `${rect.top + rect.height / 2 - c.top}px`,
        );
      }
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
      const constraint = resolveConstraint(overlay);
      // The channels hold the box CENTER relative to the constraint
      // origin (index.css LOCATION) — convert the viewport top-left.
      // Layout size, NOT getBoundingClientRect: the enter animation has
      // the box at scale(0.97) and a scaled measurement skews the write.
      overlay.style.setProperty(
        "--overlay-x",
        `${x + overlay.offsetWidth / 2 - constraint.left}px`,
      );
      overlay.style.setProperty(
        "--overlay-y",
        `${y + overlay.offsetHeight / 2 - constraint.top}px`,
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
    // Bound while already visible → the arrival write should morph, not
    // snap (a later fresh open still positions instantly).
    let morphIn = isOpen();
    const suppress = () =>
      overlay.style.setProperty("transition-property", TRACKING_TRANSITIONS);
    const release = () =>
      overlay.style.removeProperty("transition-property");
    const startLoop = () => {
      if (stop) return;
      // Base UI semantics: the INITIAL positioning write is instant
      // (their `data-instant`); geometry transitions re-enable after it,
      // so every later reposition — a re-pinned follow, a live area
      // change — morphs by the stylesheet. Enter/exit (opacity, scale,
      // display) stay live throughout. Exception: an overlay VISIBLE at
      // bind time (a recipe switch re-anchoring it) morphs to the anchor
      // instead of snapping — seeding the rendered position first when
      // no channels exist yet, so the morph has a starting point.
      const instant = !morphIn;
      morphIn = false;
      if (instant) suppress();
      else if (!overlay.style.getPropertyValue("--overlay-x")) {
        const rect = overlay.getBoundingClientRect();
        const c = resolveConstraint(overlay);
        overlay.style.setProperty(
          "--overlay-x",
          `${rect.left + rect.width / 2 - c.left}px`,
        );
        overlay.style.setProperty(
          "--overlay-y",
          `${rect.top + rect.height / 2 - c.top}px`,
        );
      }
      let pending = instant;
      stop = autoUpdate(el, overlay, () =>
        update().then(() => {
          if (pending && !disposed) {
            pending = false;
            release();
          }
        }),
      );
    };
    haltLoop = () => {
      stop?.();
      stop = undefined;
      release();
    };
    onRepoint = () => {
      if (stop) void update(); // transitions are on — the write morphs
    };

    const sync = () => {
      if (disposed) return;
      if (isOpen()) startLoop();
      else haltLoop?.();
    };
    // While the anchor is being dragged the overlay must track the
    // pointer instantly — eased geometry would lag behind the finger.
    const onDragMove = () => {
      suppress();
      void update();
    };
    const onDragEnd = () => {
      if (disposed || !stop) return;
      release();
      // Settle: the drag service may have snapped the anchor to a rest
      // point — reposition with transitions live so the overlay morphs
      // there (autoUpdate alone observes anchor movement too coarsely).
      void update();
    };

    overlay.addEventListener("toggle", sync);
    overlay.addEventListener("close", sync);
    el.addEventListener("dragmove", onDragMove);
    el.addEventListener("dragend", onDragEnd);
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
      el.removeEventListener("dragend", onDragEnd);
      // --overlay-x/-y stay — releasing a binding leaves the overlay
      // where it was (the binding model's own rule).
      overlay.style.removeProperty("--overlay-arrow-x");
      overlay.style.removeProperty("--overlay-arrow-y");
      if (typeof opts.arrow === "number")
        overlay.style.removeProperty("--overlay-arrow-size");
      if (arrowOwned) arrowEl?.remove();
    };
  }

  // A fresh open re-pins a torn-off anchor to its followed element.
  const repin = (event: Event) => {
    if (disposed) return;
    const target = resolveFollow();
    if (!target) return;
    const opening =
      (event as { newState?: string }).newState === "open" ||
      (event.type !== "toggle" && isOpen());
    if (opening && !el.hasAttribute("data-follow")) {
      el.style.removeProperty("top");
      el.style.removeProperty("left");
      el.style.removeProperty("width");
      el.style.removeProperty("height");
      pin(target);
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
  let stopFollowEffect: (() => void) | undefined;
  if (typeof follow === "function") {
    // Reactive follow — a signal-driven getter re-pins on change; the
    // native chain glides there, the channel engine morphs one write.
    let first = true;
    stopFollowEffect = effect(() => {
      pin(resolveFollow());
      if (!first) onRepoint?.();
      first = false;
    });
  } else {
    pin(resolveFollow());
  }

  const dispose = () => {
    disposed = true;
    stopFollowEffect?.();
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
