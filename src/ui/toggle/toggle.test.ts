import { describe, it, expect } from "vitest";

describe("x-toggle", () => {
  it("applies the class to a <label> wrapping a checkbox input", () => {
    const label = document.createElement("label");
    label.className = "x-toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    label.appendChild(input);
    label.append("Bold");

    expect(label.tagName).toBe("LABEL");
    expect(label.classList.contains("x-toggle")).toBe(true);
    expect(label.querySelector("input")!.type).toBe("checkbox");
  });

  it("reflects :checked on the wrapped input", () => {
    const label = document.createElement("label");
    label.className = "x-toggle";
    const input = document.createElement("input");
    input.type = "checkbox";
    label.appendChild(input);
    document.body.appendChild(label);

    expect(input.checked).toBe(false);
    input.checked = true;
    expect(input.checked).toBe(true);
    expect(input.matches(":checked")).toBe(true);

    label.remove();
  });

  it("groups radio toggles via shared `name` (one checked at a time)", () => {
    const a = Object.assign(document.createElement("input"), {
      type: "radio",
      name: "align",
    });
    const b = Object.assign(document.createElement("input"), {
      type: "radio",
      name: "align",
    });
    const labelA = document.createElement("label");
    const labelB = document.createElement("label");
    labelA.className = "x-toggle";
    labelB.className = "x-toggle";
    labelA.appendChild(a);
    labelB.appendChild(b);
    document.body.append(labelA, labelB);

    a.checked = true;
    expect(a.checked).toBe(true);
    expect(b.checked).toBe(false);

    b.click();
    expect(b.checked).toBe(true);
    expect(a.checked).toBe(false);

    labelA.remove();
    labelB.remove();
  });

  it("accepts data-variant, data-size, and data-accent", () => {
    const label = document.createElement("label");
    label.className = "x-toggle";
    label.dataset.variant = "soft";
    label.dataset.size = "3";
    label.dataset.accent = "iris";
    label.appendChild(
      Object.assign(document.createElement("input"), { type: "checkbox" }),
    );

    expect(label.getAttribute("data-variant")).toBe("soft");
    expect(label.getAttribute("data-size")).toBe("3");
    expect(label.getAttribute("data-accent")).toBe("iris");
  });

  it("propagates disabled state from the input", () => {
    const label = document.createElement("label");
    label.className = "x-toggle";
    const input = Object.assign(document.createElement("input"), {
      type: "checkbox",
    });
    label.appendChild(input);
    document.body.appendChild(label);

    expect(input.disabled).toBe(false);
    input.disabled = true;
    expect(input.disabled).toBe(true);
    expect(input.matches(":disabled")).toBe(true);

    label.remove();
  });
});
