// @ts-check
// SA-Opus, improve-generating phase 2: an independent check of SA-Astra's enumerated price
// (docs/improve-generating-phase-2/evidence/sa-astra/round1-cross-audit.json). Read-only: it never runs her script (which
// writes into her folder). For every planned row it recomputes the per-row seconds from the published frozen rows
// (the matching arm/cell mean response + 2 s), or from the row limit where her row names no source, then replays her
// stage schedules with the stated rules (2-s start-up, 885-s horizon, a row starts while elapsed + rowLimitS + 10 <= 885
// and takes min(rowS, rowLimitS + 10), 45-s quiet per invocation, guard 1.25 x counted, the browser checks at their
// enforced ceiling) and compares the totals. Writes p2-xr-verify-astra.md.
//   node docs\improve-generating-phase-2\evidence\sa-opus\p2-xr-verify-astra.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const read = (/** @type {string} */ p) => readFileSync(join(ROOT, ...p.split('/')), 'utf8');
const audit = JSON.parse(read('docs/improve-generating-phase-2/evidence/sa-astra/round1-cross-audit.json'));

/** @type {Map<string, any[]>} */
const files = new Map();
const rowsOf = (/** @type {string} */ path) => {
  if (!files.has(path)) files.set(path, JSON.parse(read(path)).rows);
  return /** @type {any[]} */ (files.get(path));
};
/** @type {Map<string, number>} */
const meanOf = new Map();
const mean = (/** @type {string} */ path) => {
  if (!meanOf.has(path)) {
    const r = rowsOf(path);
    meanOf.set(path, r.reduce((s, x) => s + x.run.responseMs / 1000, 0) / r.length);
  }
  return /** @type {number} */ (meanOf.get(path));
};

// 1. Per-row seconds.
let checked = 0;
let rowSDiffs = 0;
/** @type {string[]} */
const diffExamples = [];
/** @type {Record<string, number>} */
const basisCount = {};
for (const row of audit.rows) {
  /** @type {number} */
  let mine;
  let basis;
  if (typeof row.source === 'string' && row.source.endsWith('.runs.json')) {
    const twin = row.component === 'conditional-twin' || /twin/.test(row.component);
    if (twin && typeof row.rep === 'number') {
      const match = rowsOf(row.source).find((x) => x.rep === row.rep);
      mine = match === undefined ? mean(row.source) + 2 : match.run.responseMs / 1000 + 2;
      basis = match === undefined ? 'twin: cell mean + 2' : 'twin: matching row + 2';
    } else {
      mine = mean(row.source) + 2;
      basis = 'mean + 2';
    }
  } else {
    mine = row.rowLimitS;
    basis = 'row limit';
  }
  basisCount[basis] = (basisCount[basis] ?? 0) + 1;
  checked += 1;
  if (Math.abs(mine - row.rowS) > 1e-6) {
    rowSDiffs += 1;
    if (diffExamples.length < 8) diffExamples.push(`${row.key}: hers ${row.rowS.toFixed(3)}, mine ${mine.toFixed(3)} (${basis})`);
  }
}

