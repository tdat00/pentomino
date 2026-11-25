// @ts-check
// SA-Opus, improve-generating phase 2: the figures of Q-P2-1's options, from SA-Astra's enumerated schedule
// (docs/improve-generating-phase-2/evidence/sa-astra/round1-cross-audit.json), replayed with the same rules as
// p2-xr-verify-astra.mjs: (a) the agreed schedule; (c) the 140 sentinel rows at their row limits (her stress case);
// (d) the schedule without the 140 sentinel rows. Read-only; writes p2-q1-options.md.
//   node docs\improve-generating-phase-2\evidence\sa-opus\p2-q1-options.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const audit = JSON.parse(readFileSync(join(ROOT, 'docs', 'improve-generating-phase-2', 'evidence', 'sa-astra', 'round1-cross-audit.json'), 'utf8'));
const byKey = new Map(audit.rows.map((/** @type {any} */ r) => [r.key, r]));

const simulate = (/** @type {any[]} */ rows) => {
  let invocations = 0;
  let nodeS = 0;
  let i = 0;
  while (i < rows.length) {
    let e = 2;
    let ran = 0;
    while (i < rows.length && e + rows[i].rowLimitS + 10 <= 885) {
      e += Math.min(rows[i].rowS, rows[i].rowLimitS + 10);
      i += 1;
      ran += 1;
    }
    if (ran === 0) throw new Error('a row does not fit the horizon');
    invocations += 1;
    nodeS += e;
  }
  return { invocations, countedS: nodeS + 45 * invocations };
};
/** @param {(r: any) => any} map A row transform; return null to drop the row. */
const scenario = (map) => {
  /** @type {Record<string, { rows: number, invocations: number, countedMin: number, guardMin: number, grant: number }>} */
  const out = {};
  for (const stage of ['A', 'B']) {
    const rows = audit.stages[stage].schedule.flatMap((/** @type {any} */ inv) => inv.keys).map((/** @type {string} */ k) => map(byKey.get(k))).filter(Boolean);
    const sim = simulate(rows);
    const items = audit.items.filter((/** @type {any} */ it) => it.stage === stage);
    const itemCounted = items.reduce((/** @type {number} */ s, /** @type {any} */ it) => s + it.countedS, 0);
    const itemGuard = items.reduce((/** @type {number} */ s, /** @type {any} */ it) => s + it.guardS, 0);
    const guardS = 1.25 * sim.countedS + itemGuard;
    out[stage] = { rows: rows.length, invocations: sim.invocations, countedMin: (sim.countedS + itemCounted) / 60, guardMin: guardS / 60, grant: Math.ceil(guardS / 60) };
  }
  return out;
};
const scenarios = {
  '(a) the agreed schedule': scenario((r) => r),
  '(c) the 140 sentinel rows at their row limits (stress)': scenario((r) => (r.component === 'non-table' ? { ...r, rowS: r.rowLimitS } : r)),
  '(d) without the 140 sentinel rows': scenario((r) => (r.component === 'non-table' ? null : r)),
};
const f = (/** @type {number} */ x) => x.toFixed(3);
const lines = ['# The figures of Q-P2-1\'s options (SA-Opus)', '',
  'Command: `node docs\\improve-generating-phase-2\\evidence\\sa-opus\\p2-q1-options.mjs` (read-only).',
  'Input: SA-Astra\'s enumerated schedule, `evidence/sa-astra/round1-cross-audit.json`, replayed in her execution order with',
  'her rules (2-s start-up, 885-s horizon, admission while elapsed + row limit + 10 <= 885, 45-s quiet, guard 1.25 x counted,',
  'the browser checks at their ceiling).', '',
  '| Scenario | Stage | Rows | Invocations | Counted min | Guard min | Stage grant |', '|---|---|---:|---:|---:|---:|---:|',
  ...Object.entries(scenarios).flatMap(([name, s]) => ['A', 'B'].map((st) => `| ${name} | ${st} | ${s[st].rows} | ${s[st].invocations} | ${f(s[st].countedMin)} | ${f(s[st].guardMin)} | ${s[st].grant} |`)),
  '',
  ...Object.entries(scenarios).map(([name, s]) => `- ${name}: guard ${f(s.A.guardMin + s.B.guardMin)} minutes; stage grants ${s.A.grant} + ${s.B.grant} = ${s.A.grant + s.B.grant}.`), ''];
writeFileSync(join(HERE, 'p2-q1-options.md'), lines.join('\r\n'));
process.stdout.write(`${lines.join('\n')}\n`);
