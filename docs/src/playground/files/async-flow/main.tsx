import { query, search } from "./search";

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">async() — lifecycle + console</h2>
        <p style="color: #888;">Watch the console panel as you trigger runs.</p>
        <div style="border: 1px solid #8884; border-radius: 8px; padding: 1rem; display: grid; gap: 0.5rem;">
          <label>
            input:{" "}
            <input
              value={query}
              on:input={(e: Event) =>
                query((e.target as HTMLInputElement).value)
              }
            />
          </label>
          <div>
            <button on:click={() => search.start()}>start</button>
            <button on:click={() => search.stop()}>stop</button>
          </div>
          <p>
            state: <strong>{() => search.state}</strong>
          </p>
          <p>
            value: <code>{() => search.value ?? "—"}</code>
          </p>
        </div>
      </div>
    );
  }
}
