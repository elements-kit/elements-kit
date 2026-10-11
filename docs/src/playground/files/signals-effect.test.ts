import { signal, effect } from "elements-kit/signals";

test("runs immediately on creation", () => {
  const a = signal(1);
  let runs = 0;
  const stop = effect(() => {
    a();
    runs++;
  });
  expect(runs).toBe(1);
  stop();
});

test("reruns when dependencies change", () => {
  const a = signal(0);
  const seen: number[] = [];
  const stop = effect(() => seen.push(a()));
  a(1);
  a(2);
  stop();
  expect(seen).toEqual([0, 1, 2]);
});

test("stop() disposes — no more runs", () => {
  const a = signal(0);
  let runs = 0;
  const stop = effect(() => {
    a();
    runs++;
  });
  stop();
  a(1);
  a(2);
  expect(runs).toBe(1);
});
