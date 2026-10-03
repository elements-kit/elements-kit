/** @jsxImportSource react */
import { useEffect, useRef, useState } from "react";
import { useDark } from "./use-dark";

// Dev serves Storybook on its own port; the production build copies the
// static build under the docs site's /storybook/ subpath (same origin).
const BASE = import.meta.env.DEV ? "http://localhost:6006" : "/storybook";

/**
 * The story canvas alone (`iframe.html`): no sidebar, toolbar or addon
 * panels. Follows the docs theme, and sizes itself to the story when the
 * frame is same-origin. Controls live behind "Open in Storybook".
 */
export function StorybookEmbed({
  story,
  height = 320,
}: {
  /** Story id, e.g. `ui-accordion--surface`. */
  story: string;
  /** Initial (and cross-origin) height in px. */
  height?: number;
}) {
  const dark = useDark();
  const frame = useRef<HTMLIFrameElement>(null);
  const [fit, setFit] = useState<number>();
  const theme = dark ? "dark" : "light";
  const src = `${BASE}/iframe.html?id=${story}&viewMode=story&globals=theme:${theme}`;

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let observer: ResizeObserver | undefined;
    const measure = () => {
      let body: HTMLElement | undefined;
      try {
        body = el.contentDocument?.body ?? undefined;
      } catch {
        return; // cross-origin (dev): keep `height`
      }
      if (!body) return;
      observer?.disconnect();
      observer = new ResizeObserver(() =>
        setFit(Math.ceil(body!.getBoundingClientRect().height)),
      );
      observer.observe(body);
    };
    el.addEventListener("load", measure);
    return () => {
      el.removeEventListener("load", measure);
      observer?.disconnect();
    };
  }, [src]);

  return (
    <figure className="not-prose my-6 overflow-hidden rounded-xl border bg-fd-card">
      <iframe
        ref={frame}
        src={src}
        title={`Story: ${story}`}
        loading="lazy"
        className="block w-full"
        style={{ height: fit ?? height, colorScheme: theme }}
      />
      <figcaption className="flex justify-end border-t px-3 py-1.5 text-xs">
        <a
          href={`${BASE}/?path=/story/${story}`}
          target="_blank"
          rel="noopener"
          className="text-fd-muted-foreground hover:text-fd-foreground"
        >
          Open in Storybook with controls ↗
        </a>
      </figcaption>
    </figure>
  );
}
