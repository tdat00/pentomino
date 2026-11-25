// @ts-check
// SA-Astra: final S01 reading/amendment check. Preserve s01-review-checks.json and every observation.
// node docs\improve-generating-stages-2-4\evidence\sa-astra\s01-final-checks.mjs
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const bytes = (/** @type {string} */ p) => readFileSync(abs(p));
const text = (/** @type {string} */ p) => bytes(p).toString('utf8').replace(/\r\n/g, '\n');
const sha = (/** @type {Buffer | string} */ b) => createHash('sha256').update(b).digest('hex');
const P = 'tasks/improve-generating-stages-2-4/';
const D = 'docs/improve-generating-stages-2-4/';
const evidencePath = `${D}evidence/sa-astra/s01-review-checks.json`;
const evidenceHash = sha(bytes(evidencePath));
const evidence = JSON.parse(text(evidencePath));
/** @param {boolean} value @param {string} message */
function check(value, message) {
  if (!value) {
    throw new Error(message);
  }
}
const changed = evidence.inputs.filter((/** @type {any} */ r) => sha(bytes(r.path)) !== r.sha256Raw)
  .map((/** @type {any} */ r) => r.path).sort();
check(isDeepStrictEqual(changed, [`${D}s01-reading.md`, `${P}S06-run-v4-s4.md`].sort()), `Unexpected changed review input: ${changed.join(', ')}`);
check(evidence.publicationInputs.length === 8, 'Supplement must bind eight files');
for (const r of evidence.publicationInputs) {
  check(sha(text(r.path)) === r.sha256, `Changed publication metadata: ${r.path}`);
}

const list = text(`${P}check-list.md`);
const ids = [...list.matchAll(/^- \[[ xX]\] ([TS]\d+[a-z]?) /gm)].map((m) => m[1]);
const files = readdirSync(abs(P)).filter((n) => /^[TS][0-9].*\.md$/.test(n));
check(ids.length === 36 && new Set(ids).size === 36, 'Not 36 indexed tasks');
check(isDeepStrictEqual([...ids].sort(), files.map((n) => n.split('-')[0]).sort()), 'Index/file mismatch');
let hours = 0;
for (const name of files) {
  const body = text(P + name);
  const id = name.split('-')[0];
  const h = Number(/\| Estimate \| developer ([\d.]+) h/.exec(body)?.[1] ?? 0);
  check(h <= 3, `${id}: estimate above 3 hours`);
  hours += h;
  for (const dep of [...(body.split('\n').find((l) => l.startsWith('| Depends on |')) ?? '').matchAll(/\b([TS]\d{2}[a-z]?)\b/g)].map((m) => m[1])) {
    check(ids.includes(dep) && ids.indexOf(dep) < ids.indexOf(id), `${id}: bad dependency ${dep}`);
  }
}
check(hours === 69 && list.includes('**Total (36 tasks)** | **69**'), 'Wrong total hours');
for (const [, p] of list.matchAll(/\]\(([^)]+\.md)\)/g)) {
  check(existsSync(join(abs(P), ...p.split('/'))), `Broken index link ${p}`);
}
const t02d = text(`${P}T02d-fit-read-publication-inputs.md`);
const blocks = [...t02d.matchAll(/```js\n([\s\S]*?)\n\s*```/g)].map((m) => m[1].trim());
check(blocks.length === 3, 'T02d must supply three literal blocks');
const fit = text('tools/ig-proto/fit-read.mjs').split('export async function prefixesCommand(')[1];
check(fit.split('const ledger = rowLedger(lines, links);').length === 2, 'T02d ledger anchor not unique');
check(fit.split('publication: publicationOf(ctx.runsDir, shard),').length === 2, 'T02d publication anchor not unique');
check(text('tools/ig-proto/self-test.mjs').split(blocks[1]).length === 2, 'T02d existing wanted-list anchor not unique');
check(blocks[2].includes("join(fx.runsDir, 'pilot-x.runs.md')"), 'T02d expected input absent');
check(text('tools/ig-proto/README.md').includes("its publication (`publicationOf`),"), 'T02d README anchor absent');
const t11 = text(`${P}T11-sa-reading-of-the-fit-runs.md`);
check(t11.split('\n').find((l) => l.startsWith('| Depends on |'))?.includes('T02d') === true, 'T11 must depend on T02d');
const t12 = text(`${P}T12a-fit-index.md`);
check(t12.includes(`{ path: '${evidencePath}', field: 'publicationInputs', key: 'sha256' }`), 'T12a supplement field/key differs');
check(t12.includes(`'${D}evidence/sa-astra/s01-review-checks.mjs',`), 'T12a review script absent');
const s06 = text(`${P}S06-run-v4-s4.md`).replace(/\s+/g, ' ');
check(s06.includes('if either falls below the required 0.9 no-regression bound at stage 4, phase 2 stops for a decision, while every other verdict of the run stands. (a)'),
  'S06 warning is missing or after its options');

for (const p of [...files.map((n) => P + n), `${P}check-list.md`, `${D}s01-reading.md`]) {
  const b = bytes(p);
  const s = new TextDecoder('utf-8', { fatal: true }).decode(b);
  check(!(b[0] === 239 && b[1] === 187 && b[2] === 191) && !/(?<!\r)\n|\r(?!\n)/.test(s)
    && !/[ \t]+\r?$/m.test(s) && s.endsWith('\r\n'), `Bad format ${p}`);
}
check(sha(bytes(evidencePath)) === evidenceHash, 'Review supplement changed during final check');
console.log(`PASS: ${evidence.inputs.length - changed.length} original review input byte hashes unchanged; only reading and S06 amended.`);
console.log('PASS: eight supplemental metadata hashes; supplement preserved unchanged.');
console.log('PASS: 36 task files, 69 hours, all at most 3 hours; links and declared dependencies valid.');
console.log('PASS: T02d literal anchors, T11 dependency, T12a supplement and S06 warning; all amended text formatted.');
const indexT11 = list.split('\n').find((l) => /^- \[[ xX]\] T11 /.test(l)) ?? '';
if (!indexT11.includes('T02d')) {
  console.log('CLERICAL: synchronize the T11 index suffix to (depends on S03, S01, T02d); the task header and ruling already contain the dependency.');
}
