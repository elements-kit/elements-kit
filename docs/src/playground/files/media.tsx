import { effect, effectScope } from "elements-kit/signals";
import { createMediaQuery } from "elements-kit/utilities/media-query";

// Live media query signals
const isDark = createMediaQuery("(prefers-color-scheme: dark)");
const isMobile = createMediaQuery("(max-width: 640px)");
const prefersNoAnim = createMediaQuery("(prefers-reduced-motion: reduce)");

export class App {
  render() {
    return (
      <section style="padding: 1.5rem; font-family: sans-serif">
        <h2>Media Signals</h2>
        <p>
          Resize the preview panel or change your OS settings to see live
          updates.
        </p>
        <ul>
          <li>
            Dark mode: <strong>{isDark}</strong>
          </li>
          <li>
            Mobile (&lt;640px): <strong>{isMobile}</strong>
          </li>
          <li>
            Reduced motion: <strong>{prefersNoAnim}</strong>
          </li>
        </ul>
      </section>
    );
  }
}
