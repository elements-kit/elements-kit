import { type Computed, computed, reactive } from "@/signals";
import { fits, intersect } from "./area.ts";
import type { Area, Region } from "./area.ts";

/** How candidates are ranked before trying — `position-try-order`. */
export type TryOrder = "normal" | "most-width" | "most-height";

/**
 * The reactive `position-try-fallbacks`: the first candidate with room for
 * `subject` (a box, by size) — bound each (`PositionArea`'s container);
 * an open axis always fits, an empty one never. None fitting keeps the
 * first, as CSS does, and {@link fits} turns false. An {@link Area} itself:
 * the chosen candidate.
 */
export class PositionTry implements Area {
  @reactive() subject: Region;
  @reactive() candidates: readonly Area[];
  @reactive() order: TryOrder;
  // An index, so a move that keeps the choice notifies nobody. Negative
  // when nothing fits: `~index` is the fallback.
  #index: Computed<number>;

  constructor(
    subject: Region,
    candidates: readonly Area[],
    order: TryOrder = "normal",
  ) {
    this.subject = subject;
    this.candidates = candidates;
    this.order = order;
    this.#index = computed(() => this.#choose());
  }

  #choose(): number {
    // A snapshot of each candidate's room, `null` when empty.
    const rooms = this.candidates.map((c) => intersect(c));
    const width = (i: number) => {
      const r = rooms[i];
      return r ? (r.xmax ?? Infinity) - (r.xmin ?? -Infinity) : -Infinity;
    };
    const height = (i: number) => {
      const r = rooms[i];
      return r ? (r.ymax ?? Infinity) - (r.ymin ?? -Infinity) : -Infinity;
    };
    const ranked = rooms.map((_, i) => i);
    if (this.order === "most-width") ranked.sort((a, b) => width(b) - width(a));
    if (this.order === "most-height") ranked.sort((a, b) => height(b) - height(a));
    const fit = ranked.find((i) => {
      const r = rooms[i];
      return r !== null && fits(r, this.subject);
    });
    return fit ?? ~(ranked[0] ?? -1);
  }

  /** Whether the chosen candidate fits — false when none did. */
  get fits(): boolean {
    return this.#index() >= 0;
  }

  /** The candidate in use: the first that fits, else the first ranked;
   * undefined if there are none. */
  get chosen(): Area | undefined {
    const i = this.#index();
    return this.candidates[i < 0 ? ~i : i];
  }

  get xmin() {
    return this.chosen?.xmin;
  }
  get xmax() {
    return this.chosen?.xmax;
  }
  get ymin() {
    return this.chosen?.ymin;
  }
  get ymax() {
    return this.chosen?.ymax;
  }
  get xalign() {
    return this.chosen?.xalign;
  }
  get yalign() {
    return this.chosen?.yalign;
  }
}
