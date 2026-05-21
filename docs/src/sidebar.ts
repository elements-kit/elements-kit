import type {
  StarlightIcon,
  StarlightUserConfig,
} from "@astrojs/starlight/types";

type SidebarItem = NonNullable<StarlightUserConfig["sidebar"]>[number];

export const librarySidebar: SidebarItem[] = [
  { label: "Introduction", slug: "index" },
  {
    label: "Getting Started",
    items: [
      { label: "Installation", slug: "getting-started/installation" },
      { label: "Quick start", slug: "getting-started/quick-start" },
      { label: "Philosophy", slug: "getting-started/philosophy" },
    ],
  },
  {
    label: "Reactivity",
    items: [
      { label: "Signals", slug: "signals" },
      { label: "Stores", slug: "stores" },
      { label: "Promise", slug: "promise" },
      { label: "Async", slug: "async" },
      { label: "Scopes", slug: "scopes" },
    ],
  },
  {
    label: "Elements",
    items: [
      { label: "JSX & Elements", slug: "elements" },
      { label: "Components", slug: "components" },
      { label: "Lists", slug: "elements/for" },
      { label: "Types", slug: "elements/types" },
    ],
  },
  {
    label: "Custom Elements",
    items: [
      { label: "Overview", slug: "custom-elements" },
      { label: "Attributes", slug: "custom-elements/attributes" },
      { label: "Styling", slug: "custom-elements/styling" },
      { label: "Slots", slug: "custom-elements/slots" },
    ],
  },
  { label: "Utilities", slug: "utilities" },
];

export const examplesSidebar: SidebarItem[] = [
  { label: "Data fetching", slug: "examples/data-fetching" },
  { label: "Routing", slug: "examples/routing" },
  { label: "Debounced search", slug: "examples/search" },
  { label: "Infinite scroll", slug: "examples/infinite-scroll" },
  { label: "Context propagation", slug: "examples/context" },
  { label: "Toast queue", slug: "examples/toasts" },
];

export const integrationsSidebar: SidebarItem[] = [
  { label: "Overview", slug: "integrations" },
  {
    label: "Frameworks",
    collapsed: false,
    items: [
      { label: "React", slug: "integrations/react" },
      { label: "Astro", slug: "integrations/astro" },
      { label: "Angular", slug: "integrations/angular" },
      { label: "Lit", slug: "integrations/lit" },
      { label: "Marko", slug: "integrations/marko" },
      { label: "Qwik", slug: "integrations/qwik" },
      { label: "Solid", slug: "integrations/solid" },
      { label: "Svelte", slug: "integrations/svelte" },
      { label: "Vue", slug: "integrations/vue" },
    ],
  },
];

export const uiSidebar: SidebarItem[] = [
  { label: "Overview", slug: "ui" },
  { label: "Alert", slug: "ui/alert" },
  { label: "Badge", slug: "ui/badge" },
  { label: "Button", slug: "ui/button" },
  { label: "Card", slug: "ui/card" },
  { label: "Checkbox", slug: "ui/checkbox" },
  { label: "Code", slug: "ui/code" },
  { label: "Kbd", slug: "ui/kbd" },
  { label: "Radio", slug: "ui/radio" },
  { label: "Switch", slug: "ui/switch" },
  { label: "Marketing", slug: "ui/marketing" },
  { label: "Styles", slug: "ui/styles" },
];

export type Topic = {
  id: "library" | "examples" | "integrations" | "ui";
  label: string;
  icon: StarlightIcon;
  rootHref: string;
  start: number;
  end: number;
};

const libraryEnd = librarySidebar.length;
const examplesEnd = libraryEnd + examplesSidebar.length;
const integrationsEnd = examplesEnd + integrationsSidebar.length;
const uiEnd = integrationsEnd + uiSidebar.length;

export const topics: Topic[] = [
  {
    id: "library",
    label: "Library",
    icon: "open-book",
    rootHref: "/",
    start: 0,
    end: libraryEnd,
  },
  {
    id: "ui",
    label: "Components",
    icon: "list-format",
    rootHref: "/ui/",
    start: integrationsEnd,
    end: uiEnd,
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: "puzzle",
    rootHref: "/integrations/",
    start: examplesEnd,
    end: integrationsEnd,
  },
  {
    id: "examples",
    label: "Examples",
    icon: "pencil",
    rootHref: "/examples/data-fetching/",
    start: libraryEnd,
    end: examplesEnd,
  },
];

export const sidebar: SidebarItem[] = [
  ...librarySidebar,
  ...examplesSidebar,
  ...integrationsSidebar,
  ...uiSidebar,
];
