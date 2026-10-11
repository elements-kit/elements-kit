import type { Meta, StoryObj } from "@storybook/html-vite";
import { StoryIcon } from "../../../storybook/icon";
import "../avatar/avatar.css";
import "../card/card.css";
import "../button/button.css";
import "../badge/badge.css";
import "../switch/switch.css";
import "../separator/separator.css";
import "../label/label.css";
import "../styles/palette/red.css";
import "../styles/accent/red.css";
import "./item.css";

const Chevron = () => (
  <StoryIcon name="arrow_forward_ios" class="x-item-chevron" />
);

const songs = [
  {
    title: "Dreams",
    artist: "Fleetwood Mac",
    initials: "FM",
    accent: "iris",
    time: "4:17",
  },
  {
    title: "Pink + White",
    artist: "Frank Ocean",
    initials: "FO",
    accent: "crimson",
    time: "3:04",
  },
  {
    title: "Everything In Its Right Place",
    artist: "Radiohead",
    initials: "RH",
    accent: "amber",
    time: "4:11",
  },
  {
    title: "Midnight City",
    artist: undefined,
    initials: "MC",
    accent: "blue",
    time: "4:03",
  },
];

const messages = [
  {
    from: "Alice Laurent",
    initials: "AL",
    accent: "iris",
    time: "9:41",
    preview:
      "Lunch tomorrow? I was thinking we could try the new place near the office, they finally opened the terrace and the menu looks great.",
  },
  {
    from: "Bruno Costa",
    initials: "BC",
    accent: "jade",
    time: "Yesterday",
    preview:
      "Sent the slides. Let me know if the numbers on page four still look off to you.",
  },
];

