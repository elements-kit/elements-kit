import { effectScope, untracked } from "../signals";
import { setRenderer } from "../jsx-runtime/renderer";
import {
  claimChildren,
  claimRenderer,
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
  let dispose!: () => void;
  untracked(() => {
    dispose = effectScope(() => {
      setRenderer(claimRenderer);
      let root: unknown;
      try {
        root = app();
      } finally {
        setRenderer(null);
      }
      claimChildren(container, root, options.onMismatch);
    });
  });
  return { dispose };
}
