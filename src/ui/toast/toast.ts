/**
 * `elements-kit/ui/toast` — toasts on the overlay box model.
 *
 *   Toast        an overlay (your element, placed by an `OverlayBox`) with a lifetime
 *   Toaster      a stack of toasts in one area: order, pause, layout
 *   toast()      the page's default Toaster, made on first use
 *
 * You give the element: an overlay frame, its surface inside (an `.x-card`,
 * say). It becomes a `popover="manual"` `.x-overlay`, so it fades and scales
 * like any overlay. `release()` hands the overlay back, to become something
 * else. Needs the overlay's index.css + overlay.css.
 */

import { computed, effect, signal, untracked } from "@/signals/index.ts";
import type { Computed, Signal } from "@/signals/index.ts";
import { scope } from "@/signals/scope";
import { on } from "@/utilities/event-listener.ts";
import { createFocusWithin } from "@/utilities/focus-within.ts";
import { createTimeout } from "@/utilities/timeout.ts";
import { Align, place, type Area } from "../overlay/area.ts";
import { MarginBox, VIEWPORT_BOX } from "../overlay/box.ts";
import { rubber } from "../overlay/gestures.ts";
import { Motion } from "../overlay/motion.ts";
import { OverlayBox } from "../overlay/overlay.ts";

/** The toast's element, or a function that builds it. A function runs in the
 * toast's scope: its effects, timeouts and listeners end with the toast. */
export type ToastContent = Node | ((t: Toast) => Node);

let tabHidden: Signal<boolean> | undefined;

/** The tab is hidden: every toast's timer pauses. One listener for the page. */
function hidden(): boolean {
  if (!tabHidden) {
    const s = (tabHidden = signal(document.hidden));
    document.addEventListener("visibilitychange", () => s(document.hidden));
  }
  return tabHidden();
}

/** Where a toast stays interactive: the top modal dialog while one is open —
 * outside it the page is inert, toasts included — else the body. */
function interactiveRoot(): ParentNode {
  const modals = document.querySelectorAll<HTMLDialogElement>("dialog:modal");
  return modals[modals.length - 1] ?? document.body;
}

/** One toast: an overlay with a lifetime. Made by `Toaster.show` / `toast()`. */
export class Toast implements Disposable {
  /** The overlay: your element (`box.element`), placed by its stack. */
  readonly box: OverlayBox;
  /** ms before it goes, counted while its stack isn't held and the tab isn't
   * hidden. `Infinity` stays until dismissed. A change restarts the count. */
  readonly duration: Signal<number> = signal(4000);
  readonly #toaster: Toaster;
  /** Ends the content's scope (its effects, the element's bindings) and the box. */
  readonly #stopOwn: () => void;
  /** Ends the toast's life: timer and swipe. */
  readonly #stopLife: () => void;

  /** @internal */
  constructor(toaster: Toaster, content: ToastContent) {
    this.#toaster = toaster;
    let box!: OverlayBox;
    [, this.#stopOwn] = scope(() => {
      const el = typeof content === "function" ? content(this) : content;
      if (!(el instanceof HTMLElement)) throw new TypeError("toast content must be an HTMLElement");
      el.classList.add("x-overlay");
      el.popover = "manual";
      const parent = toaster.host(el);
      if (el.parentNode !== parent) parent.append(el);
      // With the content: they outlive `release()` and end together.
      box = new OverlayBox(el);
      // Shown inside a modal, it would vanish with it: back to the page, still showing.
      if (parent instanceof HTMLDialogElement)
        on(parent, "close", () => {
          if (!untracked(toaster.toasts).includes(this)) return;
          interactiveRoot().append(el);
          if (!el.matches(":popover-open")) el.showPopover();
        });
    });
    this.box = box;
    // Not shown yet: the stack lists it first, so it's placed on open.
    [, this.#stopLife] = scope(() => {
      this.#timer();
      this.#swipe();
    });
  }

  /** Plays the overlay exit, then removes the element. */
  dismiss(): void {
    this.#toaster.dismiss(this);
  }

  /**
   * Takes the overlay out of the toast: it leaves its stack and its timer and
   * swipe end. The box — still open, where it is, its content still live — is
   * yours to place, resize or close. End it with `t[Symbol.dispose]()`.
   */
  release(): OverlayBox {
    const toaster = this.#toaster;
    toaster.toasts(untracked(toaster.toasts).filter((t) => t !== this));
    this.#stopLife();
    const el = this.box.element;
    for (const p of ["scale", "opacity", "max-width", "transform-origin"]) el.style.removeProperty(p);
    el.inert = false;
    this.box.displacement.clear();
    return this.box;
  }

  /** Runs out `duration` while nothing holds it; a hold or a change starts it over. */
  #timer(): void {
    const timeout = createTimeout(() => this.dismiss(), () => untracked(this.duration), false);
    effect(() => {
      const ms = this.duration();
      if (!Number.isFinite(ms) || this.#toaster.held() || hidden()) {
        timeout.stop();
        return;
      }
      timeout.reset();
    });
  }

  /** Drag toward the near edge; released past a third, or flicked, it goes. */
  #swipe(): void {
    const el = this.box.element;
    const x = this.#toaster.area.xalign;
    const sign = x === Align.start ? -1 : x === Align.end ? 1 : 0; // 0: either way
    let motion: Motion | null = null;
    let x0 = 0;
    const release = (go: boolean) => {
      if (!motion) return;
      el.removeAttribute("data-no-transition");
      const dir = sign || Math.sign(motion.value);
      const far = motion.value * dir > el.offsetWidth / 3 || motion.velocity * dir > 0.5;
      motion = null;
      // Leaves sideways, the way it was thrown; else back in place.
      this.box.displacement.x = go && far ? dir * el.offsetWidth : 0;
      if (go && far) this.dismiss();
    };
    on(el, "pointerdown", (e) => {
      if (e.button !== 0) return;
      if ((e.target as Element).closest("button, a, input, select, textarea, [contenteditable]")) return;
      motion = new Motion(0);
      x0 = e.clientX;
      el.setPointerCapture(e.pointerId);
      el.setAttribute("data-no-transition", "");
    });
    on(el, "pointermove", (e) => {
      if (!motion) return;
      motion.value = e.clientX - x0;
      const w = el.offsetWidth;
      const shape = sign > 0 ? rubber(0, Infinity, w) : sign < 0 ? rubber(-Infinity, 0, w) : (v: number) => v;
      this.box.displacement.x = shape(motion.value);
    });
    on(el, "pointerup", () => release(true));
    on(el, "pointercancel", () => release(false));
  }

  /** Ends it now, no exit: its content's scope and box end, the element is removed. */
  [Symbol.dispose](): void {
    this.#stopLife();
    this.#stopOwn();
    this.box.element.remove();
  }
}

