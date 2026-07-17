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
