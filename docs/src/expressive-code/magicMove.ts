import {
  AttachedPluginData,
  definePlugin,
  type ExpressiveCodeBlock,
} from "@astrojs/starlight/expressive-code";
import type { Element, ElementContent, Properties, RootContent } from "hast";

type MagicMoveData = {
  steps: string[];
};

const STEP_SEPARATOR = /^\s*---\s*$/m;
const LIGHT_THEME = "github-light-default";
const DARK_THEME = "github-dark-default";
const attachedData = new AttachedPluginData<MagicMoveData | null>(() => null);

function normalizeStep(step: string) {
  return step.replace(/^\n/, "").replace(/\n$/, "");
}

function splitSteps(code: string) {
  const steps = code
    .replace(/\r\n/g, "\n")
    .split(STEP_SEPARATOR)
    .map(normalizeStep);

  return steps.length > 1 ? steps : null;
}

function replaceBlockCode(codeBlock: ExpressiveCodeBlock, nextCode: string) {
  const lineCount = codeBlock.getLines().length;
  if (lineCount) {
    codeBlock.deleteLines(
      Array.from({ length: lineCount }, (_, index) => index),
    );
  }

  codeBlock.insertLines(0, nextCode.split("\n"));
}

function createElement(
  tagName: string,
  properties: Properties = {},
  children: ElementContent[] = [],
): Element {
  return {
    type: "element",
    tagName,
    properties,
    children,
  };
}

function createText(value: string): ElementContent {
  return {
    type: "text",
    value,
  };
}

function visitElements(
  node: RootContent | Element,
  visitor: (element: Element) => boolean | void,
): boolean {
  if (node.type !== "element") {
    return false;
  }

  if (visitor(node)) {
    return true;
  }

  for (const child of node.children) {
    if (visitElements(child, visitor)) {
      return true;
    }
  }

  return false;
}

function findFirstElement(
  root: Element,
  predicate: (element: Element) => boolean,
) {
  let match: Element | undefined;

  visitElements(root, (element) => {
    if (predicate(element)) {
      match = element;
      return true;
    }
  });

  return match;
}

function getClassNames(element: Element) {
  const className = element.properties.className;
  if (Array.isArray(className)) {
    return className as string[];
  }
  if (typeof className === "string" && className.length > 0) {
    return className.split(/\s+/);
  }
  return [];
}

function addClassName(element: Element, ...names: string[]) {
  const classNames = new Set(getClassNames(element));
  names.forEach((name) => classNames.add(name));
  element.properties.className = [...classNames];
}

