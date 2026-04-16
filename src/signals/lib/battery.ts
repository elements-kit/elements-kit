import { type Computed, onCleanup, signal } from "../index.ts";

type BatteryResult = {
  charging: Computed<boolean>;
  level: Computed<number>;
  chargingTime: Computed<number>;
  dischargingTime: Computed<number>;
  supported: Computed<boolean>;
} & Disposable;

type BatteryManager = {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
};

/**
 * Exposes the Battery Status API as reactive signals.
 * `supported` will be `false` when the API is unavailable.
 */
export function createBattery(): BatteryResult {
  const supported = signal(
    typeof navigator !== "undefined" && "getBattery" in navigator,
  );
  const charging = signal(false);
  const level = signal(1);
  const chargingTime = signal(0);
  const dischargingTime = signal(Infinity);

  let battery: BatteryManager | undefined;

  const update = () => {
    if (!battery) return;
    charging(battery.charging);
    level(battery.level);
    chargingTime(battery.chargingTime);
    dischargingTime(battery.dischargingTime);
  };

  const events = [
    "chargingchange",
    "levelchange",
    "chargingtimechange",
    "dischargingtimechange",
  ];

  const cleanup = () => {
    events.forEach((e) => battery?.removeEventListener(e, update));
  };

  if (supported()) {
    (navigator as { getBattery(): Promise<BatteryManager> })
      .getBattery()
      .then((b) => {
        battery = b;
        update();
        events.forEach((e) => b.addEventListener(e, update));
      });
  }

  onCleanup(cleanup);

  return Object.assign(
    {
      supported: supported as Computed<boolean>,
      charging: charging as Computed<boolean>,
      level: level as Computed<number>,
      chargingTime: chargingTime as Computed<number>,
      dischargingTime: dischargingTime as Computed<number>,
    },
    { [Symbol.dispose]: cleanup },
  );
}
