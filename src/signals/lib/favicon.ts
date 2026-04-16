import { type Signal, effect, signal } from "../index.ts";

/**
 * Returns a writable `Signal<string>` whose value is reflected as the page's
 * favicon `href`.  Writing the signal swaps the `<link rel="icon">` element.
 */
export function createFavicon(initial?: string): Signal<string> {
  const getLink = (): HTMLLinkElement => {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    return link;
  };

  const href = signal<string>(
    initial ?? (typeof document !== "undefined" ? getLink().href || "" : ""),
  );

  effect(() => {
    if (typeof document !== "undefined") {
      getLink().href = href();
    }
  });

  return href;
}
