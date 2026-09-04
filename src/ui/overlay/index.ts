/**
 * `elements-kit/ui/overlay` — the JS for `.x-overlay`, on the reactive box
 * model:
 *
 *   ElementBox           viewport-box geometry projected to CSS (`--x/--y`
 *                        translate, real `--w/--h` size), base + drag
 *                        `displacement`
 *     └─ Overlay         the surface — constrain/dock, markup gestures, anchor
 *   Constraint           a region the overlay stays inside (`constrain`/`dock`)
 *   Region               somewhere a box may go — `place(box)` positions it
 *   PositionArea         an anchor's `position-area` region, live
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
  type PhysicalInset,
} from "./anchor.ts";
export {
  WINDOW_BOX,
  ElementBox,
  WindowBox,
  type Axis,
  type IDirection,
  type ReadonlyBox,
} from "./box.ts";
export { OverlayBox } from "./overlay.ts";
export {
  MutableRegion,
  type Align,
  type Boundary,
  type Placement,
  type Pin,
  type Region,
} from "./area.ts";

export * as Gestures from "./gestures.ts";
export { Motion, type IMotion } from "./motion.ts";
