import { isBrowser } from "@/utilities/environment.ts";

/**
 * `<x-otp-slot index="N">` — one visual cell of an `<x-otp-input>`. Purely
 * presentational: `aria-hidden`, no focus, no value of its own. The parent
 * `<x-otp-input>` paints its character and active / caret / disabled state by
 * index; all styling lives in the companion CSS.
 */
export class XOtpSlot extends HTMLElement {
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
