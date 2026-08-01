/**
 * Development JSX runtime — `elements-kit/jsx-dev-runtime`.
 *
 * Identical to `elements-kit/jsx-runtime` except that components render
 * through a hot-swappable boundary (see {@link createHotElement}). The
 * automatic JSX transform picks this entry in dev and the plain runtime in
 * production, so the indirection costs shipped code nothing.
 */
export * from "./index";

import { createHotElement } from "./hot";

export {
  createHotElement as jsx,
  createHotElement as jsxs,
  createHotElement as jsxDEV,
  createHotElement as h,
};
