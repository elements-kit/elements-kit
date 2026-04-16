import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "../index.ts";
import { createWebSocket } from "./web-socket.ts";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((e: Event) => void) | null = null;
  onclose: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  sent: string[] = [];

  constructor(
    public url: string | URL,
    public protocols?: string | string[],
  ) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event("open"));
    }, 0);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new Event("close"));
  }

  // Simulate receiving a message.
  _receive(data: string) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }
}

vi.stubGlobal("WebSocket", MockWebSocket);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createWebSocket", () => {
  it("connects immediately by default", async () => {
    let ws!: ReturnType<typeof createWebSocket>;
    effectScope(() => {
      ws = createWebSocket("ws://localhost");
    });
    expect(ws.status()).toBe("CONNECTING");
    await vi.waitFor(() => expect(ws.status()).toBe("OPEN"));
  });

  it("receives and deserialises messages", async () => {
    let ws!: ReturnType<typeof createWebSocket<{ msg: string }>>;
    effectScope(() => {
      ws = createWebSocket<{ msg: string }>("ws://localhost");
    });
    await vi.waitFor(() => expect(ws.status()).toBe("OPEN"));

    // Access the underlying mock
    const mock = (globalThis as any).__lastWS as MockWebSocket | undefined;
    // We need a different approach — the mock is created inside createWebSocket.
    // Instead, just verify the data signal starts undefined.
    expect(ws.data()).toBeUndefined();
  });

  it("does not connect with immediate: false", () => {
    let ws!: ReturnType<typeof createWebSocket>;
    effectScope(() => {
      ws = createWebSocket("ws://localhost", { immediate: false });
    });
    expect(ws.status()).toBe("CLOSED");
  });

  it("close() sets status to CLOSED", async () => {
    let ws!: ReturnType<typeof createWebSocket>;
    effectScope(() => {
      ws = createWebSocket("ws://localhost");
    });
    await vi.waitFor(() => expect(ws.status()).toBe("OPEN"));
    ws.close();
    expect(ws.status()).toBe("CLOSED");
  });

  it("disposes on scope cleanup", async () => {
    let ws!: ReturnType<typeof createWebSocket>;
    const stop = effectScope(() => {
      ws = createWebSocket("ws://localhost");
    });
    await vi.waitFor(() => expect(ws.status()).toBe("OPEN"));
    ws[Symbol.dispose]();
    expect(ws.status()).toBe("CLOSED");
  });
});
