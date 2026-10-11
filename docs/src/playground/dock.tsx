/** @jsxImportSource react */
import { createContext, use, useEffect, useRef, useState, type ReactElement } from "react";
import type { IDockviewHeaderActionsProps, IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview-react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { isTsFile, type EditorHost, type PlaygroundFile } from "./editor/host";
import { Icon, type IconName } from "./Icon";

export const PREVIEW = "preview";
export const DEVTOOLS = "devtools";

export interface ReplApi {
  files: PlaygroundFile[];
  host: EditorHost;
  preview: { preview: ReactElement; devtools: ReactElement; showDevtools(): void };
  error: string;
  dismissError(): void;
  /** The file whose name is being edited. */
  renaming?: string;
  setRenaming(name?: string): void;
  isPinned(name: string): boolean;
  /** Adds a file to `groupId`'s pane and returns its name. */
  addFile(groupId: string): string;
  renameFile(from: string, to: string): boolean;
  closeFile(name: string): void;
  reset(): void;
  share(): Promise<void>;
}

export const ReplContext = createContext<ReplApi | null>(null);
const useRepl = () => use(ReplContext)!;

// --- Panels -----------------------------------------------------------------

export function FilePanel({ api }: IDockviewPanelProps) {
  const repl = useRepl();
  const el = useRef<HTMLDivElement>(null);
  const file = repl.files.find((f) => f.name === api.id);

  useEffect(() => {
    if (file && el.current) repl.host.mount(file, el.current, api.isActive && repl.renaming !== api.id);
    // Mount once per panel; edits flow through the host.
  }, [!file]);

  useEffect(() => {
    const sub = api.onDidActiveChange(({ isActive }) => {
      if (isActive && repl.renaming !== api.id) repl.host.focus(api.id);
    });
    return () => sub.dispose();
  }, [api, repl.renaming]);

  return <div ref={el} className="ek-pg-editor size-full overflow-hidden" />;
}

export function PreviewPanel() {
  const repl = useRepl();
  return (
    <div className="relative flex size-full flex-col">
      <div className="min-h-0 flex-1">{repl.preview.preview}</div>
      {repl.error && <ErrorBar message={repl.error} onDismiss={repl.dismissError} />}
    </div>
  );
}

export function DevtoolsPanel({ api }: IDockviewPanelProps) {
  const { preview } = useRepl();
  useEffect(() => {
    if (api.isVisible) preview.showDevtools();
    const sub = api.onDidVisibilityChange(({ isVisible }) => isVisible && preview.showDevtools());
    return () => sub.dispose();
  }, [api, preview]);
  return preview.devtools;
}

// --- Tabs: fumadocs' code-block tab look (see playground.css) ---------------

export function Tab({ api }: IDockviewPanelHeaderProps) {
  const repl = useRepl();
  const name = api.id;
  const isFile = name !== PREVIEW && name !== DEVTOOLS;
  const editable = isFile && !repl.isPinned(name);

  if (repl.renaming === name) {
    return (
      <div className="ek-tab">
        <RenameInput
          value={name}
          onDone={(next) => {
            repl.setRenaming(undefined);
            if (next !== undefined && next !== name) repl.renameFile(name, next);
            else repl.host.focus(name);
          }}
        />
      </div>
    );
  }
  return (
    <div
      className="ek-tab group"
      title={editable ? "Double-click to rename" : undefined}
      onDoubleClick={() => editable && repl.setRenaming(name)}
    >
      {name === DEVTOOLS && <Icon name="terminal" className="size-4" />}
      <span>{api.title}</span>
      {editable && (
        <button
          type="button"
          aria-label={`Delete ${name}`}
          // Not a drag start, not a tab switch.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            repl.closeFile(name);
          }}
          className="ek-tab-close -me-1 rounded p-0.5 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function RenameInput({ value, onDone }: { value: string; onDone(next?: string): void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  // Enter, then the blur from unmounting: finish once.
  const done = useRef(false);
  const finish = (next?: string) => {
    if (done.current) return;
    done.current = true;
    onDone(next);
  };
  useEffect(() => {
    const input = ref.current!;
    input.focus();
    // Select the stem, like an OS file rename.
    input.setSelectionRange(0, value.lastIndexOf(".") > 0 ? value.lastIndexOf(".") : value.length);
  }, [value]);
  return (
    <input
      ref={ref}
      aria-label="File name"
      value={draft}
      size={Math.max(draft.length, 6)}
      spellCheck={false}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => finish(draft.trim() || undefined)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(draft.trim() || undefined);
        if (e.key === "Escape") finish();
      }}
      className="h-6 rounded-md border bg-fd-background px-1.5 text-sm font-medium text-fd-foreground outline-none focus:ring-2 focus:ring-fd-ring"
    />
  );
}

// --- Group header actions ---------------------------------------------------

const hasFiles = (props: IDockviewHeaderActionsProps) =>
  props.panels.length === 0 || props.panels.some((p) => p.id !== PREVIEW && p.id !== DEVTOOLS);

/** After the tabs: a new file lands in this pane. */
export function LeftActions(props: IDockviewHeaderActionsProps) {
  const repl = useRepl();
  if (!hasFiles(props)) return null;
  return (
    <div className="flex h-full items-center px-1">
      <IconAction icon="add" label="New file" onClick={() => repl.setRenaming(repl.addFile(props.group.id))} />
    </div>
  );
}

/** At the end: Format for a code tab; Reset and Share beside the preview. */
export function RightActions(props: IDockviewHeaderActionsProps) {
  const repl = useRepl();
  const [copied, setCopied] = useState(false);
  const active = props.activePanel?.id;
  const formattable = active !== undefined && isTsFile(active);
  const withPreview = props.panels.some((p) => p.id === PREVIEW);
  if (!formattable && !withPreview) return null;

  return (
    <div className="flex h-full items-center gap-1 pe-2">
      {formattable && <IconAction icon="format" label="Format (⌘S)" onClick={() => repl.host.format(active)} />}
      {withPreview && (
        <>
          <IconAction icon="reset" label="Reset to the starter example" onClick={repl.reset} />
          <button
            type="button"
            title="Copy a link to this code"
            onClick={async () => {
              await repl.share();
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className={`${buttonVariants({ variant: "secondary", size: "sm" })} ms-1 gap-1.5 [&_svg]:size-4`}
          >
            <Icon name={copied ? "check" : "link"} />
            {copied ? "Copied" : "Share"}
          </button>
        </>
      )}
    </div>
  );
}

function IconAction(props: { icon: IconName; label: string; onClick(): void }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      className={`${buttonVariants({ variant: "ghost", size: "icon-sm" })} text-fd-muted-foreground`}
    >
      <Icon name={props.icon} />
    </button>
  );
}

function ErrorBar({ message, onDismiss }: { message: string; onDismiss(): void }) {
  const [first, ...rest] = message.split("\n");
  return (
    <div
      role="alert"
      className="relative max-h-[40%] shrink-0 overflow-auto border-t border-red-500/40 bg-red-50 p-2 pe-10 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
    >
      <details>
        <summary className="cursor-pointer font-mono font-medium">{first}</summary>
        {rest.length > 0 && <pre className="mt-2 overflow-auto font-mono text-xs opacity-80">{rest.join("\n")}</pre>}
      </details>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className={`${buttonVariants({ variant: "ghost", size: "icon-xs" })} absolute end-2 top-1.5`}
      >
        <Icon name="close" />
      </button>
    </div>
  );
}
