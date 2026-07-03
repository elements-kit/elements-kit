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
