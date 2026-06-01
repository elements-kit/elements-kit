import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/neutral.css";
import "elements-kit/ui/styles/base/neutral.css";
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
      style:color="var(--base-color-11)"
      style:margin="40px 0 12px"
    >
      {children}
    </div>
  );
}

function CircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      style:width="2rem"
      style:height="2rem"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
function SquareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      style:width="2rem"
      style:height="2rem"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
    </svg>
  );
}
function TriangleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      style:width="2rem"
      style:height="2rem"
    >
      <polygon points="12,2 22,20 2,20" />
    </svg>
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
        style={{
          "--page-padding-left": "24px",
          "--page-padding-right": "24px",
          "--page-max-width": "1024px",
        }}
        style:color="var(--base-color-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
        style:min-height="100vh"
        style:padding-bottom="64px"
      >
        <div
          style:padding="12px 24px"
          style:display="flex"
          style:justify-content="flex-end"
          style:border-bottom="1px solid var(--base-color-a6)"
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
          <Label>Default (no border)</Label>
          <div class:pillar>
            <CircleIcon />
            <h4 data-heading>Composable</h4>
            <p data-paragraph>
              Class + data attributes only. No JS. Drop into any framework.
            </p>
            <a
              class:unset
              class:x-button
              data-size="2"
              data-variant="text"
              href="#"
            >
              Learn more
            </a>
          </div>

          <Label>Composed with .x-card</Label>
          <div class:x-card class:pillar>
            <SquareIcon />
            <h4 data-heading>Themeable</h4>
            <p data-paragraph>
              Colors flow from <code>--accent-*</code> tokens. Swap once,
              applies everywhere.
            </p>
            <a
              class:unset
              class:x-button
              data-size="2"
              data-variant="text"
              href="#"
            >
              Learn more
            </a>
          </div>

          <Label>data-align="center"</Label>
          <div class:pillar data-align="center">
            <TriangleIcon />
            <h4 data-heading>Responsive</h4>
            <p data-paragraph>Mobile-first. No JS resize handlers.</p>
          </div>

          <Label>3-up grid</Label>
          <div
            style:display="grid"
            style:gap="32px"
            style:grid-template-columns="repeat(auto-fit, minmax(240px, 1fr))"
          >
            <div class:pillar>
              <CircleIcon />
              <h4 data-heading>Composable</h4>
              <p data-paragraph>Class + data attributes only. No JS.</p>
              <a
                class:unset
                class:x-button
                data-size="2"
                data-variant="text"
                href="#"
              >
                Learn more
              </a>
            </div>
            <div class:pillar>
              <SquareIcon />
              <h4 data-heading>Themeable</h4>
              <p data-paragraph>Tokens flow through every variant.</p>
              <a
                class:unset
                class:x-button
                data-size="2"
                data-variant="text"
                href="#"
              >
                Learn more
              </a>
            </div>
            <div class:pillar>
              <TriangleIcon />
              <h4 data-heading>Responsive</h4>
              <p data-paragraph>Mobile-first. No JS resize handlers.</p>
              <a
                class:unset
                class:x-button
                data-size="2"
                data-variant="text"
                href="#"
              >
                Learn more
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
