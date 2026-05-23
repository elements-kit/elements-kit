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

import "elements-kit/ui/text-input/text-input.css";
import "elements-kit/ui/button/button.css";
import "elements-kit/ui/kbd/kbd.css";

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
          <h3 style:margin="0 0 12px">Sizes — bare input</h3>
          <div style:display="grid" style:gap="12px">
            {SIZES.map((size) => (
              <input
                class:unset
                class:x-text-input
                data-size={String(size)}
                placeholder={`Size ${size}`}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Variants</h3>
          <div style:display="grid" style:gap="12px">
            {VARIANTS.map((variant) => (
              <input
                class:unset
                class:x-text-input
                data-variant={variant}
                placeholder={`data-variant="${variant}"`}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Accent colors</h3>
          <div style:display="grid" style:gap="12px">
            {ACCENTS.map((color) => (
              <input
                class:unset
                class:x-text-input
                data-color={color}
                data-variant="soft"
                placeholder={color}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Input wrapper — start / end</h3>
          <div style:display="grid" style:gap="12px">
            {SIZES.map((size) => (
              <div class:x-text-input data-size={String(size)}>
                <span aria-hidden="true">🔍</span>
                <input class:unset placeholder="Search…" />
                <kbd
                  class:unset
                  class:x-kbd
                  data-size={String(size)}
                  style:margin-block="auto"
                  style:margin-inline="4px"
                >
                  ⌘K
                </kbd>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Text area — bare</h3>
          <textarea
            class:unset
            class:x-text-input
            placeholder="Write something…"
            rows={4}
          />
        </section>

        <section>
          <h3 style:margin="0 0 12px">Text area wrapper — top / bottom</h3>
          <div class:x-text-input data-size="2">
            <div
              style:padding="6px 10px"
              style:font-size="12px"
              style:color="var(--base-color-a11)"
              style:border-bottom="1px solid var(--base-color-a4)"
            >
              Markdown
            </div>
            <textarea
              class:unset
              placeholder="Write something…"
              rows={4}
            />
            <div
              style:padding="6px 8px"
              style:border-top="1px solid var(--base-color-a4)"
              style:display="flex"
              style:align-items="center"
              style:justify-content="space-between"
              style:gap="8px"
            >
              <span
                style:font-size="12px"
                style:color="var(--base-color-a11)"
              >
                0 / 280
              </span>
              <button
                class:unset
                class:x-button
                data-size="1"
                data-variant="solid"
              >
                Send
              </button>
            </div>
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Disabled</h3>
          <div style:display="grid" style:gap="12px">
            <input
              class:unset
              class:x-text-input
              placeholder="Disabled input"
              disabled
            />
            <div class:x-text-input>
              <span aria-hidden="true">🔍</span>
              <input class:unset placeholder="Disabled wrapped input" disabled />
            </div>
            <textarea
              class:unset
              class:x-text-input
              placeholder="Disabled textarea"
              rows={2}
              disabled
            />
          </div>
        </section>
      </div>
    );
  }
}
