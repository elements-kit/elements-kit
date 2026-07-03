import { defineConfig } from "tsdown";

// Two builds: JS and CSS. A single build would collide on the `index.*`
// output stem (src/ui/overlay/index.ts vs index.css — the JS chunk
// shadows the CSS asset), so the CSS entries get their own pass with an
// explicit outDir. `clean: false` keeps it from wiping the JS output.
export default defineConfig([
  {
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
      "src/server/index.ts",
      "src/utilities/*.ts",
      "src/integrations/*.ts",
      "src/ui/overlay/index.ts",
    ],
    deps: {
      neverBundle: ["react", "react-dom"],
    },
  },
  {
    entry: ["src/ui/**/*.css"],
    outDir: "dist/ui",
    clean: false,
    css: {
      transformer: "lightningcss",
      splitting: true,
      target: ["chrome100", "firefox100", "safari16"],
    },
  },
]);
