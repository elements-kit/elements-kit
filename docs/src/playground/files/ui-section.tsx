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

function Heading({ children }: { children: any }) {
  return (
    <h2
      style:font-size="20px"
      style:font-weight="600"
      style:margin="48px 0 16px"
      style:padding-bottom="8px"
      style:border-bottom="1px solid var(--neutral-a6)"
    >
      {children}
    </h2>
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
          <Heading>Section heading sizes</Heading>
          <Label>.section-heading-1</Label>
          <h2 class:section-heading class:section-heading-1>
            The quick brown fox
          </h2>
          <Label>.section-heading-2</Label>
          <h2 class:section-heading class:section-heading-2>
            The quick brown fox
          </h2>
          <Label>.section-heading-3</Label>
          <h2 class:section-heading class:section-heading-3>
            The quick brown fox
          </h2>
          <Label>.section-heading-4</Label>
          <h2 class:section-heading class:section-heading-4>
            The quick brown fox
          </h2>

          <Heading>Section paragraph</Heading>
          <p class:section-paragraph>
            Default copy color is <em>--neutral-11</em>. Emphasized inline runs
            are <em>--neutral-12</em> for stronger contrast.
          </p>

          <Heading>Section header</Heading>
          <Label>data-align="start" (default)</Label>
          <header class:section-header>
            <h3 class:section-heading class:section-heading-2>
              A start-aligned header
            </h3>
            <p class:section-paragraph>
              Heading + lede paragraph, left-aligned. The typical pattern above
              a row of rivers.
            </p>
            <a
              class:unset
              class:x-button
              data-size="3"
              data-variant="surface"
              href="#"
            >
              Optional CTA
            </a>
          </header>

          <Label>data-align="center"</Label>
          <header class:section-header data-align="center">
            <h3 class:section-heading class:section-heading-2>
              A center-aligned header
            </h3>
            <p class:section-paragraph>
              Same shape, centered. Use sparingly — start-align scans faster on
              wide layouts.
            </p>
            <a
              class:unset
              class:x-button
              data-size="3"
              data-variant="surface"
              href="#"
            >
              Optional CTA
            </a>
          </header>

          <Heading>Page section</Heading>
          <Label>page-section &gt; page-container &gt; section-header</Label>
        </div>
        <section class:page-section>
          <div class:page-container>
            <header class:section-header data-align="center">
              <h3 class:section-heading class:section-heading-2>
                Inside a page-section
              </h3>
              <p class:section-paragraph>
                .page-section gives the themed background + vertical padding.
                .page-container caps width and gutters the content.
              </p>
            </header>
          </div>
        </section>
      </div>
    );
  }
}
