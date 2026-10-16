import { describe, expect, it, test } from "vitest";
import {
  computed,
  effect,
  effectScope,
  onCleanup,
  signal,
  untracked,
} from "./lib";

describe("signal writes and reads", () => {
  it("should store and return value on read", () => {
    const $x = signal(1);
    expect($x).toBeInstanceOf(Function);
    expect($x()).toBe(1);
  });

  it("should update signal via setter", () => {
    const $x = signal(1);
    $x(2);
    expect($x()).toBe(2);
  });

  it("should update signal via update function", () => {
    const $x = signal(1);
    $x(untracked($x) + 1);
    expect($x()).toBe(2);
  });

  it("should update signal with functional value", () => {
    // Functions are stored as values, not called as updaters.
    const $x = signal<() => number>(() => 10);
    expect($x()()).toBe(10);
    $x(() => 20);
    expect($x()()).toBe(20);
  });
});

describe("signal, effect and computed basics", () => {
  // root(fn): effectScope whose body gets its own dispose; an early dispose
  // applies once the body returns.
  function root<T>(fn: (dispose: () => void) => T): T {
    let stop: (() => void) | undefined;
    let early = false;
    let result!: T;
    const dispose = () => (stop ? stop() : void (early = true));
    stop = effectScope(() => {
      result = fn(dispose);
    });
    if (early) stop();
    return result;
  }

  const runOnce = (fn: () => void) => effect(() => untracked(fn));

  describe("Create signals", () => {
    test("Create and read a computed", () => {
      root(() => {
        const memo = computed(() => "Hello");
        expect(memo()).toBe("Hello");
      });
    });
    test("an effect with an untracked body runs once on creation", () => {
      let temp: string;
      root(() => {
        runOnce(() => (temp = "impure"));
      });
      expect(temp!).toBe("impure");
    });
  });

  describe("Update signals", () => {
    test("Repeated signal reads update once per write", () => {
      const value = signal(0);
      let runs = 0,
        total = 0;
      root(() => {
        effect(() => {
          runs++;
          total = 0;
          for (let i = 0; i < 1000; i++) total += value();
        });
      });

      expect(runs).toBe(1);
      expect(total).toBe(0);
      value(1);
      expect(runs).toBe(2);
      expect(total).toBe(1000);
    });
    test("Repeated signal reads clean up when disposed", () => {
      const value = signal(0);
      let runs = 0;
      const dispose = root((dispose) => {
        effect(() => {
          runs++;
          for (let i = 0; i < 1000; i++) value();
        });
        return dispose;
      });

      expect(runs).toBe(1);
      value(1);
      expect(runs).toBe(2);
      dispose();
      value(2);
      expect(runs).toBe(2);
    });
    test("Repeated signal reads clean up conditional dependencies", () => {
      const enabled = signal(true);
      const value = signal(0);
      let runs = 0,
        total = 0;

      root(() => {
        effect(() => {
          runs++;
          total = 0;
          if (enabled()) {
            for (let i = 0; i < 1000; i++) total += value();
          }
        });
      });

      expect(runs).toBe(1);
      expect(total).toBe(0);
      value(1);
      expect(runs).toBe(2);
      expect(total).toBe(1000);
      enabled(false);
      expect(runs).toBe(3);
      expect(total).toBe(0);
      value(2);
      expect(runs).toBe(3);
      enabled(true);
      expect(runs).toBe(4);
      expect(total).toBe(2000);
      value(3);
      expect(runs).toBe(5);
      expect(total).toBe(3000);
    });
    test("Create and trigger a computed", () => {
      root(() => {
        const name = signal("John"),
          memo = computed(() => `Hello ${name()}`);
        expect(memo()).toBe("Hello John");
        name("Jake");
        expect(memo()).toBe("Hello Jake");
      });
    });
    test("Create and trigger a computed in an effect", () => {
      root(() => {
        let temp: string;
        const name = signal("John"),
          memo = computed(() => `Hello ${name()}`);
        effect(() => void (temp = `${memo()}!!!`));
        expect(temp!).toBe("Hello John!!!");
        name("Jake");
        expect(temp!).toBe("Hello Jake!!!");
      });
    });
    test("Create and trigger an Effect", () => {
      root(() => {
        let temp: string;
        const sign = signal("thoughts");
        effect(() => void (temp = `unpure ${sign()}`));
        expect(temp!).toBe("unpure thoughts");
        sign("mind");
        expect(temp!).toBe("unpure mind");
      });
    });
    test("Create and trigger an Effect with function signals", () => {
      root(() => {
        let temp: string;
        const sign = signal<() => string>(() => "thoughts");
        effect(() => void (temp = `unpure ${sign()()}`));
        expect(temp!).toBe("unpure thoughts");
        sign(() => "mind");
        expect(temp!).toBe("unpure mind");
      });
    });
  });

  describe("Untrack signals", () => {
    test("Mute an effect", () => {
      root(() => {
        let temp: string;
        const sign = signal("thoughts");
        effect(() => void (temp = `unpure ${untracked(sign)}`));
        expect(temp!).toBe("unpure thoughts");
        sign("mind");
        expect(temp!).toBe("unpure thoughts");
      });
    });
  });

  // The reader is created first; the writing effect then runs.
  describe("Effect grouping of signals", () => {
    test("Cross-setting in an effect update", () => {
      root(() => {
        let count = 0;
        const a = signal(1);
        const b = signal(0);
        effect(() => void (count += a()));
        effect(() => {
          a(untracked(a) + b());
        });
        b(untracked(b) + 1);
        expect(count).toBe(3);
      });
    });
    test("an effect that catches its own error keeps working", () => {
      root(() => {
        let error: Error;
        const a = signal(0);
        const b = signal(0);
        effect(() => void (a() + b()));
        effect(() => {
          try {
            a(1);
            throw new Error("test");
          } catch (e) {
            error = e as Error;
          }
        });
        expect(a()).toBe(1);
        expect(b()).toBe(0);
        a(2);
        expect(a()).toBe(2);
        expect(error!).toBeInstanceOf(Error);
        expect(error!.message).toBe("test");
      });
    });
    test("Multiple sets", () => {
      root(() => {
        let count = 0;
        const a = signal(0);
        effect(() => void (count = a()));
        effect(() => {
          a(1);
          a(0);
        });
        expect(count).toBe(0);
      });
    });
  });

  describe("onCleanup", () => {
    test("Clean an effect", () => {
      root(() => {
        let temp: string | undefined;
        const sign = signal("thoughts");
        effect(() => {
          sign();
          onCleanup(() => (temp = "after"));
        });
        expect(temp).toBeUndefined();
        sign("mind");
        expect(temp).toBe("after");
      });
    });
    test("Explicit root disposal", () => {
      let temp: string | undefined, disposer: () => void;
      root((dispose) => {
        disposer = dispose;
        onCleanup(() => (temp = "disposed"));
      });
      expect(temp).toBeUndefined();
      disposer!();
      expect(temp).toBe("disposed");
    });
  });

  describe("errors", () => {
    test("a throw in a scope body reaches the caller", () => {
      expect(() =>
        root(() => {
          throw "fail";
        }),
      ).toThrow("fail");
    });
  });
});
