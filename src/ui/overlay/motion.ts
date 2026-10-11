import { signal, Signal } from "@/signals";

export interface IMotion {
  value: number;
  readonly displacement: number;
  readonly delta: number;
  readonly velocity: number;
  abort(): void;
}

export class Motion implements IMotion {
  #initial: number;
  #time: number;
  readonly #value: Signal<number>;
  readonly #delta: Signal<number>;
  readonly #velocity: Signal<number>;

  constructor(value = 0) {
    this.#initial = value;
    this.#time = performance.now();
    this.#value = signal(value);
    this.#delta = signal(0);
    this.#velocity = signal(0);
  }

  get value(): number {
    return this.#value();
  }

  set value(value: number) {
    const now = performance.now();
    const prev = this.#value();
    const dt = now - this.#time;
    const delta = value - prev;
    this.#delta(delta);
    if (dt > 0) this.#velocity(delta / dt);
    this.#value(value);
    this.#time = now;
  }

  get delta(): number {
    return this.#delta();
  }

  get velocity(): number {
    return this.#velocity();
  }

  /** How far the value has moved from its initial (seed) — reactive.
   * The displacement column: `value − initial`, starts at 0. */
  get displacement(): number {
    return this.#value() - this.#initial;
  }

  /** Nudge the value by a displacement — delta/velocity fall out of the setter. */
  move(delta: number): void {
    this.value = this.#value() + delta;
  }

  abort(initial?: number): void {
    if (initial !== undefined) {
      this.#initial = initial;
    }
    this.#time = performance.now();
    this.#value(this.#initial);
    this.#delta(0);
    this.#velocity(0);
  }
}
