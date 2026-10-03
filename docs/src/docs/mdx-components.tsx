/** @jsxImportSource react */
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui";
import type { ComponentProps } from "react";
import type { MDXComponents } from "mdx/types";
import { Playground } from "@/components/Playground";
import { StorybookEmbed } from "@/components/StorybookEmbed";
import { Diagram } from "@/components/Diagram";
import { MagicMove } from "@/components/MagicMove";
import { Island } from "@/components/Island";

// Everything the content uses without importing: fumadocs defaults (Callout,
// Cards, Card, code blocks), Tabs/Steps, twoslash popups, and ours.
const DefaultLink = defaultMdxComponents.a as (
  props: ComponentProps<"a">,
) => React.ReactNode;

/** `/ui/button/#x` → `/ui/button#x`: page URLs are slashless (no redirect).
 *  `/storybook/` is a static directory and keeps its slash. */
function slashless(href?: string) {
  if (!href?.startsWith("/") || href.startsWith("//")) return href;
  if (href.startsWith("/storybook")) return href;
  return href.replace(/(.)\/(?=[?#]|$)/, "$1");
}

export const mdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  a: ({ href, ...props }: ComponentProps<"a">) => (
    <DefaultLink href={slashless(href)} {...props} />
  ),
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
