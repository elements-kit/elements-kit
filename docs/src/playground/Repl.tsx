/** @jsxImportSource react */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { DockviewReact, type DockviewApi, type DockviewTheme } from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import CompilerWorker from "./workers/compiler?worker";
import FormatterWorker from "./workers/formatter?worker";
import { EditorHost, isTsFile, type PlaygroundFile } from "./editor/host";
import { createWorkerClient, latest, type WorkerClient } from "./kernel/workerClient";
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

// Share format (`share.ts`): `{ "/main.tsx": code }`.
const fromShared = (files: Record<string, string>): PlaygroundFile[] =>
  Object.entries(files).map(([path, source]) => ({ name: path.replace(/^\//, ""), source }));
const toShared = (files: PlaygroundFile[]) => Object.fromEntries(files.map((f) => [`/${f.name}`, f.source]));

/** Entry first, import map last, the rest in between. */
const ordered = (files: PlaygroundFile[]) => {
  const rank = (name: string) => (name === ENTRY ? 0 : name === IMPORT_MAP_FILE ? 2 : 1);
  return [...files].sort((a, b) => rank(a.name) - rank(b.name));
};

const isCompiled = (name: string) => isTsFile(name) || name.endsWith(".css");

function subscribeClass(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const useDark = () =>
  useSyncExternalStore(subscribeClass, () => document.documentElement.classList.contains("dark"));

const narrow = () => matchMedia("(width < 768px)").matches;

interface RollupResult {
  compiled: Record<string, string>;
  externals: string[];
}

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

export default function Repl() {
  const dark = useDark();
  const [files, setFiles] = useState<PlaygroundFile[]>();
  const [active, setActive] = useState(ENTRY);
  const [output, setOutput] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState<string>();
  const [dock, setDock] = useState<DockviewApi>();

  const engine = useRef<{ host: EditorHost; compiler: WorkerClient; workers: Worker[] }>(undefined);

  // Workers and editors live as long as the page.
  useEffect(() => {
    const workers = [new CompilerWorker(), new FormatterWorker()];
    const compiler = createWorkerClient(workers[0]);
    const host = new EditorHost({
      folder: "playground",
      dark: document.documentElement.classList.contains("dark"),
      formatter: createWorkerClient(workers[1]),
      onChange: (name, source) =>
        setFiles((prev) => prev?.map((f) => (f.name === name && f.source !== source ? { ...f, source } : f))),
    });
    engine.current = { host, compiler, workers };
    decodeState(location.hash.slice(1)).then((state) => {
      const start = state ? fromShared(state.files) : defaultFiles();
      if (!start.some((f) => f.name === ENTRY)) start.unshift({ name: ENTRY, source: "" });
      setFiles(ordered(start));
      if (state?.active && start.some((f) => f.name === state.active!.replace(/^\//, ""))) {
        setActive(state.active.replace(/^\//, ""));
      }
    });
    return () => {
      host.destroy();
      for (const worker of workers) worker.terminate();
    };
  }, []);

  useEffect(() => engine.current?.host.setDark(dark), [dark]);
  useEffect(() => {
    if (files) engine.current?.host.setFiles(files);
  }, [files]);

  // Layout: restored per device class, else the default; then kept in sync with the files.
  const names = files?.map((f) => f.name);
  const namesKey = names?.join("\n");
  const laidOut = useRef(false);
  useEffect(() => {
    if (!dock || !names) return;
    if (!laidOut.current) {
      laidOut.current = true;
      if (!restoreLayout(dock, names)) defaultLayout(dock, names);
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
    reconcile(dock, names);
  }, [dock, namesKey]);

  const importMapSource = files?.find((f) => f.name === IMPORT_MAP_FILE)?.source;
  const imports = useMemo(() => {
    const state = parseImportMap(importMapSource);
    return syncImportMap(state, Object.keys(state.imports)).imports;
  }, [importMapSource]);
  const importsKey = JSON.stringify(imports);
  useEffect(() => engine.current?.host.syncTypes(imports), [importsKey]);

  const preview = usePreview({ importMap: imports, code: output, dark });

  // Compile, then add an import map entry for every new bare import.
  const rollup = useMemo(
    () => latest((code: PlaygroundFile[]) => engine.current!.compiler.request<RollupResult>("ROLLUP", { tabs: code })),
    [],
  );
  useEffect(() => {
    if (!files) return;
    const timer = setTimeout(async () => {
      try {
        const result = await rollup(files.filter((f) => isCompiled(f.name)));
        if (!result) return;
        setError("");
        setOutput((prev) => (JSON.stringify(prev) === JSON.stringify(result.compiled) ? prev : result.compiled));
        const nextMap = serializeImportMap(syncImportMap(parseImportMap(importMapSource), result.externals));
        if (nextMap !== importMapSource) {
          setFiles((prev) =>
            prev && ordered([...prev.filter((f) => f.name !== IMPORT_MAP_FILE), { name: IMPORT_MAP_FILE, source: nextMap }]),
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [files]);

  // The URL hash is the saved state.
  const writeHash = async (next: PlaygroundFile[]) =>
    history.replaceState(null, "", `#${await encodeState({ files: toShared(next), active: `/${active}` })}`);
  useEffect(() => {
    if (!files) return;
    const timer = setTimeout(() => writeHash(files), 300);
    return () => clearTimeout(timer);
  }, [files, active]);

  if (!files || !engine.current) {
    return <p className="m-auto text-sm text-fd-muted-foreground">Loading playground…</p>;
  }

  const repl: ReplApi = {
    files,
    host: engine.current.host,
    preview,
    error,
    dismissError: () => setError(""),
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
      engine.current!.host.rename(from, to);
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
      if (!confirm("Replace your files with the starter example?")) return;
      setFiles(ordered(defaultFiles()));
    },

    async share() {
      await writeHash(files);
      await navigator.clipboard.writeText(location.href);
    },
  };

  return (
    <ReplContext value={repl}>
      <DockviewReact
        className="h-full"
        theme={theme}
        components={components}
        defaultTabComponent={Tab}
        leftHeaderActionsComponent={LeftActions}
        rightHeaderActionsComponent={RightActions}
        disableFloatingGroups
        onReady={({ api }) => setDock(api)}
      />
    </ReplContext>
  );
}
