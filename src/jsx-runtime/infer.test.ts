import { it, expect } from "vitest";
import { ATTRIBUTES, type Attributes } from "../attributes";
import { slot } from "../slot";
import type { Children } from "./children";
import { computed, signal, type MaybeReactive } from "../signals";
import { For } from "../for";
import type { JSX } from "./index";
import type {
  ComponentProps,
  ElementProps,
  MaybeReactiveProps,
  PropsOf,
  RawProps,
  Props,
  Require,
  ResolveProps,
} from "./infer";
import type { Computed } from "../signals";
import type { AttributesOf, EventsOf, PropertiesOf } from "../custom-elements";

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
  @slot() header: Node | null = null;

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

declare global {
  namespace ElementsKit {
    interface CustomElementRegistry {
      "x-range": typeof XRange;
    }
  }
}

// ─ PropertiesOf ─────────────────────────────────────────────────────────────

type TProps = PropertiesOf<Toggle>;
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
// Function-typed props are wrapped too — the runtime accepts a signal/computed
// for every prop (`applyProps` re-subscribes `on:` listeners in an effect,
// `resolveProps` passes reactive handlers through as getters).
type _MR_OnClick = Assert<Equal<_MR["onClick"], MaybeReactive<() => void>>>;

// ─ Reactive function-valued props ─────────────────────────────────────────────
// Signals/computeds are accepted wherever a function-typed prop is expected,
// WITHOUT breaking contextual param typing for inline arrows (TS picks the
// handler signature by arity — `Computed<F>` is zero-arg, handlers aren't).

type ToggleHandler = (v: boolean) => void;
const _toggleSig = signal<ToggleHandler>(() => {});
const _toggleComputed = computed<ToggleHandler>(() => () => {});

// Instance-field class props (PropsOf<C>)
type _P_InstFn = PropsOf<Toggle>;
const _p_fn_signal: _P_InstFn = { onToggle: _toggleSig };
const _p_fn_computed: _P_InstFn = { onToggle: _toggleComputed };
void _p_fn_signal;
void _p_fn_computed;

// Function-component props (PropsOf<Fn>)
const Clicky = (_p: { onPick: (n: number) => string }) => null;
type _ClickyProps = MaybeReactiveProps<PropsOf<typeof Clicky>>;
const _clicky_plain: _ClickyProps = { onPick: (n) => String(n) };
const _clicky_signal: _ClickyProps = {
  onPick: signal<(n: number) => string>(() => ""),
};
const _clicky_computed: _ClickyProps = {
  onPick: computed<(n: number) => string>(() => () => ""),
};
void _clicky_plain;
void _clicky_signal;
void _clicky_computed;

// Custom-element event props (JSX layer)
const _commitSig = signal<(ev: CustomEvent<void>) => void>(() => {});
const _xr_event_signal: JSX.IntrinsicElements["x-range"] = {
  "on:commit": _commitSig,
};
void _xr_event_signal;

// REGRESSION GUARDS — inline arrows keep contextual param typing.
// (No `strict` mode here: broken inference silently yields `any`, so each
// guard pins the exact inferred param type.)
const _p_fn_inline: _P_InstFn = {
  onToggle: (v) => {
    type _VIsBool = Assert<Equal<typeof v, boolean>>;
    void v;
  },
};
void _p_fn_inline;

const _clicky_inline: _ClickyProps = {
  onPick: (n) => {
    type _NIsNumber = Assert<Equal<typeof n, number>>;
    return String(n);
  },
};
void _clicky_inline;

const _xr_event_inline: JSX.IntrinsicElements["x-range"] = {
  "on:ready": (ev) => {
    type _EvTyped = Assert<Extends<typeof ev, CustomEvent<number>>>;
    void ev;
  },
};
void _xr_event_inline;

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
// camelCase `onCommit` is NOT synthesized — the runtime only attaches
// listeners via `on:`; a camel key would silently become an attribute.
type _EV_NoCamel = Assert<Equal<HasKey<XP, "onCommit">, false>>;
type _EV_OnReady = Assert<Extends<ReadyHandler, NonNullable<XP["on:ready"]>>>;

// ─ ElementProps: slots ───────────────────────────────────────────────────────

// Slot-backed props are plain instance fields now (`@slot()` accessor) —
// their read type flows through PropertiesOf like any other field.
type _SL_Header = Assert<Equal<XP["header"], Node | null | undefined>>;

