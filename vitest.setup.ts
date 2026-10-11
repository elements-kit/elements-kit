// Node ≥22 ships an experimental `localStorage` global that resolves to
// `undefined` unless `--localstorage-file` is passed. Under vitest `window` is
// `globalThis`, so that getter shadows the Storage the DOM environment
// installs and every `localStorage.*` call throws. `sessionStorage` is not a
// Node global, which is why only the localStorage tests were affected.
//
// Borrow a real Storage from a detached happy-dom Window. Guarded, so this
// disappears on its own once Node stops defining the global unconditionally.
// Imported lazily: the browser project shares this file, and happy-dom can't
// load in a real browser (which always has localStorage).
if (globalThis.localStorage == null) {
  const { Window } = await import("happy-dom");
  Object.defineProperty(globalThis, "localStorage", {
    value: new Window().localStorage,
    configurable: true,
    writable: true,
  });
}

// a module, so the lazy import above can use top-level await
export {};
