/** @jsxImportSource elements-kit */
import { computed, signal } from "elements-kit/signals";

/**
 * Live demo island for the Astro integration page. Server-rendered by
 * `elements-kit/integrations/astro-server`, hydrated by the claim walk —
 * the button's handler attaches to the server-rendered DOM node. The
 * `start` prop arrives through Astro's island props serialization.
 */
export default function AstroCounter(props: { start?: () => number }) {
  const count = signal(props.start?.() ?? 0);
  const double = computed(() => count() * 2);

  return (
    <div class="x-card" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4)">
      <button
        class="unset x-button"
        data-variant="solid"
        data-size="2"
        on:click={() => count(count() + 1)}
      >
        count is {() => count()}
      </button>
      <span>doubled: {double}</span>
    </div>
  );
}
