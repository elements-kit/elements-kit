/** @jsxImportSource elements-kit */
import { signal } from "elements-kit/signals";

/** The dynamically-imported half of the lazy/Suspense demo. */
export default function LazyBadge() {
  const clicks = signal(0);
  return (
    <button
      style="cursor:pointer;padding:0.25rem 0.75rem"
      on:click={() => clicks(clicks() + 1)}
    >
      lazy-loaded &amp; interactive — clicked {() => clicks()} times
    </button>
  );
}
