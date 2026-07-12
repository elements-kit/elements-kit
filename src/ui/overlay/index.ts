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
 * JS only writes them. Docking, flip/shift, and gesture bounds are JS
 * (`Constraint`, `position_area`).
 */

export {
  Anchor,
  type AnchorTarget,
  anchor_length,
  type Area,
  type AxisRegion,
  type BlockSide,
  computePlacement,
  type InlineSide,
  type Inset,
  type PhysicalInset,
  place,
  placeArea,
  placeAxis,
  position_area,
  resolveArea,
  shift,
  type Side,
  SIDES,
  tryFallbacks,
} from "./anchor.ts";
export { Constraint, INSTANT_TRANSITIONS } from "./constraint.ts";
export {
  AUTO,
  type Axis,
  type BoxLike,
  Box,
  ElementBox,
  type IBox,
  type IDirection,
  type PlainBox,
  WINDOW_BOX,
} from "./element-box.ts";
export {
  compose,
  detent,
  Draggable,
  type Handle,
  HANDLES,
  type Modifier,
  nearest,
  Resizable,
  type ResizeConfig,
  rubber,
  snap,
} from "./gestures.ts";
export { Overlay, type OverlayOptions } from "./overlay.ts";
