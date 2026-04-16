import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  // Oxc (vitest 4 / vite 8 default transformer) — configure JSX with our runtime.
  // `runtime` defaults to 'automatic', so only importSource is needed.
  oxc: {
    jsx: {
      importSource: "elements-kit",
    },
  },
  resolve: {
    alias: {
      "elements-kit/jsx-runtime": resolve(__dirname, "src/jsx-runtime/index.ts"),
      "elements-kit/jsx-dev-runtime": resolve(__dirname, "src/jsx-runtime/index.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
