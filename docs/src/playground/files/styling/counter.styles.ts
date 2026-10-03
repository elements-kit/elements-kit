import css from "./counter.css?raw";

// Created once, shared by all instances
export const counterSheet = new CSSStyleSheet();
counterSheet.replaceSync(css);
