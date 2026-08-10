import { defineConfig, type Plugin } from "vitest/config";
import { resolve } from "path";
import { transform } from "esbuild";

// Oxc (the vite 8 transformer) has no standard-decorator lowering (only
// `legacy`), and Node can't parse `@decorator` syntax — so any test file
// using TC39 decorators (@slot, @reactive, …) is routed through esbuild.
const esbuildDecorators: Plugin = {
  name: "esbuild-standard-decorators",
  enforce: "pre",
  async transform(code, id) {
    if (!/\.tsx?$/.test(id) || id.includes("node_modules")) return;
    if (!/^\s*@[a-zA-Z]/m.test(code)) return;
    const result = await transform(code, {
      loader: id.endsWith(".tsx") ? "tsx" : "ts",
      target: "es2022",
      tsconfigRaw: { compilerOptions: { experimentalDecorators: false } },
    });
    return { code: result.code, map: result.map };
  },
};

export default defineConfig({
  plugins: [esbuildDecorators],
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
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/playground/**",
      "**/docs/**",
    ],
  },
});
