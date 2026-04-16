import { type Computed, signal } from "../index.ts";

type EyeDropperResult = {
  /** Whether the EyeDropper API is supported. */
  isSupported: boolean;
  /** The last picked color as a hex string (`#rrggbb`), or empty string. */
  color: Computed<string>;
  /** Open the eye dropper.  Resolves with the selected color. */
  open(): Promise<string>;
};

/**
 * Reactive wrapper around the EyeDropper API.
 */
export function createEyeDropper(): EyeDropperResult {
  const isSupported = typeof window !== "undefined" && "EyeDropper" in window;
  const color = signal("");

  const open = async (): Promise<string> => {
    if (!isSupported) return "";
    const dropper = new (window as any).EyeDropper();
    const result = await dropper.open();
    color(result.sRGBHex);
    return result.sRGBHex;
  };

  return {
    isSupported,
    color: color as Computed<string>,
    open,
  };
}
