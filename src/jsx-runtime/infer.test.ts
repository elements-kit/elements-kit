import { it, expect } from "vitest";
import { ATTRIBUTES, type Attributes } from "../attributes";
import { SLOTS, Slots } from "../slot";
import type { Child } from "./types";
import { signal, type MaybeReactive } from "../signals";
import type { JSX } from "./index";
import type {
  ComponentProps,
  ElementProps,
  MaybeReactiveProps,
  Props,
  PropsOfInstance,
  RawProps,
  ReactiveProps,
  Require,
  ResolveProps,
} from "./infer";
import type { Computed } from "../signals";

// ─ Type-level assertion helpers ───────────────────────────────────────────────

type Assert<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Extends<A, B> = A extends B ? true : false;
type HasKey<O, K extends PropertyKey> = K extends keyof O ? true : false;

// ─ Fixtures ───────────────────────────────────────────────────────────────────

class XRange extends HTMLElement {
  static [ATTRIBUTES] = {
    min(this: XRange, _v: string | null) {},
    max(this: XRange, _v: string | null) {},
    variant(this: XRange, _v: string | null) {},
  } satisfies Attributes<XRange>;
  declare static events: {
    commit: CustomEvent<void>;
    ready: CustomEvent<number>;
  };
  declare [SLOTS]: Slots<"header" | "footer">;

  min = 0;
  max = 100;
  value = 50;
}

class Toggle extends HTMLElement {
  open = false;
  onToggle: (v: boolean) => void = () => {};
}

class NoChildren extends HTMLElement {
  static children = undefined as never;
  value = 1;
}

class Card {
  constructor(public props: { title: string; count?: number }) {}
  render() {
    return null;
  }
}

// ─ PropsOfInstance ────────────────────────────────────────────────────────────

type TProps = PropsOfInstance<Toggle>;
type _PoI_Open = Assert<Equal<TProps["open"], boolean | undefined>>;
type _PoI_OnToggle = Assert<
  Equal<TProps["onToggle"], ((v: boolean) => void) | undefined>
>;
type _PoI_ExcludesHTMLSurface = Assert<Equal<HasKey<TProps, "click">, false>>;
type _PoI_AllOptional = Assert<Extends<{}, TProps>>;

// ─ Require ────────────────────────────────────────────────────────────────────

type _Req = Require<{ a?: number; b?: string; c?: boolean }, "a">;
type _Req_A = Assert<Equal<_Req["a"], number>>;
type _Req_B = Assert<Equal<_Req["b"], string | undefined>>;
type _Req_C = Assert<Equal<_Req["c"], boolean | undefined>>;

// ─ MaybeReactiveProps ─────────────────────────────────────────────────────────

type _MR = MaybeReactiveProps<{
  count?: number;
  label?: string;
  onClick: () => void;
}>;
type _MR_Count = Assert<Equal<_MR["count"], MaybeReactive<number> | undefined>>;
type _MR_Label = Assert<Equal<_MR["label"], MaybeReactive<string> | undefined>>;
// Functions are also wrapped — JSX runtime supports computed/signal handlers
type _MR_OnClick = Assert<Equal<_MR["onClick"], MaybeReactive<() => void>>>;

// ─ ElementProps: attribute vs property precedence ────────────────────────────

type XP = ElementProps<typeof XRange>;
// Flat `min` / `value` carry the raw PROPERTY type. `MaybeReactive` wrapping
// is applied at the JSX layer (see `JSX.IntrinsicElements` tests below).
type _EP_FlatMin = Assert<Equal<NonNullable<XP["min"]>, number>>;
type _EP_FlatValue = Assert<Equal<NonNullable<XP["value"]>, number>>;
// Attribute-only key (`variant`, no instance field) carries the raw attribute
// value type — `string | null`.
type _EP_AttrOnly = Assert<
  Equal<Exclude<XP["variant"], undefined>, string | null>
>;
// `prop:*` namespace keeps the raw property type.
type _EP_PropNs = Assert<Equal<NonNullable<XP["prop:min"]>, number>>;
type _EP_PropValueNs = Assert<Equal<NonNullable<XP["prop:value"]>, number>>;

