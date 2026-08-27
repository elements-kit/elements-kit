import fs from "node:fs/promises";

// Structural types for the Vite plugin contract, typed locally so elements-kit
// takes no dependency on the vite package (same reasoning as astro.ts).

export interface ElementsKitSvgPlugin {
  name: string;
  enforce: "pre";
  load(id: string): Promise<string | undefined>;
}

export interface ElementsKitSvgOptions {
  /** Ids this plugin claims. Default: any path ending `.svg?ek`. */
  include?: RegExp;
  /** Ids to leave alone even when `include` matches. */
  exclude?: RegExp;
  /**
   * Strip the root's `width`/`height` and default `fill` to `currentColor`, so
   * an icon sizes with the font and follows text color. Turn off for artwork
   * that carries its own palette and intrinsic size.
   */
  normalize?: boolean;
}

const DEFAULT_INCLUDE = /\.svg\?(?:.*&)?ek(?:&|$)/;
const QUERY = /[?#].*$/s;

/** Parsed root `<svg>` open tag plus everything between it and `</svg>`. */
export interface SvgSource {
  attributes: Record<string, string>;
  inner: string;
}

/**
 * Vite plugin: import an SVG file as an elements-kit component.
 *
 * `import Close from "./close.svg?ek"` yields a function component rendering
 * the file's root `<svg>` as a real elements-kit element — so `class`,
 * `style:`, `on:`, `ref` and reactive props all work — with the interior
 * markup passed through verbatim.
 *
 * Server rendering needs no special case: the generated module builds its tree
 * through `jsx`, which dispatches to whichever renderer is active, and the
 * interior rides the raw-HTML sink that the hydration claim walk already knows.
 *
 * Register it yourself in `vite.config` (or `astro.config`'s `vite.plugins`).
 * Coexists with vite-plugin-svgr — the `?ek` and `?react` queries claim
 * different ids.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from "vite";
 * import elementsKitSvg from "elements-kit/integrations/svg";
 *
 * export default defineConfig({ plugins: [elementsKitSvg()] });
 * ```
 *
 * ```tsx
 * import Close from "@material-symbols/svg-300/outlined/close.svg?ek";
 *
 * <button class="unset x-button" aria-label="Close">
 *   <Close class="x-icon" />
 * </button>
 * ```
 */
export default function elementsKitSvg(
  options: ElementsKitSvgOptions = {},
): ElementsKitSvgPlugin {
  const {
    include = DEFAULT_INCLUDE,
    exclude,
    normalize: shouldNormalize = true,
  } = options;

  return {
    name: "elements-kit:svg",
    // Pre, so this claims the id before the host framework's own asset
    // pipeline turns `.svg` into a URL or a foreign component.
    enforce: "pre",

    async load(id) {
      if (!include.test(id)) return;
      if (exclude?.test(id)) return;

      const filePath = id.replace(QUERY, "");
      const source = await fs.readFile(filePath, "utf8");
      return generateModule(source, {
        normalize: shouldNormalize,
        name: componentName(filePath),
      });
    },
  };
}

// ─ Codegen ────────────────────────────────────────────────────────────────────

export function generateModule(
  source: string,
  { normalize: shouldNormalize = true, name = "Svg" } = {},
): string {
  const { attributes, inner } = parseSvg(source);
  const attrs = shouldNormalize ? normalize(attributes) : attributes;

  // `children` sits after the spread on purpose: the file's own markup wins, so
  // a stray `children` prop is ignored rather than blanking the icon.
  const hasInner = inner.trim() !== "";
  const child = hasInner
    ? `, children: _jsx(_Fragment, { html: true, ns: "svg", children: ${JSON.stringify(inner)} })`
    : "";
  const imports = hasInner
    ? "jsx as _jsx, Fragment as _Fragment"
    : "jsx as _jsx";

  return `import { ${imports} } from "elements-kit/jsx-runtime";
const ATTRS = ${JSON.stringify(attrs)};
export default function ${name}(props) {
  return _jsx("svg", { ...ATTRS, ...props${child} });
}
`;
}

/**
 * Drop the intrinsic size so CSS owns it, and inherit text color unless the
 * file already paints itself. `viewBox` stays — without it the icon has no
 * aspect ratio to scale by.
 */
function normalize(attributes: Record<string, string>): Record<string, string> {
  const { width: _w, height: _h, ...rest } = attributes;
  return "fill" in rest ? rest : { ...rest, fill: "currentColor" };
}

/** `outlined/close.svg` → `CloseSvg`; always a valid JS identifier. */
function componentName(filePath: string): string {
  const base = filePath.split(/[\\/]/).pop()?.replace(/\.svg$/, "") ?? "";
  const pascal = base
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join("");
  return /^[A-Za-z]/.test(pascal) ? `${pascal}Svg` : "Svg";
}

// ─ Scanner ────────────────────────────────────────────────────────────────────

// Hand-rolled rather than a regex: attribute values legally contain `>`, and
// the file may open with a prolog, doctype, or comment before the root tag.
export function parseSvg(source: string): SvgSource {
  let i = skipPreamble(source, 0);

  if (!/^<svg[\s/>]/.test(source.slice(i))) {
    throw new Error(
      "elements-kit:svg — expected the file to start with an <svg> root element.",
    );
  }
  i += 4; // past "<svg"

  const attributes: Record<string, string> = {};
  let selfClosing = false;

  for (;;) {
    while (i < source.length && isSpace(source[i]!)) i++;
    if (i >= source.length) {
      throw new Error("elements-kit:svg — unterminated <svg> open tag.");
    }
    if (source[i] === ">") {
      i++;
      break;
    }
    if (source[i] === "/" && source[i + 1] === ">") {
      selfClosing = true;
      i += 2;
      break;
    }

    const nameStart = i;
    while (i < source.length && !isSpace(source[i]!) && !"=/>".includes(source[i]!))
      i++;
    const name = source.slice(nameStart, i);
    if (!name) {
      throw new Error("elements-kit:svg — malformed attribute in <svg> open tag.");
    }

    while (i < source.length && isSpace(source[i]!)) i++;
    if (source[i] !== "=") {
      attributes[name] = ""; // valueless attribute
      continue;
    }
    i++;
    while (i < source.length && isSpace(source[i]!)) i++;

    const quote = source[i];
    if (quote === '"' || quote === "'") {
      i++;
      const valueStart = i;
      while (i < source.length && source[i] !== quote) i++;
      attributes[name] = source.slice(valueStart, i);
      i++; // past the closing quote
    } else {
      const valueStart = i;
      while (i < source.length && !isSpace(source[i]!) && source[i] !== ">") i++;
      attributes[name] = source.slice(valueStart, i);
    }
  }

  if (selfClosing) return { attributes, inner: "" };

  // Last, not first: nested <svg> elements are legal.
  const close = source.lastIndexOf("</svg>");
  if (close < i) {
    throw new Error("elements-kit:svg — missing closing </svg> tag.");
  }
  return { attributes, inner: source.slice(i, close) };
}

/** Advance past leading whitespace, `<?xml …?>`, `<!DOCTYPE …>` and comments. */
function skipPreamble(source: string, from: number): number {
  let i = from;
  for (;;) {
    while (i < source.length && isSpace(source[i]!)) i++;
    const rest = source.slice(i);
    if (rest.startsWith("<?")) {
      const end = source.indexOf("?>", i);
      if (end === -1) break;
      i = end + 2;
    } else if (rest.startsWith("<!--")) {
      const end = source.indexOf("-->", i);
      if (end === -1) break;
      i = end + 3;
    } else if (rest.startsWith("<!")) {
      const end = source.indexOf(">", i);
      if (end === -1) break;
      i = end + 1;
    } else {
      break;
    }
  }
  return i;
}

function isSpace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}
