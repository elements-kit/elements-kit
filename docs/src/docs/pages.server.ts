import type { LoadPage, PageModule } from "./pages";

// Eager: the server render is synchronous, so the HTML carries the full page.
const modules = import.meta.glob<PageModule>("/content/docs/**/*.mdx", {
  eager: true,
  query: { collection: "docs" },
});

export const loadPage: LoadPage = (file) => modules[file]!;
export { modules };
