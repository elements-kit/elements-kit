// Playground state ⇄ URL hash: JSON → deflate-raw → base64url. Native streams,
// no dependency; a few KB of code fits comfortably in a URL.

export interface SharedState {
  /** path → code, e.g. `{ "/main.tsx": "…" }`. */
  files: Record<string, string>;
  active?: string;
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: GenericTransformStream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeState(state: SharedState): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(state));
  const packed = await pipe(json, new CompressionStream("deflate-raw"));
  let binary = "";
  for (const byte of packed) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** `null` for a missing or malformed hash: callers fall back to the default. */
export async function decodeState(hash: string): Promise<SharedState | null> {
  if (!hash) return null;
  try {
    const binary = atob(hash.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = await pipe(bytes, new DecompressionStream("deflate-raw"));
    const state = JSON.parse(new TextDecoder().decode(json)) as SharedState;
    const valid =
      state &&
      typeof state.files === "object" &&
      Object.entries(state.files).every(
        ([path, code]) => path.startsWith("/") && typeof code === "string",
      );
    return valid ? state : null;
  } catch {
    return null;
  }
}
