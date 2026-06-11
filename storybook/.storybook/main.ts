import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/html-vite";

const src = fileURLToPath(new URL("../../src", import.meta.url));

const config: StorybookConfig = {
  stories: ["../../src/ui/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-themes"],
  framework: "@storybook/html-vite",
  viteFinal: (cfg) => {
    // Relative base so the static build works under the docs site's
    // /storybook/ subpath on Cloudflare.
    cfg.base = "./";
    // Mirror the library's `@/*` tsconfig path alias.
    cfg.resolve = {
      ...cfg.resolve,
      alias: { ...cfg.resolve?.alias, "@": src },
    };
    // Stories live outside this package (../../src/ui) — make sure Vite's
    // dev-server file allowlist covers the workspace root.
    cfg.server = {
      ...cfg.server,
      fs: { ...cfg.server?.fs, allow: ["../.."] },
    };
    return cfg;
  },
};

export default config;
