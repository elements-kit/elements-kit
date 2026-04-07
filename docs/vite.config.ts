import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => ({
  plugins: [cloudflare()],
  resolve: {
    conditions: mode === "development" ? ["source"] : [],
  },
  esbuild: {
    target: "es2022",
    jsx: "automatic",
    jsxImportSource: "elements-kit",
  },
}));
