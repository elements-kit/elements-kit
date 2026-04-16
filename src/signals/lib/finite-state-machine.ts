import { type Computed, signal } from "../index.ts";

type Transitions<S extends string, E extends string> = Partial<
  Record<S, Partial<Record<E, S>>>
>;

type StateHooks<S extends string> = Partial<
  Record<S, { enter?: () => void; exit?: () => void }>
>;

type FSMResult<S extends string, E extends string> = {
  state: Computed<S>;
  send(event: E): void;
  can(event: E): boolean;
};

/**
 * Type-safe finite state machine with optional `enter` / `exit` lifecycle
 * hooks per state.
 */
export function createFiniteStateMachine<S extends string, E extends string>(
  initial: S,
  transitions: Transitions<S, E>,
  options?: { on?: StateHooks<S> },
): FSMResult<S, E> {
  const state = signal<S>(initial);

  options?.on?.[initial]?.enter?.();

  const send = (event: E) => {
    const current = state();
    const next = transitions[current]?.[event];
    if (next === undefined || next === current) return;

    options?.on?.[current]?.exit?.();
    state(next);
    options?.on?.[next]?.enter?.();
  };

  const can = (event: E) => transitions[state()]?.[event] !== undefined;

  return { state: state as Computed<S>, send, can };
}
