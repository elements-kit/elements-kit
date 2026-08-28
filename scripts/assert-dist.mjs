// Fails the build if a standard decorator survives into published JavaScript.
// The tsdown plugin filters candidate modules by regex; this is the backstop
// for anything that filter misses.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DECORATOR = /^\s*@[A-Za-z_$][\w$]*/m;

async function* jsFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* jsFiles(path);
    else if (/\.[cm]?js$/.test(entry.name)) yield path;
  }
}

const offenders = [];
for await (const file of jsFiles("dist")) {
  const code = await readFile(file, "utf8");
  const match = code.match(DECORATOR);
  if (match) offenders.push(`${file}: ${match[0].trim()}`);
}

if (offenders.length > 0) {
  console.error("Unlowered decorators in dist:");
  for (const o of offenders) console.error(`  ${o}`);
  process.exit(1);
}
