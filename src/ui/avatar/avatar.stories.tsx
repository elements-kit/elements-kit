import type { Meta, StoryObj } from "@storybook/html-vite";
import type { Children } from "elements-kit/jsx-runtime";

import "./avatar.css";

interface Args {
  initials: string;
  src: string;
  variant: "solid" | "soft";
  size: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
}

const VARIANTS = ["soft", "solid"] as const;
const SIZES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const ACCENTS = ["mint", "blue", "crimson", "iris", "amber"] as const;

const unsplash = (id: string, fpY = 0.5) =>
  `https://images.unsplash.com/${id}?w=320&h=320&dpr=2&q=70&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=${fpY}`;

const PHOTOS = [
  unsplash("photo-1502823403499-6ccfcf4fb453", 0.3),
  unsplash("photo-1607346256330-dee7af15f7c5"),
  unsplash("photo-1500648767791-00dcc994a43e"),
  unsplash("photo-1494790108377-be9c29b29330"),
];

// Generic person glyph — the fallback when there are no initials to show.
const PersonIcon = () =>
  (
    <svg viewBox="0 0 64 64" aria-hidden="true" style="fill: currentColor">
      <path d="M41.5 14c4.687 0 8.5 4.038 8.5 9s-3.813 9-8.5 9S33 27.962 33 23 36.813 14 41.5 14zM56.289 43.609C57.254 46.21 55.3 49 52.506 49c-2.759 0-11.035 0-11.035 0 .689-5.371-4.525-10.747-8.541-13.03 2.388-1.171 5.149-1.834 8.07-1.834C48.044 34.136 54.187 37.944 56.289 43.609zM37.289 46.609C38.254 49.21 36.3 52 33.506 52c-5.753 0-17.259 0-23.012 0-2.782 0-4.753-2.779-3.783-5.392 2.102-5.665 8.245-9.472 15.289-9.472S35.187 40.944 37.289 46.609zM21.5 17c4.687 0 8.5 4.038 8.5 9s-3.813 9-8.5 9S13 30.962 13 26 16.813 17 21.5 17z" />
    </svg>
  );

/** Dropping the image on error reveals the fallback beneath it. In plain
 * markup this is the `onerror="this.remove()"` attribute. */
const Image = (props: { src: string; handleError?: boolean }) =>
  (
    <img
      class:x-avatar-image
      src={props.src}
      alt=""
      on:error={
        props.handleError === false
          ? undefined
          : (event: Event) => (event.currentTarget as HTMLImageElement).remove()
      }
    />
  );

const Avatar = (
  args: Args & { accent?: string; handleError?: boolean; textSize?: string },
) =>
  (
    <span
      class:x-avatar
      data-variant={args.variant}
      data-size={args.size}
      data-accent={args.accent}
    >
      <span class:x-avatar-fallback data-size={args.textSize}>
        {args.initials || PersonIcon()}
      </span>
      {args.src ? Image({ src: args.src, handleError: args.handleError }) : null}
    </span>
  );

const Row = (props: { children?: Children }) =>
  (
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
      {props.children}
    </div>
  );

const meta = {
  title: "UI/Avatar",
  argTypes: {
    initials: { control: "text" },
    src: { control: "text" },
    variant: { control: "select", options: ["soft", "solid"] },
    size: { control: "select", options: [...SIZES] },
  },
  args: { initials: "WB", src: PHOTOS[0]!, variant: "soft", size: "3" },
  render: (args) => Avatar(args),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<Args>;

export const Soft: Story = {};
export const Solid: Story = { args: { variant: "solid" } };

export const Photos: Story = {
  render: (args) =>
    Row({
      children: PHOTOS.map((src, i) =>
        Avatar({ ...args, src, size: SIZES[i + 1]! }),
      ),
    }),
};

// No image — initials only.
export const Fallback: Story = { args: { src: "" } };

// No image and no initials — the person glyph fills in.
export const IconFallback: Story = { args: { src: "", initials: "" } };

// A 404 next to a photo: the broken image drops and the fallback shows.
export const BrokenImage: Story = {
  args: { src: "/does-not-exist.png" },
  render: (args) =>
    Row({ children: [Avatar({ ...args, src: PHOTOS[0]! }), Avatar(args)] }),
};

// The same 404 with no error handling, so the engine paints its own
// broken-image artifact over the fallback — the reason `onerror` is required.
export const BrokenImageUnhandled: Story = {
  args: { src: "/does-not-exist.png" },
  render: (args) => Avatar({ ...args, handleError: false }),
};

// The fallback's own `data-size` picks the type ratio: 2 (default) fits two
// initials, 3 suits one letter, 1 leaves room for three or more.
export const FallbackTypeSteps: Story = {
  args: { src: "", size: "5" },
  render: (args) =>
    Row({
      children: [
        Avatar({ ...args, initials: "W", textSize: "3" }),
        Avatar({ ...args, initials: "W" }),
        Avatar({ ...args, initials: "WB" }),
        Avatar({ ...args, initials: "WBX" }),
        Avatar({ ...args, initials: "WBX", textSize: "1" }),
      ],
    }),
};

export const Sizes: Story = {
  render: (args) =>
    Row({ children: SIZES.map((size) => Avatar({ ...args, size })) }),
};

// Every variant across every size, then photos, accents, and both fallbacks.
export const Gallery: Story = {
  render: (args) =>
    (
      <div style="display: grid; gap: 16px">
        {VARIANTS.map((variant) =>
          Row({
            children: SIZES.map((size) =>
              Avatar({ ...args, variant, size, src: "" }),
            ),
          }),
        )}
        {Row({
          children: SIZES.map((size, i) =>
            Avatar({ ...args, size, src: PHOTOS[i % PHOTOS.length]! }),
          ),
        })}
        {Row({
          children: ACCENTS.map((accent) =>
            Avatar({ ...args, variant: "soft", size: "4", src: "", accent }),
          ),
        })}
        {Row({
          children: SIZES.map((size) =>
            Avatar({ ...args, size, initials: "W", src: "" }),
          ),
        })}
        {Row({
          children: SIZES.map((size) =>
            Avatar({ ...args, size, initials: "", src: "" }),
          ),
        })}
      </div>
    ),
};
