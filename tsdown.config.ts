import { defineConfig } from "tsdown";

export default defineConfig({
  dts: true,
  entry: [
    "src/core.ts",
    "src/signals.ts",
    "src/dom.ts",
    "src/attributes.ts",
    "src/decorators.ts",
    "src/slot.ts",
    "src/jsx-runtime/index.ts",
  ],
});
