import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/colors/gray.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/colors/mint.css";
import "elements-kit/ui/styles/palette/slate.css";
import "elements-kit/ui/styles/base/slate.css";
import "elements-kit/ui/marketing/marketing.css";
import "elements-kit/ui/button/button.css";

import { signal } from "elements-kit/signals";

const dark = signal(true);
const align = signal<"start" | "end">("start");

export class App {
  render() {
    return (
      <div
        class:dark={dark}
        data-has-background="true"
        data-color="base"
        data-accent-color="mint"
        data-radius="medium"
        style:--page-padding-left="24px"
        style:--page-padding-right="24px"
        style:--page-max-width="1024px"
        style:--accent-9="var(--mint-9)"
        style:color="var(--gray-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
        style:min-height="100vh"
        style:background="var(--color-1)"
      >
        <section class:hero data-align="center">
          <div class:page-bounds>
            <h1 class:section-heading class:section-heading-1>
              Marketing layout
            </h1>
            <p class:section-paragraph>
              Compose pages from hero, sections, rivers, and pillars.
            </p>
            <div style:display="flex" style:gap="8px" style:margin-top="24px" style:justify-content="center">
              <button
                class:unset
                class:x-button
                data-size="2"
                data-variant="soft"
                on:click={() => dark(!dark())}
              >
                {() => (dark() ? "☀ Light" : "☾ Dark")}
              </button>
              <button
                class:unset
                class:x-button
                data-size="2"
                data-variant="soft"
                on:click={() => align(align() === "start" ? "end" : "start")}
              >
                {() => `River: ${align()}`}
              </button>
            </div>
          </div>
        </section>

        <section class:page-section>
          <div class:page-bounds>
            <header class:section-header>
              <h2 class:section-heading class:section-heading-2>
                A section header
              </h2>
              <p class:section-paragraph>
                Section header sits above rivers. One heading, one paragraph, optional CTA.
              </p>
            </header>

            <div class:river data-align={align}>
              <div class:river-content>
                <h3 class:section-heading class:section-heading-3>
                  River with text and visual
                </h3>
                <p class:section-paragraph>
                  Two-column grid at md+. Stacks on mobile. Toggle the align button above to flip text/visual order.
                </p>
                <a class:unset class:x-button data-size="2" data-variant="solid" href="#">
                  Learn more
                </a>
              </div>
              <div
                class:river-visual
                data-border="true"
                style:aspect-ratio="4/3"
                style:background="linear-gradient(135deg, var(--mint-4), var(--mint-9))"
              />
            </div>

            <div style:height="48px" />

            <div style:display="grid" style:gap="32px" style:grid-template-columns="repeat(auto-fit, minmax(240px, 1fr))">
              <div class:pillar data-border="true">
                <svg viewBox="0 0 24 24" fill="currentColor" style:width="2rem" style:height="2rem">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <h4 data-heading>Composable</h4>
                <p data-paragraph>
                  Class + data attributes only. No JS. Drop into any framework.
                </p>
                <a href="#">Learn more</a>
              </div>
              <div class:pillar data-border="true">
                <svg viewBox="0 0 24 24" fill="currentColor" style:width="2rem" style:height="2rem">
                  <rect x="4" y="4" width="16" height="16" rx="3" />
                </svg>
                <h4 data-heading>Themeable</h4>
                <p data-paragraph>
                  Colors flow from <code>--color-*</code> and <code>--accent-*</code>. Swap once, applies everywhere.
                </p>
                <a href="#">Learn more</a>
              </div>
              <div class:pillar data-border="true">
                <svg viewBox="0 0 24 24" fill="currentColor" style:width="2rem" style:height="2rem">
                  <polygon points="12,2 22,20 2,20" />
                </svg>
                <h4 data-heading>Responsive</h4>
                <p data-paragraph>
                  Mobile-first. Rivers stack below md, grid above. No JS resize handlers.
                </p>
                <a href="#">Learn more</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
}
