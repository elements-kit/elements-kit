import { signal, effect } from "elements-kit/signals";
import { getSingletonHighlighter } from "shiki";
import { codeToKeyedTokens } from "shiki-magic-move/core";
import { MagicMoveRenderer } from "shiki-magic-move/renderer";
import "shiki-magic-move/style.css";

export class MagicMoveDemo {
  steps: string[] = [];
  lang = "tsx";
  theme = "github-dark";

  #step = signal(0);

  render(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "magic-move-demo";

    const codeEl = document.createElement("pre");
    codeEl.className = "shiki";
    wrap.appendChild(codeEl);

    const nav = document.createElement("div");
    nav.className = "magic-move-nav";

    const prev = document.createElement("button");
    prev.textContent = "← Prev";
    prev.addEventListener("click", () => {
      this.#step(Math.max(0, this.#step() - 1));
    });

    const next = document.createElement("button");
    next.textContent = "Next →";
    next.addEventListener("click", () => {
      this.#step(Math.min(this.steps.length - 1, this.#step() + 1));
    });

    nav.appendChild(prev);
    nav.appendChild(next);
    wrap.appendChild(nav);

    getSingletonHighlighter({ langs: [this.lang], themes: [this.theme] })
      .then((hl) => {
        const renderer = new MagicMoveRenderer(codeEl);
        const tokens = this.steps.map((s) =>
          codeToKeyedTokens(hl, s, { lang: this.lang as never, theme: this.theme })
        );
        renderer.render(tokens[0]);
        effect(() => renderer.render(tokens[this.#step()]));
      })
      .catch(console.error);

    return wrap;
  }
}
