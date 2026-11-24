// @ts-check
// SA-Opus, T11 steps 1 and 5 (stages 2 to 4 pack): the per-cell table of the call prefixes of V4-S3P's 20 uncapped
// Hell 1 rows against the proposed bounded configuration (Hell 1 budget 40 G in both modes, the bound of four
// same-side no-window set attempts), from the written-once fitting record
// docs/improve-generating/evidence/frozen/V4-S3P/fit-read-prefixes-fr-frozen-none-uncapped.json; and, from the same raw
// journals through the reader's own `callPrefixes`, the largest calls per cell (stage, ended or terminated) and the
// set calls' end results, which show how far each observed path is from the budget and from the bound.
// Unlocked: it reads records and writes its outputs beside itself; it rates nothing.
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\t11-prefixes-table.mjs
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { callPrefixes } from '../../../../tools/ig-proto/fit-read.mjs';
import { parseLines } from '../../../../tools/ig-proto/verdicts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const HERE = 'docs/improve-generating-stages-2-4/evidence/sa-opus';
const RECORD = 'docs/improve-generating/evidence/frozen/V4-S3P/fit-read-prefixes-fr-frozen-none-uncapped.json';
const RAW_DIR = 'tests/artifacts/ig-proto/frozen/V4-S3P/fr-frozen-none-uncapped';
const G = 1e9;

/** @type {{ path: string, sha256Lf: string }[]} */
const inputs = [];
const sha256 = (/** @type {string} */ text) => createHash('sha256').update(text, 'utf8').digest('hex');
/** @param {string} path @returns {string} */
function read(path) {
  const text = readFileSync(join(ROOT, path), 'utf8');
  inputs.push({ path, sha256Lf: sha256(text.replace(/\r\n/g, '\n')) });
  return text;
}
const crlf = (/** @type {string} */ text) => `${text.replace(/\r?\n/g, '\r\n').replace(/[ \t]+\r\n/g, '\r\n').replace(/(\r\n)*$/, '')}\r\n`;
const g = (/** @type {number} */ units) => (units / G).toFixed(3);

const record = JSON.parse(read(RECORD));
const budget = record.budgets['hell-1'];
const bound = record.bound;
/** @type {any[]} */
const recomputed = [];
for (const row of record.rows) {
  const logs = `${RAW_DIR}/${row.shard}/logs`;
  const names = readdirSync(join(ROOT, logs)).sort()
    .filter((n) => n.startsWith(`${row.rowKey}.`) && n.endsWith('.jsonl') && !n.endsWith('.row.jsonl') && n !== `${row.rowKey}.link.jsonl`);
  const lines = names.flatMap((n) => parseLines(read(`${logs}/${n}`), n).lines);
  const { calls } = callPrefixes(lines, record.budgets);
  const sets = calls.filter((c) => c.stage === 'set').sort((a, b) => a.attempt - b.attempt);
  recomputed.push({
    rowKey: row.rowKey, cell: row.cell, calls,
    sameMax: calls.length === 0 ? row.maxSpent === null : Math.max(...calls.map((c) => c.spent)) === row.maxSpent,
    sets: sets.map((c) => ({ attempt: c.attempt, ended: c.ended, result: c.endResult, spentG: Number(g(c.spent)) })),
  });
}

const cells = [...new Set(record.rows.map((/** @type {any} */ r) => r.cell))].map((cell) => {
  const own = record.rows.filter((/** @type {any} */ r) => r.cell === cell);
  const again = recomputed.filter((r) => r.cell === cell);
  const all = again.flatMap((r) => r.calls.map((/** @type {any} */ c) => ({ ...c, rowKey: r.rowKey })));
  const top = all.slice().sort((a, b) => b.spent - a.spent).slice(0, 3);
  const maxOf = (/** @type {(c: any) => boolean} */ keep) => {
    const list = all.filter(keep);
    return list.length === 0 ? null : Math.max(...list.map((c) => c.spent));
  };
  const setEnds = again.flatMap((r) => r.sets);
  return {
    cell,
    rows: own.length,
    valid: own.filter((/** @type {any} */ r) => r.rowStatus === 'valid').length,
    complete: own.filter((/** @type {any} */ r) => r.complete === true).length,
    unreadable: own.filter((/** @type {any} */ r) => r.unreadable === true).length,
    identity: own.filter((/** @type {any} */ r) => r.identity.length > 0).length,
    problems: own.filter((/** @type {any} */ r) => r.problems.length > 0).length,
    calls: own.reduce((n, /** @type {any} */ r) => n + Object.values(r.calls).reduce((a, /** @type {any} */ b) => a + b, 0), 0),
    clear: own.reduce((n, /** @type {any} */ r) => n + (r.calls.clear ?? 0), 0),
    affected: own.reduce((n, /** @type {any} */ r) => n + r.affected.length, 0),
    potentiallyAffected: own.reduce((n, /** @type {any} */ r) => n + r.potentiallyAffected.length, 0),
    ambiguous: own.reduce((n, /** @type {any} */ r) => n + r.ambiguous.length, 0),
    maxSpentG: Number(g(Math.max(...own.map((/** @type {any} */ r) => r.maxSpent)))),
    boundFirings: own.filter((/** @type {any} */ r) => r.bound?.fires === true).length,
    recomputedSameMax: again.every((r) => r.sameMax),
    ended: all.filter((c) => c.ended).length,
    terminated: all.filter((c) => !c.ended).length,
    terminatedOpen: all.filter((c) => !c.ended && c.open).length,
    maxEndedBatchG: maxOf((c) => c.stage === 'batch' && c.ended) === null ? null : Number(g(/** @type {number} */ (maxOf((c) => c.stage === 'batch' && c.ended)))),
    maxTerminatedG: maxOf((c) => !c.ended) === null ? null : Number(g(/** @type {number} */ (maxOf((c) => !c.ended)))),
    maxSetG: maxOf((c) => c.stage === 'set') === null ? null : Number(g(/** @type {number} */ (maxOf((c) => c.stage === 'set')))),
    top: top.map((c) => ({ rowKey: c.rowKey, call: c.call, stage: c.stage, attempt: c.attempt, ended: c.ended, result: c.endResult, spentG: Number(g(c.spent)) })),
    setEnds: {
      ended: setEnds.filter((s) => s.ended).length,
      terminated: setEnds.filter((s) => !s.ended).length,
      results: setEnds.filter((s) => s.ended).reduce((m, /** @type {any} */ s) => ({ ...m, [s.result]: (m[s.result] ?? 0) + 1 }), /** @type {Record<string, number>} */ ({})),
    },
  };
});

