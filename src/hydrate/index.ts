import { effectScope, untracked } from "../signals";
import { setDeferAsyncRuns } from "../signals/lib";
import { flushDeferredAsyncRuns } from "../utilities/async";
import { setRenderer } from "../jsx-runtime/renderer";
import {
  claimChildren,
  claimRenderer,
  setHydrationContext,
  type HydrationData,
  type MismatchInfo,
  type OnMismatch,
} from "./claim";

export type { MismatchInfo, OnMismatch };

export interface HydrateOptions {
  /**
   * Called when the server DOM does not match the component tree. The
   * mismatched subtree is discarded and rendered fresh; the caller owns
   * logging/reporting.
   */
  onMismatch?: OnMismatch;
}

export interface HydrateResult {
  /** Tear down every effect, handler and live binding wired by hydration. */
  dispose: () => void;
}

/**
 * Make server-rendered HTML interactive by re-executing the component tree
 * in claim mode: existing DOM nodes are adopted instead of rebuilt, `on:`
 * handlers attach to the claimed nodes, and dynamic children bind live to
 * the server-emitted slot markers.
 *
 * The component code runs once on the client (closures are recreated by
 * re-execution — no serialized handlers). Async children keep their
 * server-rendered content visible until the client-side value settles.
 *
 * Server/client trees must match; on mismatch the affected subtree is
 * rendered fresh and `options.onMismatch` is invoked.
 *
 * @example
 * ```tsx
 * const { dispose } = hydrate(document.getElementById("app")!, () => <App />);
 * ```
 */
export function hydrate(
  container: Element,
  app: () => unknown,
  options: HydrateOptions = {},
): HydrateResult {
  const data = readHydrationData(container);
  let dispose!: () => void;
  untracked(() => {
    dispose = effectScope(() => {
      setRenderer(claimRenderer);
      const prevDefer = setDeferAsyncRuns(true);
      let root: unknown;
      try {
        root = app();
      } finally {
        setRenderer(null);
        setDeferAsyncRuns(prevDefer);
      }
      const prevCtx = setHydrationContext({ counter: 0, data });
      try {
        claimChildren(container, root, options.onMismatch);
      } finally {
        setHydrationContext(prevCtx);
        // Deferred runs the walk never claimed (instances not rendered as
        // children) still execute — inside this scope, so their effects
        // dispose with the hydration result.
        flushDeferredAsyncRuns();
      }
    });
  });
  return { dispose };
}

/**
 * Locate and parse the server's ek-data script. Malformed or absent data
 * degrades to no seeding — async values settle through their own client
 * execution instead.
 */
function readHydrationData(container: Element): HydrationData | null {
  const script =
    container.querySelector('script[type="application/json"]#ek-data') ??
    container.ownerDocument?.getElementById("ek-data");
  if (!script?.textContent) return null;
  try {
    return JSON.parse(script.textContent) as HydrationData;
  } catch {
    return null;
  }
}
