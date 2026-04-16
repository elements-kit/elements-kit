import { type Computed, signal } from "../index.ts";

type ClipboardResult = {
  copied: Computed<boolean>;
  value: Computed<string | null>;
  copy(text: string): Promise<void>;
};

/**
 * Provides a `copy(text)` helper that writes to the clipboard.
 * `copied` is `true` for 1 500 ms after a successful copy.
 */
export function createClipboard(resetDelay = 1_500): ClipboardResult {
  const copied = signal(false);
  const value = signal<string | null>(null);
  let timer: ReturnType<typeof setTimeout>;

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    clearTimeout(timer);
    value(text);
    copied(true);
    timer = setTimeout(() => copied(false), resetDelay);
  };

  return {
    copied: copied as Computed<boolean>,
    value: value as Computed<string | null>,
    copy,
  };
}
