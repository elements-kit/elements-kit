import { effect, isReactive } from "../signals";
import { on } from "../utilities/event-listener.ts";
import {
  ChildProperties,
  Properties,
  ReservedNameSpaces,
  svgNamespace,
} from "./constants";
import { applyChildren, Children, isChildrenProperty } from "./children";
import * as CSS from "csstype";
import { JSX } from "elements-kit/jsx-runtime";

/** A resolved runtime node — what `applyProps` / `applyChildren` operate on. */
export type PropsTarget = JSX.Element | JSX.ElementClass;

// ─ JSX namespaces — extras layered onto every intrinsic element ─────────────
interface CSSProperties extends CSS.PropertiesHyphen {
  [key: `-${string}`]: string | number | undefined;
}

type CssStyleKey =
  Extract<keyof CSSProperties, string> extends infer K
    ? K extends `-${string}`
      ? never
      : K
    : never;

type StyleNamespace = {
  [K in CssStyleKey as `style:${K}`]?: CSSProperties[K] | null;
};

type PropNamespace<E> = {
  [K in keyof E as K extends string ? `prop:${K}` : never]?: E[K];
};

type XlinkAttrs = {
  "xlink:href"?: string | undefined;
  "xlink:title"?: string | undefined;
  "xlink:show"?: "new" | "replace" | "embed" | "other" | "none" | undefined;
  "xlink:role"?: string | undefined;
  "xlink:type"?:
    | "simple"
    | "extended"
    | "locator"
    | "arc"
    | "resource"
    | "title"
    | undefined;
  "xlink:arcrole"?: string | undefined;
  "xlink:actuate"?: "onLoad" | "onRequest" | "other" | "none" | undefined;
};

type ClassNamespace = {
  [K in `class:${string}`]?: boolean;
};
type XmlAttrs = {
  "xml:lang"?: string | undefined;
  "xml:space"?: "default" | "preserve" | undefined;
  "xml:base"?: string | undefined;
};

// SVG-only namespaced attributes. The runtime routes any `xlink:*` / `xml:*`
// key through `setAttributeNS` (see `applyProps` below), but spec-wise these
// only apply to SVG content — so the types are only intersected onto
// IntrinsicElements whose concrete element type extends SVGElement.
export type SvgNamespaceAttrs = XlinkAttrs & XmlAttrs;

// Object form of the `style` ATTRIBUTE is applied with
// `Object.assign(el.style, value)` (see `applyStyle`) — CSSStyleDeclaration
// fields are camelCase, so the object type is csstype's camelCase
// `Properties` (hyphenated keys would silently no-op). The `style:prop`
// NAMESPACE goes through `setProperty` instead, hence hyphenated keys there.
interface StyleAttrObject extends CSS.Properties {}

// Style props only exist on elements that carry inline style —
// `ElementCSSInlineStyle` is the DOM interface providing `.style`
// (HTML/SVG/MathML). A bare `Element` gets neither form.
type JsxNamespaces<E extends Element = Element> =
  (E extends ElementCSSInlineStyle
    ? { style?: string | StyleAttrObject } & StyleNamespace
    : {}) &
    PropNamespace<Omit<E, "children">> &
    ClassNamespace;

type JsxNamespaceKeys =
  | "style"
  | `class:${string}`
  | `style:${string}`
  | `prop:${string}`;

export type WithJsxNamespaces<T, E extends Element = Element> = Omit<
  T,
  JsxNamespaceKeys
> &
  JsxNamespaces<E>;

export function applyProps(
  node: PropsTarget,
  props: Record<string, unknown>,
): void {
  const entries = Object.entries(props);
  if (entries.length === 0) return;
  // Bare `class`/`style` first, whatever the source order: they seed the tokens
  // that `class:*` and `style:*` add to, which is the order the server emits.
  const base = (k: string) => (k === "class" || k === "style" ? 0 : 1);
  entries.sort((a, b) => base(a[0]) - base(b[0]));
  for (const [key, value] of entries) {
    // ─ Children
    if (isChildrenProperty(node, key)) {
      applyChildren(node, key, value as Children);
      continue;
    }

    // ─ Single namespace split: shared by event + setProp paths ───────────────
    const colonIdx = key.indexOf(":");
    const ns = colonIdx > 0 ? key.slice(0, colonIdx) : "";

    if (ns === "on") {
      const evName = key.slice(colonIdx + 1);
      if (isReactive(value)) {
        effect(() => {
          on(node as EventTarget, evName, value() as EventListener);
        });
      } else {
        on(node as EventTarget, evName, value as EventListener);
      }
      continue;
    }

    if (isReactive(value)) {
      effect(() => setProp(node, key, value()));
      continue;
    }

    setProp(node, key, value);
  }
}

