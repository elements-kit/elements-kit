/// <reference types="vite/client" />

declare module "*.md" {
  const html: string;
  export default html;
}
