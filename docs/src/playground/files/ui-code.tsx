import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/cursor.css";
import "elements-kit/ui/styles/shadow.css";
import "elements-kit/ui/styles/unset.css";
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/neutral/gray.css";
import "elements-kit/ui/styles/palette/black-alpha.css";
import "elements-kit/ui/styles/accent/neutral.css";
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/accent/mint.css";
import "elements-kit/ui/styles/palette/iris.css";
import "elements-kit/ui/styles/accent/iris.css";
import "elements-kit/ui/styles/palette/crimson.css";
import "elements-kit/ui/styles/accent/crimson.css";

import "elements-kit/ui/code/code.css";
import "elements-kit/ui/button/button.css";

import { signal } from "elements-kit/signals";

const dark = signal(false);

const VARIANTS = ["soft", "solid", "outline", "text"] as const;
const SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export class App {
  render() {
    return (
      <div
        class:dark={dark}
        data-neutral="gray"
        data-accent="mint"
        data-radius="medium"
        style:padding="24px"
        style:display="grid"
        style:gap="20px"
        style:background="var(--neutral-1)"
        style:color="var(--neutral-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
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

        <h3 style:margin="0">Variants</h3>
        <p>
          {VARIANTS.map((variant) => (
            <>
              <code class:unset class:x-code data-variant={variant}>
                npm install
              </code>{" "}
              <small style:color="var(--neutral-11)">({variant})</small>
              <br />
            </>
          ))}
        </p>

        <h3 style:margin="16px 0 0">Sizes</h3>
        <div style:display="flex" style:flex-direction="column" style:gap="6px">
          {SIZES.map((size) => (
            <div
              style:display="flex"
              style:gap="12px"
              style:align-items="center"
            >
              <code class:unset class:x-code data-size={String(size)}>
                size-{size}
              </code>
              <small style:color="var(--neutral-11)">font-size-{size}</small>
            </div>
          ))}
        </div>

        <h3 style:margin="16px 0 0">In a paragraph</h3>
        <p style:line-height="1.6">
          Run{" "}
          <code class:unset class:x-code>
            npm run dev
          </code>{" "}
          to start the dev server. Then visit{" "}
          <code class:unset class:x-code data-accent="iris">
            http://localhost:3000
          </code>{" "}
          to see your changes. To deploy, push to{" "}
          <code class:unset class:x-code data-variant="outline">
            main
          </code>
          .
        </p>

        <h3 style:margin="16px 0 0">Colors</h3>
        <p>
          <code class:unset class:x-code data-accent="mint">
            success
          </code>{" "}
          <code class:unset class:x-code data-accent="iris">
            info
          </code>{" "}
          <code class:unset class:x-code data-accent="crimson">
            error
          </code>{" "}
          <code
            class:unset
            class:x-code
            data-variant="solid"
            data-accent="mint"
          >
            solid mint
          </code>
        </p>
      </div>
    );
  }
}
