import { reactive, computed } from "elements-kit/signals";
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";
import { render } from "elements-kit/render";

@attributes
class TemperatureElement extends HTMLElement {
  static [attr] = {
    celsius(this: TemperatureElement, v: string | null) {
      this.celsius = Number(v ?? 0);
    },
  };

  @reactive() celsius = 0;

  fahrenheit = computed(() => (this.celsius * 9) / 5 + 32);
  kelvin = computed(() => this.celsius + 273.15);

  label = computed(() => {
    const c = this.celsius;
    if (c <= 0) return "❄️ Freezing";
    if (c <= 15) return "🧥 Cold";
    if (c <= 25) return "😊 Comfortable";
    if (c <= 35) return "☀️ Warm";
    return "🔥 Hot";
  });

  #unmount?: () => void;

  #template = () => (
    <div>
      <h2>{this.label}</h2>
      <label style="display:block; margin-bottom:1rem">
        °C:{" "}
        <input
          type="range"
          min="-30"
          max="50"
          value={computed(() => String(this.celsius))}
          on:input={(e: Event) =>
            (this.celsius = Number((e.target as HTMLInputElement).value))
          }
          style="width:180px"
        />{" "}
        <strong>{() => this.celsius}</strong>
      </label>
      <table>
        <tr>
          <td>Fahrenheit</td>
          <td>
            <strong>{() => this.fahrenheit().toFixed(1)} °F</strong>
          </td>
        </tr>
        <tr>
          <td>Kelvin</td>{" "}
          <td>
            <strong>{() => this.kelvin().toFixed(2)} K</strong>
          </td>
        </tr>
      </table>
    </div>
  );

  connectedCallback() {
    this.style.display = "block";
    this.style.fontFamily = "sans-serif";
    this.style.padding = "1.5rem";
    this.style.maxWidth = "320px";

    this.#unmount = render(this, this.#template);
  }

  disconnectedCallback() {
    this.#unmount?.();
    this.#unmount = undefined;
  }
}

customElements.define("x-temperature", TemperatureElement);

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "x-temperature": { celsius?: number | string };
    }
  }
}

export class App {
  render() {
    return <x-temperature celsius={22} />;
  }
}
