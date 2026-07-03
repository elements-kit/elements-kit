// @vitest-environment node
/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
// Stream robustness: cancellation must not throw after the fact, concurrent
// renders must not cross their global renderer state, and rejections abort.
import { describe, it, expect } from "vitest";
import { renderToStream, renderToString } from "./server";
import { promise } from "./utilities/promise";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const p = new Promise<T>((res) => (resolve = res));
  return { p, resolve };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("stream robustness", () => {
  it("reader cancellation mid-stream is clean (no post-cancel throw)", async () => {
    const d = deferred<string>();
    const stream = renderToStream(() => (
      <main>
        <h1>head</h1>
        <p>{promise(d.p) as unknown as Element}</p>
      </main>
    ));
    const reader = stream.getReader();
    await reader.read(); // pre-async flush
    await reader.cancel("navigated away");
    // The pending value settles after cancellation — emission must not blow
    // up on the closed controller (surfaces as an unhandled rejection, which
    // fails the test run).
    d.resolve("late");
    await tick();
    await tick();
  });

  it("concurrent renders don't cross state at await points", async () => {
    const d1 = deferred<string>();
    const d2 = deferred<string>();
    const r1 = renderToString(() => <div>{promise(d1.p) as unknown as Element}</div>);
    const r2 = renderToString(() => <span>{promise(d2.p) as unknown as Element}</span>);
    // Resolve in reverse order to force interleaving.
    d2.resolve("two");
    await tick();
    d1.resolve("one");
    const [h1, h2] = await Promise.all([r1, r2]);
    expect(h1).toContain("<div><!--{-->one<!--}--></div>");
    expect(h2).toContain("<span><!--{-->two<!--}--></span>");
    // Each stream serialized its own record set.
    expect(h1).toContain('"0":{"value":"one"}');
    expect(h2).toContain('"0":{"value":"two"}');
  });

  it("large trees stream without corruption", async () => {
    const html = await renderToString(() => (
      <div>
        {Array.from({ length: 2000 }, (_, i) => (
          <span title={`t${i}`}>{`item ${i}`}</span>
        )) as never}
      </div>
    ));
    expect(html.startsWith("<div>")).toBe(true);
    expect(html.endsWith("</div>")).toBe(true);
    expect(html).toContain('<span title="t1999">item 1999</span>');
  });
});
