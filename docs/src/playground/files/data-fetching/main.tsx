import { id, fetchTodo } from "./todo";

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">Data fetching — async + reactive input</h2>
        <div style="border: 1px solid #8884; border-radius: 8px; padding: 1rem; display: grid; gap: 0.5rem;">
          <div style="display: flex; gap: 8px;">
            <button on:click={() => id(id() + 1)}>next id</button>
            <button on:click={() => fetchTodo.start()}>refetch</button>
          </div>
          <p>
            id: <strong>{() => id()}</strong>
            {" — state: "}
            <strong>{() => fetchTodo.state}</strong>
          </p>
          <pre style="background: #8881; padding: 8px; border-radius: 4px; font-size: 0.85em; margin: 0;">
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
