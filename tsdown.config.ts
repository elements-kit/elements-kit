import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  entry: [
    "src/index.ts",
    "src/signals/index.ts",
    "src/attributes.ts",
    "src/slot.ts",
    "src/jsx-runtime/index.ts",
    "src/utilities/*.ts",
    "src/integrations/*.ts",
  ],
  deps: {
    neverBundle: ["react", "react-dom"],
  },
});
