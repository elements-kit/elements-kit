// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import elementsKitSvg, { generateModule, parseSvg } from "./svg";

const plugin = elementsKitSvg();

const CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 -960 960 960"><path d="m250-218 230-262Z"/></svg>`;

describe("elementsKitSvg() plugin shape", () => {
  it("claims ids before the host asset pipeline", () => {
    expect(plugin.name).toBe("elements-kit:svg");
    expect(plugin.enforce).toBe("pre");
  });
});

describe("id selection", () => {
  let dir: string;
  let file: string;

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "ek-svg-"));
    file = path.join(dir, "close.svg");
    await fs.writeFile(file, CLOSE);
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("transforms a `?ek` import", async () => {
    const code = await plugin.load(`${file}?ek`);
    expect(code).toContain('from "elements-kit/jsx-runtime"');
  });

  it("transforms `?ek` alongside other queries", async () => {
    expect(await plugin.load(`${file}?foo&ek`)).toBeDefined();
    expect(await plugin.load(`${file}?ek&foo`)).toBeDefined();
  });

  it("ignores a bare .svg import — that stays the host's asset", async () => {
    expect(await plugin.load(file)).toBeUndefined();
  });

  it("ignores svgr's `?react` — both plugins coexist", async () => {
    expect(await plugin.load(`${file}?react`)).toBeUndefined();
  });

  it("ignores non-svg modules", async () => {
    expect(await plugin.load("/src/agents/Chat.tsx")).toBeUndefined();
  });

  it("honors `exclude` over `include`", async () => {
    const scoped = elementsKitSvg({ exclude: /node_modules/ });
    expect(await scoped.load(`${file}?ek`)).toBeDefined();
    expect(
      await scoped.load(`/app/node_modules/pkg/close.svg?ek`),
    ).toBeUndefined();
  });

  it("accepts a custom `include`", async () => {
    const custom = elementsKitSvg({ include: /\.svg\?icon$/ });
    expect(await custom.load(`${file}?icon`)).toBeDefined();
    expect(await custom.load(`${file}?ek`)).toBeUndefined();
  });
});

describe("generated module", () => {
  it("builds the root through jsx and the interior through the raw sink", () => {
    const code = generateModule(CLOSE, { name: "CloseSvg" });
    expect(code).toContain(
      'import { jsx as _jsx, Fragment as _Fragment } from "elements-kit/jsx-runtime"',
    );
    expect(code).toContain('_jsx("svg", { ...ATTRS, ...props');
    expect(code).toContain("html: true");
    expect(code).toContain('<path d=\\"m250-218 230-262Z\\"/>');
    expect(code).toContain("export default function CloseSvg(props)");
  });

  it("puts children after the spread so the file's markup wins", () => {
    const code = generateModule(CLOSE);
    expect(code.indexOf("...props")).toBeLessThan(code.indexOf("children:"));
  });

  it("omits the child entirely for an empty root", () => {
    const code = generateModule(`<svg viewBox="0 0 1 1"/>`);
    expect(code).not.toContain("_Fragment");
    expect(code).toContain('_jsx("svg", { ...ATTRS, ...props });');
  });

  it("derives a valid identifier from the filename", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ek-svg-name-"));
    const file = path.join(dir, "arrow_drop_down.svg");
    await fs.writeFile(file, CLOSE);
    const code = await plugin.load(`${file}?ek`);
    expect(code).toContain("export default function ArrowDropDownSvg(props)");
    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe("normalization", () => {
  const attrs = (code: string) =>
    JSON.parse(code.match(/const ATTRS = (\{.*\});/)![1]!);

  it("drops the intrinsic size so CSS owns it", () => {
    const a = attrs(generateModule(CLOSE));
    expect(a.width).toBeUndefined();
    expect(a.height).toBeUndefined();
  });

  it("keeps viewBox — without it there is no aspect ratio to scale by", () => {
    expect(attrs(generateModule(CLOSE)).viewBox).toBe("0 -960 960 960");
  });

  it("defaults fill to currentColor", () => {
    expect(attrs(generateModule(CLOSE)).fill).toBe("currentColor");
  });

  it("leaves a file that paints itself alone", () => {
    const painted = `<svg viewBox="0 0 1 1" fill="none" stroke="red"><path d="M0 0"/></svg>`;
    expect(attrs(generateModule(painted)).fill).toBe("none");
  });

  it("passes attributes through byte-for-byte when disabled", () => {
    const a = attrs(generateModule(CLOSE, { normalize: false }));
    expect(a.width).toBe("48");
    expect(a.height).toBe("48");
    expect(a.fill).toBeUndefined();
  });
});

describe("scanner", () => {
  it("handles `>` inside a quoted attribute value", () => {
    const { attributes, inner } = parseSvg(
      `<svg data-label="a > b" viewBox="0 0 1 1"><path d="M0 0"/></svg>`,
    );
    expect(attributes["data-label"]).toBe("a > b");
    expect(attributes.viewBox).toBe("0 0 1 1");
    expect(inner).toBe(`<path d="M0 0"/>`);
  });

  it("handles single-quoted values", () => {
    const { attributes } = parseSvg(`<svg viewBox='0 0 2 2'></svg>`);
    expect(attributes.viewBox).toBe("0 0 2 2");
  });

  it("handles an unquoted value", () => {
    const { attributes } = parseSvg(`<svg width=48></svg>`);
    expect(attributes.width).toBe("48");
  });

  it("handles a valueless attribute", () => {
    const { attributes } = parseSvg(`<svg hidden viewBox="0 0 1 1"></svg>`);
    expect(attributes.hidden).toBe("");
  });

  it("skips an xml prolog, doctype and comments", () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/svg11.dtd">
<!-- Generator: some tool -->
<svg viewBox="0 0 3 3"><g/></svg>`;
    const { attributes, inner } = parseSvg(source);
    expect(attributes.viewBox).toBe("0 0 3 3");
    expect(inner).toBe("<g/>");
  });

  it("handles a self-closing root", () => {
    expect(parseSvg(`<svg viewBox="0 0 1 1"/>`)).toEqual({
      attributes: { viewBox: "0 0 1 1" },
      inner: "",
    });
  });

  it("closes on the last </svg>, not the first — nesting is legal", () => {
    const { inner } = parseSvg(
      `<svg viewBox="0 0 1 1"><svg viewBox="0 0 2 2"><path d="M0 0"/></svg></svg>`,
    );
    expect(inner).toBe(`<svg viewBox="0 0 2 2"><path d="M0 0"/></svg>`);
  });

  it("handles newlines and tabs between attributes", () => {
    const { attributes } = parseSvg(`<svg\n\tviewBox="0 0 1 1"\n\tfill="red"\n></svg>`);
    expect(attributes).toEqual({ viewBox: "0 0 1 1", fill: "red" });
  });

  it("rejects a file whose root is not <svg>", () => {
    expect(() => parseSvg(`<div></div>`)).toThrow(/root element/);
  });

  it("rejects a tag that looks like svg but isn't", () => {
    expect(() => parseSvg(`<svgx viewBox="0 0 1 1"></svgx>`)).toThrow(
      /root element/,
    );
  });

  it("rejects an unterminated open tag", () => {
    expect(() => parseSvg(`<svg viewBox="0 0 1 1"`)).toThrow(/unterminated/);
  });

  it("rejects a missing close tag", () => {
    expect(() => parseSvg(`<svg viewBox="0 0 1 1"><path d="M0 0"/>`)).toThrow(
      /closing/,
    );
  });
});