// JSX layer wraps `ElementProps<C>` in `MaybeReactiveProps` so call-site
// attributes accept value-or-reactive (parallel to function components).
type _XJsx = JSX.IntrinsicElements["x-range"];
const _xj_static: _XJsx = { min: 0, max: 100, value: 50 };
const _xj_signal: _XJsx = {
  min: () => 0,
  max: () => 100,
  value: () => 50,
};
const _xj_attr_static: _XJsx = { variant: "primary" };
const _xj_attr_signal: _XJsx = { variant: () => "primary" };
void _xj_static;
void _xj_signal;
void _xj_attr_static;
void _xj_attr_signal;

// ─ ElementProps: events ──────────────────────────────────────────────────────
// Assignability check: a handler with the declared event type must fit the
// prop slot. (Exact equality is fragile: DOM attrs intersect with our events.)

// NOTE: Standard DOM events (input, click, keydown, …) are already typed by
// dom-expressions. Augmenting them via `static events` intersects — user
// handler must satisfy both. Use non-standard event names for clean overlay.
type CommitHandler = (ev: CustomEvent<void>) => void;
type ReadyHandler = (ev: CustomEvent<number>) => void;
type _EV_OnCommit = Assert<
  Extends<CommitHandler, NonNullable<XP["on:commit"]>>
>;
type _EV_OnCommitCamel = Assert<
  Extends<CommitHandler, NonNullable<XP["onCommit"]>>
>;
type _EV_OnReady = Assert<Extends<ReadyHandler, NonNullable<XP["on:ready"]>>>;

// ─ ElementProps: slots ───────────────────────────────────────────────────────

type _SL_Header = Assert<Equal<XP["slot:header"], Child | undefined>>;
type _SL_Footer = Assert<Equal<XP["slot:footer"], Child | undefined>>;

// ─ ElementProps: children ────────────────────────────────────────────────────

// Children key is always present (intersection with DomJSX attrs ensures this).
type _CH_Present = Assert<HasKey<XP, "children">>;

// ─ ComponentProps ────────────────────────────────────────────────────────────

type _CP = ComponentProps<typeof Card>;
type _CP_Eq = Assert<Equal<_CP, { title: string; count?: number }>>;

// ─ CustomElementRegistry → IntrinsicElements ─────────────────────────────────
// Unregistered custom tags keep the loose fallback.

type _IE_Loose = Assert<Extends<"random-tag", keyof JSX.IntrinsicElements>>;

// ─ Props<C> — unified helper (assignment-based checks) ──────────────────────

// Class constructor — takes InstanceType's public fields
type _P_Ctor = Props<typeof Card>;
const _p_ctor_ok: _P_Ctor = { props: { title: "x" } };
const _p_ctor_getter: _P_Ctor = { props: () => ({ title: "y", count: 1 }) };
void _p_ctor_ok;
void _p_ctor_getter;

// Class instance — scalar wraps, functions pass through, all optional
type _P_Inst = Props<Toggle>;
const _p_inst_empty: _P_Inst = {};
const _p_inst_open: _P_Inst = { open: true };
const _p_inst_openGetter: _P_Inst = { open: () => false };
const _p_inst_onToggle: _P_Inst = { onToggle: (v) => void v };
void _p_inst_empty;
void _p_inst_open;
void _p_inst_openGetter;
void _p_inst_onToggle;

// Function component — first param wrapped
const Greeting = (_props: { name: string; excited?: boolean }) => null;
type _P_Fn = Props<typeof Greeting>;
const _p_fn_ok: _P_Fn = { name: "sam" };
const _p_fn_getter: _P_Fn = { name: () => "sam", excited: () => true };
// @ts-expect-error — `name` is required
const _p_fn_missing: _P_Fn = {};
void _p_fn_ok;
void _p_fn_getter;
void _p_fn_missing;

// ─ ReactiveProps + LibraryManagedAttributes ─────────────────────────────────

// Per-key getter shape inside a function-component body
type _RP = ReactiveProps<{ name: string; excited?: boolean }>;
type _RP_Name = Assert<Equal<_RP["name"], Computed<string>>>;
type _RP_Excited = Assert<
  Equal<_RP["excited"], Computed<boolean | undefined> | undefined>
