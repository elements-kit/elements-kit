import { computed } from "elements-kit/signals";
import { text, color, bold } from "./state";

export class App {
  render() {
    return (
      <section style="padding: 1.5rem; font-family: sans-serif">
        <h2>Reactive Props</h2>

        {/* Live text binding */}
        <p
          style:color={color}
          style:font-weight={computed(() => (bold() ? "bold" : "normal"))}
        >
          {text}
        </p>

        {/* Controls */}
        <label style="display: block; margin: 8px 0">
          Text:{" "}
          <input
            value={text}
            on:input={(e: Event) => text((e.target as HTMLInputElement).value)}
          />
        </label>
        <label style="display: block; margin: 8px 0">
          Color:{" "}
          <input
            type="color"
            value={color}
            on:input={(e: Event) => color((e.target as HTMLInputElement).value)}
          />
        </label>
        <label style="display: block; margin: 8px 0">
          <input
            type="checkbox"
            checked={bold}
            on:change={() => bold(!bold())}
          />{" "}
          Bold
        </label>
      </section>
    );
  }
}
