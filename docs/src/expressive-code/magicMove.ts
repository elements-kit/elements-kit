import {
  AttachedPluginData,
  definePlugin,
  type ExpressiveCodeBlock,
} from "@astrojs/starlight/expressive-code";
import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";
import type { Element, ElementContent, Properties, RootContent } from "hast";

type MagicMoveData = { steps: string[] };

const STEP_SEPARATOR = /^\s*---\s*$/m;
const attachedData = new AttachedPluginData<MagicMoveData | null>(() => null);

function splitSteps(code: string): string[] | null {
  const steps = code
    .replace(/\r\n/g, "\n")
    .split(STEP_SEPARATOR)
    .map((s) => s.replace(/^\n/, "").replace(/\n$/, ""));
  return steps.length > 1 ? steps : null;
}

function replaceBlockCode(block: ExpressiveCodeBlock, code: string) {
  const count = block.getLines().length;
  if (count) block.deleteLines(Array.from({ length: count }, (_, i) => i));
  block.insertLines(0, code.split("\n"));
}

function el(
  tag: string,
  props: Properties = {},
  children: ElementContent[] = [],
): Element {
  return { type: "element", tagName: tag, properties: props, children };
}

function text(value: string): ElementContent {
  return { type: "text", value };
}

function findFirst(
  root: RootContent | Element,
  pred: (e: Element) => boolean,
): Element | undefined {
  if (root.type !== "element") return;
  if (pred(root)) return root;
  for (const child of root.children) {
    const found = findFirst(child, pred);
    if (found) return found;
  }
}

