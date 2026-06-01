import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/neutral.css";
import "elements-kit/ui/styles/base/neutral.css";
import "elements-kit/ui/styles/accent/base.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/accent/mint.css";
import "elements-kit/ui/styles/palette/blue.css";
import "elements-kit/ui/styles/accent/blue.css";
import "elements-kit/ui/styles/palette/iris.css";
import "elements-kit/ui/styles/accent/iris.css";
import "elements-kit/ui/styles/palette/crimson.css";
import "elements-kit/ui/styles/accent/crimson.css";

import "elements-kit/ui/button/button.css";
import "elements-kit/ui/select/select.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const SIZES = [1, 2, 3] as const;
const VARIANTS = ["surface", "soft", "text"] as const;
const ACCENTS = ["base", "mint", "blue", "iris", "crimson"] as const;

const FRUITS = ["Apple", "Orange", "Pear", "Mango", "Kiwi"];

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

function Options() {
  return (
    <>
      {FRUITS.map((f) => (
        <option value={f.toLowerCase()}>{f}</option>
      ))}
    </>
  );
}

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
          <SectionHeading>Basic</SectionHeading>
          <Row>
            <select class:x-select class:unset data-variant="surface">
              <Options />
            </select>
            <select class:x-select class:unset data-variant="soft">
              <Options />
            </select>
            <select class:x-select class:unset data-variant="text">
              <Options />
            </select>
          </Row>
        </section>

        <section>
          <SectionHeading>
            Truncation ·{" "}
            <small style:color="var(--base-color-a10)" style:font-weight="400">
              fixed <code>width</code> (not <code>min-width</code>) triggers
              ellipsis on long options
            </small>
          </SectionHeading>
          <Row>
            <select
              class:x-select
              class:unset
              data-variant="surface"
              style:width="16ch"
            >
              <option>A really long option label that overflows</option>
              <option>Short</option>
              <option>Medium length one</option>
            </select>
            <select
              class:x-select
              class:unset
              data-variant="soft"
              style:width="16ch"
            >
              <option>
                Another lengthy option that demonstrates the ellipsis
              </option>
              <option>Short</option>
            </select>
          </Row>
        </section>

        <section>
          <SectionHeading>Sizes</SectionHeading>
          <div style:display="grid" style:gap="12px">
            {SIZES.map((size) => (
              <Row>
                <select
                  class:x-select
                  class:unset
                  data-size={String(size)}
                  data-variant="surface"
                >
                  <Options />
                </select>
                <select
                  class:x-select
                  class:unset
                  data-size={String(size)}
                  data-variant="soft"
                >
                  <Options />
                </select>
                <select
                  class:x-select
                  class:unset
                  data-size={String(size)}
                  data-variant="text"
                >
                  <Options />
                </select>
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
                  <select class:x-select class:unset data-variant={variant}>
                    <Options />
                  </select>
                  <select
                    class:x-select
                    class:unset
                    data-variant={variant}
                    disabled
                  >
                    <Options />
                  </select>
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
                  <select
                    class:x-select
                    class:unset
                    data-variant={variant}
                    data-accent={color}
                  >
                    <option>
                      {color} · {variant}
                    </option>
                    <Options />
                  </select>
                ))}
              </Row>
            ))}
          </div>
        </section>
      </div>
    );
  }
}
