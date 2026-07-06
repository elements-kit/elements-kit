// `import css from "./foo.css?inline"` — tsdown / Vite return the processed CSS
// as a string (not emitted as a file). Used for shadow-DOM constructable sheets.
declare module "*.css?inline" {
  const css: string;
  export default css;
}
