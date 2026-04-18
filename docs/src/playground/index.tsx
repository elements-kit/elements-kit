/* @jsxImportSource react */
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

import INDEX from "./files/index.js?raw";
import VITE_CONFIG from "./files/vite.config.ts?raw";
import TSCONFIG from "./files/tsconfig.json?raw";
import { githubDark, githubLight } from "./theme";

const SHARED_SETUP: SandpackSetup = {
  dependencies: {
    "elements-kit": "latest",
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
    this.#root = createRoot(div);
    this.#root.render(
      <Playground
        provider={this.#provider}
        editor={this.#editor}
        preview={this.#preview}
        tests={this.#tests}
      />,
    );
  }

  disconnectedCallback() {
    if (this.#root) {
      this.#root.unmount();
    }
  }
}

globalThis.customElements.define("x-playground", PlaygroundElement);

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
