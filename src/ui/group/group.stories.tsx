import { StoryIcon, type IconName } from "../../../storybook/icon";
import type { Meta, StoryObj } from "@storybook/html-vite";

import "./group.css";
import "../button/button.css";
import "../text-input/text-input.css";
import "../segmented-control/segmented-control.css";
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

const Icon = (props: { name: IconName }) => <StoryIcon name={props.name} size="24px" />;

// Outline buttons joined into a toolbar. Interior corners flatten, the 1px
// borders overlap into one hairline; hover/focus a middle button to see its
// border + ring lift above its neighbours.
export const ButtonToolbar: Story = {
  render: (args) => (
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
  render: (args) => (
    <div class:x-group role="group" data-accent="neutral" aria-label="Zoom">
      <button
        class:unset
        class:x-button
        data-variant="soft"
        data-size={args.size}
        aria-label="Zoom out"
      >
        <Icon name="remove" />
      </button>
      <input
        class:unset
        class:x-text-input
        style:width="6ch"
        data-variant="soft"
        data-size={args.size}
        value="100%"
      />
      <button
        class:unset
        class:x-button
        data-variant="soft"
        data-size={args.size}
        aria-label="Zoom in"
      >
        <Icon name="add" />
      </button>
    </div>
  ),
};

// Bare input + button addon. The input flex-grows; the button keeps its
// intrinsic width.
export const InputWithButton: Story = {
  render: (args) => (
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
  render: (args) => (
    <div class:x-group style="width: 320px">
      <div class:x-text-input data-variant="surface" data-size={args.size}>
        <span aria-hidden="true"><StoryIcon name="search" /></span>
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
  render: (args) => (
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

// busy backdrop: material's translucency and blur only show over something behind it
const BACKDROP =
  "padding: 24px; border-radius: 12px; background: repeating-linear-gradient(45deg, oklch(0.78 0.14 25) 0 14px, oklch(0.86 0.1 200) 14px 28px)";

const BorderlessButton = (props: {
  label: string;
  name?: IconName;
  icon?: boolean;
  disabled?: boolean;
}) => (
  <button
    class:unset
    class:x-button
    data-variant="borderless"
    data-size="2"
    data-icon={props.icon ? "" : undefined}
    aria-label={props.icon ? props.label : undefined}
    disabled={props.disabled || undefined}
  >
    {props.name ? <Icon name={props.name} /> : null}
    {props.icon ? null : props.label}
  </button>
);

// Material — floating capsules (iOS 26 toolbars): size-2 children + 4px padding = 40px. A soft input
// or segmented control inside uses the capsule as its background.
export const Material: Story = {
  parameters: { controls: { exclude: ["size"] } },
  render: () => (
    <div
      style={`${BACKDROP}; display: flex; flex-wrap: wrap; align-items: center; gap: 12px`}
    >
      <div class:x-group data-variant="material">
        <BorderlessButton label="Back" name="chevron_left" icon />
      </div>
      <div class:x-group data-variant="material" role="group" aria-label="Actions">
        <BorderlessButton label="Share" name="share" icon />
        <BorderlessButton label="More" name="more_horiz" icon />
      </div>
      <div class:x-group data-variant="material">
        <BorderlessButton label="Edit" />
      </div>
      <div class:x-group data-variant="material">
        <BorderlessButton label="Mailboxes" name="chevron_left" />
      </div>
      <div class:x-group data-variant="material" role="group" aria-label="Zoom">
        <BorderlessButton label="Zoom out" name="remove" icon />
        <BorderlessButton label="Zoom in" name="add" icon disabled />
      </div>
      <div class:x-group data-variant="material" style="width: 200px">
        <div class:x-text-input data-variant="soft" data-size="2">
          <span aria-hidden="true"><StoryIcon name="search" /></span>
          <input class:unset placeholder="Search" />
        </div>
      </div>
      <div class:x-group data-variant="material">
        <div
          class:unset
          class:x-segmented-control
          data-variant="soft"
          data-size="2"
          role="radiogroup"
          aria-label="View"
        >
          {["Day", "Week"].map((opt, i) => (
            <label>
              <input
                type="radio"
                name="group-material-view"
                value={opt.toLowerCase()}
                checked={i === 0 || undefined}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  ),
};

// Mixed controls — input + select + button all attached.
export const Mixed: Story = {
  render: (args) => (
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
