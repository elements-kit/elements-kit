/** @jsxImportSource react */

// Dev serves Storybook on its own port; the production build copies the
// static build under the docs site's /storybook/ subpath.
const BASE = import.meta.env.DEV ? "http://localhost:6006" : "/storybook";

export function StorybookEmbed({
  story,
  height = 720,
}: {
  /** Story id, e.g. `ui-accordion--surface`. */
  story: string;
  /** Iframe height in px. */
  height?: number;
}) {
  // `singleStory` drops the sidebar but keeps the toolbar + Controls panel.
  return (
    <iframe
      src={`${BASE}/?path=/story/${story}&singleStory=true`}
      title="Storybook"
      loading="lazy"
      className="not-prose my-6 w-full rounded-lg border"
      style={{ height }}
    />
  );
}
