import type { Code, Root as MdastRoot } from "mdast";
import type { Element, Root as HastRoot } from "hast";
import { visit } from "unist-util-visit";
import { createHighlighter, type Highlighter } from "shiki";
import {
  codeToKeyedTokens,
  createMagicMoveMachine,
} from "shiki-magic-move/core";
import { CODE_THEMES } from "./themes";

// ```tsx magic-move — frames separated by `---` lines, animated step by step.
//
// Two passes: the remark pass keeps a plain code block (final frame) so the
// `_markdown` export reads clean, and tags it with every frame. The rehype
// pass, ahead of rehypeCode, swaps it for <MagicMove> with tokens keyed at
// build time — no highlighter ships to the browser.

const STEP_SEPARATOR = /^\s*---\s*$/m;
const ATTR = "dataMagicMove";

export function remarkMagicMove() {
  return (tree: MdastRoot) => {
    visit(tree, "code", (node: Code) => {
      if (!node.meta?.split(/\s+/).includes("magic-move")) return;
      const steps = node.value
        .replace(/\r\n/g, "\n")
        .split(STEP_SEPARATOR)
        .map((s) => s.replace(/^\n/, "").replace(/\n$/, ""));
      if (steps.length < 2) return;
      node.value = steps.at(-1)!;
      node.data ??= {};
      node.data.hProperties = {
        ...node.data.hProperties,
        [ATTR]: JSON.stringify({ lang: node.lang ?? "text", steps }),
      };
    });
  };
}

let highlighter: Promise<Highlighter> | undefined;

export function rehypeMagicMove() {
  return async (tree: HastRoot) => {
    // mdast-util-to-hast puts `hProperties` on the <code> inside the <pre>.
    const found: { pre: Element; data: string }[] = [];
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "pre") return;
      const code = node.children.find(
        (c): c is Element => c.type === "element" && c.tagName === "code",
      );
      const data = code?.properties?.[ATTR];
      if (data) found.push({ pre: node, data: String(data) });
    });
    if (!found.length) return;

    highlighter ??= createHighlighter({
      themes: Object.values(CODE_THEMES),
      langs: [],
    });
    const hl = await highlighter;

    for (const { pre: node, data } of found) {
      const { lang, steps } = JSON.parse(data) as {
        lang: string;
        steps: string[];
      };
      await hl.loadLanguage(lang as never);
      // One machine run: keys stay stable across frames in both directions.
      const machine = createMagicMoveMachine((code) =>
        codeToKeyedTokens(hl, code, {
          lang: lang as never,
          themes: CODE_THEMES,
          defaultColor: false,
        }),
      );
      const tokens = steps.map((step) => machine.commit(step).current);

      Object.assign(node, {
        type: "mdxJsxFlowElement",
        name: "MagicMove",
        attributes: [
          { type: "mdxJsxAttribute", name: "tokens", value: JSON.stringify(tokens) },
          { type: "mdxJsxAttribute", name: "steps", value: JSON.stringify(steps) },
        ],
        children: [],
      });
      delete (node as Partial<Element>).tagName;
      delete (node as Partial<Element>).properties;
    }
  };
}
