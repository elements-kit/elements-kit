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

/** Neutralize `</script>` sequences inside an inline JSON script payload. */
export function escapeScriptJson(json: string): string {
  return json.replace(/<\//g, "<\\/");
}
