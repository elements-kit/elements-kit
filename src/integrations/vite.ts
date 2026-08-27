import { HMR_SLOT_NAME } from "./hmr-slot";

// Structural types for the Vite plugin contract, typed locally so elements-kit
// takes no dependency on the vite package (same reasoning as astro.ts).

export interface TransformOptions {
  ssr?: boolean;
}

export interface TransformResult {
  code: string;
  map: null;
}

export interface ElementsKitHmrPlugin {
  name: string;
  apply: "serve";
  enforce: "post";
  transform(
    code: string,
    id: string,
    options?: TransformOptions,
  ): TransformResult | undefined;
}

const COMPONENT_MODULE = /\.[cm]?[jt]sx(\?|$)/;
const JSX_RUNTIME_IMPORT = /["']elements-kit\/jsx-(?:dev-)?runtime["']/;

/**
 * Vite plugin: give elements-kit component modules an HMR accept boundary, so
 * editing one swaps the components it exports instead of reloading the page.
 *
 * The swap itself lives in `elements-kit/jsx-dev-runtime`, which renders every
 * component through a signal holding its current implementation. This plugin
 * only supplies the trigger — which module changed, and what it exported
 * before.
 *
 * Dev only (`apply: "serve"`) and client only — production builds and SSR
 * transforms emit nothing, so no HMR code ships.
 *
 * The Astro integration registers this for you; add it by hand in a plain Vite
 * app. A swapped component re-runs, so its own state resets — keep anything
 * that must survive in a module the edit doesn't invalidate.
 *
 * A module that registers a custom element at top level can't be swapped:
 * re-evaluating it calls `customElements.define` twice, which throws. Give
 * those their own module.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from "vite";
 * import elementsKit from "elements-kit/integrations/vite";
 *
 * export default defineConfig({ plugins: [elementsKit()] });
 * ```
 */
export default function elementsKitHmr(): ElementsKitHmrPlugin {
  return {
    name: "elements-kit:hmr",
    apply: "serve",
    // Post, so this sees the *transformed* module. A `.tsx` source names
    // elements-kit nowhere — the automatic JSX transform is what adds the
    // `elements-kit/jsx-runtime` import this plugin keys off. That import is
    // also what excludes React islands, which carry their own runtime.
    enforce: "post",

    transform(code, id, options) {
      if (options?.ssr) return;
      if (!COMPONENT_MODULE.test(id)) return;
      if (id.includes("/node_modules/")) return;
      if (!JSX_RUNTIME_IMPORT.test(code)) return;

      const exported = collectExports(code);
      if (exported.length === 0) return;

      return { code: `${code}\n${footer(exported)}`, map: null };
    },
  };
}

/**
 * `swap` needs the module's *previous* exports to match against mounted
 * components, so the accept callback closes over them from inside the old
 * module instance.
 *
 * `invalidate()` is the escape hatch, and it is load-bearing: a module that
 * self-accepts with no island on the page would otherwise leave its importers
 * holding stale bindings. Invalidating re-propagates the update upward, back
 * to the ordinary reload.
 */
function footer(exported: ReadonlyArray<readonly [string, string]>): string {
  const previous = exported
    .map(([name, local]) => `${JSON.stringify(name)}: ${local}`)
    .join(", ");

  return `import "elements-kit/integrations/hmr-runtime";
if (import.meta.hot) {
  const __ek_prev = { ${previous} };
  import.meta.hot.accept((__ek_next) => {
    const __ek_hmr = globalThis[Symbol.for(${JSON.stringify(HMR_SLOT_NAME)})];
    if (!__ek_next || !__ek_hmr || !__ek_hmr.swap(__ek_prev, __ek_next)) {
      import.meta.hot.invalidate();
    }
  });
}
`;
}

const IDENT = String.raw`[A-Za-z_$][\w$]*`;

const DECLARATIONS: ReadonlyArray<RegExp> = [
  // export default function Foo / export default class Foo
  new RegExp(
    String.raw`^export\s+default\s+(?:async\s+)?(?:function\s*\*?\s+|class\s+)(${IDENT})`,
    "gm",
  ),
  // export default Foo;
  new RegExp(String.raw`^export\s+default\s+(${IDENT})\s*;`, "gm"),
];

const NAMED: ReadonlyArray<RegExp> = [
  new RegExp(
    String.raw`^export\s+(?:async\s+)?function\s*\*?\s+(${IDENT})`,
    "gm",
  ),
  new RegExp(String.raw`^export\s+class\s+(${IDENT})`, "gm"),
  new RegExp(String.raw`^export\s+(?:const|let|var)\s+(${IDENT})`, "gm"),
];

// `export { a as default, b };` — the trailing `;` is what excludes
// re-exports (`export { a } from "./x";`), whose locals are not in scope here.
const SPECIFIER_LIST = /^export\s*\{([^}]*)\}\s*;/gm;

/**
 * Exported name → local binding, read off the post-transform ESM. The output
 * is machine-generated, so the shapes are regular.
 *
 * An anonymous `export default () => …` has no binding to reference and is
 * skipped. The module still self-accepts; `swap` finds no match and falls
 * through to `invalidate()`, which is the pre-existing reload behaviour.
 */
function collectExports(code: string): Array<[string, string]> {
  const found = new Map<string, string>();

  for (const pattern of DECLARATIONS) {
    for (const match of code.matchAll(pattern)) {
      if (!found.has("default")) found.set("default", match[1]!);
    }
  }

  for (const pattern of NAMED) {
    for (const match of code.matchAll(pattern)) {
      const name = match[1]!;
      if (!found.has(name)) found.set(name, name);
    }
  }

  for (const match of code.matchAll(SPECIFIER_LIST)) {
    for (const entry of match[1]!.split(",")) {
      const parts = entry.trim().split(/\s+as\s+/);
      if (parts.length === 0 || parts[0] === "") continue;
      const local = parts[0]!.trim();
      const name = (parts[1] ?? local).trim();
      if (!new RegExp(`^${IDENT}$`).test(local)) continue;
      if (!found.has(name)) found.set(name, local);
    }
  }

  return [...found];
}
