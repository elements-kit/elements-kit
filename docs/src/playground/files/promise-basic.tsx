import { promise } from "elements-kit/utilities/promise";

const data = promise<string>((resolve) => {
  setTimeout(() => resolve(`Hello at ${new Date().toLocaleTimeString()}`), 800);
});

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px;">
        <h2 style="margin-top: 0;">promise() — awaitable + reactive</h2>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem;">
          <p>
            State: <strong>{() => data.state}</strong>
          </p>
          <p>
            Value: <code>{() => data.value ?? "—"}</code>
          </p>
        </div>
      </div>
    );
  }
}
