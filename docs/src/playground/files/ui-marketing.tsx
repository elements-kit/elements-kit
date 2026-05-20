import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/colors/mint.css";
import "elements-kit/ui/styles/palette/slate.css";
import "elements-kit/ui/styles/base/slate.css";
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

function Heading({ children }: { children: any }) {
  return (
    <h2
      style:font-size="20px"
      style:font-weight="600"
      style:letter-spacing="-0.01em"
      style:margin="48px 0 16px"
      style:padding-bottom="8px"
      style:border-bottom="1px solid var(--base-color-a6)"
    >
      {children}
    </h2>
  );
}

function GradientVisual(props: {
  aspect?: string;
  width?: string;
  maxWidth?: string;
}) {
  return (
    <div
      class:river-visual
      style:aspect-ratio={props.aspect ?? "4/3"}
      style:width={props.width ?? "auto"}
      style:max-width={props.maxWidth ?? "none"}
      style:background="linear-gradient(135deg, var(--mint-4), var(--mint-9))"
    />
  );
}

function GradientVisualBordered(props: { aspect?: string }) {
  return (
    <div
      class:river-visual
      data-border
      style:aspect-ratio={props.aspect ?? "4/3"}
      style:background="linear-gradient(135deg, var(--mint-4), var(--mint-9))"
    />
  );
}

