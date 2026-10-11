import { reactive } from "elements-kit/signals";
import {
  attributes,
  ATTRIBUTES,
  type Attributes,
} from "elements-kit/attributes";
import { defineElement } from "elements-kit/custom-elements";

// Its own module because `customElements.define` throws on a repeat
// registration: re-evaluating the module that owns it — which is what HMR does
// — would fail and force a page reload. Keeping it out of app.tsx lets that
// file hot-swap.
@attributes
class CeGreeting extends HTMLElement {
  @reactive() name: string = "world";
  @reactive() excited: boolean = false;
  static [ATTRIBUTES]: Attributes<CeGreeting> = {
    name(v) {
      this.name = v ?? "world";
    },
    excited(v) {
      this.excited = v != null;
    },
  };
  connectedCallback() {
    const root = this.attachShadow({ mode: "open" });
    root.appendChild(
      (
        <p style="margin: 0;">
          <code>[ce]</code> Hello {() => this.name}
          {() => (this.excited ? "!" : ".")}
        </p>
      ) as Element,
    );
  }
}

defineElement("ce-greeting", CeGreeting);

declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {
      "ce-greeting": typeof CeGreeting;
    }
  }
}

export type { CeGreeting };
