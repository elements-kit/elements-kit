/**
 * `elements-kit/ui/overlay` — the JS for `.x-overlay`, on the reactive box
 * model:
 *
 *   ElementBox           viewport-box geometry projected to CSS (`--x/--y`
 *                        translate, real `--w/--h` size), base + drag
 *                        `displacement`
 *     └─ Overlay         the surface — constrain/dock, markup gestures, anchor
 *   Constraint           a region the overlay stays inside (`constrain`/`dock`)
 *   Anchor               a tracked box the overlay follows (`position_area`)
 *   Draggable/Resizable  pointer→box gestures on the `.x-handle` children
 *
 * Geometry is pure CSS (index.css / overlay.css) driven by the box's channels;
 * JS only writes them. Docking, position-try flips, and gesture bounds are JS
 * (`Constraint`, `position_area`).
 */

export {
  anchor_length,
  type Area,
  type AxisRegion,
  type BlockSide,
  type InlineSide,
  type Inset,
  type PhysicalInset,
  placeArea,
  placeAxis,
  position_area,
  resolveArea,
  tryFallbacks,
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

// export { Constraint, INSTANT_TRANSITIONS } from "./constraint.ts";
// export {
//   compose,
//   detent,
//   Draggable,
//   type Handle,
//   HANDLES,
//   type Modifier,
//   nearest,
//   Resizable,
//   type ResizeConfig,
//   rubber,
//   snap,
// } from "./gestures.ts";
