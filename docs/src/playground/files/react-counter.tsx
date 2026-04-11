import { signal, computed, effect } from "elements-kit/signals";
import { useSignal, useScope } from "elements-kit/signals/react";

// Signals are defined outside React — they're global reactive state.
// Any component that reads them will re-render when they change.
const count = signal(0);
const doubled = computed(() => count() * 2);

export default function App() {
  // useSignal subscribes this component to the signal.
  // Re-renders only when `count` or `doubled` change — nothing else.
  const value = useSignal(count);
  const doubleValue = useSignal(doubled);

  // useScope ties a group of effects to this component's lifetime.
  // The effect stops automatically when the component unmounts.
  useScope(() => {
    effect(() => {
      console.log("count changed:", count());
    });
  });

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h2>Signal Counter</h2>
      <p>
        Count: <strong>{value}</strong>
        {" — "}
        Doubled: <strong>{doubleValue}</strong>
      </p>
      <button onClick={() => count(count() + 1)}>+1</button>{" "}
      <button onClick={() => count(count() - 1)}>−1</button>{" "}
      <button onClick={() => count(0)}>Reset</button>
      <p style={{ fontSize: "0.8em", color: "#888", marginTop: "1rem" }}>
        Open the console to see effect logs.
      </p>
    </div>
  );
}