// ─ ElementProps: children ────────────────────────────────────────────────────

// Children key is always present (intersection with DomJSX attrs ensures this).
type _CH_Present = Assert<HasKey<XP, "children">>;

// ─ CustomElementRegistry → IntrinsicElements ─────────────────────────────────
// Custom tags must be registered in `CustomElementRegistry` — there is no
// loose fallback (it would shadow registered prop types via intersection).

type _IE_Strict = Assert<
  Equal<Extends<"random-tag", keyof JSX.IntrinsicElements>, false>
>;
type _IE_Registered = Assert<Extends<"x-range", keyof JSX.IntrinsicElements>>;

// Native DOM event handlers are stripped from intrinsics — the runtime only
// wires the `on:` namespace, so a bare `onClick`/`onclick` must not typecheck
// (it would silently no-op). The `on:click` form is preserved.
type _IE_NoCamelEvent = Assert<
  Equal<HasKey<JSX.IntrinsicElements["button"], "onClick">, false>
>;
type _IE_NoLowerEvent = Assert<
  Equal<HasKey<JSX.IntrinsicElements["button"], "onclick">, false>
>;
type _IE_OnColonEvent = Assert<
  HasKey<JSX.IntrinsicElements["button"], "on:click">
>;

// ─ PropsOf<C> — unified helper (assignment-based checks) ──────────────────────

// Class constructor — takes InstanceType's public fields
type _P_Ctor = MaybeReactiveProps<PropsOf<typeof Card>>;
const _p_ctor_ok: _P_Ctor = { props: { title: "x" } };
const _p_ctor_getter: _P_Ctor = { props: () => ({ title: "y", count: 1 }) };
void _p_ctor_ok;
void _p_ctor_getter;

// Class instance — scalar wraps, functions pass through, all optional
type _P_Inst = MaybeReactiveProps<PropsOf<Toggle>>;
const _p_inst_empty: _P_Inst = {};
const _p_inst_open: _P_Inst = { open: true };
const _p_inst_openGetter: _P_Inst = { open: () => false };
const _p_inst_onToggle: _P_Inst = { onToggle: (v) => void v };
void _p_inst_empty;
void _p_inst_open;
void _p_inst_openGetter;
void _p_inst_onToggle;

// Constructor instantiation-expression form — generics flow through
// InstanceOf to the instance fields. Instance form is accepted via the
// `JSX.ElementClass` half of the constraint (render()-bearing), ctor form
// via `JSX.ElementType` — both resolve to the same type.
type _P_ForCtor = MaybeReactiveProps<PropsOf<typeof For<number>>>;
type _P_ForInst = MaybeReactiveProps<PropsOf<For<number>>>;
type _P_ForSame = Assert<Equal<_P_ForInst, _P_ForCtor>>;

// PropsOf = ElementProps (custom-element ctors) ∪ ComponentProps (the rest).
type _P_ElementCtor = Assert<
  Equal<PropsOf<typeof XRange>, ElementProps<typeof XRange>>
>;
type _P_FnIsComponent = Assert<
  Equal<PropsOf<typeof Greeting>, ComponentProps<typeof Greeting>>
>;
type _P_InstIsComponent = Assert<
  Equal<PropsOf<For<number>>, ComponentProps<For<number>>>
>;
const _p_for_ctor: _P_ForCtor = { each: () => [1, 2] };
void _p_for_ctor;

// PropsOf accepts components only — function, constructor, or instance
// (HTMLElement / render()-bearing). A plain prop shape is rejected at the
// constraint; use MaybeReactiveProps to transform raw shapes.
// @ts-expect-error — `{ name: string }` is not a component
type _P_Plain = PropsOf<{ name: string; age?: number }>;
void (0 as unknown as _P_Plain);

// Function component — first param wrapped
const Greeting = (_props: { name: string; excited?: boolean }) => null;
type _P_Fn = MaybeReactiveProps<PropsOf<typeof Greeting>>;
const _p_fn_ok: _P_Fn = { name: "sam" };
const _p_fn_getter: _P_Fn = { name: () => "sam", excited: () => true };
// @ts-expect-error — `name` is required
const _p_fn_missing: _P_Fn = {};
void _p_fn_ok;
void _p_fn_getter;
void _p_fn_missing;

// ─ ReactiveProps + LibraryManagedAttributes ─────────────────────────────────

// Per-key getter shape inside a function-component body
type _RP = Props<{ name: string; excited?: boolean }>;
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
  _props: Props<{ name: string; excited?: boolean }>,
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