export class App {
  render() {
    return (
      <div
        class:dark={dark}
        data-surface="page"
        data-color="mint"
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
        {/* Theme bar */}
        <div
          style:padding="12px 24px"
          style:display="flex"
          style:justify-content="flex-end"
          style:border-bottom="1px solid var(--base-color-a6)"
          style:background="var(--base-color-a2)"
          style:backdrop-filter="blur(12px)"
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

        <div class:page-bounds>
          {/* ============ HERO ============ */}
          <Heading>Hero</Heading>

          <Label>data-align="start" (default)</Label>
          <section class:hero>
            <h1 class:section-heading class:section-heading-1>
              Marketing layout
            </h1>
            <p class:section-paragraph>
              Compose pages from hero, sections, rivers, and pillars.
            </p>
          </section>

          <Label>data-align="center"</Label>
          <section class:hero data-align="center">
            <h1 class:section-heading class:section-heading-1>
              Marketing layout
            </h1>
            <p class:section-paragraph>
              Compose pages from hero, sections, rivers, and pillars.
            </p>
          </section>

          {/* ============ SECTION HEADING SIZES ============ */}
          <Heading>Section heading sizes</Heading>

          <Label>.section-heading-1</Label>
          <h2 class:section-heading class:section-heading-1>
            The quick brown fox jumps over the lazy dog
          </h2>

          <Label>.section-heading-2</Label>
          <h2 class:section-heading class:section-heading-2>
            The quick brown fox jumps over the lazy dog
          </h2>

          <Label>.section-heading-3</Label>
          <h2 class:section-heading class:section-heading-3>
            The quick brown fox jumps over the lazy dog
          </h2>

          <Label>.section-heading-4</Label>
          <h2 class:section-heading class:section-heading-4>
            The quick brown fox jumps over the lazy dog
          </h2>

          {/* ============ SECTION HEADER ============ */}
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

          {/* ============ RIVER ============ */}
          <Heading>River</Heading>

          <Label>data-align="start" (default)</Label>
          <div class:river>
            <div class:river-content>
              <h3 class:section-heading class:section-heading-3>
                Text on the left, visual on the right
              </h3>
              <p class:section-paragraph>
                Standard river. <em>6/6 split</em> at md+. Stacks below md.
              </p>
              <a
                class:unset
                class:x-button
                data-size="3"
                data-variant="surface"
                href="#"
              >
                Learn more
              </a>
            </div>
            <GradientVisual />
          </div>

          <Label>data-align="end"</Label>
          <div class:river data-align="end">
            <div class:river-content>
              <h3 class:section-heading class:section-heading-3>
                Text on the right, visual on the left
              </h3>
              <p class:section-paragraph>
                Flipped order via grid `order:`. Alternate adjacent rivers
                between start ↔ end for visual rhythm.
              </p>
              <a
                class:unset
                class:x-button
                data-size="3"
                data-variant="surface"
                href="#"
              >
                Learn more
              </a>
            </div>
            <GradientVisual />
          </div>

          <Label>data-align="center"</Label>
          <div class:river data-align="center">
            <div class:river-content>
              <h3 class:section-heading class:section-heading-3>
                Centered, stacked column
              </h3>
              <p class:section-paragraph>
                Content and visual stack vertically with center justification.
                Visual needs an intrinsic or explicit width — placeholders set
                their own.
              </p>
              <a
                class:unset
                class:x-button
                data-size="3"
                data-variant="surface"
                href="#"
              >
                Learn more
              </a>
            </div>
            <GradientVisual width="100%" maxWidth="640px" />
          </div>

          <Label>data-align="start" data-large-visual="true"</Label>
          <div class:river data-align="start" data-large-visual="true">
            <div class:river-content>
              <h3 class:section-heading class:section-heading-3>
                Larger visual, narrower content
              </h3>
              <p class:section-paragraph>
                Split shifts to 5/7. Use when the visual carries the message and
                the copy is supporting detail.
              </p>
              <a
                class:unset
                class:x-button
                data-size="3"
                data-variant="surface"
                href="#"
              >
                Learn more
              </a>
            </div>
            <GradientVisual aspect="16/10" />
          </div>

          <Label>data-align="breakout"</Label>
          <div class:river data-align="breakout">
            <h3
              class:section-heading
              style:position="absolute"
              style:width="1px"
              style:height="1px"
              style:overflow="hidden"
              style:clip="rect(0,0,0,0)"
            >
              Breakout (visually hidden heading required as first child)
            </h3>
            <div class:river-content>
              <p class:section-paragraph>
                <em>A large quote-style paragraph</em> breaks out of the normal
                rhythm — bigger, looser, attention-grabbing.
              </p>
              <a
                class:unset
                class:x-button
                data-size="3"
                data-variant="surface"
                data-cta=""
                href="#"
              >
                Learn more
              </a>
            </div>
            <div
              class:river-visual
              style:aspect-ratio="21/9"
              style:background="linear-gradient(135deg, var(--mint-4), var(--mint-9))"
            />
          </div>

          {/* ============ RIVER VISUAL BORDER ============ */}
          <Heading>River visual border</Heading>

          <Label>Without data-border</Label>
          <div class:river>
            <div class:river-content>
              <h3 class:section-heading class:section-heading-3>
                No border
              </h3>
              <p class:section-paragraph>
                Visual sits flush. Use when the image extends to the edge
                naturally.
              </p>
            </div>
            <GradientVisual />
          </div>

          <Label>With data-border</Label>
          <div class:river>
            <div class:river-content>
              <h3 class:section-heading class:section-heading-3>
                With border
              </h3>
              <p class:section-paragraph>
                1px border + rounded corners + clipping. Use for screenshots and
                product UI shots that need a frame.
              </p>
            </div>
            <GradientVisualBordered />
          </div>

          {/* ============ PILLAR ============ */}
          <Heading>Pillar</Heading>

          <Label>Default (no border)</Label>
          <div class:pillar>
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              style:width="2rem"
              style:height="2rem"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
            <h4 data-heading>Composable</h4>
            <p data-paragraph>
              Class + data attributes only. No JS. Drop into any framework.
            </p>
            <a
              class:unset
              class:x-button
              data-size="3"
              data-variant="ghost"
              href="#"
            >
              Learn more
            </a>
          </div>

          <Label>data-border="true"</Label>
          <div class:pillar data-border>
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              style:width="2rem"
              style:height="2rem"
            >
              <rect x="4" y="4" width="16" height="16" rx="3" />
            </svg>
            <h4 data-heading>Themeable</h4>
            <p data-paragraph>
              Colors flow from <code>--color-*</code> and{" "}
              <code>--accent-*</code>. Swap once, applies everywhere.
            </p>
            <a
              class:unset
              class:x-button
              data-size="3"
              data-variant="ghost"
              href="#"
            >
              Learn more
            </a>
          </div>

          <Label>3-up grid</Label>
          <div
            style:display="grid"
            style:gap="32px"
            style:grid-template-columns="repeat(auto-fit, minmax(240px, 1fr))"
          >
            <div class:pillar>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                style:width="2rem"
                style:height="2rem"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
              <h4 data-heading>Composable</h4>
              <p data-paragraph>Class + data attributes only. No JS.</p>
              <a
                class:unset
                class:x-button
                data-size="3"
                data-variant="ghost"
                href="#"
              >
                Learn more
              </a>
            </div>
            <div class:pillar>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                style:width="2rem"
                style:height="2rem"
              >
                <rect x="4" y="4" width="16" height="16" rx="3" />
              </svg>
              <h4 data-heading>Themeable</h4>
              <p data-paragraph>Tokens flow through every variant.</p>
              <a
                class:unset
                class:x-button
                data-size="3"
                data-variant="ghost"
                href="#"
              >
                Learn more
              </a>
            </div>
            <div class:pillar>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                style:width="2rem"
                style:height="2rem"
              >
                <polygon points="12,2 22,20 2,20" />
              </svg>
              <h4 data-heading>Responsive</h4>
              <p data-paragraph>Mobile-first. No JS resize handlers.</p>
              <a
                class:unset
                class:x-button
                data-size="3"
                data-variant="ghost"
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
