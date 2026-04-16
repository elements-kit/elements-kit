import { App } from "./app";

const appRoot = document.getElementById("app");
appRoot!.appendChild(new App().render());
