/** @jsxImportSource elements-kit */
import { signal } from "elements-kit/signals";

/** The dynamically-imported half of the code-splitting demo. */
export default function LazyBadge() {
  const clicks = signal(0);
  return (
    <button
      class="unset x-button"
      data-variant="soft"
      data-size="2"
      on:click={() => clicks(clicks() + 1)}
    >
      lazy-loaded &amp; interactive — clicked {() => clicks()} times
    </button>
  );
}
