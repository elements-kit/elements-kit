/** @jsxImportSource react */
import { lazy, Suspense, type ComponentProps } from "react";
import type {
  SandpackCodeEditor,
  SandpackPreview,
  SandpackProvider,
  SandpackTests,
} from "@codesandbox/sandpack-react";
import { useMounted } from "./use-dark";

export interface PlaygroundProps {
  provider: ComponentProps<typeof SandpackProvider>;
  editor?: ComponentProps<typeof SandpackCodeEditor>;
  preview?: ComponentProps<typeof SandpackPreview>;
  tests?: ComponentProps<typeof SandpackTests>;
}

// Sandpack is browser-only and heavy: SSR and hydration render the empty
// frame, then its chunk loads after mount.
const Sandpack = lazy(() => import("./Sandpack"));

export function Playground(props: PlaygroundProps) {
  const mounted = useMounted();
  const frameClass = `ek-playground-frame not-prose${props.tests ? " ek-playground-frame--tests" : ""}`;
  const frame = <div className={frameClass} />;
  if (!mounted) return frame;
  return (
    <Suspense fallback={frame}>
      <Sandpack {...props} frameClass={frameClass} />
    </Suspense>
  );
}
