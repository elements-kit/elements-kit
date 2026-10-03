import type { APIRoute } from "astro";
import { markdownTwin } from "@/docs/markdown-twin";
import { orderedPages, pageFile, pageMeta, SITE } from "@/docs/source";
import { modules } from "@/docs/pages.server";

export const prerender = true;

// Sidebar order, each page tagged with its URL so a model can cite it.
export const GET: APIRoute = () => {
  const body = orderedPages()
    .map((page) => {
      const markdown = modules[pageFile(page)]?._markdown ?? "";
      const twin = markdownTwin(pageMeta(page).title, markdown);
      return twin.replace(/^(# .*\n)/, `$1\nSource: ${SITE}${page.url}\n`);
    })
    .join("\n---\n\n");
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
