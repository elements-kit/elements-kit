import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";
import "elements-kit/ui/styles/palette/black-alpha.css";
import "elements-kit/ui/styles/palette/white-alpha.css";
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

import "elements-kit/ui/link/link.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const UNDERLINES = ["auto", "hover", "always", "none"] as const;
const ACCENTS = ["mint", "blue", "iris", "crimson", "amber"] as const;

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
        style:gap="24px"
        style:background="var(--base-color-1)"
        style:color="var(--base-color-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
        style:max-width="540px"
      >
        <button
          on:click={() => dark(!dark())}
          style:width="fit-content"
          style:padding="6px 12px"
          style:border="1px solid var(--base-color-a6)"
          style:border-radius="6px"
          style:background="var(--base-color-a2)"
          style:color="var(--base-color-12)"
          style:cursor="pointer"
        >
          {() => (dark() ? "☀ Light" : "☾ Dark")}
        </button>

        <section>
          <h3 style:margin="0 0 12px">Underline modes</h3>
          <div style:display="grid" style:gap="10px">
            {UNDERLINES.map((mode) => (
              <div>
                <code style:font-size="12px" style:color="var(--base-color-11)" style:display="block" style:margin-bottom="4px">
                  data-underline="{mode}"
                </code>
                <a class:x-link data-underline={mode} href="#">
                  Read the {mode} story
                </a>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">In paragraph</h3>
          <p style:line-height="1.6">
            Visit the <a class:x-link href="#">documentation</a> or jump straight to{" "}
            <a class:x-link data-underline="always" href="#">getting started</a>. You can also{" "}
            <a class:x-link data-underline="none" href="#">browse the API</a>.
          </p>
        </section>

        <section>
          <h3 style:margin="0 0 12px">As a button</h3>
          <p>
            Prefer <button class:unset class:x-link type="button">a button-styled link</button> when the click triggers an action, not navigation.
          </p>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Disabled</h3>
          <div style:display="flex" style:gap="16px" style:flex-wrap="wrap">
            <a class:x-link aria-disabled="true" href="#">
              Disabled anchor (aria-disabled)
            </a>
            <button class:unset class:x-link type="button" disabled>
              Disabled button (native)
            </button>
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Accent colors</h3>
          <div style:display="grid" style:gap="8px">
            {ACCENTS.map((color) => (
              <a class:x-link data-color={color} data-underline="always" href="#">
                {color}
              </a>
            ))}
          </div>
        </section>

        <section>
          <h3 style:margin="0 0 12px">Focus</h3>
          <p style:font-size="13px" style:color="var(--base-color-11)" style:margin="0 0 8px">
            Tab to focus — outline replaces the underline.
          </p>
          <a class:x-link href="#">Focus me</a>
        </section>
      </div>
    );
  }
}
