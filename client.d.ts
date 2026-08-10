/// <reference types="./dist/jsx-runtime/index.d.mts" />

// Ambient module declarations for the build-time plugins. Reference from a
// project's env.d.ts:
//
//   /// <reference types="elements-kit/client" />

declare module "*.svg?ek" {
  const Component: (
    props?: import("elements-kit/jsx-runtime").JSX.IntrinsicElements["svg"],
  ) => SVGSVGElement;
  export default Component;
}
