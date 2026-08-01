// @vitest-environment node
/** @jsxRuntime automatic */
/** @jsxImportSource elements-kit */
import { describe, it, expect, vi } from "vitest";
import { jsx } from "../jsx-runtime";
import { renderToString } from "./index";
import { effect, signal } from "../signals";
import type { Props } from "../jsx-runtime/infer";
import { For } from "../for";

describe("renderToString — elements and attributes", () => {
  it("renders an intrinsic element with attributes and text", async () => {
    const html = await renderToString(() => (
      <div id="x" class="a">
        hi
      </div>
    ));
    expect(html).toBe('<div id="x" class="a">hi</div>');
  });

  it("escapes text children (minimal safe set: & and <)", async () => {
    const html = await renderToString(() => <span>{'<b>&"'}</span>);
    expect(html).toBe('<span>&lt;b>&amp;"</span>');
  });

  it('escapes attribute values (minimal safe set: & and ")', async () => {
    const html = await renderToString(() => <div title={'a"b<'} />);
    expect(html).toBe('<div title="a&quot;b<"></div>');
  });

  it("escape handles consecutive and boundary special characters", async () => {
    expect(await renderToString(() => <span>{"&&<<"}</span>)).toBe(
      "<span>&amp;&amp;&lt;&lt;</span>",
    );
    expect(await renderToString(() => <span>{"<start"}</span>)).toBe(
      "<span>&lt;start</span>",
    );
    expect(await renderToString(() => <span>{"end&"}</span>)).toBe(
      "<span>end&amp;</span>",
    );
    expect(await renderToString(() => <span>{"no specials"}</span>)).toBe(
      "<span>no specials</span>",
    );
  });

  it("renders void elements without a closing tag", async () => {
    expect(await renderToString(() => <img src="/a.png" />)).toBe(
      '<img src="/a.png">',
    );
    expect(await renderToString(() => <br />)).toBe("<br>");
  });

  it("emits boolean attributes bare when true, omits when falsy", async () => {
    const html = await renderToString(() => (
      <input disabled={true} readOnly={true} />
    ));
    expect(html).toBe("<input disabled readonly>");

    const none = await renderToString(() => (
      <div hidden={false} title={null as unknown as string} />
    ));
    expect(none).toBe("<div></div>");
  });

  it("maps IDL property names to their attributes", async () => {
    const html = await renderToString(() => (
      <input
        value="a"
        {...({ className: "b", defaultChecked: true } as object)}
      />
    ));
    // class/style are assembled after the prop loop, so class emits last.
    expect(html).toBe('<input value="a" checked class="b">');
  });

  it("skips prop: namespace (no attribute representation)", async () => {
    expect(await renderToString(() => <div prop:id="x" />)).toBe("<div></div>");
  });

  it("merges class prop with class: namespace toggles", async () => {
    const html = await renderToString(() => (
      <div class="a" class:active={true} class:off={false} />
    ));
    expect(html).toBe('<div class="a active"></div>');
  });

  it("merges style prop objects and style: namespace entries", async () => {
    const html = await renderToString(() => (
      <div style={{ backgroundColor: "blue" }} style:color="red" />
    ));
    expect(html).toBe('<div style="background-color:blue;color:red"></div>');
  });

  it("passes string style through", async () => {
    expect(await renderToString(() => <div style="color:red" />)).toBe(
      '<div style="color:red"></div>',
    );
  });

  it("skips null/false style-object entries", async () => {
    const html = await renderToString(() => (
      <div
        style={
          { color: null, "background-color": "red", opacity: false } as never
        }
      />
    ));
    expect(html).toBe('<div style="background-color:red"></div>');
  });

  it("treats truthy non-boolean values on boolean attributes as bare", async () => {
    expect(await renderToString(() => <input checked={1 as never} />)).toBe(
      "<input checked>",
    );
    expect(await renderToString(() => <input disabled={0 as never} />)).toBe(
      "<input>",
    );
  });

  it("maps React-compat aliases (htmlFor)", async () => {
    const html = await renderToString(() => (
      <label {...({ htmlFor: "x" } as object)}>a</label>
    ));
    expect(html).toBe('<label for="x">a</label>');
  });
});