>;

// RawProps unwraps the brand (assignable both ways)
type _Raw = RawProps<_RP>;
const _raw_in: _Raw = { name: "x" };
const _raw_in2: _Raw = { name: "x", excited: true };
const _raw_back: { name: string; excited?: boolean } = {} as _Raw;
void _raw_in;
void _raw_in2;
void _raw_back;
// Without brand, RawProps is the identity
type _RPP_Plain = Assert<Equal<RawProps<{ a: number }>, { a: number }>>;

// Function component declared with ReactiveProps — JSX call-site type
function FnGreeting(
  _props: ReactiveProps<{ name: string; excited?: boolean }>,
): Element | null {
  return null;
}
type _FnAttrs = JSX.LibraryManagedAttributes<
  typeof FnGreeting,
  Parameters<typeof FnGreeting>[0]
>;
// Static value, signal, and computed all assignable; required key enforced
const _fn_static: _FnAttrs = { name: "wael" };
const _fn_signal: _FnAttrs = { name: () => "wael" };
const _fn_with_excited: _FnAttrs = { name: "x", excited: () => true };
// @ts-expect-error — name is required
const _fn_missing: _FnAttrs = {};
// @ts-expect-error — wrong scalar type
const _fn_wrong: _FnAttrs = { name: 42 };
void _fn_static;
void _fn_signal;
void _fn_with_excited;
void _fn_missing;
void _fn_wrong;

// Instance-field class — JSX attrs derived from public fields
// (TS extracts `{}` for classes without a constructor signature.)
type _ClsAttrs = JSX.LibraryManagedAttributes<typeof Toggle, {}>;
const _cls_static: _ClsAttrs = { open: true };
const _cls_signal: _ClsAttrs = { open: () => false };
const _cls_handler: _ClsAttrs = { onToggle: (v: boolean) => void v };
void _cls_static;
void _cls_signal;
void _cls_handler;

// Constructor-class with explicit MaybeReactiveProps param — passes through,
// generic stays inferable. Mirrors the `For<T>` pattern used in the library.
class Listy<T> {
  constructor(_props?: MaybeReactiveProps<{ items: T[] }>) {}
  items: T[] = [];
  render() {
    return null;
  }
}
type _ListyAttrs = JSX.LibraryManagedAttributes<
  typeof Listy<string>,
  ConstructorParameters<typeof Listy<string>>[0]
>;
const _listy_static: _ListyAttrs = { items: ["a", "b"] };
const _listy_signal: _ListyAttrs = { items: () => ["a", "b"] };
// @ts-expect-error — wrong element type
const _listy_wrong: _ListyAttrs = { items: [1, 2] };
void _listy_static;
void _listy_signal;
void _listy_wrong;

// ─ ResolveProps branches ─────────────────────────────────────────────────────

// 1) branded function-component param → MaybeReactiveProps<Raw>
type _RA_Branded = ResolveProps<typeof FnGreeting, _RP>;
const _ra_branded: _RA_Branded = { name: "x" };
const _ra_branded_sig: _RA_Branded = { name: () => "x", excited: true };
void _ra_branded;
void _ra_branded_sig;

// 2) empty constructor param → falls back to Props<C>
type _RA_Empty = ResolveProps<typeof Toggle, {}>;
const _ra_empty: _RA_Empty = { open: () => true };
void _ra_empty;

// 3) non-empty constructor param → passed through unchanged (preserves T)
type _RA_PassThrough = ResolveProps<
  typeof Listy<number>,
  ConstructorParameters<typeof Listy<number>>[0]
>;
const _ra_pass: _RA_PassThrough = { items: [1, 2, 3] };
void _ra_pass;

// ─ IntrinsicElements: HTML attributes & properties ───────────────────────────

// Standard HTML attribute slots accept value or reactive
type _DivAttrs = JSX.IntrinsicElements["div"];
const _div_id: _DivAttrs = { id: "x" };
const _div_id_sig: _DivAttrs = { id: () => "x" };
const _div_class_static: _DivAttrs = { class: "a b" };
const _div_class_sig: _DivAttrs = { class: () => "a b" };
const _div_style_str: _DivAttrs = { style: "color: red" };
const _div_style_obj: _DivAttrs = { style: { color: "red" } };
void _div_id;
void _div_id_sig;
void _div_class_static;
void _div_class_sig;
void _div_style_str;
void _div_style_obj;

