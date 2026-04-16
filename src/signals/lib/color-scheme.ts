import { type Computed } from "../index.ts";
import { createMediaSignal } from "./media.ts";

type ColorScheme = "dark" | "light";

/**
 * Returns a `Computed<ColorScheme>` that tracks the user's preferred
 * color scheme via the `prefers-color-scheme` media query.
 */
export function createColorScheme(
  defaultScheme: ColorScheme = "light",
): Computed<ColorScheme> {
  const prefersDark = createMediaSignal(
    "(prefers-color-scheme: dark)",
    defaultScheme === "dark",
  );

  return (() => (prefersDark() ? "dark" : "light")) as Computed<ColorScheme>;
}
