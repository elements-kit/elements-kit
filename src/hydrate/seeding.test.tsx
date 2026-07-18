/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect } from "vitest";
import { renderToString } from "../server";
import { hydrate } from "./index";
import { promise } from "../utilities/promise";
import { async } from "../utilities/async";

async function serve(app: () => unknown): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.innerHTML = await renderToString(app);
  return container;
}

const never = () => new Promise<string>(() => {});
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("hydrate — ek-data seeding", () => {
  it("seeds a pending promise from the serialized server value", async () => {
    const container = await serve(() => (
      <div>{promise(Promise.resolve("x"))}</div>
    ));

    const p = promise<string>(never());
    hydrate(container, () => <div>{p as unknown as Element}</div>);

    expect(p.state).toBe("fulfilled");
    expect(p.value).toBe("x");
    expect(container.querySelector("div")!.textContent).toBe("x");
  });

  it("stale-while-revalidate: the real resolution overwrites the seed", async () => {
    const container = await serve(() => (
      <div>{promise(Promise.resolve("x"))}</div>
    ));

    let resolve!: (v: string) => void;
    const p = promise<string>(new Promise((r) => (resolve = r)));
    hydrate(container, () => <div>{p as unknown as Element}</div>);
    expect(p.value).toBe("x"); // seeded

    resolve("y");
    await tick();
    expect(p.value).toBe("y");
    expect(container.querySelector("div")!.textContent).toBe("y");
  });

  it("aligns seeds by document order across nested structure", async () => {
    const app = (a: unknown, b: unknown) => () => (
      <div>
        {a as never}
        <span>{b as never}</span>
      </div>
    );
    const container = await serve(
      app(promise(Promise.resolve("A")), promise(Promise.resolve("B"))),
    );

    const pa = promise<string>(never());
    const pb = promise<string>(never());
    hydrate(container, app(pa, pb));

    expect(pa.value).toBe("A");
    expect(pb.value).toBe("B");
  });

  it("seeds Async instances through their current operation", async () => {
    const container = await serve(() => (
      <div>{promise(Promise.resolve("v"))}</div>
    ));

    const op = async(() => never());
    void op.run();
    hydrate(container, () => <div>{op as unknown as Element}</div>);

    expect(op.state).toBe("fulfilled");
    expect(op.value).toBe("v");
  });

  it("seeds an idle Async by materializing an operation, not the shared IDLE", async () => {
    // An instance whose deferred run never fired is still idle (#current is the
    // shared IDLE placeholder) when the claim walk seeds it. [SEED] must
    // materialize a fresh fulfilled operation — seeding IDLE in place would
    // corrupt every other idle instance.
    const container = await serve(() => (
      <div>{promise(Promise.resolve("v"))}</div>
    ));

    const op = async(() => never());
    expect(op.state).toBe("idle");
    hydrate(container, () => <div>{op as unknown as Element}</div>);

    expect(op.state).toBe("fulfilled");
    expect(op.value).toBe("v");

    // The shared placeholder was not mutated: a fresh op is still idle.
    expect(async(() => never()).state).toBe("idle");
  });

  it("leaves promises pending when no ek-data is present", async () => {
    const container = document.createElement("div");
    container.innerHTML = "<div><!--{-->server<!--}--></div>";

    const p = promise<string>(never());
    hydrate(container, () => <div>{p as unknown as Element}</div>);

    expect(p.state).toBe("pending");
    // Keep-server-content: pending async leaves the server HTML visible.
    expect(container.querySelector("div")!.textContent).toBe("server");
  });
});
