import { defineConfig } from "vite";
import swc from "@rollup/plugin-swc";

export default defineConfig({
  plugins: [
    swc({
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
