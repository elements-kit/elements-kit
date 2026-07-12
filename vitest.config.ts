import { transform } from "esbuild";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { resolve } from "path";

/** A decorator at the start of a (possibly indented) line. */
const DECORATOR = /^\s*@[A-Za-z_$]/m;

export default defineConfig({
  plugins: [
    {
      // Oxc passes standard (2023-11) decorators through UNTRANSFORMED
      // and V8 has no native support — `@reactive()` fields would throw
      // `SyntaxError: Invalid or unexpected token` at import. Lower
      // decorator-bearing .ts files with esbuild (which implements the
      // proposal) before oxc sees them.
      name: "lower-standard-decorators",
      async transform(code, id) {
        if (!id.endsWith(".ts") || id.includes("node_modules")) return;
        if (!DECORATOR.test(code)) return;
        const out = await transform(code, {
          loader: "ts",
          target: "es2022",
          sourcemap: true,
        });
        return { code: out.code, map: out.map };
      },
    },
  ],
  // Oxc (vitest 4 / vite 8 default transformer) — configure JSX with our runtime.
  // `runtime` defaults to 'automatic', so only importSource is needed.
  oxc: {
    jsx: {
      importSource: "elements-kit",
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "elements-kit/jsx-runtime": resolve(
        __dirname,
        "src/jsx-runtime/index.ts",
      ),
      "elements-kit/jsx-dev-runtime": resolve(
        __dirname,
        "src/jsx-runtime/index.ts",
      ),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "happy-dom",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/playground/**",
            "**/docs/**",
            "**/*.browser.test.ts",
          ],
        },
      },
      {
        // Real-browser interaction/visual tests (Playwright + Chromium): true
        // layout, gestures, top layer — where the overlay's geometry lives.
        extends: true,
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [
              { browser: "chromium", viewport: { width: 1280, height: 900 } },
            ],
          },
        },
      },
    ],
  },
});
