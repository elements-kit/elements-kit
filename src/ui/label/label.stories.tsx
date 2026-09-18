import type { Meta, StoryObj } from "@storybook/html-vite";

import "../text-input/text-input.css";
import "../checkbox/checkbox.css";
import "../radio/radio.css";
import "./label.css";

interface Args {
  size: "1" | "2" | "3";
}

const meta = {
  title: "UI/Label",
  argTypes: { size: { control: "select", options: ["1", "2", "3"] } },
  args: { size: "2" },
  render: (args) => (
    <div style="inline-size: 280px">
      <label class:x-label for="story-email" data-size={args.size}>
        Email
      </label>
      <input
        class:unset
        class:x-text-input
        id="story-email"
        type="email"
        placeholder="you@example.com"
        data-size={args.size}
      />
    </div>
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const AboveInput: Story = {};
export const WithCheckbox: Story = {
  render: (args) => (
    <label class:x-label data-size={args.size}>
      <input type="checkbox" checked class:x-checkbox data-size={args.size} />
      Remember me
    </label>
  ),
};

/** A checkbox group: a column 4px apart; long text wraps beside the control. */
export const CheckboxGroup: Story = {
  render: (args) => (
    <div role="group" aria-label="Notifications" style="display: flex; flex-direction: column; gap: 4px; inline-size: 240px">
      <label class:x-label data-size={args.size}>
        <input type="checkbox" checked class:x-checkbox data-size={args.size} />
        Email
      </label>
      <label class:x-label data-size={args.size}>
        <input type="checkbox" class:x-checkbox data-size={args.size} />
        Push notifications on every device you are signed in to
      </label>
      <label class:x-label data-size={args.size}>
        <input type="checkbox" disabled class:x-checkbox data-size={args.size} />
        SMS
      </label>
    </div>
  ),
};

export const RadioGroup: Story = {
  render: (args) => (
    <div role="radiogroup" aria-label="Plan" style="display: flex; flex-direction: column; gap: 4px">
      <label class:x-label data-size={args.size}>
        <input type="radio" name="story-plan" checked class:x-radio data-size={args.size} />
        Free
      </label>
      <label class:x-label data-size={args.size}>
        <input type="radio" name="story-plan" class:x-radio data-size={args.size} />
        Pro
      </label>
    </div>
  ),
};
