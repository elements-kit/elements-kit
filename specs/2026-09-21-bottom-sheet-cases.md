# Bottom sheet cases

Status: proposal · 2026-09-21

## Problem

The `BottomSheet` story (`src/ui/overlay/overlay.stories.tsx`) builds a sheet
from existing primitives: `OverlayBox`, `place`, `VIEWPORT_BOX`, `Motion` and
`Gestures` (`rubber`, `snap`). It has three stops (peek, half, full) as
fractions of the viewport; snapping to 0 closes it.

It covers the basics. It lacks scroll interplay, on-screen keyboard handling
and iOS scroll lock — where [vaul] and the [Base UI drawer] spend most of
their code.

| Case | Story | vaul | Base UI |
| --- | --- | --- | --- |
| Pointer capture, primary pointer only | yes | yes | yes |
| No transition while dragging | yes | yes | yes |
| Resistance past fully open | `rubber` | log curve | square root |
| Stale velocity ignored | 100 ms | no | 80 ms |
| Stops recomputed on viewport resize | yes | yes | yes |
| Close resets the stop | yes | yes (after 500 ms) | yes |
| Snap by velocity and distance | `snap`, 150 ms carry | thresholds | offset + velocity × 300 |
| Backdrop click and Esc close | yes | yes | yes |

## Cheap cases

A few lines each in the story's pointer handling. Together they stop
accidental drags and wrong closes.

| Case | Who | What to do |
| --- | --- | --- |
| Direction lock and slop | both | Wait 6 px (Base UI) to 10 px touch / 2 px mouse (vaul) before claiming the gesture; a cross-axis move past it cancels. Without it every tap on the header starts a drag. |
| Text selection blocks drag | both | Skip when `getSelection()` is not empty (touch); clear it on a mouse drag. |
| Opt-out attribute | both | `data-no-drag` never drags; mouse or pen presses on `button`, `a`, `input`, `select`, `textarea`, `label`, `[role=button]` never drag. |
| Two-finger move ignored | Base UI | A two-finger `touchmove` is pinch zoom or iOS selection handles. |
| Non-primary button mid-drag | Base UI | Cancel. A move with `buttons: 0` counts as the release (fast trackpad flick). |
| `pointerout` and `contextmenu` | vaul | Treat as release. |
| Reversal cancels a close | Base UI | Pulling back 10 px or more after the furthest point keeps it open. |
| Close threshold | both | Velocity > 0.4 px/ms or 25% of the height (vaul); ≥ 0.5 px/ms or 50% (Base UI). The story only snaps to the nearest of 0 and the stops. |
| No stop skipping | both | Optional `sequential`: a flick moves one stop at a time. |
| Release speed follows velocity | Base UI | 80–360 ms instead of the fixed `--overlay-duration`. |
| `user-select: none` | vaul | Only for `(hover: hover) and (pointer: fine)`, so mouse drags don't select header text. |
| No drag right after open | vaul | 500 ms, so content can scroll while the sheet animates in. |
| Handle-only mode | vaul | Only the handle drags; the body only scrolls. |
| Non-dismissible | both | Can't drag below the lowest stop; every close path is blocked. |

## Real work

Scroll hand-off is what makes a sheet feel native on phones. The keyboard and
iOS scroll lock matter for any modal, not just sheets.

### Scroll hand-off (both)

Content scrolls until it reaches its edge; past that edge, the same gesture
moves the sheet.

- **vaul:** walks up the ancestors; any scroller with `scrollTop ≠ 0` blocks
  the drag, then drag stays blocked 100 ms after scrolling. A downward swipe
  that hasn't moved the sheet yet is left to scroll. On iOS, `touchend` resets
  the gate — iOS fires no `pointerup` after a scroll. Once allowed, a drag is
  never revoked mid-gesture.
