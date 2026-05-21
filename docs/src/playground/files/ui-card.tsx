import "elements-kit/ui/styles/theme.css";
import "elements-kit/ui/styles/scaling.css";
import "elements-kit/ui/styles/radius.css";
import "elements-kit/ui/styles/space.css";
import "elements-kit/ui/styles/typography.css";
import "elements-kit/ui/styles/shadow.css";
import "elements-kit/ui/styles/material.css";
import "elements-kit/ui/styles/unset.css";
// import any color scales you want to use for accent theming:
import "elements-kit/ui/styles/palette/mint.css";
import "elements-kit/ui/styles/colors/mint.css";
// pick a neutral palette for --base-color-* (must match data-base-color on root):
import "elements-kit/ui/styles/palette/gray.css";
import "elements-kit/ui/styles/base/gray.css";

import "elements-kit/ui/card/card.css";

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

function CardBody({ title, body }: { title: string; body: string }) {
  return (
    <>
      <div
        style:font-weight="600"
        style:font-size="16px"
        style:margin-bottom="6px"
      >
        {title}
      </div>
      <div style:color="var(--base-color-11)" style:font-size="14px">
        {body}
      </div>
    </>
  );
}

function Grid({ children }: { children: any }) {
  return (
    <div
      style:display="grid"
      style:gap="16px"
      style:grid-template-columns="repeat(auto-fit, minmax(220px, 1fr))"
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
        }}
        style:color="var(--base-color-12)"
        style:font-family="var(--default-font-family, system-ui, sans-serif)"
        style:min-height="100vh"
        style:padding="0 24px 64px"
      >
        {/* Theme bar */}
        <div
          style:padding="12px 0"
          style:display="flex"
          style:justify-content="flex-end"
          style:border-bottom="1px solid var(--base-color-a6)"
        >
          <button
            class:unset
            on:click={() => dark(!dark())}
            style:font-family="var(--code-font-family, ui-monospace, monospace)"
            style:font-size="12px"
            style:padding="6px 12px"
            style:border="1px solid var(--base-color-a6)"
            style:border-radius="6px"
            style:background="var(--base-color-a2)"
            style:color="var(--base-color-12)"
            style:cursor="pointer"
          >
            {() => (dark() ? "☀ Light" : "☾ Dark")}
          </button>
        </div>

        {/* ============ VARIANTS ============ */}
        <Heading>Variants</Heading>

        <Label>data-variant="surface" (default)</Label>
        <div class:x-card>
          <CardBody
            title="Surface card"
            body="1px hairline border using --base-color-a5. The everyday card."
          />
        </div>

        <Label>data-variant="elevated"</Label>
        <div class:x-card data-variant="elevated">
          <CardBody
            title="Classic card"
            body="Surface + --shadow-2 elevation. Hover lifts (when interactive)."
          />
        </div>

        <Label>data-variant="borderless"</Label>
        <div class:x-card data-variant="borderless">
          <CardBody
            title="Ghost card"
            body="No surface, no border. Hover fill applies only when the card is interactive."
          />
        </div>

        {/* ============ SIZES ============ */}
        <Heading>Sizes</Heading>

        <Label>data-size="1"</Label>
        <div class:x-card data-size="1">
          <CardBody
            title="Size 1"
            body="Padding --space-3, radius --radius-4."
          />
        </div>

        <Label>data-size="2"</Label>
        <div class:x-card data-size="2">
          <CardBody
            title="Size 2"
            body="Padding --space-4, radius --radius-4."
          />
        </div>

        <Label>data-size="3" (default)</Label>
        <div class:x-card data-size="3">
          <CardBody
            title="Size 3"
            body="Padding --space-5, radius --radius-5."
          />
        </div>

        <Label>data-size="4"</Label>
        <div class:x-card data-size="4">
          <CardBody
            title="Size 4"
            body="Padding --space-6, radius --radius-5."
          />
        </div>

        <Label>data-size="5"</Label>
        <div class:x-card data-size="5">
          <CardBody
            title="Size 5"
            body="Padding --space-8, radius --radius-6."
          />
        </div>

        {/* ============ INTERACTIVE ============ */}
        <Heading>Interactive (anchor / button)</Heading>

        <Label>Anchor — surface variant</Label>
        <a
          class:unset
          class:x-card
          href="#"
          style:color="inherit"
          style:display="block"
        >
          <CardBody
            title="Hover me"
            body="Surface variant: border bumps from a5 → a7 on hover, → a6 on active."
          />
        </a>

        <Label>Anchor — elevated variant</Label>
        <a
          class:unset
          class:x-card
          data-variant="elevated"
          href="#"
          style:color="inherit"
          style:display="block"
        >
          <CardBody
            title="Hover me"
            body="Classic variant: shadow elevation lifts from --shadow-2 → --shadow-3 on hover."
          />
        </a>

        <Label>Anchor — borderless variant</Label>
        <a
          class:unset
          class:x-card
          data-variant="borderless"
          href="#"
          style:color="inherit"
          style:display="block"
        >
          <CardBody
            title="Hover me"
            body="Ghost variant: fills with --base-color-a3 on hover, --base-color-a4 on active."
          />
        </a>

        {/* ============ INSET ============ */}
        <Heading>Inset</Heading>

        <Label>data-inset="top" — hero image bleed</Label>
        <div class:x-card>
          <div
            data-inset="top"
            style:aspect-ratio="16/9"
            style:background="linear-gradient(135deg, var(--mint-4), var(--mint-9))"
          />
          <div style:margin-top="16px">
            <CardBody
              title="Card with top-inset hero"
              body="Image fills the top of the card edge-to-edge. Body content sits below at normal padding."
            />
          </div>
        </div>

        <Label>data-inset="bottom"</Label>
        <div class:x-card>
          <CardBody
            title="Card with bottom-inset footer"
            body="Footer media sits flush at the bottom of the card."
          />
          <div
            data-inset="bottom"
            style:aspect-ratio="16/4"
            style:margin-top="16px"
            style:background="linear-gradient(135deg, var(--mint-9), var(--mint-4))"
          />
        </div>

        <Label>data-inset="start" — horizontal card with leading media</Label>
        <div
          class:x-card
          style:display="flex"
          style:flex-direction="row"
          style:gap="16px"
          style:align-items="stretch"
        >
          <div
            data-inset="start"
            style:width="160px"
            style:flex-shrink="0"
            style:background="linear-gradient(135deg, var(--mint-4), var(--mint-9))"
          />
          <div>
            <CardBody
              title="Horizontal card"
              body="Leading media bleeds to the inline-start edge. In RTL, it flips to the right side automatically."
            />
          </div>
        </div>

        {/* ============ TRANSLUCENT MATERIAL ============ */}
        <Heading>Translucent material</Heading>

        <Label>data-material-background="translucent" on parent</Label>
        <div
          data-material-background="translucent"
          style:position="relative"
          style:padding="32px"
          style:border-radius="16px"
          style:background="linear-gradient(135deg, var(--mint-4), var(--mint-9))"
        >
          <div class:x-card data-variant="surface">
            <CardBody
              title="Frosted surface"
              body="Card reads --color-material (translucent) and applies a 64px backdrop blur over the gradient."
            />
          </div>
        </div>

        {/* ============ GRID ============ */}
        <Heading>3-up grid</Heading>

        <Label>auto-fit, minmax(220px, 1fr)</Label>
        <Grid>
          <div class:x-card>
            <CardBody title="Composable" body="Class + data-attribute API." />
          </div>
          <div class:x-card>
            <CardBody
              title="Themeable"
              body="Material + neutrals flow through."
            />
          </div>
          <div class:x-card>
            <CardBody title="Responsive" body="Padding scales via --space-N." />
          </div>
        </Grid>
      </div>
    );
  }
}
