import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/shadow.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
// import any color scales you want to use for accent theming:
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/colors/mint.css";
import "elements-kit/ui/styles/palette/blue.css";
import "elements-kit/ui/styles/colors/blue.css";
import "elements-kit/ui/styles/palette/iris.css";
import "elements-kit/ui/styles/colors/iris.css";
import "elements-kit/ui/styles/palette/crimson.css";
import "elements-kit/ui/styles/colors/crimson.css";
import "elements-kit/ui/styles/palette/amber.css";
import "elements-kit/ui/styles/colors/amber.css";
// import any gray scales you want to use for neutral theming:
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";
// the badge itself + button (for the dark-mode toggle):
import "elements-kit/ui/badge/badge.css";
import "elements-kit/ui/button/button.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const VARIANTS = ["solid", "soft", "surface", "outline"] as const;
const SIZES = [1, 2, 3] as const;
const ACCENTS = ["gray", "mint", "blue", "iris", "crimson", "amber"] as const;
const RADII = ["none", "small", "medium", "large", "full"] as const;

export class App {
  render() {
    return (
      <div
        class:dark={dark}
        data-surface="page"
        data-color="mint"
        data-base-color="gray"
        data-radius="medium"
        style:padding="24px"
        style:display="grid"
        style:gap="28px"
        style:color="var(--base-color-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
      >
        <section>
          <h3
            style:margin="0 0 12px"
            style:font-size="14px"
            style:font-weight="600"
          >
            Theme
          </h3>
          <button
            class:unset
            class:x-button
            data-size="2"
            data-variant="soft"
            on:click={() => dark(!dark())}
          >
            {() => (dark() ? "☀ Light mode" : "☾ Dark mode")}
          </button>
        </section>

        <section>
          <h3
            style:margin="0 0 12px"
            style:font-size="14px"
            style:font-weight="600"
          >
            Variants
          </h3>
          <div style:display="flex" style:gap="8px" style:flex-wrap="wrap">
            {VARIANTS.map((variant) => (
              <span class:x-badge data-size="2" data-variant={variant}>
                {variant.charAt(0).toUpperCase() + variant.slice(1)}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h3
            style:margin="0 0 12px"
            style:font-size="14px"
            style:font-weight="600"
          >
            Sizes
          </h3>
          <div
            style:display="flex"
            style:gap="8px"
            style:align-items="center"
            style:flex-wrap="wrap"
          >
            {SIZES.map((size) => (
              <span class:x-badge data-size={String(size)} data-variant="soft">
                Size {size}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h3
            style:margin="0 0 12px"
            style:font-size="14px"
            style:font-weight="600"
          >
            Accent colors
          </h3>
          <div style:display="flex" style:gap="8px" style:flex-wrap="wrap">
            {ACCENTS.map((color) => (
              <span
                class:x-badge
                data-size="2"
                data-variant="soft"
                data-color={color}
              >
                {color}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h3
            style:margin="0 0 12px"
            style:font-size="14px"
            style:font-weight="600"
          >
            Radius
          </h3>
          <div style:display="grid" style:gap="12px">
            {RADII.map((radius) => (
              <div
                data-radius={radius}
                style:display="flex"
                style:gap="8px"
                style:align-items="center"
                style:flex-wrap="wrap"
              >
                <code style:font-size="12px" style:min-width="60px">
                  {radius}
                </code>
                {VARIANTS.map((variant) => (
                  <span class:x-badge data-size="2" data-variant={variant}>
                    {variant}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3
            style:margin="0 0 12px"
            style:font-size="14px"
            style:font-weight="600"
          >
            High contrast
          </h3>
          <div style:display="flex" style:gap="8px" style:flex-wrap="wrap">
            {VARIANTS.map((variant) => (
              <span
                class:x-badge
                data-size="2"
                data-variant={variant}
                data-high-contrast
              >
                {variant}
              </span>
            ))}
          </div>
        </section>
      </div>
    );
  }
}
