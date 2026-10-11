/** @jsxImportSource react */
import { useEffect, useMemo, useRef, useState } from "react";
import { DockviewReact, type DockviewApi, type DockviewTheme } from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { EditorHost, type PlaygroundFile } from "./editor/host";
import { formatterClient, useBuild, useDark } from "./engine";
import { exampleById, exampleFiles } from "./examples";
import { CURRENT_EVENT, LOAD_EVENT, exampleUrl } from "./ExamplesSidebar";
import { IMPORT_MAP_FILE, parseImportMap, serializeImportMap, syncImportMap } from "./kernel/importMap";
import { decodeState, encodeState } from "./share";
import { defaultFiles, ENTRY } from "./defaults";
import { usePreview } from "./Preview";
import {
  DEVTOOLS,
  DevtoolsPanel,
  FilePanel,
  LeftActions,
  PREVIEW,
  PreviewPanel,
  ReplContext,
  RightActions,
  Tab,
  type ReplApi,
} from "./dock";

const PINNED = [ENTRY, IMPORT_MAP_FILE];

// Share format (`share.ts`): `{ "/main.tsx": code }`; examples come as `{ "main.tsx": code }`.
const fromShared = (files: Record<string, string>): PlaygroundFile[] =>
  Object.entries(files).map(([path, source]) => ({ name: path.replace(/^\//, ""), source }));
const toShared = (files: PlaygroundFile[]) => Object.fromEntries(files.map((f) => [`/${f.name}`, f.source]));

/** The code, minus the generated import map. */
const sourcesKey = (files: PlaygroundFile[]) =>
  JSON.stringify(files.filter((f) => f.name !== IMPORT_MAP_FILE).map((f) => [f.name, f.source]).sort());

/** As given (an example's focus file leads), with the import map last. */
const ordered = (files: PlaygroundFile[]) => [
  ...files.filter((f) => f.name !== IMPORT_MAP_FILE),
  ...files.filter((f) => f.name === IMPORT_MAP_FILE),
];

const narrow = () => matchMedia("(width < 768px)").matches;

const theme: DockviewTheme = { name: "ek", className: "dockview-theme-ek", dndTabIndicator: "line" };
const components = { file: FilePanel, preview: PreviewPanel, devtools: DevtoolsPanel };
const LAYOUT_KEY = () => `ek-playground:layout:${narrow() ? "narrow" : "wide"}`;

const isFilePanel = (id: string) => id !== PREVIEW && id !== DEVTOOLS;

/** Code on the left, preview over DevTools on the right; one pane on phones. */
function defaultLayout(api: DockviewApi, names: string[]) {
  const [first, ...rest] = names;
  api.addPanel({ id: first, component: "file", title: first });
  for (const name of rest) {
    api.addPanel({ id: name, component: "file", title: name, position: { referencePanel: first }, inactive: true });
  }
  const single = narrow();
  api.addPanel({
    id: PREVIEW,
    component: "preview",
    title: "Preview",
    renderer: "always",
    position: { referencePanel: first, direction: single ? "within" : "right" },
    inactive: single,
  });
  api.addPanel({
    id: DEVTOOLS,
    component: "devtools",
    title: "DevTools",
    renderer: "always",
    position: { referencePanel: PREVIEW, direction: single ? "within" : "below" },
    inactive: true,
  });
  api.getPanel(first)?.api.setActive();
}

function restoreLayout(api: DockviewApi, names: string[]) {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY()) ?? "null");
    if (!saved) return false;
    api.fromJSON(saved);
    if (!api.getPanel(PREVIEW) || !api.getPanel(DEVTOOLS)) throw new Error("incomplete layout");
    reconcile(api, names);
    return true;
  } catch {
    api.clear();
    return false;
  }
}

/** One panel per file: adds the missing, drops the deleted. */
function reconcile(api: DockviewApi, names: string[]) {
  for (const panel of [...api.panels]) {
    if (isFilePanel(panel.id) && !names.includes(panel.id)) api.removePanel(panel);
  }
  const home = api.getPanel(ENTRY)?.group ?? api.panels.find((p) => isFilePanel(p.id))?.group;
  for (const name of names) {
    if (api.getPanel(name)) continue;
    api.addPanel({
      id: name,
      component: "file",
      title: name,
      position: home ? { referenceGroup: home.id } : { referencePanel: PREVIEW, direction: "left" },
      inactive: true,
    });
  }
}

/** A freshly loaded example: its files, in its order, in one pane; the first one active. */
function arrange(api: DockviewApi, names: string[]) {
  for (const panel of [...api.panels]) {
    if (isFilePanel(panel.id) && !names.includes(panel.id)) api.removePanel(panel);
  }
  const home = api.panels.find((p) => isFilePanel(p.id))?.group;
  names.forEach((name, index) => {
    const panel = api.getPanel(name);
    if (panel && home) panel.api.moveTo({ group: home, index });
    else if (!panel) {
      api.addPanel({
        id: name,
        component: "file",
        title: name,
        position: home ? { referenceGroup: home.id, index } : { referencePanel: PREVIEW, direction: "left" },
        inactive: true,
      });
    }
  });
  api.getPanel(names[0])?.api.setActive();
}

export default function Repl() {
  const dark = useDark();
  const [files, setFiles] = useState<PlaygroundFile[]>();
  const [active, setActive] = useState(ENTRY);
  /** The example the files came from (none: the starter). */
  const [example, setExample] = useState<string>();
  const [renaming, setRenaming] = useState<string>();
  const [dock, setDock] = useState<DockviewApi>();

  const host = useRef<EditorHost>(undefined);
  /** The loaded example's sources, to tell untouched code from edits. */
  const baseline = useRef<string>(undefined);

  // Editors live as long as the page.
  useEffect(() => {
    host.current = new EditorHost({
      folder: "playground",
      dark: document.documentElement.classList.contains("dark"),
      formatter: formatterClient,
      onChange: (name, source) =>
        setFiles((prev) => prev?.map((f) => (f.name === name && f.source !== source ? { ...f, source } : f))),
    });
    // The hash (edited code) wins; then ?example=id; then the starter.
    decodeState(location.hash.slice(1)).then(async (state) => {
      const linked = new URLSearchParams(location.search).get("example");
      if (!state && linked && exampleById(linked)) return loadExample(linked);
      const start = state ? fromShared(state.files) : defaultFiles();
      if (!start.some((f) => f.name === ENTRY)) start.unshift({ name: ENTRY, source: "" });
      baseline.current = state ? undefined : sourcesKey(start);
      setFiles(ordered(start));
      if (state?.example && exampleById(state.example)) setExample(state.example);
      if (state?.active && start.some((f) => f.name === state.active!.replace(/^\//, ""))) {
        setActive(state.active.replace(/^\//, ""));
      }
    });
    return () => host.current?.destroy();
  }, []);

  useEffect(() => host.current?.setDark(dark), [dark]);
  useEffect(() => {
    if (files) host.current?.setFiles(files);
  }, [files]);

  // Layout: restored per device class, else the default; then kept in sync with the files.
  const names = files?.map((f) => f.name);
  const namesKey = names?.join("\n");
  const laidOut = useRef(false);
  /** Set by loadExample: lay the next file set out in its own order. */
  const arrangeNext = useRef(false);
  const [loads, setLoads] = useState(0);
  useEffect(() => {
    if (!dock || !names) return;
    if (!laidOut.current) {
      laidOut.current = true;
      if (!restoreLayout(dock, names)) defaultLayout(dock, names);
      // Opened from ?example=: its tab order wins over the saved layout's.
      if (arrangeNext.current) arrange(dock, names);
      arrangeNext.current = false;
      dock.getPanel(active)?.api.setActive();
      const subs = [
        dock.onDidActivePanelChange(({ panel }) => panel && isFilePanel(panel.id) && setActive(panel.id)),
        dock.onDidLayoutChange(() => {
          try {
            localStorage.setItem(LAYOUT_KEY(), JSON.stringify(dock.toJSON()));
          } catch {}
        }),
      ];
      return () => subs.forEach((s) => s.dispose());
    }
    if (arrangeNext.current) {
      arrangeNext.current = false;
      arrange(dock, names);
    } else reconcile(dock, names);
  }, [dock, namesKey, loads]);

  const importMapSource = files?.find((f) => f.name === IMPORT_MAP_FILE)?.source;
  const imports = useMemo(() => {
    const state = parseImportMap(importMapSource);
    return syncImportMap(state, Object.keys(state.imports)).imports;
  }, [importMapSource]);
  const importsKey = JSON.stringify(imports);
  useEffect(() => host.current?.syncTypes(imports), [importsKey]);

  // Compile; every new bare import gets an import map entry.
  const build = useBuild(files);
  useEffect(() => {
    if (!files) return;
    const nextMap = serializeImportMap(syncImportMap(parseImportMap(importMapSource), build.externals));
    if (nextMap === importMapSource) return;
    setFiles((prev) =>
      prev && ordered([...prev.filter((f) => f.name !== IMPORT_MAP_FILE), { name: IMPORT_MAP_FILE, source: nextMap }]),
    );
  }, [build.externals, !files]);

  const preview = usePreview({ importMap: imports, code: build.output, dark });

  // The URL is the saved state: a clean link while the code is untouched,
  // the code itself (in the hash) once edited.
  const pristine = files !== undefined && sourcesKey(files) === baseline.current;
  const writeUrl = async (next: PlaygroundFile[], force = false) => {
    if (pristine && !force) return history.replaceState(null, "", example ? exampleUrl(example) : "/playground");
    const hash = await encodeState({ files: toShared(next), active: `/${active}`, example });
    history.replaceState(null, "", `/playground#${hash}`);
  };
  useEffect(() => {
    if (!files) return;
    const timer = setTimeout(() => writeUrl(files), 300);
    return () => clearTimeout(timer);
  }, [files, active, example]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(CURRENT_EVENT, { detail: example }));
  }, [example]);

  const loadExample = async (id: string | undefined) => {
    const next = id ? fromShared(exampleFiles(id)) : defaultFiles();
    baseline.current = sourcesKey(next);
    setExample(id);
    arrangeNext.current = true;
    setLoads((n) => n + 1);
    setFiles(ordered(next));
    setActive(next[0].name);
  };
  const loadRef = useRef(loadExample);
  loadRef.current = loadExample;
  const pristineRef = useRef(pristine);
  pristineRef.current = pristine;
  useEffect(() => {
    const onLoad = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!pristineRef.current && !confirm("Replace your edits with this example?")) return;
      loadRef.current(id);
    };
    window.addEventListener(LOAD_EVENT, onLoad);
    return () => window.removeEventListener(LOAD_EVENT, onLoad);
  }, []);

  if (!files || !host.current) {
    return <p className="m-auto text-sm text-fd-muted-foreground">Loading playground…</p>;
  }

  const repl: ReplApi = {
    files,
    host: host.current,
    preview,
    error: build.error,
    dismissError: build.dismissError,
    renaming,
    setRenaming,
    isPinned: (name) => PINNED.includes(name),

    addFile(groupId) {
      const taken = new Set(files.map((f) => f.name));
      let name = "Component.tsx";
      for (let i = 2; taken.has(name); i++) name = `Component${i}.tsx`;
      setFiles((prev) => prev && ordered([...prev, { name, source: "" }]));
      dock?.addPanel({ id: name, component: "file", title: name, position: { referenceGroup: groupId } });
      return name;
    },

    renameFile(from, to) {
      if (PINNED.includes(from)) return false;
      if (files.some((f) => f.name === to)) {
        alert(`${to} already exists`);
        return false;
      }
      host.current!.rename(from, to);
      // Same pane, same place: panel ids are fixed, so swap the panel.
      const panel = dock?.getPanel(from);
      if (dock && panel) {
        const index = panel.group.panels.indexOf(panel);
        dock.addPanel({ id: to, component: "file", title: to, position: { referenceGroup: panel.group.id, index } });
        dock.removePanel(panel);
      }
      setFiles((prev) => prev && ordered(prev.map((f) => (f.name === from ? { ...f, name: to } : f))));
      return true;
    },

    closeFile(name) {
      const file = files.find((f) => f.name === name);
      if (!file || PINNED.includes(name)) return;
      if (file.source.trim() && !confirm(`Delete ${name}?`)) return;
      setFiles((prev) => prev?.filter((f) => f.name !== name));
      const panel = dock?.getPanel(name);
      if (panel) dock!.removePanel(panel);
    },

    reset() {
      const what = example ? `the “${exampleById(example)?.title}” example` : "the starter example";
      if (confirm(`Replace your files with ${what}?`)) loadExample(example);
    },

    async share() {
      await writeUrl(files);
      await navigator.clipboard.writeText(location.href);
    },
  };

  return (
    <>
      <ReplContext value={repl}>
        <DockviewReact
          className="h-full min-w-0 flex-1"
          theme={theme}
          components={components}
          defaultTabComponent={Tab}
          leftHeaderActionsComponent={LeftActions}
          rightHeaderActionsComponent={RightActions}
          disableFloatingGroups
          onReady={({ api }) => setDock(api)}
        />
      </ReplContext>
    </>
  );
}
