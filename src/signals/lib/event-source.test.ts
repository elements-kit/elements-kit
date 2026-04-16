import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createEventSource } from "./event-source.ts";

// Mock EventSource
class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  readyState = MockEventSource.CONNECTING;
  onopen: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  private listeners = new Map<string, EventListener[]>();

  constructor(
    public url: string,
    public options?: { withCredentials?: boolean },
  ) {
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      this.onopen?.(new Event("open"));
    }, 0);
  }

  addEventListener(type: string, listener: EventListener) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  // Test helper — simulate incoming message event.
  _emit(type: string, data: string, lastEventId = "") {
    const event = new MessageEvent(type, { data, lastEventId });
    if (type === "message" && this.onmessage) {
      this.onmessage(event);
    }
    for (const fn of this.listeners.get(type) ?? []) {
      fn(event);
    }
  }
}

vi.stubGlobal("EventSource", MockEventSource);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createEventSource", () => {
  it("connects and transitions to OPEN", async () => {
    let es!: ReturnType<typeof createEventSource>;
    effectScope(() => {
      es = createEventSource("http://localhost/sse");
    });
    expect(es.status()).toBe("CONNECTING");
    await vi.waitFor(() => expect(es.status()).toBe("OPEN"));
  });

  it("close() sets status to CLOSED", async () => {
    let es!: ReturnType<typeof createEventSource>;
    effectScope(() => {
      es = createEventSource("http://localhost/sse");
    });
    await vi.waitFor(() => expect(es.status()).toBe("OPEN"));
    es.close();
    expect(es.status()).toBe("CLOSED");
  });

  it("disposes via Symbol.dispose", async () => {
    let es!: ReturnType<typeof createEventSource>;
    effectScope(() => {
      es = createEventSource("http://localhost/sse");
    });
    await vi.waitFor(() => expect(es.status()).toBe("OPEN"));
    es[Symbol.dispose]();
    expect(es.status()).toBe("CLOSED");
  });
});
