import { mountSandpack } from "./playground";

class App {
  render() {
    return (
      <div style="font-family: system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px">
        <h1>elements-kit JSX Demo</h1>
      </div>
    ) as Element;
  }
}

// ─ Mount ─────────────────────────────────────────────────────────────────────
const appRoot = document.getElementById("app")!;
appRoot.appendChild(new App().render());

const sandpackContainer = document.createElement("div");
appRoot.appendChild(sandpackContainer);
mountSandpack(sandpackContainer);
