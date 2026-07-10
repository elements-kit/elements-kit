import { reactive } from "@/signals";
import { IBox } from "./box";

interface IPhysics {
  start(): void;
  track(box: Partial<IBox>): void;
  abort(): void;
}

interface Timestamped {
  timestamp: number;
}

class Physics implements IPhysics {
  #box: IBox;
  @reactive() #snapshot: IBox & Timestamped = INITIAL_STATE;

  @reactive() current: IBox;

  constructor(box: IBox) {
    this.#box = box;
    this.current = this.#createSnapshot();
  }

  start(): void {
    this.current = this.#createSnapshot();
  }

  track(box: Partial<IBox>): void {
    const delta = this.velocity(box);
    this.#snapshot.x += delta.x ?? 0;
    this.#snapshot.y += delta.y ?? 0;
    this.#snapshot.w += delta.w ?? 0;
    this.#snapshot.h += delta.h ?? 0;
    this.current = { ...this.#snapshot };
  }

  velocity(box: Partial<IBox>) {
    const prev = this.#snapshot;
    const now = performance.now();
    const dt = now - prev.timestamp;
    const delta: Partial<IBox> = {};
    for (const axis of ["x", "y", "w", "h"] as const) {
      const raw = box[axis];
      if (raw === undefined) continue;
      delta[axis] = (raw - prev[axis]) / dt;
    }
    return delta;
  }

  commit(): void {
    this.#clear();
    this.#box.x = this.#snapshot.x;
    this.#box.y = this.#snapshot.y;
    this.#box.w = this.#snapshot.w;
    this.#box.h = this.#snapshot.h;
  }

  abort() {
    this.#clear();
  }

  #clear() {
    this.#snapshot = INITIAL_STATE;
  }

  #createSnapshot(): IBox & Timestamped {
    return {
      x: this.#box.x,
      y: this.#box.y,
      w: this.#box.w,
      h: this.#box.h,
      timestamp: performance.now(),
    };
  }
}

const INITIAL_STATE: IBox & Timestamped = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  timestamp: 0,
};
