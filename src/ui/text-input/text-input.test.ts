import { describe, it, expect } from "vitest";

describe("x-text-input", () => {
  it("applies the class to a bare <input> without DOM errors", () => {
    const el = document.createElement("input");
    el.className = "x-text-input";
    el.setAttribute("data-size", "2");
    el.setAttribute("data-variant", "surface");
    expect(el.classList.contains("x-text-input")).toBe(true);
    expect(el.tagName).toBe("INPUT");
  });

  it("applies the class to a bare <textarea> without DOM errors", () => {
    const el = document.createElement("textarea");
    el.className = "x-text-input";
    el.setAttribute("data-size", "2");
    expect(el.classList.contains("x-text-input")).toBe(true);
    expect(el.tagName).toBe("TEXTAREA");
  });

  it("applies the class to a wrapper <div> with an <input> child", () => {
    const wrapper = document.createElement("div");
    wrapper.className = "x-text-input";
    const leading = document.createElement("span");
    const input = document.createElement("input");
    input.name = "q";
    input.value = "hi";
    const trailing = document.createElement("kbd");
    wrapper.append(leading, input, trailing);
    expect(wrapper.querySelector("input")).toBe(input);
    expect(wrapper.children.length).toBe(3);
  });

  it("participates in form submission when wrapped", () => {
    const form = document.createElement("form");
    const wrapper = document.createElement("div");
    wrapper.className = "x-text-input";
    const leading = document.createElement("span");
    leading.textContent = "$";
    const input = document.createElement("input");
    input.name = "amount";
    input.value = "42";
    const trailing = document.createElement("span");
    trailing.textContent = "USD";
    wrapper.append(leading, input, trailing);
    form.appendChild(wrapper);
    document.body.appendChild(form);

    const data = new FormData(form);
    expect(data.get("amount")).toBe("42");

    form.remove();
  });

  it("wraps a textarea in a vertical layout", () => {
    const wrapper = document.createElement("div");
    wrapper.className = "x-text-input";
    const header = document.createElement("div");
    header.textContent = "Markdown";
    const textarea = document.createElement("textarea");
    textarea.name = "note";
    textarea.value = "hello";
    const counter = document.createElement("div");
    counter.textContent = "5 / 280";
    wrapper.append(header, textarea, counter);
    expect(wrapper.querySelector("textarea")).toBe(textarea);
    expect(wrapper.firstElementChild).toBe(header);
    expect(wrapper.lastElementChild).toBe(counter);
  });
});
