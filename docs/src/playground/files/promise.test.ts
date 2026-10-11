import { promise } from "elements-kit/utilities/promise";

test("starts in pending state", () => {
  const p = promise<number>(() => {});
  expect(p.state).toBe("pending");
  expect(p.value).toBeUndefined();
});

test("resolves to fulfilled with value", async () => {
  const p = promise<number>((resolve) => resolve(42));
  await p;
  expect(p.state).toBe("fulfilled");
  expect(p.value).toBe(42);
});

test("rejects to rejected with reason", async () => {
  const p = promise<number>((_, reject) => reject(new Error("nope")));
  await p.catch(() => {});
  expect(p.state).toBe("rejected");
  expect(p.reason).toBeInstanceOf(Error);
});

test("is awaitable like a native Promise", async () => {
  const p = promise<string>((resolve) =>
    setTimeout(() => resolve("ok"), 10),
  );
  const value = await p;
  expect(value).toBe("ok");
});
