// @ts-check
// SA-Opus, improve-generating phase 2, round-1 cross-review: how long the frozen set stages took, and how often the
// 46-s set-stage cut (deadline-s3-v1) or the 115-s stop acted. Reads the published rows of V4-S4 (the bounded arms, live
// deadline on) and V4-S4C (the uncapped twins: no call budget, no bound, no live deadline, today's two timers) and
// today's arm (`log-link`). Read-only; writes p2-xr-setstage.md.
//   node docs\improve-generating-phase-2\evidence\sa-opus\p2-xr-setstage.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const EV = join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen');
const CUT_MS = 46000;
/** @param {number[]} a @param {number} q */
const quantile = (a, q) => {
  const s = a.slice().sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
};
/** @type {string[]} */
const table = [];
const totals = { rows: 0, withSetMs: 0, over46: 0, over46Completed: 0, reserveCuts: /** @type {string[]} */ ([]), cutCells: /** @type {string[]} */ ([]) };
for (const [task, arms] of [['V4-S4', ['fr-frozen', 'fr-frozen-none', 'log-link']], ['V4-S4C', ['fr-frozen-uncapped', 'fr-frozen-none-uncapped']]]) {
  for (const arm of /** @type {string[]} */ (arms)) {
    const dir = join(EV, task, arm);
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.runs.json')).sort()) {
      const rows = JSON.parse(readFileSync(join(dir, f), 'utf8')).rows;
      const cell = rows[0].caseId;
      if (cell.endsWith('-master')) continue;
      const set = rows.map((/** @type {any} */ r) => r.run.igSetMs).filter((/** @type {unknown} */ v) => typeof v === 'number');
      const over = rows.filter((/** @type {any} */ r) => typeof r.run.igSetMs === 'number' && r.run.igSetMs > CUT_MS);
      const reasons = [...new Set(rows.map((/** @type {any} */ r) => r.run.partialReason).filter(Boolean))].join(', ');
      totals.rows += rows.length;
      totals.withSetMs += set.length;
      totals.over46 += over.length;
      totals.over46Completed += over.filter((/** @type {any} */ r) => r.run.acceptedCount >= 10).length;
      for (const r of rows.filter((/** @type {any} */ x) => x.run.partialReason === 'set:reserve-cut')) {
        totals.reserveCuts.push(`${task} ${arm} ${cell} rep ${r.rep} (${(r.run.responseMs / 1000).toFixed(1)} s, ${r.run.acceptedCount} puzzles)`);
      }
      if (over.length > 0) totals.cutCells.push(`${task} ${arm} ${cell}`);
      table.push(`| ${task} | ${arm} | ${cell} | ${rows.length} | ${set.length} | ${set.length ? (quantile(set, 0.5) / 1000).toFixed(1) : '-'} | ${set.length ? (quantile(set, 0.95) / 1000).toFixed(1) : '-'} | ${set.length ? (Math.max(...set) / 1000).toFixed(1) : '-'} | ${over.length} | ${over.filter((/** @type {any} */ r) => r.run.acceptedCount >= 10).length} | ${reasons || '-'} |`);
    }
  }
}
const lines = ['# Set-stage durations of the frozen rows and the 46-s cut (SA-Opus, phase-2 cross-review)', '',
  'Command: `node docs\\improve-generating-phase-2\\evidence\\sa-opus\\p2-xr-setstage.mjs` (read-only).',
  'Rows: `docs/improve-generating/evidence/frozen/{V4-S4,V4-S4C}/<arm>/*.runs.json`, Nightmare and Hell 1 cells; `igSetMs` is the',
  "set stage's duration (the request's start to the set), absent where a row has no set time. The uncapped twins (V4-S4C) run",
  'without the live deadline, so their set stages show what a 46-s cut would meet.', '',
  `Rows ${totals.rows}; with a set time ${totals.withSetMs}; set stage above 46 s: ${totals.over46} rows, of which ${totals.over46Completed} reached ten.`,
  `Cells with a set stage above 46 s: ${totals.cutCells.length === 0 ? 'none' : totals.cutCells.join('; ')}.`,
  `Rows ended by the 46-s reserve cut (\`set:reserve-cut\`, no set, so no set time): ${totals.reserveCuts.length === 0 ? 'none' : totals.reserveCuts.join('; ')}.`, '',
  '| Task | Arm | Cell | Rows | With set time | Median set (s) | p95 set (s) | Max set (s) | Above 46 s | Of those, reached ten | Partial reasons |',
  '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|', ...table, ''];
writeFileSync(join(HERE, 'p2-xr-setstage.md'), lines.join('\r\n'));
process.stdout.write(`${lines.slice(0, 10).join('\n')}\n`);
