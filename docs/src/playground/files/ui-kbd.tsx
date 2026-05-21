import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";

import "elements-kit/ui/kbd/kbd.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export class App {
  render() {
    return (
      <div
        class:dark={dark}
        data-base-color="gray"
        style:padding="24px"
        style:display="grid"
        style:gap="20px"
        style:background="var(--base-color-1)"
        style:color="var(--base-color-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
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

        <h3 style:margin="0">Sizes</h3>
        <div style:display="flex" style:flex-direction="column" style:gap="8px">
          {SIZES.map((size) => (
            <div style:display="flex" style:gap="12px" style:align-items="center">
              <span style:font-size={`var(--font-size-${size})`}>
                Press <kbd class:x-kbd data-size={String(size)}>⌘</kbd>+
                <kbd class:x-kbd data-size={String(size)}>K</kbd> to open
              </span>
            </div>
          ))}
        </div>

        <h3 style:margin="16px 0 0">Multi-key combos</h3>
        <p style:line-height="2">
          Save: <kbd class:x-kbd>⌘</kbd>+<kbd class:x-kbd>S</kbd>{" "}
          &nbsp;Quit: <kbd class:x-kbd>⌘</kbd>+<kbd class:x-kbd>Q</kbd>{" "}
          &nbsp;Refresh: <kbd class:x-kbd>⌘</kbd>+<kbd class:x-kbd>⇧</kbd>+<kbd class:x-kbd>R</kbd>
        </p>
      </div>
    );
  }
}