- **Base UI:** checks the scroll edge per axis. A scroller not at its edge
  stays native; at the edge, moving toward close is claimed. It waits for the
  slop before `preventDefault`: iOS cancels native scroll for the whole
  gesture if the first move is prevented. A non-cancelable `touchmove` means
  the browser already committed to scrolling, so it yields.
- **Needs:** touch events with a capture-phase `touchmove`
  (`passive: false`), not just pointer events.

### On-screen keyboard and inputs (both)

- A visual viewport shrink > 60 px counts as the keyboard. `VIEWPORT_BOX`
  already keeps the sheet docked above it.
- Missing: scrolling the focused field into view. Base UI centres it with a
  16 px margin, adds 48 px of scroll slack, realigns 4× at 150 ms, and pins
  window scroll against WebKit's own reveal.
- Missing: the iOS prev/next field arrows (Base UI overrides `focusout`
  geometry), and tap-to-focus inside the gesture (a move > 10 px is not a
  tap).
- vaul focuses iOS inputs with a `translateY(-2000px)` trick, then
  `scrollIntoView` with a 24 px buffer.

### Page scroll lock on iOS (vaul)

`showModal` makes the page inert but doesn't stop it scrolling.

- `body { position: fixed; top: -scrollY }`, restored on close; re-offset
  after 300 ms if Safari's bottom bar appeared.
- Skipped in standalone PWA mode and while another sheet is still open.
- `scroll-behavior: auto` on `html` while open; scrollbar width compensated.

### Smaller features

| Feature | Who | Note |
| --- | --- | --- |
| Nested sheets | both | Parent scales to (w − 16) / w and shifts 16 px (vaul); progress shared up the tree, no backdrop for nested sheets (Base UI). |
| Background scale | vaul | Page wrapper scales to (w − 26) / w with an 8 px radius, following the drag. |
| Fade between stops | both | Backdrop fades only between two chosen stops; Base UI exposes `--drawer-swipe-progress`. |
| Android back gesture | Base UI | `CloseWatcher`, topmost sheet only. |
| Handle tap cycles stops | vaul | Ignores double-tap (120 ms) and long-press (250 ms); handle hit area ≥ 44 px. |
| Gap under an overdrag | vaul | A `::after` extends the surface past the bottom edge, so pulling up shows no gap. |
| Fit-content stop | both | Stops clamp to the content height; ours can leave empty space under short content. |
| Mouse drags skip the body | Base UI | Desktop users select text in the content; touch still drags. |
| Focus on open | both | Base UI focuses the popup itself; ours focuses the scroll container and shows a focus ring. |

## Plan

Story first, then a shared `drag()` helper once scroll hand-off fixes its
shape, then browser utilities any modal can use.

| Step | Scope | Lives in |
| --- | --- | --- |
| 1 | Cheap cases: slop and direction lock, selection, opt-out attribute, two-finger, reversal cancel, `user-select`, focus on open | the `BottomSheet` story |
| 2 | Scroll hand-off with touch events | the story, then a `drag()` helper in `src/ui/overlay/` |
| 3 | Keyboard and focused inputs; iOS page scroll lock | `src/utilities/` — any modal needs them |
| 4 | Nesting, background scale, fade between stops, Android back, handle tap | later, on demand |

## Open questions

- Close rule: vaul's (25% or 0.4 px/ms), Base UI's (50% or 0.5 px/ms), or the
  current nearest-stop snap?

## Sources

- [vaul] `src/index.tsx` and its helpers (`use-snap-points.ts`,
  `use-prevent-scroll.ts`, `use-position-fixed.ts`, `constants.ts`)
- [Base UI drawer] `packages/react/src/drawer`, with
  `utils/useSwipeDismiss.ts`, `utils/scrollable.ts` and
  `internals/constants.ts`

[vaul]: https://github.com/emilkowalski/vaul/blob/main/src/index.tsx
[Base UI drawer]: https://github.com/mui/base-ui/tree/master/packages/react/src/drawer
