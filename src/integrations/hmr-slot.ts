/**
 * Where the dev HMR registry lives.
 *
 * Its own module because the three users can't share one: the client
 * entrypoint needs the key but must not pull in the registry (which would drag
 * `render` and the island bookkeeping into production bundles), and the Vite
 * plugin runs in Node and only ever emits the name into generated source.
 *
 * `Symbol.for` rather than a fresh symbol: duplicate module copies (dev
 * pre-bundling, mixed chunks) have to land on the same slot or a swap would
 * miss islands the other copy mounted — same reasoning as the active renderer.
 */
export const HMR_SLOT_NAME = "elements-kit.hmr";

export const HMR_SLOT = Symbol.for(HMR_SLOT_NAME);