function setProp(node: PropsTarget, key: string, value: unknown): void {
  // ─ Namespaced keys ────────────────────────────────────────────────────────
  const colonIdx = key.indexOf(":");
  if (colonIdx > -1) {
    const ns = key.slice(0, colonIdx);
    const name = key.slice(colonIdx + 1);

    if (ReservedNameSpaces.has(ns)) {
      if (ns === "prop") {
        (node as unknown as Record<string, unknown>)[name] = value;
        return;
      }
      if (ns === "class") {
        (node as HTMLElement).classList.toggle(name, Boolean(value));
        return;
      }
      if (ns === "style") {
        const css = value == null || value === false ? null : String(value);
        setStyleProperty(node as HTMLElement, name, css);
        nsStyles(node as Element).set(name, css);
        return;
      }
      // "on" namespace: handled above by isEventKey
      return;
    }

    // SVG namespaced attributes (xlink:href, xml:lang, …)
    const svgNs = svgNamespace(ns);
    if (svgNs) {
      (node as Element).setAttributeNS(svgNs, key, String(value ?? ""));
      return;
    }
  }

  // ─ Special props ──────────────────────────────────────────────────────────
  if (key === "class") {
    applyClass(node as HTMLElement, value);
    return;
  }
  if (key === "style") {
    applyStyle(node as Element, value);
    return;
  }

  // ─ ChildProperties: innerHTML, textContent, innerText ────────────────────
  if (ChildProperties.has(key)) {
    (node as unknown as Record<string, unknown>)[key] = value ?? "";
    return;
  }

  // ─ Properties: value, checked, selected, muted, defaultValue, … ─────────
  if (!(node instanceof SVGElement) && Properties.has(key)) {
    (node as unknown as Record<string, unknown>)[key] = value;
    return;
  }

  // ─ Custom element own properties ─────────────────────────────────────────
  if (node instanceof Element && node.nodeName.includes("-") && key in node) {
    try {
      (node as unknown as Record<string, unknown>)[key] = value;
    } catch {
      setAttribute(node, key, value);
    }
    return;
  }

  // ─ Plain class component: set as property ────────────────────────────────
  if (!(node instanceof Element)) {
    (node as unknown as Record<string, unknown>)[key] = value;
    return;
  }

  // ─ Default: setAttribute ─────────────────────────────────────────────────
  setAttribute(node, key, value);
}

/** Tokens the bare `class` prop last wrote, per element. */
const ownedClasses = new WeakMap<Element, string[]>();

/**
 * Apply the bare `class` prop without clobbering `class:*` toggles. Assigning
 * `className` would drop them — and drop them again on every reactive update —
 * so only the tokens this prop owns are diffed. Matches the server renderer,
 * which merges `class` and `class:*` into one attribute.
 */
function applyClass(el: HTMLElement, value: unknown): void {
  const next = String(value ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const prev = ownedClasses.get(el);
  if (prev) for (const c of prev) if (!next.includes(c)) el.classList.remove(c);
  for (const c of next) el.classList.add(c);
  ownedClasses.set(el, next);
}

// `class` can diff its own tokens because a class string splits on whitespace.
// CSS text does not parse that cheaply, so `style` records what `style:*` set
// and re-applies it after the base write instead.

/** Properties set through `style:*`, per element, so they can be re-applied. */
const styleNamespaces = new WeakMap<Element, Map<string, string | null>>();

function nsStyles(el: Element): Map<string, string | null> {
  let m = styleNamespaces.get(el);
  if (!m) styleNamespaces.set(el, (m = new Map()));
  return m;
}

function setStyleProperty(el: HTMLElement, name: string, css: string | null) {
  if (css === null) el.style.removeProperty(name);
  else el.style.setProperty(name, css);
}

/**
 * Apply the bare `style` prop, then restore any `style:*` properties. The string
 * form assigns `cssText`, which drops them — and would drop them again on every
 * reactive update. Matches the server, which merges `style` and `style:*`.
 */
function applyStyle(el: Element, value: unknown): void {
  const s = (el as HTMLElement).style;
  if (!s) return;
  if (typeof value === "string") s.cssText = value;
  else if (value && typeof value === "object") Object.assign(s, value);
  const ns = styleNamespaces.get(el);
  if (ns)
    for (const [name, css] of ns) setStyleProperty(el as HTMLElement, name, css);
}

function setAttribute(el: Element, key: string, value: unknown): void {
  if (value == null || value === false) {
    if (el.hasAttribute(key)) el.removeAttribute(key);
    return;
  }
  const next = value === true ? "" : String(value);
  if (el.getAttribute(key) === next) return;
  el.setAttribute(key, next);
}
