import { createElement } from "react";
import { loader, type VirtualFile } from "fumadocs-core/source";
import type { Node as PageTreeNode } from "fumadocs-core/page-tree";
import { BookOpen, LayoutList, Pencil, Puzzle } from "lucide-react";

// Hand-rolled source over Vite globs, not the generated .source/ index:
// .source/server pulls node:path into the client island. Only frontmatter is
// eager here (sidebar + titles); page bodies load through `#pages`.

export interface Frontmatter {
  title: string;
  description?: string;
  full?: boolean;
  navTitle?: string;
  badge?: "CSS" | "JS";
}

const PREFIX = "/content/docs/";

const frontmatter = import.meta.glob<Frontmatter>("/content/docs/**/*.mdx", {
  eager: true,
  import: "frontmatter",
  query: { collection: "docs", only: "frontmatter" },
});

const metas = import.meta.glob<Record<string, unknown>>(
  "/content/docs/**/meta.json",
  { eager: true, import: "default", query: { collection: "docs" } },
);

const files: VirtualFile[] = [
  ...Object.entries(frontmatter).map(([file, data]) => ({
    type: "page" as const,
    path: file.slice(PREFIX.length),
    data: { ...data, file },
  })),
  ...Object.entries(metas).map(([file, data]) => ({
    type: "meta" as const,
    path: file.slice(PREFIX.length),
    data,
  })),
];

const ICONS = { BookOpen, LayoutList, Pencil, Puzzle };

export const source = loader({
  baseUrl: "/",
  source: { files },
  icon: (name) =>
    name && name in ICONS
      ? createElement(ICONS[name as keyof typeof ICONS])
      : undefined,
  pageTree: {
    transformers: [
      {
        file(node, path) {
          const page = path ? this.storage.read(path) : undefined;
          if (page?.format !== "page") return node;
          const { navTitle, badge } = page.data as Frontmatter;
          if (!navTitle && !badge) return node;
          return {
            ...node,
            name: createElement(
              "span",
              { className: "flex w-full items-center gap-2" },
              navTitle ?? node.name,
              badge &&
                createElement(
                  "span",
                  { className: "ek-badge", "data-badge": badge },
                  badge,
                ),
            ),
          };
        },
      },
    ],
  },
});

export type DocsPage = NonNullable<ReturnType<typeof source.getPage>>;

/** Glob key of the page's module, for `#pages`. */
export function pageFile(page: DocsPage): string {
  return (page.data as unknown as { file: string }).file;
}

export const SITE = "https://elements-kit.com";

/** Prerendered pathnames carry the file (`/signals.html`); the URL doesn't. */
export function pagePath(pathname: string): string {
  return pathname.replace(/(\/index)?\.html$/, "").replace(/(.)\/$/, "$1") || "/";
}

/** Absolute URL of the page's Markdown twin. */
export function twinUrl(page: DocsPage): string {
  return `${SITE}${page.url === "/" ? "/index" : page.url.replace(/\/$/, "")}.md`;
}

/** Pages in sidebar order (tree walk), unlisted pages last. */
export function orderedPages(): DocsPage[] {
  const seen = new Set<DocsPage>();
  const walk = (nodes: PageTreeNode[]) => {
    for (const node of nodes) {
      if (node.type === "folder") {
        walk([...(node.index ? [node.index] : []), ...node.children]);
      } else if (node.type === "page" && !node.external) {
        const page = source.getNodePage(node);
        if (page) seen.add(page);
      }
    }
  };
  walk(source.getPageTree().children);
  for (const page of source.getPages()) seen.add(page);
  return [...seen];
}

/** Title of the page's root folder (`Library`, `Components`…). */
export function sectionTitle(page: DocsPage): string | undefined {
  const root = page.path.split("/")[0];
  return metas[`${PREFIX}${root}/meta.json`]?.title as string | undefined;
}

export function pageMeta(page: DocsPage): Frontmatter {
  return page.data as unknown as Frontmatter;
}