// Instance-field class component — JSX attrs derived from public fields
// (TS extracts `{}` for classes without a constructor signature.) Must have
// `render()`: plain HTMLElement subclasses (like `Toggle`) are not valid JSX
// tags — they mount via their registered tag name instead.
class ToggleView {
  open = false;
  onToggle: (v: boolean) => void = () => {};
  render(): JSX.Element | null {
    return null;
  }
}
type _ClsAttrs = JSX.LibraryManagedAttributes<typeof ToggleView, {}>;
const _cls_static: _ClsAttrs = { open: true };
const _cls_signal: _ClsAttrs = { open: () => false };
const _cls_handler: _ClsAttrs = { onToggle: (v: boolean) => void v };
void _cls_static;
void _cls_signal;
void _cls_handler;
// Non-vacuity guard: if ResolveProps ever degrades to `{}` /
// `MaybeReactiveProps<unknown>` again (the empty-P-matches-brand bug), the
// three accepts above pass trivially — this rejection is what actually fails.
const _cls_unknown_rejected: _ClsAttrs = {
  // @ts-expect-error — unknown key must be rejected
  nope: 1,
};
void _cls_unknown_rejected;
type _Cls_Open = Assert<
  Equal<_ClsAttrs["open"], MaybeReactive<boolean> | undefined>
>;

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

// 2) empty constructor param → falls back to PropsOf<C>
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

// `prop:K` is inferred from the element type — `prop:className` is `string`
// (from HTMLDivElement), `prop:id` is `string`, etc. No autocomplete for
// arbitrary `prop:custom` keys; register the field on the class to type it.
const _div_prop_className: _DivAttrs = { "prop:className": "a b" };
const _div_prop_className_sig: _DivAttrs = { "prop:className": () => "a b" };
void _div_prop_className;
void _div_prop_className_sig;
const _div_prop_unknown_rejected: _DivAttrs = {
  // @ts-expect-error — `prop:custom` not defined on HTMLDivElement
  "prop:custom": { any: "shape" },
};
void _div_prop_unknown_rejected;

// There is no `slot:` namespace — slots are plain properties (`@slot()`
// accessors) and unknown `slot:*` keys are rejected like any unknown prop.
const _div_slot_rejected: _DivAttrs = {
  // @ts-expect-error — no `slot:` namespace exists
  "slot:header": "title",
};
void _div_slot_rejected;

// `ref` callback receives the concrete element (HTMLDivElement on <div>)
const _div_ref: _DivAttrs = { ref: (_el: HTMLDivElement) => void 0 };
void _div_ref;

// `ref` param is contextually inferred — no annotation needed. Guards the
// contextual signature: wrapping `ref` in MaybeReactive (or intersecting a
// second declaration) collapses inference to implicit any.
const _div_ref_inferred: _DivAttrs = {
  ref: (el) => {
    type _RefEl = Assert<Equal<typeof el, HTMLDivElement>>;
    void el;
  },
};
void _div_ref_inferred;

// `children` admits getters and arrays nested to any depth — the runtime
// flattens with `.flat(Infinity)` (see children.test.tsx).
const _div_children_nested: _DivAttrs = {
  children: ["a", 1, ["b", () => "c", [() => 0]]],
};
void _div_children_nested;
const _div_children_rejected: _DivAttrs = {
  // @ts-expect-error — plain objects are not valid children
  children: { not: "a child" },
};
void _div_children_rejected;

// SVG-only namespace attrs: present on SVG tags, absent on HTML tags
const _use_xlink: JSX.IntrinsicElements["use"] = { "xlink:href": "#icon" };
const _svg_xml: JSX.IntrinsicElements["svg"] = { "xml:lang": "en" };
void _use_xlink;
void _svg_xml;
type _NoXlinkOnDiv = Assert<Equal<HasKey<_DivAttrs, "xlink:href">, false>>;

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
// `on:click` also accepts a computed-of-handler (runtime re-subscribes on
// change; see element.test.ts).
const _btn_click_computed: JSX.IntrinsicElements["button"] = {
  "on:click": computed(() => (_e: MouseEvent) => void 0),
};
void _btn_click_computed;
// Standard HTML intrinsics don't expose `on:custom-event` — that's
// custom-element territory (declared via `static events` on the class).
const _btn_custom_rejected: JSX.IntrinsicElements["button"] = {
  // @ts-expect-error — arbitrary `on:my-event` not allowed on intrinsic <button>
  "on:my-event": (_e: Event) => void 0,
};
void _btn_custom_rejected;

