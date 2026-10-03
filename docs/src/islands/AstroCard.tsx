/** @jsxImportSource elements-kit */
import { computed, signal } from "elements-kit/signals";

/**
 * Slot-accepting island: Astro delivers the pre-rendered slot HTML, the
 * integration maps it to `children` / `header`, and the component
 * places it — while staying interactive itself.
 */
export default function AstroCard(props: {
  children?: unknown;
  header?: unknown;
}) {
  const open = signal(true);
  const display = computed(() => (open() ? "block" : "none"));
  const label = computed(() => (open() ? "collapse" : "expand"));
  return (
    <section
      class="unset x-card"
      data-variant="surface"
      data-size="2"
      style="padding:0;overflow:hidden"
    >
      <header style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-4)">
        {props.header as never}
        <button
          class="unset x-button"
          data-variant="outline"
          data-size="1"
          on:click={() => open(!open())}
        >
          {label}
        </button>
      </header>
      <div style:display={display as never}>
        <div style="padding:var(--space-3) var(--space-4)">
          {props.children as never}
        </div>
      </div>
    </section>
  );
}
