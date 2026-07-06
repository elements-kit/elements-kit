import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor } from "storybook/test";

import { FormObject } from "@/utilities/form-object.ts";
import "./otp-input.css";
import "./index.ts"; // registers x-otp-input / x-otp-group / x-otp-slot / x-otp-separator

interface Args {
  size: "1" | "2" | "3";
  variant: "surface" | "soft";
}

/** Build a run of N slots starting at `start`. */
function group(start: number, n: number): Node {
  return (
    <x-otp-group>
      {Array.from({ length: n }, (_, i) => (
        <x-otp-slot index={String(start + i)} />
      ))}
    </x-otp-group>
  ) as Node;
}

const meta = {
  title: "UI/OTP Input",
  argTypes: {
    size: { control: "select", options: ["1", "2", "3"] },
    variant: { control: "select", options: ["surface", "soft"] },
  },
  args: { size: "2", variant: "surface" },
  // Run axe on every OTP story via addon-a11y + addon-vitest.
  parameters: { a11y: { test: "error" } },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

// Six cells, one group.
export const Basic: Story = {
  render: (args) =>
    (
      <x-otp-input
        maxlength="6"
        data-size={args.size}
        data-variant={args.variant}
        aria-label="One-time passcode"
      >
        {group(0, 6)}
      </x-otp-input>
    ) as Node,
};

// Digits only via `pattern`; numeric mobile keyboard.
export const DigitsOnly: Story = {
  render: (args) =>
    (
      <x-otp-input
        maxlength="6"
        pattern="[0-9]"
        inputmode="numeric"
        data-size={args.size}
        data-variant={args.variant}
        aria-label="Verification code"
      >
        {group(0, 6)}
      </x-otp-input>
    ) as Node,
};

// Author-inserted separator between two 3-cell groups.
export const WithSeparator: Story = {
  render: (args) =>
    (
      <x-otp-input
        maxlength="6"
        pattern="[0-9]"
        inputmode="numeric"
        data-size={args.size}
        data-variant={args.variant}
        aria-label="Verification code"
      >
        {group(0, 3)}
        <x-otp-separator />
        {group(3, 3)}
      </x-otp-input>
    ) as Node,
};

// Preset value.
export const Prefilled: Story = {
  render: (args) =>
    (
      <x-otp-input
        maxlength="6"
        value="428"
        data-size={args.size}
        data-variant={args.variant}
        aria-label="One-time passcode"
      >
        {group(0, 6)}
      </x-otp-input>
    ) as Node,
};

export const Disabled: Story = {
  render: (args) =>
    (
      <x-otp-input
        maxlength="6"
        value="42"
        disabled
        data-size={args.size}
        data-variant={args.variant}
        aria-label="One-time passcode"
      >
        {group(0, 6)}
      </x-otp-input>
    ) as Node,
};

// Real-browser test of form participation (ElementInternals FACE) + FormObject —
// the behavior happy-dom can't exercise. Runs under addon-vitest in Chromium.
export const FormSubmit: Story = {
  render: () =>
    (
      <form>
        <x-otp-input
          name="auth.otp"
          maxlength="6"
          pattern="[0-9]"
          inputmode="numeric"
          aria-label="Verification code"
        >
          {group(0, 6)}
        </x-otp-input>
      </form>
    ) as Node,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector("form")!;
    const otp = form.querySelector("x-otp-input")!;
    const input = otp.shadowRoot!.querySelector("input")!;

    input.focus();
    await userEvent.keyboard("135790");

    // The value mirrored into the cells.
    await waitFor(() => {
      const cells = [...otp.querySelectorAll("x-otp-slot")].map(
        (s) => s.textContent,
      );
      expect(cells).toEqual(["1", "3", "5", "7", "9", "0"]);
    });

    // Form-associated: native FormData sees it under the host name.
    expect(new FormData(form).get("auth.otp")).toBe("135790");

    // FormObject nests by dot-notation and round-trips.
    expect(new FormObject(form).toObject()).toEqual({
      auth: { otp: "135790" },
    });

    new FormObject(form).fromObject({ auth: { otp: "246813" } });
    expect(otp.value).toBe("246813");
  },
};

// Real-browser interaction coverage mirroring the reference input-otp behaviors:
// pattern gating, complete-on-fill edge, overflow, backspace, caret navigation.
export const Behaviors: Story = {
  render: () =>
    (
      <x-otp-input maxlength="4" pattern="[0-9]" aria-label="Code">
        {group(0, 4)}
      </x-otp-input>
    ) as Node,
  play: async ({ canvasElement }) => {
    const otp = canvasElement.querySelector("x-otp-input")!;
    const input = otp.shadowRoot!.querySelector("input")!;
    let completes = 0;
    let lastComplete = "";
    otp.addEventListener("complete", (e) => {
      completes++;
      lastComplete = (e as CustomEvent<string>).detail;
    });
    const activeIndex = () =>
      [...otp.querySelectorAll("x-otp-slot")].findIndex((s) =>
        s.hasAttribute("data-active"),
      );

    input.focus();
    await userEvent.keyboard("12");
    expect(otp.value).toBe("12");
    expect(activeIndex()).toBe(2); // caret on next empty cell

    await userEvent.keyboard("a"); // non-matching → blocked
    expect(otp.value).toBe("12");

    await userEvent.keyboard("34"); // fills → complete fires once with the value
    expect(otp.value).toBe("1234");
    expect(completes).toBe(1);
    expect(lastComplete).toBe("1234");

    await userEvent.keyboard("5"); // overflow past maxlength ignored
    expect(otp.value).toBe("1234");

    await userEvent.keyboard("{Backspace}");
    expect(otp.value).toBe("123");

    await userEvent.keyboard("9"); // back to full → new transition, fires again
    expect(otp.value).toBe("1239");
    expect(completes).toBe(2);
    expect(lastComplete).toBe("1239");

    await userEvent.keyboard("{Home}"); // caret to start → first cell active
    expect(activeIndex()).toBe(0);
  },
};
