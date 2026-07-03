/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
// Hydration edge cases adapted from dom-expressions hydration scenarios.
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "../server";
import { hydrate } from "./index";
import { signal } from "../signals";
import { For } from "../for";

async function serve(app: () => unknown): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.innerHTML = await renderToString(app);
  return container;
}

describe("hydrate edges — text claiming", () => {
  it("claims adjacent static text children merged into one server text node", async () => {
    const app = () => (
      <div>
        {"a"}
        {"b"}
      </div>
    );
    const container = await serve(app);
    const onMismatch = vi.fn();

    hydrate(container, app, { onMismatch });

    expect(onMismatch).not.toHaveBeenCalled();
    expect(container.querySelector("div")!.textContent).toBe("ab");
  });

  it("claims leading text before a dynamic sibling without touching it", async () => {
    const name = signal("wael");
    const app = () => <p>hello {() => name()}</p>;
    const container = await serve(app);
    const textNode = container.querySelector("p")!.firstChild;

    hydrate(container, app);

    expect(container.querySelector("p")!.firstChild).toBe(textNode);
    expect(container.querySelector("p")!.textContent).toBe("hello wael");
    name("world");
    expect(container.querySelector("p")!.textContent).toBe("hello world");
  });

  it("renders zero text and claims it", async () => {
    const app = () => <span>{0}</span>;
    const container = await serve(app);
    const onMismatch = vi.fn();

    hydrate(container, app, { onMismatch });

    expect(onMismatch).not.toHaveBeenCalled();
    expect(container.textContent).toBe("0");
  });
});

describe("hydrate edges — nested dynamics", () => {
  it("claims a dynamic child that renders an element with its own binding", async () => {
    const s = signal("v");
    const app = () => <div>{() => <span>{() => s()}</span> as never}</div>;
    const container = await serve(app);

    hydrate(container, app);

    expect(container.querySelector("span")!.textContent).toBe("v");
    s("w");
    expect(container.querySelector("span")!.textContent).toBe("w");
  });

  it("claims falsy conditional children as empty", async () => {
    const cond = false;
    const app = () => (
      <div>
        {cond && (<span>x</span> as never)}
        <b>tail</b>
      </div>
    );
    const container = await serve(app);
    const onMismatch = vi.fn();

    hydrate(container, app, { onMismatch });

    expect(onMismatch).not.toHaveBeenCalled();
    expect(container.querySelector("b")!.textContent).toBe("tail");
  });
});

describe("hydrate edges — For", () => {
  it("claims an empty list and grows it afterwards", async () => {
    const items = signal<{ id: number; t: string }[]>([]);
    const app = () => (
      <ul>
        <For each={items} by={(x) => x.id}>
          {(x) => <li>{x.t}</li>}
        </For>
      </ul>
    );
    const container = await serve(app);

    hydrate(container, app);

    expect(container.querySelectorAll("li").length).toBe(0);
    items([{ id: 1, t: "a" }]);
    expect(
      [...container.querySelectorAll("li")].map((li) => li.textContent),
    ).toEqual(["a"]);
  });

  it("reorders claimed entries in place, preserving node identity", async () => {
    const make = () => [
      { id: 1, t: "a" },
      { id: 2, t: "b" },
      { id: 3, t: "c" },
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
    const [a, b, c] = [...container.querySelectorAll("li")];

    items([...make()].reverse());

    const after = [...container.querySelectorAll("li")];
    expect(after.map((li) => li.textContent)).toEqual(["c", "b", "a"]);
    expect(after[0]).toBe(c);
    expect(after[1]).toBe(b);
    expect(after[2]).toBe(a);
  });

  it("removes claimed entries and disposes their scopes", async () => {
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
    items([make()[1]!]);

    expect(
      [...container.querySelectorAll("li")].map((li) => li.textContent),
    ).toEqual(["b"]);
  });
});

describe("hydrate edges — raw Node children", () => {
  it("inserts a pre-built DOM node via fallback instead of stringifying it", async () => {
    const onMismatch = vi.fn();
    const container = document.createElement("div");
    container.innerHTML = "<div><span>old</span></div>";
    const fresh = document.createElement("span");
    fresh.textContent = "new";

    hydrate(container, () => <div>{fresh}</div>, { onMismatch });

    const span = container.querySelector("span")!;
    expect(span).toBe(fresh);
    expect(container.textContent).not.toContain("[object");
  });
});

describe("hydrate edges — isolation", () => {
  it("hydrates two containers independently", async () => {
    const s1 = signal("a");
    const s2 = signal("x");
    const app1 = () => <div>{() => s1()}</div>;
    const app2 = () => <div>{() => s2()}</div>;
    const c1 = await serve(app1);
    const c2 = await serve(app2);

    hydrate(c1, app1);
    const { dispose } = hydrate(c2, app2);

    s1("b");
    s2("y");
    expect(c1.textContent).toBe("b");
    expect(c2.textContent).toBe("y");

    dispose();
    s1("c");
    s2("z");
    expect(c1.textContent).toBe("c");
    expect(c2.textContent).toBe("");
  });
});
