import { setRenderer } from "../jsx-runtime/renderer";
import { setInertEffects } from "../signals/lib";
import { escapeScriptJson } from "./escape";
import { AsyncChunk, resolveChildChunks, serverJsx, SNode } from "./jsx";

interface AsyncRecord {
  id: number;
  value: unknown;
}

/** Per-render registry of resolved async values (document-order ids). */
interface RenderContext {
  records: AsyncRecord[];
  counter: number;
}

/**
 * Render a component tree to a streaming HTML response in any JavaScript
 * runtime — no DOM required.
 *
 * Pass a thunk, not evaluated JSX: JSX evaluates eagerly, so the server
 * renderer must be installed before the first jsx call runs.
 *
 * Streaming is in-order: all HTML preceding an async insertion point
 * (`promise`/`async` reactive values used as children) flushes immediately;
 * the stream then awaits the value and continues. Resolved values are
 * serialized into a `<script type="application/json" id="ek-data">` tag at
 * the end of the stream so the client hydration pass reuses them instead of
 * refetching.
 *
 * Server semantics: signal/computed reads are a one-shot snapshot (no
 * subscriptions), effects do not run, `on:` handlers and `ref` are skipped —
 * interactivity attaches on the client via `elements-kit/hydrate`.
 *
 * Errors — including rejected async values — propagate and abort the stream.
 *
 * @example
 * ```tsx
 * export default {
 *   fetch: () => new Response(renderToStream(() => <App />), {
 *     headers: { "content-type": "text/html" },
 *   }),
 * };
 * ```
 */
export function renderToStream(app: () => unknown): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const ctx: RenderContext = { records: [], counter: 0 };
        const root = evaluate(app);

        let buffer = "";
        const flush = (): void => {
          if (buffer.length === 0) return;
          controller.enqueue(encoder.encode(buffer));
          buffer = "";
        };
        const emit = async (node: unknown): Promise<void> => {
          if (node == null || typeof node === "boolean") return;
          if (typeof node === "string") {
            buffer += node;
            return;
          }
          if (node instanceof SNode) {
            for (const chunk of node.chunks) await emit(chunk);
            return;
          }
          if (node instanceof AsyncChunk) {
            flush();
            // Ids are assigned here — the emit walk runs in document order,
            // matching the hydrate walk's claim order.
            const id = ctx.counter++;
            const value = await node.instance;
            ctx.records.push({ id, value });
            for (const chunk of resolveChildChunks(value)) await emit(chunk);
            return;
          }
          buffer += String(node);
        };

        await emit(root);
        if (ctx.records.length > 0) buffer += serializeRecords(ctx.records);
        flush();
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * Render a component tree to a complete HTML string. Convenience wrapper
 * around {@link renderToStream} — same semantics, buffered to one string.
 *
 * @example
 * ```tsx
 * const html = await renderToString(() => <App />);
 * ```
 */
export async function renderToString(app: () => unknown): Promise<string> {
  const reader = renderToStream(app).getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

/** Run `app` with the server renderer installed and effects inert. */
function evaluate(app: () => unknown): unknown {
  const prevInert = setInertEffects(true);
  setRenderer({ jsx: serverJsx as (type: never, props: never) => unknown });
  try {
    return app();
  } finally {
    setRenderer(null);
    setInertEffects(prevInert);
  }
}

function serializeRecords(records: AsyncRecord[]): string {
  const data: Record<string, { value: unknown }> = {};
  for (const record of records) {
    data[String(record.id)] = { value: record.value };
  }
  return `<script type="application/json" id="ek-data">${escapeScriptJson(
    JSON.stringify(data),
  )}</script>`;
}
