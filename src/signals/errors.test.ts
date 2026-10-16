import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  batch,
  computed,
  effect,
  effectScope,
  signal,
  untracked,
} from "./lib";

describe("errors on recompute", () => {
  // A getter that throws surfaces from the write; the scheduler keeps running.

  type User = { id: number };

  /** An effect whose apply step runs untracked. */
  function applyEffect<T>(compute: () => T, apply: (v: T) => void) {
    return effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });
  }

  it("the error surfaces from the write; later writes still flush", () => {
    const log: string[] = [];
    const users = signal<User[]>([{ id: 1 }]);
    const beat = signal(0);
    effectScope(() => {
      applyEffect(beat, (v) => {
        log.push(`beat=${v}`);
      });
      const selected = computed(() => {
        const u = users()[0];
        return u!.id; // throws on undefined
      });
      applyEffect(
        () => `sel=${selected()}`,
        (v) => {
          log.push(v);
        },
      );
    });
    expect(log).toEqual(["beat=0", "sel=1"]);
    log.length = 0;

    expect(() => users([])).toThrow("Cannot read properties of undefined");

    beat(1);
    expect(log).toEqual(["beat=1"]);
  });

  it("an effect reading the errored computed doesn't run with a bogus value", () => {
    const values: unknown[] = [];
    const users = signal<User[]>([{ id: 1 }]);
    effectScope(() => {
      const selected = computed(() => users().find((u) => u.id === 1)!.id);
      applyEffect(selected, (v) => {
        values.push(v);
      });
    });
    expect(values).toEqual([1]);
    expect(() => users([])).toThrow("Cannot read properties of undefined");
    expect(values).toEqual([1]);
  });
});

describe("effect error phases", () => {
  /** An effect whose apply step runs untracked. */
  function applyEffect<T>(compute: () => T, apply: (v: T) => void) {
    return effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });
  }

  let errorSpy!: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("a throw before the apply step propagates, is never logged, and skips the apply", () => {
    const log: string[] = [];
    const beat = signal(0);
    const armed = signal(false);

    effectScope(() => {
      applyEffect(beat, (v) => {
        log.push(`beat=${v}`);
      });
      applyEffect(
        () => {
          if (armed()) throw new Error("boom-compute");
          return 0;
        },
        () => {
          log.push("effect ran");
        },
      );
    });
    expect(log).toEqual(["beat=0", "effect ran"]);
    log.length = 0;

    expect(() => armed(true)).toThrow("boom-compute");
    expect(errorSpy).not.toHaveBeenCalled();
    expect(log).toEqual([]);

    beat(1);
    expect(log).toEqual(["beat=1"]);
  });

  it("an error fixed within the same batch never surfaces", () => {
    const source = signal(0);
    const ran: number[] = [];

    effectScope(() => {
      applyEffect(
        () => {
          const v = source();
          if (v === 1) throw new Error("transient");
          return v;
        },
        (v) => {
          ran.push(v);
        },
      );
    });
    expect(ran).toEqual([0]);

    batch(() => {
      source(1);
      source(2);
    });
    expect(ran).toEqual([0, 2]);

    expect(() => source(1)).toThrow("transient");
    expect(ran).toEqual([0, 2]);
  });

  it("a throw in the apply step surfaces from the write; other effects keep running", () => {
    const log: string[] = [];
    const beat = signal(0);
    const armed = signal(false);

    effectScope(() => {
      applyEffect(beat, (v) => {
        log.push(`beat=${v}`);
      });
      applyEffect(armed, (on) => {
        if (on) throw new Error("boom-effect");
      });
    });
    log.length = 0;
    expect(() => armed(true)).toThrow("boom-effect");
    beat(1);
    expect(log).toEqual(["beat=1"]);
    // The throwing effect is still subscribed and recovers.
    armed(false);
    expect(() => armed(true)).toThrow("boom-effect");
  });

});

