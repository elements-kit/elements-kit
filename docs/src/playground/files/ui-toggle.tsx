import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";
import "elements-kit/ui/styles/colors/base.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/colors/mint.css";
import "elements-kit/ui/styles/palette/blue.css";
import "elements-kit/ui/styles/colors/blue.css";
import "elements-kit/ui/styles/palette/iris.css";
import "elements-kit/ui/styles/colors/iris.css";
import "elements-kit/ui/styles/palette/crimson.css";
import "elements-kit/ui/styles/colors/crimson.css";

import "elements-kit/ui/button/button.css";
import "elements-kit/ui/toggle/toggle.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const SIZES = [1, 2, 3] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["base", "mint", "blue", "iris", "crimson"] as const;

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
      style:gap="8px"
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
        data-color="mint"
        data-base-color="gray"
        data-radius="medium"
        style:padding="24px"
        style:display="grid"
        style:gap="32px"
        style:background="var(--base-color-1)"
        style:color="var(--base-color-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
        style:max-width="640px"
      >
        <button
          class:unset
          class:x-button
          data-size="1"
          data-variant="soft"
          style:width="fit-content"
          on:click={() => dark(!dark())}
        >
          {() => (dark() ? "☀ Light" : "☾ Dark")}
        </button>

        <section>
          <SectionHeading>Binary toggle (checkbox)</SectionHeading>
          <Row>
            <label class:x-toggle data-icon style:font-weight="bold">
              <input type="checkbox" class:unset />B
            </label>
            <label class:x-toggle data-icon style:font-style="italic">
              <input type="checkbox" class:unset checked />I
            </label>
            <label class:x-toggle style:text-decoration="underline">
              <input type="checkbox" class:unset />U
            </label>
          </Row>
        </section>

        <section>
          <SectionHeading>Exclusive group (radio, shared name)</SectionHeading>
          <Row>
            <label class:x-toggle>
              <input type="radio" name="align" class:unset />
              Left
            </label>
            <label class:x-toggle>
              <input type="radio" name="align" class:unset checked />
              Center
            </label>
            <label class:x-toggle>
              <input type="radio" name="align" class:unset />
              Right
            </label>
            <label class:x-toggle>
              <input type="radio" name="align" class:unset />
              Justify
            </label>
          </Row>
        </section>

        <section>
          <SectionHeading>Sizes</SectionHeading>
          <div style:display="grid" style:gap="12px">
            {SIZES.map((size) => (
              <Row>
                <label class:x-toggle data-size={String(size)}>
                  <input type="checkbox" class:unset />
                  Size {size}
                </label>
                <label class:x-toggle data-size={String(size)}>
                  <input type="checkbox" class:unset checked />
                  Size {size}
                </label>
              </Row>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading>Variants</SectionHeading>
          <div style:display="grid" style:gap="16px">
            {VARIANTS.map((variant) => (
              <div>
                <code
                  style:font-size="12px"
                  style:color="var(--base-color-a10)"
                  style:display="block"
                  style:margin-bottom="8px"
                >
                  data-variant="{variant}"
                </code>
                <Row>
                  <label class:x-toggle data-variant={variant}>
                    <input type="checkbox" class:unset />
                    Off
                  </label>
                  <label class:x-toggle data-variant={variant}>
                    <input type="checkbox" class:unset checked />
                    On
                  </label>
                  <label class:x-toggle data-variant={variant}>
                    <input type="checkbox" class:unset disabled />
                    Disabled
                  </label>
                  <label class:x-toggle data-variant={variant}>
                    <input type="checkbox" class:unset checked disabled />
                    On + Disabled
                  </label>
                </Row>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading>Accent colors</SectionHeading>
          <div style:display="grid" style:gap="12px">
            {ACCENTS.map((color) => (
              <Row>
                {VARIANTS.map((variant) => (
                  <label
                    class:x-toggle
                    data-variant={variant}
                    data-color={color}
                  >
                    <input type="checkbox" class:unset checked />
                    {color} · {variant}
                  </label>
                ))}
              </Row>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading>
            Radio group ·{" "}
            <small style:color="var(--base-color-a10)" style:font-weight="400">
              filter chips
            </small>
          </SectionHeading>
          <Row>
            <label class:x-toggle data-variant="soft" data-color="iris">
              <input type="radio" name="filter" class:unset checked />
              All
            </label>
            <label class:x-toggle data-variant="soft" data-color="iris">
              <input type="radio" name="filter" class:unset />
              Open
            </label>
            <label class:x-toggle data-variant="soft" data-color="iris">
              <input type="radio" name="filter" class:unset />
              In progress
            </label>
            <label class:x-toggle data-variant="soft" data-color="iris">
              <input type="radio" name="filter" class:unset />
              Done
            </label>
          </Row>
        </section>
      </div>
    );
  }
}
