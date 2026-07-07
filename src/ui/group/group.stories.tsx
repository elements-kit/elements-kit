import type { Meta, StoryObj } from "@storybook/html-vite";

import "./group.css";
import "../button/button.css";
import "../text-input/text-input.css";
import "../select/select.css";
import "../toggle/toggle.css";

interface Args {
  size: "1" | "2" | "3";
}

const meta = {
  title: "UI/Group",
  argTypes: {
    size: { control: "select", options: ["1", "2", "3"] },
  },
  args: { size: "2" },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

let toggleGroup = 0;

// Outline buttons joined into a toolbar. Interior corners flatten, the 1px
// borders overlap into one hairline; hover/focus a middle button to see its
// border + ring lift above its neighbours.
export const ButtonToolbar: Story = {
  render: (args) =>
    (
      <div class:x-group role="group" aria-label="Text style">
        {["Bold", "Italic", "Underline"].map((label) => (
          <button
            class:unset
            class:x-button
            data-variant="outline"
            data-size={args.size}
          >
            {label}
          </button>
        ))}
      </div>
    ),
};

// Solid buttons share --accent-9, so the seam is drawn as a hairline in the
// button's own contrast colour (visible on any accent, light or dark).
export const SolidActions: Story = {
  render: (args) =>
    (
      <div class:x-group role="group" aria-label="Zoom">
        {["−", "100%", "+"].map((label) => (
          <button
            class:unset
            class:x-button
            data-variant="solid"
            data-size={args.size}
          >
            {label}
          </button>
        ))}
      </div>
    ),
};

// Bare input + button addon. The input flex-grows; the button keeps its
// intrinsic width.
export const InputWithButton: Story = {
  render: (args) =>
    (
      <div class:x-group style="width: 320px">
        <input
          class:unset
          class:x-text-input
          data-variant="surface"
          data-size={args.size}
          placeholder="Search"
        />
        <button
          class:unset
          class:x-button
          data-variant="solid"
          data-size={args.size}
        >
          Go
        </button>
      </div>
    ),
};

// Wrapper-form input (leading affix) + button. Exercises the inner-<input>
// corner flatten — the inner input must not round past the flat wrapper seam.
export const InputAffixWithButton: Story = {
  render: (args) =>
    (
      <div class:x-group style="width: 320px">
        <div class:x-text-input data-variant="surface" data-size={args.size}>
          <span aria-hidden="true">🔍</span>
          <input class:unset placeholder="Search" />
        </div>
        <button
          class:unset
          class:x-button
          data-variant="solid"
          data-size={args.size}
        >
          Go
        </button>
      </div>
    ),
};

// Select + button. The select flex-grows like an input.
export const SelectWithButton: Story = {
  render: (args) =>
    (
      <div class:x-group>
        <select
          class:unset
          class:x-select
          data-variant="surface"
          data-size={args.size}
        >
          <option>Filter: All</option>
          <option>Filter: Open</option>
          <option>Filter: Closed</option>
        </select>
        <button
          class:unset
          class:x-button
          data-variant="surface"
          data-size={args.size}
        >
          Apply
        </button>
      </div>
    ),
};

// A row of toggles joined as one control (independent checkboxes — multi-select).
export const ToggleRow: Story = {
  render: (args) => {
    const name = `group-toggle-${toggleGroup++}`;
    return (
      <div class:x-group role="group" aria-label="Alignment">
        {["Left", "Center", "Right"].map((label) => (
          <label class:x-toggle data-size={args.size}>
            <input type="radio" name={name} class:unset /> {label}
          </label>
        ))}
      </div>
    );
  },
};

// Mixed controls — input + select + button all attached.
export const Mixed: Story = {
  render: (args) =>
    (
      <div class:x-group style="width: 420px">
        <input
          class:unset
          class:x-text-input
          data-variant="surface"
          data-size={args.size}
          placeholder="Amount"
        />
        <select
          class:unset
          class:x-select
          style:min-width="100px"
          data-variant="surface"
          data-size={args.size}
        >
          <option>USD</option>
          <option>EUR</option>
          <option>GBP</option>
        </select>
        <button
          class:unset
          class:x-button
          data-variant="solid"
          data-size={args.size}
        >
          Send
        </button>
      </div>
    ),
};
