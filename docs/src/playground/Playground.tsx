/** @jsxImportSource react */
import { lazy, Suspense, useEffect, useState } from "react";
import { AstroProvider } from "fumadocs-core/framework/astro";
import { RootProvider } from "fumadocs-ui/provider/base";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions, playgroundLink } from "@/docs/layout";
import { ExamplesSidebar } from "./ExamplesSidebar";
import { exampleById, exampleFiles } from "./examples";
import { defaultFiles } from "./defaults";
import { decodeState } from "./share";
import "./playground.css";

const PagefindDialog = lazy(() => import("@/docs/search"));
// Workers, editors and the preview need the browser. Fetched as this module
// runs, alongside hydration, not after it.
const loadRepl = () => import("./Repl");
const early = typeof window === "undefined" ? undefined : loadRepl();
const Repl = lazy(() => early ?? loadRepl());

/** /playground: the site navbar without the docs' tabs and sidebar, then the REPL. */
export default function Playground() {
  return (
    <AstroProvider pathname="/playground" params={{}}>
      <RootProvider search={{ SearchDialog: PagefindDialog }}>
        <HomeLayout {...baseOptions} links={[
            { text: "Docs", url: "/", active: "none" },
            { text: "Playground", url: "/playground", active: "url" },
            // The docs' Playground button points here.
            ...(baseOptions.links ?? []).filter((link) => link !== playgroundLink),
          ]}>
          <main className="relative flex h-[calc(100dvh-3.5rem)] min-w-0">
            {/* Server-rendered: crawlable links to every example. */}
            <ExamplesSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <ClientOnly>
                <Suspense fallback={<StaticRepl />}>
                  <Repl />
                </Suspense>
              </ClientOnly>
            </div>
          </main>
        </HomeLayout>
      </RootProvider>
    </AstroProvider>
  );
}

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? children : null;
}

/** The code the REPL will open, as plain text, while the editor loads. */
function StaticRepl() {
  const [files, setFiles] = useState<Record<string, string>>();
  useEffect(() => {
    // Same order as the REPL: the hash, then ?example=id, then the starter.
    decodeState(location.hash.slice(1)).then((state) => {
      const linked = new URLSearchParams(location.search).get("example");
      if (state) setFiles(state.files);
      else if (linked && exampleById(linked)) setFiles(exampleFiles(linked));
      else setFiles(Object.fromEntries(defaultFiles().map((f) => [f.name, f.source])));
    });
  }, []);
  if (!files) return null;
  const [active, source] = Object.entries(files)[0];
  return (
    <div className="flex size-full flex-col" aria-busy="true">
      <div className="flex h-10 shrink-0 items-stretch border-b px-1 text-sm font-medium">
        {Object.keys(files).map((name) => (
          <span
            key={name}
            className={`ek-tab ${name === active ? "text-fd-primary" : "text-fd-muted-foreground"}`}
          >
            {name.replace(/^\//, "")}
            {name === active && <span className="absolute inset-x-2 bottom-0 h-px bg-fd-primary" />}
          </span>
        ))}
      </div>
      <pre className="min-h-0 flex-1 overflow-hidden ps-14 pe-4 pt-1 font-mono text-[14px] leading-[1.4]">
        <code>{source}</code>
      </pre>
    </div>
  );
}
