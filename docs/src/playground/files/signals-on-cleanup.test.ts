import { signal, effect, onCleanup } from "elements-kit/signals";

test("runs before each rerun", () => {
  const a = signal(0);
  const events: string[] = [];
  const stop = effect(() => {
    const v = a();
    events.push(`run:${v}`);
    onCleanup(() => events.push(`cleanup:${v}`));
  });
  a(1);
  a(2);
  stop();
  expect(events).toEqual([
    "run:0",
    "cleanup:0",
    "run:1",
    "cleanup:1",
    "run:2",
    "cleanup:2",
  ]);
});

test("runs on dispose", () => {
  let cleaned = false;
  const stop = effect(() => {
    onCleanup(() => {
      cleaned = true;
    });
  });
  expect(cleaned).toBe(false);
  stop();
  expect(cleaned).toBe(true);
});

test("works at any call depth", () => {
  let cleaned = false;
  const helper = () => onCleanup(() => (cleaned = true));
  const stop = effect(() => helper());
  stop();
  expect(cleaned).toBe(true);
});
