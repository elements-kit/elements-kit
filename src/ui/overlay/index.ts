/**
 * `elements-kit/ui/overlay` — the JS for `.x-overlay`. Aggregate entry;
 * each concern lives in its own module:
 *
 *   constrain.ts        confine the overlay to a rect (`constrainOverlay`)
 *   resize-strategy.ts  resize policy (`freeResize`, `detents`)
 *   gestures.ts         pointer engine (`createOverlayGestures`)
 *   overlay.ts          one-call facade (`overlay`)
 *
 * Geometry itself is pure CSS (index.css / overlay.css) driven by the
 * `--overlay-*` channels — this module just writes those channels.
 */

export * from "./constrain.ts";
export * from "./resize-strategy.ts";
export * from "./gestures.ts";
export * from "./overlay.ts";
