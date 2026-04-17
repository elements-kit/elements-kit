import { signal, computed, effect } from "elements-kit/signals";
import { useSignal, useScope } from "elements-kit/integrations/react";

// Signals are defined outside React — global reactive state.
// Any component that reads them re-renders when they change.
const count = signal(0);
const doubled = computed(() => count() * 2);

export default function App() {
  // Subscribe — re-renders only when count or doubled change
  const value = useSignal(count);
  const doubleValue = useSignal(doubled);

  // Scope: effects tied to this component's lifetime
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
