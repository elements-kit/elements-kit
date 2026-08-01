import { expect, it } from "vitest";
import {
  signal,
  computed,
  computedProps,
  effect,
  isReactive,
  resolve,
} from "./index";
import { createElement } from "../jsx-runtime/element";

// ─ Bag form ───────────────────────────────────────────────────────────────────

it("wraps static values in stable thunks", () => {
  const props = computedProps({ name: "a", count: 1 });
  expect(props.name()).toBe("a");
  expect(props.count()).toBe(1);
  // identity preserved across reads
  expect(props.name).toBe(props.name);
});

it("passes signals through as getters", () => {
  const count = signal(0);
  const props = computedProps({ count });
  expect(props.count).toBe(count); // same reference
  expect(props.count()).toBe(0);
  count(5);
  expect(props.count()).toBe(5);
});

it("subscribes effects when the getter is called", () => {
  const count = signal(0);
  const props = computedProps({ count });
  const seen: number[] = [];
  const dispose = effect(() => seen.push(props.count()));
  count(1);
  count(2);
  expect(seen).toEqual([0, 1, 2]);
  dispose();
});

it("passes computed through unchanged", () => {
  const a = signal(2);
  const b = signal(3);
  const sum = computed(() => a() + b());
  const props = computedProps({ sum });
  expect(props.sum).toBe(sum);
  expect(props.sum()).toBe(5);
  a(10);
  expect(props.sum()).toBe(13);
});

it("mixes static and reactive props", () => {
  const name = signal("world");
  const props = computedProps({ name, excited: true });
  expect(props.name()).toBe("world");
  expect(props.excited()).toBe(true);
});

it("is spreadable into a new object as separate computed per key", () => {
  const count = signal(0);
  const props = computedProps({ count, label: "n" });
  const spread = { ...props };
  expect(typeof spread.count).toBe("function");
  expect(typeof spread.label).toBe("function");
  expect(spread.count).toBe(count);
  expect(spread.count()).toBe(0);
  expect(spread.label()).toBe("n");
  count(7);
  expect(spread.count()).toBe(7);
});

it("Object.keys reflects underlying keys", () => {
  const props = computedProps({ a: 1, b: 2 });
  expect(Object.keys(props).sort()).toEqual(["a", "b"]);
});

it("an omitted key is still callable, returning undefined", () => {
  const props = computedProps<{ label?: string }>({});
  expect(typeof props.label).toBe("function");
  expect(props.label()).toBeUndefined();
  // The default belongs on the call — a getter itself is always truthy.
  expect(props.label() ?? "fallback").toBe("fallback");
});

it("`in` and descriptors report what was actually passed", () => {
  const props = computedProps<{ label?: string; gone?: string }>({
    label: "n",
  } as never);
  // `get` synthesizes for any name; the other traps report what was passed.
  expect("label" in props).toBe(true);
  expect("gone" in props).toBe(false);
  expect(Object.getOwnPropertyDescriptor(props, "label")).toMatchObject({
    enumerable: true,
    configurable: true,
  });
  expect(Object.getOwnPropertyDescriptor(props, "gone")).toBeUndefined();
  expect(typeof props.gone).toBe("function"); // still callable, per above
});

it("leaves JS protocols alone — JSON, coercion, iteration", () => {
  const props = computedProps({ label: "n", count: 1 });
  // Getters drop out of JSON, but it must serialize rather than return
  // undefined via a synthesized `toJSON`.
  expect(JSON.stringify(props)).toBe("{}");
  expect(String(props)).toBe("[object Object]");
  expect((props as Record<PropertyKey, unknown>)[Symbol.iterator]).toBeUndefined();
});

it("a prop genuinely named `toJSON` still wins", () => {
  const props = computedProps({ toJSON: 42 } as { toJSON: number });
  expect(typeof props.toJSON).toBe("function");
  expect(props.toJSON()).toBe(42);
});

it("a function-valued prop survives uncalled", () => {
  const onClick = () => "called";
  const props = computedProps({ onClick });
  // Runtime is right; the type collapses to the return value, since a zero-arg
  // function is indistinguishable from a getter.
  expect(props.onClick()).toBe(onClick);
});

it("rejects a prop that takes arguments — it cannot be inferred", () => {
  const render = (item: string) => item.length;
  // @ts-expect-error — a render prop must be read off the raw props instead
  const props = computedProps({ render });
  // The runtime still does the right thing; only inference cannot type it.
  expect((props.render as () => unknown)()).toBe(render);
});

it("is idempotent — a bag handed back in stays itself", () => {
  const count = signal(0);
  const once = computedProps({ count, label: "n" });
  const twice = computedProps(once);
  expect(twice).toBe(once);
  expect(twice.label()).toBe("n");
});

// ─ A bag is read by calling, not by resolve ───────────────────────────────────

it("a static key is a plain thunk — call it, do not resolve it", () => {
  const count = signal(7);
  const props = computedProps({ count, label: "n" });
  // A signal passes through branded, so resolve still reads it.
  expect(resolve(props.count)).toBe(7);
  expect(isReactive(props.count)).toBe(true);
  // A static key is an unbranded thunk — not a source. Call the key instead.
  expect(isReactive(props.label)).toBe(false);
  expect(resolve(props.label)).toBe(props.label);
  expect(props.label()).toBe("n");
});
