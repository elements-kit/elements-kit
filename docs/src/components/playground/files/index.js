import { App } from "./main.tsx";
// ─ Mount ─────────────────────────────────────────────────────────────────────
const appRoot = document.getElementById("app");
appRoot.appendChild(new App().render());
