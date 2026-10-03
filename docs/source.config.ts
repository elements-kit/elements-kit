import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
} from "fumadocs-mdx/config";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { transformerTwoslash } from "fumadocs-twoslash";
import ts from "typescript";
import { z } from "zod";
import { CODE_THEMES } from "./src/mdx/themes";
import { rehypeMagicMove, remarkMagicMove } from "./src/mdx/magic-move";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      /** Sidebar label when it differs from the page title. */
      navTitle: z.string().optional(),
      /** Sidebar badge: CSS-only or JS-backed UI component. */
      badge: z.enum(["CSS", "JS"]).optional(),
    }),
    // `_markdown` export: served by the `.md` twins and llms.txt routes.
    postprocess: { includeProcessedMarkdown: true },
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMagicMove],
    // Before rehypeCode: magic-move blocks are swapped out unhighlighted.
    rehypePlugins: (plugins) => [rehypeMagicMove, ...plugins],
    rehypeCodeOptions: {
      themes: CODE_THEMES,
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash({
          twoslashOptions: {
            compilerOptions: {
              jsx: ts.JsxEmit.ReactJSX,
              jsxImportSource: "elements-kit",
              target: ts.ScriptTarget.ESNext,
              module: ts.ModuleKind.ESNext,
              moduleResolution: ts.ModuleResolutionKind.Bundler,
              strict: true,
              experimentalDecorators: true,
            },
          },
        }),
      ],
    },
  },
});
