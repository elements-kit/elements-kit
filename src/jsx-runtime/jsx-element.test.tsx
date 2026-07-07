import { describe, expect, it } from "vitest";

import { createElement } from "./element";
import type { JSX } from "./index";

// `JSX.Element` is non-null (like React): intrinsic tags and fragments always
// produce a node, so JSX expressions type-check anywhere a `Node` is expected
// — no `as Node` casts. Null-returning components keep `| null` on their own
// signatures; at runtime `createElement` still propagates that null.

describe("JSX.Element", () => {
  it("JSX expressions are assignable to Node without narrowing", () => {
    const node: Node = <div />;
    const fragment: Node = (
      <>
        <span>a</span>
        <span>b</span>
      </>
    );
    expect(node).toBeInstanceOf(Element);
    expect(fragment).toBeInstanceOf(DocumentFragment);
  });

  it("appends straight into the DOM", () => {
    const host = document.createElement("div");
    host.append(<span>hi</span>);
    expect(host.textContent).toBe("hi");
  });

  it("function components may return null; createElement propagates it", () => {
    const Nothing = (): JSX.Element | null => null;
    expect(createElement(Nothing)).toBeNull();

    const Something = (): JSX.Element | null => <p>ok</p>;
    const el = createElement(Something);
    expect(el).toBeInstanceOf(HTMLParagraphElement);
  });

  it("class components may render null; createElement propagates it", () => {
    class Empty {
      render(): JSX.Element | null {
        return null;
      }
    }
    expect(createElement(Empty)).toBeNull();
  });
});
