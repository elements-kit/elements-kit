import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/neutral/gray.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/accent/mint.css";
import "elements-kit/ui/styles/shadow.css";
import "elements-kit/ui/styles/material.css";
import "elements-kit/ui/card/card.css";
import "elements-kit/ui/marketing/marketing.css";
import "elements-kit/ui/button/button.css";

import { signal } from "elements-kit/signals";

const dark = signal(true);

function Label({ children }: { children: any }) {
  return (
    <div
      style:font-family="var(--code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace)"
      style:font-size="11px"
      style:font-weight="600"
      style:letter-spacing="0.04em"
      style:text-transform="uppercase"
      style:color="var(--neutral-11)"
      style:margin="40px 0 12px"
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
        style={{
          "--page-padding-left": "24px",
          "--page-padding-right": "24px",
          "--page-max-width": "1024px",
        }}
        style:color="var(--neutral-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
        style:min-height="100vh"
        style:padding-bottom="64px"
      >
        <div
          style:padding="12px 24px"
          style:display="flex"
          style:justify-content="flex-end"
          style:border-bottom="1px solid var(--neutral-a6)"
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
        </div>

        <div class:page-container>
          <Label>data-align="center" (default)</Label>
          <div class:x-card class:cta-banner>
            <h2 class:section-heading class:section-heading-2>
              Ship faster with composable primitives.
            </h2>
            <p class:section-paragraph>
              Drop the kit into any framework. Class + data-attribute API, no
              runtime, no theming surprises.
            </p>
            <div data-cta>
              <a
                class:unset
                class:x-button
                data-size="3"
                data-variant="solid"
                href="#"
              >
                Get in touch
              </a>
              <a
                class:unset
                class:x-button
                data-size="3"
                data-variant="borderless"
                href="#"
              >
                Learn more
              </a>
            </div>
          </div>

          <Label>data-align="start"</Label>
          <div class:x-card class:cta-banner data-align="start">
            <h2 class:section-heading class:section-heading-2>
              Start-aligned variant
            </h2>
            <p class:section-paragraph>
              Same primitive, flipped to start alignment for a denser, less
              ceremonial CTA.
            </p>
            <div data-cta>
              <a
                class:unset
                class:x-button
                data-size="3"
                data-variant="solid"
                href="#"
              >
                Get in touch
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
