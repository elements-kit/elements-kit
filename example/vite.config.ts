import { defineConfig } from "vite";
import swc from "@rollup/plugin-swc";
import elementsKitHmr from "elements-kit/integrations/vite";

export default defineConfig({
  plugins: [
    // Component-level HMR. The Astro integration installs this automatically;
    // a plain Vite app adds it here.
    elementsKitHmr(),
    swc({
      include: /\.[cm]?[jt]sx?$/,
      swc: {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true,
            tsx: true,
          },
          transform: { decoratorVersion: "2023-11" },
        },
      },
    }),
  ],
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
