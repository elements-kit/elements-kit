/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "../server";
import { hydrate } from "./index";
import { signal } from "../signals";
import { promise } from "../utilities/promise";
import { For } from "../for";

async function serve(app: () => unknown): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.innerHTML = await renderToString(app);
  return container;
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const p = new Promise<T>((res) => {
    resolve = res;
  });
  return { p, resolve };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("hydrate — DOM adoption", () => {
  it("preserves node identity for static elements", async () => {
    const app = () => (
      <div>
        <span>a</span>
      </div>
    );
    const container = await serve(app);
    const before = container.querySelector("span");

    hydrate(container, app);

    expect(container.querySelector("span")).toBe(before);
  });

  it("attaches event handlers to claimed elements", async () => {
    const fn = vi.fn();
    const app = () => <button on:click={fn}>x</button>;
    const container = await serve(() => <button>x</button>);
    const before = container.querySelector("button")!;

    hydrate(container, app);

    const after = container.querySelector("button")!;
    expect(after).toBe(before);
    after.click();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("wires live bindings to claimed slot markers", async () => {
    const s = signal("v");
    const app = () => <div>{() => s()}</div>;
    const container = await serve(app);

    hydrate(container, app);

    expect(container.querySelector("div")!.textContent).toBe("v");
    s("w");
    expect(container.querySelector("div")!.textContent).toBe("w");
  });

  it("fires refs with the claimed element", async () => {
    let captured: unknown = null;
    const container = await serve(() => <section id="s" />);
    const before = container.querySelector("section");

    hydrate(container, () => <section id="s" ref={(el) => (captured = el)} />);

    expect(captured).toBe(before);
  });

  it("hydrates function components with getter props", async () => {
    const Greet = (props: { name: () => string }) => <p>{props.name}</p>;
    const app = () => <Greet name={"wael" as never} />;
    const container = await serve(app);
    const before = container.querySelector("p");

    hydrate(container, app);

    expect(container.querySelector("p")).toBe(before);
    expect(container.textContent).toBe("wael");
  });
});

describe("hydrate — For lists", () => {
  it("claims list entries and reconciles updates without rebuilding survivors", async () => {
    const make = () => [
      { id: 1, t: "a" },
      { id: 2, t: "b" },
    ];
    const items = signal(make());
    const app = () => (
      <ul>
        <For each={items} by={(x) => x.id}>
          {(x) => <li>{x.t}</li>}
        </For>
      </ul>
    );
    const container = await serve(app);

    hydrate(container, app);

    const before = [...container.querySelectorAll("li")];
    expect(before.map((li) => li.textContent)).toEqual(["a", "b"]);

    items([...make(), { id: 3, t: "c" }]);

    const after = [...container.querySelectorAll("li")];
    expect(after.map((li) => li.textContent)).toEqual(["a", "b", "c"]);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
  });
});

describe("hydrate — mismatch handling", () => {
  it("falls back to a fresh render and reports the mismatch", async () => {
    const onMismatch = vi.fn();
    const container = await serve(() => (
      <div>
        <span>a</span>
      </div>
    ));

    hydrate(
      container,
      () => (
        <div>
          <p>a</p>
        </div>
      ),
      { onMismatch },
    );

    expect(onMismatch).toHaveBeenCalled();
    expect(container.querySelector("p")).not.toBeNull();
    expect(container.querySelector("p")!.textContent).toBe("a");
  });
});

describe("hydrate — async children", () => {
  it("keeps server content until the client promise settles, then updates", async () => {
    const serverContainer = await serve(() => (
      <div>{promise(Promise.resolve("x"))}</div>
    ));
    expect(serverContainer.querySelector("div")!.textContent).toBe("x");

    const d = deferred<string>();
    hydrate(serverContainer, () => <div>{promise(d.p)}</div>);

    // Pending client promise: server-rendered value stays visible.
    expect(serverContainer.querySelector("div")!.textContent).toBe("x");

    d.resolve("y");
    await tick();
    expect(serverContainer.querySelector("div")!.textContent).toBe("y");
  });
});

describe("hydrate — disposal", () => {
  it("stops live bindings after dispose", async () => {
    const s = signal("v");
    const app = () => <div>{() => s()}</div>;
    const container = await serve(app);

    const { dispose } = hydrate(container, app);
    s("w");
    expect(container.querySelector("div")!.textContent).toBe("w");

    dispose();
    // Scope teardown clears slot content (same as client-rendered trees) and
    // detaches the binding — later writes never reach the DOM.
    expect(container.querySelector("div")!.textContent).toBe("");
    s("z");
    expect(container.querySelector("div")!.textContent).toBe("");
  });
});
