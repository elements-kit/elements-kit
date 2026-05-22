import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/shadow.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
// pick a neutral palette for --base-color-* (must match data-base-color on root):
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";
// import any color scales you want to use for accent theming:
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/colors/mint.css";
import "elements-kit/ui/styles/palette/blue.css";
import "elements-kit/ui/styles/colors/blue.css";
import "elements-kit/ui/styles/palette/iris.css";
import "elements-kit/ui/styles/colors/iris.css";
import "elements-kit/ui/styles/palette/crimson.css";
import "elements-kit/ui/styles/colors/crimson.css";
import "elements-kit/ui/styles/palette/amber.css";
import "elements-kit/ui/styles/colors/amber.css";

import "elements-kit/ui/button/button.css";
import "elements-kit/ui/segmented-control/segmented-control.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);
const submitted = signal<string>("");

const SIZES = [1, 2, 3] as const;
const VARIANTS = ["surface", "soft"] as const;
const ACCENTS = ["mint", "blue", "iris", "crimson", "amber"] as const;

function SectionHeading({
  children,
  caption,
}: {
  children: any;
  caption?: string;
}) {
  return (
    <div style:margin="0 0 12px">
      <h3 style:margin="0" style:font-size="14px" style:font-weight="600">
        {children}
      </h3>
      {caption ? (
        <code
          style:font-size="12px"
          style:color="var(--base-color-11)"
          style:display="block"
          style:margin-top="4px"
        >
          {caption}
        </code>
      ) : null}
    </div>
  );
}

function Row({ children }: { children: any }) {
  return (
    <div
      style:display="flex"
      style:flex-wrap="wrap"
      style:align-items="center"
      style:gap="1rem"
    >
      {children}
    </div>
  );
}

function Stack({ children, gap }: { children: any; gap?: string }) {
  return (
    <div
      style:display="flex"
      style:flex-direction="column"
      style:gap={gap ?? "12px"}
      style:align-items="flex-start"
    >
      {children}
    </div>
  );
}

