import {
  Properties as BaseProperties,
  ChildProperties,
  SVGNamespace,
} from "dom-expressions/src/constants";

/**
 * IDL properties that take precedence over the default `setAttribute` path.
 *
 * Extends dom-expressions' base set with `defaultValue` — without it, JSX
 * `<input defaultValue="x" />` falls through to `setAttribute("defaultValue",
 * "x")` and creates a useless `defaultvalue` HTML attribute (native
 * `HTMLInputElement` has no such content attribute; its `defaultValue` IDL
 * property reflects the `value` content attribute instead).
 */
export const Properties: Set<string> = new Set([
  ...BaseProperties,
  "defaultValue",
]);

export { ChildProperties, SVGNamespace };

export const ReservedNameSpaces = new Set(["class", "on", "style", "prop"]);
