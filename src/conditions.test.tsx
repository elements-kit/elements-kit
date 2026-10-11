/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
// Conditional rendering through SSR + hydration: static branches must claim
// cleanly, signal-driven branches must flip live after hydration (the
// classic hydration killer), and server/client branch disagreement must heal
// through the mismatch fallback to the client's truth.
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "./server";
import { hydrate } from "./hydrate";
import { signal } from "./signals";

async function serve(app: () => unknown): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.innerHTML = await renderToString(app);
  return container;
}

describe("conditions — static branches", () => {
  it("false && element renders nothing and claims cleanly", async () => {
    const cond = false;
    const app = () => (
      <div>
        {cond && (<span>never</span> as never)}
        <b>after</b>
      </div>
    );
    const container = await serve(app);
    const onMismatch = vi.fn();
    hydrate(container, app, { onMismatch });
    expect(onMismatch).not.toHaveBeenCalled();
    expect(container.querySelector("span")).toBeNull();
    expect(container.querySelector("b")!.textContent).toBe("after");
  });

  it("ternary picks the same branch on both sides", async () => {
    const admin = true;
    const app = () => (
      <div>{admin ? <b>admin</b> : <i>guest</i>}</div>
    );
    const container = await serve(app);
    const onMismatch = vi.fn();
    hydrate(container, app, { onMismatch });
    expect(onMismatch).not.toHaveBeenCalled();
    expect(container.querySelector("b")!.textContent).toBe("admin");
    expect(container.querySelector("i")).toBeNull();
  });
});

describe("conditions — signal-driven branches flip after hydration", () => {
  it("element ↔ null", async () => {
    const show = signal(true);
    const app = () => (
      <div>{() => (show() ? ((<span>on</span>) as never) : null)}</div>
    );
    const container = await serve(app);
    const onMismatch = vi.fn();
    hydrate(container, app, { onMismatch });
    expect(onMismatch).not.toHaveBeenCalled();
    expect(container.querySelector("span")!.textContent).toBe("on");

    show(false);
    expect(container.querySelector("span")).toBeNull();
    show(true);
    expect(container.querySelector("span")!.textContent).toBe("on");
  });

  it("element A ↔ element B", async () => {
    const admin = signal(false);
    const app = () => (
      <div>
        {() => (admin() ? ((<b>admin</b>) as never) : ((<i>guest</i>) as never))}
      </div>
    );
    const container = await serve(app);
    hydrate(container, app);
    expect(container.querySelector("i")!.textContent).toBe("guest");

    admin(true);
    expect(container.querySelector("i")).toBeNull();
    expect(container.querySelector("b")!.textContent).toBe("admin");
  });

  it("text ↔ element", async () => {
    const rich = signal(false);
    const app = () => (
      <div>{() => (rich() ? ((<em>rich</em>) as never) : "plain")}</div>
    );
    const container = await serve(app);
    hydrate(container, app);
    expect(container.querySelector("div")!.textContent).toBe("plain");

    rich(true);
    expect(container.querySelector("em")!.textContent).toBe("rich");
  });

  it("branch handlers stay live after a flip", async () => {
    const mode = signal<"a" | "b">("a");
    const clicks = vi.fn();
    const app = () => (
      <div>
        {() =>
          mode() === "a"
            ? ((<button on:click={clicks}>A</button>) as never)
            : ((<button on:click={clicks}>B</button>) as never)
        }
      </div>
    );
    const container = await serve(app);
    hydrate(container, app);

    mode("b");
    container.querySelector("button")!.click();
    expect(clicks).toHaveBeenCalledTimes(1);
  });
});

describe("conditions — server/client disagreement", () => {
  it("heals to the client branch via mismatch fallback", async () => {
    // Server rendered logged-out; client evaluates logged-in (the documented
    // determinism constraint — must degrade safely, never blend branches).
    const container = await serve(() => (
      <div>
        <i>guest</i>
      </div>
    ));
    const onMismatch = vi.fn();
    hydrate(
      container,
      () => (
        <div>
          <b>admin</b>
        </div>
      ),
      { onMismatch },
    );
    expect(onMismatch).toHaveBeenCalled();
    expect(container.querySelector("i")).toBeNull();
    expect(container.querySelector("b")!.textContent).toBe("admin");
  });
});