// Unregistered custom-element tags are not in `IntrinsicElements` — there is
// no loose fallback (it would shadow registered prop types via intersection).
// Register via `CustomElementRegistry` augmentation to use a custom tag.
type _Unregistered = Assert<
  Equal<HasKey<JSX.IntrinsicElements, "my-widget">, false>
>;

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
// Slot-backed props are flat properties — pass a Node (or a reactive of one).
const _xr_slot: _XRangeAttrs = { header: document.createElement("h1") };
const _xr_slot_sig: _XRangeAttrs = {
  header: computed(() => document.createElement("h1")),
};
void _xr_min;
void _xr_min_sig;
void _xr_prop_ns;
void _xr_event;
void _xr_slot;
void _xr_slot_sig;

// Namespaced props on registered custom elements accept reactive values —
// same wrap order as intrinsics (namespaces first, MaybeReactiveProps after).
const _xr_ns_sig: _XRangeAttrs = {
  "class:active": () => false,
  "style:color": () => "red",
  "prop:value": () => 42,
};
void _xr_ns_sig;

// `on:` handlers accept a computed-of-handler (runtime re-subscribes).
const _xr_event_computed: _XRangeAttrs = {
  "on:commit": computed(() => (_e: CustomEvent<void>) => void 0),
};
void _xr_event_computed;

// `ref` receives the concrete instance, contextually inferred, and stays
// outside the reactive wrap.
const _xr_ref: _XRangeAttrs = {
  ref: (el) => {
    type _RefEl = Assert<Equal<typeof el, XRange>>;
    void el;
  },
};
void _xr_ref;

// ─ HTMLElement subclass with reactive-shaped fields ────────────────────────

interface Probe extends HTMLElement {
  name: string;
  excited: boolean;
}
type _PI = PropertiesOf<Probe>;
type _PI_Excited = Assert<Equal<_PI["excited"], boolean | undefined>>;
type _PI_Name = Assert<Equal<_PI["name"], string | undefined>>;

// ─ Registry → HTMLElementTagNameMap bridge (src/custom-elements.ts) ──────────
// Registered tags get typed DOM lookups: querySelector / querySelectorAll /
// createElement return the concrete class instead of bare `Element`.

type _TagMap_XRange = Assert<Equal<HTMLElementTagNameMap["x-range"], XRange>>;
const _tag_create = () => {
  const created: XRange = document.createElement("x-range");
  const queried: XRange | null = document.querySelector("x-range");
  void created;
  void queried;
};
void _tag_create;

// ─ JSX.Element is non-null ────────────────────────────────────────────────────
// A JSX expression is usable anywhere a `Node` is expected without narrowing;
// null-returning components keep `| null` on their own signatures
// (`ComponentFn`, `ComponentInstance.render`).

type _JsxElement_NonNull = Assert<Equal<Extract<JSX.Element, null>, never>>;
type _JsxElement_IsNode = Assert<Extends<JSX.Element, Node>>;

// ─ Raw custom-element extractors (framework-agnostic, no JSX vocabulary) ─────
// PropertiesOf / AttributesOf / EventsOf from elements-kit/custom-elements —
// the surfaces host frameworks (React/Svelte/Vue/vanilla) consume directly.

type _Raw_Props = Assert<
  Equal<
    PropertiesOf<typeof XRange>,
    { min?: number; max?: number; value?: number; header?: Node | null }
  >
>;
type _Raw_Attrs = Assert<
  Equal<
    AttributesOf<typeof XRange>,
    { min?: string | null; max?: string | null; variant?: string | null }
  >
>;
type _Raw_Events = Assert<
  Equal<
    EventsOf<typeof XRange>,
    { commit: CustomEvent<void>; ready: CustomEvent<number> }
  >
>;

// Slots-as-properties: `@slot()` accessor — read type is `Node | null` (the
// last assigned node), so the key flows through PropertiesOf like any field.
class XCard extends HTMLElement {
  @slot() header: Node | null = null;
  count = 0;
}
type _Raw_SlotProp = Assert<
  Equal<PropertiesOf<typeof XCard>, { header?: Node | null; count?: number }>
>;

// ─ Tiny runtime anchor so vitest picks the file up ───────────────────────────

it("type-only tests compile", () => {
  expect(true).toBe(true);
});
