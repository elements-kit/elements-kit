/** @jsxImportSource elements-kit */
import { lazy, Suspense } from "elements-kit/suspense";

// Artificial delay so the fallback is visible on fast connections. On the
// server the stream awaits the import — the fallback never renders there.
const LazyBadge = lazy(() =>
  new Promise((resolve) => setTimeout(resolve, 800)).then(
    () => import("./LazyBadge"),
  ),
);

/** lazy() + Suspense island demo. */
export default function AstroLazy() {
  return (
    <div style="padding:0.75rem 1rem;border:1px solid var(--sl-color-gray-5);border-radius:0.5rem">
      <Suspense fallback={() => (<em>loading the chunk…</em>) as never}>
        <LazyBadge />
      </Suspense>
    </div>
  );
}
