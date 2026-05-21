import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/colors/mint.css";
import "elements-kit/ui/styles/palette/blue.css";
import "elements-kit/ui/styles/colors/blue.css";
import "elements-kit/ui/styles/palette/amber.css";
import "elements-kit/ui/styles/colors/amber.css";
import "elements-kit/ui/styles/palette/crimson.css";
import "elements-kit/ui/styles/colors/crimson.css";

import "elements-kit/ui/alert/alert.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const VARIANTS = ["soft", "surface", "outline"] as const;
const SIZES = [1, 2, 3] as const;

function InfoIcon() {
  return (
    <svg
      class:x-alert-icon
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      style:fill="currentColor"
    >
      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 3a1 1 0 110 2 1 1 0 010-2zm1 10H7V7h2v6z" />
    </svg>
  );
}

export class App {
  render() {
    return (
      <div
        class:dark={dark}
        data-base-color="gray"
        data-radius="medium"
        style:padding="24px"
        style:display="grid"
        style:gap="20px"
        style:background="var(--base-color-1)"
        style:color="var(--base-color-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
      >
        <button
          on:click={() => dark(!dark())}
          style:width="fit-content"
          style:padding="6px 12px"
          style:border="1px solid var(--base-color-a6)"
          style:border-radius="6px"
          style:background="var(--base-color-a2)"
          style:color="var(--base-color-12)"
          style:cursor="pointer"
        >
          {() => (dark() ? "☀ Light" : "☾ Dark")}
        </button>

        <h3 style:margin="0">Variants</h3>
        {VARIANTS.map((variant) => (
          <div class:x-alert data-variant={variant} data-color="amber">
            <InfoIcon />
            <div>
              <strong>{variant}</strong> — Heads up. Your trial ends in 7 days.
            </div>
          </div>
        ))}

        <h3 style:margin="16px 0 0">Sizes</h3>
        {SIZES.map((size) => (
          <div class:x-alert data-size={String(size)} data-color="blue">
            <InfoIcon />
            <div>Size {size} — example body copy goes here.</div>
          </div>
        ))}

        <h3 style:margin="16px 0 0">Colors</h3>
        <div class:x-alert data-color="mint">
          <InfoIcon />
          <div>Mint — informational</div>
        </div>
        <div class:x-alert data-color="amber">
          <InfoIcon />
          <div>Amber — warning</div>
        </div>
        <div class:x-alert data-color="crimson">
          <InfoIcon />
          <div>Crimson — error</div>
        </div>

        <h3 style:margin="16px 0 0">High contrast</h3>
        <div class:x-alert data-variant="soft" data-color="amber" data-high-contrast>
          <InfoIcon />
          <div>High-contrast soft variant — color bumps to --color-12.</div>
        </div>
      </div>
    );
  }
}
