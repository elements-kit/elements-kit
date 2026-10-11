/** @jsxImportSource react */
import { Play } from "lucide-react";
import type { ComponentProps } from "react";
import type { BaseLayoutProps, LinkItemType } from "fumadocs-ui/layouts/shared";

/** A pill, not a text link: the playground is a destination of its own. */
export const playgroundLink: LinkItemType = {
  type: "custom",
  children: (
    <a
      href="/playground"
      className="inline-flex items-center gap-1.5 rounded-full border border-fd-primary/30 bg-fd-primary/10 px-3 py-1 text-sm font-medium text-fd-primary transition-colors hover:bg-fd-primary/20"
    >
      <Play className="size-3.5 fill-current" />
      Playground
    </a>
  ),
};

/** Sidebar footer: the credit line, then fumadocs' own footer items (icon links below lg). */
export function SidebarFooter({ children, className: _, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className="flex items-center gap-1 border-t px-4 py-2.5 text-xs text-fd-muted-foreground">
      <span className="me-auto">
        Maintained by{" "}
        <a href="https://www.quba.co" target="_blank" rel="noopener" className="font-medium text-fd-foreground hover:text-fd-primary">
          Quba
        </a>
      </span>
      <div className="flex items-center lg:hidden">{children}</div>
    </div>
  );
}

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="flex items-center gap-2 tracking-tight">
        <span aria-hidden className="text-[1.2em] leading-none">
          🌱
        </span>
        ElementsKit
      </span>
    ),
    url: "/",
  },
  githubUrl: "https://github.com/elements-kit/elements-kit",
  links: [
    playgroundLink,
    {
      type: "icon",
      label: "X",
      text: "X",
      url: "https://x.com/ElementsKit",
      external: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
  ],
};
