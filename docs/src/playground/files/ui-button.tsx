import "elements-kit/ui/styles/base.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/shadow.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
// import any color scales you want to use for accent theming:
import "elements-kit/ui/styles/colors/mint.css";
import "elements-kit/ui/styles/accent/mint.css";
// import any gray scales you want to use for neutral theming:
import "elements-kit/ui/styles/colors/slate.css";
import "elements-kit/ui/styles/gray/slate.css";
// and of course the button itself:
import "elements-kit/ui/button/button.css";

const VARIANTS = [
  "classic",
  "solid",
  "soft",
  "surface",
  "outline",
  "ghost",
] as const;

const SIZES = [1, 2, 3, 4] as const;

const ACCENTS = ["gray", "mint", "blue", "iris", "crimson", "amber"] as const;

export class App {
  render() {
    return (
      <div
        data-accent-color="mint"
        data-radius="medium"
        style="padding: 24px; display: grid; gap: 28px; font-family: var(--default-font-family, system-ui, sans-serif);"
      >
        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600;">
            Variants
          </h3>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            {VARIANTS.map((variant) => (
              <button class="x-button" data-size="2" data-variant={variant}>
                {variant.charAt(0).toUpperCase() + variant.slice(1)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600;">
            Sizes
          </h3>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            {SIZES.map((size) => (
              <button
                class="x-button"
                data-size={String(size)}
                data-variant="solid"
              >
                Size {size}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600;">
            Accent colors
          </h3>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            {ACCENTS.map((color) => (
              <button
                class="x-button"
                data-size="2"
                data-variant="solid"
                data-accent-color={color}
              >
                {color}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600;">
            High contrast & disabled
          </h3>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button
              class="x-button"
              data-size="2"
              data-variant="solid"
              data-high-contrast
            >
              High contrast
            </button>
            <button class="x-button" data-size="2" data-variant="soft" disabled>
              Disabled soft
            </button>
            <button
              class="x-button"
              data-size="2"
              data-variant="outline"
              disabled
            >
              Disabled outline
            </button>
          </div>
        </section>
      </div>
    );
  }
}
