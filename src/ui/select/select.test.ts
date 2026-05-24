import { describe, it, expect } from "vitest";

function option(text: string, value: string) {
  const o = document.createElement("option");
  o.textContent = text;
  o.value = value;
  return o;
}

describe("x-select", () => {
  it("applies the class to a native <select>", () => {
    const select = document.createElement("select");
    select.className = "x-select";
    select.appendChild(option("One", "one"));
    select.appendChild(option("Two", "two"));

    expect(select.tagName).toBe("SELECT");
    expect(select.classList.contains("x-select")).toBe(true);
    expect(select.options.length).toBe(2);
  });

  it("accepts data-variant, data-size, and data-color", () => {
    const select = document.createElement("select");
    select.className = "x-select";
    select.dataset.variant = "soft";
    select.dataset.size = "3";
    select.dataset.color = "iris";

    expect(select.getAttribute("data-variant")).toBe("soft");
    expect(select.getAttribute("data-size")).toBe("3");
    expect(select.getAttribute("data-color")).toBe("iris");
  });

  it("propagates disabled state and matches :disabled", () => {
    const select = document.createElement("select");
    select.className = "x-select";
    document.body.appendChild(select);

    expect(select.disabled).toBe(false);
    select.disabled = true;
    expect(select.disabled).toBe(true);
    expect(select.matches(":disabled")).toBe(true);

    select.remove();
  });

  it("reflects the chosen option in .value", () => {
    const select = document.createElement("select");
    select.className = "x-select";
    select.appendChild(option("Apple", "apple"));
    select.appendChild(option("Orange", "orange"));
    document.body.appendChild(select);

    expect(select.value).toBe("apple");
    select.value = "orange";
    expect(select.value).toBe("orange");
    expect(select.selectedIndex).toBe(1);

    select.remove();
  });

  it("keeps multiple selects independent", () => {
    const a = document.createElement("select");
    const b = document.createElement("select");
    a.className = "x-select";
    b.className = "x-select";
    a.appendChild(option("A1", "a1"));
    a.appendChild(option("A2", "a2"));
    b.appendChild(option("B1", "b1"));
    b.appendChild(option("B2", "b2"));
    document.body.append(a, b);

    a.value = "a2";
    b.value = "b1";
    expect(a.value).toBe("a2");
    expect(b.value).toBe("b1");

    a.remove();
    b.remove();
  });
});
