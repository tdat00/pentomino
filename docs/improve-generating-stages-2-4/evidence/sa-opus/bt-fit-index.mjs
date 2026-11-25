// @ts-check
// SA-Opus, break-tasks (review R18): the fit index of the freeze. Reads SA-Astra's three input indices (input-index.json,
// review-input-index.json, freeze-inputs.json `inputs`; sha256Lf = SHA-256 of the text with CRLF replaced by LF), lists
// their entries under tools/ (mutable harness sources), and checks every entry against the working tree today
// (sha256Lf). Then it writes the index of SA-Opus's fitting scripts (the scripts the joint report cites for W, P5, the
// prior, the reserve and deadline and the kernel), with their outputs and the record roots they read, as
// fit-input-index.json beside this script (sha256Lf, the same convention). Read-only otherwise; unlocked.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-fit-index.mjs
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { HERE, ROOT } from './s2-lib.mjs';

const lf = (/** @type {string} */ p) => createHash('sha256').update(readFileSync(p, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
const norm = (/** @type {string} */ p) => p.replace(/\\/g, '/');
const ASTRA = join(ROOT, 'docs', 'improve-generating-stages-2-4', 'evidence', 'sa-astra');
/** @type {Record<string, { path: string, sha256Lf: string }[]>} */
const indices = {
  'input-index.json': JSON.parse(readFileSync(join(ASTRA, 'input-index.json'), 'utf8')),
  'review-input-index.json': JSON.parse(readFileSync(join(ASTRA, 'review-input-index.json'), 'utf8')),
  'freeze-inputs.json': JSON.parse(readFileSync(join(ASTRA, 'freeze-inputs.json'), 'utf8')).inputs,
};
for (const [name, list] of Object.entries(indices)) {
  let missing = 0;
  let changed = 0;
  const tools = [];
  for (const e of list) {
    const p = norm(e.path);
    if (p.startsWith('tools/')) {
      tools.push(p);
    }
    const file = join(ROOT, ...p.split('/'));
    if (!existsSync(file)) {
      missing += 1;
    } else if (lf(file) !== e.sha256Lf) {
      changed += 1;
      process.stdout.write(`  ${name}: changed today: ${p}\n`);
    }
  }
  process.stdout.write(`${name}: ${list.length} entries, ${missing} missing, ${changed} changed; under tools/: ${tools.join(', ') || 'none'}\n`);
}

/** SA-Opus's fitting scripts that the joint report cites, with their outputs. */
const SCRIPTS = ['s2-lib.mjs', 's2-rows.mjs', 's2-work.mjs', 's2-calls.mjs', 's2-p5.mjs', 's2-prior.mjs', 's2-gains.mjs',
  's2-table.mjs', 's2-profile.mjs', 's2-today.mjs', 's2-account.mjs', 'j1-numbers.mjs'];
const outputs = readdirSync(HERE).filter((n) => /^(s2-[a-z0-9]+|j1-numbers)\.(json|md)$/.test(n)).sort();
/** The record roots the scripts read (s2-lib.mjs EVID and RAW, and the files they name). */
const ROOTS = ['docs/improve-generating/evidence/frozen/V4-S2', 'tests/artifacts/ig-proto/frozen/V4-S2'];
const FILES = ['docs/improve-generating/evidence/frozen/V4-S2K/kernel.json', 'docs/improve-generating/evidence/frozen/V4-S2W/width.json',
  'docs/improve-generating/evidence/provisional/IGP-05/families-windows.jsonl', 'docs/improve-generating/evidence/provisional/IGP-05/families-failed-sets.jsonl',
  'tools/ig-proto/data/prior-v1.json', 'tools/ig-proto/data/frozen-round-v1.json', 'tools/ig-proto/verdicts.mjs', 'tools/ig-proto/linkage.mjs'];
/** @param {string} dir @returns {string[]} */
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const entries = [];
for (const n of [...SCRIPTS, ...outputs]) {
  entries.push({ path: `docs/improve-generating-stages-2-4/evidence/sa-opus/${n}`, sha256Lf: lf(join(HERE, n)), role: SCRIPTS.includes(n) ? 'script' : 'output' });
}
for (const f of FILES) {
  entries.push({ path: f, sha256Lf: lf(join(ROOT, ...f.split('/'))), role: f.startsWith('tools/') ? 'harness source' : 'record' });
}
let rootFiles = 0;
for (const r of ROOTS) {
  for (const file of walk(join(ROOT, ...r.split('/'))).sort()) {
    if (statSync(file).isFile()) {
      entries.push({ path: norm(relative(ROOT, file)), sha256Lf: lf(file), role: 'record' });
      rootFiles += 1;
    }
  }
}
const out = { format: 'sa-opus-fit-input-index', version: 1, hash: 'sha256Lf: SHA-256 of the UTF-8 text with every CRLF replaced by LF',
  note: 'The inputs of SA-Opus\'s fitting scripts cited by the joint report (W, P5, prior, reserve and deadline, kernel); the two harness modules are mutable sources of the base 57ef5cf.',
  entries };
writeFileSync(join(HERE, 'fit-input-index.json'), `${JSON.stringify(out, null, 1)}\n`.replace(/\n/g, '\r\n'));
process.stdout.write(`fit-input-index.json: ${entries.length} entries (${SCRIPTS.length} scripts, ${outputs.length} outputs, ${FILES.length} files, ${rootFiles} files under the two V4-S2 roots)\n`);
