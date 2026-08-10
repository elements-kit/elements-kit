// Node ≥22 ships an experimental `localStorage` global that resolves to
// `undefined` unless `--localstorage-file` is passed. Under vitest `window` is
// `globalThis`, so that getter shadows the Storage the DOM environment
// installs and every `localStorage.*` call throws. `sessionStorage` is not a
// Node global, which is why only the localStorage tests were affected.
//
// Borrow a real Storage from a detached happy-dom Window. Guarded, so this
// disappears on its own once Node stops defining the global unconditionally.
import { Window } from "happy-dom";

if (globalThis.localStorage == null) {
  Object.defineProperty(globalThis, "localStorage", {
    value: new Window().localStorage,
    configurable: true,
    writable: true,
  });
}
