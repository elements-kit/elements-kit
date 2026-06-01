import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/neutral/gray.css";
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

import "elements-kit/ui/switch/switch.css";
import "elements-kit/ui/button/button.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const SIZES = [1, 2, 3] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "iris", "crimson", "amber"] as const;

function Row({ children }: { children: any }) {
  return (
    <div
      style:display="flex"
      style:flex-wrap="wrap"
      style:align-items="center"
      style:gap="1rem"
    >
      {children}
    </div>
  );
}

export class App {
  render() {
    return (
      <div
        class:dark={dark}
        data-accent="mint"
        data-neutral="gray"
        data-radius="medium"
        style:padding="24px"
        style:display="grid"
        style:gap="24px"
        style:background="var(--neutral-1)"
        style:color="var(--neutral-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
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
          <Row>
            {SIZES.map((size) => (
              <label
                style:display="inline-flex"
                style:align-items="center"
                style:gap="0.5em"
              >
                <input
                  type="checkbox"
                  role="switch"
                  class:unset
                  class:x-switch
                  data-size={String(size)}
                  checked
                />
                <span>Size {size}</span>
              </label>
            ))}
          </Row>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Variants</h3>
          <div style:display="grid" style:gap="16px">
            {VARIANTS.map((variant) => (
              <div>
                <code
                  style:font-size="12px"
                  style:color="var(--neutral-11)"
                  style:display="block"
                  style:margin-bottom="8px"
                >
                  data-variant="{variant}"
                </code>
                <Row>
                  <label
                    style:display="inline-flex"
                    style:align-items="center"
                    style:gap="0.5em"
                  >
                    <input
                      type="checkbox"
                      role="switch"
                      class:unset
                      class:x-switch
                      data-variant={variant}
                    />
                    <span>Off</span>
                  </label>
                  <label
                    style:display="inline-flex"
                    style:align-items="center"
                    style:gap="0.5em"
                  >
                    <input
                      type="checkbox"
                      role="switch"
                      class:unset
                      class:x-switch
                      data-variant={variant}
                      checked
                    />
                    <span>On</span>
                  </label>
                  <label
                    style:display="inline-flex"
                    style:align-items="center"
                    style:gap="0.5em"
                    style:color="var(--neutral-a8)"
                  >
                    <input
                      type="checkbox"
                      role="switch"
                      class:unset
                      class:x-switch
                      data-variant={variant}
                      disabled
                    />
                    <span>Disabled off</span>
                  </label>
                  <label
                    style:display="inline-flex"
                    style:align-items="center"
                    style:gap="0.5em"
                    style:color="var(--neutral-a8)"
                  >
                    <input
                      type="checkbox"
                      role="switch"
                      class:unset
                      class:x-switch
                      data-variant={variant}
                      checked
                      disabled
                    />
                    <span>Disabled on</span>
                  </label>
                </Row>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">High contrast</h3>
          <Row>
            {VARIANTS.map((variant) => (
              <label
                style:display="inline-flex"
                style:align-items="center"
                style:gap="0.5em"
              >
                <input
                  type="checkbox"
                  role="switch"
                  class:unset
                  class:x-switch
                  data-variant={variant}
                  data-high-contrast
                  checked
                />
                <span>{variant}</span>
              </label>
            ))}
          </Row>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Accent colors</h3>
          <Row>
            {ACCENTS.map((color) => (
              <label
                style:display="inline-flex"
                style:align-items="center"
                style:gap="0.5em"
              >
                <input
                  type="checkbox"
                  role="switch"
                  class:unset
                  class:x-switch
                  data-accent={color}
                  checked
                />
                <span>{color}</span>
              </label>
            ))}
          </Row>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Settings list</h3>
          <div
            style:display="flex"
            style:flex-direction="column"
            style:gap="12px"
            style:max-width="320px"
          >
            {[
              ["Email notifications", true],
              ["Push notifications", false],
              ["Weekly digest", true],
              ["Beta features", false],
            ].map(([label, on]) => (
              <label
                style:display="flex"
                style:justify-content="space-between"
                style:align-items="center"
                style:gap="1rem"
                style:padding="8px 0"
                style:border-bottom="1px solid var(--neutral-a4)"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  role="switch"
                  class:unset
                  class:x-switch
                  checked={on as boolean}
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    );
  }
}
