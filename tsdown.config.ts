import { defineConfig } from "tsdown";
import { transform } from "esbuild";

/** Rolldown's Oxc transform preserves standard decorators (verified through
 * oxc-transform 0.147: no `decoratorVersion` option, no lowering at any
 * target), which leaves `@reactive()` syntax in published JavaScript. esbuild
 * lowers them. The filters run on rolldown's Rust side, so only the handful of
 * decorator-bearing modules pay for the extra pass. The `code` filter is
 * line-anchored because `@` is common in JSDoc; `scripts/assert-dist.mjs`
 * catches anything it misses. */
const standardDecorators = {
  name: "lower-standard-decorators",
  transform: {
    filter: {
      id: /\.[cm]?[jt]sx?(?:\?|$)/,
      code: /^\s*@[A-Za-z_$]/m,
    },
    async handler(code: string, id: string) {
      const result = await transform(code, {
        loader: /\.tsx(?:\?|$)/.test(id) ? "tsx" : "ts",
        target: "es2022",
        sourcemap: true,
        tsconfigRaw: { compilerOptions: { experimentalDecorators: false } },
      });
      return { code: result.code, map: result.map };
    },
  },
};

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
      "src/jsx-runtime/dev.ts",
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
