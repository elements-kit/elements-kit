/** @jsxImportSource react */
import { useEffect, useId, useState } from "react";
import { useDark } from "./use-dark";

/** Mermaid source rendered client-side; re-renders on theme change. */
export function Diagram({ code }: { code: string }) {
  const id = `diagram-${useId().replace(/:/g, "")}`;
  const dark = useDark();
  const [svg, setSvg] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? "dark" : "default",
        fontFamily: "inherit",
      });
      try {
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) setSvg(svg);
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, dark, id]);

  return (
    <div className="not-prose my-6 flex justify-center overflow-hidden rounded-lg border bg-fd-card p-6 [&_svg]:h-auto [&_svg]:max-w-full">
      {svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <span className="text-sm text-fd-muted-foreground">
          {error ?? "Loading diagram…"}
        </span>
      )}
    </div>
  );
}
