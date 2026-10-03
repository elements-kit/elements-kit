/** @jsxImportSource react */
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui";
import type { MDXComponents } from "mdx/types";
import { Playground } from "@/components/Playground";
import { StorybookEmbed } from "@/components/StorybookEmbed";
import { Diagram } from "@/components/Diagram";
import { MagicMove } from "@/components/MagicMove";
import { Island } from "@/components/Island";

// Everything the content uses without importing: fumadocs defaults (Callout,
// Cards, Card, code blocks), Tabs/Steps, twoslash popups, and ours.
export const mdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  Tab,
  Tabs,
  Step,
  Steps,
  Popup,
  PopupContent,
  PopupTrigger,
  Playground,
  StorybookEmbed,
  Diagram,
  MagicMove,
  Island,
};
