// @vitest-environment node
/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect } from "vitest";
import { renderToStream, renderToString } from "./index";
import { promise } from "../utilities/promise";
import { async } from "../utilities/async";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e?: unknown) => void;
  const p = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { p, resolve, reject };
}

const decoder = new TextDecoder();

describe("renderToStream / async insertion points", () => {
  it("renders awaited promise values inside slot markers and serializes them", async () => {
    const html = await renderToString(() => (
      <div>{promise(Promise.resolve("hi"))}</div>
    ));
    expect(html).toBe(
      '<div><!--{-->hi<!--}--></div>' +
        '<script type="application/json" id="ek-data">{"0":{"value":"hi"}}</script>',
    );
  });

  it("flushes HTML preceding an async insertion point before it resolves", async () => {
    const d = deferred<string>();
    const stream = renderToStream(() => (
      <main>
        <h1>t</h1>
        <p>{promise(d.p)}</p>
      </main>
    ));
    const reader = stream.getReader();

    const first = await reader.read();
    expect(decoder.decode(first.value)).toBe("<main><h1>t</h1><p><!--{-->");

    d.resolve("x");
    let rest = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      rest += decoder.decode(value);
    }
    expect(rest).toBe(
      'x<!--}--></p></main>' +
        '<script type="application/json" id="ek-data">{"0":{"value":"x"}}</script>',
    );
  });

  it("assigns render-order ids to multiple async values", async () => {
    const html = await renderToString(() => (
      <div>
        <span>{promise(Promise.resolve("a"))}</span>
        <span>{promise(Promise.resolve("b"))}</span>
      </div>
    ));
    expect(html).toContain('{"0":{"value":"a"},"1":{"value":"b"}}');
  });

  it("assigns ids in document order, not jsx-evaluation order", async () => {
    // pA sits before the nested <span>, but the span's jsx call evaluates
    // first. Ids must follow document order so the hydrate walk (document
    // order) matches.
    const html = await renderToString(() => (
      <div>
        {promise(Promise.resolve("A"))}
        <span>{promise(Promise.resolve("B"))}</span>
      </div>
    ));
    expect(html).toContain('{"0":{"value":"A"},"1":{"value":"B"}}');
  });

  it("escapes </script> sequences in serialized data", async () => {
    const html = await renderToString(() => (
      <div>{promise(Promise.resolve("</script><b>"))}</div>
    ));
    expect(html).toContain('"value":"<\\/script><b>"');
    expect(html).not.toContain('"value":"</script>');
  });

  it("emits no ek-data script for a fully synchronous render", async () => {
    const html = await renderToString(() => <div>hi</div>);
    expect(html).toBe("<div>hi</div>");
  });

  it("rejects when an async value rejects", async () => {
    const d = deferred<string>();
    const pending = renderToString(() => <div>{promise(d.p)}</div>);
    d.reject(new Error("boom"));
    await expect(pending).rejects.toThrow("boom");
  });

  it("renders already-fulfilled reactive promises without stalling", async () => {
    const p = promise(Promise.resolve("done"));
    await p;
    const html = await renderToString(() => <div>{p as unknown as Element}</div>);
    expect(html).toContain("<div><!--{-->done<!--}--></div>");
  });

  it("awaits running Async operations", async () => {
    const op = async(() => Promise.resolve("v"));
    void op.run(undefined);
    const html = await renderToString(() => <div>{op}</div>);
    expect(html).toContain("<div><!--{-->v<!--}--></div>");
  });
});
