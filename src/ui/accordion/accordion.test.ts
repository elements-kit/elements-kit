import { describe, it, expect } from "vitest";

describe("x-accordion", () => {
  it("applies the class to a <details> with a <summary>", () => {
    const el = document.createElement("details");
    el.className = "x-accordion";
    const summary = document.createElement("summary");
    summary.textContent = "Trigger";
    el.appendChild(summary);

    expect(el.tagName).toBe("DETAILS");
    expect(el.classList.contains("x-accordion")).toBe(true);
    expect(el.querySelector("summary")).toBe(summary);
  });

  it("toggles the native open property", () => {
    const el = document.createElement("details");
    el.className = "x-accordion";
    el.appendChild(document.createElement("summary"));
    document.body.appendChild(el);

    expect(el.open).toBe(false);
    el.open = true;
    expect(el.hasAttribute("open")).toBe(true);
    el.open = false;
    expect(el.hasAttribute("open")).toBe(false);

    el.remove();
  });

  it("groups items via the name attribute", () => {
    const wrapper = document.createElement("div");
    const a = document.createElement("details");
    const b = document.createElement("details");
    a.className = "x-accordion";
    b.className = "x-accordion";
    a.setAttribute("name", "faq");
    b.setAttribute("name", "faq");
    a.appendChild(document.createElement("summary"));
    b.appendChild(document.createElement("summary"));
    wrapper.append(a, b);

    expect(a.getAttribute("name")).toBe("faq");
    expect(b.getAttribute("name")).toBe("faq");
  });

  it("accepts data-variant, data-size, and aria-disabled", () => {
    const el = document.createElement("details");
    el.className = "x-accordion";
    el.dataset.variant = "soft";
    el.dataset.size = "3";
    el.setAttribute("aria-disabled", "true");
    el.appendChild(document.createElement("summary"));

    expect(el.getAttribute("data-variant")).toBe("soft");
    expect(el.getAttribute("data-size")).toBe("3");
    expect(el.getAttribute("aria-disabled")).toBe("true");
  });

  it("fires a toggle event when open flips", () => {
    const el = document.createElement("details");
    el.className = "x-accordion";
    el.appendChild(document.createElement("summary"));
    document.body.appendChild(el);

    let fired = 0;
    el.addEventListener("toggle", () => fired++);
    el.open = true;
    el.open = false;

    expect(fired).toBeGreaterThan(0);
    el.remove();
  });
});
