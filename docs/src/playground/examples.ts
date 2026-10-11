// Every runnable example in the docs, in sidebar order. Pages embed one with
// `<Playground example="id" />`; /playground lists them all.

export interface Example {
  /** Its folder under ./files (`signals-counter`), or a test file's name (`signals-batch.test`). */
  id: string;
  title: string;
  section: string;
  /** The docs page that explains it. */
  page: string;
}

// Eager and raw: the code is in the server HTML. An app example is a folder
// (`files/<id>/main.tsx` + its modules and styles); a test is one file.
const sources = import.meta.glob<string>(["./files/*/*.{ts,tsx,css}", "./files/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});

const section = (name: string, page: string, items: [id: string, title: string, page?: string][]): Example[] =>
  items.map(([id, title, own]) => ({ id, title, section: name, page: own ?? page }));

export const examples: Example[] = [
  ...section("Signals", "/signals", [
    ["signals-counter", "Counter"],
    ["signals-batch", "Batch"],
    ["signals-cleanup", "onCleanup"],
    ["signals-effect-scope", "effectScope"],
    ["signals-untracked", "untracked"],
    ["signals-signal.test", "signal · tests"],
    ["signals-computed.test", "computed · tests"],
    ["signals-effect.test", "effect · tests"],
    ["signals-effect-scope.test", "effectScope · tests"],
    ["signals-on-cleanup.test", "onCleanup · tests"],
    ["signals-batch.test", "batch · tests"],
    ["signals-untracked.test", "untracked · tests"],
    ["signals-reactive.test", "@reactive · tests"],
  ]),
  ...section("Stores", "/stores", [["stores", "Store"]]),
  ...section("Promise", "/primitives/promise", [
    ["promise-basic", "Basic"],
    ["promise.test", "Tests"],
  ]),
  ...section("Async", "/primitives/async", [
    ["async-flow", "Flow"],
    ["async.test", "Tests"],
  ]),
  ...section("Forms", "/primitives/form-object", [["form-object", "Form object"]]),
  ...section("Elements", "/elements", [
    ["elements", "JSX & elements"],
    ["for-keyed-list", "Keyed list", "/elements/for"],
  ]),
  ...section("Components", "/components", [["components", "Components"]]),
  ...section("Custom elements", "/custom-elements", [
    ["custom-elements", "Overview"],
    ["attributes", "Attributes", "/custom-elements/attributes"],
    ["slots", "Slots", "/custom-elements/slots"],
    ["styling", "Styling", "/custom-elements/styling"],
  ]),
  ...section("Integrations", "/integrations/react", [["react", "React"]]),
  ...section("Examples", "/examples", [
    ["context", "Context", "/examples/context"],
    ["data-fetching", "Data fetching", "/examples/data-fetching"],
    ["infinite-scroll", "Infinite scroll", "/examples/infinite-scroll"],
    ["routing", "Routing", "/examples/routing"],
    ["search", "Search", "/examples/search"],
    ["toasts", "Toasts", "/examples/toasts"],
  ]),
];

export const exampleById = (id: string) => examples.find((e) => e.id === id);

/** The file that holds what the page teaches: first tab, open by default. Else main.tsx. */
const FOCUS: Record<string, string> = {
  "signals-counter": "counter.ts",
  "signals-batch": "state.ts",
  "signals-cleanup": "fetcher.ts",
  "signals-effect-scope": "scope.ts",
  "signals-untracked": "state.ts",
  stores: "cart.ts",
  "promise-basic": "data.ts",
  "async-flow": "search.ts",
  components: "todo-store.ts",
  "custom-elements": "temperature.tsx",
  attributes: "range-display.tsx",
  slots: "CardComponent.tsx",
  styling: "counter.tsx",
  "form-object": "form.ts",
  "data-fetching": "todo.ts",
  "infinite-scroll": "feed.ts",
  routing: "routes.ts",
  search: "search.ts",
  toasts: "toasts.ts",
  react: "App.tsx",
};

/** The example's files in tab order (focus first); `main.tsx` is the entry. */
export function exampleFiles(id: string): Record<string, string> {
  if (id.endsWith(".test")) {
    const source = sources[`./files/${id}.ts`];
    if (source === undefined) throw new Error(`Missing example: ${id}`);
    // Tests run as the entry too; the preview reports them.
    return { "main.tsx": source };
  }
  const prefix = `./files/${id}/`;
  const focus = FOCUS[id] ?? "main.tsx";
  // The focus file, then main.tsx, then the other modules, then the styles.
  const rank = (name: string) => (name === focus ? 0 : name === "main.tsx" ? 1 : name.endsWith(".css") ? 3 : 2);
  const names = Object.keys(sources)
    .filter((path) => path.startsWith(prefix))
    .map((path) => path.slice(prefix.length))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  if (!names.length) throw new Error(`Missing example: ${id}`);
  return Object.fromEntries(names.map((name) => [name, sources[prefix + name]]));
}
