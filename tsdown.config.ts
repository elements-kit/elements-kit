import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  entry: [
    "src/index.ts",
    "src/signals.ts",
    "src/attributes.ts",
    "src/slot.ts",
    "src/jsx-runtime/index.ts",
    "src/builder/index.ts",
    "src/builder/dom.ts",
    "src/signals/react.ts",
  ],
  deps: {
    neverBundle: ["react", "react-dom"],
  },
});
