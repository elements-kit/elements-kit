import type { APIRoute } from "astro";
import { markdownTwin } from "@/docs/markdown-twin";
import { pageFile, pageMeta, source } from "@/docs/source";
import { modules } from "@/docs/pages.server";

export const prerender = true;

export const GET: APIRoute = () => {
  const body = source
    .getPages()
    .map((page) => {
      const markdown = modules[pageFile(page)]?._markdown ?? "";
      return markdownTwin(pageMeta(page).title, markdown);
    })
    .join("\n---\n\n");
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
