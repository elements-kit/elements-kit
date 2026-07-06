/**
 * `elements-kit/ui/overlay` — the JS for `.x-overlay`. Aggregate entry;
 * one feature per module, add only what you use:
 *
 *   constraint.ts       spatial primitive — a reactive region
 *                       (`constraint`) and its application (`confine`)
 *   anchor.ts           spatial primitive — the anchor element the
 *                       overlay follows for life (`anchor`)
 *   detents.ts          the region, quantized (`detents`) — one snapping
 *                       concept for sizes AND positions
 *   rubber.ts           edge resistance effect (`rubber`)
 *   draggable.ts        drag service — moves a target through a space
 *   resize.ts           resize service — sizes a target through a space
 *   resize-strategy.ts  resize policy (`freeResize` default)
 *   gestures.ts         markup-driven preset (`createOverlayGestures`,
 *                       reads `data-resize` / `data-draggable`)
 *
 * Geometry itself is pure CSS (index.css / overlay.css) driven by the
 * `--overlay-*` channels — JS only writes channels or moves the anchor.
 * The two primitives are the anchor and the constraint; behaviors attach
 * to primitives, never to the overlay: dragging moves the anchor, detents
 * quantize the constraint, rubber resists at its edges. The overlay has
 * no states, so nothing can mode-switch.
 */

export * from "./anchor.ts";
export * from "./constraint.ts";
export * from "./detents.ts";
export * from "./draggable.ts";
export * from "./gestures.ts";
export * from "./resize-strategy.ts";
export * from "./resize.ts";
export * from "./rubber.ts";
