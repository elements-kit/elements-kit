/**
 * `elements-kit/ui/overlay` — the JS for `.x-overlay`, on the reactive box
 * model:
 *
 *   ElementBox           viewport-box geometry projected to CSS (`--x/--y`
 *                        translate, real `--w/--h` size), base + drag
 *                        `displacement`
 *     └─ Overlay         the surface — constrain/dock, markup gestures, anchor
 *   Constraint           a region the overlay stays inside (`constrain`/`dock`)
 *   position_area        places a box in a region of an anchor's 3×3 grid
 *   Draggable/Resizable  pointer→box gestures on the `.x-handle` children
 *
 * Geometry is pure CSS (index.css / overlay.css) driven by the box's channels;
 * JS only writes them. Docking, anchor regions, and gesture bounds are JS
 * (`Constraint`, `position_area`).
 */

export {
  anchor_length,
  position_area,
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
