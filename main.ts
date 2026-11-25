// main.ts — the Sizzle Street hand-in program (Node 22+, standard library
// only). The game itself is the static site in game/ beside this file: it
// runs offline in a desktop browser from those files alone. This program
// copies game/ and screenshots/ into the output directory and writes the
// dossier the judge reads, using the kit's vendored library.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const entryDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from an empty output so the dossier describes exactly this entry,
// never leftovers from an earlier run.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(join(entryDir, 'game'), join(outDir, 'game'), { recursive: true });
if (existsSync(join(entryDir, 'screenshots'))) {
  cpSync(join(entryDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps mirror the competition's gate: at most 4 screenshots of 256 KiB,
// at most 993 files and 48 MiB under game/, paths of at most 1000 bytes, and
// the dossier's source text held to 160 KiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

function countFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .reduce((n, e) => n + (e.isDirectory() ? countFiles(join(dir, e.name)) : 1), 0);
}
console.log(`Sizzle Street handed in: ${countFiles(join(outDir, 'game'))} game files, dossier.json is ${dossier.length} bytes in ${outDir}`);
