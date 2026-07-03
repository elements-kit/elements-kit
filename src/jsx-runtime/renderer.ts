import type { Component } from "./types";

/**
 * Alternative jsx handler installed by `elements-kit/server` (string
 * emission) and `elements-kit/hydrate` (DOM claiming). When active, every
 * jsx/jsxs/h call routes here instead of the default DOM path.
 */
export interface Renderer {
  jsx(type: string | Component, props: Record<string, unknown>): unknown;
}

// The active renderer lives on globalThis so duplicate runtime copies (dev
// pre-bundling, mixed chunks) dispatch consistently — a renderer installed
// by one copy must be seen by jsx calls flowing through another.
const ACTIVE_RENDERER = Symbol.for("elements-kit.active-renderer");
const slot = globalThis as Record<symbol, Renderer | null | undefined>;

/** Install or clear (`null`) the active renderer. */
export function setRenderer(renderer: Renderer | null): void {
  slot[ACTIVE_RENDERER] = renderer;
}

export function getRenderer(): Renderer | null {
  return slot[ACTIVE_RENDERER] ?? null;
}
