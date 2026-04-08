/* @jsxImportSource react */
import { createRoot } from "react-dom/client";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackSetup,
  SandpackFiles,
} from "@codesandbox/sandpack-react";

import MAIN from "./files/main.tsx?raw";
import INDEX from "./files/index.js?raw";
import VITE_CONFIG from "./files/vite.config.ts?raw";
import TSCONFIG from "./files/tsconfig.json?raw";

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

const EXAMPLES: SandpackFiles[] = [
  { "/main.tsx": { code: MAIN, active: true } },
];

function SandpackExample({ files }: { files: SandpackFiles }) {
  return (
    <SandpackProvider
      template="vite"
      files={{ ...SHARED_FILES, ...files }}
      customSetup={SHARED_SETUP}
      options={{ autorun: true }}
      theme={"auto"}
    >
      <SandpackLayout>
        <SandpackCodeEditor showTabs showLineNumbers style={{ height: 400 }} />
        <SandpackPreview
          style={{ height: 400 }}
          showNavigator={false}
          showOpenInCodeSandbox={false}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}

function SandpackSection() {
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 960,
        margin: "0 auto",
        padding: "0 16px 40px",
      }}
    >
      <h2>Interactive Examples</h2>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Edit the code and see changes live — powered by{" "}
        <a href="https://github.com/waelbettayeb/elements-kit">elements-kit</a>.
      </p>

      <SandpackExample files={EXAMPLES[0]} />
    </div>
  );
}

export function mountSandpack(container: HTMLElement) {
  createRoot(container).render(<SandpackSection />);
}