// 2. Her stage schedules replayed with the stated rules, in her row order.
const H = 885;
const simulate = (/** @type {any[]} */ rows) => {
  let invocations = 0;
  let nodeS = 0;
  let i = 0;
  while (i < rows.length) {
    let e = 2;
    let ran = 0;
    while (i < rows.length && e + rows[i].rowLimitS + 10 <= H) {
      e += Math.min(rows[i].rowS, rows[i].rowLimitS + 10);
      i += 1;
      ran += 1;
    }
    if (ran === 0) throw new Error(`row ${rows[i].key} does not fit the horizon`);
    invocations += 1;
    nodeS += e;
  }
  return { invocations, nodeS, quietS: 45 * invocations, countedS: nodeS + 45 * invocations };
};
/** @type {Record<string, any>} */
const result = {};
const byKey = new Map(audit.rows.map((/** @type {any} */ r) => [r.key, r]));
for (const stage of ['A', 'B']) {
  const rows = audit.rows.filter((/** @type {any} */ r) => r.stage === stage);
  // Her execution order (paired arms interleaved) is the order of her schedule's keys; the rows array is grouped by component.
  const scheduled = audit.stages[stage].schedule.flatMap((/** @type {any} */ inv) => inv.keys).map((/** @type {string} */ k) => byKey.get(k));
  const sim = simulate(scheduled);
  const simArray = simulate(rows);
  const items = audit.items.filter((/** @type {any} */ it) => it.stage === stage);
  const itemCounted = items.reduce((/** @type {number} */ s, /** @type {any} */ it) => s + it.countedS, 0);
  const itemGuard = items.reduce((/** @type {number} */ s, /** @type {any} */ it) => s + it.guardS, 0);
  const countedS = sim.countedS + itemCounted;
  const guardS = 1.25 * sim.countedS + itemGuard;
  const hers = audit.stages[stage];
  result[stage] = { rows: rows.length, scheduledRows: scheduled.length, invocations: sim.invocations, arrayOrderInvocations: simArray.invocations,
    countedMin: countedS / 60, guardMin: guardS / 60,
    hersInvocations: hers.invocations, hersCountedMin: hers.totalCountedS / 60, hersGuardMin: hers.totalGuardS / 60 };
}
const total = { countedMin: result.A.countedMin + result.B.countedMin, guardMin: result.A.guardMin + result.B.guardMin };

const f3 = (/** @type {number} */ x) => x.toFixed(3);
const lines = ['# Independent check of SA-Astra\'s enumerated price (SA-Opus)', '',
  'Command: `node docs\\improve-generating-phase-2\\evidence\\sa-opus\\p2-xr-verify-astra.mjs` (read-only; her script is not run).',
  'Input: `docs/improve-generating-phase-2/evidence/sa-astra/round1-cross-audit.json` (`rows`, `stages`, `items`) and the published',
  'frozen rows each planned row names as its source.', '',
  `## 1. Per-row seconds: ${checked} rows checked, ${rowSDiffs} differ by more than 1e-6 s`, '',
  `Bases used: ${Object.entries(basisCount).map(([k, v]) => `${k} ${v}`).join('; ')}.`,
  ...(diffExamples.length ? ['', 'Differences (first eight):', '', ...diffExamples.map((d) => `- ${d}`)] : []), '',
  '## 2. Stage schedules replayed in her execution order (the keys of her `stages.<S>.schedule`)', '',
  '| Stage | Rows (scheduled) | Invocations (mine / hers) | Counted min (mine / hers) | Guard min (mine / hers) |', '|---|---:|---:|---:|---:|',
  ...['A', 'B'].map((s) => `| ${s} | ${result[s].rows} (${result[s].scheduledRows}) | ${result[s].invocations} / ${result[s].hersInvocations} | ${f3(result[s].countedMin)} / ${f3(result[s].hersCountedMin)} | ${f3(result[s].guardMin)} / ${f3(result[s].hersGuardMin)} |`),
  `| Total | ${result.A.rows + result.B.rows} | | ${f3(total.countedMin)} | ${f3(total.guardMin)} |`, '',
  `Grant by stage, rounded up: ${Math.ceil(result.A.guardMin)} + ${Math.ceil(result.B.guardMin)} = ${Math.ceil(result.A.guardMin) + Math.ceil(result.B.guardMin)} counted minutes.`,
  `Packing the same rows in the order of her \`rows\` array (grouped by component, arms not interleaved) needs ${result.A.arrayOrderInvocations} and ${result.B.arrayOrderInvocations} invocations: the order moves at most one 47-s invocation.`, ''];
writeFileSync(join(HERE, 'p2-xr-verify-astra.md'), lines.join('\r\n'));
process.stdout.write(`${lines.join('\n')}\n`);
