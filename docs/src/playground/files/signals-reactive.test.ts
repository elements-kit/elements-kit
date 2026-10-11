import { reactive, effect, computed } from "elements-kit/signals";

class Counter {
  @reactive() count = 0;
  doubled = computed(() => this.count * 2);
}

test("field read/write is transparent", () => {
  const c = new Counter();
  expect(c.count).toBe(0);
  c.count = 5;
  expect(c.count).toBe(5);
});

test("reactive field drives effects and computeds", () => {
  const c = new Counter();
  const seen: number[] = [];
  const stop = effect(() => seen.push(c.count));
  c.count = 1;
  c.count = 2;
  stop();
  expect(seen).toEqual([0, 1, 2]);
  expect(c.doubled()).toBe(4);
});
