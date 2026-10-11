import { describe, it, expect, vi } from "vitest";
import { signal, onCleanup } from "@/signals";
import { render } from "@/render";
// Importing the registry installs it, which is what makes the wrapper active —
// without an accept boundary anywhere, `createHotElement` stays a passthrough.
import "@/integrations/hmr-runtime";
import { HMR_SLOT } from "@/integrations/hmr-slot";
import { setRenderer } from "./renderer";
import { createHotElement, updateCells } from "./hot";

/**
 * Mount through `createHotElement` the way the dev JSX transform does — these
 * tests call it explicitly because the test build compiles JSX against the
 * production runtime.
 */
function mount(node: () => Node | null) {
  const host = document.createElement("div");
  document.body.append(host);
  const unmount = render(host, node);
  return { host, unmount };
}

describe("createHotElement", () => {
  it("passes intrinsic elements straight through", () => {
    const node = createHotElement("p", { children: "hi" });
    expect(node).toBeInstanceOf(HTMLParagraphElement);
  });

  it("swaps a component's subtree when its cell is re-pointed", () => {
    const Old = () => <p>old</p>;
    const New = () => <p>new</p>;
    const { host, unmount } = mount(() => createHotElement(Old));

    expect(host.textContent).toBe("old");
    expect(updateCells({ default: Old }, { default: New })).toBe(true);
    expect(host.textContent).toBe("new");

    unmount();
  });

  it("leaves the parent's state untouched when a child swaps", () => {
    const Child = () => <span>v1</span>;
    const Child2 = () => <span>v2</span>;

    const count = signal(0);
    const Parent = () => (
      <div>
        <em>{() => count()}</em>
        {createHotElement(Child)}
      </div>
    );

    const { host, unmount } = mount(() => createHotElement(Parent));
    count(7);
    expect(host.textContent).toContain("7");

    updateCells({ Child }, { Child: Child2 });

    // The whole point of Phase 2: the child's markup is new, the parent's
    // signal kept its value instead of being rebuilt from scratch.
    expect(host.textContent).toContain("v2");
    expect(host.textContent).toContain("7");

    unmount();
  });

  it("disposes the replaced subtree", () => {
    const cleanup = vi.fn();
    const Old = () => {
      onCleanup(cleanup);
      return <p>old</p>;
    };
    const New = () => <p>new</p>;

    const { unmount } = mount(() => createHotElement(Old));
    expect(cleanup).not.toHaveBeenCalled();

    updateCells({ default: Old }, { default: New });
    expect(cleanup).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("swaps class components", () => {
    class Old {
      render() {
        return <p>old</p>;
      }
    }
    class New {
      render() {
        return <p>new</p>;
      }
    }

    const { host, unmount } = mount(() => createHotElement(Old));
    expect(host.textContent).toBe("old");

    expect(updateCells({ default: Old }, { default: New })).toBe(true);
    expect(host.textContent).toBe("new");

    unmount();
  });

  it("swaps every instance sharing a cell", () => {
    const Old = () => <p>old</p>;
    const New = () => <p>new</p>;

    const { host, unmount } = mount(() => {
      const frag = document.createDocumentFragment();
      frag.append(createHotElement(Old)!, createHotElement(Old)!);
      return frag;
    });
    expect(host.textContent).toBe("oldold");

    updateCells({ default: Old }, { default: New });
    expect(host.textContent).toBe("newnew");

    unmount();
  });

  it("swaps a grandchild without disturbing its ancestors", () => {
    const Leaf = () => <i>leaf1</i>;
    const Leaf2 = () => <i>leaf2</i>;
    const Mid = () => <span>{createHotElement(Leaf)}</span>;
    const Top = () => <div>{createHotElement(Mid)}</div>;

    const { host, unmount } = mount(() => createHotElement(Top));
    const top = host.firstElementChild;
    expect(host.textContent).toBe("leaf1");

    updateCells({ Leaf }, { Leaf: Leaf2 });
    expect(host.textContent).toBe("leaf2");
    expect(host.firstElementChild).toBe(top);

    unmount();
  });

  it("swaps a component that rendered nothing", () => {
    const Old = () => null;
    const New = () => <p>new</p>;

    const { host, unmount } = mount(() => createHotElement(Old));
    expect(host.textContent).toBe("");

    updateCells({ default: Old }, { default: New });
    expect(host.textContent).toBe("new");

    unmount();
  });

  it("re-runs ref against the replacement element", () => {
    const seen: string[] = [];
    const Old = () => <p>old</p>;
    const New = () => <p>new</p>;

    const { unmount } = mount(() =>
      createHotElement(Old, {
        ref: (el: Element) => seen.push(el.textContent!),
      }),
    );
    expect(seen).toEqual(["old"]);

    updateCells({ default: Old }, { default: New });
    expect(seen).toEqual(["old", "new"]);

    unmount();
  });

  it("disposes a component whose root is not an Element", () => {
    // `Slot.clear` only disposes Element children, so a text-returning
    // component's scope survives it — the per-run cleanup is what tears it
    // down. Pin that, or the leak returns silently.
    const cleanup = vi.fn();
    const Old = () => {
      onCleanup(cleanup);
      return document.createTextNode("old") as unknown as Element;
    };
    const New = () => <p>new</p>;

    const { host, unmount } = mount(() => createHotElement(Old));
    updateCells({ default: Old }, { default: New });

    expect(host.textContent).toBe("new");
    expect(cleanup).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("clears its region on unmount", () => {
    const Comp = () => <p>x</p>;
    const { host, unmount } = mount(() => createHotElement(Comp));
    expect(host.textContent).toBe("x");

    unmount();
    expect(host.textContent).toBe("");
  });

  it("swaps components that return a fragment", () => {
    const Old = () => (
      <>
        <p>a</p>
        <p>b</p>
      </>
    );
    const New = () => (
      <>
        <p>c</p>
      </>
    );

    const { host, unmount } = mount(() => createHotElement(Old));
    expect(host.textContent).toBe("ab");

    updateCells({ default: Old }, { default: New });
    expect(host.textContent).toBe("c");

    unmount();
  });

  it("keeps swapping after a second edit", () => {
    const V1 = () => <p>1</p>;
    const V2 = () => <p>2</p>;
    const V3 = () => <p>3</p>;

    const { host, unmount } = mount(() => createHotElement(V1));

    updateCells({ default: V1 }, { default: V2 });
    expect(host.textContent).toBe("2");

    // The second update arrives holding V2 as its previous export — it finds
    // the same cell only because the first update re-keyed the map.
    updateCells({ default: V2 }, { default: V3 });
    expect(host.textContent).toBe("3");

    unmount();
  });

  it("hands the recorded props to the replacement", () => {
    const Greet = ({ name }: { name: string }) => <p>old {name}</p>;
    const Greet2 = ({ name }: { name: string }) => <p>new {name}</p>;

    const { host, unmount } = mount(() =>
      createHotElement(Greet, { name: "chat" }),
    );
    expect(host.textContent).toBe("old chat");

    updateCells({ default: Greet }, { default: Greet2 });
    expect(host.textContent).toBe("new chat");

    unmount();
  });

  it("delegates untouched when no HMR registry is installed", () => {
    // No plugin means no accept boundary, so a swap can never be triggered —
    // the wrapper has to get out of the way rather than wrap every component
    // in a slot for nothing. This is what an in-browser sandbox sees.
    const slot = globalThis as Record<symbol, unknown>;
    const registry = slot[HMR_SLOT];
    slot[HMR_SLOT] = undefined;
    try {
      const Comp = () => <p>plain</p>;
      const node = createHotElement(Comp);
      expect(node).toBeInstanceOf(HTMLParagraphElement);
      expect((node as Element).textContent).toBe("plain");
    } finally {
      slot[HMR_SLOT] = registry;
    }
  });

  it("delegates untouched while a renderer is installed", () => {
    const Comp = () => <p>ssr</p>;
    const jsx = vi.fn(() => ({ tag: "sentinel" }));
    setRenderer({ jsx });
    try {
      expect(createHotElement(Comp)).toEqual({ tag: "sentinel" });
      expect(jsx).toHaveBeenCalledWith(Comp, {});
    } finally {
      setRenderer(null);
    }
  });
});

describe("updateCells", () => {
  it("reports false when the module rendered nothing on the page", () => {
    const Never = () => <p>never</p>;
    expect(updateCells({ default: Never }, { default: Never })).toBe(false);
  });

  it("reports true without re-rendering when the export is unchanged", () => {
    const Same = () => <p>same</p>;
    const { host, unmount } = mount(() => createHotElement(Same));
    const before = host.firstElementChild;

    expect(updateCells({ default: Same }, { default: Same })).toBe(true);
    expect(host.firstElementChild).toBe(before);

    unmount();
  });

  it("ignores non-function exports", () => {
    const Comp = () => <p>x</p>;
    const { unmount } = mount(() => createHotElement(Comp));

    expect(updateCells({ meta: "a" }, { meta: "b" })).toBe(false);

    unmount();
  });
});
