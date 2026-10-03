import type { FC } from "react";
import type { MDXComponents } from "mdx/types";
import type { TableOfContents } from "fumadocs-core/toc";

/** A compiled page, as fumadocs-mdx emits it. */
export interface PageModule {
  default: FC<{ components?: MDXComponents }>;
  toc: TableOfContents;
  /** Clean Markdown (`includeProcessedMarkdown`), for `.md` twins and llms.txt. */
  _markdown?: string;
}

/** Keyed by glob path. Sync on the server; a cached promise in the browser. */
export type LoadPage = (file: string) => PageModule | Promise<PageModule>;
