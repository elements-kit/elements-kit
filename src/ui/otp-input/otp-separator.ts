import { isBrowser } from "@/utilities/environment.ts";

/**
 * `<x-otp-separator>` — decorative divider authored between OTP groups (e.g. a
 * dash between a 3-3 split). Purely visual: `aria-hidden`, glyph drawn in CSS.
 */
export class XOtpSeparator extends HTMLElement {
  connectedCallback(): void {
    this.setAttribute("aria-hidden", "true");
  }
}

if (isBrowser && !customElements.get("x-otp-separator")) {
  customElements.define("x-otp-separator", XOtpSeparator);
}

declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {
      "x-otp-separator": typeof XOtpSeparator;
    }
  }
}
