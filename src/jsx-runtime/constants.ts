// Inlined from dom-expressions to drop the runtime dependency. Keep in sync
// with upstream when adding new IDL properties or SVG namespaces; the upstream
// list lives at `dom-expressions/src/constants.js`.

/**
 * IDL properties that take precedence over the default `setAttribute` path.
 *
 * Includes camelCase boolean aliases (`readOnly`, `noValidate`, …) plus
 * lowercase boolean attributes that should be set as properties for correct
 * reflection. `defaultValue` is added on top — without it, `<input
 * defaultValue="x" />` falls through to `setAttribute("defaultValue", "x")`
 * which creates a useless `defaultvalue` content attribute (native
 * `HTMLInputElement` has no such attribute; the IDL property reflects `value`).
 */
export const Properties: Set<string> = new Set([
  // locked to properties
  "className",
  "value",

  // booleans with camelCase
  "readOnly",
  "noValidate",
  "formNoValidate",
  "isMap",
  "noModule",
  "playsInline",

  "adAuctionHeaders",
  "allowFullscreen",
  "browsingTopics",
  "defaultChecked",
  "defaultMuted",
  "defaultSelected",
  "disablePictureInPicture",
  "disableRemotePlayback",
  "preservesPitch",
  "shadowRootClonable",
  "shadowRootCustomElementRegistry",
  "shadowRootDelegatesFocus",
  "shadowRootSerializable",
  "sharedStorageWritable",

  // lowercase booleans
  "allowfullscreen",
  "async",
  "alpha",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "hidden",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected",
  "adauctionheaders",
  "browsingtopics",
  "credentialless",
  "defaultchecked",
  "defaultmuted",
  "defaultselected",
  "defer",
  "disablepictureinpicture",
  "disableremoteplayback",
  "preservespitch",
  "shadowrootclonable",
  "shadowrootcustomelementregistry",
  "shadowrootdelegatesfocus",
  "shadowrootserializable",
  "sharedstoragewritable",

  // local addition
  "defaultValue",
]);

/** Properties whose assignment replaces the element's children. */
export const ChildProperties: Set<string> = new Set([
  "innerHTML",
  "textContent",
  "innerText",
  "children",
]);

/**
 * Returns the XML namespace URI for an SVG-namespaced attribute prefix
 * (`xlink:href`, `xml:lang`). Inlined as a function to avoid a 2-entry object
 * allocation and the property lookup on every attribute write.
 */
export function svgNamespace(ns: string): string | undefined {
  if (ns === "xlink") return "http://www.w3.org/1999/xlink";
  if (ns === "xml") return "http://www.w3.org/XML/1998/namespace";
  return undefined;
}

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
export const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";

/**
 * Tag names that must be created in the SVG namespace. `document.createElement`
 * (no namespace) produces an HTMLUnknownElement for these and the browser
 * won't paint the visual; createElementNS is required. Ambiguous tags that
 * exist in both HTML and SVG (`a`, `script`, `style`, `title`) are deliberately
 * left out and default to HTML — consumers using the SVG variants are rare and
 * can build them imperatively.
 */
export const SvgElements: Set<string> = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "defs",
  "use",
  "symbol",
  "text",
  "tspan",
  "textPath",
  "mask",
  "clipPath",
  "linearGradient",
  "radialGradient",
  "stop",
  "pattern",
  "marker",
  "image",
  "foreignObject",
  "switch",
  "desc",
  "metadata",
  "view",
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "animate",
  "animateMotion",
  "animateTransform",
  "set",
  "mpath",
]);

/**
 * Tag names that must be created in the MathML namespace. Same problem as
 * `SvgElements` — `document.createElement("math")` is an HTMLUnknownElement,
 * formulae render only when created via `createElementNS(MATHML_NAMESPACE, …)`.
 */
export const MathMLElements: Set<string> = new Set([
  "math",
  "annotation",
  "annotation-xml",
  "maction",
  "menclose",
  "merror",
  "mfenced",
  "mfrac",
  "mi",
  "mmultiscripts",
  "mn",
  "mo",
  "mover",
  "mpadded",
  "mphantom",
  "mprescripts",
  "mroot",
  "mrow",
  "ms",
  "mspace",
  "msqrt",
  "mstyle",
  "msub",
  "msubsup",
  "msup",
  "mtable",
  "mtd",
  "mtext",
  "mtr",
  "munder",
  "munderover",
  "semantics",
]);

export const ReservedNameSpaces = new Set(["class", "on", "style", "prop"]);