describe("uncaught effect errors", () => {
  // An uncaught effect error reaches the writer; scheduling continues.

  const applyEffect = <T>(compute: () => T, apply: (v: T) => void) =>
    effect(() => {
      const v = compute();
      untracked(() => apply(v));
    });

  it("a throwing effect still reacts to later writes", () => {
    const a = signal(0);
    const seen: number[] = [];
    const stop = effectScope(() => {
      applyEffect(a, (v) => {
        if (v === 1) throw new Error("boom");
        seen.push(v);
      });
    });
    expect(() => a(1)).toThrow("boom");
    a(2);
    expect(seen).toEqual([0, 2]);
    stop();
  });

  it("after an effect throws, other effects keep reacting to later writes", () => {
    const a = signal(0);
    const c = signal(0);
    const seenC: number[] = [];
    const stop = effectScope(() => {
      effect(() => {
        if (a() === 1) throw new Error("tracked boom");
      });
      applyEffect(c, (v) => void seenC.push(v));
    });
    seenC.length = 0;
    expect(() => a(1)).toThrow("tracked boom");
    c(3);
    expect(seenC).toEqual([3]);
    stop();
  });

  it("a throw on the first run reaches the creator", () => {
    expect(() =>
      effectScope(() => {
        effect(() => {
          throw new Error("first-run boom");
        });
      }),
    ).toThrow("first-run boom");
  });
});

describe("falsy thrown values", () => {
  // The exact thrown value reaches a try/catch reader and the writer.

  function isInternalWrapper(v: unknown): boolean {
    return v instanceof Error && "source" in v;
  }

  describe("a try/catch computed receives the exact thrown value", () => {
    function throwSync(thrown: unknown) {
      let observed: unknown = "NOT_CALLED";
      let result: unknown;
      const stop = effectScope(() => {
        const memo = computed(() => {
          throw thrown;
        });
        const b = computed(() => {
          try {
            return memo();
          } catch (err) {
            observed = err;
            return "errored";
          }
        });
        effect(() => void (result = b()));
      });
      expect(result).toBe("errored");
      stop();
      return observed;
    }

    it("throw undefined → catches undefined", () => {
      const observed = throwSync(undefined);
      expect(isInternalWrapper(observed)).toBe(false);
      expect(observed).toBe(undefined);
    });

    it("throw null → catches null", () => {
      const observed = throwSync(null);
      expect(isInternalWrapper(observed)).toBe(false);
      expect(observed).toBe(null);
    });

    it.each([0, "", false, NaN])(
      "throw %s (falsy primitive) → catches it",
      (v) => {
        expect(Object.is(throwSync(v), v)).toBe(true);
      },
    );

    it("an error with its own .cause isn't unwrapped", () => {
      const inner = new Error("inner");
      const outer = new Error("outer", { cause: inner });
      const observed = throwSync(outer);
      expect(observed).toBe(outer);
      expect((observed as Error).cause).toBe(inner);
    });

    it("a custom error class keeps instanceof", () => {
      class MyError extends Error {}
      const boom = new MyError("custom");
      const observed = throwSync(boom);
      expect(observed).toBe(boom);
      expect(observed).toBeInstanceOf(MyError);
    });
  });

  describe("the writer receives the exact value an effect threw", () => {
    function throwInCompute(thrown: unknown) {
      const armed = signal(false);
      let received: unknown = "NOT_CALLED";
      const stop = effectScope(() => {
        effect(() => {
          if (armed()) throw thrown;
        });
      });
      try {
        armed(true);
      } catch (err) {
        received = err;
      }
      stop();
      return received;
    }

    it("throw undefined → writer catches undefined", () => {
      const received = throwInCompute(undefined);
      expect(isInternalWrapper(received)).toBe(false);
      expect(received).toBe(undefined);
    });

    it("throw null → writer catches null", () => {
      const received = throwInCompute(null);
      expect(isInternalWrapper(received)).toBe(false);
      expect(received).toBe(null);
    });

    it("throw 0 → writer catches 0", () => {
      expect(throwInCompute(0)).toBe(0);
    });
  });
});

describe("error handling", () => {

  it("effect() that writes then throws during creation still flushes the write", () => {
    const s = signal(0);
    const seen: number[] = [];
    effect(() => {
      seen.push(s());
    });
    expect(() =>
      effect(() => {
        s(1);
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(seen).toEqual([0, 1]);
  });

  it("a getter that writes its dep and throws keeps its own error", () => {
    const s = signal(0);
    const c = computed(() => {
      const v = s();
      untracked(() => s(v + 1));
      throw new Error("original");
    });
    expect(() => c()).toThrow("original");
  });
});
