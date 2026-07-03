/** @jsxImportSource elements-kit */
import { async } from "elements-kit/utilities/async";
import { Await } from "elements-kit/await";

// Code splitting is the async primitive + a dynamic import — no dedicated
// lazy() API. The artificial delay keeps the fallback visible on fast
// connections; on the server the stream awaits the import, so the fallback
// never server-renders.
const badge = async(() =>
  new Promise((resolve) => setTimeout(resolve, 800))
    .then(() => import("./LazyBadge"))
    .then((m) => m.default),
);

/** async + import + Await island demo. */
export default function AstroLazy() {
  badge.run();
  return (
    <div class="unset x-card" data-variant="surface" data-size="2">
      <Await fallback={() => (<em>loading the chunk…</em>) as never}>
        {badge as never}
      </Await>
    </div>
  );
}
