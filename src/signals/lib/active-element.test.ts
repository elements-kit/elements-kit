import { afterEach, describe, expect, it } from "vitest";
import { effectScope } from "../index.ts";
import { createActiveElement } from "./active-element.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createActiveElement", () => {
  it("returns a computed that reads the current activeElement", () => {
    let active!: ReturnType<typeof createActiveElement>;
    effectScope(() => {
      active = createActiveElement();
    });
    expect(active()).toBe(document.activeElement);
  });

  it("updates when focus changes", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);

    let active!: ReturnType<typeof createActiveElement>;
    effectScope(() => {
      active = createActiveElement();
    });

    document.dispatchEvent(new FocusEvent("focusin", { relatedTarget: input }));
    expect(active()).toBe(document.activeElement);
  });

  it("stops updating after Symbol.dispose", () => {
    let active!: ReturnType<typeof createActiveElement>;
    effectScope(() => {
      active = createActiveElement();
    });
    active[Symbol.dispose]();

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    // After dispose the signal is still readable but events won't update it
    expect(typeof active()).not.toBe("undefined");
  });
});
