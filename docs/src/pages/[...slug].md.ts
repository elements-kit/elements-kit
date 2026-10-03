import type { APIRoute } from "astro";
import { markdownTwin } from "@/docs/markdown-twin";
import { pageFile, pageMeta, source } from "@/docs/source";
import { modules } from "@/docs/pages.server";

// The Markdown twin of each page: content without the shell, for agents.
export const prerender = true;

export function getStaticPaths() {
  return source.getPages().map((page) => ({
    // The landing page would otherwise be served at `/.md`.
    params: { slug: page.slugs.length > 0 ? page.slugs.join("/") : "index" },
  }));
}

export const GET: APIRoute = ({ params }) => {
  const slug = params.slug === "index" ? "" : (params.slug ?? "");
  const page = source.getPage(slug ? slug.split("/") : []);
  const markdown = page && modules[pageFile(page)]?._markdown;
  if (!page || !markdown) return new Response("Not found", { status: 404 });
  return new Response(markdownTwin(pageMeta(page).title, markdown), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
};
