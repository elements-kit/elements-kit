import { signal, effect, effectScope } from "elements-kit/signals";

test("groups effects under one lifetime", () => {
  const a = signal(0);
  const b = signal(0);
  const seen: string[] = [];
  const stop = effectScope(() => {
    effect(() => seen.push(`a:${a()}`));
    effect(() => seen.push(`b:${b()}`));
  });
  a(1);
  b(1);
  expect(seen).toEqual(["a:0", "b:0", "a:1", "b:1"]);
  stop();
});

test("stop disposes every effect in the scope", () => {
  const a = signal(0);
  let aRuns = 0;
  let bRuns = 0;
  const stop = effectScope(() => {
    effect(() => {
      a();
      aRuns++;
    });
    effect(() => {
      a();
      bRuns++;
    });
  });
  stop();
  a(1);
  a(2);
  expect(aRuns).toBe(1);
  expect(bRuns).toBe(1);
});
