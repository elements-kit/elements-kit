/** @jsxImportSource react */
import * as React from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  type SandpackSetup,
  type SandpackFiles,
  SandpackTests,
} from "@codesandbox/sandpack-react";

import packageJson from "../../../package.json";

import INDEX from "../playground/files/index.js?raw";
import VITE_CONFIG from "../playground/files/vite.config.ts?raw";
import TSCONFIG from "../playground/files/tsconfig.json?raw";
import { githubDark, githubLight } from "./playground-theme";
import { useDark } from "./use-dark";
import type { PlaygroundProps } from "./Playground";

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

export default function Sandpack({
  provider,
  editor,
  preview,
  tests,
  frameClass,
}: PlaygroundProps & { frameClass: string }) {
  const isDark = useDark();

  return (
    <PlaygroundErrorBoundary>
      <SandpackProvider
        template="vite"
        customSetup={SHARED_SETUP}
        options={{ autorun: true }}
        theme={isDark ? githubDark : githubLight}
        {...provider}
        files={{ ...SHARED_FILES, ...provider.files }}
      >
        <div className={frameClass}>
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
    </PlaygroundErrorBoundary>
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
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          padding: "1rem",
          border: "1px solid #f5b5b5",
          borderRadius: "6px",
          background: "#fff5f5",
          color: "#7a1f1f",
          fontSize: "0.9em",
        }}
      >
        <strong>Playground failed to load.</strong>
        <p style={{ margin: "0.5rem 0" }}>
          {this.state.error.message ||
            "An unexpected error occurred while initializing the sandbox."}
        </p>
        <button
          type="button"
          onClick={() => location.reload()}
          style={{
            padding: "4px 10px",
            border: "1px solid currentColor",
            background: "transparent",
            color: "inherit",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
