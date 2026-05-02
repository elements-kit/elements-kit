import { effect, isReactive } from "../signals";
import { on } from "../utilities/event-listener.ts";
import { Child, PropsTarget } from "./types";
import {
  ChildProperties,
  Properties,
  ReservedNameSpaces,
  SVGNamespace,
} from "./constants";
import { applyChildren, isChildrenProperty } from "./children";

export function applyProps(
  node: PropsTarget,
  props: Record<string, unknown>,
): void {
  const entries = Object.entries(props);
  if (entries.length === 0) return;
  for (const [key, value] of entries) {
    // ─ Children (slot:name, Slot properties) ──────────────────────────────────
    if (isChildrenProperty(node, key)) {
      applyChildren(node, key, value as Child);
      continue;
    }

    // ─ Single namespace split: shared by event + setProp paths ───────────────
    const colonIdx = key.indexOf(":");
    const ns = colonIdx > 0 ? key.slice(0, colonIdx) : "";

    if (ns === "on") {
      const evName = key.slice(colonIdx + 1);
      if (isReactive(value)) {
        effect(() => {
          on(node as Element, evName, value() as EventListener);
        });
      } else {
        on(node as Element, evName, value as EventListener);
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
        if (value == null || value === false)
          (node as HTMLElement).style.removeProperty(name);
        else (node as HTMLElement).style.setProperty(name, String(value));
        return;
      }
      // "on" namespace: handled above by isEventKey
      return;
    }

    // SVG namespaced attributes (xlink:href, xml:lang, …)
    const svgNs = (SVGNamespace as Record<string, string>)[ns];
    if (svgNs) {
      (node as Element).setAttributeNS(svgNs, key, String(value ?? ""));
      return;
    }
  }

  // ─ Special props ──────────────────────────────────────────────────────────
  if (key === "class") {
    (node as HTMLElement).className = String(value ?? "");
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

function applyStyle(el: Element, value: unknown): void {
  const s = (el as HTMLElement).style;
  if (!s) return;
  if (typeof value === "string") s.cssText = value;
  else if (value && typeof value === "object") Object.assign(s, value);
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
