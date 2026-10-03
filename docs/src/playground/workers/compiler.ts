// Ported from solid-playground (MIT, see ../LICENSE.solid-playground): the
// compiler worker, with Solid's Babel preset swapped for elements-kit's
// setup — TypeScript, automatic JSX from `elements-kit`, standard decorators.
import type { PlaygroundFile as Tab } from '../editor/host';

import { transform } from '@babel/standalone';
import type { InputOptions, PluginItem, Visitor } from '@babel/core';
import type { Node } from '@babel/types';

import dd from 'dedent';

import { serveWorker } from '../kernel/workerServer';

// Mirrors docs/src/playground/files/tsconfig.json.
const babelOptions = (plugins: PluginItem[]): InputOptions => ({
  plugins: [['proposal-decorators', { version: '2023-11' }], ...plugins],
  presets: [
    ['typescript', { onlyRemoveTypeImports: true }],
    // `on:click`, `prop:value`…: elements-kit's namespaced props.
    ['react', { runtime: 'automatic', importSource: 'elements-kit', throwIfNamespace: false }],
  ],
});

function uid(str: string) {
  return Array.from(str)
    .reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0)
    .toString();
}

// The docs' embedded examples export `App` and leave mounting to a hidden
// entry (playground/files/index.js); do the same when the file doesn't render.
const mountApp = (source: string) =>
  /\bexport\s+(class|function|const)\s+App\b/.test(source) && !/^render\s*\(/m.test(source)
    ? '\ndocument.getElementById("app").append(new App().render());\n'
    : '';

function babelTransform(filename: string, code: string, externals: Set<string>) {
  const handleImportee = (node: Node | null | undefined) => {
    if (node?.type !== 'StringLiteral') return;
    const importee = node.value;
    if (importee.startsWith('.')) {
      node.value = 'solidrepl:' + importee.replace(/\.[jt]sx?$/, '');
    } else if (!importee.includes('://')) {
      externals.add(importee);
    }
  };

  const importRewriter = (): { visitor: Visitor } => ({
    visitor: {
      Import(path) {
        if (path.parent.type === 'CallExpression') handleImportee(path.parent.arguments[0]);
      },
      ImportDeclaration(path) {
        handleImportee(path.node.source);
      },
      ExportAllDeclaration(path) {
        handleImportee(path.node.source);
      },
      ExportNamedDeclaration(path) {
        handleImportee(path.node.source);
      },
    },
  });

  const { code: transformedCode } = transform(code, { ...babelOptions([importRewriter]), filename })!;

  // elements-kit's `render()` returns its unmount, which the preview calls on re-run.
  // Top-level call only: `render(` inside a class body is the element's own.
  return transformedCode!.replace(/^render\(/m, 'window.dispose = render(') + (filename === 'main.tsx' ? mountApp(code) : '');
}

function transformTab(tab: Tab, externals: Set<string>): string {
  if (tab.name.endsWith('.css')) {
    const id = uid(tab.name);
    return dd`
      (() => {
        let stylesheet = document.getElementById('${id}');
        if (!stylesheet) {
          stylesheet = document.createElement('style')
          stylesheet.setAttribute('id', '${id}')
          document.head.appendChild(stylesheet)
        }
        const styles = document.createTextNode(\`${tab.source.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\`)
        stylesheet.innerHTML = ''
        stylesheet.appendChild(styles)
      })()
    `;
  }
  return babelTransform(tab.name, tab.source, externals);
}

function compile(tabs: Tab[]) {
  const externals = new Set<string>(['elements-kit/jsx-runtime']);
  const compiled: Record<string, string> = {};
  for (const tab of tabs) {
    const key = `./${tab.name.replace(/\.[jt]sx?$/, '')}`;
    compiled[key] = transformTab(tab, externals);
  }
  return { compiled, externals: [...externals] };
}

serveWorker({
  ROLLUP: ({ tabs }: { tabs: Tab[] }) => compile(tabs),
});
