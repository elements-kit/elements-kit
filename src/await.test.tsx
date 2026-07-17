/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi } from "vitest";
import { Await } from "./await";
import { renderToString } from "./server";
import { hydrate } from "./hydrate";
import { render } from "./render";
import { signal } from "./signals";
import { async, type Async } from "./utilities/async";
import type { Props } from "./jsx-runtime/infer";
import type { Children } from "./jsx-runtime/children";
import { promise } from "./utilities/promise";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function deferred<T>() {
  let resolve!: (v: T) => void;
  const p = new Promise<T>((res) => (resolve = res));
  return { p, resolve };
}

// The blessed code-splitting pattern: async + dynamic import. `run()` is
// awaited by the server stream, deferred during hydration, and doubles as
// preload when called early.
const Badge = (props: Props<{ label?: string }> = {}) => (
  <span>{props.label ?? (() => "loaded")}</span>
);

describe("code-splitting — async + dynamic import", () => {
  it("server: streams the imported component in order", async () => {
    const op = async(() => Promise.resolve(Badge));
    const html = await renderToString(() => {
      op.run();
      return <div>{op as unknown as Element}</div>;
    });
    expect(html).toContain("<span><!--{-->loaded<!--}--></span>");
    // Component functions are not serializable — no ek-data record.
    expect(html).not.toContain("ek-data");
  });

  it("client: renders once the import resolves", async () => {
    const d = deferred<typeof Badge>();
    const op = async(() => d.p);
    const host = document.createElement("div");
    render(host, () => {
      op.run();
      return (<div>{op as unknown as Element}</div>) as Node;
    });

    expect(host.querySelector("span")).toBeNull();
    d.resolve(Badge);
    await tick();
    expect(host.querySelector("span")!.textContent).toBe("loaded");
  });

  it("hydrate: keeps server content until the deferred import lands", async () => {
    const app = (op: Async<undefined, unknown>) => () => {
      op.run();
      return <div>{op as unknown as Element}</div>;
    };
    const container = document.createElement("div");
    container.innerHTML = await renderToString(
      app(async(() => Promise.resolve(Badge)) as never),
    );

    const d = deferred<typeof Badge>();
    const importer = vi.fn(() => d.p);
    hydrate(container, app(async(importer) as never));

    expect(container.querySelector("span")!.textContent).toBe("loaded");
    expect(importer).toHaveBeenCalledTimes(1); // deferred run executed post-walk
    d.resolve(Badge);
    await tick();
    expect(container.querySelector("span")!.textContent).toBe("loaded");
  });

  it("props recipe: promise of an element factory works on the server", async () => {
    const chart = promise(
      Promise.resolve(Badge).then((C) => () => <C label={() => "w"} />),
    );
    const html = await renderToString(() => (
      <div>{chart as unknown as Element}</div>
    ));
    // Getter-prop indirection nests one extra marker pair.
    expect(html).toContain("<span><!--{--><!--{-->w<!--}--><!--}--></span>");
  });
});

