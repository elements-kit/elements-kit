import { signal } from "elements-kit/signals";
import { async } from "elements-kit/utilities/async";

const query = signal("hello");

const search = async(async () => {
  const input = query();
  console.log(`[async] run input="${input}"`);
  await new Promise((r) => setTimeout(r, 500));
  const result = `result for "${input}"`;
  console.log(`[async] done →`, result);
  return result;
}).start();

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">async() — lifecycle + console</h2>
        <p style="color: #666;">Watch the console panel as you trigger runs.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; display: grid; gap: 0.5rem;">
          <label>
            input:{" "}
            <input
              value={query}
              onInput={(e: Event) =>
                query((e.target as HTMLInputElement).value)
              }
            />
          </label>
          <div>
            <button onClick={() => search.start()}>start</button>
            <button onClick={() => search.stop()}>stop</button>
          </div>
          <p>
            state: <strong>{() => search.state}</strong>
          </p>
          <p>
            value: <code>{() => search.value ?? "—"}</code>
          </p>
        </div>
      </div>
    ) as Element;
  }
}
