import { signal, computed, effect, batch } from "elements-kit/signals";

const count = signal(0);
const doubled = computed(() => count() * 2);

// Log every change
effect(() => {
  console.log(`count: ${count()}, doubled: ${doubled()}`);
});

export class App {
  render() {
    return (
      <section style="padding: 1.5rem; font-family: sans-serif">
        <h2>Signal Counter</h2>
        <p>
          Count: <strong>{count}</strong>
          {" — "}
          Doubled: <strong>{doubled}</strong>
        </p>
        <button onClick={() => count(count() + 1)}>+1</button>{" "}
        <button onClick={() => count(count() - 1)}>−1</button>{" "}
        <button
          onClick={() =>
            batch(() => {
              count(0);
            })
          }
        >
          Reset
        </button>
        <p style="font-size: 0.8em; color: #888; margin-top: 1rem">
          Open the console to see effect logs.
        </p>
      </section>
    ) as Element;
  }
}
