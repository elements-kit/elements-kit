import { describe, it, expect } from "vitest";

describe("x-arrow", () => {
  it("applies the class to a <span> without DOM errors", () => {
    const el = document.createElement("span");
    el.className = "x-arrow";
    el.setAttribute("aria-hidden", "true");
    expect(el.classList.contains("x-arrow")).toBe(true);
    expect(el.tagName).toBe("SPAN");
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("composes with arbitrary attributes and inline style", () => {
    const el = document.createElement("span");
    el.className = "x-arrow extra-class";
    el.setAttribute("data-testid", "cta-arrow");
    el.style.fontSize = "24px";
    el.style.color = "tomato";
    expect(el.classList.contains("x-arrow")).toBe(true);
    expect(el.classList.contains("extra-class")).toBe(true);
    expect(el.getAttribute("data-testid")).toBe("cta-arrow");
    expect(el.style.fontSize).toBe("24px");
    expect(el.style.color).toBe("tomato");
  });

  it("renders inside an anchor without affecting the anchor's content", () => {
    const link = document.createElement("a");
    link.href = "/contact";
    link.append(document.createTextNode("Schedule a demo "));
    const arrow = document.createElement("span");
    arrow.className = "x-arrow";
    arrow.setAttribute("aria-hidden", "true");
    link.appendChild(arrow);

    expect(link.textContent).toBe("Schedule a demo ");
    expect(link.querySelector(".x-arrow")).toBe(arrow);
  });

  it("can sit inside a dir=rtl ancestor without error", () => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("dir", "rtl");
    const arrow = document.createElement("span");
    arrow.className = "x-arrow";
    wrapper.appendChild(arrow);
    document.body.appendChild(wrapper);

    expect(wrapper.getAttribute("dir")).toBe("rtl");
    expect(wrapper.contains(arrow)).toBe(true);

    wrapper.remove();
  });
});