describe("renderToString — reactivity snapshot semantics", () => {
  it("snapshots signal attribute values without subscribing", async () => {
    const s = signal("v");
    const html = await renderToString(() => <div title={s} />);
    expect(html).toBe('<div title="v"></div>');
    expect(() => s("w")).not.toThrow();
  });

  it("wraps dynamic children in slot markers", async () => {
    const s = signal("v");
    const html = await renderToString(() => <div>{() => s()}</div>);
    expect(html).toBe("<div><!--{-->v<!--}--></div>");
  });

  it("treats a signal child as a dynamic child", async () => {
    const s = signal(5);
    const html = await renderToString(() => <div>{s}</div>);
    expect(html).toBe("<div><!--{-->5<!--}--></div>");
  });

  it("does not run effects during server render and restores them after", async () => {
    const spy = vi.fn();
    const Comp = () => {
      effect(spy);
      return <p>x</p>;
    };
    await renderToString(() => <Comp />);
    expect(spy).not.toHaveBeenCalled();

    const after = vi.fn();
    const stop = effect(after);
    stop();
    expect(after).toHaveBeenCalledTimes(1);
  });

  it("skips on: event handler props", async () => {
    const fn = vi.fn();
    const html = await renderToString(() => <button on:click={fn}>x</button>);
    expect(html).toBe("<button>x</button>");
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("renderToString — composition", () => {
  it("renders nested static children", async () => {
    const html = await renderToString(() => (
      <div>
        <span>a</span>
        <span>b</span>
      </div>
    ));
    expect(html).toBe("<div><span>a</span><span>b</span></div>");
  });

  it("flattens array children", async () => {
    const html = await renderToString(() => (
      <ul>
        {[1, 2].map((n) => (
          <li>{n}</li>
        ))}
      </ul>
    ));
    expect(html).toBe("<ul><li>1</li><li>2</li></ul>");
  });

  it("skips null, undefined and boolean children", async () => {
    const html = await renderToString(() => (
      <div>
        {null}
        {false}
        {undefined}a
      </div>
    ));
    expect(html).toBe("<div>a</div>");
  });

  it("renders a static prop as plain text — no dynamic binding", async () => {
    const Greet = (props: Props<{ name: string }>) => <p>{props.name}</p>;
    const html = await renderToString(() => <Greet name="wael" />);
    expect(html).toBe("<p>wael</p>");
  });

  it("renders a reactive prop as a dynamic binding", async () => {
    const Greet = (props: Props<{ name: string }>) => <p>{props.name}</p>;
    const name = signal("wael");
    const html = await renderToString(() => <Greet name={name} />);
    expect(html).toBe("<p><!--{-->wael<!--}--></p>");
  });

  it("renders fragments as bare children", async () => {
    const html = await renderToString(() => (
      <>
        <span>a</span>b
      </>
    ));
    expect(html).toBe("<span>a</span>b");
  });

  it("renders For with range and per-key markers", async () => {
    const items = signal([
      { id: 1, t: "a" },
      { id: 2, t: "b" },
    ]);
    const html = await renderToString(() => (
      <ul>
        <For each={items} by={(x) => x.id}>
          {(x) => <li>{x.t}</li>}
        </For>
      </ul>
    ));
    expect(html).toBe(
      "<ul><!--<For>--><!--[1]--><li>a</li><!--[/1]--><!--[2]--><li>b</li><!--[/2]--><!--</For>--></ul>",
    );
  });
});

describe("renderToString — safety", () => {
  it("throws on innerHTML (no raw HTML sink)", async () => {
    await expect(
      renderToString(() => <div innerHTML="<b>raw</b>" />),
    ).rejects.toThrow(/innerHTML/);
  });

  it("emits textContent as escaped text", async () => {
    expect(await renderToString(() => <div textContent="a<b" />)).toBe(
      "<div>a&lt;b</div>",
    );
  });

  it("rejects class components other than For", async () => {
    class Widget {
      render() {
        return null;
      }
    }
    await expect(
      renderToString(() => jsx(Widget as never, {})),
    ).rejects.toThrow(/class components/i);
  });
});
