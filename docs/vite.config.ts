import { defineConfig, type Plugin } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";

function markdownPlugin(): Plugin {
  return {
    name: "md-to-html",
    enforce: "pre",
    async transform(code, id) {
      if (!id.endsWith(".md")) return;
      const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        .use(rehypeShiki, {
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        })
        .use(rehypeStringify)
        .process(code);
      return `export default ${JSON.stringify(String(result))}`;
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [markdownPlugin(), cloudflare()],
  resolve: {
    conditions: mode === "development" ? ["source"] : [],
  },
  esbuild: {
    target: "es2022",
    jsx: "automatic",
    jsxImportSource: "elements-kit",
  },
}));
