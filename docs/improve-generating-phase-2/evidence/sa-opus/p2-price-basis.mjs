// @ts-check
// SA-Opus, improve-generating phase 2, round-1 analysis: the pricing basis of a production validation, read from the
// frozen round's published rows (V4-S4, V4-S4C) and its invocation logs. Per arm and cell: rows, the mean and the sum of
// responseMs, completion; per task: counted seconds from invocations.jsonl. Read-only; writes p2-price-basis.md/json.
//   node docs\improve-generating-phase-2\evidence\sa-opus\p2-price-basis.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const EV = join(ROOT, 'docs', 'improve-generating', 'evidence', 'frozen');
/** @type {any[]} */
const cells = [];
for (const task of ['V4-S4', 'V4-S4C']) {
  for (const arm of readdirSync(join(EV, task), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    for (const f of readdirSync(join(EV, task, arm)).filter((n) => n.endsWith('.runs.json'))) {
      const r = JSON.parse(readFileSync(join(EV, task, arm, f), 'utf8'));
      /** @type {Record<string, any>} */
      const by = {};
      for (const row of r.rows) {
        const c = (by[row.caseId] ??= { task, arm, cell: row.caseId, rows: 0, ten: 0, sumMs: 0, maxMs: 0 });
        c.rows += 1;
        c.ten += row.run.acceptedCount >= 10 ? 1 : 0;
        c.sumMs += row.run.responseMs;
        c.maxMs = Math.max(c.maxMs, row.run.responseMs);
      }
      cells.push(...Object.values(by));
    }
  }
}
/** @type {Record<string, { invocations: number, countedS: number }>} */
const tasks = {};
for (const task of ['V4-S4', 'V4-S4C']) {
  const p = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen', task, 'invocations.jsonl');
  if (!existsSync(p)) continue;
  const lines = readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  tasks[task] = { invocations: lines.length, countedS: lines.reduce((s, l) => s + (l.countedSeconds ?? l.counted ?? 0), 0) };
}
/** @type {Record<string, { rows: number, sumMs: number }>} */
const perArm = {};
for (const c of cells) {
  const k = `${c.task} ${c.arm}`;
  perArm[k] ??= { rows: 0, sumMs: 0 };
  perArm[k].rows += c.rows;
  perArm[k].sumMs += c.sumMs;
}
const out = ['# Pricing basis from the frozen round (SA-Opus, phase-2 analysis)', '',
  'Command: `node docs\\improve-generating-phase-2\\evidence\\sa-opus\\p2-price-basis.mjs` (read-only).',
  'Rows: `docs/improve-generating/evidence/frozen/{V4-S4,V4-S4C}/<arm>/*.runs.json`; counted seconds:',
  '`tests/artifacts/ig-proto/frozen/<task>/invocations.jsonl` (git-ignored raw logs).', '',
  '## Per task', '', '| Task | Invocations | Counted s | Counted min |', '|---|---:|---:|---:|',
  ...Object.entries(tasks).map(([t, v]) => `| ${t} | ${v.invocations} | ${v.countedS.toFixed(3)} | ${(v.countedS / 60).toFixed(1)} |`), '',
  '## Per arm', '', '| Task, arm | Rows | Sum of responseMs (s) | Mean per row (s) |', '|---|---:|---:|---:|',
  ...Object.entries(perArm).map(([k, v]) => `| ${k} | ${v.rows} | ${(v.sumMs / 1000).toFixed(1)} | ${(v.sumMs / 1000 / v.rows).toFixed(2)} |`), '',
  '## Per arm and cell', '', '| Task | Arm | Cell | Rows | Reached ten | Mean response (s) | Max response (s) |', '|---|---|---|---:|---:|---:|---:|',
  ...cells.sort((a, b) => `${a.task}${a.arm}${a.cell}`.localeCompare(`${b.task}${b.arm}${b.cell}`))
    .map((c) => `| ${c.task} | ${c.arm} | ${c.cell} | ${c.rows} | ${c.ten} | ${(c.sumMs / c.rows / 1000).toFixed(2)} | ${(c.maxMs / 1000).toFixed(1)} |`), ''];
writeFileSync(join(HERE, 'p2-price-basis.md'), out.join('\r\n'));
writeFileSync(join(HERE, 'p2-price-basis.json'), `${JSON.stringify({ tasks, perArm, cells }, null, 2).replace(/\n/g, '\r\n')}\r\n`);
process.stdout.write(`${out.slice(0, 24).join('\n')}\n`);
