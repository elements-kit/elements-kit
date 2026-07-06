import { createRequire } from "node:module";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Stories live outside this workspace (../../src/ui), so bare `storybook/*`
// specifiers imported from a story resolve against the repo root (where
// `storybook` isn't a dependency). Alias them to this workspace's copy.
const require = createRequire(import.meta.url);

// Runs every story under ../../src/ui as a browser test in real Chromium
// (Playwright) — smoke-renders each story and executes its `play` function.
// This is where form-associated (ElementInternals) behavior is verified, since
// happy-dom has no FACE support.
export default defineConfig({
  plugins: [storybookTest({ configDir: ".storybook" })],
  resolve: {
    alias: {
      "storybook/test": require.resolve("storybook/test"),
    },
  },
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
  },
});
