import { onCleanup } from "../signals";

/**
 * Used by the JSX transform for `<>...</>` fragments.
 *
 * createElement wraps this in effectScope + attachDisposables, so children's
 * Symbol.dispose functions are collected via onCleanup and fired when the
 * fragment's own dispose is called.
 */
export function Fragment(props: { children?: unknown }): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const raw = props.children;
  if (raw == null) return fragment;

  const nodes = Array.isArray(raw) ? (raw as unknown[]).flat(Infinity) : [raw];
  const disposes: (() => void)[] = [];

  for (const child of nodes) {
    if (!(child instanceof Node)) continue;
    const dispose = (child as unknown as Partial<Disposable>)[Symbol.dispose];
    if (dispose) disposes.push(dispose);
    fragment.appendChild(child);
  }

  // Register on the effectScope created by createElement — fired when the
  // fragment's Symbol.dispose is called, propagating disposal to all children.
  if (disposes.length) onCleanup(() => disposes.forEach((fn) => fn()));

  return fragment;
}
