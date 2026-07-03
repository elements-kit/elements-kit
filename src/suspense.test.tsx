/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi } from "vitest";
import { Suspense } from "./suspense";
import { renderToString } from "./server";
import { hydrate } from "./hydrate";
import { render } from "./render";
import { signal } from "./signals";
import { async, type Async } from "./utilities/async";
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
const Badge = (props: { label?: () => string } = {}) => (
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

describe("Suspense", () => {
  it("client: shows the fallback while the import is pending, then the content", async () => {
    const d = deferred<typeof Badge>();
    const op = async(() => d.p);
    const host = document.createElement("div");
    render(host, () => {
      op.run();
      return (
        <div>
          <Suspense fallback={() => (<u>loading…</u>) as never}>
            {op as never}
          </Suspense>
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
          <Suspense fallback={() => (<u>loading…</u>) as never}>
            {op as never}
          </Suspense>
        </div>
      );
    });
    expect(html).toContain("loaded");
    expect(html).not.toContain("loading…");
  });

  it("passes non-async children straight through", async () => {
    const host = document.createElement("div");
    render(
      host,
      () =>
        (
          <div>
            <Suspense fallback={() => (<u>l</u>) as never}>
              <b>static</b>
            </Suspense>
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
            <Suspense when={gate as never} fallback={() => (<u>w</u>) as never}>
              <span>{() => s()}</span>
            </Suspense>
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

describe("Suspense — hydration", () => {
  const app = (op: unknown) => () => {
    (op as { run(): void }).run();
    return (
      <div>
        <Suspense fallback={() => (<u>loading…</u>) as never}>
          {op as never}
        </Suspense>
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
    const page = (op: unknown, later: unknown) => () => {
      (op as { run(): void }).run();
      return (
        <div>
          <Suspense fallback={null as never}>{op as never}</Suspense>
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
    hydrate(container, page(async(() => new Promise(() => {})), later));

    expect(later.state).toBe("fulfilled");
    expect(later.value).toBe("seeded");
  });
});
