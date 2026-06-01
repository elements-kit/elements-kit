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
          <Label>Default (medium)</Label>
          <div class:statistic>
            <p data-leading>Up to</p>
            <p data-heading>75%</p>
            <p data-description>faster builds across the engineering org.</p>
          </div>

          <Label>data-size="1" (small)</Label>
          <div class:statistic data-size="1">
            <p data-leading>Up to</p>
            <p data-heading>75%</p>
            <p data-description>faster builds across the engineering org.</p>
          </div>

          <Label>data-size="3" (large display)</Label>
          <div class:statistic data-size="3">
            <p data-leading>Up to</p>
            <p data-heading>75%</p>
            <p data-description>faster builds across the engineering org.</p>
          </div>

          <Label>data-align="center"</Label>
          <div class:statistic data-align="center">
            <p data-leading>Up to</p>
            <p data-heading>99.99%</p>
            <p data-description>uptime across managed deployments.</p>
          </div>

          <Label>3-up row</Label>
          <div
            style:display="grid"
            style:grid-template-columns="repeat(3, minmax(0, 1fr))"
            style:gap="32px"
          >
            <div class:statistic>
              <p data-leading>Used by</p>
              <p data-heading>120+</p>
              <p data-description>teams shipping to production.</p>
            </div>
            <div class:statistic>
              <p data-leading>Average</p>
              <p data-heading>3.2×</p>
              <p data-description>faster page assembly.</p>
            </div>
            <div class:statistic>
              <p data-leading>Since</p>
              <p data-heading>2024</p>
              <p data-description>with monthly releases.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
