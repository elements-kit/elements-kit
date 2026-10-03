// Turns the `_markdown` export of a compiled MDX page into plain Markdown.
//
// fumadocs-mdx stringifies the MDAST for us, but authored components survive
// verbatim — `<Tabs>`, `<Tab>`, `<Callout>` and their escaped attributes. Its
// `filterElement` option, which is documented to unwrap them, is not honoured
// in fumadocs-mdx 15.2 (`() => false` changes nothing), so the unwrapping
// happens here instead.
//
// Unwrapping, not deleting: a <Tab> holds the code sample a reader came for.
// Its children are kept and dedented back to the level the tag sat at, because
// four leading spaces in Markdown is a code block, not indentation.

/** `<Name …>`, `</Name>` or `<Name … />` alone on a line. Components are capitalised; HTML is not. */
const TAG_LINE = /^(\s*)<(\/)?([A-Z][A-Za-z0-9.]*)\b[^>]*?(\/)?>\s*$/
/** The same, appearing inline among prose. */
const TAG_INLINE = /<\/?[A-Z][A-Za-z0-9.]*\b[^>]*?\/?>/g
/** `import …` / `export …` at the top level of an MDX file. */
const ESM_LINE = /^(import|export)\s/

const ENTITIES: Record<string, string> = {
  "&#x22;": '"',
  "&quot;": '"',
  "&#x27;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
}

function decode(text: string) {
  return text.replace(
    /&(?:#x22|quot|#x27|apos|lt|gt|amp);/g,
    (match) => ENTITIES[match] ?? match,
  )
}

const indentOf = (line: string) => line.match(/^\s*/)?.[0].length ?? 0

/** The indent of the next line with content, for working out the nesting step. */
function nextContentIndent(lines: string[], from: number) {
  for (let i = from; i < lines.length; i++) {
    const line = lines[i]!
    if (line.trim()) return indentOf(line)
  }
  return null
}

export function toPlainMarkdown(markdown: string): string {
  const lines = markdown.split("\n")
  const out: string[] = []
  // One entry per open component: how far to pull its children back.
  const dedents: number[] = []
  let fenced = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const total = dedents.reduce((a, b) => a + b, 0)

    // Inside a fence everything is content, including things shaped like tags.
    if (/^\s*(```|~~~)/.test(line.slice(total))) fenced = !fenced

    if (!fenced) {
      if (ESM_LINE.test(line)) continue

      const tag = TAG_LINE.exec(line)
      if (tag) {
        const [, indent = "", closing, , selfClosing] = tag
        if (selfClosing) continue
        if (closing) {
          dedents.pop()
          continue
        }
        const child = nextContentIndent(lines, i + 1)
        dedents.push(child === null ? 0 : Math.max(0, child - indent.length))
        continue
      }
    }

    out.push(decode(total > 0 ? line.slice(total) : line))
  }

  // Unwrapping leaves runs of blank lines where the tags were.
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    // fumadocs heading ids: `## Title [#id]`.
    .replace(/^(#{1,6} .*?) \[#[^\]]+\]$/gm, "$1")
    .replace(/[ \t]+$/gm, "")
    .trim()
}

/** The twin a route serves: an H1 for the title, then the body. */
export function markdownTwin(title: string | undefined, markdown: string) {
  const body = toPlainMarkdown(markdown)
  return title ? `# ${title}\n\n${body}\n` : `${body}\n`
}
