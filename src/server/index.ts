import { setRenderer } from "../jsx-runtime/renderer";
import { setInertEffects } from "../signals/lib";
import { serverJsx, SNode, type Chunk } from "./jsx";

/**
 * Render a component tree to an HTML string in any JavaScript runtime — no
 * DOM required.
 *
 * Pass a thunk, not evaluated JSX: JSX evaluates eagerly, so the server
 * renderer must be installed before the first jsx call runs.
 *
 * Server semantics: signal/computed reads are a one-shot snapshot (no
 * subscriptions), effects do not run, `on:` handlers and `ref` are skipped —
 * interactivity attaches on the client via `elements-kit/hydrate`.
 *
 * @example
 * ```tsx
 * const html = await renderToString(() => <App />);
 * ```
 */
export async function renderToString(app: () => unknown): Promise<string> {
  const prevInert = setInertEffects(true);
  setRenderer({ jsx: serverJsx as (type: unknown, props: unknown) => unknown });
  let root: unknown;
  try {
    root = app();
  } finally {
    setRenderer(null);
    setInertEffects(prevInert);
  }
  return collect(root);
}

function collect(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (node instanceof SNode) return node.chunks.map(collect).join("");
  if (typeof node === "string") return node;
  return String(node as Chunk);
}
