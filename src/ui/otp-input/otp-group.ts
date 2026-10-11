import { HTMLElementBase, isBrowser } from "@/utilities/environment.ts";

/**
 * `<x-otp-group>` — presentational container that joins a run of
 * `<x-otp-slot>`s into one attached group. All layout lives in CSS; this only
 * applies a `group` role so the visual grouping is exposed to assistive tech.
 */
export class XOtpGroup extends HTMLElementBase {
  connectedCallback(): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
  }
}

if (isBrowser && !customElements.get("x-otp-group")) {
  customElements.define("x-otp-group", XOtpGroup);
}

declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {
      "x-otp-group": typeof XOtpGroup;
    }
  }
}
