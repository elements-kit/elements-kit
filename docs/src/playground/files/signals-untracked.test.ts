import { signal, effect, untracked } from "elements-kit/signals";

test("reads without creating a dependency", () => {
  const a = signal(0);
  const b = signal(0);
  let runs = 0;
  const stop = effect(() => {
    a();
    untracked(() => b());
    runs++;
  });
  expect(runs).toBe(1);
  b(10);
  expect(runs).toBe(1);
  a(1);
  expect(runs).toBe(2);
  stop();
});

test("returns the current value", () => {
  const a = signal(42);
  expect(untracked(() => a())).toBe(42);
});
