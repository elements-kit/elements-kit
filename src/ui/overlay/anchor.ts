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
  Box,
  type BoxLike,
  isReactiveBox,
  type PlainBox,
  readValue,
} from "./box.ts";
import {
  INSTANT_TRANSITIONS,
  resolveConstraint,
  resolveVarPx,
} from "./constraint.ts";

/**
 * The anchor — a tracked box the overlay attaches to; one of the
 * spatial classes (with the constraint and the overlay itself).
 * `new Anchor(target)` creates an anchor ELEMENT that tracks `target` —
 * an element, a box (a dot when `w`/`h` are omitted; reactive fields
 * re-place it), or a getter re-pinning on signal change — until
 * something moves it: an edit (`set()` tears the pin, like a drag) or
 * the markup drag routed by the bound overlay. The overlay itself has
 * no states — dragging, tearing off, re-pinning all happen here.
 *
 * The anchor is overlay-independent; `bind(overlay)` (internal, called
 * by the `Overlay` constructor for its `anchor` option) wires the
 * following engine. Two engines, chosen once at bind time:
 *
 * - Native CSS anchor positioning (compound gate, no `arrow`, no
 *   explicit constraint): the overlay's `position-anchor` points at the
 *   anchor element; an element target pins through a second native hop
 *   (`[data-follow]` rule in index.css mirrors the followed box via
 *   `anchor()`/`anchor-size()`). Placement, flip and scroll tracking
 *   are compositor-side through both hops — zero JS.
 * - Floating UI (below the gate, or `arrow`/constraint requested —
 *   native CSS has no boundary control and no flip signal):
 *   `autoUpdate` writes the box center into the `--overlay-x`/`-y`
 *   channels while the overlay is open; edits reposition immediately.
 *   The initial positioning write is instant; geometry transitions
 *   re-enable after it (Base UI's `data-instant` semantics), so re-pins
 *   and live area changes morph by the stylesheet. During an edit,
 *   writes suppress geometry transitions again — the overlay must not
 *   ease behind the finger.
 *
 * `data-anchor="element"` is a static wiring marker (stamped at bind,
 * removed on unbind, never toggled). `data-placed` is output state —
 * the settled side, feeding the arrow and `transform-origin`. Removing
 * `data-follow` is the tear contract; a fresh open re-pins.
 */

export interface AnchorOptions {
  /** Caret pointing at the anchor (`.x-overlay-arrow`, injected when not
   * authored; a number sets `--overlay-arrow-size` in px). Forces the
   * Floating UI engine. */
  arrow?: number | boolean;
}

/** What an anchor can track. */
export type AnchorTarget =
  | Element
  | BoxLike
  | (() => Element | BoxLike | null | undefined);

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

const resolveBox = (box: BoxLike): Required<PlainBox> => ({
  x: readValue(box.x),
  y: readValue(box.y),
  w: readValue(box.w),
  h: readValue(box.h),
});

const rectBox = (r: DOMRect): Required<PlainBox> => ({
  x: r.left,
  y: r.top,
  w: r.width,
  h: r.height,
});

/**
 * A tracked box the overlay follows for life. Editable like every Box:
 * a programmatic `set()` (or an edit driven by any handle) tears the
 * follow pin — same contract as a drag — and glides/morphs the overlay
 * there; reopening re-pins to the target.
 *
 * Registers all cleanup with the current scope (`onCleanup`): the
 * anchor element, the wiring, and the stamped attributes go together.
 *
 * @example
 * ```ts
 * import { Anchor, Overlay } from "elements-kit/ui/overlay";
 *
 * new Overlay(menu, { anchor: new Anchor(trigger) });          // popover
 * new Overlay(menu, { anchor: new Anchor({ x: e.clientX, y: e.clientY }) }); // context menu
 *
 * // shared nav popover — re-anchors (and glides) when the signal changes
 * const active = signal(firstTrigger);
 * new Overlay(menu, { anchor: new Anchor(() => active(), { arrow: true }) });
 * ```
 */
export class Anchor extends Box {
  readonly #el: HTMLElement;
  readonly #target: AnchorTarget | undefined;
  readonly #arrow: number | boolean | undefined;
  readonly #proxyName = `--overlay-anchor-${anchorNames++}`;
  readonly #followName = `--overlay-follow-${anchorNames++}`;
  readonly #followObserver: MutationObserver;
  #stopTargetEffect: (() => void) | undefined;
  #pinnedEl: HTMLElement | undefined;
  #hasPinned = false;
  #stopFollowSync: (() => void) | undefined;
  #unbind: (() => void) | undefined;
  /** Channel engine only: reposition with transitions live (morph). */
  #onRepoint: (() => void) | undefined;
  #editing = false;
  #editTransition = "";
  #disposed = false;

