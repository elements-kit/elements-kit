import { reactive, computed } from "elements-kit/signals";
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";
import { defineElement } from "elements-kit/custom-elements";
import { render } from "elements-kit/render";

@attributes
class RangeDisplay extends HTMLElement {
  static [attr] = {
    // Each handler converts the raw string attribute to a typed reactive property
    min(this: RangeDisplay, v: string | null) {
      this.min = Number(v ?? 0);
    },
    max(this: RangeDisplay, v: string | null) {
      this.max = Number(v ?? 100);
    },
    value(this: RangeDisplay, v: string | null) {
      this.value = Number(v ?? 50);
    },
    label(this: RangeDisplay, v: string | null) {
      this.label = v ?? "";
    },
  };

  @reactive() min = 0;
  @reactive() max = 100;
  @reactive() value = 50;
  @reactive() label = "";

  // Derived from reactive properties
  percent = computed(() =>
    Math.round(((this.value - this.min) / (this.max - this.min)) * 100),
  );

  #unmount?: () => void;

  #template = () => (
    <div>
      <label style="display: block; margin-bottom: 0.5rem">
        {() => this.label || "Value"}: <strong>{() => this.value}</strong> (
        {() => this.percent}%)
      </label>
      <input
        type="range"
        min={computed(() => String(this.min))}
        max={computed(() => String(this.max))}
        value={computed(() => String(this.value))}
        on:input={(e: Event) =>
          (this.value = Number((e.target as HTMLInputElement).value))
        }
        style="width: 100%"
      />
      <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #888">
        <span>{() => this.min}</span>
        <span>{() => this.max}</span>
      </div>
    </div>
  ) as Element;

  connectedCallback() {
    this.style.display = "block";
    this.style.fontFamily = "sans-serif";
    this.style.padding = "1rem";

    this.#unmount = render(this, this.#template);
  }

  disconnectedCallback() {
    this.#unmount?.();
    this.#unmount = undefined;
  }
}

defineElement("x-range", RangeDisplay);

declare module "elements-kit/custom-elements" {
  interface CustomElementRegistry {
    "x-range": typeof RangeDisplay;
  }
}

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; max-width: 400px">
        <h2>Attribute demo</h2>
        <p style="font-size: 0.85em; color: #555">
          Attributes are HTML strings. <code>@attributes</code> converts them to
          typed reactive properties.
        </p>
        <x-range label="Volume" min={0} max={100} value={75} />
        <x-range label="Temperature" min={-20} max={40} value={22} />
        <x-range label="Brightness" min={0} max={255} value={128} />
      </div>
    ) as Element;
  }
}
