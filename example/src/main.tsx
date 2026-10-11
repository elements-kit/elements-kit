import { render } from "elements-kit/render";
import { App } from "./app";

// Mount through JSX rather than `new App().render()`: the dev JSX runtime
// gives every component a hot-swappable boundary, so editing app.tsx replaces
// the tree in place instead of reloading the page.
render(document.getElementById("app")!, () => <App />);
