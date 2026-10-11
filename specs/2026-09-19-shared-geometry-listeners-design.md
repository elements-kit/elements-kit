# Shared geometry listeners

Status: proposal · 2026-09-19

## Problem

`createElementRect` (`src/utilities/element-rect.ts`) sets up its own listeners
for every element it tracks:

| Per rect | What |
| --- | --- |
| 1 | `window` capture-phase `scroll` listener |
| 1 | `window` `resize` listener |
| 1 | `ResizeObserver` (`createResizeObserver`, one per target) |

Every `OverlayBox` and every `ElementBox` (`src/ui/overlay/`) creates one. A
dashboard page with ~10 overlays (menus, dialogs, a sheet) therefore holds
~20 window listeners and ~10 observers. Each scroll listener calls
`getBoundingClientRect()` on every scroll event:

- **on any scroller in the page**, since the listener is capture-phase;
- **while the overlay is closed**;
- **more than once a frame**, since scroll can fire several times per frame.

Each read also writes a fresh `DOMRect` into the signal, so every dependant
reruns even when nothing moved.

`createElementScroll` (`src/utilities/element-scroll.ts`) adds one `scroll`
listener per scroller as well. Apps that drive toolbar reveal from JS (browsers
without scroll timelines) create one per scroller.

## Proposal

One module owns the listeners; rects and scrollers subscribe to it.

```
geometry.ts (module singletons, attached lazily, detached at 0 subscribers)
  window scroll  (capture, passive) ─┐
  window resize  (passive)          ─┼─► schedule() ─► rAF ─► flush()
  one ResizeObserver                ─┘                        │
                                                              ▼
                                         for each subscriber: remeasure()

createElementRect(el)  → subscribe(el, update)   / unsubscribe on cleanup
createElementScroll(el)→ subscribe to scroll events whose target is el
```

1. **Delegate scroll.** `scroll` doesn't bubble but does capture, so one
   capture listener on `window` sees every scroller. `event.target` says which
   one scrolled; scroll subscribers are keyed by element.
2. **Share one `ResizeObserver`.** Observe every tracked target with it; a
   `WeakMap<Element, callback>` sends each entry to its owner.
3. **Batch to the frame.** Events only mark work pending; one
   `requestAnimationFrame` does all the `getBoundingClientRect` reads together,
   so there's at most one layout read pass per frame, never interleaved with
   writes.
4. **Skip unchanged rects.** Compare x/y/width/height before writing the
   signal, so an unmoved element doesn't rerun its dependants.
5. **Measure only while visible.** `OverlayBox` subscribes on the popover's
   `toggle` → open and unsubscribes on close. On reopen it measures once.

## Result

| | Now (n rects) | Proposed |
| --- | --- | --- |
| window listeners | 2n | 2 |
| ResizeObservers | n | 1 |
| rect reads per scroll event | n (open or closed) | ≤ open overlays, once per frame |
| dependant reruns when nothing moved | every event | none |

## API

No public change. `createElementRect` and `createElementScroll` keep their
signatures; the shared module stays internal (`src/utilities/geometry.ts`).

## Tests

- Two rects share one window listener (spy `addEventListener`); the listener is
  removed when the last one is disposed.
- Several scroll events inside one frame lead to one read per rect.
- An unchanged rect doesn't notify its dependants.
- A closed `OverlayBox` isn't measured on scroll; opening it measures once.
- A `createElementScroll` signal updates only for its own element.
