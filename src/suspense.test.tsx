/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi } from "vitest";
import { lazy, Suspense } from "./suspense";
import { renderToString } from "./server";
import { hydrate } from "./hydrate";
import { render } from "./render";
import { signal } from "./signals";
import { promise } from "./utilities/promise";

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function deferred<T>() {
  let resolve!: (v: T) => void;
  const p = new Promise<T>((res) => (resolve = res));
  return { p, resolve };
}

describe("lazy()", () => {
  it("server: streams the resolved component in order", async () => {
    const Inner = (props: { label: () => string }) => <p>{props.label}</p>;
    const Lazy = lazy(() => Promise.resolve({ default: Inner }));
    const html = await renderToString(() => (
      <div>
        <Lazy label="hi" />
      </div>
    ));
    expect(html).toContain("<p><!--{-->hi<!--}--></p>");
    // The resolved value is an element factory — not serializable, so no
    // ek-data record may be emitted for it.
    expect(html).not.toContain("ek-data");
  });

  it("client: renders once the import resolves", async () => {
    const d = deferred<{ default: () => Element }>();
    const Lazy = lazy(() => d.p);
    const host = document.createElement("div");
    render(host, () => (<div>{(<Lazy />) as never}</div>) as Node);

    expect(host.querySelector("span")).toBeNull();
    d.resolve({ default: () => (<span>loaded</span>) as unknown as Element });
    await tick();
    expect(host.querySelector("span")!.textContent).toBe("loaded");
  });

  it("hydrate: keeps server content until the import resolves", async () => {
    const Inner = () => <span>content</span>;
    const ServerLazy = lazy(() => Promise.resolve({ default: Inner }));
    const container = document.createElement("div");
    container.innerHTML = await renderToString(() => (
      <div>
        <ServerLazy />
      </div>
    ));

    const d = deferred<{ default: typeof Inner }>();
    const ClientLazy = lazy(() => d.p);
    hydrate(container, () => (
      <div>
        <ClientLazy />
      </div>
    ));

    // Import pending: server markup stays visible.
    expect(container.querySelector("span")!.textContent).toBe("content");
    d.resolve({ default: Inner });
    await tick();
    expect(container.querySelector("span")!.textContent).toBe("content");
  });

  it("memoizes the loader and exposes preload()", async () => {
    const loader = vi.fn(() =>
      Promise.resolve({ default: () => (<i>x</i>) as unknown as Element }),
    );
    const Lazy = lazy(loader);

    await Lazy.preload();
    const host = document.createElement("div");
    render(host, () => (<div>{(<Lazy />) as never}</div>) as Node);
    await tick();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(host.querySelector("i")!.textContent).toBe("x");
  });

  it("forwards getter props to the loaded component", async () => {
    const Inner = (props: { label: () => string }) => <em>{props.label}</em>;
    const Lazy = lazy(() => Promise.resolve({ default: Inner }));
    const host = document.createElement("div");
    render(host, () => (<div>{(<Lazy label="w" />) as never}</div>) as Node);
    await tick();

    expect(host.querySelector("em")!.textContent).toBe("w");
  });
});

describe("Suspense", () => {
  it("client: shows the fallback while a lazy child loads, then the content", async () => {
    const d = deferred<{ default: () => Element }>();
    const Lazy = lazy(() => d.p);
    const host = document.createElement("div");
    render(
      host,
      () =>
        (
          <div>
            <Suspense fallback={() => (<u>loading…</u>) as never}>
              <Lazy />
            </Suspense>
          </div>
        ) as Node,
    );

    expect(host.querySelector("u")!.textContent).toBe("loading…");
    d.resolve({ default: () => (<span>ready</span>) as unknown as Element });
    await tick();
    expect(host.querySelector("u")).toBeNull();
    expect(host.querySelector("span")!.textContent).toBe("ready");
  });

  it("server: awaits and renders the content, never the fallback", async () => {
    const Inner = () => <span>server-ready</span>;
    const Lazy = lazy(() => Promise.resolve({ default: Inner }));
    const html = await renderToString(() => (
      <div>
        <Suspense fallback={() => (<u>loading…</u>) as never}>
          <Lazy />
        </Suspense>
      </div>
    ));
    expect(html).toContain("server-ready");
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
  it("keeps server content while pending — no fallback flash", async () => {
    const Inner = () => <span>ready</span>;
    const ServerLazy = lazy(() => Promise.resolve({ default: Inner }));
    const container = document.createElement("div");
    container.innerHTML = await renderToString(() => (
      <div>
        <Suspense fallback={() => (<u>loading…</u>) as never}>
          <ServerLazy />
        </Suspense>
      </div>
    ));

    const d = deferred<{ default: typeof Inner }>();
    const ClientLazy = lazy(() => d.p);
    hydrate(container, () => (
      <div>
        <Suspense fallback={() => (<u>loading…</u>) as never}>
          <ClientLazy />
        </Suspense>
      </div>
    ));

    expect(container.querySelector("u")).toBeNull();
    expect(container.querySelector("span")!.textContent).toBe("ready");

    d.resolve({ default: Inner });
    await tick();
    expect(container.querySelector("span")!.textContent).toBe("ready");
  });

  it("keeps ek-data ids aligned for async values after a boundary", async () => {
    const Inner = () => <span>x</span>;
    const ServerLazy = lazy(() => Promise.resolve({ default: Inner }));
    const container = document.createElement("div");
    container.innerHTML = await renderToString(() => (
      <div>
        <Suspense fallback={null as never}>
          <ServerLazy />
        </Suspense>
        <p>{promise(Promise.resolve("seeded")) as unknown as Element}</p>
      </div>
    ));

    const d = deferred<{ default: typeof Inner }>();
    const ClientLazy = lazy(() => d.p);
    const later = promise<string>(new Promise<string>(() => {}));
    hydrate(container, () => (
      <div>
        <Suspense fallback={null as never}>
          <ClientLazy />
        </Suspense>
        <p>{later as unknown as Element}</p>
      </div>
    ));

    // The boundary consumed the same number of ids on both sides, so the
    // trailing promise seeds from its own record.
    expect(later.state).toBe("fulfilled");
    expect(later.value).toBe("seeded");
  });
});
