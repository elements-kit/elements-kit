/** @jsxImportSource react */
import { describe, it, expect } from "vitest";
import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { signal, computed } from "@/signals/index.ts";
import { useSignal } from "./react.ts";

// Stands in for a signal reading browser-only state: "light" everywhere the
// server can see, whatever the browser actually holds once hydration runs.
const prefersDark = signal(false);
const theme = computed(() => (prefersDark() ? "dark" : "light"));

function WithServerValue() {
  return <span>{useSignal(theme, "light")}</span>;
}

function WithoutServerValue() {
  return <span>{useSignal(theme)}</span>;
}

async function hydrate(Component: () => React.ReactNode) {
  prefersDark(false);
  const html = renderToString(<Component />); // server: no browser state
  prefersDark(true); // ...the browser disagrees

  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);

  const errors: unknown[] = [];
  await act(async () => {
    hydrateRoot(container, <Component />, {
      onRecoverableError: (e) => errors.push(e),
    });
  });

  return { errors, text: container.textContent };
}

describe("useSignal hydration", () => {
  it("matches the server render, then swaps in the live value", async () => {
    const { errors, text } = await hydrate(WithServerValue);
    expect(errors).toEqual([]);
    expect(text).toBe("dark"); // re-rendered after hydration
  });

  it("mismatches without a server value", async () => {
    const { errors } = await hydrate(WithoutServerValue);
    expect(errors.length).toBeGreaterThan(0);
  });
});
