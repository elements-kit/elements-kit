import { afterEach, describe, expect, it, vi } from "vitest";
import { effect, effectScope, onCleanup, signal } from "@/signals/index.ts";
import { observeRoot, onMount } from "./on-mount.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

// MutationObserver records flush asynchronously; happy-dom resolves them on
// queueMicrotask. await a microtask + a small timeout to drain its queue.
async function flushMO() {
  await new Promise((r) => setTimeout(r, 0));
  await Promise.resolve();
}

describe("onMount", () => {
  it("fires fn after the element is appended to the DOM", async () => {
    const elRef = signal<HTMLDivElement | null>(null);
    const seen = vi.fn();

    effectScope(() => {
      onMount(elRef, (el) => {
        seen(el);
      });
    });

    const el = document.createElement("div");
    elRef(el);
    document.body.appendChild(el);

    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen).toHaveBeenCalledWith(el);
  });

  it("fires synchronously-deferred when the element is already connected", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const seen = vi.fn();

    effectScope(() => {
      onMount(el, () => seen());
    });

    expect(seen).not.toHaveBeenCalled();
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("re-fires on every (re)connection by default", async () => {
    const elRef = signal<HTMLDivElement | null>(null);
    const seen = vi.fn();

    effectScope(() => {
      onMount(elRef, () => seen());
    });

    const el = document.createElement("div");
    elRef(el);
    document.body.appendChild(el);
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);

    el.remove();
    await flushMO();
    document.body.appendChild(el);
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it("with { once: true }, fires at most once per element", async () => {
    const elRef = signal<HTMLDivElement | null>(null);
    const seen = vi.fn();

    effectScope(() => {
      onMount(elRef, () => seen(), { once: true });
    });

    const el = document.createElement("div");
    elRef(el);
    document.body.appendChild(el);
    await flushMO();
    el.remove();
    await flushMO();
    document.body.appendChild(el);
    await flushMO();

    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("exposes fn's return value via the returned Computed", async () => {
    const elRef = signal<HTMLDivElement | null>(null);
    let observed: number | undefined;

    const stop = effectScope(() => {
      const value = onMount(elRef, () => 42);
      effect(() => {
        observed = value();
      });
    });

    const el = document.createElement("div");
    elRef(el);
    document.body.appendChild(el);
    await flushMO();

    expect(observed).toBe(42);
    stop();
  });

  it("runs fn inside its own scope so onCleanup fires on disconnect", async () => {
    const elRef = signal<HTMLDivElement | null>(null);
    const teardown = vi.fn();

    effectScope(() => {
      onMount(elRef, () => {
        onCleanup(teardown);
      });
    });

    const el = document.createElement("div");
    elRef(el);
    document.body.appendChild(el);
    await flushMO();
    expect(teardown).not.toHaveBeenCalled();

    el.remove();
    await flushMO();
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it("cleans up the MutationObserver registration when the surrounding scope disposes", async () => {
    const elRef = signal<HTMLDivElement | null>(null);
    const seen = vi.fn();

    const stop = effectScope(() => {
      onMount(elRef, () => seen());
    });

    const el = document.createElement("div");
    elRef(el);
    document.body.appendChild(el);
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);

    stop();

    el.remove();
    await flushMO();
    document.body.appendChild(el);
    await flushMO();
    // No further fires after dispose.
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("re-attaches when the target signal swaps elements", async () => {
    const elRef = signal<HTMLDivElement | null>(null);
    const seen = vi.fn();

    effectScope(() => {
      onMount(elRef, (el) => seen(el.id));
    });

    const a = document.createElement("div");
    a.id = "a";
    const b = document.createElement("div");
    b.id = "b";
    document.body.append(a, b);

    elRef(a);
    await flushMO();
    elRef(b);
    await flushMO();

    expect(seen).toHaveBeenNthCalledWith(1, "a");
    expect(seen).toHaveBeenNthCalledWith(2, "b");
  });

  it("fires across an open shadow root", async () => {
    const host = document.createElement("section");
    const shadow = host.attachShadow({ mode: "open" });
    const inner = document.createElement("span");
    shadow.appendChild(inner);
    document.body.appendChild(host);

    const seen = vi.fn();
    effectScope(() => {
      onMount(inner, () => seen());
    });

    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("with a static element, fires on next microtask if already connected", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const seen = vi.fn();

    effectScope(() => {
      onMount(el, () => seen());
    });

    expect(seen).not.toHaveBeenCalled();
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("tracks an element moved from light DOM into a shadow root", async () => {
    const host = document.createElement("section");
    const shadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    const el = document.createElement("span");
    document.body.appendChild(el);

    const seen = vi.fn();
    effectScope(() => {
      onMount(el, () => seen());
    });
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);

    // Move from light DOM into the shadow root. Element stays connected, so
    // no re-fire — but the entry must migrate to the shadow root's observer
    // so future disconnect events are seen.
    shadow.appendChild(el);
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);

    el.remove();
    await flushMO();
    document.body.appendChild(el);
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it("re-fires after orphan reconnect to a different (observed) root", async () => {
    const host = document.createElement("section");
    const shadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    // Ensure the shadow root has a MutationObserver: an onMount entry must
    // ever have lived on it. (This is the realistic case — shadow roots
    // hosting onMount-using components have observers; truly-untouched
    // shadow roots are out of scope for the orphan sweep.)
    const seed = document.createElement("span");
    shadow.appendChild(seed);
    effectScope(() => {
      onMount(seed, () => {});
    });
    await flushMO();

    const el = document.createElement("span");
    document.body.appendChild(el);

    const seen = vi.fn();
    effectScope(() => {
      onMount(el, () => seen());
    });
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);

    el.remove();
    await flushMO();
    shadow.appendChild(el);
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it("with { once: true }, orphan reconnect to a different root does not re-fire", async () => {
    const host = document.createElement("section");
    const shadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    const seed = document.createElement("span");
    shadow.appendChild(seed);
    effectScope(() => {
      onMount(seed, () => {});
    });
    await flushMO();

    const el = document.createElement("span");
    document.body.appendChild(el);

    const seen = vi.fn();
    effectScope(() => {
      onMount(el, () => seen(), { once: true });
    });
    await flushMO();
    el.remove();
    await flushMO();
    shadow.appendChild(el);
    await flushMO();

    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("scope dispose while orphaned does not surface a stale entry", async () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    const seen = vi.fn();
    const stop = effectScope(() => {
      onMount(el, () => seen());
    });
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);

    // Disconnect → entry parks in orphans. Then dispose the scope.
    el.remove();
    await flushMO();
    stop();

    // Reconnect after dispose. No fires expected.
    document.body.appendChild(el);
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("does not fire if the element is never connected", async () => {
    const elRef = signal<HTMLDivElement | null>(null);
    const seen = vi.fn();

    effectScope(() => {
      onMount(elRef, () => seen());
    });

    const el = document.createElement("div");
    elRef(el);
    await flushMO();

    expect(seen).not.toHaveBeenCalled();
  });
});

describe("observeRoot", () => {
  it("makes a previously-unobserved shadow root catch async orphan reattach", async () => {
    const host = document.createElement("section");
    const shadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    // Pre-register the shadow root before any onMount lives inside it.
    observeRoot(shadow);

    const el = document.createElement("span");
    document.body.appendChild(el);

    const seen = vi.fn();
    effectScope(() => {
      onMount(el, () => seen());
    });
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);

    // Disconnect from doc, then async-reattach into the (pre-observed)
    // shadow root. With observeRoot, this is now caught.
    el.remove();
    await flushMO();
    shadow.appendChild(el);
    await flushMO();

    expect(seen).toHaveBeenCalledTimes(2);
  });

  it("is idempotent — calling it twice on the same root has no effect", async () => {
    const host = document.createElement("section");
    const shadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    observeRoot(shadow);
    observeRoot(shadow);
    observeRoot(shadow);

    const inner = document.createElement("span");
    shadow.appendChild(inner);

    const seen = vi.fn();
    effectScope(() => {
      onMount(inner, () => seen());
    });
    await flushMO();

    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("subsequent onMount inside an observeRoot'd shadow root fires normally", async () => {
    const host = document.createElement("section");
    const shadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    observeRoot(shadow);

    const inner = document.createElement("span");
    const seen = vi.fn();
    effectScope(() => {
      onMount(inner, () => seen());
    });
    expect(seen).not.toHaveBeenCalled();

    shadow.appendChild(inner);
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
