import type { SandpackTheme } from "@codesandbox/sandpack-react";

export const githubLight: SandpackTheme = {
  colors: {
    surface1: "#ffffff",
    surface2: "#F3F3F3",
    surface3: "#f5f5f5",
    clickable: "#959da5",
    base: "#24292e",
    disabled: "#d1d4d8",
    hover: "#24292e",
    accent: "#24292e",
  },
  syntax: {
    keyword: "#d73a49",
    property: "#005cc5",
    plain: "#24292e",
    static: "#032f62",
    string: "#032f62",
    definition: "#6f42c1",
    punctuation: "#24292e",
    tag: "#22863a",
    comment: {
      color: "#6a737d",
      fontStyle: "normal",
    },
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    mono: '"Fira Mono", "DejaVu Sans Mono", Menlo, Consolas, "Liberation Mono", Monaco, "Lucida Console", monospace',
    size: "13px",
    lineHeight: "20px",
  },
};

export const githubDark: SandpackTheme = {
  colors: {
    surface1: "#0d1117",
    surface2: "#161b22",
    surface3: "#161b22",
    clickable: "#7d8590",
    base: "#e6edf3",
    disabled: "#30363d",
    hover: "#30363d",
    accent: "#1f6feb",
  },
  syntax: {
    keyword: "#ff7b72",
    property: "#FFA657",
    plain: "#e6edf3",
    static: "#79C0FF",
    string: "#A5D6FF",
    definition: "#d2a8ff",
    punctuation: "#e6edf3",
    tag: "#7ee787",
    comment: {
      color: "#8b949e",
      fontStyle: "normal",
    },
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    mono: '"Fira Mono", "DejaVu Sans Mono", Menlo, Consolas, "Liberation Mono", Monaco, "Lucida Console", monospace',
    size: "13px",
    lineHeight: "20px",
  },
};
