// @ts-check
// SA-Opus, improve-generating phase 1, round-1 analysis: T14's phase-1 bench of P6 restated per cell (unlocked read of
// docs/improve-generating/evidence/phase1/P6-bench/compare.json): the paired old/new ratios of T1 (the click to the
// validated set and its calibration puzzle, close to a first press of New puzzle on a new set), of T10 and of the
// response (ten-puzzle requests), with the memory checks. The Generator makes one puzzle per press
// (generator/app.js:32), so T1's ratio is the nearest measured proxy for a first press; no per-press time was measured.
//   node docs\improve-generating-phase-1\evidence\sa-opus\p1-t14-ratios.mjs
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-phase-1/evidence/sa-opus';
const SRC = 'docs/improve-generating/evidence/phase1/P6-bench/compare.json';
const text = readFileSync(join(ROOT, SRC), 'utf8');
const sha = createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
const c = JSON.parse(text);
const r2 = (/** @type {number} */ x) => Math.round(x * 100) / 100;
const s1 = (/** @type {number} */ ms) => Math.round(ms / 100) / 10;
/** @param {any} r */
const fmt = (r) => (r === undefined || r === null ? '-' : `x${r2(r.median)} [${r2(r.min)}-${r2(r.max)}] n ${r.n}`);
const rows = c.cells.map((/** @type {any} */ x) => ({
  cell: x.caseId, level: x.level,
  t1: fmt(x.ratios.t1), t10: fmt(x.ratios.t10), response: fmt(x.ratios.response),
  t1MedianS: `${s1(x.old.t1.median)} -> ${s1(x.new.t1.median)}`,
  responseMedianS: `${s1(x.old.response.median)} -> ${s1(x.new.response.median)}`,
  memory: ['old', 'new'].map((side) => Object.values(x[side].checks).every((/** @type {any} */ k) => k.status === 'pass') ? 'pass' : 'FAIL').join(' / '),
  peakProcessMiB: ['old', 'new'].map((side) => Math.round(x[side].peakProcessMax / 1048576)).join(' / '),
}));
const md = [
  `# T14 restated per cell (source \`${SRC}\`, sha256 of its LF text \`${sha}\`)`,
  '',
  '| Cell | Level | T1 ratio old/new | T10 ratio | Response ratio | T1 median, s (old -> new) | Response median, s | Memory checks old / new | Peak process MiB old / new |',
  '|---|---|---|---|---|---|---|---|---|',
  ...rows.map((/** @type {any} */ r) => `| ${r.cell} | ${r.level} | ${r.t1} | ${r.t10} | ${r.response} | ${r.t1MedianS} | ${r.responseMedianS} | ${r.memory} | ${r.peakProcessMiB} |`),
  '',
  `Identity: ${['pairs', 'equal', 'metricPrefixOnly', 'noPuzzleEvidence', 'differ', 'incomplete'].map((k) => `${k} ${JSON.stringify(c.identity?.[k])}`).join(', ')}.`,
].join('\n');
writeFileSync(join(ROOT, HERE, 'p1-t14-ratios.md'), `${md.replace(/\n/g, '\r\n')}\r\n`, 'utf8');
process.stdout.write(`${md}\n`);
