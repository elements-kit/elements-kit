declare module "*.css" {}

// SVG imports use the same elements-kit loader as web.
declare module "*.svg?ek" {
  const Icon: (props: import("elements-kit/jsx-runtime").JSX.IntrinsicElements["svg"]) => SVGSVGElement;
  export default Icon;
}
