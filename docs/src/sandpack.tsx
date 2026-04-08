/* @jsxImportSource react */
import { createRoot } from "react-dom/client";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackSetup,
  SandpackFiles,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react";

// Tell Sandpack's bundler to use elements-kit's JSX runtime instead of React's.
// Note: TC39 stage-3 decorators (@attributes, @reactive) are not used here because
// the CodeSandbox bundler ships an old @babel/plugin-proposal-decorators that doesn't
// support version "2023-11". JSX + signals alone are sufficient for interactive demos.
const BABEL_RC = JSON.stringify({
  presets: [
    [
      "@babel/preset-react",
      { runtime: "automatic", importSource: "elements-kit" },
    ],
    "@babel/preset-typescript",
  ],
});

const COUNTER_CODE = `\
import { signal, computed } from "elements-kit/signals";

const count = signal(0);
const doubled = computed(() => count() * 2);

const app = (
  <section>
    <h2>Counter</h2>
    <p>
      Count: <strong>{count}</strong> — Doubled:{" "}
      <strong>{doubled}</strong>
    </p>
    <button onClick={() => count(count() + 1)}>+1</button>{" "}
    <button onClick={() => count(count() - 1)}>−1</button>{" "}
    <button onClick={() => count(0)}>Reset</button>
  </section>
) as Element;

document.getElementById("app")!.appendChild(app);
`;

const SHARED_SETUP: SandpackSetup = {
  dependencies: {
    "elements-kit": "latest",
    "@babel/preset-react": "^7.24.0",
    "@babel/preset-typescript": "^7.24.0",
  },
};

const SHARED_FILES: SandpackFiles = {
  "/.babelrc": { code: BABEL_RC, hidden: true },
  "/index.ts": {
    code: /* tsx */ `import "./main.tsx";`,
    hidden: true,
    active: false,
  },
};

const EXAMPLES: SandpackFiles[] = [
  { "/main.tsx": { code: COUNTER_CODE, active: true } },
];

function SandpackExample({ files }: { files: SandpackFiles }) {
  return (
    <SandpackProvider
      template="vanilla-ts"
      files={{ ...SHARED_FILES, ...files }}
      customSetup={SHARED_SETUP}
      options={{ autorun: true }}
      theme={"auto"}
    >
      <SandpackLayout>
        <SandpackCodeEditor
          showTabs={false}
          showLineNumbers
          style={{ height: 400 }}
        />
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
