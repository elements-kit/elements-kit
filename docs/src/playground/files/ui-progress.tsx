import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/neutral.css";
import "elements-kit/ui/styles/base/neutral.css";
import "elements-kit/ui/styles/palette/black-alpha.css";
import "elements-kit/ui/styles/palette/white-alpha.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/accent/mint.css";
import "elements-kit/ui/styles/palette/blue.css";
import "elements-kit/ui/styles/accent/blue.css";
import "elements-kit/ui/styles/palette/iris.css";
import "elements-kit/ui/styles/accent/iris.css";
import "elements-kit/ui/styles/palette/crimson.css";
import "elements-kit/ui/styles/accent/crimson.css";
import "elements-kit/ui/styles/palette/amber.css";
import "elements-kit/ui/styles/accent/amber.css";

import "elements-kit/ui/progress/progress.css";
import "elements-kit/ui/button/button.css";

import { computed, signal } from "elements-kit/signals";

const dark = signal(false);
const animated = signal(0);

setInterval(() => {
  const v = animated();
  animated(v >= 100 ? 0 : v + 10);
}, 600);

const SIZES = [1, 2, 3] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "iris", "crimson", "amber"] as const;

export class App {
  render() {
    return (
      <div
        class:dark={dark}
        data-accent="mint"
        data-base-color="neutral"
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
          <div style:display="grid" style:gap="16px">
            {SIZES.map((size) => (
              <div>
                <code
                  style:font-size="12px"
                  style:color="var(--base-color-11)"
                  style:display="block"
                  style:margin-bottom="6px"
                >
                  data-size="{size}"
                </code>
                <progress
                  class:x-progress
                  data-size={String(size)}
                  value="50"
                  max="100"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Variants</h3>
          <div style:display="grid" style:gap="16px">
            {VARIANTS.map((variant) => (
              <div>
                <code
                  style:font-size="12px"
                  style:color="var(--base-color-11)"
                  style:display="block"
                  style:margin-bottom="6px"
                >
                  data-variant="{variant}"
                </code>
                <progress
                  class:x-progress
                  data-variant={variant}
                  value="65"
                  max="100"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Indeterminate</h3>
          <progress class:x-progress />
        </section>

        <section>
          <h3 style:margin="0 0 12px">Animated</h3>
          <progress
            class:x-progress
            value={computed(() => animated())}
            max="100"
          />
        </section>

        <section>
          <h3 style:margin="0 0 12px">Accent colors</h3>
          <div style:display="grid" style:gap="12px">
            {ACCENTS.map((color) => (
              <div data-accent={color}>
                <code
                  style:font-size="12px"
                  style:color="var(--base-color-11)"
                  style:display="block"
                  style:margin-bottom="6px"
                >
                  {color}
                </code>
                <progress class:x-progress value="70.0" max="100" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }
}
