import { describe, it, expect } from "vitest";
import { render } from "@/render";
import { createHotElement } from "@/jsx-runtime/hot";
import { HMR_SLOT } from "./hmr-slot";
import hmr, { type IslandRecord } from "./hmr-runtime";

/** Mount `Component` into a fresh host the way astro-client does. */
function mount(Component: () => Node): [HTMLElement, IslandRecord] {
  const element = document.createElement("div");
  document.body.append(element);
  const record: IslandRecord = {
    element,
    Component,
    props: {},
    dispose: render(element, () => Component()),
  };
  return [element, record];
}

const Old = () => <p>old</p>;
const New = () => <p>new</p>;

describe("hmr registry", () => {
  it("installs itself on globalThis under the shared slot", () => {
    expect((globalThis as Record<symbol, unknown>)[HMR_SLOT]).toBe(hmr);
  });

  it("swaps a registered island in place", () => {
    const [element, record] = mount(Old);
    const off = hmr.register(record);
    expect(element.textContent).toBe("old");

    expect(hmr.swap({ default: Old }, { default: New })).toBe(true);
    expect(element.textContent).toBe("new");
    expect(record.Component).toBe(New);

    off();
  });

  it("disposes the previous mount instead of stacking DOM", () => {
    const [element, record] = mount(Old);
    const off = hmr.register(record);

    hmr.swap({ default: Old }, { default: New });
    hmr.swap({ default: New }, { default: Old });

    expect(element.children).toHaveLength(1);
    expect(element.textContent).toBe("old");

    off();
  });

  it("matches named exports, not just default", () => {
    const [element, record] = mount(Old);
    const off = hmr.register(record);

    expect(hmr.swap({ Panel: Old }, { Panel: New })).toBe(true);
    expect(element.textContent).toBe("new");

    off();
  });

  it("reports false when no live island came from the module", () => {
    const Unrelated = () => <p>unrelated</p>;
    expect(hmr.swap({ default: Unrelated }, { default: New })).toBe(false);
  });

  it("reports success from a component swap with no island involved", () => {
    // Components inside an island swap through their cell, so `swap` has to
    // report success for them too — a `false` here would send the caller to
    // `import.meta.hot.invalidate()` and reload a page that just updated.
    // Own fixtures: `createHotElement` gives a component a cell that outlives
    // the mount, which would make the shared `Old`/`New` match here forever.
    const Before = () => <p>before</p>;
    const After = () => <p>after</p>;

    const host = document.createElement("div");
    document.body.append(host);
    const unmount = render(host, () => createHotElement(Before));

    expect(hmr.swap({ default: Before }, { default: After })).toBe(true);
    expect(host.textContent).toBe("after");

    unmount();
  });

  it("reports true without re-rendering when the export is unchanged", () => {
    const [element, record] = mount(Old);
    const off = hmr.register(record);
    const before = element.firstChild;

    expect(hmr.swap({ default: Old }, { default: Old })).toBe(true);
    expect(element.firstChild).toBe(before);

    off();
  });

  it("stops tracking an unregistered island", () => {
    const [element, record] = mount(Old);
    hmr.register(record)();

    expect(hmr.swap({ default: Old }, { default: New })).toBe(false);
    expect(element.textContent).toBe("old");
  });

  it("hands the recorded props to the replacement", () => {
    const Greet = ({ name }: { name: string }) => <p>old {name}</p>;
    const Greet2 = ({ name }: { name: string }) => <p>new {name}</p>;

    const element = document.createElement("div");
    document.body.append(element);
    const record: IslandRecord = {
      element,
      Component: Greet,
      props: { name: "chat" },
      dispose: render(element, () => Greet({ name: "chat" })),
    };
    const off = hmr.register(record);

    hmr.swap({ default: Greet }, { default: Greet2 });
    expect(element.textContent).toBe("new chat");

    off();
  });
});