export interface ToasterOptions {
  /** Where the stack sits: its edges, and the corner as its aligns. `yalign`
   * start stacks down from the top, else up from the bottom.
   * Default: the visual viewport, 16px in, top-end — on a phone, the top. */
  area?: Area;
  /** Space between spread toasts, and each one's peek while collapsed. Default 8. */
  gap?: number;
  /** How many show; the rest are hidden, and still time out. Default 3. */
  max?: number;
  /** Start spread, not collapsed (see `Toaster.expanded`). */
  expand?: boolean;
  /** Where a toast's element goes, asked on each show — a shadow root, say,
   * where its styles are. Default: its parent, if you placed it; else the top
   * open modal dialog, else the body. */
  host?: (element: HTMLElement) => ParentNode;
}

/**
 * A stack of toasts in one area: collapsed while idle, spread while the
 * pointer or focus is on it. Timers pause meanwhile, and while the tab is hidden.
 *
 *   const panelToasts = new Toaster({
 *     area: new MarginBox(new ElementBox(panel), -12).toArea(Align.center, Align.start),
 *   });
 *   panelToasts.show(<div class="unset x-alert">Copied</div>);
 */
export class Toaster implements Disposable {
  readonly area: Area;
  readonly gap: number;
  readonly max: number;
  /** Where a toast's element goes, asked on each show. Assignable. Default:
   * its parent, if you placed it; else the top open modal, else the body. */
  host: (element: HTMLElement) => ParentNode;
  /** Newest first. Writable: reorder it and the toasts move. */
  readonly toasts = signal<Toast[]>([]);
  /** The pointer is over the stack (gaps included), or focus is in a toast:
   * timers pause and the stack spreads. */
  readonly held: Computed<boolean>;
  /** Keep the stack spread, held or not. Timers still run. */
  readonly expanded: Signal<boolean>;
  readonly #hovered = signal(false);
  /** Focus-within per toast, and how to stop tracking it. */
  readonly #focus = new WeakMap<Toast, [Computed<boolean>, () => void]>();
  /** Behind `max`: hidden, not hit-tested. */
  readonly #waiting = new WeakSet<Toast>();
  readonly #live: HTMLElement;
  readonly #stop: () => void;

