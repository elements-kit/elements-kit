import { type Computed, onCleanup, signal } from "../index.ts";

type EventSourceStatus = "CONNECTING" | "OPEN" | "CLOSED";

type EventSourceResult<T = unknown> = {
  /** Last received event data (parsed with `deserialise`). */
  data: Computed<T | undefined>;
  /** Last received event name (empty string for unnamed events). */
  event: Computed<string>;
  /** Last event `id` field. */
  lastEventId: Computed<string>;
  /** Reactive connection status. */
  status: Computed<EventSourceStatus>;
  /** Reactive error (set on `onerror`). */
  error: Computed<Event | undefined>;
  /** Manually close the connection. */
  close(): void;
} & Disposable;

/**
 * Creates a reactive wrapper around `EventSource` (Server-Sent Events).
 *
 * @param url - The SSE endpoint URL.
 * @param options.withCredentials - Send credentials (default `false`).
 * @param options.events - Specific named events to listen for (defaults to the unnamed `message` event).
 * @param options.deserialise - Deserialiser for incoming data (default `JSON.parse`).
 */
export function createEventSource<T = unknown>(
  url: string | URL,
  options?: {
    withCredentials?: boolean;
    events?: string[];
    deserialise?: (raw: string) => T;
  },
): EventSourceResult<T> {
  const {
    withCredentials = false,
    events,
    deserialise = (raw: string) => JSON.parse(raw) as T,
  } = options ?? {};

  const data = signal<T | undefined>(undefined);
  const event = signal("");
  const lastEventId = signal("");
  const status = signal<EventSourceStatus>("CONNECTING");
  const error = signal<Event | undefined>(undefined);

  const es = new EventSource(typeof url === "string" ? url : url.href, {
    withCredentials,
  });

  es.onopen = () => status("OPEN");
  es.onerror = (e) => {
    error(e);
    if (es.readyState === EventSource.CLOSED) status("CLOSED");
  };

  const handler = (e: MessageEvent) => {
    data(deserialise(e.data));
    event(e.type);
    lastEventId(e.lastEventId);
  };

  if (events && events.length > 0) {
    for (const ev of events) es.addEventListener(ev, handler as EventListener);
  } else {
    es.onmessage = handler;
  }

  const close = () => {
    es.close();
    status("CLOSED");
  };

  onCleanup(close);

  return {
    data: data as Computed<T | undefined>,
    event: event as Computed<string>,
    lastEventId: lastEventId as Computed<string>,
    status: status as Computed<EventSourceStatus>,
    error: error as Computed<Event | undefined>,
    close,
    [Symbol.dispose]: close,
  };
}
