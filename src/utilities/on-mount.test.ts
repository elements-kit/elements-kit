import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, signal } from "@/signals/index.ts";
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

  it("disposes the returned cleanup function on disconnect", async () => {
    const elRef = signal<HTMLDivElement | null>(null);
    const teardown = vi.fn();

    effectScope(() => {
      onMount(elRef, () => teardown);
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

describe("nested shadow DOM", () => {
  // Document → outerHost → outerShadow → innerHost → innerShadow → leaf
  function buildNested() {
    const outerHost = document.createElement("section");
    const outerShadow = outerHost.attachShadow({ mode: "open" });
    const innerHost = document.createElement("article");
    outerShadow.appendChild(innerHost);
    const innerShadow = innerHost.attachShadow({ mode: "open" });
    const leaf = document.createElement("span");
    innerShadow.appendChild(leaf);
    return { outerHost, outerShadow, innerHost, innerShadow, leaf };
  }

  it("fires for an element nested two shadow roots deep", async () => {
    const { outerHost, leaf } = buildNested();
    const seen = vi.fn();

    effectScope(() => {
      onMount(leaf, (el) => seen(el));
    });

    document.body.appendChild(outerHost);
    await flushMO();

    expect(seen).toHaveBeenCalledTimes(1);
    expect(seen).toHaveBeenCalledWith(leaf);
  });

  it("disconnect via outer host removal fires runDisconnect on the deeply-nested leaf", async () => {
    const { outerHost, leaf } = buildNested();
    document.body.appendChild(outerHost);

    const teardown = vi.fn();
    effectScope(() => {
      onMount(leaf, () => teardown);
    });
    await flushMO();
    expect(teardown).not.toHaveBeenCalled();

    // Remove the OUTER host. leaf is two shadow boundaries below — its
    // own shadow MO doesn't fire. The composed-tree walk in walkSubtree
    // descends through node.shadowRoot to catch this.
    outerHost.remove();
    await flushMO();
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it("re-fires on reconnect after outer-host removal/reattach", async () => {
    const { outerHost, leaf } = buildNested();
    document.body.appendChild(outerHost);

    const seen = vi.fn();
    effectScope(() => {
      onMount(leaf, () => seen());
    });
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);

    outerHost.remove();
    await flushMO();
    document.body.appendChild(outerHost);
    await flushMO();

    expect(seen).toHaveBeenCalledTimes(2);
  });

  it("getContext walks across nested shadow boundaries", async () => {
    const { outerHost, leaf } = buildNested();
    document.body.appendChild(outerHost);

    // Provider on the outer host (light DOM).
    const { setContext, getContext } = await import("./context.ts");
    effectScope(() => {
      setContext(outerHost, "k", "from-outer");
    });

    // Consumer two shadow boundaries below.
    expect(getContext<string>(leaf, "k")).toBe("from-outer");
  });

  it("function component pattern: shadow created in JSX, host removed mid-lifetime", async () => {
    // Mimics what `render` would do: a function component creates its own
    // shadow root, registers onMount inside, returns the host. Later code
    // removes the host from the document.
    const teardown = vi.fn();

    const stop = effectScope(() => {
      const host = document.createElement("div");
      const shadow = host.attachShadow({ mode: "open" });
      const inner = document.createElement("p");
      shadow.appendChild(inner);
      onMount(inner, () => teardown);
      document.body.appendChild(host);
    });

    await flushMO();
    expect(teardown).not.toHaveBeenCalled();

    // Outside code yanks the host. With the composed-tree walk, doc's MO
    // walks into host.shadowRoot and disconnects the inner entry.
    document.body.firstElementChild!.remove();
    await flushMO();

    expect(teardown).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe("closed shadow DOM (opt-in via observeRoot)", () => {
  it("fires nested onMount when the closed root is registered via observeRoot", async () => {
    const host = document.createElement("div");
    const closed = host.attachShadow({ mode: "closed" });
    const inner = document.createElement("span");
    closed.appendChild(inner);

    // Owner explicitly opts the closed shadow in.
    observeRoot(closed);

    const seen = vi.fn();
    effectScope(() => {
      onMount(inner, () => seen());
    });

    document.body.appendChild(host);
    await flushMO();

    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("disconnect via host removal fires runDisconnect for closed-shadow content", async () => {
    const host = document.createElement("div");
    const closed = host.attachShadow({ mode: "closed" });
    const inner = document.createElement("span");
    closed.appendChild(inner);

    observeRoot(closed);

    const teardown = vi.fn();
    effectScope(() => {
      onMount(inner, () => teardown);
    });

    document.body.appendChild(host);
    await flushMO();

    host.remove();
    await flushMO();

    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it("without observeRoot, host (dis)connect events are missed for closed-shadow content", async () => {
    // Document the platform-contract gap: a closed shadow root can host
    // an MO on itself (we can register on its descendants), but mutations
    // that happen *outside* it — like the host being attached to the doc
    // — are silent because doc's composed-tree walk cannot descend into
    // closed shadows without `observeRoot`.
    const host = document.createElement("div");
    const closed = host.attachShadow({ mode: "closed" });
    const inner = document.createElement("span");
    closed.appendChild(inner);

    const seen = vi.fn();
    effectScope(() => {
      onMount(inner, () => seen());
    });

    document.body.appendChild(host);
    await flushMO();

    // No fire — the MO on the closed shadow only sees changes within its
    // own tree; the host's parent change is invisible to it.
    expect(seen).toHaveBeenCalledTimes(0);
  });
});

describe("slotted children (light DOM)", () => {
  it("slotted child stays in light DOM — host removal disconnects it via doc MO", async () => {
    // Custom-element-style host with a shadow that projects via <slot>.
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.appendChild(document.createElement("slot"));

    const slotted = document.createElement("p");
    host.appendChild(slotted);
    document.body.appendChild(host);

    const teardown = vi.fn();
    effectScope(() => {
      onMount(slotted, () => teardown);
    });
    await flushMO();
    expect(teardown).not.toHaveBeenCalled();

    // Slotted content lives in the host's light DOM (its `getRootNode()` is
    // document, not the shadow). Doc's MO sees the host removal, walks its
    // light children, finds slotted → runDisconnect.
    host.remove();
    await flushMO();
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it("slotted child fires onMount when the host is appended", async () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.appendChild(document.createElement("slot"));

    const slotted = document.createElement("p");
    host.appendChild(slotted);

    const seen = vi.fn();
    effectScope(() => {
      onMount(slotted, () => seen());
    });

    document.body.appendChild(host);
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("re-slotted to a different host re-runs the connection cycle", async () => {
    const hostA = document.createElement("div");
    hostA.attachShadow({ mode: "open" }).appendChild(
      document.createElement("slot"),
    );
    const hostB = document.createElement("div");
    hostB.attachShadow({ mode: "open" }).appendChild(
      document.createElement("slot"),
    );
    document.body.append(hostA, hostB);

    const slotted = document.createElement("p");
    hostA.appendChild(slotted);

    const seen = vi.fn();
    effectScope(() => {
      onMount(slotted, () => seen());
    });
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);

    // Move slotted from hostA → hostB. It stays connected; this is a same-
    // root migration in light DOM. No re-fire (no transition).
    hostB.appendChild(slotted);
    await flushMO();
    expect(seen).toHaveBeenCalledTimes(1);

    // Now disconnect via hostB removal — should fire runDisconnect.
    const teardown = vi.fn();
    effectScope(() => {
      onMount(hostB.firstElementChild!, () => teardown);
    });
    await flushMO();
    hostB.remove();
    await flushMO();
    expect(teardown).toHaveBeenCalledTimes(1);
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