  constructor(options: ToasterOptions = {}) {
    const {
      area = new MarginBox(VIEWPORT_BOX, -16).toArea(Align.end, Align.start),
      gap = 8,
      max = 3,
      expand = false,
      host = (element) => element.parentNode ?? interactiveRoot(),
    } = options;
    this.host = host;
    this.area = area;
    this.gap = gap;
    this.max = max;
    this.expanded = signal(expand);
    this.held = computed(() => this.#hovered() || this.toasts().some((t) => this.#focus.get(t)?.[0]()));
    this.#live = document.createElement("div");
    this.#live.setAttribute("aria-live", "polite");
    this.#live.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)";
    document.body.append(this.#live);
    [, this.#stop] = scope(() => {
      // Over the stack's bounds, not each toast: crossing a gap, or a toast
      // leaving from under the pointer, doesn't collapse it. A press (a swipe)
      // keeps it as it is until release. Touch has no hover: a tap on the stack
      // holds it, a tap elsewhere lets go — so the leave each lifted finger
      // fires doesn't count.
      on(document, "pointermove", (e) => {
        if (!e.buttons) this.#hovered(this.#over(e.clientX, e.clientY));
      });
      on(document, "pointerup", (e) => this.#hovered(this.#over(e.clientX, e.clientY)));
      on(document.documentElement, "pointerleave", (e) => {
        if (e.pointerType !== "touch") this.#hovered(false);
      });
      effect(() => {
        const list = this.toasts();
        const spread = this.held() || this.expanded();
        list.forEach((t, i) => this.#layout(t, i, list, spread));
      });
      // A toast out of the list, however it left: stop tracking its focus.
      let before: readonly Toast[] = [];
      effect(() => {
        const list = this.toasts();
        for (const t of before) {
          if (list.includes(t)) continue;
          this.#focus.get(t)?.[1]();
          this.#focus.delete(t);
        }
        before = list;
      });
    });
  }

  /** Show `content` on top of the stack. */
  show(content: ToastContent): Toast {
    const t = new Toast(this, content);
    const el = t.box.element;
    this.#focus.set(t, untracked(() => scope(() => createFocusWithin(el))));
    this.toasts([t, ...untracked(this.toasts)]);
    // Listed first: `beforetoggle` opens its box and the layout effect places
    // it before showPopover's style pass, so it enters from its spot.
    el.showPopover();
    // Next to the toast: outside an open modal, the region is inert and silent.
    el.parentNode!.append(this.#live);
    this.#live.textContent = el.textContent ?? "";
    return t;
  }

  /** Dismiss one toast, or every toast: the overlay's exit plays, then it's removed. */
  dismiss(toast?: Toast): void {
    const list = untracked(this.toasts);
    const gone = toast ? list.filter((t) => t === toast) : list;
    if (gone.length === 0) return;
    this.toasts(list.filter((t) => !gone.includes(t)));
    for (const t of gone) {
      const el = t.box.element;
      el.hidePopover();
      Promise.allSettled(el.getAnimations().map((a) => a.finished)).then(() => t[Symbol.dispose]());
    }
  }

  /** Whether (x, y) is inside the shown toasts' bounds. */
  #over(x: number, y: number): boolean {
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const toast of untracked(this.toasts)) {
      if (this.#waiting.has(toast)) continue;
      const rc = toast.box.element.getBoundingClientRect();
      l = Math.min(l, rc.left);
      t = Math.min(t, rc.top);
      r = Math.max(r, rc.right);
      b = Math.max(b, rc.bottom);
    }
    return x >= l && x <= r && y >= t && y <= b;
  }

  /** Where toast `index` sits. Collapsed, the ones behind show `gap` past the
   * front one, scaled down; spread, they stack by their heights. */
  #layout(toast: Toast, index: number, list: readonly Toast[], spread: boolean): void {
    const { gap, max, area } = this;
    const { box } = toast;
    const end = area.yalign !== Align.start;
    const edge = (end ? area.ymax : area.ymin) ?? 0;
    const dir = end ? -1 : 1; // toward the stack's far end
    const scale = spread ? 1 : 1 - index * 0.05;
    let at: number;
    if (index === 0) {
      at = edge;
    } else if (spread) {
      let offset = 0;
      for (let i = 0; i < index; i++) offset += list[i]!.box.h + gap;
      at = edge + dir * offset;
    } else {
      // Its far edge `gap` past the front's; the near edge no further out than the front.
      const far = edge + dir * (list[0]!.box.h + index * gap);
      at = far - dir * box.h * scale;
      at = end ? Math.min(edge, at) : Math.max(edge, at);
    }
    // Anchored at the corner, unmeasured: its size isn't known before it opens.
    place(box, {
      ...area,
      ymin: end ? undefined : at,
      ymax: end ? at : undefined,
      yalign: end ? Align.end : Align.start,
    });
    const el = box.element;
    // No wider than the area: its own width is a preference, the area a limit.
    const room = (area.xmax ?? Infinity) - (area.xmin ?? -Infinity);
    el.style.maxWidth = Number.isFinite(room) ? `${Math.max(0, room)}px` : "";
    // Scale around its middle, toward the stack's edge (place set the corner).
    el.style.transformOrigin = `50% ${end ? "100%" : "0%"}`;
    el.style.scale = scale === 1 ? "" : String(scale);
    const waiting = index >= max;
    if (waiting) this.#waiting.add(toast);
    else this.#waiting.delete(toast);
    el.inert = waiting;
    el.style.opacity = waiting ? "0" : "";
  }

  [Symbol.dispose](): void {
    for (const t of untracked(this.toasts)) t[Symbol.dispose]();
    this.toasts([]);
    this.#stop();
    this.#live.remove();
  }
}

let page: Toaster | undefined;

/** The page's default Toaster: top-end of the viewport, made on first use. */
function toaster(): Toaster {
  return (page ??= new Toaster());
}

/**
 * Show a toast on the page's default Toaster.
 *
 *   toast((t) => (
 *     <div class="unset x-alert">Saved
 *       <div class="x-alert-trailing"><button on:click={() => t.dismiss()}>×</button></div>
 *     </div>
 *   ));
 */
export function toast(content: ToastContent): Toast {
  return toaster().show(content);
}
/** Dismiss every toast on the page's default Toaster. */
toast.dismiss = (): void => toaster().dismiss();
