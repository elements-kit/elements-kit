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
  {
    label: "Utilities",
    items: [
      { label: "Overview", slug: "utilities" },
      { label: "Form object", slug: "utilities/form-object" },
    ],
  },
  { label: "Server Rendering", slug: "server-rendering" },
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

const cssBadge = { text: "CSS", variant: "tip" } as const;
const jsBadge = { text: "JS", variant: "note" } as const;

export const uiSidebar: SidebarItem[] = [
  { label: "Overview", slug: "ui" },
  { label: "Styles", slug: "ui/styles" },
  {
    label: "Storybook ↗",
    link: "/storybook/",
    attrs: { target: "_blank", rel: "noopener" },
  },
  {
    label: "Figma ↗",
    link: "https://www.figma.com/community/file/1634497966964502610",
    attrs: { target: "_blank", rel: "noopener" },
  },
  {
    label: "Components",
    items: [
      { label: "Accordion", slug: "ui/accordion", badge: cssBadge },
      { label: "Alert", slug: "ui/alert", badge: cssBadge },
      { label: "Arrow", slug: "ui/arrow", badge: cssBadge },
      { label: "Badge", slug: "ui/badge", badge: cssBadge },
      { label: "Button", slug: "ui/button", badge: cssBadge },
      { label: "Card", slug: "ui/card", badge: cssBadge },
      { label: "Checkbox", slug: "ui/checkbox", badge: cssBadge },
      { label: "Code", slug: "ui/code", badge: cssBadge },
      { label: "Group", slug: "ui/group", badge: cssBadge },
      { label: "Kbd", slug: "ui/kbd", badge: cssBadge },
      { label: "Link", slug: "ui/link", badge: cssBadge },
      { label: "OTP Input", slug: "ui/otp-input", badge: jsBadge },
      { label: "Overlay", slug: "ui/overlay", badge: jsBadge },
      { label: "Progress", slug: "ui/progress", badge: cssBadge },
      { label: "Radio", slug: "ui/radio", badge: cssBadge },
      {
        label: "Segmented Control",
        slug: "ui/segmented-control",
        badge: cssBadge,
      },
      { label: "Select", slug: "ui/select", badge: cssBadge },
      { label: "Slider", slug: "ui/slider", badge: cssBadge },
      { label: "Switch", slug: "ui/switch", badge: cssBadge },
      { label: "Text Input", slug: "ui/text-input", badge: cssBadge },
      { label: "Toggle", slug: "ui/toggle", badge: cssBadge },
    ],
  },
  {
    label: "Utilities",
    items: [{ label: "dom-lifecycle", slug: "components/dom-lifecycle" }],
  },
  {
    label: "Marketing",
    items: [
      { label: "Hero", slug: "ui/hero", badge: cssBadge },
      { label: "Section", slug: "ui/section", badge: cssBadge },
      { label: "River", slug: "ui/river", badge: cssBadge },
      { label: "Pillar", slug: "ui/pillar", badge: cssBadge },
      { label: "Testimonial", slug: "ui/testimonial", badge: cssBadge },
      { label: "CTA Banner", slug: "ui/cta-banner", badge: cssBadge },
      { label: "Statistic", slug: "ui/statistic", badge: cssBadge },
    ],
  },
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
