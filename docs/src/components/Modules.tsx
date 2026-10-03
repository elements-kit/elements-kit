/** @jsxImportSource react */
import { Card, Cards } from "fumadocs-ui/components/card";
import { Atom, Blocks, Code, LayoutList, Puzzle } from "lucide-react";
import type { ReactNode } from "react";

interface Module {
  icon: ReactNode;
  name: string;
  href: string;
  summary: string;
  path: string;
  links: [label: string, href: string][];
  wide?: boolean;
}

const MODULES: Module[] = [
  {
    icon: <Atom />,
    name: "Core",
    href: "/signals",
    summary: "Reactive state. The only requirement; every module below needs only this.",
    path: "elements-kit/signals",
    wide: true,
    links: [
      ["signal", "/signals"],
      ["computed", "/signals"],
      ["effect", "/signals"],
      ["scopes", "/scopes"],
      ["stores", "/stores"],
    ],
  },
  {
    icon: <Blocks />,
    name: "Primitives",
    href: "/primitives",
    summary: "One import per job.",
    path: "elements-kit/utilities/*",
    links: [
      ["Data", "/primitives/async"],
      ["Forms", "/primitives/form-object"],
      ["Routing", "/primitives/routing"],
      ["Context", "/primitives/context"],
      ["DOM events", "/primitives/events"],
      ["Browser state", "/primitives/browser-state"],
      ["Timing", "/primitives/timing"],
    ],
  },
  {
    icon: <Code />,
    name: "Rendering",
    href: "/elements",
    summary: "Build DOM from signals.",
    path: "elements-kit/render",
    links: [
      ["JSX", "/elements"],
      ["Custom elements", "/custom-elements"],
      ["Server rendering", "/server-rendering"],
    ],
  },
  {
    icon: <LayoutList />,
    name: "UI Kit",
    href: "/ui",
    summary: "Components styled by CSS.",
    path: "elements-kit/ui/*",
    links: [
      ["Button", "/ui/button"],
      ["Select", "/ui/select"],
      ["Menu", "/ui/menu"],
      ["Overlay", "/ui/overlay"],
    ],
  },
  {
    icon: <Puzzle />,
    name: "Integrations",
    href: "/integrations",
    summary: "Signals in your framework.",
    path: "elements-kit/integrations/*",
    links: [
      ["React", "/integrations/react"],
      ["Vue", "/integrations/vue"],
      ["Svelte", "/integrations/svelte"],
      ["Astro", "/integrations/astro"],
    ],
  },
];

/** The library's modules, each linking to its pages. */
export function Modules() {
  return (
    <Cards>
      {MODULES.map((m) => (
        <Card
          key={m.name}
          icon={m.icon}
          title={
            <span className="flex flex-wrap items-baseline gap-x-2">
              <a href={m.href} className="hover:text-fd-primary">
                {m.name}
              </a>
              <code className="rounded-full border bg-fd-muted px-2 py-0.5 font-mono text-xs font-normal text-fd-muted-foreground">
                {m.path}
              </code>
            </span>
          }
          className={m.wide ? "col-span-full" : undefined}
        >
          <p>{m.summary}</p>
          <div className="not-prose mt-3 flex flex-wrap gap-1.5">
            {m.links.map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="rounded-md border bg-fd-background px-2 py-1 text-xs font-medium text-fd-muted-foreground transition-colors hover:border-fd-primary/40 hover:text-fd-primary"
              >
                {label}
              </a>
            ))}
          </div>
        </Card>
      ))}
    </Cards>
  );
}