  constructor(target?: AnchorTarget, opts: AnchorOptions = {}) {
    super();
    this.#target = target;
    this.#arrow = opts.arrow;

    const el = document.createElement("span");
    el.className = "x-overlay-anchor";
    el.setAttribute("aria-hidden", "true");
    document.body.append(el);
    this.#el = el;

    // An edit (or drag) removes [data-follow] when it takes over —
    // release the pinning machinery (the chain is inert without the
    // attribute, but the below-gate sync loop must stop).
    this.#followObserver = new MutationObserver(() => {
      if (!el.hasAttribute("data-follow")) this.#releasePin();
    });
    this.#followObserver.observe(el, {
      attributes: true,
      attributeFilter: ["data-follow"],
    });

    if (typeof target === "function") {
      // Reactive target — a signal-driven getter re-pins on change; the
      // native chain glides there, the channel engine morphs one write.
      let first = true;
      this.#stopTargetEffect = effect(() => {
        this.#pin(this.#resolveTarget());
        if (!first) this.#onRepoint?.();
        first = false;
      });
    } else {
      this.#pin(this.#resolveTarget());
    }

    onCleanup(() => this.dispose());
  }

  #resolveTarget(): Element | BoxLike | undefined {
    const t = this.#target;
    return (typeof t === "function" ? t() : t) ?? undefined;
  }

  #placeAtRect(box: Required<PlainBox>): void {
    const el = this.#el;
    el.style.top = `${box.y}px`;
    el.style.left = `${box.x}px`;
    el.style.width = `${box.w}px`;
    el.style.height = `${box.h}px`;
  }

  #releasePin(): void {
    this.#stopFollowSync?.();
    this.#stopFollowSync = undefined;
    this.#pinnedEl?.style.removeProperty("anchor-name");
    this.#pinnedEl = undefined;
  }

  /** Pin the anchor element to a target (the `data-follow` contract —
   * an edit tears it). Re-pinning to another element keeps the SAME
   * `position-anchor` name, so under the native chain the proxy's
   * `anchor()` insets resolve to the new box and its CSS transition
   * GLIDES there — the nav slide. */
  #pin(to: Element | BoxLike | undefined): void {
    const el = this.#el;
    // FLIP handoff for a re-pin under the chain: freeze the current rect
    // inline BEFORE touching the names (same pixels — no motion), so the
    // release below transitions px → anchor() px on the same properties.
    // Anchor-reference changes alone don't reliably interpolate.
    const repositioning = this.#hasPinned;
    const flipHandoff =
      repositioning && to instanceof Element && chainSupport();
    if (flipHandoff) this.#placeAtRect(rectBox(el.getBoundingClientRect()));
    this.#releasePin();
    if (!to) {
      // Untargeted anchor — start at the viewport center.
      el.style.top = "50vh";
      el.style.left = "50vw";
      return;
    }
    this.#hasPinned = true;
    if (!(to instanceof Element)) {
      if (isReactiveBox(to)) {
        // Reactive box — signal-driven fields re-place the anchor while
        // the pin holds; tearing it (an edit) stops the effect through
        // the data-follow observer, like an element pin.
        el.setAttribute("data-follow", "");
        let first = true;
        this.#stopFollowSync = effect(() => {
          this.#placeAtRect(resolveBox(to));
          if (!first) this.#onRepoint?.();
          first = false;
        });
      } else {
        el.removeAttribute("data-follow"); // a static box pin is one-shot
        this.#placeAtRect(resolveBox(to));
      }
      return;
    }
    el.setAttribute("data-follow", "");
    if (chainSupport()) {
      // Native chain — index.css [data-follow] mirrors the followed box.
      (to as HTMLElement).style?.setProperty("anchor-name", this.#followName);
      this.#pinnedEl = to as HTMLElement;
      el.style.setProperty("position-anchor", this.#followName);
      // Commit the frozen state before releasing it, then clear the
      // inline geometry — the chain rule takes over and the proxy's CSS
      // transition glides there (the overlay follows natively).
      if (flipHandoff) void el.offsetTop;
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
          this.#placeAtRect(rectBox(to.getBoundingClientRect()));
          void el.offsetTop;
          if (prev) el.style.transitionProperty = prev;
          else el.style.removeProperty("transition-property");
          return;
        }
        this.#placeAtRect(rectBox(to.getBoundingClientRect()));
      };
      this.#stopFollowSync = autoUpdate(to, el, sync);
    }
  }

  // --- Box plumbing -----------------------------------------------------

  protected read(): Required<PlainBox> {
    const r = this.#el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  /** Tear + place: freezing the current box first (inline wins over the
   * pin rule — no jump) is the same contract as a drag's first
   * pointer-down. Outside an edit the write glides (native engine) or
   * morphs (channel engine, via the repoint); inside an edit it tracks
   * the finger instantly. */
  protected write(box: Partial<PlainBox>): void {
    const el = this.#el;
    if (el.hasAttribute("data-follow")) {
      this.#placeAtRect(rectBox(el.getBoundingClientRect()));
      el.removeAttribute("data-follow");
      el.style.removeProperty("position-anchor");
      // Synchronously — the MutationObserver tear fires a microtask
      // later, and a reactive pin must not re-place mid-edit.
      this.#releasePin();
      if (!this.#editing) void el.offsetTop; // commit the freeze → the write below glides
    }
    if (box.x !== undefined) el.style.left = `${box.x}px`;
    if (box.y !== undefined) el.style.top = `${box.y}px`;
    if (box.w !== undefined) el.style.width = `${box.w}px`;
    if (box.h !== undefined) el.style.height = `${box.h}px`;
    if (this.#editing) {
      el.dispatchEvent(
        new CustomEvent("dragmove", {
          detail: { x: this.x(), y: this.y() },
          bubbles: true,
        }),
      );
    } else {
      this.#onRepoint?.();
    }
  }

  protected override editStart(): void {
    this.#editing = true;
    // The proxy must not ease behind the finger — its own transition off
    // for the duration of the edit (the native glide resumes after).
    this.#editTransition = this.#el.style.transitionProperty;
    this.#el.style.transitionProperty = "none";
  }

  protected override editEnd(): void {
    this.#editing = false;
    this.#el.style.transitionProperty = this.#editTransition;
    this.#el.dispatchEvent(
      new CustomEvent("dragend", { detail: {}, bubbles: true }),
    );
  }

  // --- the following engine (bind) ---------------------------------------

  /**
   * Wires `overlay` to follow this anchor — engine selection, open/close
   * loop control, re-pin on open. Called by the `Overlay` constructor
   * (its `anchor` option); one bind at a time. Returns the unbinder.
   * `confined` — the overlay has an explicit `within`: forces the
   * boundary-aware engine (native CSS has no boundary control).
   * @internal
   */
  bind(overlay: HTMLElement, confined = false): () => void {
    if (this.#unbind) throw new Error("Anchor is already bound");
    const el = this.#el;
    const native = nativeAnchorSupport() && !this.#arrow && !confined;
    // Under the CHANNEL engine the proxy is a measured reference — its
    // CSS glide transition must not ease JS writes, or the overlay
    // positions against a mid-flight rect (the channel morph provides
    // the glide there). Under the native engine the overlay follows the
    // proxy continuously, so the transition stays and IS the glide.
    if (!native) el.style.transitionProperty = "none";

    const isOpen = (): boolean => {
      if (overlay.hasAttribute("open")) return true;
      try {
        return overlay.matches(":popover-open");
      } catch {
        return false;
      }
    };

    /** Seed the location channels from the rendered rect — the starting
     * point for a morph, or the resting place when a binding releases. */
    const seed = () => {
      const rect = overlay.getBoundingClientRect();
      if (rect.width === 0) return;
      const c = resolveConstraint(overlay);
      overlay.style.setProperty(
        "--overlay-x",
        `${rect.left + rect.width / 2 - c.x}px`,
      );
      overlay.style.setProperty(
        "--overlay-y",
        `${rect.top + rect.height / 2 - c.y}px`,
      );
    };

    const stampPlacedHint = () => {
      const style = getComputedStyle(overlay);
      const hint = areaToPlacement(
        style.getPropertyValue("--overlay-area"),
        style.direction === "rtl",
      );
      overlay.setAttribute("data-placed", hint.split("-")[0]);
    };

    let engineDispose: (() => void) | undefined;

    if (native) {
      // data-anchor selects the native scheme (index.css) — stamped only
      // here, statically; the Floating UI engine renders through the
      // centered scheme's channels and must NOT activate the native block.
      overlay.setAttribute("data-anchor", "element");
      el.style.setProperty("anchor-name", this.#proxyName);
      overlay.style.setProperty("position-anchor", this.#proxyName);
      engineDispose = () => {
        // Leave the overlay where it was: seed the location channels from
        // the rendered rect (inert while the native block still applies,
        // pixel-identical when the attribute drops) — releasing a binding
        // must not snap the box to the centered default.
        if (isOpen()) seed();
        overlay.style.removeProperty("position-anchor");
        overlay.removeAttribute("data-anchor");
        el.style.removeProperty("anchor-name");
      };
    } else {
      // Floating UI engine — reference is the anchor element itself.
      let arrowEl: HTMLElement | null = null;
      let arrowOwned = false;
      if (this.#arrow) {
        arrowEl = overlay.querySelector(":scope > .x-overlay-arrow");
        if (!arrowEl) {
          arrowEl = document.createElement("span");
          arrowEl.className = "x-overlay-arrow";
          arrowEl.setAttribute("aria-hidden", "true");
          overlay.append(arrowEl);
          arrowOwned = true;
        }
        if (typeof this.#arrow === "number")
          overlay.style.setProperty(
            "--overlay-arrow-size",
            `${this.#arrow}px`,
          );
      }

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
        // Flip/shift inside the overlay's constraint (the viewport when
        // unconfined — the channels' defaults).
        const c = resolveConstraint(overlay);
        const boundary = { x: c.x, y: c.y, width: c.w, height: c.h };
        const middleware = [
          offset(gapPx),
          flip({ boundary }),
          shift({ boundary }),
        ];
        if (arrowEl) middleware.push(floatingArrow({ element: arrowEl }));
        const { x, y, placement, middlewareData } = await computePosition(
          el,
          overlay,
          { strategy: "fixed", placement: placementHint, middleware },
        );
        if (this.#disposed) return;
        // The channels hold the box CENTER relative to the constraint
        // origin (index.css LOCATION) — convert the viewport top-left.
        // Layout size, NOT getBoundingClientRect: the enter animation has
        // the box at scale(0.97) and a scaled measurement skews the write.
        overlay.style.setProperty(
          "--overlay-x",
          `${x + overlay.offsetWidth / 2 - c.x}px`,
        );
        overlay.style.setProperty(
          "--overlay-y",
          `${y + overlay.offsetHeight / 2 - c.y}px`,
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
        overlay.style.setProperty(
          "transition-property",
          INSTANT_TRANSITIONS,
        );
      const release = () =>
        overlay.style.removeProperty("transition-property");
      const startLoop = () => {
        if (stop) return;
        // Base UI semantics: the INITIAL positioning write is instant
        // (their `data-instant`); geometry transitions re-enable after it,
        // so every later reposition — a re-pinned target, a live area
        // change — morphs by the stylesheet. Enter/exit (opacity, scale,
        // display) stay live throughout. Exception: an overlay VISIBLE at
        // bind time (a recipe switch re-anchoring it) morphs to the anchor
        // instead of snapping — seeding the rendered position first when
        // no channels exist yet, so the morph has a starting point.
        const instant = !morphIn;
        morphIn = false;
        if (instant) suppress();
        else if (!overlay.style.getPropertyValue("--overlay-x")) seed();
        let pending = instant;
        stop = autoUpdate(el, overlay, () =>
          update().then(() => {
            if (pending && !this.#disposed) {
              pending = false;
              release();
            }
          }),
        );
      };
      const haltLoop = () => {
        stop?.();
        stop = undefined;
        release();
      };
      this.#onRepoint = () => {
        if (stop) void update(); // transitions are on — the write morphs
      };

      const sync = () => {
        if (this.#disposed) return;
        if (isOpen()) startLoop();
        else haltLoop();
      };
      // While the anchor is being edited the overlay must track the
      // pointer instantly — eased geometry would lag behind the finger.
      const onDragMove = () => {
        suppress();
        void update();
      };
      const onDragEnd = () => {
        if (this.#disposed || !stop) return;
        release();
        // Settle: the edit may have rested the anchor — reposition with
        // transitions live so the overlay morphs there (autoUpdate alone
        // observes anchor movement too coarsely).
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
        haltLoop();
        this.#onRepoint = undefined;
        openObserver.disconnect();
        overlay.removeEventListener("toggle", sync);
        overlay.removeEventListener("close", sync);
        el.removeEventListener("dragmove", onDragMove);
        el.removeEventListener("dragend", onDragEnd);
        // --overlay-x/-y stay — releasing a binding leaves the overlay
        // where it was (the binding model's own rule).
        overlay.style.removeProperty("--overlay-arrow-x");
        overlay.style.removeProperty("--overlay-arrow-y");
        if (typeof this.#arrow === "number")
          overlay.style.removeProperty("--overlay-arrow-size");
        if (arrowOwned) arrowEl?.remove();
      };
    }

    // A fresh open re-pins a torn-off anchor to its target.
    const repin = (event: Event) => {
      if (this.#disposed) return;
      const to = this.#resolveTarget();
      if (!to) return;
      const opening =
        (event as { newState?: string }).newState === "open" ||
        (event.type !== "toggle" && isOpen());
      if (opening && !el.hasAttribute("data-follow")) {
        el.style.removeProperty("top");
        el.style.removeProperty("left");
        el.style.removeProperty("width");
        el.style.removeProperty("height");
        this.#pin(to);
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

    const unbind = () => {
      this.#unbind = undefined;
      engineDispose?.();
      repinObserver.disconnect();
      overlay.removeEventListener("toggle", repin);
      overlay.removeAttribute("data-placed");
    };
    this.#unbind = unbind;
    return unbind;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#stopTargetEffect?.();
    this.#unbind?.();
    this.#releasePin();
    this.#followObserver.disconnect();
    this.#el.remove();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}
