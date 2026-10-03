/** @jsxImportSource react */
import { createContext, use, type ReactNode } from "react";

// Live Astro islands inside the docs island. The route passes them as named
// Astro slots on <DocsApp>; React receives each as a prop and this context
// hands it to the MDX placeholder. The inner island hydrates on its own.
export const IslandsContext = createContext<Record<string, ReactNode>>({});

export function Island({ name }: { name: string }) {
  const island = use(IslandsContext)[name];
  if (island === undefined) throw new Error(`No island slot named "${name}"`);
  return <div className="not-prose">{island}</div>;
}
