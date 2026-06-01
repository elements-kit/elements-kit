import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/shadow.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
// pick a neutral palette for --base-color-* (must match data-base-color on root):
import "elements-kit/ui/styles/palette/neutral.css";
import "elements-kit/ui/styles/base/neutral.css";
// import any color scales you want to use for accent theming:
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

import "elements-kit/ui/card/card.css";
import "elements-kit/ui/radio/radio.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const SIZES = [1, 2, 3] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "iris", "crimson", "amber"] as const;

function SectionHeading({ children }: { children: any }) {
  return (
    <h3 style:margin="0 0 12px" style:font-size="14px" style:font-weight="600">
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
        data-accent="mint"
        data-base-color="neutral"
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
            {SIZES.map((size, i) => (
              <label
                style:display="inline-flex"
                style:align-items="center"
                style:gap="0.5em"
              >
                <input
                  type="radio"
                  class:unset
                  class:x-radio
                  name="size"
                  value={String(size)}
                  data-size={String(size)}
                  checked={i === 1}
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
                      type="radio"
                      class:unset
                      class:x-radio
                      name={`variant-${variant}`}
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
                      type="radio"
                      class:unset
                      class:x-radio
                      name={`variant-${variant}`}
                      data-variant={variant}
                      checked
                    />
                    <span>Checked</span>
                  </label>
                  <label
                    style:display="inline-flex"
                    style:align-items="center"
                    style:gap="0.5em"
                    style:color="var(--base-color-a8)"
                  >
                    <input
                      type="radio"
                      class:unset
                      class:x-radio
                      name={`variant-${variant}-disabled`}
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
                  type="radio"
                  class:unset
                  class:x-radio
                  name={`hc-${variant}`}
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
                  type="radio"
                  class:unset
                  class:x-radio
                  name={`accent-${color}`}
                  data-accent={color}
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
              <input
                type="radio"
                class:unset
                class:x-radio
                name="plan"
                value="hobby"
                checked
              />
              <span>Hobby — free forever</span>
            </label>
            <label
              style:display="inline-flex"
              style:align-items="center"
              style:gap="0.5em"
              style:width="fit-content"
            >
              <input
                type="radio"
                class:unset
                class:x-radio
                name="plan"
                value="pro"
              />
              <span>Pro — $19/mo</span>
            </label>
            <label
              style:display="inline-flex"
              style:align-items="center"
              style:gap="0.5em"
              style:width="fit-content"
            >
              <input
                type="radio"
                class:unset
                class:x-radio
                name="plan"
                value="enterprise"
              />
              <span>Enterprise — contact us</span>
            </label>
          </div>
        </section>

        <section>
          <SectionHeading>
            Radio cards{" "}
            <small style:color="var(--base-color-a10)" style:font-weight="400">
              composition with .x-card
            </small>
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
                type="radio"
                class:unset
                class:x-radio
                name="plan-card"
                value="hobby"
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
                type="radio"
                class:unset
                class:x-radio
                name="plan-card"
                value="pro"
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
                type="radio"
                class:unset
                class:x-radio
                name="plan-card"
                value="enterprise"
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
