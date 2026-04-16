import { type Computed, onCleanup, signal } from "../index.ts";

type WebSocketStatus = "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED";

type WebSocketResult<T = unknown> = {
  /** Last received message data (parsed with `deserialise`). */
  data: Computed<T | undefined>;
  /** Reactive connection status. */
  status: Computed<WebSocketStatus>;
  /** Send a message (serialised with `serialise`). */
  send(data: T): void;
  /** Manually close the connection. */
  close(code?: number, reason?: string): void;
  /** Manually (re-)open the connection. */
  open(): void;
} & Disposable;

/**
 * Creates a reactive WebSocket connection.
 *
 * @param url - The WebSocket URL.
 * @param options.protocols - Sub-protocols.
 * @param options.immediate - Connect on creation (default `true`).
 * @param options.serialise - Serialiser for outgoing data (default `JSON.stringify`).
 * @param options.deserialise - Deserialiser for incoming data (default `JSON.parse`).
 */
export function createWebSocket<T = unknown>(
  url: string | URL,
  options?: {
    protocols?: string | string[];
    immediate?: boolean;
    serialise?: (data: T) => string | ArrayBufferLike | Blob;
    deserialise?: (raw: string | ArrayBuffer | Blob) => T;
  },
): WebSocketResult<T> {
  const {
    protocols,
    immediate = true,
    serialise = (d: T) => JSON.stringify(d),
    deserialise = (raw: string | ArrayBuffer | Blob) =>
      JSON.parse(raw as string) as T,
  } = options ?? {};

  const data = signal<T | undefined>(undefined);
  const status = signal<WebSocketStatus>("CLOSED");
  let ws: WebSocket | undefined;

  const connect = () => {
    if (
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    )
      return;
    status("CONNECTING");
    ws = new WebSocket(url, protocols);

    ws.onopen = () => status("OPEN");
    ws.onclose = () => status("CLOSED");
    ws.onerror = () => status("CLOSED");
    ws.onmessage = (e: MessageEvent) => {
      data(deserialise(e.data));
    };
  };

  const send = (d: T) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(serialise(d) as string);
    }
  };

  const close = (code?: number, reason?: string) => {
    if (ws) {
      status("CLOSING");
      ws.close(code, reason);
    }
  };

  if (immediate) connect();

  const cleanup = () => {
    ws?.close();
  };
  onCleanup(cleanup);

  return {
    data: data as Computed<T | undefined>,
    status: status as Computed<WebSocketStatus>,
    send,
    close,
    open: connect,
    [Symbol.dispose]: cleanup,
  };
}
