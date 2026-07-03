/** @jsxImportSource elements-kit */
import { computed, signal } from "elements-kit/signals";

/**
 * Live demo island for the Astro integration page. Server-rendered by
 * `elements-kit/integrations/astro-server`, hydrated by the claim walk —
 * the button's handler attaches to the server-rendered DOM node.
 */
export default function AstroCounter(props: { start?: () => number }) {
  const count = signal(props.start?.() ?? 0);
  const double = computed(() => count() * 2);

  return (
    <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;border:1px solid var(--sl-color-gray-5);border-radius:0.5rem">
      <button
        style="cursor:pointer;padding:0.25rem 0.75rem"
        on:click={() => count(count() + 1)}
      >
        count is {() => count()}
      </button>
      <span>doubled: {double}</span>
    </div>
  );
}