const meta = {
  title: "UI/Item",
  args: { size: "2" },
  argTypes: { size: { control: "select", options: ["1", "2", "3"] } },
  render: ({ size }) => (
    <div style="display: grid; gap: var(--space-5)">
      <div
        class:x-card
        data-size={size}
        style="inline-size: min(100%, 36rem)"
      >
        <ul class:unset role="list" aria-label="Songs" data-inset="fill">
          {songs.map((song, index) => (
            <li
              class:x-item
              class:unset
              data-interactive
              aria-current={index === 0 ? "true" : undefined}
            >
              <span
                class:x-avatar
                data-size={size}
                data-accent={song.accent}
                aria-hidden="true"
              >
                <span class:x-avatar-fallback>{song.initials}</span>
              </span>
              <div class:x-item-content>
                <a class:x-item-link class:x-item-title data-variant="compact" href="#">
                  {song.title}
                </a>
                {song.artist && (
                  <span class:x-item-description>{song.artist}</span>
                )}
              </div>
              <div class:x-item-trailing>
                <span>{song.time}</span>
                <button
                  class:unset
                  class:x-button
                  data-variant="text"
                  data-icon
                  data-size={size}
                  aria-label={`More options for ${song.title}`}
                >
                  <StoryIcon name="more_horiz" />
                </button>
              </div>
            </li>
          ))}
          <li>
            <a class:x-item href="#" data-interactive>
              <span class:x-avatar data-size={size} aria-hidden="true">
                <span class:x-avatar-fallback>
                  <StoryIcon name="local_library" />
                </span>
              </span>
              <div class:x-item-content>
                <span class:x-item-title data-variant="compact">Library</span>
                <span class:x-item-description>128 songs</span>
              </div>
              <div class:x-item-trailing>
                <Chevron />
              </div>
            </a>
          </li>
        </ul>
      </div>

      <div
        class:x-card
        data-size={size}
        style="inline-size: min(100%, 36rem)"
      >
        <ul class:unset role="list" aria-label="Messages" data-inset="fill">
          {messages.map((message) => (
            <li>
            <a class:x-item href="#" data-interactive data-align="start">
              <span
                class:x-avatar
                data-size={size}
                data-accent={message.accent}
                aria-hidden="true"
              >
                <span class:x-avatar-fallback>{message.initials}</span>
              </span>
              <div class:x-item-content>
                <span class:x-item-title data-variant="compact">{message.from}</span>
                <span class:x-item-description>{message.preview}</span>
              </div>
              <div class:x-item-trailing>
                <time>{message.time}</time>
                <Chevron />
              </div>
            </a>
            </li>
          ))}
        </ul>
      </div>
      <div style="display: grid; gap: var(--space-2)">
        <div class:x-label data-variant="group" data-size={size} id="settings-label">
          Settings
        </div>
        <div
          class:x-card
          data-size={size}
          style="inline-size: min(100%, 36rem)"
        >
          <ul
            class:unset
            role="list"
            aria-labelledby="settings-label"
            data-inset="fill"
          >
            <li>
            <a class:x-item href="#" data-interactive data-separator>
              <span
                class:x-avatar
                data-size={size}
                data-accent="blue"
                aria-hidden="true"
              >
                <span class:x-avatar-fallback>
                  <StoryIcon name="wifi" />
                </span>
              </span>
              <div class:x-item-content>
                <span class:x-item-title>
                Wi-Fi
              </span>
              </div>
              <div class:x-item-trailing>
                <span>Home</span>
                <Chevron />
              </div>
            </a>
            </li>
            <li>
            <label class:x-item data-interactive data-separator>
              <span
                class:x-avatar
                data-size={size}
                data-accent="amber"
                aria-hidden="true"
              >
                <span class:x-avatar-fallback>
                  <StoryIcon name="flight" />
                </span>
              </span>
              <div class:x-item-content>
                <span class:x-item-title>
                Airplane mode
              </span>
              </div>
              <div class:x-item-trailing>
                <input
                  type="checkbox"
                  role="switch"
                  class:x-switch
                  data-size={size}
                />
              </div>
            </label>
            </li>
            <li>
            <a class:x-item href="#" data-interactive>
              <span
                class:x-avatar
                data-size={size}
                data-accent="crimson"
                aria-hidden="true"
              >
                <span class:x-avatar-fallback>
                  <StoryIcon name="notifications" />
                </span>
              </span>
              <div class:x-item-content>
                <span class:x-item-title data-variant="compact">Notifications</span>
                <span class:x-item-description>
                  Sounds, badges, lock screen
                </span>
              </div>
              <div class:x-item-trailing>
                <span class:x-badge data-size="1" data-accent="red">
                  3
                </span>
                <Chevron />
              </div>
            </a>
            </li>
          </ul>
        </div>
      <p class:x-item-hint data-size={size}>Changes apply to all your devices.</p>
      </div>

      <div
        class:x-card
        data-size={size}
        style="inline-size: min(100%, 36rem)"
      >
        <ul class:unset role="list" aria-label="Team" data-inset="fill">
          <li class:unset class:x-item>
            <span
              class:x-avatar
              data-size={size}
              data-accent="iris"
              aria-hidden="true"
            >
              <span class:x-avatar-fallback>AL</span>
            </span>
            <div class:x-item-content>
              <span class:x-item-title data-variant="compact">Alice Laurent</span>
              <span class:x-item-description>alice@example.com</span>
            </div>
            <div class:x-item-trailing>
              <span>Owner</span>
            </div>
          </li>
          <li class:unset class:x-item>
            <span
              class:x-avatar
              data-size={size}
              data-accent="jade"
              aria-hidden="true"
            >
              <span class:x-avatar-fallback>BC</span>
            </span>
            <div class:x-item-content>
              <span class:x-item-title data-variant="compact">Bruno Costa</span>
              <span class:x-item-description>bruno@example.com</span>
            </div>
            <div class:x-item-trailing>
              <button
                class:unset
                class:x-button
                data-variant="soft"
                data-size="1"
              >
                Remove
              </button>
            </div>
          </li>
          <li class:unset class:x-item data-disabled>
            <span class:x-avatar data-size={size} aria-hidden="true">
              <span class:x-avatar-fallback>
                <StoryIcon name="person" />
              </span>
            </span>
            <div class:x-item-content>
              <span class:x-item-title data-variant="compact">chris@example.com</span>
              <span class:x-item-description>Invite expired</span>
            </div>
          </li>
        </ul>
      </div>

      <div
        class:x-card
        data-size={size}
        role="group"
        aria-label="Account"
        style="inline-size: min(100%, 36rem)"
      >
        <div data-inset="fill">
          <a class:x-item href="#" data-interactive>
            <div class:x-item-content>
              <span class:x-item-title data-variant="compact">Storage</span>
              <span class:x-item-description>48 GB of 128 GB used</span>
            </div>
            <div class:x-item-trailing>
              <Chevron />
            </div>
          </a>
          <a class:x-item href="#" data-interactive>
            <div class:x-item-content>
              <span class:x-item-title data-variant="compact">
                Shipping address
              </span>
              <span class:x-item-description data-wrap>
                12 Rue de la Paix, 75002 Paris, France
              </span>
            </div>
            <div class:x-item-trailing>
              <Chevron />
            </div>
          </a>
          <a class:x-item href="#" data-interactive>
            <div class:x-item-content>
              <span class:x-item-title>
                Language
              </span>
            </div>
            <div class:x-item-trailing>
              <span>English</span>
              <Chevron />
            </div>
          </a>
          <hr class:x-separator />
          <button class:unset class:x-item data-interactive data-accent="red">
            <div class:x-item-content>
              <span class:x-item-title>
                Sign out
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  ),
} satisfies Meta<{ size: "1" | "2" | "3" }>;

export default meta;
export const Default: StoryObj<typeof meta> = {};