describe("Await", () => {
  it("client: shows the fallback while the import is pending, then the content", async () => {
    const d = deferred<typeof Badge>();
    const op = async(() => d.p);
    const host = document.createElement("div");
    render(host, () => {
      op.run();
      return (
        <div>
          <Await fallback={() => <u>loading…</u>}>
            {op}
          </Await>
        </div>
      ) as Node;
    });

    expect(host.querySelector("u")!.textContent).toBe("loading…");
    d.resolve(Badge);
    await tick();
    expect(host.querySelector("u")).toBeNull();
    expect(host.querySelector("span")!.textContent).toBe("loaded");
  });

  it("server: awaits and renders the content, never the fallback", async () => {
    const op = async(() => Promise.resolve(Badge));
    const html = await renderToString(() => {
      op.run();
      return (
        <div>
          <Await fallback={() => <u>loading…</u>}>
            {op}
          </Await>
        </div>
      );
    });
    expect(html).toContain("loaded");
    expect(html).not.toContain("loading…");
  });

  it("re-renders a thunk fallback when the boundary re-enters pending", async () => {
    let d = deferred<typeof Badge>();
    const fallback = vi.fn(() => <u>loading…</u>);
    const op = async(() => d.p);
    const host = document.createElement("div");
    render(host, () => {
      op.run();
      return (
        <div>
          <Await fallback={fallback}>{op}</Await>
        </div>
      ) as Node;
    });

    expect(host.querySelector("u")).not.toBeNull();
    d.resolve(Badge);
    await tick();
    expect(host.querySelector("span")!.textContent).toBe("loaded");

    // Re-run the op — the boundary re-enters pending and the thunk renders
    // a FRESH fallback (the first one was consumed by the slot swap).
    d = deferred<typeof Badge>();
    op.run();
    await tick();
    expect(host.querySelector("u")).not.toBeNull();
    expect(fallback).toHaveBeenCalledTimes(2);

    d.resolve(Badge);
    await tick();
    expect(host.querySelector("span")!.textContent).toBe("loaded");
  });

  it("passes non-async children straight through", async () => {
    const host = document.createElement("div");
    render(
      host,
      () =>
        (
          <div>
            <Await fallback={() => <u>l</u>}>
              <b>static</b>
            </Await>
          </div>
        ) as Node,
    );
    expect(host.querySelector("b")!.textContent).toBe("static");
    expect(host.querySelector("u")).toBeNull();
  });

  it("honors an explicit `when` awaitable", async () => {
    const d = deferred<string>();
    const gate = promise(d.p);
    const s = signal("v");
    const host = document.createElement("div");
    render(
      host,
      () =>
        (
          <div>
            <Await when={gate} fallback={() => <u>w</u>}>
              <span>{() => s()}</span>
            </Await>
          </div>
        ) as Node,
    );

    expect(host.querySelector("u")).not.toBeNull();
    d.resolve("done");
    await tick();
    expect(host.querySelector("u")).toBeNull();
    expect(host.querySelector("span")!.textContent).toBe("v");
  });
});

describe("Await — hydration", () => {
  const app = (op: { run(): void } & PromiseLike<Children>) => () => {
    op.run();
    return (
      <div>
        <Await fallback={() => <u>loading…</u>}>{op}</Await>
      </div>
    );
  };

  it("keeps server content while pending — no fallback flash", async () => {
    const container = document.createElement("div");
    container.innerHTML = await renderToString(
      app(async(() => Promise.resolve(Badge))),
    );

    const d = deferred<typeof Badge>();
    hydrate(container, app(async(() => d.p)));

    // The deferred run() re-enters pending after the walk — the server
    // content must stay, the fallback must never show.
    await tick();
    expect(container.querySelector("u")).toBeNull();
    expect(container.querySelector("span")!.textContent).toBe("loaded");

    d.resolve(Badge);
    await tick();
    expect(container.querySelector("u")).toBeNull();
    expect(container.querySelector("span")!.textContent).toBe("loaded");
  });

  it("keeps ek-data ids aligned for async values after a boundary", async () => {
    const page = (
      op: { run(): void } & PromiseLike<Children>,
      later: unknown,
    ) => () => {
      op.run();
      return (
        <div>
          <Await fallback={null}>{op}</Await>
          <p>{later as never}</p>
        </div>
      );
    };
    const container = document.createElement("div");
    container.innerHTML = await renderToString(
      page(
        async(() => Promise.resolve(Badge)),
        promise(Promise.resolve("seeded")),
      ),
    );

    const later = promise<string>(new Promise<string>(() => {}));
    hydrate(
      container,
      page(
        async(() => new Promise<never>(() => {})),
        later,
      ),
    );

    expect(later.state).toBe("fulfilled");
    expect(later.value).toBe("seeded");
  });
});
