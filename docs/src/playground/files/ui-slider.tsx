import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";
import "elements-kit/ui/styles/palette/black-alpha.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/colors/mint.css";
import "elements-kit/ui/styles/palette/blue.css";
import "elements-kit/ui/styles/colors/blue.css";
import "elements-kit/ui/styles/palette/iris.css";
import "elements-kit/ui/styles/colors/iris.css";
import "elements-kit/ui/styles/palette/crimson.css";
import "elements-kit/ui/styles/colors/crimson.css";

import "elements-kit/ui/slider/slider.css";
import "elements-kit/ui/button/button.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const SIZES = [1, 2, 3] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "iris", "crimson"] as const;

export class App {
  render() {
    return (
      <div
        class:dark={dark}
        data-color="mint"
        data-base-color="gray"
        data-radius="medium"
        style:padding="24px"
        style:display="grid"
        style:gap="24px"
        style:background="var(--base-color-1)"
        style:color="var(--base-color-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
        style:max-width="540px"
      >
        <button
          class:unset
          class:x-button
          data-size="1"
          data-variant="soft"
          on:click={() => dark(!dark())}
        >
          {() => (dark() ? "☀ Light" : "☾ Dark")}
        </button>

        <section>
          <h3 style:margin="0 0 12px">Sizes</h3>
          <div style:display="grid" style:gap="20px">
            {SIZES.map((size) => (
              <div>
                <label
                  style:display="block"
                  style:margin-bottom="6px"
                  style:font-size="13px"
                  style:color="var(--base-color-11)"
                >
                  Size {size}
                </label>
                <input
                  type="range"
                  class:unset
                  class:x-slider
                  data-size={String(size)}
                  min="0"
                  max="100"
                  value="40"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Variants</h3>
          <div style:display="grid" style:gap="20px">
            {VARIANTS.map((variant) => (
              <div>
                <label
                  style:display="block"
                  style:margin-bottom="6px"
                  style:font-size="13px"
                  style:color="var(--base-color-11)"
                >
                  data-variant="{variant}"
                </label>
                <input
                  type="range"
                  class:unset
                  class:x-slider
                  data-variant={variant}
                  min="0"
                  max="100"
                  value="60"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Accent colors</h3>
          <div style:display="grid" style:gap="20px">
            {ACCENTS.map((color) => (
              <div>
                <label
                  style:display="block"
                  style:margin-bottom="6px"
                  style:font-size="13px"
                  style:color="var(--base-color-11)"
                >
                  {color}
                </label>
                <input
                  type="range"
                  class:unset
                  class:x-slider
                  data-color={color}
                  min="0"
                  max="100"
                  value="50"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Disabled</h3>
          <input
            type="range"
            class:unset
            class:x-slider
            min="0"
            max="100"
            value="30"
            disabled
          />
        </section>
      </div>
    );
  }
}
