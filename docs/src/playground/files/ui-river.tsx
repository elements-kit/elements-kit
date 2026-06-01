import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";
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

function GradientVisual(props: { aspect?: string; width?: string; maxWidth?: string; bordered?: boolean }) {
  return (
    <div
      class:river-visual
      data-border={props.bordered ? "" : undefined}
      style:aspect-ratio={props.aspect ?? "4/3"}
      style:width={props.width ?? "auto"}
      style:max-width={props.maxWidth ?? "none"}
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
        data-accent="mint"
        data-base-color="gray"
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
          <Label>data-align="start" (default)</Label>
          <div class:river>
            <div class:river-content>
              <h3 class:section-heading class:section-heading-3>Text on the left, visual on the right</h3>
              <p class:section-paragraph>Standard river. <em>6/6 split</em> at md+. Stacks below md.</p>
              <a class:unset class:x-button data-size="2" data-variant="text" href="#">Learn more</a>
            </div>
            <GradientVisual />
          </div>

          <Label>data-align="end"</Label>
          <div class:river data-align="end">
            <div class:river-content>
              <h3 class:section-heading class:section-heading-3>Text on the right, visual on the left</h3>
              <p class:section-paragraph>Flipped via grid order. Alternate adjacent rivers between start ↔ end for visual rhythm.</p>
              <a class:unset class:x-button data-size="2" data-variant="text" href="#">Learn more</a>
            </div>
            <GradientVisual />
          </div>

          <Label>data-align="center"</Label>
          <div class:river data-align="center">
            <div class:river-content>
              <h3 class:section-heading class:section-heading-3>Centered, stacked column</h3>
              <p class:section-paragraph>Content and visual stack vertically with center justification.</p>
              <a class:unset class:x-button data-size="2" data-variant="text" href="#">Learn more</a>
            </div>
            <GradientVisual width="100%" maxWidth="640px" />
          </div>

          <Label>data-align="start" data-large-visual="true"</Label>
          <div class:river data-align="start" data-large-visual="true">
            <div class:river-content>
              <h3 class:section-heading class:section-heading-3>Larger visual, narrower content</h3>
              <p class:section-paragraph>Split shifts to 5/7. Use when the visual carries the message.</p>
              <a class:unset class:x-button data-size="2" data-variant="text" href="#">Learn more</a>
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
              Breakout
            </h3>
            <div class:river-content>
              <p class:section-paragraph>
                <em>A large quote-style paragraph</em> breaks out of the normal rhythm — bigger, looser, attention-grabbing.
              </p>
              <a class:unset class:x-button data-size="2" data-variant="text" data-cta="" href="#">Learn more</a>
            </div>
            <GradientVisual aspect="21/9" />
          </div>

          <Label>river-visual with data-border</Label>
          <div class:river>
            <div class:river-content>
              <h3 class:section-heading class:section-heading-3>Bordered visual</h3>
              <p class:section-paragraph>1px border + rounded corners + clipping. Use for screenshots and UI shots.</p>
            </div>
            <GradientVisual bordered />
          </div>
        </div>
      </div>
    );
  }
}
