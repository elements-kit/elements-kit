/** @jsxImportSource react */
import { useEffect, useState } from "react";
import { PanelLeft } from "lucide-react";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { examples, type Example } from "./examples";

const KEY = "ek-playground:examples-open";

/** Sidebar → REPL: load this example. */
export const LOAD_EVENT = "ek-playground:load";
/** REPL → sidebar: the example now loaded (`detail` undefined: none). */
export const CURRENT_EVENT = "ek-playground:example";

export const exampleUrl = (id: string) => `/playground?example=${encodeURIComponent(id)}`;

// Tests stay on their docs pages; the sidebar lists what renders.
const sections = examples
  .filter((e) => !e.id.endsWith(".test"))
  .reduce<[string, Example[]][]>((out, example) => {
    const last = out.at(-1);
    if (last?.[0] === example.section) last[1].push(example);
    else out.push([example.section, [example]]);
    return out;
  }, []);

/**
 * Every docs example, by section, like the docs sidebar. Server-rendered with
 * real links (`/playground?example=id`); a click loads in place.
 */
export function ExamplesSidebar() {
  // undefined: not chosen yet, so CSS decides (open from lg up).
  const [open, setOpenState] = useState<boolean>();
  const [current, setCurrent] = useState<string>();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved !== null && matchMedia("(width >= 1024px)").matches) setOpenState(saved === "true");
    } catch {}
    const onCurrent = (e: Event) => setCurrent((e as CustomEvent<string | undefined>).detail);
    window.addEventListener(CURRENT_EVENT, onCurrent);
    return () => window.removeEventListener(CURRENT_EVENT, onCurrent);
  }, []);

  const setOpen = (next: boolean) => {
    setOpenState(next);
    try {
      if (matchMedia("(width >= 1024px)").matches) localStorage.setItem(KEY, String(next));
    } catch {}
  };
  const narrow = () => matchMedia("(width < 1024px)").matches;

  const toggle = (
    <button
      type="button"
      aria-label={open === false || open === undefined ? "Show examples" : "Hide examples"}
      onClick={() => setOpen(!(open ?? !narrow()))}
      className={`${buttonVariants({ variant: "ghost", size: "icon-sm" })} text-fd-muted-foreground`}
    >
      <PanelLeft />
    </button>
  );

  const asideVisibility = open === undefined ? "max-lg:hidden" : open ? "" : "hidden";
  const railVisibility = open === undefined ? "lg:hidden" : open ? "hidden" : "";

  return (
    <>
      <div className={`flex shrink-0 flex-col items-center border-e bg-fd-card px-1 py-1.5 ${railVisibility}`}>{toggle}</div>
      {/* Below lg the list floats over the panes instead of narrowing them. */}
      <aside
        aria-label="Examples"
        className={`z-40 flex w-64 shrink-0 flex-col border-e bg-fd-card max-lg:absolute max-lg:inset-y-0 max-lg:inset-s-0 max-lg:shadow-lg ${asideVisibility}`}
      >
        <div className="flex h-10 shrink-0 items-center justify-between border-b ps-4 pe-1.5">
          <h2 className="text-sm font-medium">Examples</h2>
          {toggle}
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
          {sections.map(([section, items]) => (
            <div key={section} className="mb-3">
              <a
                href={items[0].page}
                title={`${section} docs`}
                className="mb-1 flex items-center px-2 py-1.5 font-medium text-fd-foreground hover:text-fd-primary"
              >
                {section}
              </a>
              {items.map((example) => (
                <a
                  key={example.id}
                  href={exampleUrl(example.id)}
                  data-active={example.id === current}
                  aria-current={example.id === current ? "page" : undefined}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent(LOAD_EVENT, { detail: example.id }));
                    if (narrow()) setOpen(false);
                  }}
                  className="flex w-full items-center rounded-lg p-2 text-fd-muted-foreground transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary"
                >
                  {example.title}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
