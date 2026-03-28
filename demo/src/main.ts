import { computed, signal } from "elements-kit/signals";
import { span, div, button, Lifecycle } from "elements-kit/dom";
import { attributes, ATTRIBUTES as attr } from "elements-kit/attributes";
import { builder } from "elements-kit";
import { reactive } from "elements-kit/decorators";
import { Slots, SLOTS as $ } from "elements-kit/slot";

const value = signal(0);
const doubleValue = computed(() => value() * 2);
const doubledMessage = computed(() => `The double value is: ${doubleValue()}`);

@attributes
class MyElement extends HTMLElement implements Lifecycle {
  #connected = signal(false);

  static [attr] = {
    count(this: MyElement, value: string | null) {
      this.count = Number(value);
    },
  };

  readonly [$] = Slots(["children"]);

  @reactive()
  count: number = 0;

  connectedCallback() {
    this.append(
      div().children(
        this[$].children(span().textContent("This is a slot content")),
        button()
          .textContent("Increment")
          .on("click", () => this.count++),
        span().textContent(computed(() => `Current count: ${this.count}`)),
      ),
    );
    this.#connected(true);
  }
  disconnectedCallback() {
    this.#connected(false);
  }
}
customElements.define("my-element", MyElement);
const myelement = () =>
  builder(document.createElement("my-element") as MyElement);

const element = () =>
  div()
    .style.backgroundColor("lightblue")
    .style.padding("20px")
    .classList.add("my-element")
    .children(
      "Click the button to increment the value:",
      document.createElement("br"),
      button()
        .textContent("Increment")
        .on("click", () => {
          value(value() + 1);
        }),
      span()
        .style.display("block")
        .textContent(computed(() => `Current value: ${value()}`)),
      doubledMessage,
      document.createElement("br"),
      myelement(),
    );

const interval = setInterval(() => {
  console.log("incrementing", value());
  value(value() + 1);
}, 1000);

document.getElementById("app")?.appendChild(element());
