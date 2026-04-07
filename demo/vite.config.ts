import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [cloudflare()],
  resolve: {
    conditions: ["source"],
  },
  esbuild: {
    target: "es2022",
    jsx: "automatic",
    jsxImportSource: "elements-kit",
  },
});
