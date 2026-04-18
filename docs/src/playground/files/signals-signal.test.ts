import { signal, effect } from "elements-kit/signals";

test("reads and writes", () => {
  const count = signal(0);
  expect(count()).toBe(0);
  count(5);
  expect(count()).toBe(5);
});

test("notifies effects synchronously on write", () => {
  const count = signal(0);
  const seen: number[] = [];
  const stop = effect(() => seen.push(count()));
  count(1);
  count(2);
  stop();
  expect(seen).toEqual([0, 1, 2]);
});

test("dedupes equal writes (===)", () => {
  const count = signal(0);
  let runs = 0;
  const stop = effect(() => {
    count();
    runs++;
  });
  count(0); // same value
  stop();
  expect(runs).toBe(1);
});
