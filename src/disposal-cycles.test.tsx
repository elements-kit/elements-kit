/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
// Leak probe: repeated hydrate/dispose cycles must leave zero live bindings —
// a signal write after disposal executes no effect bodies from any cycle.
import { describe, it, expect } from "vitest";
import { renderToString } from "./server";
import { hydrate } from "./hydrate";
import { signal } from "./signals";

describe("disposal cycles", () => {
  it("50 hydrate/dispose cycles leave no live effects", async () => {
    const s = signal(0);
    let executions = 0;
    const app = () => (
      <div>
        {() => {
          executions++;
          return String(s());
        }}
      </div>
    );
    const html = await renderToString(() => (
      <div>{() => String(0) as never}</div>
    ));

    for (let i = 0; i < 50; i++) {
      const container = document.createElement("div");
      container.innerHTML = html;
      const { dispose } = hydrate(container, app);
      dispose();
    }

    const baseline = executions;
    s(999); // must reach no effect from any disposed cycle
    expect(executions).toBe(baseline);
  });

  it("dispose mid-pending async leaves no late DOM writes", async () => {
    const { promise } = await import("./utilities/promise");
    let resolve!: (v: string) => void;
    const p = promise<string>(new Promise<string>((r) => (resolve = r)));
    const app = () => <div>{p as unknown as Element}</div>;
    const container = document.createElement("div");
    container.innerHTML = "<div><!--{-->server<!--}--></div>";

    const { dispose } = hydrate(container, app);
    dispose();
    resolve("late");
    await new Promise((r) => setTimeout(r, 0));
    // Region was cleared at dispose; the late settlement must not write.
    expect(container.querySelector("div")!.textContent).not.toContain("late");
  });
});
