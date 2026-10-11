import type { Nodes, Parents } from "mdast";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx";
import type { Info, State } from "mdast-util-to-markdown";

// The `_markdown` export (`.md` twins, llms-full.txt): wrappers unwrap to
// their content, widgets drop out, and attribute-borne text (titles) stays.

type Jsx = MdxJsxFlowElement | MdxJsxTextElement;

const DROPPED = new Set(["Playground", "StorybookEmbed", "Diagram", "Island"]);

const isJsx = (node: Nodes): node is Jsx =>
  node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";

export function filterElement(node: Nodes): boolean | "children-only" {
  if (node.type === "mdxjsEsm") return false;
  if (!isJsx(node)) return true;
  if (node.name === "Callout" || node.name === "Card") return true;
  return DROPPED.has(node.name ?? "") ? false : "children-only";
}

/** String attribute, or a JSX expression flattened to Markdown text. */
function attr(node: Jsx, name: string): string | undefined {
  const found = node.attributes.find(
    (a) => a.type === "mdxJsxAttribute" && a.name === name,
  );
  if (!found || found.type !== "mdxJsxAttribute") return;
  if (typeof found.value === "string") return found.value;
  return found.value?.value
    .replace(/<code>(.*?)<\/code>/g, "`$1`")
    .replace(/<\/?[a-z]*>/gi, "")
    .replace(/\{"(.)"\}/g, "$1")
    .trim();
}

export function stringify(
  node: Nodes,
  _parent: Parents | undefined,
  state: State,
  info: Info,
): string | undefined {
  if (!isJsx(node)) return;
  const body = () =>
    node.type === "mdxJsxFlowElement"
      ? state.containerFlow(node, info)
      : state.containerPhrasing(node, info);

  if (node.name === "Callout") {
    const title = attr(node, "title");
    const text = [title && `**${title}**`, body()].filter(Boolean).join("\n\n");
    return text.replace(/^/gm, "> ").replace(/^> $/gm, ">");
  }
  if (node.name === "Card") {
    const title = attr(node, "title") ?? "";
    const href = attr(node, "href");
    const description = attr(node, "description");
    if (href) return `- [${title}](${href})${description ? `: ${description}` : ""}`;
    return [`**${title}**`, body()].filter(Boolean).join("\n\n");
  }
}
