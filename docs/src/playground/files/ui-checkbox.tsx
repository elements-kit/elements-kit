import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/shadow.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
// pick a neutral palette for --base-color-* (must match data-base-color on root):
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";
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

import "elements-kit/ui/card/card.css";
import "elements-kit/ui/checkbox/checkbox.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const SIZES = [1, 2, 3] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "iris", "crimson", "amber"] as const;

const setIndeterminate = (el: HTMLInputElement) => {
  el.indeterminate = true;
};

function SectionHeading({ children }: { children: any }) {
  return (
    <h3
      style:margin="0 0 12px"
      style:font-size="14px"
      style:font-weight="600"
    >
      {children}
    </h3>
  );
}

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
          <SectionHeading>Theme</SectionHeading>
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
          <SectionHeading>Sizes</SectionHeading>
          <Row>
            {SIZES.map((size) => (
              <label
                style:display="inline-flex"
                style:align-items="center"
                style:gap="0.5em"
              >
                <input
                  type="checkbox"
                  class:unset
                  class:x-checkbox
                  data-size={String(size)}
                  checked
                />
                <span>Size {size}</span>
              </label>
            ))}
          </Row>
        </section>

        <section>
          <SectionHeading>Variants</SectionHeading>
          <div style:display="grid" style:gap="16px">
            {VARIANTS.map((variant) => (
              <div>
                <code
                  style:font-size="12px"
                  style:color="var(--base-color-11)"
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
                      class:unset
                      class:x-checkbox
                      data-variant={variant}
                    />
                    <span>Unchecked</span>
                  </label>
                  <label
                    style:display="inline-flex"
                    style:align-items="center"
                    style:gap="0.5em"
                  >
                    <input
                      type="checkbox"
                      class:unset
                      class:x-checkbox
                      data-variant={variant}
                      checked
                    />
                    <span>Checked</span>
                  </label>
                  <label
                    style:display="inline-flex"
                    style:align-items="center"
                    style:gap="0.5em"
                  >
                    <input
                      type="checkbox"
                      class:unset
                      class:x-checkbox
                      data-variant={variant}
                      ref={setIndeterminate}
                    />
                    <span>Indeterminate</span>
                  </label>
                  <label
                    style:display="inline-flex"
                    style:align-items="center"
                    style:gap="0.5em"
                    style:color="var(--base-color-a8)"
                  >
                    <input
                      type="checkbox"
                      class:unset
                      class:x-checkbox
                      data-variant={variant}
                      checked
                      disabled
                    />
                    <span>Disabled</span>
                  </label>
                </Row>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading>High contrast</SectionHeading>
          <Row>
            {VARIANTS.map((variant) => (
              <label
                style:display="inline-flex"
                style:align-items="center"
                style:gap="0.5em"
              >
                <input
                  type="checkbox"
                  class:unset
                  class:x-checkbox
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
          <SectionHeading>Accent colors</SectionHeading>
          <Row>
            {ACCENTS.map((color) => (
              <label
                style:display="inline-flex"
                style:align-items="center"
                style:gap="0.5em"
              >
                <input
                  type="checkbox"
                  class:unset
                  class:x-checkbox
                  data-color={color}
                  checked
                />
                <span>{color}</span>
              </label>
            ))}
          </Row>
        </section>

        <section>
          <SectionHeading>With labels</SectionHeading>
          <div
            style:display="flex"
            style:flex-direction="column"
            style:gap="var(--space-1)"
          >
            <label
              style:display="inline-flex"
              style:align-items="center"
              style:gap="0.5em"
              style:width="fit-content"
            >
              <input type="checkbox" class:unset class:x-checkbox />
              <span>Subscribe to product updates</span>
            </label>
            <label
              style:display="inline-flex"
              style:align-items="center"
              style:gap="0.5em"
              style:width="fit-content"
            >
              <input type="checkbox" class:unset class:x-checkbox checked />
              <span>Weekly digest</span>
            </label>
            <label
              style:display="inline-flex"
              style:align-items="center"
              style:gap="0.5em"
              style:width="fit-content"
            >
              <input type="checkbox" class:unset class:x-checkbox />
              <span>Security alerts</span>
            </label>
          </div>
        </section>

        <section>
          <SectionHeading>
            Checkbox cards <small style:color="var(--base-color-a10)" style:font-weight="400">composition with .x-card</small>
          </SectionHeading>
          <div
            style:display="grid"
            style:gap="12px"
            style:grid-template-columns="repeat(auto-fit, minmax(220px, 1fr))"
          >
            <label
              class:unset
              class:x-card
              data-size="2"
              style:display="flex"
              style:align-items="flex-start"
              style:gap="12px"
              style:cursor="pointer"
            >
              <input
                type="checkbox"
                class:unset
                class:x-checkbox
                style:margin-top="2px"
                checked
              />
              <div>
                <div style:font-weight="600" style:margin-bottom="2px">
                  Hobby
                </div>
                <div style:color="var(--base-color-11)" style:font-size="13px">
                  Free forever. Personal projects only.
                </div>
              </div>
            </label>
            <label
              class:unset
              class:x-card
              data-size="2"
              style:display="flex"
              style:align-items="flex-start"
              style:gap="12px"
              style:cursor="pointer"
            >
              <input
                type="checkbox"
                class:unset
                class:x-checkbox
                style:margin-top="2px"
              />
              <div>
                <div style:font-weight="600" style:margin-bottom="2px">
                  Pro
                </div>
                <div style:color="var(--base-color-11)" style:font-size="13px">
                  Unlimited projects, priority support.
                </div>
              </div>
            </label>
            <label
              class:unset
              class:x-card
              data-size="2"
              style:display="flex"
              style:align-items="flex-start"
              style:gap="12px"
              style:cursor="pointer"
            >
              <input
                type="checkbox"
                class:unset
                class:x-checkbox
                style:margin-top="2px"
              />
              <div>
                <div style:font-weight="600" style:margin-bottom="2px">
                  Enterprise
                </div>
                <div style:color="var(--base-color-11)" style:font-size="13px">
                  SSO, audit logs, dedicated SLA.
                </div>
              </div>
            </label>
          </div>
        </section>
      </div>
    );
  }
}
