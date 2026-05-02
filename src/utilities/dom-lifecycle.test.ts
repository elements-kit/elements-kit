import { afterEach, describe, expect, it, vi } from "vitest";
import { DomLifecycleElement } from "./dom-lifecycle.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

function makeProbe(): DomLifecycleElement {
  return document.createElement("dom-lifecycle") as DomLifecycleElement;
}

describe("dom-lifecycle", () => {
  it("registers as a custom element", () => {
    expect(customElements.get("dom-lifecycle")).toBe(DomLifecycleElement);
    expect(makeProbe()).toBeInstanceOf(DomLifecycleElement);
  });

  it("fires onConnect with self; self.parentElement is the surrounding element", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const probe = makeProbe();
    const onConnect = vi.fn();
    probe.onConnect = onConnect;

    parent.appendChild(probe);

    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onConnect).toHaveBeenCalledWith(probe);
    expect(probe.parentElement).toBe(parent);
  });

  it("does not fire onConnect when appended into a detached subtree", () => {
    const parent = document.createElement("div");
    const probe = makeProbe();
    const onConnect = vi.fn();
    probe.onConnect = onConnect;

    parent.appendChild(probe);
    expect(onConnect).not.toHaveBeenCalled();

    document.body.appendChild(parent);
    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onConnect).toHaveBeenCalledWith(probe);
  });

  it("fires onDisconnect with self; self.parentElement is null per spec", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const probe = makeProbe();
    const onDisconnect = vi.fn((self: DomLifecycleElement) => {
      // Spec: parentElement is null inside disconnectedCallback. Caller who
      // needs the connect-time parent stashes it themselves in onConnect.
      expect(self.parentElement).toBeNull();
    });
    probe.onDisconnect = onDisconnect;
    parent.appendChild(probe);

    probe.remove();

    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith(probe);
  });

  it("re-fires onConnect on reconnect", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const probe = makeProbe();
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    probe.onConnect = onConnect;
    probe.onDisconnect = onDisconnect;

    parent.appendChild(probe);
    probe.remove();
    parent.appendChild(probe);

    expect(onConnect).toHaveBeenCalledTimes(2);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it("self.parentElement reflects the new parent on cross-parent move", () => {
    const a = document.createElement("section");
    const b = document.createElement("section");
    document.body.appendChild(a);
    document.body.appendChild(b);

    const probe = makeProbe();
    const seen: Array<["c" | "d", Element | null]> = [];
    probe.onConnect = (el) => seen.push(["c", el.parentElement]);
    probe.onDisconnect = (el) => seen.push(["d", el.parentElement]);

    a.appendChild(probe);
    b.appendChild(probe);

    expect(seen).toEqual([
      ["c", a],
      ["d", null], // spec: null inside disconnectedCallback
      ["c", b],
    ]);
  });

  it("works inside an open shadow root", () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    const inner = document.createElement("div");
    shadow.appendChild(inner);

    const probe = makeProbe();
    const onConnect = vi.fn((el: DomLifecycleElement) => {
      expect(el.parentElement).toBe(inner);
    });
    probe.onConnect = onConnect;
    inner.appendChild(probe);

    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onConnect).toHaveBeenCalledWith(probe);
  });

  it("works inside a closed shadow root (no opt-in needed)", () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "closed" });
    document.body.appendChild(host);

    const inner = document.createElement("div");
    shadow.appendChild(inner);

    const probe = makeProbe();
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    probe.onConnect = onConnect;
    probe.onDisconnect = onDisconnect;
    inner.appendChild(probe);

    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onConnect).toHaveBeenCalledWith(probe);

    inner.remove();
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith(probe);
  });

  it("self is non-null when the lifecycle element is the direct child of a ShadowRoot", () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    const probe = makeProbe();
    let observedSelf: DomLifecycleElement | null = null;
    let observedParent: Element | null = null;
    let observedHost: Element | null = null;
    probe.onConnect = (el) => {
      observedSelf = el;
      observedParent = el.parentElement;
      const root = el.getRootNode();
      observedHost = root instanceof ShadowRoot ? root.host : null;
    };

    shadow.appendChild(probe);

    expect(observedSelf).toBe(probe);
    // Direct parent is the ShadowRoot, which is not an Element — parentElement is null.
    expect(observedParent).toBeNull();
    // The shadow host is reachable through getRootNode().
    expect(observedHost).toBe(host);
  });

  it("wrap-children: self.firstElementChild is the wrapped subtree", () => {
    const parent = document.createElement("section");
    document.body.appendChild(parent);

    const probe = makeProbe();
    const wrapped = document.createElement("h1");
    probe.appendChild(wrapped);

    let observedFirstChild: Element | null = null;
    probe.onConnect = (el) => {
      observedFirstChild = el.firstElementChild;
    };

    parent.appendChild(probe);

    expect(observedFirstChild).toBe(wrapped);
  });

  it("fires when a host with an inner dom-lifecycle is connected later", () => {
    const parent = document.createElement("div");
    const probe = makeProbe();
    const onConnect = vi.fn();
    probe.onConnect = onConnect;
    parent.appendChild(probe);

    expect(onConnect).not.toHaveBeenCalled();

    document.body.appendChild(parent);

    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onConnect).toHaveBeenCalledWith(probe);
  });

  it("upgrades when produced via innerHTML and connected", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    parent.innerHTML = "<dom-lifecycle></dom-lifecycle>";
    const probe = parent.firstElementChild as DomLifecycleElement;

    expect(probe).toBeInstanceOf(DomLifecycleElement);

    // Wire callback after upgrade and trigger a reconnect to see it fire.
    const onConnect = vi.fn();
    probe.onConnect = onConnect;
    probe.remove();
    parent.appendChild(probe);

    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onConnect).toHaveBeenCalledWith(probe);
  });

  it("survives cloneNode(true) — clone fires its own connect", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const original = makeProbe();
    parent.appendChild(original);

    const clone = original.cloneNode(true) as DomLifecycleElement;
    const onConnect = vi.fn();
    clone.onConnect = onConnect;

    parent.appendChild(clone);

    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onConnect).toHaveBeenCalledWith(clone);
  });

  it("honors null onConnect / onDisconnect (no throw)", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const probe = makeProbe();
    probe.onConnect = null;
    probe.onDisconnect = null;

    expect(() => {
      parent.appendChild(probe);
      probe.remove();
    }).not.toThrow();
  });

  it("applies render-inert defaults: display:contents and role='none'", () => {
    const probe = makeProbe();
    document.body.appendChild(probe);
    expect(probe.style.display).toBe("contents");
    expect(probe.getAttribute("role")).toBe("none");
  });

  it("exposes onMove and onAdopted setters", () => {
    const probe = makeProbe();
    const move = vi.fn();
    const adopt = vi.fn();
    probe.onMove = move;
    probe.onAdopted = adopt;
    expect(probe.onMove).toBe(move);
    expect(probe.onAdopted).toBe(adopt);
    probe.onMove = null;
    probe.onAdopted = null;
    expect(probe.onMove).toBeNull();
    expect(probe.onAdopted).toBeNull();
  });

  it("disconnects when an ancestor is removed", () => {
    const grand = document.createElement("section");
    const parent = document.createElement("div");
    document.body.appendChild(grand);
    grand.appendChild(parent);

    const probe = makeProbe();
    const onDisconnect = vi.fn();
    probe.onDisconnect = onDisconnect;
    parent.appendChild(probe);

    grand.remove();

    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledWith(probe);
  });
});
