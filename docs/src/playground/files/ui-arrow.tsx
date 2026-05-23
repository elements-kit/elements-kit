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

import "elements-kit/ui/arrow/arrow.css";
import "elements-kit/ui/button/button.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const SIZES = ["12px", "16px", "20px", "28px"] as const;
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
        style:max-width="560px"
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
          <h3 style:margin="0 0 12px">Inside a primary CTA</h3>
          <a
            class:unset
            class:x-button
            data-variant="solid"
            data-size="2"
            href="#"
          >
            Get started
            <span class:x-arrow aria-hidden="true" />
          </a>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Inside a text link</h3>
          <div style:display="grid" style:gap="8px">
            <a
              class:unset
              href="#"
              style:color="var(--color-11)"
              style:display="inline-flex"
              style:align-items="center"
              style:gap="0.25em"
              style:width="fit-content"
            >
              Read the guide
              <span class:x-arrow aria-hidden="true" />
            </a>
            <a
              class:unset
              href="#"
              style:color="var(--base-color-12)"
              style:display="inline-flex"
              style:align-items="center"
              style:gap="0.25em"
              style:width="fit-content"
            >
              Schedule a demo
              <span class:x-arrow aria-hidden="true" />
            </a>
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Sizes (via font-size)</h3>
          <div style:display="grid" style:gap="12px">
            {SIZES.map((size) => (
              <a
                class:unset
                href="#"
                style:font-size={size}
                style:color="var(--base-color-12)"
                style:display="inline-flex"
                style:align-items="center"
                style:gap="0.25em"
                style:width="fit-content"
              >
                {size}
                <span class:x-arrow aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Accents (via currentColor)</h3>
          <div style:display="grid" style:gap="8px">
            {ACCENTS.map((color) => (
              <a
                class:unset
                href="#"
                data-color={color}
                style:color="var(--color-11)"
                style:display="inline-flex"
                style:align-items="center"
                style:gap="0.25em"
                style:width="fit-content"
              >
                {color}
                <span class:x-arrow aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>

        <section dir="rtl">
          <h3 style:margin="0 0 12px" style:text-align="right">
            RTL (dir="rtl")
          </h3>
          <a
            class:unset
            class:x-button
            data-variant="soft"
            data-size="2"
            href="#"
          >
            اطلب عرضًا
            <span class:x-arrow aria-hidden="true" />
          </a>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Reduced motion</h3>
          <p
            style:font-size="13px"
            style:color="var(--base-color-11)"
            style:margin="0 0 8px"
          >
            With <code>prefers-reduced-motion: reduce</code>, the arrow jumps to
            its hovered state instantly — no animation, but the end state is
            preserved so the affordance still reads.
          </p>
          <a
            class:unset
            href="#"
            style:color="var(--base-color-12)"
            style:display="inline-flex"
            style:align-items="center"
            style:gap="0.25em"
            style:width="fit-content"
          >
            Hover or focus me
            <span class:x-arrow aria-hidden="true" />
          </a>
        </section>
      </div>
    );
  }
}
