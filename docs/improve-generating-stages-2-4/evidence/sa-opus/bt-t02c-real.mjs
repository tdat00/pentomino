// @ts-check
// SA-Opus, T02c's open details (2026-11-24): the two commands of tools/ig-proto/fit-read.mjs (T02c, the developer's
// tree before its commit) run once on real records, the published and raw records of V4-S2's arm fr-none (8 cells, 40
// rows), before S01 runs them on V4-S2B. V4-S2 is a historical namespace that the commands refuse, so they are called
// through their `io` seam under the scratch task id V4-SX, with a copy of V4-S2's plan under that id and every output
// in this folder's t02c-real/; the published and raw records are only read. The shard declarations name task V4-S2, so
// each row is expected to carry the one identity problem `the shard declaration is of V4-S2/fr-none/<shard>`.
// Unlocked; no rating, search or generation. The two Markdown records are kept beside this script
// (bt-t02c-real-preview.md, bt-t02c-real-prefixes.md, CRLF); the scratch folder t02c-real/ is removed at the end.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-t02c-real.mjs --label frozen --source-label "frozen 3fc65f4"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT } from './s2-lib.mjs';

const fr = await import(pathToFileURL(join(ROOT, 'tools', 'ig-proto', 'fit-read.mjs')).href);
const evidence = join(ROOT, 'docs', 'improve-generating-stages-2-4', 'evidence', 'sa-opus');
const here = join(evidence, 't02c-real');
rmSync(here, { recursive: true, force: true });
mkdirSync(join(here, 'plans'), { recursive: true });
const plan = JSON.parse(readFileSync(join(ROOT, 'tools', 'ig-proto', 'plans', 'V4-S2.json'), 'utf8'));
writeFileSync(join(here, 'plans', 'V4-SX.json'), `${JSON.stringify({ ...plan, task: 'V4-SX' })}\n`);
const io = {
  outDir: join(here, 'out'),
  plansDir: join(here, 'plans'),
  runsDir: join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen', 'V4-S2', 'fr-none'),
  rawDir: join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen', 'V4-S2', 'fr-none'),
};
const common = ['--task', 'V4-SX', '--arm', 'fr-none', '--label', 'frozen', '--source-label', 'frozen 3fc65f4'];
const preview = await fr.previewCommand(common, io);
const prefixes = await fr.prefixesCommand([...common, '--budget', 'nightmare=10000000000,hell-1=40000000000', '--bound', '4'], io);
const summary = JSON.parse(readFileSync(join(io.outDir, 'fit-read-prefixes-fr-none.json'), 'utf8')).summary;
for (const name of ['preview', 'prefixes']) {
  const text = readFileSync(join(io.outDir, `fit-read-${name}-fr-none.md`), 'utf8').replace(/\r\n/g, '\n').replace(/\n*$/, '\n');
  writeFileSync(join(evidence, `bt-t02c-real-${name}.md`), text.replace(/\n/g, '\r\n'));
}
rmSync(here, { recursive: true, force: true });
process.stdout.write(`bt-t02c-real: preview exit ${preview}, prefixes exit ${prefixes}; prefixes summary ${JSON.stringify(summary)}\n`);
