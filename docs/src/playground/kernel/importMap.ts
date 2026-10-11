import { version } from '../../../../package.json';

export const IMPORT_MAP_FILE = 'import_map.json';

export interface ImportMapState {
  imports: Record<string, string>;
  /** Entries kept even when no file imports them (hand-edited URLs). */
  pinned: string[];
}

// Everything from esm.sh, elements-kit pinned to the version these docs
// describe. esm.sh keeps its dist chunks shared across subpaths, so
// `elements-kit/render` and `elements-kit/signals` run one reactive runtime.
export const moduleUrl = (importee: string) =>
  importee === 'elements-kit' || importee.startsWith('elements-kit/')
    ? `https://esm.sh/elements-kit@${version}${importee.slice('elements-kit'.length)}`
    : `https://esm.sh/${importee}`;

// One prefix entry covers every elements-kit subpath (`elements-kit/signals`…).
const DEFAULT_ENTRIES = ['elements-kit', 'elements-kit/'];

/** Covered by a `pkg/` prefix entry already in the map. */
const covered = (imports: Record<string, string>, specifier: string) =>
  Object.keys(imports).some((key) => key.endsWith('/') && key !== specifier && specifier.startsWith(key));

export function parseImportMap(source: string | undefined): ImportMapState {
  const imports: Record<string, string> = {};
  const pinned: string[] = [];
  try {
    const parsed = JSON.parse(source ?? '{}');
    const raw = parsed && typeof parsed.imports === 'object' ? parsed.imports : {};
    for (const [name, url] of Object.entries(raw)) {
      if (typeof url === 'string') imports[name] = url;
    }
    if (Array.isArray(parsed?.pinned)) {
      for (const name of parsed.pinned) {
        if (typeof name === 'string' && name in imports) pinned.push(name);
      }
    }
  } catch {}
  return { imports, pinned };
}

export const serializeImportMap = (state: ImportMapState) =>
  JSON.stringify(state.pinned.length ? state : { imports: state.imports }, null, 2) + '\n';

/** Pinned entries, plus one per bare specifier the code imports. */
export function syncImportMap(state: ImportMapState, specifiers: string[]): ImportMapState {
  const pinned = new Set(state.pinned);
  const imports: Record<string, string> = {};
  // Hand-edited URLs survive while still used; prefix entries go first so
  // they can absorb old per-subpath entries.
  const entries = Object.entries(state.imports).sort(([a], [b]) => Number(b.endsWith('/')) - Number(a.endsWith('/')));
  for (const [name, url] of entries) {
    const used = specifiers.includes(name) || DEFAULT_ENTRIES.includes(name);
    if (pinned.has(name) || (used && !covered(imports, name))) imports[name] = url;
  }
  for (const specifier of DEFAULT_ENTRIES.concat(specifiers)) {
    if (!covered(imports, specifier)) imports[specifier] ??= moduleUrl(specifier);
  }
  return { imports, pinned: state.pinned };
}
