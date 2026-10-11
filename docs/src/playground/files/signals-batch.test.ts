import { signal, effect, batch } from "elements-kit/signals";

test("coalesces multiple writes into one effect run", () => {
  const x = signal(0);
  const y = signal(0);
  let runs = 0;
  const stop = effect(() => {
    x();
    y();
    runs++;
  });
  expect(runs).toBe(1);
  batch(() => {
    x(1);
    y(2);
  });
  expect(runs).toBe(2);
  stop();
});

test("without batch, each write notifies", () => {
  const x = signal(0);
  const y = signal(0);
  let runs = 0;
  const stop = effect(() => {
    x();
    y();
    runs++;
  });
  x(1);
  y(2);
  expect(runs).toBe(3);
  stop();
});