const all = recomputed.flatMap((r) => r.calls);
const result = {
  script: `${HERE}/t11-prefixes-table.mjs`, record: RECORD, budget, bound,
  summary: record.summary,
  maxSpentG: Number(g(Math.max(...all.map((c) => c.spent)))),
  headroom: Number((budget / Math.max(...all.map((c) => c.spent))).toFixed(3)),
  cells,
  rows: record.rows.map((/** @type {any} */ r) => ({ rowKey: r.rowKey, rowStatus: r.rowStatus, complete: r.complete, calls: r.calls, maxSpentG: Number(g(r.maxSpent)), bound: r.bound,
    sets: recomputed.find((x) => x.rowKey === r.rowKey).sets })),
  inputs: { entries: inputs.length, sha256Lf: sha256(JSON.stringify(inputs)) },
};
writeFileSync(join(ROOT, HERE, 't11-prefixes-table.json'), crlf(JSON.stringify(result, null, 2)), 'utf8');
const md = [
  '# T11: the call prefixes of V4-S3P against the proposed bounded configuration',
  '',
  `From \`${RECORD}\` (budget hell-1 ${budget} units, bound ${bound}); the largest calls recomputed from the same raw journals with the reader's \`callPrefixes\` (${inputs.length} files read).`,
  '',
  '| Cell | rows | valid | complete | calls | affected | potentially affected | ambiguous | max call spent (G) | bound firings |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...cells.map((c) => `| ${c.cell} | ${c.rows} | ${c.valid} | ${c.complete} | ${c.calls} | ${c.affected} | ${c.potentiallyAffected} | ${c.ambiguous} | ${c.maxSpentG.toFixed(3)} | ${c.boundFirings} |`),
  '',
  '| Cell | calls ended / terminated (with an open primitive) | largest ended batch call (G) | largest terminated call (G) | largest set call (G) | set calls ended (results) / terminated | the three largest calls |',
  '|---|---|---|---|---|---|---|',
  ...cells.map((c) => `| ${c.cell} | ${c.ended} / ${c.terminated} (${c.terminatedOpen}) | ${c.maxEndedBatchG} | ${c.maxTerminatedG} | ${c.maxSetG} | ${c.setEnds.ended} (${Object.entries(c.setEnds.results).map(([k, v]) => `${k} ${v}`).join(', ')}) / ${c.setEnds.terminated} | ${c.top.map((t) => `${t.rowKey} ${t.stage} ${t.attempt} ${t.ended ? 'ended' : 'terminated'} ${t.spentG}`).join('; ')} |`),
  '',
  `Largest call over the 20 rows: ${result.maxSpentG} G, so the budget is ${result.headroom} times the largest observed call.`,
].join('\n');
writeFileSync(join(ROOT, HERE, 't11-prefixes-table.md'), crlf(md), 'utf8');
process.stdout.write(`t11-prefixes-table: ${record.rows.length} rows; largest call ${result.maxSpentG} G (budget ${budget / G} G, x${result.headroom}); recomputed maxima equal the record's: ${cells.every((c) => c.recomputedSameMax)}\n`);
for (const c of cells) {
  process.stdout.write(`  ${c.cell}: ${c.valid}/${c.rows} valid, ${c.complete} complete, ${c.calls} calls (${c.ended} ended, ${c.terminated} terminated, ${c.terminatedOpen} of them with an open primitive), affected ${c.affected}, potentially ${c.potentiallyAffected}, ambiguous ${c.ambiguous}, max ${c.maxSpentG} G, bound ${c.boundFirings}; set ends ${JSON.stringify(c.setEnds.results)}, ${c.setEnds.terminated} terminated\n`);
}
