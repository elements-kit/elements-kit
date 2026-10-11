// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";
import elementsKit from "./astro";

/** A project root whose `node_modules/vite` reports the given package.json. */
function rootWithVite(pkg: { name?: string; version: string }): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ek-astro-"));
  const dir = path.join(root, "node_modules", "vite");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "vite", ...pkg, exports: { "./package.json": "./package.json" } }),
  );
  return root;
}

/** The vite config the integration hands Astro for a given project root. */
function viteConfigFor(root?: string) {
  const updateConfig = vi.fn();
  elementsKit().hooks["astro:config:setup"]({
    addRenderer: vi.fn(),
    updateConfig,
    config: root ? { root } : undefined,
  });
  return (updateConfig.mock.calls[0]![0] as { vite: Record<string, any> }).vite;
}

describe("elementsKit() Astro integration factory", () => {
  it("is named elements-kit", () => {
    expect(elementsKit().name).toBe("elements-kit");
  });

  it("registers the renderer pair on astro:config:setup", () => {
    const addRenderer = vi.fn();
    const updateConfig = vi.fn();

    elementsKit().hooks["astro:config:setup"]({ addRenderer, updateConfig });

    expect(addRenderer).toHaveBeenCalledWith({
      name: "elements-kit",
      clientEntrypoint: "elements-kit/integrations/astro-client",
      serverEntrypoint: "elements-kit/integrations/astro-server",
    });
  });

  it("injects the elements-kit jsx import source into vite", () => {
    const addRenderer = vi.fn();
    const updateConfig = vi.fn();

    elementsKit().hooks["astro:config:setup"]({ addRenderer, updateConfig });

    const config = updateConfig.mock.calls[0]![0] as {
      vite: {
        optimizeDeps: { include: string[] };
        resolve: { dedupe: string[] };
        plugins: Array<{ name: string; apply: string }>;
      };
    };
    // One runtime instance in dev: every subpath (including deep utility
    // imports via the glob) joins the same optimizer graph as the
    // force-prebundled client entrypoint.
    expect(config.vite.optimizeDeps.include).toContain("elements-kit/signals");
    expect(config.vite.optimizeDeps.include).toContain(
      "elements-kit/integrations/astro-client",
    );
    expect(config.vite.optimizeDeps.include).toContain(
      "elements-kit/utilities/*",
    );
    expect(config.vite.resolve.dedupe).toContain("elements-kit");
  });

  // Vite 8 transforms with Oxc and ignores `esbuild` (warning when both are
  // set); older Vite reads `esbuild` and knows nothing of `oxc`.
  it("uses the oxc jsx key on vite 8", () => {
    const vite = viteConfigFor(rootWithVite({ version: "8.1.3" }));

    expect(vite.oxc).toEqual({
      jsx: { runtime: "automatic", importSource: "elements-kit" },
    });
    expect(vite.esbuild).toBeUndefined();
  });

  it("uses the oxc jsx key on rolldown-vite", () => {
    const vite = viteConfigFor(
      rootWithVite({ name: "rolldown-vite", version: "7.1.0" }),
    );

    expect(vite.oxc.jsx.importSource).toBe("elements-kit");
    expect(vite.esbuild).toBeUndefined();
  });

  it("uses the esbuild jsx key on pre-oxc vite", () => {
    const vite = viteConfigFor(rootWithVite({ version: "7.3.2" }));

    expect(vite.esbuild).toEqual({
      jsx: "automatic",
      jsxImportSource: "elements-kit",
    });
    expect(vite.oxc).toBeUndefined();
  });

  it("installs the dev HMR plugin and keeps its runtime on one graph", () => {
    const addRenderer = vi.fn();
    const updateConfig = vi.fn();

    elementsKit().hooks["astro:config:setup"]({ addRenderer, updateConfig });

    const config = updateConfig.mock.calls[0]![0] as {
      vite: {
        optimizeDeps: { include: string[] };
        plugins: Array<{ name: string; apply: string }>;
      };
    };
    const hmr = config.vite.plugins.find((p) => p.name === "elements-kit:hmr");
    expect(hmr).toBeDefined();
    // Dev only — a production build must not carry an accept boundary.
    expect(hmr!.apply).toBe("serve");
    // The registry re-mounts through `render`, so it has to resolve to the
    // same runtime instance the islands were built with.
    expect(config.vite.optimizeDeps.include).toContain(
      "elements-kit/integrations/hmr-runtime",
    );
  });
});
