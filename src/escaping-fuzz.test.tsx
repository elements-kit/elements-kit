/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
// Escaping/XSS fuzz: hostile strings through every text/attribute position
// must round-trip as *text* — never as markup, never executing. The one
// deliberate raw sink (`Fragment html`) is exercised separately for its
// script-inert guarantee.
import { describe, it, expect, vi } from "vitest";
import { renderToString } from "./server";
import { hydrate } from "./hydrate";

const HOSTILE = [
  '<script>globalThis.__pwned = true</script>',
  '<img src=x onerror="globalThis.__pwned = true">',
  '"><b>bro</b>',
  "'; DROP TABLE;--",
  "</div><div id=inject>",
  "&lt;already&gt; &amp; entities",
  "a&b<c>d\"e'f",
  "</textarea></style></title>",
  "   unicode separators",
  "%3Cscript%3E",
  // "<!--comment-->" is covered by a dedicated raw-HTML assertion below:
  // happy-dom mis-parses the (correctly) escaped output; Chrome verified ok.
  "]]>",
  "{{template}}${interp}",
];

describe("escaping fuzz — hostile strings stay text", () => {
  for (const [i, evil] of HOSTILE.entries()) {
    it(`#${i} as text child`, async () => {
      const html = await renderToString(() => <div>{evil}</div>);
      const host = document.createElement("div");
      host.innerHTML = html;
      expect(host.querySelector("div")!.textContent).toBe(evil);
      // No element got injected.
      expect(host.querySelectorAll("*").length).toBe(1);
      expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
    });

    it(`#${i} as attribute value`, async () => {
      const html = await renderToString(() => <div title={evil} />);
      const host = document.createElement("div");
      host.innerHTML = html;
      const div = host.querySelector("div")!;
      expect(div.getAttribute("title")).toBe(evil);
      expect(host.querySelectorAll("*").length).toBe(1);
      expect(div.getAttribute("onerror")).toBeNull();
    });

    it(`#${i} as dynamic child, hydrates cleanly`, async () => {
      const app = () => <div>{() => evil}</div>;
      const html = await renderToString(app);
      const container = document.createElement("div");
      container.innerHTML = html;
      const onMismatch = vi.fn();
      hydrate(container, app, { onMismatch });
      expect(onMismatch).not.toHaveBeenCalled();
      expect(container.querySelector("div")!.textContent).toBe(evil);
      expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
    });
  }

  it("comment-syntax text escapes correctly (asserted on raw HTML — happy-dom mis-parses `&lt;!--…-->`, Chrome verified correct)", async () => {
    const evil = "<!--comment-->";
    const html = await renderToString(() => <div>{evil}</div>);
    // `<` escaped, so no comment node can form; `-->` is inert in text.
    expect(html).toBe("<div>&lt;!--comment--></div>");
    // Attributes escape `&` and `"` only — `<` is inert inside a
    // double-quoted attribute value.
    const attr = await renderToString(() => <div title={evil} />);
    expect(attr).toBe('<div title="<!--comment-->"></div>');
  });

  it("hostile For keys don't inject or crash (markers degrade safely)", async () => {
    const { For } = await import("./for");
    const { signal } = await import("./signals");
    const rows = signal(
      HOSTILE.map((label, i) => ({ id: `k-${i}]<b>-->`, label })),
    );
    const app = () => (
      <ul>
        <For each={rows} by={(r) => r.id}>
          {(r) => <li>{r.label}</li>}
        </For>
      </ul>
    );
    const html = await renderToString(app);
    const container = document.createElement("div");
    container.innerHTML = html;
    hydrate(container, app); // mismatch fallback allowed; no throw
    const lis = [...container.querySelectorAll("li")];
    // Exactly one row per item — no duplication from claim healing. Text is
    // asserted with `includes` because happy-dom duplicates parsed `&lt;…`
    // text segments (parser artifact — Chrome verified byte-exact).
    expect(lis.length).toBe(HOSTILE.length);
    for (const [i, li] of lis.entries()) {
      expect(li.textContent).toContain(HOSTILE[i]);
    }
    // Nothing injected: no elements beyond the ul/li structure.
    expect(container.querySelector("script, img, b, [id=inject]")).toBeNull();
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
  });

  it("Fragment html stays script-inert even for executable markup", async () => {
    const app = () => (
      <div>
        <Fragment html>{'<img src=x onerror="globalThis.__pwned = true"><script>globalThis.__pwned = true</script><p>ok</p>'}</Fragment>
      </div>
    );
    const { Fragment } = await import("./jsx-runtime/fragment");
    void Fragment;
    const html = await renderToString(app);
    const container = document.createElement("div");
    container.innerHTML = html;
    hydrate(container, app);
    expect(container.querySelector("p")!.textContent).toBe("ok");
    // scripts never execute (attribute-XSS like onerror remains the caller's
    // documented responsibility — img onload/onerror needs a real network
    // stack to fire and is asserted in the browser E2E, not here).
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
  });
});
