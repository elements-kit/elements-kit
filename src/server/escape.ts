/** Escape a text node: neutralize markup-significant characters. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;",
  );
}

/** Escape a double-quoted attribute value. */
export function escapeAttr(value: string): string {
  return value.replace(/[&"<]/g, (c) =>
    c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&lt;",
  );
}
