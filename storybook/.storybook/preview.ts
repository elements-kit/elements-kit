import type { Decorator, Preview } from "@storybook/html-vite";
import { withThemeByClassName } from "@storybook/addon-themes";

// Same global style set the docs playground loads, imported from source so
// edits under src/ui/styles hot-reload.
import "../../src/ui/styles/theme.css";
import "../../src/ui/styles/scaling.css";
import "../../src/ui/styles/radius.css";
import "../../src/ui/styles/space.css";
import "../../src/ui/styles/typography.css";
import "../../src/ui/styles/cursor.css";
import "../../src/ui/styles/unset.css";
import "../../src/ui/styles/shadow.css";
import "../../src/ui/styles/material.css";
import "../../src/ui/styles/palette/gray.css";
import "../../src/ui/styles/neutral/gray.css";
import "../../src/ui/styles/palette/mint.css";
import "../../src/ui/styles/accent/mint.css";
import "../../src/ui/styles/palette/blue.css";
import "../../src/ui/styles/accent/blue.css";
import "../../src/ui/styles/palette/crimson.css";
import "../../src/ui/styles/accent/crimson.css";
import "../../src/ui/styles/palette/iris.css";
import "../../src/ui/styles/accent/iris.css";
import "../../src/ui/styles/palette/amber.css";
import "../../src/ui/styles/accent/amber.css";
// maps the accent scale onto the active neutral (data-accent="neutral"):
import "../../src/ui/styles/accent/neutral.css";
import "../../src/ui/styles/palette/slate.css";
import "../../src/ui/styles/neutral/slate.css";
import "../../src/ui/styles/palette/sand.css";
import "../../src/ui/styles/neutral/sand.css";
import "../../src/ui/styles/palette/mauve.css";
import "../../src/ui/styles/neutral/mauve.css";

import "./preview.css";
import { themeArgs, themeArgTypes, withThemeArgs } from "./theme-args";

// Prepend a warning banner to any story tagged `experimental` (e.g. overlay),
// so its "not production ready" status is obvious in the canvas.
const withExperimentalBanner: Decorator = (story, context) => {
  const node = story();
  if (!context.tags?.includes("experimental")) return node;

  const wrapper = document.createElement("div");
  const banner = document.createElement("div");
  banner.textContent =
    "⚠ Experimental — not production ready. API and behavior may change.";
  banner.style.cssText =
    "margin: 0 0 12px; padding: 8px 12px; border: 1px solid #f0b429;" +
    "border-radius: 6px; background: #fff8e1; color: #7a4f01;" +
    "font: 600 13px/1.4 system-ui, sans-serif;";
  wrapper.appendChild(banner);

  if (typeof node === "string") {
    const host = document.createElement("div");
    host.innerHTML = node;
    wrapper.appendChild(host);
  } else {
    wrapper.appendChild(node as Node);
  }
  return wrapper;
};

const preview: Preview = {
  decorators: [
    withExperimentalBanner,
    withThemeByClassName({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      parentSelector: "html",
    }),
    withThemeArgs,
  ],
  args: themeArgs,
  argTypes: themeArgTypes,
  parameters: {
    controls: { expanded: true },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
