import { describe, expect, it, vi } from "vitest";
import { Box, type PlainBox } from "./box.ts";
import { Session, SnapSession } from "./session.ts";

/** A Box over a plain in-memory value — the minimal concrete subclass. */
class MemoryBox extends Box {
  value: Required<PlainBox>;
  bounds: Required<PlainBox> = { x: 0, y: 0, w: 1000, h: 1000 };

  constructor(value: Required<PlainBox>) {
    super();
    this.value = value;
  }
  protected read(): Required<PlainBox> {
    return { ...this.value };
  }
  protected write(box: Partial<PlainBox>): void {
    Object.assign(this.value, box);
  }
  protected override region(): Required<PlainBox> {
    return this.bounds;
  }
}

const makeBox = () => new MemoryBox({ x: 100, y: 100, w: 200, h: 200 });

describe("Editable / Box", () => {
  it("reads live geometry through the getters", () => {
    const b = makeBox();
    expect(b.x()).toBe(100);
    expect(b.w()).toBe(200);
    b.value.x = 250;
    expect(b.x()).toBe(250);
  });

  it("set() outside an edit is a plain committed write", () => {
    const b = makeBox();
    b.set({ x: 300, h: 50 });
    expect(b.value).toEqual({ x: 300, y: 100, w: 200, h: 50 });
  });

  it("begin() while an edit is active throws", () => {
    const b = makeBox();
    b.begin();
    expect(() => b.begin()).toThrow();
    b.cancel();
    expect(() => b.begin()).not.toThrow();
  });

  it("cancel() restores the snapshot", () => {
    const b = makeBox();
    b.begin();
    b.set({ x: 500, y: 600 });
    b.cancel();
    expect(b.value).toEqual({ x: 100, y: 100, w: 200, h: 200 });
  });

  it("in-edit set() writes live inside the bounds", () => {
    const b = makeBox();
    b.begin();
    b.set({ x: 400 });
    expect(b.value.x).toBe(400);
    b.cancel();
  });

  it("rubbers past the bounds during the edit (default session)", () => {
    const b = makeBox();
    // x bound: [0, 1000 − 200] = [0, 800]; 1100 overshoots by 300.
    b.begin();
    b.set({ x: 1100 });
    expect(b.value.x).toBeGreaterThan(800);
    expect(b.value.x).toBeLessThan(1100);
    b.cancel();
  });

  it("free release clamps driven axes into the bounds", () => {
    const b = makeBox();
    b.begin();
    b.set({ x: 1100 });
    const rested = b.release();
    expect(rested).not.toBeNull();
    expect(b.value.x).toBe(800); // clamped to the hard bound
    expect(b.value.y).toBe(100); // undriven axis untouched
  });

  it("release() without driven axes returns the current box", () => {
    const b = makeBox();
    b.begin();
    const rested = b.release();
    expect(rested).toEqual({ x: 100, y: 100, w: 200, h: 200 });
  });
});

describe("Session", () => {
  it("snap stops rest on the nearest stop", () => {
    const b = makeBox();
    // h bounds [0, 1000]; stops → 200 / 500 / 900.
    b.begin(new SnapSession([0.2, 0.5, 0.9]));
    b.set({ h: 540 });
    b.set({ h: 540 }); // settle velocity
    b.release();
    expect(b.value.h).toBe(500);
  });

  it("a fast flick projects to the next stop", () => {
    const b = makeBox();
    b.begin(new SnapSession([0.2, 0.5, 0.9]));
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(1000);
    b.set({ h: 500 });
    now.mockReturnValue(1100);
    b.set({ h: 620 }); // +1.2 px/ms, growing → projects past 500 toward 900
    b.release();
    now.mockRestore();
    expect(b.value.h).toBe(900);
  });

  it("a flick past the smallest stop rests null and restores", () => {
    const b = makeBox();
    b.begin(new SnapSession([0.2, 0.5, 0.9]));
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(1000);
    b.set({ h: 180 });
    now.mockReturnValue(1100);
    b.set({ h: 60 }); // shrinking fast below the 200 stop
    const rested = b.release();
    now.mockRestore();
    expect(rested).toBeNull();
    expect(b.value.h).toBe(200); // snapshot restored
  });

  it("string stops are px lengths", () => {
    const b = makeBox();
    b.begin(new SnapSession(["300px", "600px"]));
    b.set({ h: 650 });
    b.set({ h: 650 });
    b.release();
    expect(b.value.h).toBe(600);
  });

  it("custom physics: subclass overrides during (no rubber)", () => {
    class RawSession extends Session {
      override during(value: number): number {
        return value; // track raw, no resistance
      }
    }
    const b = makeBox();
    b.begin(new RawSession());
    b.set({ x: 1100 });
    expect(b.value.x).toBe(1100);
    b.cancel();
  });

  it("a session is one edit — reusing a spent one throws", () => {
    const spent = new SnapSession([0.5]);
    const a = makeBox();
    a.begin(spent);
    a.set({ h: 300 });
    a.set({ h: 300 });
    a.release();
    expect(a.value.h).toBe(500);
    const b = makeBox();
    expect(() => b.begin(spent)).toThrow(/one per edit|already used/);
    // A cancelled session is spent too.
    const aborted = new Session();
    const c = makeBox();
    c.begin(aborted);
    c.cancel();
    expect(() => c.begin(aborted)).toThrow(/one per edit|already used/);
    // The box itself stays editable with a fresh session.
    expect(() => c.begin()).not.toThrow();
    c.cancel();
  });

  it("custom physics: subclass overrides rest (grid snap)", () => {
    class GridSession extends Session {
      override rest(value: number): number {
        return Math.round(value / 100) * 100;
      }
    }
    const b = makeBox();
    b.begin(new GridSession());
    b.set({ x: 342 });
    b.release();
    expect(b.value.x).toBe(300);
  });
});
