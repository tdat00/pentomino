// @ts-check
// SA-Opus, T16 step 2 (stages 2 to 4 pack): B4 and the deadline in stage 4. Over every published row of fr-frozen and
// fr-frozen-none in V4-S4 (the validation and Master shards), verdicts.mjs's own deadlineViolation(run, { responseBoundMs:
// 120000 }), the rows by partialReason, the latest responses and the rows that ended at the generation stop; then the
// receipt and binding of V4-LIVE (the live deadline proved on real rows) and freeze.json's deadline values.
// Unlocked: it reads records only; it writes its outputs beside itself.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\t16-deadline.mjs
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { deadlineViolation, ingestRow } from '../../../../tools/ig-proto/verdicts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-stages-2-4/evidence/sa-opus';
const S4 = 'docs/improve-generating/evidence/frozen/V4-S4';
/** @type {{ path: string, sha256Lf: string }[]} */
const inputs = [];
const sha256 = (/** @type {string} */ t) => createHash('sha256').update(t, 'utf8').digest('hex');
const read = (/** @type {string} */ p) => {
  const text = readFileSync(join(ROOT, p), 'utf8');
  if (!inputs.some((e) => e.path === p)) {
    inputs.push({ path: p, sha256Lf: sha256(text.replace(/\r\n/g, '\n')) });
  }
  return text;
};
const json = (/** @type {string} */ p) => JSON.parse(read(p));
const crlf = (/** @type {string} */ t) => `${t.replace(/\r?\n/g, '\r\n').replace(/[ \t]+\r\n/g, '\r\n').replace(/(\r\n)*$/, '')}\r\n`;
const s1 = (/** @type {number} */ ms) => Math.round(ms / 100) / 10;

const freeze = json('docs/improve-generating/evidence/frozen/V4-S3/freeze.json');
const deadline = freeze.values.deadline;
/** @param {string | null} reason @returns {string} */
const kind = (reason) => (reason === null ? 'complete (null)'
  : reason === 'set:reserve-cut' ? 'set:reserve-cut'
    : reason.startsWith('set:no-window-') ? 'set:no-window-*'
      : ['time-limit', 'response-bound'].includes(reason) ? reason : `other: ${reason}`);

const arms = ['fr-frozen', 'fr-frozen-none'].map((arm) => {
  const files = readdirSync(join(ROOT, S4, arm)).filter((n) => n.endsWith('.runs.json')).sort();
  /** @type {Record<string, number>} */
  const byReason = {};
  let rows = 0;
  let valid = 0;
  let violations = 0;
  let maxResponseMs = 0;
  /** @type {any} */
  let maxRow = null;
  /** @type {{ rowKey: string, responseMs: number, acceptedCount: number, partialReason: string | null }[]} */
  const atStop = [];
  /** @type {Record<string, { rows: number, maxResponseS: number, violations: number }>} */
  const perCell = {};
  for (const name of files) {
    const doc = json(`${S4}/${arm}/${name}`);
    for (const row of doc.rows) {
      rows += 1;
      const g = ingestRow(row, { quantity: 10 });
      if (g.status !== 'valid') {
        continue;
      }
      valid += 1;
      const run = row.run;
      const v = deadlineViolation(run, { responseBoundMs: deadline.responseBoundMs });
      violations += v ? 1 : 0;
      const k = kind(run.partialReason ?? null);
      byReason[k] = (byReason[k] ?? 0) + 1;
      if (run.responseMs > maxResponseMs) {
        maxResponseMs = run.responseMs;
        maxRow = { rowKey: row.rowKey, responseMs: run.responseMs, acceptedCount: run.acceptedCount, partialReason: run.partialReason };
      }
      if (run.responseMs >= deadline.generationStopMs) {
        atStop.push({ rowKey: row.rowKey, responseMs: run.responseMs, acceptedCount: run.acceptedCount, partialReason: run.partialReason ?? null });
      }
      const cell = String(row.caseId);
      perCell[cell] ??= { rows: 0, maxResponseS: 0, violations: 0 };
      perCell[cell].rows += 1;
      perCell[cell].maxResponseS = Math.max(perCell[cell].maxResponseS, s1(run.responseMs));
      perCell[cell].violations += v ? 1 : 0;
    }
  }
  return { arm, files: files.length, rows, valid, violations, byReason, maxResponseS: s1(maxResponseMs), maxRow, atStop, perCell };
});

