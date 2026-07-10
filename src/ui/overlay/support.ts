/**
 * Capability probes — the single home for the overlay module's feature
 * detection. Consumers pick a strategy ONCE off these gates (engine or
 * pin selection in anchor.ts) instead of branching inline; CSS handles
 * its own tiers via `@supports` in the stylesheets.
 *
 * The parser checks (`CSS.supports`) are deliberately NOT cached — they
 * are cheap, and the test matrix stubs `CSS.supports` per support
 * profile. Only the layout probe (a live DOM measurement) memoizes.
 */

/** The compound anchor-positioning gate — same pair as the index.css
 * ANCHORED MODE block, so the CSS and JS tiers can never disagree. */
export const anchorSupport = (): boolean =>
  typeof CSS !== "undefined" &&
  CSS.supports("anchor-name: --x") &&
  CSS.supports("position-area: block-end");

/** Measure whether the chain rule actually lands on the anchor's VISUAL
 * box — `CSS.supports` is a parser check, and Firefox 151 passes it
 * while resolving `anchor()` against the pre-transform layout box (a
 * `translate`d trigger pins half a box off). The probe host is
 * deliberately translated to catch exactly that. Inconclusive without a
 * layout engine (tests) — then trust the declared support. */
let chainMeasured: boolean | undefined;
function probeChain(): boolean {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;top:80px;left:60px;width:40px;height:20px;" +
    "translate:10px 5px;" + // visual box at (70, 85)
    "visibility:hidden;pointer-events:none;anchor-name:--ek-chain-probe";
  const pin = document.createElement("div");
  pin.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;" +
    "position-anchor:--ek-chain-probe;top:anchor(top);left:anchor(left);" +
    "width:anchor-size(width);height:anchor-size(height)";
  document.body.append(host, pin);
  const hostRect = host.getBoundingClientRect();
  const rect = pin.getBoundingClientRect();
  host.remove();
  pin.remove();
  if (Math.abs(hostRect.top - 85) > 1) return true; // no layout engine
  return (
    Math.abs(rect.top - 85) < 1 &&
    Math.abs(rect.left - 70) < 1 &&
    Math.abs(rect.width - 40) < 1
  );
}

/** The follow pin needs more than the placement gate — the chain rule
 * mirrors the followed box with `anchor()`/`anchor-size()`. A browser
 * that places but can't chain falls back to the JS rect copy. */
export const chainSupport = (): boolean => {
  if (
    !anchorSupport() ||
    !CSS.supports("top: anchor(top)") ||
    !CSS.supports("width: anchor-size(width)")
  ) {
    return false;
  }
  chainMeasured ??= probeChain();
  return chainMeasured;
};
