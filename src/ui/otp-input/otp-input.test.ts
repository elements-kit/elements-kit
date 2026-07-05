import { beforeEach, describe, expect, it, vi } from "vitest";

import "./index.ts";
import type { XOtpInput } from "./otp-input.ts";

// happy-dom has no form-associated-custom-element support (no `attachInternals`,
// and the element isn't placed in `form.elements`). So form participation,
// `FormData`, `FormObject`, validity, and axe a11y are verified in a real
// browser via the `FormSubmit` story + addon-vitest (otp-input.stories.tsx).
// This file covers the value / interaction / mirroring logic.

function mount(
  attrs: Record<string, string> = {},
  count = 6,
): { root: XOtpInput; input: HTMLInputElement } {
  const root = document.createElement("x-otp-input") as XOtpInput;
  for (const [k, v] of Object.entries(attrs)) root.setAttribute(k, v);
  const group = document.createElement("x-otp-group");
  for (let i = 0; i < count; i++) {
    const slot = document.createElement("x-otp-slot");
    slot.setAttribute("index", String(i));
    group.append(slot);
  }
  root.append(group);
  document.body.append(root);
  const input = root.shadowRoot!.querySelector("input")!;
  return { root, input };
}

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function slots(root: XOtpInput): string[] {
  return [...root.querySelectorAll("x-otp-slot")].map(
    (s) => s.textContent ?? "",
  );
}

function pasteInto(input: HTMLInputElement, text: string): void {
  const e = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(e, "clipboardData", { value: { getData: () => text } });
  input.dispatchEvent(e);
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("x-otp-input", () => {
  it("renders a transparent overlay input + a slot in the shadow root", () => {
    const { root, input } = mount({ maxlength: "6", inputmode: "numeric" });
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(root.shadowRoot!.querySelector("slot")).toBeTruthy();
    expect(input.getAttribute("autocomplete")).toBe("one-time-code");
    expect(input.maxLength).toBe(6);
    expect(input.inputMode).toBe("numeric");
  });

  it("mirrors the typed value into the cells", () => {
    const { root, input } = mount({ maxlength: "6" });
    type(input, "123");
    expect(root.value).toBe("123");
    expect(slots(root)).toEqual(["1", "2", "3", "", "", ""]);
  });

  it("truncates to maxlength", () => {
    const { root, input } = mount({ maxlength: "4" }, 4);
    type(input, "1234567");
    expect(root.value).toBe("1234");
  });

  it("fires `complete` once when the value fills", () => {
    const { root, input } = mount({ maxlength: "4" }, 4);
    const onComplete = vi.fn();
    root.addEventListener("complete", (e) =>
      onComplete((e as CustomEvent<string>).detail),
    );
    type(input, "12");
    expect(onComplete).not.toHaveBeenCalled();
    type(input, "1234");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("1234");
  });

  it("handles autofill — a whole value set at once fires `complete` once", () => {
    // SMS one-time-code autofill sets input.value in full, then fires `input`.
    const { root, input } = mount({ maxlength: "6" });
    const onComplete = vi.fn();
    root.addEventListener("complete", (e) =>
      onComplete((e as CustomEvent<string>).detail),
    );
    input.value = "654321";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root.value).toBe("654321");
    expect(slots(root)).toEqual(["6", "5", "4", "3", "2", "1"]);
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("654321");
  });

  it("filters characters that fail the pattern", () => {
    const { root, input } = mount({ maxlength: "6", pattern: "[0-9]" });
    type(input, "1a2b3c");
    expect(root.value).toBe("123");
  });

  it("blocks non-matching printable keys before input", () => {
    const { input } = mount({ maxlength: "6", pattern: "[0-9]" });
    const ok = input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "5", cancelable: true }),
    );
    const bad = input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", cancelable: true }),
    );
    expect(ok).toBe(true); // not prevented
    expect(bad).toBe(false); // preventDefault called
  });

  it("handles paste through the pattern + maxlength", () => {
    const { root, input } = mount({ maxlength: "6", pattern: "[0-9]" });
    pasteInto(input, "12-34-56-99");
    expect(root.value).toBe("123456");
    expect(slots(root)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("applies pasteTransformer before validation", () => {
    const { root, input } = mount({ maxlength: "6" });
    root.pasteTransformer = (t) => t.replace(/\s/g, "");
    pasteInto(input, "1 2 3 4 5 6");
    expect(root.value).toBe("123456");
  });

  it("reflects programmatic value changes to the cells + input", () => {
    const { root } = mount({ maxlength: "6" });
    root.value = "999";
    expect(slots(root)).toEqual(["9", "9", "9", "", "", ""]);
    expect(root.shadowRoot!.querySelector("input")!.value).toBe("999");
  });

  it("reflects the name attribute as a property", () => {
    const { root } = mount({ maxlength: "6", name: "code" });
    expect(root.name).toBe("code");
    root.name = "otp";
    expect(root.getAttribute("name")).toBe("otp");
  });

  it("clears via formResetCallback", () => {
    const { root, input } = mount({ maxlength: "6" });
    type(input, "123456");
    root.formResetCallback();
    expect(root.value).toBe("");
    expect(slots(root)).toEqual(["", "", "", "", "", ""]);
  });

  it("mirrors the disabled state to the input", () => {
    const { root, input } = mount({ maxlength: "6", disabled: "" });
    expect(input.disabled).toBe(true);
    root.disabled = false;
    expect(input.disabled).toBe(false);
  });
});
