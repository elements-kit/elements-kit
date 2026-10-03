/** @jsxImportSource react */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { EditorHost, type PlaygroundFile } from "./editor/host";
import { formatterClient, useBuild, useDark } from "./engine";
import { syncImportMap } from "./kernel/importMap";
import { usePreview } from "./Preview";
import { encodeState } from "./share";
import { Icon } from "./Icon";
import "./playground.css";

const toFiles = (files: Record<string, string>): PlaygroundFile[] =>
  Object.entries(files).map(([name, source]) => ({ name, source }));

/** A docs example, live: code beside its preview, one click from /playground. */
export default function Embed(props: { example: string; files: Record<string, string>; initial: string }) {
  const { example } = props;
  const dark = useDark();
  const folder = `example-${useId().replace(/\W/g, "")}`;
  const original = useMemo(() => toFiles(props.files), [props.files]);
  const [files, setFiles] = useState<PlaygroundFile[] | undefined>(original);
  const [active, setActive] = useState(props.initial);
  const editorEl = useRef<HTMLDivElement>(null);
  const host = useRef<EditorHost>(undefined);

  useEffect(() => {
    host.current = new EditorHost({
      folder,
      dark: document.documentElement.classList.contains("dark"),
      formatter: formatterClient(),
      onChange: (name, source) =>
        setFiles((prev) => prev?.map((f) => (f.name === name && f.source !== source ? { ...f, source } : f))),
    });
    return () => host.current?.destroy();
  }, [example]);

  useEffect(() => host.current?.setDark(dark), [dark]);
  useEffect(() => {
    if (files) host.current?.setFiles(files);
  }, [files]);

  const shown = files?.find((f) => f.name === active);
  useEffect(() => {
    // No focus on page load: the reader is scrolling, not typing.
    if (shown && editorEl.current) host.current?.mount(shown, editorEl.current, false);
  }, [shown?.name, !files]);

  const build = useBuild(files);
  const imports = useMemo(() => syncImportMap({ imports: {}, pinned: [] }, build.externals).imports, [build.externals]);
  const importsKey = JSON.stringify(imports);
  useEffect(() => host.current?.syncTypes(imports), [importsKey]);
  const preview = usePreview({ importMap: imports, code: build.output, dark });

  const edited = JSON.stringify(files) !== JSON.stringify(original);

  const openInPlayground = async () => {
    if (!files) return;
    const hash = await encodeState({
      files: Object.fromEntries(files.map((f) => [`/${f.name}`, f.source])),
      example,
    });
    window.open(`/playground#${hash}`, "_blank", "noopener");
  };

  return (
    <>
      <div className="flex h-10 items-stretch border-b">
        <div role="tablist" aria-label="Files" className="flex min-w-0 flex-1 items-stretch overflow-x-auto px-2 scrollbar-none">
          {(files ?? []).map((file) => {
            const selected = file.name === active;
            return (
              <button
                key={file.name}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setActive(file.name);
                  requestAnimationFrame(() => host.current?.focus(file.name));
                }}
                className={`relative inline-flex shrink-0 items-center px-2 text-sm font-medium transition-colors ${
                  selected ? "text-fd-primary" : "text-fd-muted-foreground hover:text-fd-accent-foreground"
                }`}
              >
                {file.name}
                <span className={`absolute inset-x-2 bottom-0 h-px ${selected ? "bg-fd-primary" : ""}`} />
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-1 pe-2">
          {edited && (
            <button
              type="button"
              aria-label="Reset"
              title="Undo your edits"
              onClick={() => original && setFiles(original)}
              className={`${buttonVariants({ variant: "ghost", size: "icon-sm" })} text-fd-muted-foreground`}
            >
              <Icon name="reset" />
            </button>
          )}
          <button
            type="button"
            onClick={openInPlayground}
            title="Open in the playground, with your edits"
            className={`${buttonVariants({ variant: "ghost", size: "sm" })} gap-1.5 text-fd-muted-foreground [&_svg]:size-4`}
          >
            Open in playground
            <Icon name="open" />
          </button>
        </div>
      </div>
      <div className="grid md:h-104 md:grid-cols-2">
        <div ref={editorEl} className="ek-pg-editor h-80 min-w-0 overflow-hidden md:h-full" />
        <div className="flex h-72 min-w-0 flex-col border-fd-border max-md:border-t md:h-full md:border-s">
          <div className="min-h-0 flex-1">{preview.preview}</div>
          {build.error && (
            <pre role="alert" className="max-h-1/3 shrink-0 overflow-auto border-t border-red-500/40 bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              {build.error}
            </pre>
          )}
        </div>
      </div>
    </>
  );
}
