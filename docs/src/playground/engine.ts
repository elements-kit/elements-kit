import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import CompilerWorker from "./workers/compiler?worker";
import FormatterWorker from "./workers/formatter?worker";
import { isTsFile, type PlaygroundFile } from "./editor/host";
import { startTypeChecking } from "./editor/typescriptLsp";
import { createWorkerClient, latest, type WorkerClient } from "./kernel/workerClient";

// One compiler and one formatter per page, shared by every playground on it.
let compiler: WorkerClient | undefined;
let formatter: WorkerClient | undefined;
export const compilerClient = () => (compiler ??= createWorkerClient(new CompilerWorker()));
export const formatterClient = () => (formatter ??= createWorkerClient(new FormatterWorker()));

const isCompiled = (name: string) => isTsFile(name) || name.endsWith(".css");

interface RollupResult {
  compiled: Record<string, string>;
  externals: string[];
}

/**
 * Compiles `files` (debounced) into preview modules. `externals` are the bare
 * imports found, for the import map.
 */
export function useBuild(files: PlaygroundFile[] | undefined) {
  const [output, setOutput] = useState<Record<string, string>>({});
  const [externals, setExternals] = useState<string[]>([]);
  const [error, setError] = useState("");
  const rollup = useMemo(
    () => latest((tabs: PlaygroundFile[]) => compilerClient().request<RollupResult>("ROLLUP", { tabs })),
    [],
  );
  const code = files?.filter((f) => isCompiled(f.name));
  const key = JSON.stringify(code);
  const first = useRef(true);

  useEffect(() => {
    if (!code) return;
    // No delay for the first build: the preview shows up sooner.
    const delay = first.current ? 0 : 250;
    first.current = false;
    const timer = setTimeout(async () => {
      try {
        const result = await rollup(code);
        if (!result) return;
        setError("");
        setOutput((prev) => (JSON.stringify(prev) === JSON.stringify(result.compiled) ? prev : result.compiled));
        setExternals((prev) => (prev.join() === result.externals.join() ? prev : result.externals));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      startTypeChecking();
    }, delay);
    return () => clearTimeout(timer);
  }, [key]);

  return { output, externals, error, dismissError: () => setError("") };
}

function subscribeClass(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
/** The docs theme (`.dark` on <html>). */
export const useDark = () =>
  useSyncExternalStore(subscribeClass, () => document.documentElement.classList.contains("dark"));
