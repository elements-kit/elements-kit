import { defineConfig } from "vite";

export default defineConfig({
  // Sandpack's terminal polyfill doesn't implement `readline.clearScreenDown`,
  // so Vite's default rebuild logger throws inside the iframe. Disable the
  // clear so the dev server logs append instead.
  clearScreen: false,
  build: {
    target: "es2022",
  },
  esbuild: {
    target: "es2022",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
});
