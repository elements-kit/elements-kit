/**
 * `elements-kit/ui/overlay` — the JS for `.x-overlay`, on the reactive box
 * model:
 *
 *   ElementBox           viewport-box geometry projected to CSS (`--x/--y`
 *                        translate, real `--w/--h` size), base + drag
 *                        `displacement`
 *     └─ Overlay         the surface — constrain/dock, markup gestures, anchor
 *   Constraint           a region the overlay stays inside (`constrain`/`dock`)
 *   Region / Area        space as edges (xmin…ymax) / plus where a box sits
 *   PositionArea         an anchor's `position-area` region, live
 *   PositionTry          the first candidate region/box that fits
 *   place                lands an overlay in an area, unmeasured
 *   Draggable/Resizable  pointer→box gestures on the `.x-handle` children
 *
 * Geometry is pure CSS (index.css / overlay.css) driven by the box's channels;
 * JS only writes them. Docking, anchor regions, and gesture bounds are JS
 * (`Constraint`, `PositionArea`).
 */

export {
  anchor_length,
  PositionArea,
  type BlockSide,
  type InlineSide,
  type Inset,
  type PositionAreaValue,
} from "./anchor.ts";
export {
  VIEWPORT_BOX,
  WINDOW_BOX,
  ElementBox,
  MarginBox,
  type ReadonlyBox,
} from "./box.ts";
export { OverlayBox, type Origin } from "./overlay.ts";
export {
  Align,
  MutableArea,
  place,
  type Area,
  type Region,
} from "./area.ts";

export { PositionTry } from "./try.ts";

export * as Gestures from "./gestures.ts";
export { Motion, type IMotion } from "./motion.ts";
