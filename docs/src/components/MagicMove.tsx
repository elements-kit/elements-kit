/** @jsxImportSource react */
import { useMemo, useState, type KeyboardEvent } from "react";
import { ShikiMagicMovePrecompiled } from "shiki-magic-move/react";
import type { KeyedTokensInfo } from "shiki-magic-move/types";
import { CopyButton } from "./CopyButton";
import "shiki-magic-move/style.css";

/** Frames precompiled by `rehypeMagicMove` (src/mdx/magic-move.ts). */
export function MagicMove(props: { tokens: string; steps: string }) {
  const tokens = useMemo<KeyedTokensInfo[]>(
    () => JSON.parse(props.tokens),
    [props.tokens],
  );
  const steps = useMemo<string[]>(() => JSON.parse(props.steps), [props.steps]);
  const [step, setStep] = useState(0);
  const last = steps.length - 1;
  const go = (next: number) => setStep(Math.max(0, Math.min(last, next)));

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") go(step + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(step - 1);
    else return;
    e.preventDefault();
  }

  return (
    <figure
      className="ek-magic-move not-prose my-4 overflow-hidden rounded-xl border bg-fd-card text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-fd-primary"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-roledescription="code walkthrough"
      aria-label={`Code walkthrough, step ${step + 1} of ${steps.length}. Arrow keys change step.`}
    >
      <div className="relative">
        <div className="overflow-auto px-4 py-3.5 font-mono text-[0.8125rem] leading-relaxed">
          <ShikiMagicMovePrecompiled
            steps={tokens}
            step={step}
            options={{ duration: 500 }}
          />
        </div>
        <CopyButton
          text={steps[step]!}
          className="absolute end-2 top-2"
        />
      </div>
      <figcaption className="flex items-center gap-3 border-t bg-fd-secondary/50 px-3 py-1.5 text-xs">
        <button
          type="button"
          className="ek-magic-move-btn"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          aria-label="Previous step"
        >
          Prev
        </button>
        <span
          className="mx-auto flex items-center gap-3 tabular-nums text-fd-muted-foreground"
          aria-live="polite"
        >
          {step + 1} / {steps.length}
          <span className="flex gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full transition-colors ${i === step ? "bg-fd-primary" : "bg-fd-muted-foreground/40"}`}
              />
            ))}
          </span>
        </span>
        <button
          type="button"
          className="ek-magic-move-btn"
          onClick={() => go(step + 1)}
          disabled={step === last}
          aria-label="Next step"
        >
          Next
        </button>
      </figcaption>
    </figure>
  );
}
