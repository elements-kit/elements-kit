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
          <Label>data-align="start" (default)</Label>
          <section class:hero>
            <h1 class:section-heading class:section-heading-1>
              Marketing layout
            </h1>
            <p class:section-paragraph>
              Compose pages from hero, sections, rivers, and pillars.
            </p>
            <a
              class:unset
              class:x-button
              data-size="3"
              data-variant="solid"
              href="#"
              style:margin-top="2rem"
            >
              Get started
            </a>
          </section>

          <Label>data-align="center"</Label>
          <section class:hero data-align="center">
            <h1 class:section-heading class:section-heading-1>
              Marketing layout
            </h1>
            <p class:section-paragraph>
              Compose pages from hero, sections, rivers, and pillars.
            </p>
            <a
              class:unset
              class:x-button
              data-size="3"
              data-variant="solid"
              href="#"
              style:margin-top="2rem"
            >
              Get started
            </a>
          </section>
        </div>
      </div>
    );
  }
}