export function pluginMagicMove() {
  return definePlugin({
    name: "ElementsKit Magic Move",
    baseStyles: `
.shiki-magic-move-container{position:relative;white-space:pre}
.shiki-magic-move-line-number{opacity:.3;-webkit-user-select:none;-moz-user-select:none;user-select:none}
.shiki-magic-move-item{display:inline-block;transition:color var(--smm-duration,.5s) var(--smm-easing,"ease")}
.shiki-magic-move-enter-active,.shiki-magic-move-leave-active,.shiki-magic-move-move{transition:all var(--smm-duration,.5s) var(--smm-easing,"ease")}
.shiki-magic-move-container-resize,.shiki-magic-move-container-restyle{transition:all var(--smm-duration,.5s) var(--smm-easing,"ease");transition-delay:calc(var(--smm-duration, .5s)*var(--smm-delay-container, 1))}
.shiki-magic-move-move{transition-delay:calc(var(--smm-duration, .5s)*var(--smm-delay-move, 1) + var(--smm-stagger, 0));z-index:1}
.shiki-magic-move-enter-active{transition-delay:calc(var(--smm-duration, .5s)*var(--smm-delay-enter, 1) + var(--smm-stagger, 0));z-index:1}
.shiki-magic-move-leave-active{transition-delay:calc(var(--smm-duration, .5s)*var(--smm-delay-leave, 1) + var(--smm-stagger, 0))}
.shiki-magic-move-enter-from,.shiki-magic-move-leave-to{opacity:0}
br.shiki-magic-move-leave-active{display:none}

.ec-magic-move{margin:1.5rem 0;outline:none}
.ec-magic-move:focus-within .frame{border-color:var(--sl-color-accent)}
.ec-magic-move .frame{margin:0;border-bottom-left-radius:0;border-bottom-right-radius:0}
.ec-magic-move pre{overflow:auto;padding:.75rem}
.ec-magic-move code.ec-magic-move-code{display:block;font-family:var(--__sl-font-mono);font-size:var(--sl-text-code);line-height:var(--sl-line-height)}
.ec-magic-move .ec-magic-move-surface{display:block;min-width:max-content;font-family:inherit;font-size:inherit;line-height:inherit}
.ec-magic-move-footer{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.45rem .75rem;border:1px solid var(--sl-color-gray-5);border-top:none;border-bottom-left-radius:.25rem;border-bottom-right-radius:.25rem;background:var(--sl-color-gray-6)}
.ec-magic-move-btn{display:inline-flex;align-items:center;gap:.35rem;padding:.3rem .7rem;font-size:.8rem;font-family:inherit;color:var(--sl-color-gray-2);background:transparent;border:1px solid var(--sl-color-gray-5);border-radius:.2rem;cursor:pointer;transition:color .15s,border-color .15s,background .15s;line-height:1}
.ec-magic-move-btn:hover:not(:disabled){color:var(--sl-color-white);border-color:var(--sl-color-gray-3);background:var(--sl-color-gray-5)}
.ec-magic-move-btn:disabled{opacity:.35;cursor:not-allowed}
.ec-magic-move-status{display:flex;align-items:center;gap:.75rem;margin-inline:auto}
.ec-magic-move-counter{font-size:.8rem;color:var(--sl-color-gray-3);font-variant-numeric:tabular-nums;min-width:3rem;text-align:center}
.ec-magic-move-dots{display:flex;gap:.375rem;align-items:center}
.ec-magic-move-dot{width:7px;height:7px;border-radius:999px;background:var(--sl-color-gray-4);transition:background .2s}
.ec-magic-move-dot.active{background:var(--sl-color-accent)}
    `,
    jsModules: [
      `
import { getSingletonHighlighter } from "shiki";
import { codeToKeyedTokens, createMagicMoveMachine } from "shiki-magic-move/core";
import { MagicMoveRenderer } from "shiki-magic-move/renderer";

const LIGHT_THEME = "${LIGHT_THEME}";
const DARK_THEME = "${DARK_THEME}";

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? LIGHT_THEME
    : DARK_THEME;
}

function encodeCopyValue(step) {
  return step.replace(/\\n/g, "\\u007f");
}

function initMagicMove(wrapper) {
  if (wrapper.dataset.ecMagicMoveReady === "true") return;
  wrapper.dataset.ecMagicMoveReady = "true";

  const steps = JSON.parse(wrapper.dataset.steps ?? "[]");
  const lang = wrapper.dataset.lang ?? "text";
  if (steps.length < 2) return;

  const codeEl = wrapper.querySelector(".ec-magic-move-surface");
  const prevBtn = wrapper.querySelector(".ec-magic-move-prev");
  const nextBtn = wrapper.querySelector(".ec-magic-move-next");
  const currentEl = wrapper.querySelector(".ec-magic-move-current");
  const dots = wrapper.querySelectorAll(".ec-magic-move-dot");
  const copyBtn = wrapper.querySelector(".copy button");

  if (!codeEl || !prevBtn || !nextBtn || !currentEl) return;

  let stepIdx = 0;
  let activeTheme = currentTheme();

  function updateUi() {
    currentEl.textContent = String(stepIdx + 1);
    prevBtn.disabled = stepIdx === 0;
    nextBtn.disabled = stepIdx === steps.length - 1;
    dots.forEach((dot, index) => dot.classList.toggle("active", index === stepIdx));
    if (copyBtn) {
      copyBtn.dataset.code = encodeCopyValue(steps[stepIdx]);
    }
  }

  getSingletonHighlighter({
    langs: [lang],
    themes: [LIGHT_THEME, DARK_THEME],
  }).then((highlighter) => {
    const renderer = new MagicMoveRenderer(codeEl);
    renderer.options.duration = 400;
    renderer.options.stagger = 3;

    function buildTokens(theme) {
      const machine = createMagicMoveMachine((step) =>
        codeToKeyedTokens(highlighter, step, { lang, theme }),
      );

      return steps.map((step) => machine.commit(step).current);
    }

    let tokens = buildTokens(activeTheme);
    renderer.render(tokens[0]);
    updateUi();

    const themeObserver = new MutationObserver(() => {
      const nextTheme = currentTheme();
      if (nextTheme === activeTheme) return;

      activeTheme = nextTheme;
      tokens = buildTokens(activeTheme);
      renderer.replace(tokens[stepIdx]);
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    prevBtn.addEventListener("click", () => {
      if (stepIdx === 0) return;
      stepIdx -= 1;
      renderer.render(tokens[stepIdx]);
      updateUi();
    });

    nextBtn.addEventListener("click", () => {
      if (stepIdx >= steps.length - 1) return;
      stepIdx += 1;
      renderer.render(tokens[stepIdx]);
      updateUi();
    });

    wrapper.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        nextBtn.click();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        prevBtn.click();
      }
    });
  });
}

function initAllMagicMoves(root = document) {
  root.querySelectorAll(".ec-magic-move").forEach((wrapper) => initMagicMove(wrapper));
}

initAllMagicMoves();
document.addEventListener("astro:page-load", () => initAllMagicMoves());
      `,
    ],
    hooks: {
      preprocessMetadata: ({ codeBlock }) => {
        if (codeBlock.metaOptions.getBoolean("magic-move") !== true) {
          return;
        }

        codeBlock.props.wrap = false;
      },
      preprocessCode: ({ codeBlock }) => {
        if (codeBlock.metaOptions.getBoolean("magic-move") !== true) {
          return;
        }

        const steps = splitSteps(codeBlock.code);
        if (!steps) {
          return;
        }

        attachedData.setFor(codeBlock, { steps });
        replaceBlockCode(codeBlock, steps[0] ?? "");
      },
      postprocessRenderedBlock: ({ codeBlock, renderData }) => {
        const data = attachedData.getOrCreateFor(codeBlock);
        if (!data || data.steps.length < 2) {
          return;
        }

        const codeElement = findFirstElement(
          renderData.blockAst,
          (element) => element.tagName === "code",
        );

        if (!codeElement) {
          return;
        }

        addClassName(renderData.blockAst, "ec-magic-move-frame");
        addClassName(codeElement, "ec-magic-move-code");
        codeElement.children = [
          createElement(
            "div",
            {
              className: [
                "ec-magic-move-surface",
                "shiki-magic-move-container",
              ],
            },
            [],
          ),
        ];

        const dots = data.steps.map((_, index) =>
          createElement("span", {
            className: [
              "ec-magic-move-dot",
              ...(index === 0 ? ["active"] : []),
            ],
          }),
        );

        renderData.blockAst = createElement(
          "div",
          {
            className: ["ec-magic-move", "not-content"],
            tabindex: "0",
            "data-lang": codeBlock.language || "text",
            "data-steps": JSON.stringify(data.steps),
          },
          [
            renderData.blockAst,
            createElement("div", { className: ["ec-magic-move-footer"] }, [
              createElement(
                "button",
                {
                  className: ["ec-magic-move-btn", "ec-magic-move-prev"],
                  type: "button",
                  disabled: true,
                  "aria-label": "Previous step",
                },
                [createText("Prev")],
              ),
              createElement("div", { className: ["ec-magic-move-status"] }, [
                createElement(
                  "span",
                  { className: ["ec-magic-move-counter"] },
                  [
                    createElement(
                      "span",
                      { className: ["ec-magic-move-current"] },
                      [createText("1")],
                    ),
                    createText(" / "),
                    createElement(
                      "span",
                      { className: ["ec-magic-move-total"] },
                      [createText(String(data.steps.length))],
                    ),
                  ],
                ),
                createElement(
                  "div",
                  { className: ["ec-magic-move-dots"] },
                  dots,
                ),
              ]),
              createElement(
                "button",
                {
                  className: ["ec-magic-move-btn", "ec-magic-move-next"],
                  type: "button",
                  "aria-label": "Next step",
                },
                [createText("Next")],
              ),
            ]),
          ],
        );
      },
    },
  });
}
