import { scope } from "@/signals/scope";

/**
 * Mount a node into `target` with a scoped lifetime.
 *
 * `setup` runs inside a detached `effectScope`. The returned node is appended
 * to `target`. Calling the returned `unmount` removes the node from the DOM,
 * disposes its `Symbol.dispose` hook (JSX-created elements carry one), and
 * tears down every `effect` / `onCleanup` registered inside `setup`.
 *
 * @example
 * ```tsx
 * import { render } from "elements-kit/render";
 *
 * const unmount = render(document.getElementById("app")!, () => <App />);
 * // later
 * unmount();
 * ```
 */
export function render(
  target: Element | DocumentFragment,
  setup: () => Node | null | undefined,
): () => void {
  const [result, stop] = scope(setup);
  if (result) target.appendChild(result);
  return () => {
    if (result) {
      (result as unknown as Partial<Disposable>)[Symbol.dispose]?.();
      (result as ChildNode).remove?.();
    }
    stop();
  };
}
