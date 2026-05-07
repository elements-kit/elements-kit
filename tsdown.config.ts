import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  entry: [
    "src/index.ts",
    "src/for.ts",
    "src/signals/index.ts",
    "src/attributes.ts",
    "src/custom-elements.ts",
    "src/render.ts",
    "src/slot.ts",
    "src/jsx-runtime/index.ts",
    "src/utilities/*.ts",
    "src/integrations/*.ts",
    "src/ui/**/*.css",
  ],
  deps: {
    neverBundle: ["react", "react-dom"],
  },
  css: {
    transformer: "lightningcss",
    splitting: true,
    target: ["chrome100", "firefox100", "safari16"],
  },
});
