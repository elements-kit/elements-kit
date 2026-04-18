import { signal } from "elements-kit/signals";
import { async } from "elements-kit/utilities/async";

const id = signal(1);
let attempt = 0;

const fetchTodo = async(async () => {
  const currentId = id();
  attempt++;
  console.log(`[fetch] attempt=${attempt} id=${currentId}`);
  await new Promise((r) => setTimeout(r, 400));
  if (attempt % 3 === 0) throw new Error("simulated failure");
  return { id: currentId, title: `Todo #${currentId}`, fetchedAt: Date.now() };
});

fetchTodo.start();

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">Data fetching — async + reactive input</h2>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; display: grid; gap: 0.5rem;">
          <div style="display: flex; gap: 8px;">
            <button onClick={() => id(id() + 1)}>next id</button>
            <button onClick={() => fetchTodo.start()}>refetch</button>
          </div>
          <p>
            id: <strong>{() => id()}</strong>
            {" — state: "}
            <strong>{() => fetchTodo.state}</strong>
          </p>
          <pre style="background: #f9fafb; padding: 8px; border-radius: 4px; font-size: 0.85em; margin: 0;">
            {() =>
              JSON.stringify(fetchTodo.value ?? fetchTodo.reason, null, 2) ??
              "—"
            }
          </pre>
        </div>
      </div>
    );
  }
}
