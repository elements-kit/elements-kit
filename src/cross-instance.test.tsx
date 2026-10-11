/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
// Duplicate-runtime-copy safety: bundlers and dev pre-bundling can load two
// copies of the library (e.g. a pre-bundled Astro client entrypoint next to
// source-served subpath imports). Vite query suffixes force real second
// copies of the modules here.
import { describe, it, expect } from "vitest";
import { setRenderer } from "./jsx-runtime/renderer";
import { Fragment, isFragmentComponent } from "./jsx-runtime/fragment";
import { For, isForComponent } from "./for";
import { signal } from "./signals";
import { promise, isReactivePromiseLike } from "./utilities/promise";
import { async, isAsyncLike } from "./utilities/async";

// @ts-expect-error vite query import — intentional duplicate module instance
import * as rendererB from "./jsx-runtime/renderer?copy=b";
// @ts-expect-error vite query import
import * as fragmentB from "./jsx-runtime/fragment?copy=b";
// @ts-expect-error vite query import
import * as forB from "./for?copy=b";
// @ts-expect-error vite query import
import * as signalsB from "./signals/lib?copy=b";
// @ts-expect-error vite query import
import * as promiseB from "./utilities/promise?copy=b";
// @ts-expect-error vite query import
import * as asyncB from "./utilities/async?copy=b";

describe("cross-instance safety (duplicate runtime copies)", () => {
  it("really loaded second copies", () => {
    expect(fragmentB.Fragment).not.toBe(Fragment);
    expect(forB.For).not.toBe(For);
  });

  it("shares the active renderer across copies", () => {
    const renderer = { jsx: () => null };
    setRenderer(renderer);
    try {
      expect(rendererB.getRenderer()).toBe(renderer);
    } finally {
      setRenderer(null);
    }
    expect(rendererB.getRenderer()).toBeNull();
  });

  it("shares mode flags across copies", async () => {
    const libA = await import("./signals/lib");
    const prev = libA.setInertEffects(true);
    try {
      // copy B must observe copy A's flag (and vice versa)
      expect(signalsB.effectsInert()).toBe(true);
      signalsB.setInertEffects(false);
      expect(libA.effectsInert()).toBe(false);
    } finally {
      libA.setInertEffects(prev);
    }
  });

  it("recognizes signals across copies", () => {
    const s = signal(1);
    expect(signalsB.isSignal(s)).toBe(true);
  });

  it("recognizes Fragment and For across copies", () => {
    expect(isFragmentComponent(fragmentB.Fragment)).toBe(true);
    expect(fragmentB.isFragmentComponent(Fragment)).toBe(true);
    expect(isForComponent(forB.For)).toBe(true);
    expect(forB.isForComponent(For)).toBe(true);
  });

  it("recognizes reactive promises and async controllers across copies", () => {
    const p = promise(Promise.resolve(1));
    const op = async(() => Promise.resolve(1));
    expect(promiseB.isReactivePromiseLike(p)).toBe(true);
    expect(asyncB.isAsyncLike(op)).toBe(true);
    expect(isReactivePromiseLike(promiseB.promise(Promise.resolve(2)))).toBe(
      true,
    );
  });
});
