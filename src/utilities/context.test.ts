import { afterEach, describe, expect, it, vi } from "vitest";
import { effect, effectScope, signal } from "@/signals/index.ts";
import { getContext, setContext, useContext } from "./context.ts";

async function flushMO() {
  await new Promise((r) => setTimeout(r, 0));
  await Promise.resolve();
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("context", () => {
  it("returns undefined when no provider exists above the consumer", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    expect(getContext(el, "missing")).toBeUndefined();
  });

  it("resolves a value across one parent boundary", () => {
    const host = document.createElement("section");
    const child = document.createElement("span");
    host.appendChild(child);
    document.body.appendChild(host);

    effectScope(() => {
      setContext(host, "k", 42);
    });

    expect(getContext<number>(child, "k")).toBe(42);
  });

  it("propagates updates when the value is a Signal", () => {
    const host = document.createElement("section");
    const child = document.createElement("span");
    host.appendChild(child);
    document.body.appendChild(host);

    const value = signal(1);
    const seen = vi.fn();

    effectScope(() => {
      setContext(host, "n", value);
    });

    effect(() => {
      const sig = getContext<() => number>(child, "n");
      seen(sig?.());
    });

    expect(seen).toHaveBeenLastCalledWith(1);
    value(2);
    expect(seen).toHaveBeenLastCalledWith(2);
  });

  it("innermost provider wins when nested with the same key", () => {
    const outer = document.createElement("section");
    const inner = document.createElement("section");
    const leaf = document.createElement("span");
    outer.appendChild(inner);
    inner.appendChild(leaf);
    document.body.appendChild(outer);

    effectScope(() => {
      setContext(outer, "k", "outer");
      setContext(inner, "k", "inner");
    });

    expect(getContext<string>(leaf, "k")).toBe("inner");
  });

  it("disposing the provider's scope removes the entry and falls through", () => {
    const outer = document.createElement("section");
    const inner = document.createElement("section");
    const leaf = document.createElement("span");
    outer.appendChild(inner);
    inner.appendChild(leaf);
    document.body.appendChild(outer);

    const stopOuter = effectScope(() => {
      setContext(outer, "k", "outer");
    });
    const stopInner = effectScope(() => {
      setContext(inner, "k", "inner");
    });

    expect(getContext<string>(leaf, "k")).toBe("inner");
    stopInner();
    expect(getContext<string>(leaf, "k")).toBe("outer");
    stopOuter();
    expect(getContext<string>(leaf, "k")).toBeUndefined();
  });

  it("distinct keys do not cross-talk", () => {
    const host = document.createElement("section");
    const child = document.createElement("span");
    host.appendChild(child);
    document.body.appendChild(host);

    const A = Symbol("a");
    const B = Symbol("b");

    effectScope(() => {
      setContext(host, A, "value-a");
      setContext(host, B, "value-b");
    });

    expect(getContext<string>(child, A)).toBe("value-a");
    expect(getContext<string>(child, B)).toBe("value-b");
    expect(getContext<string>(child, "c")).toBeUndefined();
  });

  it("crosses an open shadow root via getRootNode().host", () => {
    const host = document.createElement("section");
    const shadow = host.attachShadow({ mode: "open" });
    const inner = document.createElement("span");
    shadow.appendChild(inner);
    document.body.appendChild(host);

    effectScope(() => {
      setContext(host, "k", "from-host");
    });

    expect(getContext<string>(inner, "k")).toBe("from-host");
  });

  it("moving the consumer picks up the new ancestor on next get", () => {
    const a = document.createElement("section");
    const b = document.createElement("section");
    const leaf = document.createElement("span");
    a.appendChild(leaf);
    document.body.append(a, b);

    effectScope(() => {
      setContext(a, "k", "a");
      setContext(b, "k", "b");
    });

    expect(getContext<string>(leaf, "k")).toBe("a");
    b.appendChild(leaf);
    expect(getContext<string>(leaf, "k")).toBe("b");
  });

  it("returns undefined for an orphan element not in any tree", () => {
    const orphan = document.createElement("div");
    expect(getContext(orphan, "k")).toBeUndefined();
  });

  describe("useContext", () => {
    it("resolves the context value once the consumer connects", async () => {
      const host = document.createElement("section");
      document.body.appendChild(host);

      effectScope(() => {
        setContext(host, "k", "value");
      });

      const elRef = signal<HTMLElement | null>(null);
      let observed: string | undefined;

      const stop = effectScope(() => {
        const v = useContext<string>(elRef, "k");
        effect(() => {
          observed = v();
        });
      });

      expect(observed).toBeUndefined();

      const consumer = document.createElement("span");
      host.appendChild(consumer);
      elRef(consumer);
      await flushMO();

      expect(observed).toBe("value");
      stop();
    });

    it("crosses an open shadow root", async () => {
      const provider = document.createElement("section");
      const shadow = provider.attachShadow({ mode: "open" });
      document.body.appendChild(provider);

      effectScope(() => {
        setContext(provider, "k", "from-host");
      });

      const elRef = signal<HTMLElement | null>(null);
      let observed: string | undefined;

      const stop = effectScope(() => {
        const v = useContext<string>(elRef, "k");
        effect(() => {
          observed = v();
        });
      });

      const consumer = document.createElement("span");
      shadow.appendChild(consumer);
      elRef(consumer);
      await flushMO();

      expect(observed).toBe("from-host");
      stop();
    });

    it("auto-flattens a Signal-valued context", async () => {
      const host = document.createElement("section");
      document.body.appendChild(host);

      const value = signal<"light" | "dark">("light");

      effectScope(() => {
        setContext(host, "theme", value);
      });

      const elRef = signal<HTMLElement | null>(null);
      let observed: "light" | "dark" | undefined;

      const stop = effectScope(() => {
        const theme = useContext<"light" | "dark">(elRef, "theme", {
          once: true,
        });
        effect(() => {
          observed = theme();
        });
      });

      const consumer = document.createElement("span");
      host.appendChild(consumer);
      elRef(consumer);
      await flushMO();
      expect(observed).toBe("light");

      value("dark");
      expect(observed).toBe("dark");
      stop();
    });
  });

  it("two providers with different keys in the same subtree both resolve", () => {
    const host = document.createElement("section");
    const leaf = document.createElement("span");
    host.appendChild(leaf);
    document.body.appendChild(host);

    effectScope(() => {
      setContext(host, "x", 1);
      setContext(host, "y", 2);
    });

    expect(getContext<number>(leaf, "x")).toBe(1);
    expect(getContext<number>(leaf, "y")).toBe(2);
  });
});
