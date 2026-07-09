/**
 * `elements-kit/ui/overlay` — the JS for `.x-overlay`. A class hierarchy
 * rooted at the box:
 *
 *   Editable → Box       readable geometry (x/y/w/h getters) + the edit
 *                        lifecycle (begin / set / release / cancel)
 *     ├─ Overlay         the surface — channels, markup gestures
 *     ├─ Anchor          a tracked box the overlay attaches to
 *     └─ Constraint      a region it stays inside (+ `constrain` clamp)
 *   Session              edit physics, stateless — the base is rubber +
 *                        clamp; `SnapSession(stops)` rests on detents;
 *                        subclass `during`/`rest` for custom
 *
 * Constructors are spatial-only (box / anchor / within); physics are
 * per-edit (`begin(new SnapSession(stops))`); handles are the caller's
 * own pointer code driving the setters. Geometry itself is pure CSS
 * (index.css / overlay.css) driven by the `--overlay-*` channels — JS
 * only writes channels or moves the anchor. Behaviors attach to the
 * spatial objects, never to the overlay's state: dragging moves the
 * anchor, constraints clamp through the channels — the overlay has no
 * modes, so nothing can mode-switch.
 */

export { Anchor, type AnchorOptions, type AnchorTarget } from "./anchor.ts";
export {
  type Axis,
  Box,
  type BoxLike,
  Editable,
  type PlainBox,
} from "./box.ts";
export { Constraint } from "./constraint.ts";
export { Overlay, type OverlayOptions } from "./overlay.ts";
export { Session, SnapSession } from "./session.ts";
