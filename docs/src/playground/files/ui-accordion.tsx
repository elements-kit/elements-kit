import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/colors/mint.css";
import "elements-kit/ui/styles/palette/blue.css";
import "elements-kit/ui/styles/colors/blue.css";
import "elements-kit/ui/styles/palette/iris.css";
import "elements-kit/ui/styles/colors/iris.css";
import "elements-kit/ui/styles/palette/crimson.css";
import "elements-kit/ui/styles/colors/crimson.css";

import "elements-kit/ui/button/button.css";
import "elements-kit/ui/accordion/accordion.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

function SectionHeading({ children }: { children: any }) {
  return (
    <h3 style:margin="0 0 12px" style:font-size="14px" style:font-weight="600">
      {children}
    </h3>
  );
}

// Consumer-side chevron — the primitive ships none. Drop an SVG (or any glyph)
// into <summary>; the rule below rotates it 180° when the parent is [open].
function Chevron() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      style:margin-inline-start="auto"
      style:flex-shrink="0"
      style:transition="transform 200ms ease"
    >
      <path d="M4 6L8 10L12 6" />
    </svg>
  );
}

const ChevronStyle = () => (
  <style>{`
    .x-accordion[open] > summary svg { transform: rotate(180deg); }
  `}</style>
);

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
        style:gap="32px"
        style:background="var(--base-color-1)"
        style:color="var(--base-color-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
        style:max-width="640px"
      >
        <ChevronStyle />

        <button
          class:unset
          class:x-button
          data-size="1"
          data-variant="soft"
          style:width="fit-content"
          on:click={() => dark(!dark())}
        >
          {() => (dark() ? "☀ Light" : "☾ Dark")}
        </button>

        <section>
          <SectionHeading>Single-open group (name="faq")</SectionHeading>
          <details class:x-accordion name="faq" open>
            <summary>
              How does the open/close animation work?
              <Chevron />
            </summary>
            <p style:margin="0">
              <code>::details-content</code> + <code>interpolate-size</code> +{" "}
              <code>transition-behavior: allow-discrete</code>. The browser
              would normally yank the content the instant <code>[open]</code>{" "}
              flips off — <code>allow-discrete</code> defers that flip until{" "}
              <code>block-size</code> finishes transitioning, so the close
              animates to completion.
            </p>
          </details>
          <details class:x-accordion name="faq">
            <summary>
              How is single-open enforced without JavaScript?
              <Chevron />
            </summary>
            <p style:margin="0">
              Native HTML: <code>&lt;details name="faq"&gt;</code>. Items
              sharing a name form an exclusive group — the browser closes the
              previously-open sibling automatically. Zero coordination logic.
            </p>
          </details>
          <details class:x-accordion name="faq">
            <summary>
              Is it accessible?
              <Chevron />
            </summary>
            <p style:margin="0">
              <code>&lt;details&gt;</code> / <code>&lt;summary&gt;</code> is a
              native disclosure widget. Enter/Space to toggle, screen readers
              announce expanded/collapsed state — all from the browser.
            </p>
          </details>
        </section>

        <section>
          <SectionHeading>Multi-open (no name)</SectionHeading>
          <details class:x-accordion>
            <summary>
              First — standalone
              <Chevron />
            </summary>
            <p style:margin="0">
              Both can be open at once when you omit the <code>name</code>{" "}
              attribute.
            </p>
          </details>
          <details class:x-accordion>
            <summary>
              Second — standalone
              <Chevron />
            </summary>
            <p style:margin="0">Each item owns its own open state.</p>
          </details>
        </section>

        <section>
          <SectionHeading>Sizes</SectionHeading>
          <div style:display="grid">
            <details class:x-accordion data-size="1">
              <summary>
                Size 1 — compact
                <Chevron />
              </summary>
              <p style:margin="0">Smaller padding, smaller font.</p>
            </details>
            <details class:x-accordion data-size="2" open>
              <summary>
                Size 2 — default
                <Chevron />
              </summary>
              <p style:margin="0">The middle of the three.</p>
            </details>
            <details class:x-accordion data-size="3">
              <summary>
                Size 3 — comfortable
                <Chevron />
              </summary>
              <p style:margin="0">Larger padding for prominent FAQ pages.</p>
            </details>
          </div>
        </section>

        <section>
          <SectionHeading>Borderless variant</SectionHeading>
          <details class:x-accordion data-variant="borderless">
            <summary>
              No border, no background, color shifts on hover
              <Chevron />
            </summary>
            <p style:margin="0">
              For inline FAQs in body copy where you don't want a card chrome.
            </p>
          </details>
          <details class:x-accordion data-variant="borderless">
            <summary>
              Stacks without border collapsing
              <Chevron />
            </summary>
            <p style:margin="0">
              Pair with a divider above/below in your layout if needed.
            </p>
          </details>
        </section>

        <section>
          <SectionHeading>Soft variant</SectionHeading>
          <details class:x-accordion data-variant="soft">
            <summary>
              Surface minus the border
              <Chevron />
            </summary>
            <p style:margin="0">
              Same panel bg, same per-mode alpha flip on summary/body, same
              hover — just no <code>1px solid</code> ring. Mid-emphasis between
              surface and borderless.
            </p>
          </details>
          <details class:x-accordion data-variant="soft">
            <summary>
              Useful for grouped FAQs inside a section
              <Chevron />
            </summary>
            <p style:margin="0">
              Stack them with <code>display: grid; gap</code> on the parent for
              breathing room between items.
            </p>
          </details>
        </section>

        <section>
          <SectionHeading>Disabled</SectionHeading>
          <details class:x-accordion aria-disabled="true">
            <summary>
              Can't be opened
              <Chevron />
            </summary>
            <p style:margin="0">Pointer events stopped on the summary.</p>
          </details>
        </section>

        <section>
          <SectionHeading>Accent colors</SectionHeading>
          <p
            style:margin="0 0 12px"
            style:color="var(--base-color-a11)"
            style:font-size="13px"
          >
            <code>data-color</code> on the accordion (or any ancestor) themes
            the text + chevron via <code>currentColor</code>. The card chrome
            stays neutral so the accent reads as content.
          </p>

          <details class:x-accordion data-color="mint" open>
            <summary>
              data-color="mint" — surface
              <Chevron />
            </summary>
            <p style:margin="0">Mint themes the trigger label + chevron.</p>
          </details>
          <details class:x-accordion data-color="blue">
            <summary>
              data-color="blue" — surface
              <Chevron />
            </summary>
            <p style:margin="0">Blue.</p>
          </details>
          <details class:x-accordion data-color="iris">
            <summary>
              data-color="iris" — surface
              <Chevron />
            </summary>
            <p style:margin="0">Iris.</p>
          </details>
          <details class:x-accordion data-color="crimson">
            <summary>
              data-color="crimson" — surface
              <Chevron />
            </summary>
            <p style:margin="0">Crimson.</p>
          </details>

          <div style:height="16px" />

          <details class:x-accordion data-variant="soft" data-color="mint" open>
            <summary>
              data-color="mint" — soft
              <Chevron />
            </summary>
            <p style:margin="0">Mint, soft. Chrome stays neutral.</p>
          </details>
          <details class:x-accordion data-variant="soft" data-color="blue">
            <summary>
              data-color="blue" — soft
              <Chevron />
            </summary>
            <p style:margin="0">Blue, soft.</p>
          </details>
          <details class:x-accordion data-variant="soft" data-color="iris">
            <summary>
              data-color="iris" — soft
              <Chevron />
            </summary>
            <p style:margin="0">Iris, soft.</p>
          </details>
          <details class:x-accordion data-variant="soft" data-color="crimson">
            <summary>
              data-color="crimson" — soft
              <Chevron />
            </summary>
            <p style:margin="0">Crimson, soft. Adjacent soft items merge.</p>
          </details>

          <div style:height="16px" />

          <details
            class:x-accordion
            data-variant="borderless"
            data-color="crimson"
          >
            <summary>
              data-color="crimson" — borderless
              <Chevron />
            </summary>
            <p style:margin="0">
              Borderless variant with crimson — color shifts on hover and stays
              strong when <code>[open]</code>.
            </p>
          </details>
        </section>

        <section>
          <SectionHeading>Nested</SectionHeading>
          <details class:x-accordion name="outer" open>
            <summary>
              Parent
              <Chevron />
            </summary>
            <details
              class:x-accordion
              name="inner"
              style:margin-block-start="8px"
            >
              <summary>
                Child A
                <Chevron />
              </summary>
              <p style:margin="0">
                Single-open scopes per name — outer and inner groups are
                independent.
              </p>
            </details>
            <details class:x-accordion name="inner">
              <summary>
                Child B
                <Chevron />
              </summary>
              <p style:margin="0">Opening this closes Child A.</p>
            </details>
          </details>
        </section>
      </div>
    );
  }
}
