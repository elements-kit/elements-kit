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

/** XML namespaces for SVG-namespaced attributes (`xlink:href`, `xml:lang`). */
export const SVGNamespace: Record<string, string> = {
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
};

export const ReservedNameSpaces = new Set(["class", "on", "style", "prop"]);
