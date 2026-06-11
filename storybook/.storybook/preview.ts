import type { Preview } from "@storybook/html-vite";
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

const preview: Preview = {
  decorators: [
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
  },
};

export default preview;
