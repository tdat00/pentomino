// @ts-check
// SA-Opus, ruling R-P24-17 (T12b): a read-only check of the freeze record written by T12b, against the constants of
// freeze.mjs, T08a's trees, T12a's fit index today, the four V4-S3P bindings and the three captures; each capture is
// also compared with the normalized text of its blob at 57ef5cf, read with read-only git by the SA (the harness runs no
// git). It writes nothing.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\bt-t12b-record.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

const f = await import('../../../../tools/ig-proto/freeze.mjs');
const { lf, sha256Text, sha256File } = await import('../../../../tools/ig-proto/lib/records.mjs');
const { abs } = await import('../../../../tools/ig-proto/lib/paths.mjs');

/** @type {string[]} */
const problems = [];
const need = (/** @type {boolean} */ ok, /** @type {string} */ what) => {
  if (!ok) {
    problems.push(what);
  }
};
const raw = readFileSync(abs(f.FREEZE_PATH), 'utf8');
const rec = JSON.parse(raw);
const plain = (/** @type {unknown} */ v) => JSON.parse(JSON.stringify(v));
need(rec.format === 'ig-v4-freeze' && rec.version === 1, 'format and version');
for (const [key, want] of [['classes', f.FREEZE_CLASSES], ['bounds', f.FREEZE_BOUNDS], ['tables', f.FREEZE_TABLES], ['values', f.FREEZE_VALUES], ['seeds', f.FREEZE_SEEDS]]) {
  need(isDeepStrictEqual(rec[/** @type {string} */ (key)], plain(want)), `${key} equal the constants`);
}
const cells = rec.classes.flatMap((/** @type {any} */ c) => c.cells);
need(rec.classes.length === 5 && cells.length === 19 && new Set(cells).size === 19, '5 classes, 19 distinct cells');
const T08A = { 'fr-frozen': 'b3e530b1bca5', 'fr-frozen-none': 'fa903f397ef6', 'fr-frozen-uncapped': '96ef38e2fd6d', 'fr-frozen-none-uncapped': 'e31d829dee8d' };
need(isDeepStrictEqual(Object.keys(rec.variants), [...f.FROZEN_VARIANTS]), 'the four variants in order');
for (const [id, prefix] of Object.entries(T08A)) {
  need(String(rec.variants[id]?.treeId).startsWith(prefix), `${id} is T08a's tree ${prefix}`);
}
// The proofs: the four V4-S3P bindings, each hash today's, each binding's arm the record's variant.
need(rec.proofs.length === 4, 'four proofs');
for (const p of rec.proofs) {
  need(sha256File(abs(p.path)) === p.sha256, `proof ${p.path} unchanged`);
  const b = JSON.parse(readFileSync(abs(p.path), 'utf8'));
  const arm = b.expected?.arms?.[0];
  need(arm !== undefined && rec.variants[arm.id]?.treeId === arm.treeId && rec.variants[arm.id]?.paramsHash === arm.paramsHash && b.acceptedBy === 'V4-S3', `proof ${p.path} binds the record's ${arm?.id}`);
}
// The fit: the index today equals the record's, every file and index hash today's, the captures the record's.
const fit = f.fitIndex();
need(fit.problems.length === 0, `fitIndex today: ${fit.problems.length} problems`);
need(rec.fit.checked === fit.checked, `checked ${rec.fit.checked} = today ${fit.checked}`);
need(isDeepStrictEqual(rec.fit.captures, fit.captures), 'captures equal today\'s fitIndex');
need(isDeepStrictEqual(rec.fit.indices.map((/** @type {any} */ i) => [i.path, i.key, i.entries]), fit.indices.map((i) => [i.path, i.key, i.entries])), 'indices equal today\'s');
for (const i of rec.fit.indices) {
  need(sha256File(abs(i.path)) === i.sha256, `index ${i.path} unchanged`);
}
need(isDeepStrictEqual(rec.fit.files.map((/** @type {any} */ x) => x.path), [...f.FIT_INPUTS]), 'files are FIT_INPUTS in order');
const changedFiles = rec.fit.files.filter((/** @type {any} */ x) => sha256File(abs(x.path)) !== x.sha256).map((/** @type {any} */ x) => x.path);
// The captures: each the normalized text (CRLF, no BOM) of its blob at 57ef5cf, with the indexed sha256Lf.
for (const c of rec.fit.captures) {
  const text = readFileSync(abs(c.capturedPath), 'utf8');
  const blob = execFileSync('git', ['--no-pager', 'show', `${c.sourceCommit}:${c.path}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  need(!text.startsWith('\uFEFF') && !/(?<!\r)\n/.test(text), `${c.capturedPath} is CRLF without BOM`);
  need(sha256Text(text) === c.hash && sha256Text(lf(blob)) === c.hash, `${c.capturedPath} is ${c.sourceCommit}:${c.path} (sha256Lf ${c.hash.slice(0, 12)})`);
  need(sha256Text(readFileSync(abs(c.path), 'utf8')) !== c.hash, `${c.path} differs today (a capture is needed)`);
}
process.stdout.write(`bt-t12b-record: ${problems.length} problems; classes ${rec.classes.length}, cells ${cells.length}, variants ${Object.keys(rec.variants).length}, `
  + `fit checked ${rec.fit.checked}, captures ${rec.fit.captures.length}, files ${rec.fit.files.length} (changed since the write: ${changedFiles.length === 0 ? 'none' : changedFiles.join(', ')}), proofs ${rec.proofs.length}\n`);
for (const p of problems) {
  process.stdout.write(`  PROBLEM ${p}\n`);
}
process.exitCode = problems.length === 0 ? 0 : 1;
