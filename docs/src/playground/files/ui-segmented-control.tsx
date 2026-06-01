import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/shadow.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/neutral/gray.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/accent/mint.css";
import "elements-kit/ui/styles/palette/iris.css";
import "elements-kit/ui/styles/accent/iris.css";
import "elements-kit/ui/styles/palette/crimson.css";
import "elements-kit/ui/styles/accent/crimson.css";

import "elements-kit/ui/button/button.css";
import "elements-kit/ui/segmented-control/segmented-control.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const SIZES = [1, 2, 3] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "iris", "crimson"] as const;

function SectionHeading({
  children,
  caption,
}: {
  children: any;
  caption?: string;
}) {
  return (
    <div style:margin="0 0 12px">
      <h3 style:margin="0" style:font-size="14px" style:font-weight="600">
        {children}
      </h3>
      {caption ? (
        <code
          style:font-size="12px"
          style:color="var(--neutral-11)"
          style:display="block"
          style:margin-top="4px"
        >
          {caption}
        </code>
      ) : null}
    </div>
  );
}

function Stack({ children }: { children: any }) {
  return (
    <div
      style:display="flex"
      style:flex-direction="column"
      style:gap="12px"
      style:align-items="flex-start"
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
        data-neutral="gray"
        data-radius="medium"
        style:padding="24px"
        style:display="grid"
        style:gap="28px"
        style:color="var(--neutral-12)"
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
          <SectionHeading caption='data-size="1" | "2" | "3"'>
            Sizes
          </SectionHeading>
          <Stack>
            {SIZES.map((size) => (
              <div
                class:unset
                class:x-segmented-control
                data-size={String(size)}
                role="radiogroup"
                aria-label={`Size ${size}`}
              >
                <label>
                  <input
                    type="radio"
                    name={`size-${size}`}
                    value="day"
                    checked
                  />
                  <span>Day</span>
                </label>
                <label>
                  <input type="radio" name={`size-${size}`} value="week" />
                  <span>Week</span>
                </label>
                <label>
                  <input type="radio" name={`size-${size}`} value="month" />
                  <span>Month</span>
                </label>
                <label>
                  <input type="radio" name={`size-${size}`} value="year" />
                  <span>Year</span>
                </label>
              </div>
            ))}
          </Stack>
        </section>

        <section>
          <SectionHeading caption='data-variant="surface" | "soft"'>
            Variants
          </SectionHeading>
          <Stack>
            {VARIANTS.map((variant) => (
              <div
                class:unset
                class:x-segmented-control
                data-variant={variant}
                role="radiogroup"
                aria-label={variant}
              >
                <label>
                  <input
                    type="radio"
                    name={`v-${variant}`}
                    value="grid"
                    checked
                  />
                  <span>Grid</span>
                </label>
                <label>
                  <input type="radio" name={`v-${variant}`} value="list" />
                  <span>List</span>
                </label>
                <label>
                  <input type="radio" name={`v-${variant}`} value="kanban" />
                  <span>Kanban</span>
                </label>
              </div>
            ))}
          </Stack>
        </section>

        <section>
          <SectionHeading caption='data-accent="<scale>"'>
            Accent colors
          </SectionHeading>
          <Stack>
            {ACCENTS.map((color) => (
              <div
                class:unset
                class:x-segmented-control
                data-variant="soft"
                data-accent={color}
                role="radiogroup"
                aria-label={color}
              >
                <label>
                  <input type="radio" name={`c-${color}`} value="a" />
                  <span>One</span>
                </label>
                <label>
                  <input type="radio" name={`c-${color}`} value="b" checked />
                  <span>Two</span>
                </label>
                <label>
                  <input type="radio" name={`c-${color}`} value="c" />
                  <span>Three</span>
                </label>
              </div>
            ))}
          </Stack>
        </section>

        <section>
          <SectionHeading caption="data-high-contrast">
            High contrast
          </SectionHeading>
          <div
            class:unset
            class:x-segmented-control
            data-high-contrast
            role="radiogroup"
            aria-label="High contrast"
          >
            <label>
              <input type="radio" name="hc" value="left" checked />
              <span>Left</span>
            </label>
            <label>
              <input type="radio" name="hc" value="center" />
              <span>Center</span>
            </label>
            <label>
              <input type="radio" name="hc" value="right" />
              <span>Right</span>
            </label>
          </div>
        </section>

        <section>
          <SectionHeading caption="fieldset + legend = free a11y">
            With a group label
          </SectionHeading>
          <fieldset
            class:unset
            style:display="grid"
            style:gap="6px"
            style:width="fit-content"
          >
            <legend style:font-size="13px" style:color="var(--neutral-11)">
              View density
            </legend>
            <div class:unset class:x-segmented-control role="radiogroup">
              <label>
                <input type="radio" name="density" value="compact" checked />
                <span>Compact</span>
              </label>
              <label>
                <input type="radio" name="density" value="cozy" />
                <span>Cozy</span>
              </label>
              <label>
                <input type="radio" name="density" value="comfy" />
                <span>Comfortable</span>
              </label>
            </div>
          </fieldset>
        </section>

        <section>
          <SectionHeading caption="fieldset disabled + per-input disabled">
            Disabled
          </SectionHeading>
          <Stack>
            <fieldset
              class:unset
              disabled
              style:display="grid"
              style:gap="6px"
              style:width="fit-content"
            >
              <legend style:font-size="13px" style:color="var(--neutral-11)">
                Whole group
              </legend>
              <div
                class:unset
                class:x-segmented-control
                data-disabled
                role="radiogroup"
              >
                <label>
                  <input type="radio" name="d1" value="a" checked />
                  <span>One</span>
                </label>
                <label>
                  <input type="radio" name="d1" value="b" />
                  <span>Two</span>
                </label>
              </div>
            </fieldset>

            <div
              class:unset
              class:x-segmented-control
              role="radiogroup"
              aria-label="Per-segment disabled"
            >
              <label>
                <input type="radio" name="hz" value="60" checked />
                <span>60 Hz</span>
              </label>
              <label>
                <input type="radio" name="hz" value="120" />
                <span>120 Hz</span>
              </label>
              <label>
                <input type="radio" name="hz" value="144" disabled />
                <span>144 Hz</span>
              </label>
            </div>
          </Stack>
        </section>

        <section>
          <SectionHeading caption="N = 11">Many segments</SectionHeading>
          <div
            class:unset
            class:x-segmented-control
            data-size="1"
            role="radiogroup"
            aria-label="Hour"
          >
            {Array.from({ length: 11 }).map((_, i) => (
              <label>
                <input
                  type="radio"
                  name="hour"
                  value={String(i)}
                  checked={i === 5}
                />
                <span>{String(i)}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading caption='dir="rtl"'>Right-to-left</SectionHeading>
          <div
            dir="rtl"
            class:unset
            class:x-segmented-control
            role="radiogroup"
            aria-label="rtl"
          >
            <label>
              <input type="radio" name="rtl" value="r" />
              <span>يمين</span>
            </label>
            <label>
              <input type="radio" name="rtl" value="c" checked />
              <span>وسط</span>
            </label>
            <label>
              <input type="radio" name="rtl" value="l" />
              <span>يسار</span>
            </label>
          </div>
        </section>
      </div>
    );
  }
}
