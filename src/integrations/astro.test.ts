// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import elementsKit from "./astro";

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
        esbuild: { jsx: string; jsxImportSource: string };
        optimizeDeps: { include: string[] };
        resolve: { dedupe: string[] };
      };
    };
    expect(config.vite.esbuild.jsx).toBe("automatic");
    expect(config.vite.esbuild.jsxImportSource).toBe("elements-kit");
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
});
