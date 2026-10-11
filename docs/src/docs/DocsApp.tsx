/** @jsxImportSource react */
import { lazy, use, type ReactNode } from "react";
import { AstroProvider } from "fumadocs-core/framework/astro";
import { RootProvider } from "fumadocs-ui/provider/base";
import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/notebook/page";
import { loadPage } from "#pages";
import { IslandsContext } from "@/components/Island";
import { pageFile, pageMeta, source, type DocsPage as Page } from "./source";
import { mdxComponents } from "./mdx-components";
import { baseOptions, SidebarFooter } from "./layout";

// Lazy, like fumadocs' default dialog: its Markdown renderer stays off first load.
const PagefindDialog = lazy(() => import("./search"));

interface Props {
  slugs: string[];
  pathname: string;
  /** Named Astro slots: live islands for `<Island name>` (camelCased). */
  [slot: string]: unknown;
}

// The WHOLE page is this one React island: fumadocs-ui runs on React context
// (sidebar, search, theme, page tree), which can't cross island boundaries.
export default function DocsApp({ slugs, pathname, ...islands }: Props) {
  const page = source.getPage(slugs);
  if (!page) throw new Error(`Docs page not found: /${slugs.join("/")}`);

  return (
    <AstroProvider pathname={pathname} params={{ slug: slugs }}>
      <RootProvider search={{ SearchDialog: PagefindDialog }}>
        {/* Notebook, nav on top: the root folders become navbar tabs. */}
        <DocsLayout
          {...baseOptions}
          nav={{ ...baseOptions.nav, mode: "top" }}
          tabMode="navbar"
          tree={source.getPageTree()}
          sidebar={{ footer: SidebarFooter }}
        >
          <IslandsContext value={islands as Record<string, ReactNode>}>
            {/* No Suspense boundary: React would outline a large one (body
                hidden until a reveal script). In the browser the page chunk
                loads lazily and hydration waits on it at the root, keeping
                the server HTML. */}
            <PageView page={page} />
          </IslandsContext>
        </DocsLayout>
      </RootProvider>
    </AstroProvider>
  );
}

function PageView({ page }: { page: Page }) {
  const loaded = loadPage(pageFile(page));
  const mod = loaded instanceof Promise ? use(loaded) : loaded;
  const { title, description, full } = pageMeta(page);
  const MDX = mod.default;

  return (
    <DocsPage toc={mod.toc} full={full}>
      <DocsTitle>{title}</DocsTitle>
      <DocsDescription>{description}</DocsDescription>
      <DocsBody data-pagefind-body>
        <MDX components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}
