// @vitest-environment node
import { test, expect } from "vitest";

const utilityModules = [
  "./active-element.ts",
  "./async.ts",
  "./debounced.ts",
  "./element-rect.ts",
  "./element-scroll.ts",
  "./environment.ts",
  "./event-driven.ts",
  "./event-listener.ts",
  "./focus-within.ts",
  "./hover.ts",
  "./intersection-observer.ts",
  "./interval.ts",
  "./location.ts",
  "./long-press.ts",
  "./media-devices.ts",
  "./media-player.ts",
  "./media-query.ts",
  "./mutation-observer.ts",
  "./network.ts",
  "./on-click-outside.ts",
  "./orientation.ts",
  "./previous.ts",
  "./promise.ts",
  "./resize-observer.ts",
  "./retry.ts",
  "./routing.ts",
  "./search-params.ts",
  "./storage.ts",
  "./throttled.ts",
  "./timeout.ts",
  "./window-focus.ts",
  "./window-size.ts",
] as const;

test.each(utilityModules)("imports %s in Node without crashing", async (path) => {
  await expect(import(path)).resolves.toBeDefined();
});

test("singletons return neutral values in Node", async () => {
  const { windowSize } = await import("./window-size.ts");
  expect(windowSize.width()).toBe(0);
  expect(windowSize.height()).toBe(0);

  const { online } = await import("./network.ts");
  expect(online()).toBe(true);

  const { windowFocused } = await import("./window-focus.ts");
  expect(windowFocused()).toBe(true);

  const { activeElement } = await import("./active-element.ts");
  expect(activeElement()).toBe(null);

  const { orientation } = await import("./orientation.ts");
  expect(orientation.angle()).toBe(0);
  expect(orientation.type()).toBe("portrait-primary");

  const { currentLocation } = await import("./location.ts");
  expect(currentLocation.href()).toBe("");
  expect(currentLocation.pathname()).toBe("");
  expect(currentLocation.search()).toBe("");
  expect(currentLocation.hash()).toBe("");
});

test("isBrowser is false in Node", async () => {
  const { isBrowser } = await import("./environment.ts");
  expect(isBrowser).toBe(false);
});

test("storage signals fall back to in-memory state in Node", async () => {
  const { createLocalStorage, createSessionStorage } = await import(
    "./storage.ts"
  );

  const theme = createLocalStorage("theme", "light");
  expect(theme()).toBe("light");
  theme("dark");
  expect(theme()).toBe("dark");

  const draft = createSessionStorage("draft", { title: "" });
  expect(draft()).toEqual({ title: "" });
});
