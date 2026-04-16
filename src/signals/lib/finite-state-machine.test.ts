import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createFiniteStateMachine } from "./finite-state-machine.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

type TrafficState = "red" | "yellow" | "green";
type TrafficEvent = "GO" | "SLOW" | "STOP";

const transitions = {
  red: { GO: "green" as const },
  green: { SLOW: "yellow" as const },
  yellow: { STOP: "red" as const },
};

describe("createFiniteStateMachine", () => {
  it("starts in the initial state", () => {
    let fsm!: ReturnType<
      typeof createFiniteStateMachine<TrafficState, TrafficEvent>
    >;
    effectScope(() => {
      fsm = createFiniteStateMachine<TrafficState, TrafficEvent>(
        "red",
        transitions,
      );
    });
    expect(fsm.state()).toBe("red");
  });

  it("transitions on valid event", () => {
    let fsm!: ReturnType<
      typeof createFiniteStateMachine<TrafficState, TrafficEvent>
    >;
    effectScope(() => {
      fsm = createFiniteStateMachine<TrafficState, TrafficEvent>(
        "red",
        transitions,
      );
    });
    fsm.send("GO");
    expect(fsm.state()).toBe("green");
  });

  it("does not transition on invalid event", () => {
    let fsm!: ReturnType<
      typeof createFiniteStateMachine<TrafficState, TrafficEvent>
    >;
    effectScope(() => {
      fsm = createFiniteStateMachine<TrafficState, TrafficEvent>(
        "red",
        transitions,
      );
    });
    fsm.send("SLOW"); // invalid from red
    expect(fsm.state()).toBe("red");
  });

  it("can() returns true for valid transition", () => {
    let fsm!: ReturnType<
      typeof createFiniteStateMachine<TrafficState, TrafficEvent>
    >;
    effectScope(() => {
      fsm = createFiniteStateMachine<TrafficState, TrafficEvent>(
        "red",
        transitions,
      );
    });
    expect(fsm.can("GO")).toBe(true);
    expect(fsm.can("SLOW")).toBe(false);
  });

  it("calls enter/exit hooks on transition", () => {
    const enterRed = vi.fn();
    const exitRed = vi.fn();
    const enterGreen = vi.fn();

    let fsm!: ReturnType<
      typeof createFiniteStateMachine<TrafficState, TrafficEvent>
    >;
    effectScope(() => {
      fsm = createFiniteStateMachine<TrafficState, TrafficEvent>(
        "red",
        transitions,
        {
          on: {
            red: { enter: enterRed, exit: exitRed },
            green: { enter: enterGreen },
          },
        },
      );
    });

    expect(enterRed).toHaveBeenCalledOnce();
    fsm.send("GO");
    expect(exitRed).toHaveBeenCalledOnce();
    expect(enterGreen).toHaveBeenCalledOnce();
  });
});
