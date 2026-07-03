// @vitest-environment node
// Contract pin: our Astro entrypoints are typed structurally (no astro
// dependency), so nothing would notice if Astro changed its renderer
// contract. This test type-checks them against the *installed* astro's
// published types (reached through the docs workspace) — an Astro bump that
// breaks the contract fails `tsc --noEmit` here instead of in a user's dev
// server. The runtime assertions below just keep vitest engaged.
import { describe, it, expect } from "vitest";
import type {
  AstroIntegration,
  AstroRenderer,
  NamedSSRLoadedRendererValue,
} from "../../docs/node_modules/astro";
import elementsKit from "./astro";
import serverRenderer from "./astro-server";

// ─ Type-level pins (fail at compile time) ────────────────────────────────────

// The integration factory output must be a valid AstroIntegration.
const integrationPin: AstroIntegration = elementsKit();

// The server entrypoint's default export must satisfy the loaded-renderer
// contract (check/renderToStaticMarkup signatures, supportsAstroStaticSlot).
const rendererPin: NamedSSRLoadedRendererValue = serverRenderer;

// The renderer registration shape handed to addRenderer must be accepted.
const registrationPin: AstroRenderer = {
  name: "elements-kit",
  clientEntrypoint: "elements-kit/integrations/astro-client",
  serverEntrypoint: "elements-kit/integrations/astro-server",
};

describe("astro contract pin", () => {
  it("integration and renderer satisfy the installed astro types", () => {
    expect(integrationPin.name).toBe("elements-kit");
    expect(rendererPin.name).toBe("elements-kit");
    expect(registrationPin.serverEntrypoint).toContain("astro-server");
  });

  it("registers a renderer whose shape astro accepts", () => {
    let captured: AstroRenderer | undefined;
    elementsKit().hooks["astro:config:setup"]({
      addRenderer: (r: AstroRenderer) => {
        captured = r;
      },
      updateConfig: () => ({}),
    });
    expect(captured?.clientEntrypoint).toBe(
      "elements-kit/integrations/astro-client",
    );
  });
});
