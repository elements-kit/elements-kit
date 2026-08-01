// @vitest-environment node
import { describe, it, expect } from "vitest";
import elementsKitHmr from "./hmr-plugin";
import { HMR_SLOT_NAME } from "./hmr-slot";

const plugin = elementsKitHmr();

/** Stand-in for post-transform output of an elements-kit `.tsx` module. */
const island = `import { jsx as _jsx } from "elements-kit/jsx-runtime";
export default function Chat(props) {
  return _jsx("div", {});
}
`;

const transform = (code: string, id: string, ssr = false) =>
  plugin.transform(code, id, { ssr });

describe("elementsKitHmr() plugin shape", () => {
  it("is dev-only and runs after the jsx transform", () => {
    expect(plugin.name).toBe("elements-kit:hmr");
    expect(plugin.apply).toBe("serve");
    expect(plugin.enforce).toBe("post");
  });
});

describe("module selection", () => {
  it("transforms an elements-kit jsx module", () => {
    const result = transform(island, "/src/agents/Chat.tsx");
    expect(result?.code).toContain("import.meta.hot.accept");
    expect(result?.code).toContain(
      'import "elements-kit/integrations/hmr-runtime"',
    );
  });

  it("accepts the dev jsx runtime too", () => {
    const dev = island.replace("jsx-runtime", "jsx-dev-runtime");
    expect(transform(dev, "/src/Chat.tsx")).toBeDefined();
  });

  it("skips React modules — they import their own runtime", () => {
    const react = `import { jsx as _jsx } from "react/jsx-runtime";
export default function Nav() { return _jsx("nav", {}); }
`;
    expect(transform(react, "/src/components/nav/Nav.tsx")).toBeUndefined();
  });

  it("skips non-jsx modules", () => {
    expect(transform(island, "/src/agents/agent.ts")).toBeUndefined();
  });

  it("skips node_modules", () => {
    expect(
      transform(island, "/app/node_modules/some-pkg/dist/Widget.jsx"),
    ).toBeUndefined();
  });

  it("skips the ssr environment — no HMR code in the server bundle", () => {
    expect(transform(island, "/src/agents/Chat.tsx", true)).toBeUndefined();
  });

  it("tolerates a query suffix on the id", () => {
    expect(transform(island, "/src/Chat.tsx?astro&type=script")).toBeDefined();
  });
});

describe("export collection", () => {
  const previous = (code: string, id = "/src/Component.tsx") => {
    const out = transform(code, id)?.code ?? "";
    return out.match(/const __ek_prev = \{([^}]*)\}/)?.[1]?.trim() ?? "";
  };

  it("maps a default function declaration", () => {
    expect(previous(island)).toBe('"default": Chat');
  });

  it("maps `export default Foo;`", () => {
    const code = `import { jsx as _jsx } from "elements-kit/jsx-runtime";
const Panel = () => _jsx("div", {});
export default Panel;
`;
    expect(previous(code)).toBe('"default": Panel');
  });

  it("maps named function and const exports", () => {
    const code = `import { jsx as _jsx } from "elements-kit/jsx-runtime";
export function Header() { return _jsx("h1", {}); }
export const Footer = () => _jsx("footer", {});
`;
    expect(previous(code)).toBe('"Header": Header, "Footer": Footer');
  });

  it("maps a specifier list, including `as default`", () => {
    const code = `import { jsx as _jsx } from "elements-kit/jsx-runtime";
function Chat() { return _jsx("div", {}); }
function Bubble() { return _jsx("p", {}); }
export { Chat as default, Bubble };
`;
    expect(previous(code)).toBe('"default": Chat, "Bubble": Bubble');
  });

  it("ignores re-exports, whose locals are not in scope", () => {
    const code = `import { jsx as _jsx } from "elements-kit/jsx-runtime";
export { Card } from "./card";
export function Row() { return _jsx("div", {}); }
`;
    expect(previous(code)).toBe('"Row": Row');
  });

  it("leaves an anonymous default alone rather than emitting a bad reference", () => {
    const code = `import { jsx as _jsx } from "elements-kit/jsx-runtime";
export default () => _jsx("div", {});
`;
    // Nothing referenceable, no other export: the module is left untouched and
    // keeps today's reload behaviour.
    expect(transform(code, "/src/Anon.tsx")).toBeUndefined();
  });

  it("appends rather than rewriting — the original module is intact", () => {
    const result = transform(island, "/src/agents/Chat.tsx");
    expect(result?.code.startsWith(island)).toBe(true);
    expect(result?.map).toBeNull();
  });

  it("falls back to invalidate when nothing swapped", () => {
    const result = transform(island, "/src/agents/Chat.tsx");
    expect(result?.code).toContain("import.meta.hot.invalidate()");
  });

  it("emits the shared slot key — drift here fails silently at runtime", () => {
    const result = transform(island, "/src/agents/Chat.tsx");
    expect(result?.code).toContain(
      `Symbol.for(${JSON.stringify(HMR_SLOT_NAME)})`,
    );
  });
});