function Note({ children }: { children: any }) {
  return (
    <p
      style:margin="0"
      style:font-size="13px"
      style:color="var(--base-color-11)"
      style:max-width="56ch"
    >
      {children}
    </p>
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
        style:padding="24px"
        style:display="grid"
        style:gap="32px"
        style:color="var(--base-color-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
      >
        <section>
          <SectionHeading>Theme</SectionHeading>
          <button
            class:unset
            class:x-button
            data-size="2"
            data-variant="soft"
            on:click={() => dark(!dark())}
          >
            {() => (dark() ? "☀ Light mode" : "☾ Dark mode")}
          </button>
        </section>

        <section>
          <SectionHeading caption='data-size="1" | "2" | "3"'>
            Sizes
          </SectionHeading>
          <Stack>
            {SIZES.map((size) => (
              <div
                class:unset
                class:x-segmented-control
                data-size={String(size)}
                role="radiogroup"
                aria-label={`Size ${size} example`}
              >
                <label>
                  <input
                    type="radio"
                    name={`size-${size}`}
                    value="day"
                    checked
                  />
                  <span>Day</span>
                </label>
                <label>
                  <input type="radio" name={`size-${size}`} value="week" />
                  <span>Week</span>
                </label>
                <label>
                  <input type="radio" name={`size-${size}`} value="month" />
                  <span>Month</span>
                </label>
                <label>
                  <input type="radio" name={`size-${size}`} value="year" />
                  <span>Year</span>
                </label>
              </div>
            ))}
          </Stack>
        </section>

        <section>
          <SectionHeading caption='data-variant="surface" | "soft"'>
            Variants
          </SectionHeading>
          <Stack>
            {VARIANTS.map((variant) => (
              <div>
                <code
                  style:font-size="12px"
                  style:color="var(--base-color-11)"
                  style:display="block"
                  style:margin-bottom="6px"
                >
                  data-variant="{variant}"
                </code>
                <div
                  class:unset
                  class:x-segmented-control
                  data-variant={variant}
                  role="radiogroup"
                  aria-label={`Variant ${variant}`}
                >
                  <label>
                    <input
                      type="radio"
                      name={`variant-${variant}`}
                      value="grid"
                      checked
                    />
                    <span>Grid</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`variant-${variant}`}
                      value="list"
                    />
                    <span>List</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`variant-${variant}`}
                      value="kanban"
                    />
                    <span>Kanban</span>
                  </label>
                </div>
              </div>
            ))}
          </Stack>
        </section>

        <section>
          <SectionHeading caption="data-high-contrast">
            High contrast
          </SectionHeading>
          <Stack>
            {VARIANTS.map((variant) => (
              <div
                class:unset
                class:x-segmented-control
                data-variant={variant}
                data-high-contrast
                role="radiogroup"
                aria-label={`High contrast ${variant}`}
              >
                <label>
                  <input
                    type="radio"
                    name={`hc-${variant}`}
                    value="left"
                    checked
                  />
                  <span>Left</span>
                </label>
                <label>
                  <input type="radio" name={`hc-${variant}`} value="center" />
                  <span>Center</span>
                </label>
                <label>
                  <input type="radio" name={`hc-${variant}`} value="right" />
                  <span>Right</span>
                </label>
              </div>
            ))}
          </Stack>
        </section>

        <section>
          <SectionHeading caption='data-color="<scale>"'>
            Accent colors
          </SectionHeading>
          <Stack>
            {ACCENTS.map((color) => (
              <div
                class:unset
                class:x-segmented-control
                data-variant="soft"
                data-color={color}
                role="radiogroup"
                aria-label={`Accent ${color}`}
              >
                <label>
                  <input type="radio" name={`accent-${color}`} value="a" />
                  <span>One</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name={`accent-${color}`}
                    value="b"
                    checked
                  />
                  <span>Two</span>
                </label>
                <label>
                  <input type="radio" name={`accent-${color}`} value="c" />
                  <span>Three</span>
                </label>
              </div>
            ))}
          </Stack>
        </section>

        <section>
          <SectionHeading caption="<fieldset> + <legend>  (canonical, free a11y)">
            A11y · group label via fieldset
          </SectionHeading>
          <Note>
            Native form semantics — no JS, no ARIA. The legend is the group
            name; arrow keys move + select inside the group. Default for any
            radio group that submits with a form.
          </Note>
          <fieldset
            class:unset
            style:display="grid"
            style:gap="6px"
            style:width="fit-content"
          >
            <legend style:font-size="13px" style:color="var(--base-color-11)">
              View density
            </legend>
            <div class:unset class:x-segmented-control role="radiogroup">
              <label>
                <input
                  type="radio"
                  name="density"
                  value="compact"
                  checked
                />
                <span>Compact</span>
              </label>
              <label>
                <input type="radio" name="density" value="cozy" />
                <span>Cozy</span>
              </label>
              <label>
                <input type="radio" name="density" value="comfy" />
                <span>Comfortable</span>
              </label>
            </div>
          </fieldset>
        </section>

        <section>
          <SectionHeading caption='role="radiogroup" + aria-labelledby="..."'>
            A11y · group label via aria-labelledby
          </SectionHeading>
          <Note>
            Use when a visible label exists elsewhere on the page or when{" "}
            <code>&lt;fieldset&gt;</code> styling fights the design. The
            container still needs <code>role="radiogroup"</code>.
          </Note>
          <div style:display="grid" style:gap="6px" style:width="fit-content">
            <span
              id="sort-by-label"
              style:font-size="13px"
              style:color="var(--base-color-11)"
            >
              Sort by
            </span>
            <div
              class:unset
              class:x-segmented-control
              role="radiogroup"
              aria-labelledby="sort-by-label"
            >
              <label>
                <input type="radio" name="sort" value="recent" checked />
                <span>Recent</span>
              </label>
              <label>
                <input type="radio" name="sort" value="popular" />
                <span>Popular</span>
              </label>
              <label>
                <input type="radio" name="sort" value="trending" />
                <span>Trending</span>
              </label>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading caption='role="radiogroup" + aria-label="..."'>
            A11y · visually-hidden group label
          </SectionHeading>
          <Note>
            Last resort when the surrounding layout already makes the group
            obvious. Screen-reader users still get the label via{" "}
            <code>aria-label</code>; sighted users get context from
            surroundings.
          </Note>
          <div
            class:unset
            class:x-segmented-control
            role="radiogroup"
            aria-label="Time range"
          >
            <label>
              <input type="radio" name="range" value="day" />
              <span>Day</span>
            </label>
            <label>
              <input type="radio" name="range" value="week" checked />
              <span>Week</span>
            </label>
            <label>
              <input type="radio" name="range" value="month" />
              <span>Month</span>
            </label>
          </div>
        </section>

        <section>
          <SectionHeading caption="<fieldset disabled>">
            A11y · disabled whole group
          </SectionHeading>
          <Note>
            Wrap the segmented control in a <code>&lt;fieldset disabled&gt;</code>{" "}
            to disable every radio in one declaration. Tab skips the entire
            group; arrow keys do nothing.
          </Note>
          <fieldset
            class:unset
            disabled
            style:display="grid"
            style:gap="6px"
            style:width="fit-content"
          >
            <legend style:font-size="13px" style:color="var(--base-color-11)">
              Plan (disabled)
            </legend>
            <div
              class:unset
              class:x-segmented-control
              data-disabled
              role="radiogroup"
            >
              <label>
                <input type="radio" name="plan-d" value="hobby" checked />
                <span>Hobby</span>
              </label>
              <label>
                <input type="radio" name="plan-d" value="pro" />
                <span>Pro</span>
              </label>
              <label>
                <input type="radio" name="plan-d" value="ent" />
                <span>Enterprise</span>
              </label>
            </div>
          </fieldset>
        </section>

        <section>
          <SectionHeading caption='<input disabled> per segment'>
            A11y · disabled per segment
          </SectionHeading>
          <Note>
            Disable a single option with <code>disabled</code> on the{" "}
            <code>&lt;input&gt;</code>. Arrow-key navigation in a native radio
            group automatically skips it.
          </Note>
          <div
            class:unset
            class:x-segmented-control
            role="radiogroup"
            aria-label="Refresh rate"
          >
            <label>
              <input type="radio" name="hz" value="60" checked />
              <span>60 Hz</span>
            </label>
            <label>
              <input type="radio" name="hz" value="120" />
              <span>120 Hz</span>
            </label>
            <label>
              <input type="radio" name="hz" value="144" disabled />
              <span>144 Hz</span>
            </label>
            <label>
              <input type="radio" name="hz" value="240" disabled />
              <span>240 Hz</span>
            </label>
          </div>
        </section>

        <section>
          <SectionHeading caption='no `checked` on any input'>
            A11y · the no-preselection trap
          </SectionHeading>
          <Note>
            Without a <code>checked</code> default, screen readers announce
            "0 of N selected" — a smell that reads as broken. Preselect a
            sensible default unless the field is genuinely optional and the
            UI elsewhere makes that clear.
          </Note>
          <div
            class:unset
            class:x-segmented-control
            role="radiogroup"
            aria-label="Theme (no preselection — avoid in real UIs)"
          >
            <label>
              <input type="radio" name="theme-empty" value="light" />
              <span>Light</span>
            </label>
            <label>
              <input type="radio" name="theme-empty" value="dark" />
              <span>Dark</span>
            </label>
            <label>
              <input type="radio" name="theme-empty" value="system" />
              <span>System</span>
            </label>
          </div>
        </section>

        <section>
          <SectionHeading caption="native radio keyboard model — Tab, ←/→/↑/↓">
            A11y · keyboard
          </SectionHeading>
          <Note>
            Tab into the group, arrow keys move focus <em>and</em> select
            (native behavior — no JS needed). Tab again to leave. The visible
            focus ring lives on the <code>&lt;label&gt;</code>, not on the
            visually-hidden <code>&lt;input&gt;</code>.
          </Note>
          <div
            class:unset
            class:x-segmented-control
            role="radiogroup"
            aria-label="Try the arrow keys"
          >
            <label>
              <input type="radio" name="kbd" value="a" checked />
              <span>Alpha</span>
            </label>
            <label>
              <input type="radio" name="kbd" value="b" />
              <span>Bravo</span>
            </label>
            <label>
              <input type="radio" name="kbd" value="c" />
              <span>Charlie</span>
            </label>
            <label>
              <input type="radio" name="kbd" value="d" />
              <span>Delta</span>
            </label>
          </div>
        </section>

        <section>
          <SectionHeading caption='<form on:submit> with FormData'>
            Form participation
          </SectionHeading>
          <Note>
            Native radios serialize into <code>FormData</code> with no
            controlled-state plumbing.
          </Note>
          <form
            on:submit={(e: SubmitEvent) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget as HTMLFormElement);
              submitted(String(data.get("priority") ?? ""));
            }}
            style:display="grid"
            style:gap="8px"
            style:width="fit-content"
          >
            <fieldset class:unset style:display="grid" style:gap="6px">
              <legend
                style:font-size="13px"
                style:color="var(--base-color-11)"
              >
                Priority
              </legend>
              <div class:unset class:x-segmented-control role="radiogroup">
                <label>
                  <input
                    type="radio"
                    name="priority"
                    value="low"
                  />
                  <span>Low</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="priority"
                    value="normal"
                    checked
                  />
                  <span>Normal</span>
                </label>
                <label>
                  <input type="radio" name="priority" value="high" />
                  <span>High</span>
                </label>
                <label>
                  <input type="radio" name="priority" value="urgent" />
                  <span>Urgent</span>
                </label>
              </div>
            </fieldset>
            <button
              class:unset
              class:x-button
              data-size="1"
              data-variant="solid"
              type="submit"
              style:width="fit-content"
            >
              Submit
            </button>
            <div
              style:font-size="12px"
              style:color="var(--base-color-11)"
              style:font-family="var(--code-font-family)"
            >
              {() =>
                submitted() ? `priority = "${submitted()}"` : "—"
              }
            </div>
          </form>
        </section>

        <section>
          <SectionHeading caption='N = 11 — modern: anchor slide; fallback: crossfade'>
            Many segments (stress test)
          </SectionHeading>
          <Note>
            No per-index CSS, no cap. Tier 2 anchor positioning handles
            arbitrary <code>N</code>; Tier 1 fallback crossfades regardless.
          </Note>
          <div
            class:unset
            class:x-segmented-control
            data-size="1"
            role="radiogroup"
            aria-label="Hour"
          >
            {Array.from({ length: 11 }).map((_, i) => (
              <label>
                <input
                  type="radio"
                  name="hour"
                  value={String(i)}
                  checked={i === 5}
                />
                <span>{String(i)}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <SectionHeading caption='dir="rtl"'>
            Right-to-left
          </SectionHeading>
          <Note>
            The indicator follows logical direction automatically — anchor
            positioning resolves left/right against the writing mode; the
            Tier 1 fallback uses per-label positioning so it's
            direction-agnostic.
          </Note>
          <div
            dir="rtl"
            style:display="grid"
            style:gap="6px"
            style:width="fit-content"
          >
            <span
              id="rtl-label"
              style:font-size="13px"
              style:color="var(--base-color-11)"
            >
              المحاذاة
            </span>
            <div
              class:unset
              class:x-segmented-control
              role="radiogroup"
              aria-labelledby="rtl-label"
            >
              <label>
                <input type="radio" name="rtl" value="r" />
                <span>يمين</span>
              </label>
              <label>
                <input type="radio" name="rtl" value="c" checked />
                <span>وسط</span>
              </label>
              <label>
                <input type="radio" name="rtl" value="l" />
                <span>يسار</span>
              </label>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading caption="prefers-reduced-motion: reduce">
            Reduced motion
          </SectionHeading>
          <Note>
            Enable "Reduce motion" in OS preferences (or DevTools →
            Rendering → Emulate CSS media feature) — every transition above
            collapses to an instant swap. No author code required.
          </Note>
        </section>
      </div>
    );
  }
}
