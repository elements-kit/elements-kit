import type { MaybeReactive } from "@/signals/index.ts";
import { Session } from "./session.ts";

/** The default edit physics — stateless, shared across all edits. */
const FREE = new Session();

/**
 * The spatial vocabulary and the edit lifecycle — the root of the
 * overlay hierarchy (`Editable` → `Box` → `Overlay` / `Anchor` /
 * `Constraint`).
 *
 * Every box is viewport coordinates of its top-left corner; omitted
 * `w`/`h` mean a zero-size box (a dot — context menu, cursor). Inputs
 * are STRUCTURAL: any object with these fields works — reactive literals
 * (`{ x: () => mx(), y: () => my() }`) and class instances alike, so an
 * `Overlay` can be another overlay's anchor target or constraint source.
 *
 * An edit is a drag's logic without its plumbing: `begin()` snapshots
 * the box and starts velocity tracking, `set()` writes live through the
 * session's physics, `release()` rests (or signals dismissal), `cancel()`
 * restores the snapshot. Handles are the caller's own pointer code.
 */

/** Structural box shape accepted everywhere a box is an input. */
export interface BoxLike {
  x: MaybeReactive<number>;
  y: MaybeReactive<number>;
  w?: MaybeReactive<number>;
  h?: MaybeReactive<number>;
}

/** A resolved box — plain numbers, viewport top-left. */
export type PlainBox = { x: number; y: number; w?: number; h?: number };

/** The channel axes every box value moves along. */
export type Axis = "x" | "y" | "w" | "h";

const AXES: readonly Axis[] = ["x", "y", "w", "h"];

/** Resolve a possibly-reactive field. Not `resolve()` from signals —
 * that unwraps only branded `signal`/`computed` handles, while `BoxLike`
 * accepts any getter (reactive literals, Box methods). Numbers are never
 * callable, so the structural unwrap is safe here. */
export const readValue = (v: MaybeReactive<number> | undefined): number =>
  typeof v === "function" ? v() : (v ?? 0);

/** Resolve a whole `BoxLike` to plain numbers. */
export const readBox = (box: BoxLike): Required<PlainBox> => ({
  x: readValue(box.x),
  y: readValue(box.y),
  w: readValue(box.w),
  h: readValue(box.h),
});

/** Whether any field is a getter (the box re-derives over time). */
export const isReactiveBox = (box: BoxLike): boolean =>
  typeof box.x === "function" ||
  typeof box.y === "function" ||
  typeof box.w === "function" ||
  typeof box.h === "function";

/** Per-axis state of the active edit. */
interface EditAxis {
  value: number;
  lastTime: number;
  velocity: number;
  driven: boolean;
}

/**
 * Manages the current edit over a box value. Subclasses supply the
 * storage (`read`/`write`), the bounding region (`region`), and optional
 * edit-lifecycle side effects (`editStart`/`editEnd` — e.g. suppressing
 * CSS transitions while a finger drives the box).
 *
 * `set()` is dual-mode, deterministically: inside an edit it is a LIVE
 * write through the session's `during` (rubber at the bounds); outside
 * it is a plain committed write. `release()` returns the rested box, or
 * `null` — "this edit wanted out" (a dismiss flick); acting on that is
 * the caller's decision. On `null` the snapshot is restored first.
 */
export abstract class Editable {
  #session: Session | undefined;
  #snapshot: Required<PlainBox> | undefined;
  #axes: Partial<Record<Axis, EditAxis>> = {};

  /** Current box value (viewport top-left, resolved). */
  protected abstract read(): Required<PlainBox>;
  /** Committed write of the given fields. */
  protected abstract write(box: Partial<PlainBox>): void;
  /** The region edits are bounded by. Default: the live viewport. */
  protected region(): Required<PlainBox> {
    return { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
  }
  /** Edit-lifecycle side effects for subclasses. */
  protected editStart(): void {}
  protected editEnd(): void {}

  /** Hard room for one axis: positions range over the region minus the
   * box's own extent; sizes range up to the region's extent. */
  protected editBounds(axis: Axis): [number, number] {
    const r = this.region();
    const current = this.read();
    switch (axis) {
      case "x":
        return [r.x, Math.max(r.x + r.w - current.w, r.x)];
      case "y":
        return [r.y, Math.max(r.y + r.h - current.h, r.y)];
      case "w":
        return [0, r.w];
      case "h":
        return [0, r.h];
    }
  }

  /** Start an edit: snapshot the box, begin velocity tracking. `session`
   * is THIS edit's physics (default: free — clamp with rubber). Throws
   * if an edit is already active. */
  begin(session?: Session): void {
    if (this.#session) throw new Error("edit already active");
    this.#session = session ?? FREE;
    this.#snapshot = this.read();
    this.#axes = {};
    this.editStart();
  }

  /** Inside an edit: live write through the session's `during` (rubber
   * at the bounds), velocity-tracked. Outside: plain committed write. */
  set(box: Partial<PlainBox>): void {
    const session = this.#session;
    if (!session) {
      this.write(box);
      return;
    }
    const now = performance.now();
    const out: Partial<PlainBox> = {};
    for (const axis of AXES) {
      const raw = box[axis];
      if (raw === undefined) continue;
      const prev = this.#axes[axis];
      const velocity =
        prev && now > prev.lastTime
          ? (raw - prev.value) / (now - prev.lastTime)
          : (prev?.velocity ?? 0);
      this.#axes[axis] = { value: raw, lastTime: now, velocity, driven: true };
      out[axis] = session.during(raw, axis, this.editBounds(axis));
    }
    this.write(out);
  }

  /** End the edit: velocity-projected rest per driven axis via the
   * session. Any axis resting `null` means "should dismiss" — the
   * snapshot is restored and `null` returned; the caller decides what
   * dismissal means. Otherwise the rested values commit. */
  release(): PlainBox | null {
    const session = this.#session;
    if (!session) return this.read();
    const rested: Partial<PlainBox> = {};
    for (const axis of AXES) {
      const state = this.#axes[axis];
      if (!state?.driven) continue;
      const r = session.rest(
        state.value,
        state.velocity,
        axis,
        this.editBounds(axis),
      );
      if (r === null) {
        this.cancel();
        return null;
      }
      rested[axis] = r;
    }
    this.#session = undefined;
    this.#snapshot = undefined;
    this.editEnd();
    this.write(rested);
    return this.read();
  }

  /** Abort the edit: restore the snapshot. */
  cancel(): void {
    const snapshot = this.#snapshot;
    this.#session = undefined;
    this.#snapshot = undefined;
    this.#axes = {};
    this.editEnd();
    if (snapshot) this.write(snapshot);
  }
}

/** A readable, editable box — the base every spatial class extends. */
export abstract class Box extends Editable implements BoxLike {
  x(): number {
    return this.read().x;
  }
  y(): number {
    return this.read().y;
  }
  w(): number {
    return this.read().w;
  }
  h(): number {
    return this.read().h;
  }
}