const receipt = json('docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.json');
const binding = json('docs/improve-generating/evidence/frozen/V4-LIVE/live-deadline.accepted.json');
const live = {
  verdict: receipt.verdict, rows: receipt.rows?.length ?? null,
  responseS: receipt.rows ? [Math.min(...receipt.rows.map((/** @type {any} */ r) => r.responseMs)), Math.max(...receipt.rows.map((/** @type {any} */ r) => r.responseMs))].map(s1) : null,
  igSetMaxS: receipt.rows ? s1(Math.max(...receipt.rows.map((/** @type {any} */ r) => r.igSetMs ?? 0))) : null,
  coverage: { expected: receipt.coverage.expected.length, observed: receipt.coverage.observed.length, missing: receipt.coverage.missing.length },
  fields: { live: receipt.live, postHoc: receipt.postHoc, workCutoffMs: receipt.workCutoffMs, responseBoundMs: receipt.responseBoundMs, reserveChecked: receipt.reserveChecked },
  binding: { kind: binding.expected?.kind, arms: (binding.expected?.arms ?? []).map((/** @type {any} */ a) => a.id), acceptedBy: binding.acceptedBy },
};
const result = { script: `${HERE}/t16-deadline.mjs`, deadline, arms, live, inputs: { entries: inputs.length, sha256Lf: sha256(JSON.stringify(inputs)) } };
writeFileSync(join(ROOT, HERE, 't16-deadline.json'), crlf(JSON.stringify(result, null, 2)), 'utf8');
const md = [
  '# T16: B4 and the deadline in stage 4 (V4-S4, the two bounded arms)',
  '',
  `freeze.json's deadline: reserve ${deadline.reserve}, set-stage cap ${deadline.setStageCapMs} ms, generation stop ${deadline.generationStopMs} ms, response bound ${deadline.responseBoundMs} ms.`,
  '',
  '| Arm | Runs files | Rows | Valid | Deadline violations (response above 120 s) | Latest response (s) | Rows at or after the 115-s stop | By partialReason |',
  '|---|---:|---:|---:|---:|---:|---:|---|',
  ...arms.map((a) => `| ${a.arm} | ${a.files} | ${a.rows} | ${a.valid} | ${a.violations} | ${a.maxResponseS} (${a.maxRow?.rowKey}) | ${a.atStop.length} | ${Object.entries(a.byReason).map(([k, n]) => `${k} ${n}`).join('; ')} |`),
  '',
  `V4-LIVE: receipt ${live.verdict}, ${live.rows} rows, responses ${live.responseS?.join(' to ')} s, set stages at most ${live.igSetMaxS} s; coverage ${live.coverage.observed} of ${live.coverage.expected}; binding ${live.binding.kind} for ${live.binding.arms.join(', ')}, accepted by ${live.binding.acceptedBy}.`,
].join('\n');
writeFileSync(join(ROOT, HERE, 't16-deadline.md'), crlf(md), 'utf8');
process.stdout.write(`t16-deadline: ${inputs.length} files read (sha256 of the index ${result.inputs.sha256Lf})\n`);
for (const a of arms) {
  process.stdout.write(`  ${a.arm}: ${a.rows} rows (${a.valid} valid), ${a.violations} violations, latest ${a.maxResponseS} s (${a.maxRow?.rowKey}), ${a.atStop.length} at or after 115 s; ${JSON.stringify(a.byReason)}\n`);
  for (const r of a.atStop) {
    process.stdout.write(`    at stop: ${r.rowKey} ${s1(r.responseMs)} s, ${r.acceptedCount} accepted, ${r.partialReason}\n`);
  }
}
process.stdout.write(`  V4-LIVE: ${JSON.stringify(live)}\n`);