export function pluginMagicMove() {
  return definePlugin({
    name: "ElementsKit Magic Move",

    baseStyles: `
/* ── shiki-magic-move animation primitives ────────────────────────── */
.shiki-magic-move-container{position:relative;white-space:pre}
.shiki-magic-move-item{display:inline-block;transition:color var(--smm-duration,.5s) var(--smm-easing,ease)}
.shiki-magic-move-enter-active,.shiki-magic-move-leave-active,.shiki-magic-move-move{transition:all var(--smm-duration,.5s) var(--smm-easing,ease)}
.shiki-magic-move-container-resize,.shiki-magic-move-container-restyle{transition:all var(--smm-duration,.5s) var(--smm-easing,ease);transition-delay:calc(var(--smm-duration,.5s)*var(--smm-delay-container,1))}
.shiki-magic-move-move{transition-delay:calc(var(--smm-duration,.5s)*var(--smm-delay-move,1) + var(--smm-stagger,0));z-index:1}
.shiki-magic-move-enter-active{transition-delay:calc(var(--smm-duration,.5s)*var(--smm-delay-enter,1) + var(--smm-stagger,0));z-index:1}
.shiki-magic-move-leave-active{transition-delay:calc(var(--smm-duration,.5s)*var(--smm-delay-leave,1) + var(--smm-stagger,0))}
.shiki-magic-move-enter-from,.shiki-magic-move-leave-to{opacity:0}
br.shiki-magic-move-leave-active{display:none}

/* ── wrapper ───────────────────────────────────────────────────────── */
.ec-magic-move{margin:1.5rem 0;outline:none}
.ec-magic-move:focus-within .frame{border-color:var(--sl-color-accent)}
.ec-magic-move .frame{margin:0;border-bottom-left-radius:0;border-bottom-right-radius:0}
.ec-magic-move pre{overflow:auto;padding:.75rem;border-bottom-left-radius:0;border-bottom-right-radius:0}
.ec-magic-move code{display:block;font-family:var(--__sl-font-mono);font-size:var(--sl-text-code)}
.ec-magic-move-surface{display:block;min-width:max-content}

/* ── footer ────────────────────────────────────────────────────────── */
.ec-magic-move-footer{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.45rem .75rem;border:1px solid var(--sl-color-gray-5);border-top:none;border-bottom-left-radius:.25rem;border-bottom-right-radius:.25rem;background:var(--sl-color-gray-6)}
.ec-magic-move-status{display:flex;align-items:center;gap:.75rem;margin-inline:auto}
.ec-magic-move-counter{font-size:.8rem;color:var(--sl-color-gray-3);font-variant-numeric:tabular-nums;min-width:3rem;text-align:center}
.ec-magic-move-dots{display:flex;gap:.375rem;align-items:center}
.ec-magic-move-dot{width:7px;height:7px;border-radius:999px;background:var(--sl-color-gray-4);transition:background .2s}
.ec-magic-move-dot.active{background:var(--sl-color-accent)}
.ec-magic-move-btn{display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .7rem;font-size:.8rem;font-family:inherit;color:var(--sl-color-gray-2);background:transparent;border:1px solid var(--sl-color-gray-5);border-radius:.2rem;cursor:pointer;transition:color .15s,border-color .15s,background .15s;line-height:1}
.ec-magic-move-btn:hover:not(:disabled){color:var(--sl-color-white);border-color:var(--sl-color-gray-3);background:var(--sl-color-gray-5)}
.ec-magic-move-btn:disabled{opacity:.35;cursor:not-allowed}
    `,

    hooks: {
      preprocessMetadata({ codeBlock }) {
        if (codeBlock.metaOptions.getBoolean("magic-move") !== true) return;
        codeBlock.props.wrap = false;
      },

      preprocessCode({ codeBlock }) {
        if (codeBlock.metaOptions.getBoolean("magic-move") !== true) return;
        const steps = splitSteps(codeBlock.code);
        if (!steps) return;
        attachedData.setFor(codeBlock, { steps });
        replaceBlockCode(codeBlock, steps[0] ?? "");
      },

      postprocessRenderedBlock({ codeBlock, renderData }) {
        const data = attachedData.getOrCreateFor(codeBlock);
        if (!data || data.steps.length < 2) return;

        const codeEl = findFirst(
          renderData.blockAst,
          (e) => e.tagName === "code",
        );
        if (!codeEl) return;

        codeEl.children = [
          el("div", {
            className: ["ec-magic-move-surface", "shiki-magic-move-container"],
          }),
        ];

        const dots = data.steps.map((_, i) =>
          el("span", {
            className: ["ec-magic-move-dot", ...(i === 0 ? ["active"] : [])],
          }),
        );

        const footer = el("div", { className: ["ec-magic-move-footer"] }, [
          el(
            "button",
            {
              className: ["ec-magic-move-btn", "ec-magic-move-prev"],
              type: "button",
              disabled: true,
              "aria-label": "Previous step",
            },
            [text("Prev")],
          ),
          el("div", { className: ["ec-magic-move-status"] }, [
            el("span", { className: ["ec-magic-move-counter"] }, [
              el("span", { className: ["ec-magic-move-current"] }, [text("1")]),
              text(" / "),
              el("span", { className: ["ec-magic-move-total"] }, [
                text(String(data.steps.length)),
              ]),
            ]),
            el("div", { className: ["ec-magic-move-dots"] }, dots),
          ]),
          el(
            "button",
            {
              className: ["ec-magic-move-btn", "ec-magic-move-next"],
              type: "button",
              "aria-label": "Next step",
            },
            [text("Next")],
          ),
        ]);

        renderData.blockAst = el(
          "div",
          {
            className: ["ec-magic-move", "not-content"],
            tabindex: "0",
            "data-lang": codeBlock.language || "text",
            "data-steps": JSON.stringify(data.steps),
          },
          [renderData.blockAst, footer],
        );
      },
    },
  });
}

export function magicMoveIntegration(): AstroIntegration {
  const clientScript = fileURLToPath(
    new URL("./magic-move-client.ts", import.meta.url),
  );
  return {
    name: "magic-move-runtime",
    hooks: {
      "astro:config:setup": ({ injectScript }) => {
        injectScript("page", `import ${JSON.stringify(clientScript)}`);
      },
    },
  };
}
