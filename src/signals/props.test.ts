import { expect, it } from "vitest";
import { signal, computed, effect, resolveProps } from "./index";

it("wraps static values in stable thunks", () => {
  const props = resolveProps({ name: "a", count: 1 });
  expect(props.name()).toBe("a");
  expect(props.count()).toBe(1);
  // identity preserved across reads
  expect(props.name).toBe(props.name);
});

it("passes signals through as getters", () => {
  const count = signal(0);
  const props = resolveProps({ count });
  expect(props.count).toBe(count); // same reference
  expect(props.count()).toBe(0);
  count(5);
  expect(props.count()).toBe(5);
});

it("subscribes effects when the getter is called", () => {
  const count = signal(0);
  const props = resolveProps({ count });
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
  const props = resolveProps({ sum });
  expect(props.sum).toBe(sum);
  expect(props.sum()).toBe(5);
  a(10);
  expect(props.sum()).toBe(13);
});

it("mixes static and reactive props", () => {
  const name = signal("world");
  const props = resolveProps({ name, excited: true });
  expect(props.name()).toBe("world");
  expect(props.excited()).toBe(true);
});

it("is spreadable into a new object as separate computed per key", () => {
  const count = signal(0);
  const props = resolveProps({ count, label: "n" });
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
  const props = resolveProps({ a: 1, b: 2 });
  expect(Object.keys(props).sort()).toEqual(["a", "b"]);
});
