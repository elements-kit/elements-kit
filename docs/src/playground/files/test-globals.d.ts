// The playground preview's test runtime (see ../previewDocument.ts).
interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toStrictEqual(expected: unknown): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeInstanceOf(expected: abstract new (...args: any[]) => unknown): void;
  toBeGreaterThan(expected: number): void;
  toBeLessThan(expected: number): void;
  toContain(expected: unknown): void;
  toHaveLength(expected: number): void;
  toThrow(): void;
}
declare function expect(actual: unknown): Matchers & { not: Matchers };
declare function test(name: string, fn: () => unknown): void;
declare function it(name: string, fn: () => unknown): void;
declare function describe(name: string, fn: () => void): void;
