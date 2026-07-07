import { defineConfig } from "tsdown";

// Two builds: JS and CSS. A single build would collide on the `index.*`
// output stem (src/ui/overlay/index.ts vs index.css — the JS chunk
// shadows the CSS asset), so the CSS entries get their own pass with an
// explicit outDir. `clean: false` keeps it from wiping the JS output.
export default defineConfig([
  {
    // References-free tsconfig: the root tsconfig's `references` (Storybook IDE
    // wiring) makes rolldown-plugin-dts bail out of source loading.
    dts: { tsconfig: "tsconfig.build.json" },
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
      "src/hydrate/index.ts",
      "src/await.ts",
      "src/utilities/*.ts",
      "src/integrations/*.ts",
      "!src/**/*.test.*",
      "src/ui/overlay/index.ts",
      "src/ui/otp-input/index.ts",
    ],
    deps: {
      neverBundle: ["react", "react-dom"],
    },
  },
  {
    // `*.shadow.css` is inlined into JS via `?inline` (adopted stylesheets), not
    // shipped as a public CSS file.
    entry: ["src/ui/**/*.css", "!src/ui/**/*.shadow.css"],
    outDir: "dist/ui",
    clean: false,
    css: {
      transformer: "lightningcss",
      splitting: true,
      target: ["chrome100", "firefox100", "safari16"],
    },
  },
]);
