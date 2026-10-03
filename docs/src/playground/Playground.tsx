/** @jsxImportSource react */
import { lazy, Suspense, useEffect, useState } from "react";
import { AstroProvider } from "fumadocs-core/framework/astro";
import { RootProvider } from "fumadocs-ui/provider/base";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions, playgroundLink } from "@/docs/layout";
import { ExamplesSidebar } from "./ExamplesSidebar";
import "./playground.css";

const PagefindDialog = lazy(() => import("@/docs/search"));
// Workers, editors and the preview need the browser.
const Repl = lazy(() => import("./Repl"));

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
                <Suspense fallback={null}>
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
