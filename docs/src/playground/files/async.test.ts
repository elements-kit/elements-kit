import { signal } from "elements-kit/signals";
import { async } from "elements-kit/utilities/async";

test("start runs the fn and exposes state", async () => {
  const op = async(async () => 42);
  op.start();
  await op;
  expect(op.state).toBe("fulfilled");
  expect(op.value).toBe(42);
});

test("stop halts reactive execution", async () => {
  const input = signal(1);
  let runs = 0;
  const op = async(async () => {
    runs++;
    return input();
  });
  op.start();
  await op;
  op.stop();
  input(2);
  // give any pending microtask a chance
  await Promise.resolve();
  expect(runs).toBe(1);
});

test("reruns when a tracked signal changes", async () => {
  const input = signal(1);
  const op = async(async () => input() * 10);
  op.start();
  await op;
  expect(op.value).toBe(10);
  input(5);
  await op;
  expect(op.value).toBe(50);
  op.stop();
});
