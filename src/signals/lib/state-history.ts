import { type Computed, effect, signal } from "../index.ts";

type StateHistoryResult<T> = {
  history: Computed<T[]>;
  index: Computed<number>;
  canUndo: Computed<boolean>;
  canRedo: Computed<boolean>;
  undo(): void;
  redo(): void;
  clear(): void;
};

/**
 * Tracks the history of a reactive getter, providing `undo` and `redo`.
 *
 * @param getter - A reactive getter whose value is tracked.
 * @param capacity - Maximum number of history entries (default: 100).
 */
export function createStateHistory<T>(
  getter: () => T,
  capacity = 100,
): StateHistoryResult<T> {
  const history = signal<T[]>([getter()]);
  const index = signal(0);

  // Prevent internal undo/redo writes from being recorded.
  let paused = false;
  let firstRun = true;

  effect(() => {
    const next = getter();
    if (paused) return;
    if (firstRun) {
      firstRun = false;
      return;
    }

    const hist = history();
    const idx = index();

    // Drop any "future" entries beyond the current index.
    const trimmed = hist.slice(0, idx + 1);
    trimmed.push(next);

    if (trimmed.length > capacity) trimmed.shift();

    history(trimmed);
    index(trimmed.length - 1);
  });

  const canUndo = () => index() > 0;
  const canRedo = () => index() < history().length - 1;

  const undo = () => {
    if (!canUndo()) return;
    paused = true;
    index(index() - 1);
    paused = false;
  };

  const redo = () => {
    if (!canRedo()) return;
    paused = true;
    index(index() + 1);
    paused = false;
  };

  const clear = () => {
    const current = getter();
    paused = true;
    history([current]);
    index(0);
    paused = false;
  };

  return {
    history: history as Computed<T[]>,
    index: index as Computed<number>,
    canUndo: canUndo as Computed<boolean>,
    canRedo: canRedo as Computed<boolean>,
    undo,
    redo,
    clear,
  };
}
