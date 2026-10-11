import { signal, computed } from "elements-kit/signals";

test("derives from signals", () => {
  const a = signal(2);
  const b = signal(3);
  const sum = computed(() => a() + b());
  expect(sum()).toBe(5);
  a(10);
  expect(sum()).toBe(13);
});

test("is lazy: no work before read", () => {
  const a = signal(1);
  let runs = 0;
  const derived = computed(() => {
    runs++;
    return a() * 2;
  });
  expect(runs).toBe(0);
  derived();
  expect(runs).toBe(1);
});

test("caches between reads without dep change", () => {
  const a = signal(1);
  let runs = 0;
  const derived = computed(() => {
    runs++;
    return a();
  });
  derived();
  derived();
  derived();
  expect(runs).toBe(1);
});
