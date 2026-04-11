import { getSingletonHighlighter } from "shiki";
import {
  codeToKeyedTokens,
  createMagicMoveMachine,
} from "shiki-magic-move/core";
import { MagicMoveRenderer } from "shiki-magic-move/renderer";

const LIGHT = "github-light-default";
const DARK = "github-dark-default";

function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? LIGHT
    : DARK;
}

// Encode newlines as DEL (U+007F) — matches what EC's copy handler decodes
function encodeForCopy(code: string) {
  return code.replace(/\n/g, "\u007f");
}

function init(wrapper: HTMLElement) {
  if (wrapper.dataset.ready) return;
  wrapper.dataset.ready = "1";

  const steps: string[] = JSON.parse(wrapper.dataset.steps ?? "[]");
  const lang = wrapper.dataset.lang ?? "text";
  if (steps.length < 2) return;

  const surface = wrapper.querySelector<HTMLElement>(".ec-magic-move-surface");
  const prevBtn = wrapper.querySelector<HTMLButtonElement>(
    ".ec-magic-move-prev",
  );
  const nextBtn = wrapper.querySelector<HTMLButtonElement>(
    ".ec-magic-move-next",
  );
  const currentEl = wrapper.querySelector<HTMLElement>(
    ".ec-magic-move-current",
  );
  const dots = wrapper.querySelectorAll<HTMLElement>(".ec-magic-move-dot");
  const copyBtn = wrapper.querySelector<HTMLElement>("[data-code]");
  if (!surface || !prevBtn || !nextBtn || !currentEl) return;

  let stepIdx = 0;
  let theme = getTheme();

  function updateUi() {
    currentEl!.textContent = String(stepIdx + 1);
    prevBtn!.disabled = stepIdx === 0;
    nextBtn!.disabled = stepIdx === steps.length - 1;
    dots.forEach((d, i) => d.classList.toggle("active", i === stepIdx));
    if (copyBtn) copyBtn.dataset.code = encodeForCopy(steps[stepIdx]);
  }
  getSingletonHighlighter({ langs: [lang], themes: [LIGHT, DARK] }).then(
    (hl) => {
      // Single machine run — all tokens share consistent keys across steps.
      // This enables smooth animation in BOTH directions via renderer.render().
      const machine = createMagicMoveMachine((code: string) =>
        codeToKeyedTokens(hl, code, { lang: lang as never, theme }),
      );

      function buildAllTokens() {
        machine.reset();
        return steps.map((step) => machine.commit(step).current);
      }

      const renderer = new MagicMoveRenderer(surface!);
      renderer.options.duration = 500;

      let tokens = buildAllTokens();

      // Initial render — use render() (not replace()) to clear isFirstRender flag
      // so the first Next click animates instead of jumping
      renderer.render(tokens[0]);
      updateUi();

      nextBtn!.addEventListener("click", () => {
        if (stepIdx >= steps.length - 1) return;
        stepIdx += 1;
        renderer.render(tokens[stepIdx]);
        updateUi();
      });

      prevBtn!.addEventListener("click", () => {
        if (stepIdx === 0) return;
        stepIdx -= 1;
        renderer.render(tokens[stepIdx]);
        updateUi();
      });

      wrapper.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          nextBtn!.click();
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          prevBtn!.click();
        }
      });

      // Theme switch — rebuild tokens, replace without animation
      new MutationObserver(() => {
        const next = getTheme();
        if (next === theme) return;
        theme = next;
        tokens = buildAllTokens();
        renderer.replace(tokens[stepIdx]);
      }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    },
  );
}

function initAll(root: Document | HTMLElement = document) {
  root.querySelectorAll<HTMLElement>(".ec-magic-move").forEach(init);
}

initAll();
document.addEventListener("astro:page-load", () => initAll());
