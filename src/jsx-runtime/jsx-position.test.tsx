/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
/**
 * Type tests in REAL JSX position. Object-literal assignments (infer.test.ts)
 * bypass parts of the JSX checker — notably IntrinsicAttributes intersection
 * and contextual param inference — so regressions there only show up here.
 * The `x-range` registry entry comes from infer.test.ts.
 */
import { describe, it, expect } from "vitest";
import { computed, signal } from "../signals";

type Assert<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

const v = signal(50);

// ─ Intrinsics ────────────────────────────────────────────────────────────────

// `ref` param inferred as the concrete element — a second ref declaration
// anywhere (e.g. IntrinsicAttributes) degrades this to a union / implicit any.
const _form = (
  <form
    ref={(el) => {
      type _T = Assert<Equal<typeof el, HTMLFormElement>>;
      void el;
    }}
  />
);

// style object is camelCase (runtime applies via Object.assign(el.style, v))
const _styled = <div style={{ backgroundColor: "blue", maxWidth: "10rem" }} />;
const _styled_sig = <div style={() => ({ fontFamily: "monospace" })} />;
const _styled_str = <div style="color: red" />;

// nested + reactive children
const _kids = <ul>{[<li />, [<li />, () => "x"]]}</ul>;

// Native DOM event handlers are NOT wired by the runtime — only the `on:`
// namespace is (applyProps routes a bare `onClick` to setAttribute, a silent
// no-op). The types reject both camelCase and lowercase forms so the broken
// usage can't compile; `on:click` is the supported form.
// @ts-expect-error — camelCase `onClick` is not a valid intrinsic prop
const _noCamelEvent = <button onClick={() => void 0} />;
// @ts-expect-error — lowercase `onclick` is likewise rejected
const _noLowerEvent = <button onclick={() => void 0} />;
const _onColonEvent = <button on:click={() => void 0} />;
void _noCamelEvent;
void _noLowerEvent;
void _onColonEvent;

// Solid-only forms the runtime never wires are stripped from intrinsics too:
// `classList` (object form — was a concrete key) and the empty `use:`/`attr:`/
// `bool:`/`oncapture:` namespaces. All must be rejected; `class:`, `on:`, and
// `aria-*` remain the supported surface.
// @ts-expect-error — classList object form removed; use class:name={bool}
const _noClassList = <div classList={{ active: true }} />;
// @ts-expect-error — Solid `use:` directives are not implemented
const _noUse = <div use:x={1} />;
// @ts-expect-error — forced `attr:` namespace is not implemented
const _noAttr = <div attr:foo="x" />;
// @ts-expect-error — boolean `bool:` namespace is not implemented
const _noBool = <div bool:foo={true} />;
// @ts-expect-error — capture-phase `oncapture:` events are not implemented
const _noCapture = <div oncapture:click={() => void 0} />;
const _supported = (
  <div aria-hidden="true" class:active={true} on:click={() => void 0} />
);
void _noClassList;
void _noUse;
void _noAttr;
void _noBool;
void _noCapture;
void _supported;

// ─ Registered custom elements ────────────────────────────────────────────────

const _xr = (
  <x-range
    min={0}
    max={() => 100}
    value={v}
    variant="compact"
    class:active={() => true}
    style:color={() => "red"}
    prop:value={() => 42}
    on:commit={(_e) => void 0}
    on:ready={computed(() => (_e: CustomEvent<number>) => void 0)}
    header={<h1>title</h1>}
    ref={(el) => {
      type _T = Assert<Equal<typeof el.min, number>>;
      void el;
    }}
  >
    {() => v()}
  </x-range>
);

// @ts-expect-error — unknown prop rejected on registered elements
const _xr_bad = <x-range nope={1} />;

void _form;
void _styled;
void _styled_sig;
void _styled_str;
void _kids;
void _xr;
void _xr_bad;

describe("jsx-position types", () => {
  it("compiles (assertions are type-level)", () => {
    expect(true).toBe(true);
  });
});
