import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createMotion } from "./motion.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("createMotion", () => {
  it("starts with null values", () => {
    let m!: ReturnType<typeof createMotion>;
    effectScope(() => {
      m = createMotion();
    });
    expect(m.acceleration()).toBeNull();
    expect(m.rotationRate()).toBeNull();
    expect(m.interval()).toBeNull();
  });

  it("updates on devicemotion event", () => {
    let m!: ReturnType<typeof createMotion>;
    effectScope(() => {
      m = createMotion();
    });

    const accel = { x: 1, y: 2, z: 3 };
    const rotation = { alpha: 0, beta: 90, gamma: -45 };
    window.dispatchEvent(
      Object.assign(new Event("devicemotion"), {
        acceleration: accel,
        accelerationIncludingGravity: accel,
        rotationRate: rotation,
        interval: 16,
      }),
    );

    expect(m.interval()).toBe(16);
  });

  it("stops reacting after Symbol.dispose", () => {
    let m!: ReturnType<typeof createMotion>;
    effectScope(() => {
      m = createMotion();
    });
    m[Symbol.dispose]();
    window.dispatchEvent(
      Object.assign(new Event("devicemotion"), { interval: 100 }),
    );
    expect(m.interval()).toBeNull();
  });
});
