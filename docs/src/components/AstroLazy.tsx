/** @jsxImportSource elements-kit */
import { async } from "elements-kit/utilities/async";
import { Suspense } from "elements-kit/suspense";

// Code splitting is the async primitive + a dynamic import — no dedicated
// lazy() API. The artificial delay keeps the fallback visible on fast
// connections; on the server the stream awaits the import, so the fallback
// never server-renders.
const badge = async(() =>
  new Promise((resolve) => setTimeout(resolve, 800))
    .then(() => import("./LazyBadge"))
    .then((m) => m.default),
);

/** async + import + Suspense island demo. */
export default function AstroLazy() {
  badge.run();
  return (
    <div style="padding:0.75rem 1rem;border:1px solid var(--sl-color-gray-5);border-radius:0.5rem">
      <Suspense fallback={() => (<em>loading the chunk…</em>) as never}>
        {badge as never}
      </Suspense>
    </div>
  );
}
