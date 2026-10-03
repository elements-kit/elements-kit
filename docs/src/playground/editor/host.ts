// From solid-playground's codemirrorTabs (MIT, see ../LICENSE.solid-playground),
// minus Solid: one EditorView per file (each keeps its undo history), shown one
// at a time in a single pane.
import {
  drawSelection,
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from '@codemirror/view';
import { Compartment, EditorState, StateEffect, type Extension } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { bracketMatching, codeFolding, foldGutter, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { highlightSelectionMatches, search } from '@codemirror/search';
import { lintGutter, linter } from '@codemirror/lint';
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { createTypescriptSession, typescriptLspExtras, typescriptLspTheme } from './typescriptLsp';
import { darkTheme, lightTheme, darkHighlightStyle, lightHighlightStyle } from './themes';
import type { WorkerClient } from '../kernel/workerClient';

export interface PlaygroundFile {
  name: string;
  source: string;
}

export interface EditorHostOptions {
  folder: string;
  dark: boolean;
  formatter: WorkerClient;
  onChange(name: string, source: string): void;
}

interface FileEditor {
  view: EditorView;
  language: Compartment;
  uri: string;
}

const tsExts = new Set(['tsx', 'jsx', 'ts', 'js', 'mts', 'cts', 'mjs', 'cjs']);
const extOf = (name: string) => name.split('.').pop() ?? '';
export const isTsFile = (name: string) => tsExts.has(extOf(name));

const appearanceOf = (dark: boolean): Extension =>
  dark
    ? [darkTheme, syntaxHighlighting(darkHighlightStyle, { fallback: true })]
    : [lightTheme, syntaxHighlighting(lightHighlightStyle, { fallback: true })];

const baseExtensions = (): Extension => [
  lineNumbers(),
  highlightActiveLineGutter(),
  history(),
  foldGutter(),
  codeFolding(),
  indentOnInput(),
  bracketMatching(),
  closeBrackets(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  search({ top: true }),
  drawSelection(),
  EditorState.allowMultipleSelections.of(true),
  keymap.of(vscodeKeymap),
];

// Re-lint without an edit (types arrived).
const relintRequested = StateEffect.define<null>();

export class EditorHost {
  private session = createTypescriptSession();
  private editors = new Map<string, FileEditor>();
  /** LSP documents: uri → last synced source. */
  private documents = new Map<string, string>();
  private appearance = new Compartment();
  private dark: boolean;

  constructor(private opts: EditorHostOptions) {
    this.dark = opts.dark;
  }

  private uriOf = (name: string) => `file:///${this.opts.folder}/${name}`;

  private languageOf(uri: string): Extension {
    const ext = extOf(uri);
    if (tsExts.has(ext)) {
      return [
        javascript({ typescript: true, jsx: ext === 'tsx' || ext === 'jsx' }),
        this.session.client.plugin(uri, 'typescript'),
        typescriptLspExtras,
        typescriptLspTheme,
      ];
    }
    if (ext === 'json') return [json(), autocompletion()];
    return [];
  }

  private build(file: PlaygroundFile): FileEditor {
    const language = new Compartment();
    const editor: FileEditor = { view: undefined!, language, uri: this.uriOf(file.name) };
    editor.view = new EditorView({
      state: EditorState.create({
        doc: file.source,
        extensions: [
          baseExtensions(),
          keymap.of([{ key: 'Mod-s', preventDefault: true, run: () => (void this.format(editor), true) }]),
          this.appearance.of(appearanceOf(this.dark)),
          linter(
            async (view) => {
              if (!isTsFile(editor.uri)) return [];
              this.session.client.sync();
              return this.session.getDiagnostics(editor.uri, view);
            },
            {
              delay: 250,
              needsRefresh: (u) => u.transactions.some((tr) => tr.effects.some((e) => e.is(relintRequested))),
            },
          ),
          lintGutter(),
          language.of(this.languageOf(editor.uri)),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) this.opts.onChange(editor.uri.slice(this.uriOf('').length), u.state.doc.toString());
          }),
        ],
      }),
    });
    return editor;
  }

  /** Mirrors the file list: LSP documents, editor contents, removed files. */
  setFiles(files: PlaygroundFile[]) {
    const live = new Map(files.map((f) => [this.uriOf(f.name), f]));

    for (const [name, editor] of this.editors) {
      if (live.has(editor.uri)) continue;
      editor.view.destroy();
      this.editors.delete(name);
    }
    for (const uri of this.documents.keys()) {
      if (live.has(uri)) continue;
      this.session.worker.postMessage({ method: 'textDocument/didClose', params: { textDocument: { uri } } });
      this.documents.delete(uri);
    }
    for (const [uri, file] of live) {
      const view = this.editors.get(file.name)?.view;
      if (view && view.state.doc.toString() !== file.source) {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: file.source } });
      }
      if (!isTsFile(file.name) || this.documents.get(uri) === file.source) continue;
      const open = this.documents.has(uri);
      this.documents.set(uri, file.source);
      this.session.worker.postMessage(
        open
          ? {
              method: 'textDocument/didChange',
              params: { textDocument: { uri, version: 0 }, contentChanges: [{ text: file.source }] },
            }
          : {
              method: 'textDocument/didOpen',
              params: { textDocument: { uri, languageId: 'typescript', version: 0, text: file.source } },
            },
      );
    }
  }

  /** Keeps the editor (and its history) under the new name. */
  rename(from: string, to: string) {
    const editor = this.editors.get(from);
    if (!editor) return;
    this.editors.delete(from);
    editor.uri = this.uriOf(to);
    editor.view.dispatch({ effects: editor.language.reconfigure(this.languageOf(editor.uri)) });
    this.editors.set(to, editor);
  }

  /** Puts `file`'s editor in `parent` (its panel). */
  mount(file: PlaygroundFile, parent: HTMLElement, focus = true) {
    let editor = this.editors.get(file.name);
    if (!editor) this.editors.set(file.name, (editor = this.build(file)));
    if (editor.view.dom.parentElement !== parent) parent.replaceChildren(editor.view.dom);
    if (focus) editor.view.focus();
  }

  focus(name: string) {
    this.editors.get(name)?.view.focus();
  }

  setDark(dark: boolean) {
    if (dark === this.dark) return;
    this.dark = dark;
    const ext = appearanceOf(dark);
    for (const { view } of this.editors.values()) view.dispatch({ effects: this.appearance.reconfigure(ext) });
  }

  async format(target: FileEditor | string | undefined) {
    const editor = typeof target === 'string' ? this.editors.get(target) : target;
    if (!editor || !isTsFile(editor.uri)) return;
    const { view } = editor;
    const res = await this.opts.formatter.tryRequest<{ code?: string }>('FORMAT', { code: view.state.doc.toString() });
    if (typeof res?.code !== 'string' || res.code === view.state.doc.toString()) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: res.code } });
  }

  syncTypes(importMap: Record<string, string>) {
    this.session
      .syncTypes(importMap)
      .then((changed) => {
        if (!changed) return;
        for (const { view } of this.editors.values()) view.dispatch({ effects: relintRequested.of(null) });
      })
      .catch((e) => console.warn('[playground] type acquisition failed', e));
  }

  destroy() {
    for (const { view } of this.editors.values()) view.destroy();
    this.editors.clear();
    this.session.client.disconnect();
    this.session.worker.terminate();
  }
}
