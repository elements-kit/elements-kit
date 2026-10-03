import type { LoadPage, PageModule } from "./pages";

// Lazy: one chunk per page. Hydration suspends on it and keeps the server HTML.
const loaders = import.meta.glob<PageModule>("/content/docs/**/*.mdx", {
  query: { collection: "docs" },
});

const cache = new Map<string, Promise<PageModule>>();

export const loadPage: LoadPage = (file) => {
  let promise = cache.get(file);
  if (!promise) cache.set(file, (promise = loaders[file]!()));
  return promise;
};
