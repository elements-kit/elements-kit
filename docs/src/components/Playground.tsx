/** @jsxImportSource react */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { exampleFiles } from "@/playground/examples";

// The editor, compiler and preview are browser-only and heavy. The server
// renders the code itself (crawlable, no layout shift); the live embed takes
// over once it nears the viewport (pages carry several, some in hidden tabs).
const Embed = lazy(() => import("@/playground/Embed"));

export interface PlaygroundProps {
  /** An id from `src/playground/examples.ts`. */
  example: string;
}

export function Playground({ example }: PlaygroundProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const files = exampleFiles(example);
  const initial = Object.keys(files)[0];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "200px" },
    );
    observer.observe(frame.current!);
    return () => observer.disconnect();
  }, []);

  const still = <StaticEmbed files={files} active={initial} />;
  return (
    // Live demos, not prose: kept out of the site search index.
    <div ref={frame} className="ek-playground-frame not-prose" data-pagefind-ignore>
      {visible ? (
        <Suspense fallback={still}>
          <Embed example={example} files={files} initial={initial} />
        </Suspense>
      ) : (
        still
      )}
    </div>
  );
}

/** The embed's shape with plain code: what the server sends. */
function StaticEmbed({ files, active }: { files: Record<string, string>; active: string }) {
  return (
    <>
      <div className="flex h-10 items-stretch border-b px-2">
        {Object.keys(files).map((name) => (
          <span
            key={name}
            className={`relative inline-flex items-center px-2 text-sm font-medium ${
              name === active ? "text-fd-primary" : "text-fd-muted-foreground"
            }`}
          >
            {name}
            {name === active && <span className="absolute inset-x-2 bottom-0 h-px bg-fd-primary" />}
          </span>
        ))}
      </div>
      <div className="grid md:h-104 md:grid-cols-2">
        <pre className="h-80 overflow-hidden bg-fd-background ps-14 pe-4 pt-3 font-mono text-[13px] leading-[1.4] md:h-full">
          <code>{files[active]}</code>
        </pre>
        <div className="h-72 border-fd-border max-md:border-t md:h-full md:border-s" />
      </div>
    </>
  );
}
