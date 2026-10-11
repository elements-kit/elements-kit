import { show } from "./toasts";
import { ToastStack } from "./ToastStack";

export class App {
  render() {
    return (
      <div style="padding: 1.5rem; font-family: system-ui, sans-serif; max-width: 640px; position: relative; min-height: 320px;">
        <h2 style="margin-top: 0;">Toast queue</h2>
        <p style="color: #888; margin: 0 0 1rem;">
          Each toast owns an <code>effectScope</code>. Closing it disposes
          the scope, which cancels the timer.
        </p>
        <div style="display: flex; gap: 8px;">
          <button on:click={() => show("Saved.", "success")}>success</button>
          <button on:click={() => show("Heads up.", "info")}>info</button>
          <button on:click={() => show("Quota exceeded.", "warn", 5000)}>
            warn (5s)
          </button>
        </div>
        <ToastStack />
      </div>
    );
  }
}
