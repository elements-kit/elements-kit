/** @jsxImportSource elements-kit */
import { computed, signal } from "elements-kit/signals";

/**
 * Slot-accepting island: Astro delivers the pre-rendered slot HTML, the
 * integration maps it to `children` / `slot:header`, and the component
 * places it — while staying interactive itself.
 */
export default function AstroCard(props: {
  children?: unknown;
  "slot:header"?: unknown;
}) {
  const open = signal(true);
  const display = computed(() => (open() ? "block" : "none"));
  return (
    <section style="border:1px solid var(--sl-color-gray-5);border-radius:0.5rem;overflow:hidden">
      <header style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 1rem;background:var(--sl-color-gray-6)">
        {props["slot:header"] as never}
        <button style="cursor:pointer" on:click={() => open(!open())}>
          {() => (open() ? "collapse" : "expand")}
        </button>
      </header>
      <div style:display={display as never}>
        <div style="padding:0.75rem 1rem">{props.children as never}</div>
      </div>
    </section>
  );
}
