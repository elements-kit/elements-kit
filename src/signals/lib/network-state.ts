import { type Computed, signal } from "../index.ts";
import { createEventListener } from "./event-listener.ts";

type NetworkStateResult = {
  online: Computed<boolean>;
  downlink: Computed<number | undefined>;
  effectiveType: Computed<string | undefined>;
  rtt: Computed<number | undefined>;
  saveData: Computed<boolean | undefined>;
} & Disposable;

type NetworkInformation = EventTarget & {
  readonly downlink?: number;
  readonly effectiveType?: string;
  readonly rtt?: number;
  readonly saveData?: boolean;
};

/**
 * Returns reactive signals reflecting `navigator.onLine` and the Network
 * Information API (`navigator.connection`) when available.
 */
export function createNetworkState(): NetworkStateResult {
  const connection = (
    navigator as unknown as { connection?: NetworkInformation }
  ).connection;

  const online = signal(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const downlink = signal<number | undefined>(connection?.downlink);
  const effectiveType = signal<string | undefined>(connection?.effectiveType);
  const rtt = signal<number | undefined>(connection?.rtt);
  const saveData = signal<boolean | undefined>(connection?.saveData);

  const updateOnline = () => online(navigator.onLine);

  const updateConnection = () => {
    downlink(connection?.downlink);
    effectiveType(connection?.effectiveType);
    rtt(connection?.rtt);
    saveData(connection?.saveData);
  };

  const cleanups: Array<() => void> = [
    createEventListener(window, "online", updateOnline),
    createEventListener(window, "offline", updateOnline),
  ];
  if (connection) {
    cleanups.push(createEventListener(connection, "change", updateConnection));
  }
  const cleanup = () => cleanups.forEach((fn) => fn());

  return Object.assign(
    {
      online: online as Computed<boolean>,
      downlink: downlink as Computed<number | undefined>,
      effectiveType: effectiveType as Computed<string | undefined>,
      rtt: rtt as Computed<number | undefined>,
      saveData: saveData as Computed<boolean | undefined>,
    },
    { [Symbol.dispose]: cleanup },
  );
}
