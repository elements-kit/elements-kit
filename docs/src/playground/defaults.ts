import type { PlaygroundFile } from "./editor/host";

export const ENTRY = "main.tsx";

const main = `import { signal, computed } from "elements-kit/signals";
import { render } from "elements-kit/render";

function Counter() {
  const count = signal(0);
  const doubled = computed(() => count() * 2);

  return (
    <section>
      <p>
        <strong>{count}</strong> × 2 = <strong>{doubled}</strong>
      </p>
      <button on:click={() => count(count() + 1)}>+1</button>{" "}
      <button on:click={() => count(count() - 1)}>−1</button>
    </section>
  );
}

render(document.getElementById("app")!, () => <Counter />);
`;

/** The starter project; the import map fills in on first compile. */
export const defaultFiles = (): PlaygroundFile[] => [{ name: ENTRY, source: main }];
