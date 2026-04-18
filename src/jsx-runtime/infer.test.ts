import { it, expect } from "vitest";
import { ATTRIBUTES, type Attributes } from "../attributes";
import { SLOTS, Slots } from "../slot";
import type { Child } from "./types";
import type { MaybeReactive } from "../signals";
import type { JSX } from "./index";
import type {
  ComponentProps,
  ElementProps,
  MaybeReactiveProps,
  Props,
  PropsOfInstance,
  Require,
} from "./infer";

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
  static [ATTRIBUTES]: Attributes<XRange> = {
    min(_v) {},
    max(_v) {},
    variant(_v) {},
  };
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
// Flat `min` / `value` carry PROPERTY type (number-wrapped reactive),
// not the attribute handler's string type.
type _EP_FlatMin = Assert<Equal<NonNullable<XP["min"]>, MaybeReactive<number>>>;
type _EP_FlatValue = Assert<
  Equal<NonNullable<XP["value"]>, MaybeReactive<number>>
>;
// Attribute-only key (`variant`, no instance field) stays string-ish.
type _EP_AttrOnly = Assert<
  Equal<Exclude<XP["variant"], undefined>, MaybeReactive<string | null>>
>;
// `prop:*` namespace keeps the raw property type.
type _EP_PropNs = Assert<Equal<NonNullable<XP["prop:min"]>, number>>;
type _EP_PropValueNs = Assert<Equal<NonNullable<XP["prop:value"]>, number>>;

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

// ─ Tiny runtime anchor so vitest picks the file up ───────────────────────────

it("type-only tests compile", () => {
  expect(true).toBe(true);
});
