/** @jsxImportSource react */
import { useEffect, useMemo, useRef } from "react";
import { devtoolsHtml, iframeHtml } from "./previewDocument";

type PreviewMessage =
  | { event: "PAGE_SOURCE"; value: string }
  | { event: "IMPORT_MAP"; value: Record<string, string> }
  | { event: "CODE_UPDATE"; value: Record<string, string> }
  | { event: "DARK"; value: boolean }
  | { event: "DEV"; value: string };

interface Options {
  importMap: Record<string, string>;
  /** Compiled modules by `./path`; `./main` is the entry. */
  code: Record<string, string>;
  dark: boolean;
}

// A custom element can't be redefined: code that registers one re-runs in a
// fresh document rather than in place.
const definesElements = (code: Record<string, string>) =>
  Object.values(code).some((source) => source.includes("customElements.define"));

/**
 * The preview iframe and the DevTools iframe, wired together (chobitsu ⇄ chii).
 * Returned as elements so each can live in its own dock panel.
 */
export function usePreview({ importMap, code, dark }: Options) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const devtoolsIframe = useRef<HTMLIFrameElement>(null);
  const state = useRef({ ready: false, ran: false, pending: [] as string[] });
  const latest = useRef({ importMap, code, dark });
  latest.current = { importMap, code, dark };

  const devtoolsSrc = useMemo(() => {
    const url = URL.createObjectURL(new Blob([devtoolsHtml], { type: "text/html" }));
    return `${url}#?embedded=${encodeURIComponent(location.origin)}`;
  }, []);
  useEffect(() => () => URL.revokeObjectURL(devtoolsSrc.split("#")[0]), [devtoolsSrc]);

  const send = (msg: PreviewMessage) => {
    if (state.current.ready) iframe.current?.contentWindow?.postMessage(msg, "*");
  };

  // DevTools (~1 MB) loads once its panel shows and the preview has code;
  // chobitsu holds the console until it connects.
  const devtools = useRef({ shown: false, loaded: false });
  const loadDevtools = () => {
    const d = devtools.current;
    if (d.loaded || !d.shown || !latest.current.code["./main"] || !devtoolsIframe.current) return;
    d.loaded = true;
    devtoolsIframe.current.src = devtoolsSrc;
  };

  // A DevTools session belongs to one preview document.
  const reloadDevtools = () => {
    state.current.pending.length = 0;
    if (devtools.current.loaded) devtoolsIframe.current?.contentWindow?.location.reload();
  };

  const freshDocument = () => {
    state.current.ready = false;
    state.current.ran = false;
    if (iframe.current) iframe.current.srcdoc = iframeHtml;
    reloadDevtools();
  };

  const onLoad = () => {
    const { importMap, code, dark } = latest.current;
    state.current.ready = true;
    send({ event: "PAGE_SOURCE", value: iframeHtml });
    send({ event: "IMPORT_MAP", value: importMap });
    send({ event: "DARK", value: dark });
    for (const message of state.current.pending.splice(0)) send({ event: "DEV", value: message });
    if (code["./main"]) {
      send({ event: "CODE_UPDATE", value: code });
      state.current.ran = true;
    }
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const tools = devtoolsIframe.current?.contentWindow;
      if (!tools) return;
      if (event.source === iframe.current?.contentWindow) tools.postMessage(event.data, "*");
      else if (event.source === tools) {
        if (state.current.ready) send({ event: "DEV", value: event.data });
        else state.current.pending.push(event.data);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // A changed import map only takes effect in a fresh document.
  const importMapKey = JSON.stringify(importMap);
  const firstImportMap = useRef(importMapKey);
  useEffect(() => {
    if (importMapKey === firstImportMap.current) return;
    firstImportMap.current = importMapKey;
    if (state.current.ready) freshDocument();
  }, [importMapKey]);

  useEffect(() => {
    if (!code["./main"]) return;
    loadDevtools();
    if (state.current.ran && definesElements(code)) return freshDocument();
    send({ event: "CODE_UPDATE", value: code });
    if (state.current.ready) state.current.ran = true;
  }, [code]);

  const firstDark = useRef(dark);
  useEffect(() => {
    try {
      localStorage.setItem("uiTheme", dark ? '"dark"' : '"default"');
    } catch {}
    if (dark === firstDark.current) return;
    firstDark.current = dark;
    send({ event: "DARK", value: dark });
    reloadDevtools();
  }, [dark]);

  // Stable elements: the iframes must never remount (that reloads them).
  return useMemo(
    () => ({
      preview: (
        <iframe
          ref={iframe}
          title="Preview"
          srcDoc={iframeHtml}
          onLoad={onLoad}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals allow-pointer-lock"
          className="block size-full bg-white dark:bg-neutral-900"
        />
      ),
      devtools: <iframe ref={devtoolsIframe} title="DevTools" className="block size-full" />,
      showDevtools() {
        devtools.current.shown = true;
        loadDevtools();
      },
    }),
    [devtoolsSrc],
  );
}
