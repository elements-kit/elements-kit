import type { Component } from "./types";

/**
 * Alternative jsx handler installed by `elements-kit/server` (string
 * emission) and `elements-kit/hydrate` (DOM claiming). When active, every
 * jsx/jsxs/h call routes here instead of the default DOM path.
 */
export interface Renderer {
  jsx(type: string | Component, props: Record<string, unknown>): unknown;
}

let activeRenderer: Renderer | null = null;

/** Install or clear (`null`) the active renderer. */
export function setRenderer(renderer: Renderer | null): void {
  activeRenderer = renderer;
}

export function getRenderer(): Renderer | null {
  return activeRenderer;
}
