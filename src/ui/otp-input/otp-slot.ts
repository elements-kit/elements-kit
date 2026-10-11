import { ATTRIBUTES, type AttrChangeHandler } from "@/attributes.ts";
import { HTMLElementBase, isBrowser } from "@/utilities/environment.ts";

/**
 * `<x-otp-slot index="N">` — one visual cell of an `<x-otp-input>`. Purely
 * presentational: `aria-hidden`, no focus, no value of its own. The parent
 * `<x-otp-input>` paints its character and active / caret / disabled state by
 * index; all styling lives in the companion CSS.
 */
export class XOtpSlot extends HTMLElementBase {
  // Type-only: gives JSX a typed `index` attribute prop. No property is
  // declared, so the runtime writes a real attribute — which is what the
  // parent `<x-otp-input>` reads (`getAttribute("index")`).
  declare static [ATTRIBUTES]: { index: AttrChangeHandler<XOtpSlot> };

  connectedCallback(): void {
    this.setAttribute("aria-hidden", "true");
  }
}

if (isBrowser && !customElements.get("x-otp-slot")) {
  customElements.define("x-otp-slot", XOtpSlot);
}

declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {
      "x-otp-slot": typeof XOtpSlot;
    }
  }
}
