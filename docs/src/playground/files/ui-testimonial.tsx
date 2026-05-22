import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/colors/mint.css";
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

export class App {
  render() {
    return (
      <div
        class:dark={dark}
        data-surface="page"
        data-color="mint"
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
          <Label>Default (.x-card .testimonial)</Label>
          <figure class:x-card class:testimonial>
            <blockquote>
              The kit <em>cut our design-to-ship loop in half</em>. Primitives compose cleanly, tokens stay consistent, and our team stopped re-inventing the same five layouts.
            </blockquote>
            <figcaption>
              <cite>Jane Doe</cite>
              <span data-title>Staff Engineer, Acme Co</span>
            </figcaption>
          </figure>

          <Label>Elevated (data-variant="elevated")</Label>
          <figure class:x-card class:testimonial data-variant="elevated">
            <blockquote>
              We shipped a marketing site in a week. <em>The composition model just clicks.</em>
            </blockquote>
            <figcaption>
              <cite>Alex Kim</cite>
              <span data-title>Head of Design, Beta Inc</span>
            </figcaption>
          </figure>

          <Label>Borderless (data-variant="borderless")</Label>
          <figure class:x-card class:testimonial data-variant="borderless">
            <blockquote>
              Tokens flow through every primitive. <em>Theming once theme-d everything.</em>
            </blockquote>
            <figcaption>
              <cite>Sam Patel</cite>
              <span data-title>Engineering Lead, Gamma Labs</span>
            </figcaption>
          </figure>
        </div>
      </div>
    );
  }
}
