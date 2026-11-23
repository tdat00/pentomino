// @ts-check
// SA-Astra: final recheck of the three review-3 corrections; no engine, tree build, git or timed run.
// Run at the repository root:
// node docs\improve-generating-stages-2-4\evidence\sa-astra\bt-review4-checks.mjs
// node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-r3-witness.mjs --label frozen
// npm run check
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const PACK = join(ROOT, 'tasks', 'improve-generating-stages-2-4');
const sha = (/** @type {Buffer} */ b) => createHash('sha256').update(b).digest('hex');
const abs = (/** @type {string} */ p) => join(ROOT, ...p.split('/'));
const rel = (/** @type {string} */ p) => relative(ROOT, p).replaceAll('\\', '/');
const text = (/** @type {string} */ name) => readFileSync(join(PACK, name), 'utf8').replace(/\r\n/g, '\n');
/** @param {boolean} ok @param {string} why */
function check(ok, why) {
  if (!ok) {
    throw new Error(why);
  }
}

const earlier = JSON.parse(readFileSync(join(HERE, 'bt-review3-checks.json'), 'utf8'));
const changed = earlier.format.filter((/** @type {any} */ r) => sha(readFileSync(abs(r.path))) !== r.sha256)
  .map((/** @type {any} */ r) => r.path.split('/').at(-1)).sort();
check(isDeepStrictEqual(changed, [
  'T02c-fit-reader-commands.md', 'T03b-p7-probe-declaration-and-verdicts.md',
  'T03c-p7-probe-bindings-and-commands.md', 'T06b-budget-by-mode-and-per-set-levels.md', 'check-list.md',
].sort()), `Unexpected pack changes: ${changed.join(', ')}`);
for (const r of earlier.codeInputs) {
  check(sha(readFileSync(abs(r.path))) === r.sha256, `Changed code input: ${r.path}`);
}

const checklist = text('check-list.md');
const ids = [...checklist.matchAll(/^- \[ \] ([TS]\d+[a-z]?) /gm)].map((m) => m[1]);
const files = readdirSync(PACK).filter((n) => /^[TS][0-9].*\.md$/.test(n));
check(ids.length === 35 && new Set(ids).size === 35, 'Not 35 unique indexed tasks');
check(isDeepStrictEqual([...ids].sort(), files.map((n) => n.split('-')[0]).sort()), 'Task file/index mismatch');
const rows = files.map((name) => {
  const id = name.split('-')[0];
  const body = text(name);
  const hours = Number(/\| Estimate \| developer ([\d.]+) h/.exec(body)?.[1] ?? 0);
  const estimate = new RegExp(`^\\| ${id} \\| \\[${id}\\]\\([^)]+\\) \\| ([\\d.]+) \\|`, 'm').exec(checklist);
  check(hours === 0 || hours === Number(estimate?.[1]), `Index estimate differs: ${id}`);
  const line = body.split('\n').find((l) => l.startsWith('| Depends on |')) ?? '';
  for (const dep of [...line.matchAll(/\b([TS]\d{2}[a-z]?)\b/g)].map((m) => m[1])) {
    check(ids.includes(dep) && ids.indexOf(dep) < ids.indexOf(id), `Bad dependency: ${id} -> ${dep}`);
  }
  return { id, hours };
});
const totalHours = rows.reduce((a, r) => a + r.hours, 0);
check(totalHours === 68.5 && rows.every((r) => r.hours <= 3), 'Wrong total or task above 3 hours');
check(checklist.includes('**Total (35 tasks)** | **68.5**'), 'Wrong summary total');
for (const [, p] of checklist.matchAll(/\]\(([^)]+\.md)\)/g)) {
  check(existsSync(join(PACK, ...p.split('/'))), `Broken index link: ${p}`);
}

const inputs = [...files, 'check-list.md', 'review-3-response.md'].map((name) => {
  const path = join(PACK, name);
  const b = readFileSync(path);
  const s = new TextDecoder('utf-8', { fatal: true }).decode(b);
  check(!(b[0] === 239 && b[1] === 187 && b[2] === 191) && !/(?<!\r)\n|\r(?!\n)/.test(s)
    && !/[ \t]+\r?$/m.test(s) && s.endsWith('\r\n'), `Bad format: ${name}`);
  return { path: rel(path), sha256: sha(b) };
});
const witness = join(HERE, '..', 'sa-opus', 'bt-r3-witness.mjs');
inputs.push({ path: rel(witness), sha256: sha(readFileSync(witness)) });
const out = {
  base: '57ef5cf', tasks: ids.length, totalHours, maximumHours: Math.max(...rows.map((r) => r.hours)),
  changedPackInputs: changed, unchangedCodeInputs: earlier.codeInputs.length, inputs,
  priorEvidencePreserved: true, noEngineExecution: true,
};
writeFileSync(relative(process.cwd(), join(HERE, 'bt-review4-checks.json')),
  JSON.stringify(out, null, 2).replace(/\n/g, '\r\n') + '\r\n', 'utf8');
console.log(`PASS: ${ids.length} tasks; ${totalHours} developer hours; maximum ${out.maximumHours}; links, estimates and dependencies agree.`);
console.log(`PASS: only the five declared pack inputs changed; ${out.unchangedCodeInputs} code inputs unchanged; ${inputs.length - 1} pack files formatted.`);