// `class:foo` and `style:foo` accept value or reactive (MaybeReactive<T>)
const _div_class_ns_static: _DivAttrs = { "class:active": true };
const _div_class_ns_sig: _DivAttrs = { "class:active": () => false };
const _div_style_ns_static: _DivAttrs = { "style:color": "red" };
const _div_style_ns_sig: _DivAttrs = { "style:color": () => null };
void _div_class_ns_static;
void _div_class_ns_sig;
void _div_style_ns_static;
void _div_style_ns_sig;

// `prop:foo` accepts any value — direct property assignment (no MaybeReactive)
const _div_prop_static: _DivAttrs = { "prop:custom": { any: "shape" } };
const _div_prop_sig: _DivAttrs = { "prop:custom": () => ({ any: "shape" }) };
void _div_prop_static;
void _div_prop_sig;

// `slot:foo` accepts any `Child` — reactive forms (getter, signal) work
// because `Child` includes `AnyFn`. No `MaybeReactive` wrap needed.
const _div_slot_string: _DivAttrs = { "slot:header": "title text" };
const _div_slot_getter: _DivAttrs = { "slot:header": () => "title text" };
const _div_slot_array: _DivAttrs = { "slot:header": ["a", "b"] };
const _div_slot_signal: _DivAttrs = { "slot:header": signal("title") };
void _div_slot_string;
void _div_slot_getter;
void _div_slot_array;
void _div_slot_signal;

// `ref` callback receives the element
const _div_ref: _DivAttrs = { ref: (_el: Element) => void 0 };
void _div_ref;

// Input value/checked are reactive
type _InputAttrs = JSX.IntrinsicElements["input"];
const _input_value: _InputAttrs = { value: "x", checked: false };
const _input_value_sig: _InputAttrs = { value: () => "x", checked: () => true };
void _input_value;
void _input_value_sig;

// Event handlers — `on:click` for known DOM events
const _btn_click: JSX.IntrinsicElements["button"] = {
  "on:click": (_e: MouseEvent) => void 0,
};
void _btn_click;
// Standard HTML intrinsics don't expose `on:custom-event` — that's
// custom-element territory (declared via `static events` on the class).
const _btn_custom_rejected: JSX.IntrinsicElements["button"] = {
  // @ts-expect-error — arbitrary `on:my-event` not allowed on intrinsic <button>
  "on:my-event": (_e: Event) => void 0,
};
void _btn_custom_rejected;

// Unregistered custom-element tags accept any string-keyed props (loose fallback)
const _custom_loose: JSX.IntrinsicElements["my-widget"] = {
  anything: "goes",
  "on:foo": () => {},
};
void _custom_loose;

// Registered custom elements get typed attribute slots
type _XRangeAttrs = JSX.IntrinsicElements["x-range"];
const _xr_min: _XRangeAttrs = { min: 0, max: 100, value: 50 };
const _xr_min_sig: _XRangeAttrs = {
  min: () => 0,
  max: () => 100,
  value: () => 50,
};
const _xr_prop_ns: _XRangeAttrs = { "prop:value": 42 };
const _xr_event: _XRangeAttrs = {
  "on:commit": (_e: CustomEvent<void>) => void 0,
};
const _xr_slot: _XRangeAttrs = { "slot:header": "title" };
void _xr_min;
void _xr_min_sig;
void _xr_prop_ns;
void _xr_event;
void _xr_slot;

// ─ HTMLElement subclass with reactive-shaped fields ────────────────────────

interface Probe extends HTMLElement {
  name: string;
  excited: boolean;
}
type _PI = PropsOfInstance<Probe>;
type _PI_Excited = Assert<Equal<_PI["excited"], boolean | undefined>>;
type _PI_Name = Assert<Equal<_PI["name"], string | undefined>>;

// ─ Tiny runtime anchor so vitest picks the file up ───────────────────────────

it("type-only tests compile", () => {
  expect(true).toBe(true);
});
