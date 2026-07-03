// ═══════════════════════════════════════════════════════════════════════════════
// Child Types
// ═══════════════════════════════════════════════════════════════════════════════

export type PrimitiveNodeType =
  | Node
  | string
  | boolean
  | number
  | bigint
  | symbol
  | Date
  | RegExp
  | null
  | undefined;

export class UnsupportedChildError extends Error {
  constructor(value: unknown) {
    super(`Unsupported child type: ${typeof value}`);
    this.name = "UnsupportedChildError";
  }
}

export function resolveNode(c: PrimitiveNodeType): Node {
  if (c instanceof Node) return c;
  if (c === null || c === undefined || typeof c === "boolean")
    return document.createComment("");
  if (
    typeof c === "string" ||
    typeof c === "number" ||
    typeof c === "bigint" ||
    typeof c === "symbol" ||
    c instanceof Date ||
    c instanceof RegExp
  )
    return document.createTextNode(String(c));

  throw new UnsupportedChildError(c);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Raw HTML
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Brand for {@link RawHtmlNode}. `Symbol.for` so the brand survives duplicate
 * module instances (e.g. pre-bundled + source copies in dev).
 */
export const RAW_HTML: unique symbol = Symbol.for("elements-kit.raw-html");

/**
 * A deliberate raw-HTML child: the string is emitted/parsed as markup, not
 * escaped as text. This is the library's only raw sink — sanitizing the
 * string is the caller's responsibility. Parsing is script-inert (`<script>`
 * tags do not execute).
 *
 * `tag`/`name` optionally wrap the HTML in an element (used by the Astro
 * integration for `<astro-slot name="…">` wrappers).
 */
export interface RawHtmlNode {
  [RAW_HTML]: string;
  tag?: string;
  name?: string;
}

/** Create a {@link RawHtmlNode}. */
export function rawHtml(html: string, tag?: string, name?: string): RawHtmlNode {
  return { [RAW_HTML]: html, tag, name };
}

/** Type-guard for {@link RawHtmlNode}. */
export function isRawHtml(value: unknown): value is RawHtmlNode {
  return typeof value === "object" && value !== null && RAW_HTML in value;
}
