/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "../server";
import { hydrate } from "./index";
import { async } from "../utilities/async";

async function serve(app: () => unknown): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.innerHTML = await renderToString(app);
  return container;
}

const never = () => new Promise<string>(() => {});
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("hydrate — deferred Async.run()", () => {
  it("skips the fetcher entirely when ek-data seeds the instance", async () => {
    const serverOp = async(() => Promise.resolve("x"));
    const container = await serve(() => {
      const App = () => {
        serverOp.run();
        return <div>{serverOp as unknown as Element}</div>;
      };
      return <App />;
    });

    const fetcher = vi.fn(never);
    const clientOp = async(fetcher);
    const App = () => {
      clientOp.run();
      return <div>{clientOp as unknown as Element}</div>;
    };
    hydrate(container, () => <App />);

    expect(fetcher).not.toHaveBeenCalled();
    expect(clientOp.state).toBe("fulfilled");
    expect(clientOp.value).toBe("x");
    expect(container.querySelector("div")!.textContent).toBe("x");
  });

  it("executes the deferred run when no seed exists", async () => {
    const container = document.createElement("div");
    container.innerHTML = "<div><!--{--><!--}--></div>";

    const fetcher = vi.fn(() => Promise.resolve("y"));
    const op = async(fetcher);
    const App = () => {
      op.run();
      return <div>{op as unknown as Element}</div>;
    };
    hydrate(container, () => <App />);

    expect(fetcher).toHaveBeenCalledTimes(1);
    await tick();
    expect(container.querySelector("div")!.textContent).toBe("y");
  });

  it("flushes deferred runs for instances never rendered as children", async () => {
    const container = document.createElement("div");
    container.innerHTML = "<div>static</div>";

    const fetcher = vi.fn(() => Promise.resolve("side"));
    const op = async(fetcher);
    const App = () => {
      op.run();
      return <div>static</div>;
    };
    hydrate(container, () => <App />);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("run() after hydration completes executes immediately", async () => {
    const container = document.createElement("div");
    container.innerHTML = "<div>static</div>";
    hydrate(container, () => <div>static</div>);

    const fetcher = vi.fn(() => Promise.resolve("later"));
    const op = async(fetcher);
    op.run();

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
