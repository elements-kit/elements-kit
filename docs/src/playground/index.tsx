/* @jsxImportSource react */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { signal, type Signal } from "elements-kit/signals";
import { createMediaQuery } from "elements-kit/utilities/media-query";
import { useSignal as use$, useScope } from "elements-kit/integrations/react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  type SandpackSetup,
  type SandpackFiles,
  SandpackTests,
} from "@codesandbox/sandpack-react";

import packageJson from "../../package.json";

import INDEX from "./files/index.js?raw";
import VITE_CONFIG from "./files/vite.config.ts?raw";
import TSCONFIG from "./files/tsconfig.json?raw";
import { githubDark, githubLight } from "./theme";

const SHARED_SETUP: SandpackSetup = {
  dependencies: {
    "elements-kit": `^${packageJson.version}`,
  },
  devDependencies: {
    typescript: "^6",
    "esbuild-wasm": "^0.28.0",
    vite: "4.5.5",
  },
};

const SHARED_FILES: SandpackFiles = {
  "/tsconfig.json": { code: TSCONFIG, hidden: true },
  "/vite.config.ts": { code: VITE_CONFIG, hidden: true },
  "/index.js": {
    code: INDEX,
    hidden: true,
    active: false,
  },
  // Sandpack's "test-ts" template auto-injects `/add.ts` + `/add.test.ts`
  // fixtures. The file API can't delete them, so override both to empty
  // hidden stubs — no tabs, no assertions, no discoverable tests.
  "/add.ts": { code: "", hidden: true, active: false },
  "/add.test.ts": { code: "", hidden: true, active: false },
};

export interface PlaygroundProps {
  provider: React.ComponentProps<typeof SandpackProvider>;
  editor: React.ComponentProps<typeof SandpackCodeEditor>;
  preview?: React.ComponentProps<typeof SandpackPreview>;
  tests?: React.ComponentProps<typeof SandpackTests>;
}

const isDarkSignal = createMediaQuery.bind(
  null,
  "(prefers-color-scheme: dark)",
);
function Playground({
  provider: $provider,
  editor: $editor,
  preview: $preview,
  tests: $tests,
}: {
  provider: Signal<PlaygroundProps["provider"]>;
  editor: Signal<PlaygroundProps["editor"]>;
  preview: Signal<PlaygroundProps["preview"]>;
  tests: Signal<PlaygroundProps["tests"]>;
}) {
  const provider = use$($provider);
  const editor = use$($editor);
  const preview = use$($preview);
  const tests = use$($tests);
  const isDark = useScope(isDarkSignal);

  return (
    <SandpackProvider
      template="vite"
      customSetup={SHARED_SETUP}
      options={{ autorun: true }}
      theme={isDark ? githubDark : githubLight}
      {...provider}
      files={{ ...SHARED_FILES, ...provider.files }}
    >
      <div
        className={`ek-playground-frame${tests ? " ek-playground-frame--tests" : ""}`}
      >
        <SandpackLayout>
          <SandpackCodeEditor
            showTabs
            showLineNumbers
            style={{ height: "100%", flex: 1 }}
            {...editor}
          />
          {preview && (
            <SandpackPreview
              showNavigator={false}
              showOpenInCodeSandbox={false}
              {...preview}
            />
          )}
          {tests && <SandpackTests />}
        </SandpackLayout>
      </div>
    </SandpackProvider>
  );
}

class PlaygroundErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[playground] error:", error, info);
  }
  render() {
    if (this.state.error) {
      return React.createElement(
        "div",
        {
          style: {
            padding: "1rem",
            border: "1px solid #f5b5b5",
            borderRadius: "6px",
            background: "#fff5f5",
            color: "#7a1f1f",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.9em",
          },
        },
        React.createElement("strong", null, "Playground failed to load."),
        React.createElement(
          "p",
          { style: { margin: "0.5rem 0" } },
          this.state.error.message ||
            "An unexpected error occurred while initializing the sandbox.",
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => location.reload(),
            style: {
              padding: "4px 10px",
              border: "1px solid currentColor",
              background: "transparent",
              color: "inherit",
              borderRadius: "4px",
              cursor: "pointer",
            },
          },
          "Reload",
        ),
      );
    }
    return this.props.children;
  }
}

class PlaygroundElement extends HTMLElement {
  #root: ReturnType<typeof createRoot> | null = null;

  #provider = signal<PlaygroundProps["provider"]>({});

  get provider() {
    return this.#provider();
  }
  set provider(value: PlaygroundProps["provider"]) {
    this.#provider(value);
  }

  #editor = signal<PlaygroundProps["editor"]>({});
  get editor() {
    return this.#editor();
  }
  set editor(value: PlaygroundProps["editor"]) {
    this.#editor(value);
  }

  #preview = signal<PlaygroundProps["preview"]>();
  set preview(value: PlaygroundProps["preview"]) {
    this.#preview(value);
  }
  get preview() {
    return this.#preview();
  }

  #tests = signal<PlaygroundProps["tests"]>();
  set tests(value: PlaygroundProps["tests"]) {
    this.#tests(value);
  }
  get tests() {
    return this.#tests();
  }

  connectedCallback() {
    this.style.display = "block";
    const div = document.createElement("div");
    this.appendChild(div);
    try {
      this.#root = createRoot(div);
      this.#root.render(
        React.createElement(
          PlaygroundErrorBoundary,
          null,
          React.createElement(Playground, {
            provider: this.#provider,
            editor: this.#editor,
            preview: this.#preview,
            tests: this.#tests,
          }),
        ),
      );
    } catch (error) {
      console.error("[playground] mount failed:", error);
      div.textContent = "Playground failed to load. Try reloading the page.";
      div.setAttribute(
        "style",
        "padding:1rem;border:1px solid #f5b5b5;border-radius:6px;background:#fff5f5;color:#7a1f1f;font-family:system-ui,sans-serif;font-size:.9em",
      );
    }
  }

  disconnectedCallback() {
    if (this.#root) {
      this.#root.unmount();
    }
  }
}

// Only register on the client — Astro SSR renders this module too, where
// `customElements` doesn't exist and React hooks have no dispatcher.
if (typeof window !== "undefined" && typeof customElements !== "undefined") {
  if (!customElements.get("x-playground")) {
    customElements.define("x-playground", PlaygroundElement);
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "x-playground": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          config?: PlaygroundProps;
        },
        HTMLElement
      >;
    }
  }
}
