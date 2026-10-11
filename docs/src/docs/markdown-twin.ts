// The served form of a page's `_markdown` export (see src/mdx/markdown.ts).

/** Build-only fence meta (`twoslash`, `magic-move`) and twoslash directives. */
function clean(markdown: string) {
  return markdown
    .replace(/^(\s*```\w+)[^\n]*$/gm, "$1")
    .replace(/^\s*\/\/ @(noErrors|errors:.*|ts-expect-error.*)\n/gm, "")
    .trim();
}

/** An H1 for the title, then the body. */
export function markdownTwin(title: string | undefined, markdown: string) {
  const body = clean(markdown);
  return title ? `# ${title}\n\n${body}\n` : `${body}\n`;
}
