import type { APIRoute } from "astro";
import type { Node } from "fumadocs-core/page-tree";
import { pageMeta, source, SITE, twinUrl } from "@/docs/source";

export const prerender = true;

// llmstxt.org index: every page's Markdown twin, grouped by sidebar tab.
export const GET: APIRoute = () => {
  const sections = source.getPageTree().children.flatMap((root) =>
    root.type === "folder"
      ? [`## ${root.name}`, "", ...entries(root.children), ""]
      : [],
  );

  const body = [
    "# ElementsKit",
    "",
    "> Universal reactive primitives for the web — signals, JSX, custom elements, and browser-API helpers.",
    "",
    `Every page concatenated: [llms-full.txt](${SITE}/llms-full.txt)`,
    "",
    ...sections,
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};

function entries(nodes: Node[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === "folder") {
      return entries([...(node.index ? [node.index] : []), ...node.children]);
    }
    if (node.type !== "page" || node.external) return [];
    const page = source.getNodePage(node);
    if (!page) return [];
    const { title, description } = pageMeta(page);
    return [`- [${title}](${twinUrl(page)})${description ? `: ${description}` : ""}`];
  });
}
