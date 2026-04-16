import { type Computed, onCleanup, signal } from "../index.ts";

type BroadcastChannelResult<T> = {
  /** Last received message data. */
  data: Computed<T | undefined>;
  /** Post a message to all other tabs/windows on this channel. */
  post(message: T): void;
} & Disposable;

/**
 * Creates a reactive wrapper around the `BroadcastChannel` API for cross-tab
 * messaging.
 *
 * @param name - The channel name.  All tabs using the same name share messages.
 */
export function createBroadcastChannel<T = unknown>(
  name: string,
): BroadcastChannelResult<T> {
  const channel = new BroadcastChannel(name);
  const data = signal<T | undefined>(undefined);

  channel.onmessage = (e: MessageEvent<T>) => data(e.data);

  const cleanup = () => channel.close();
  onCleanup(cleanup);

  return {
    data: data as Computed<T | undefined>,
    post: (message: T) => channel.postMessage(message),
    [Symbol.dispose]: cleanup,
  };
}
