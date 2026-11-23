// @ts-check
// SA-Opus, cross-review round 1: re-checks SA-Astra's record claims against V4-S2's records (read-only, unlocked).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\x1-recheck.mjs
// Independent code (not SA-Astra's scripts): the journals of the seven stage-2 arms, IGP-05's PM1 families, the P-1 parity
// items of V4-S2P. Sections: (1) work rule per pool and its robustness at 20 seeds; (2) the Hell 1 prior fit three ways and
// PM1's windows; (3) successful call work against candidate budget tables, with a tail projection to validation size;
// (4) `require` evidence; (5) per-set transport; (6) linkage idle time; (7) table-prior starts; (8) c4/close profiles.
// Writes x1-recheck.json and x1-recheck.md beside it.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { armShards, f, HERE, LINK, med, ROOT, rowJournal, V, writeCrlf } from './s2-lib.mjs';

const G = 1e9;
const ARMS = ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5'];
const UNCAPPED = new Set(['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps']);
const AREA = { '10x10-nightmare': 100, '12x12-nightmare': 144, '14x14-nightmare': 196, '15x15b10-nightmare': 215,
  '16x16-nightmare': 256, '15x20-nightmare': 300, '26x26-nightmare': 676, '14x14-hell-1': 196, '20x20-hell-1': 400,
  '24x24-hell-1': 576, '26x26-hell-1': 676 };
/** @param {string} p */
const jsonl = (p) => readFileSync(p, 'utf8').trim().split(/\r?\n/).filter((l) => l.length > 0).map((l) => JSON.parse(l));
/** @param {number[]} xs @param {number} q */
const quant = (xs, q) => {
  const v = [...xs].sort((a, b) => a - b);
  if (v.length === 0) return null;
  const i = Math.min(v.length - 1, Math.max(0, Math.ceil(q * v.length) - 1));
  return v[i];
};
const mean = (/** @type {number[]} */ xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (/** @type {number[]} */ xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};

// ---- Load every row and call once.
/** @type {any[]} */
const calls = [];
/** @type {Record<string, Record<string, { rows: any[], ledgers: Record<string, any>, idleMs: number[], awaitMs: number[] }>>} */
const data = {};
let spentChecked = 0;
let spentMismatch = 0;
let timelineProblems = 0;
let timelineRows = 0;
for (const arm of ARMS) {
  data[arm] = {};
  for (const s of armShards(arm)) {
    const d = { rows: s.rows, ledgers: {}, idleMs: [], awaitMs: [] };
    for (const r of s.rows) {
      const j = rowJournal(arm, s.shard, r.rowKey);
      d.ledgers[r.rowKey] = V.rowLedger(j.lines, j.linkLines);
      const ls = LINK.linkSummary(j.linkLines, 4);
      d.idleMs.push(ls.idleWorkerMs ?? 0);
      d.awaitMs.push(ls.awaitMs ?? 0);
      if (LINK.timelineProblem(r.run, j.linkLines)) timelineProblems += 1;
      timelineRows += 1;
      /** @type {Map<string, any[]>} */
      const per = new Map();
      for (const l of j.lines ?? []) {
        if (typeof l.call !== 'string') continue;
        if (!per.has(l.call)) per.set(l.call, []);
        /** @type {any[]} */ (per.get(l.call)).push(l);
      }
      for (const [id, ls2] of per) {
        const start = ls2.find((l) => l.t === 'start') ?? null;
        const end = ls2.find((l) => l.t === 'end') ?? null;
        let lo = 0;
        let last = 0;
        let openPrimitive = false;
        /** @type {Record<string, number>} */
        const phases = {};
        for (const l of ls2) {
          if (l.t === 'begin') {
            openPrimitive = true;
          } else if (l.t === 'p') {
            last = l.tuple[4] + l.tuple[5];
            lo += last;
            phases[l.tuple[0]] = (phases[l.tuple[0]] ?? 0) + 1;
            openPrimitive = false;
          } else if (l.t === 'count') {
            last = l.units;
            lo += last;
            openPrimitive = false;
          }
        }
        if (end?.locate && typeof end.locate.spent === 'number') {
          spentChecked += 1;
          if (end.locate.spent !== lo) spentMismatch += 1;
        }
        calls.push({ arm, cell: s.cell, rowKey: r.rowKey, rep: r.rep, id, stage: start?.stage ?? null, attempt: start?.attempt ?? null,
          result: end ? end.result : 'no-end', lo, beforeFinal: lo - last, priorCount: start?.priorCount, W: start?.W, K: start?.K,
          wc: end?.locate?.wc ?? null, c0: end?.locate?.c0 ?? null, budgetStop: end?.locate?.budgetStop ?? null, phases,
          open: end === null && openPrimitive });
      }
    }
    data[arm][s.cell] = d;
  }
}
/** @type {any} */
const out = { spentChecked, spentMismatch, timelineRows, timelineProblems, calls: calls.length,
  noEnd: calls.filter((c) => c.result === 'no-end').length, noEndOpen: calls.filter((c) => c.open).length };
const md = ['# Cross-review round 1: re-checks of SA-Astra\'s record claims (SA-Opus scratch)', '',
  'Computed by `x1-recheck.mjs` (independent code over the raw journals, IGP-05 and V4-S2P; no SA-Astra script is run).',
  `Call work = the sum of the call's \`p\` units (main + census) and \`count\` units in journal order; it equals the end line's`,
  `\`locate.spent\` on ${spentChecked - spentMismatch} of ${spentChecked} ended calls that carry it. "Before final" = that sum less`,
  'the last primitive: P5 checks `spent >= budget` before every rating and count (`ig-select-v4.js:422-426`), so a budget',
  'B stops an uncapped call iff its before-final work is at least B.', '',
  `Calls: ${out.calls}; without an end line ${out.noEnd}, of which ${out.noEndOpen} end on an open primitive (a \`begin\` without its`,
  `completion). Linkage timelines (T06 \`timelineProblem\`): ${timelineRows - timelineProblems} of ${timelineRows} rows without a problem.`, ''];

// ---- (1) Work rule per pool, and robustness at 20 seeds per cell.
/** @param {string} arm @param {string[]} cells */
const sideRows = (arm, cells) => cells.flatMap((c) => data[arm][c].rows.map((r) => ({ ingested: r, ledger: data[arm][c].ledgers[r.rowKey] })));
const POOLS = {
  '196-215 (14x14, 15x15b10)': ['14x14-nightmare', '15x15b10-nightmare'],
  '196-256 (14x14, 15x15b10, 16x16)': ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare'],
  '216-324 piloted (16x16, 15x20)': ['16x16-nightmare', '15x20-nightmare'],
  '257-324 piloted (15x20)': ['15x20-nightmare'],
  '216-256 (16x16)': ['16x16-nightmare'],
};
md.push('## 1. Work rule per pool (T09c `workRule`, fr-screen against fr-none, G units per accepted puzzle)', '',
  '| Pool | screen lo | screen hi | none lo | none hi | verdict | margin none lo / screen hi |', '|---|---:|---:|---:|---:|---|---:|');
out.pools = {};
for (const [name, cells] of Object.entries(POOLS)) {
  const w = V.workRule(sideRows('fr-screen', cells), sideRows('fr-none', cells));
  out.pools[name] = { screen: [w.screen.loRatio, w.screen.hiRatio], none: [w.noScreen.loRatio, w.noScreen.hiRatio], verdict: w.verdict };
  md.push(`| ${name} | ${f(w.screen.loRatio / G, 6)} | ${f(w.screen.hiRatio / G, 6)} | ${f(w.noScreen.loRatio / G, 6)} | ${f(w.noScreen.hiRatio / G, 6)} | ${w.verdict} | ${f(w.noScreen.loRatio / w.screen.hiRatio, 3)} |`);
}
// Per-row values per cell: screen hi per puzzle and none lo per puzzle (each row has ten puzzles on these cells).
/** @type {Record<string, { hi: number[], lo: number[] }>} */
const perCell = {};
for (const cell of ['14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare', '15x20-nightmare']) {
  perCell[cell] = {
    hi: data['fr-screen'][cell].rows.map((r) => data['fr-screen'][cell].ledgers[r.rowKey].hi / r.run.acceptedCount / G),
    lo: data['fr-none'][cell].rows.map((r) => data['fr-none'][cell].ledgers[r.rowKey].lo / r.run.acceptedCount / G),
  };
}
md.push('', 'Per row (pilot reps 0-4), G per puzzle: screen arm hi, no-screen arm lo.', '',
  '| Cell | screen hi per row | mean / sd | none lo per row | mean / sd |', '|---|---|---:|---|---:|');
for (const [cell, v] of Object.entries(perCell)) {
  md.push(`| ${cell} | ${v.hi.map((x) => f(x, 2)).join(' ')} | ${f(mean(v.hi), 3)} / ${f(sd(v.hi), 3)} | ${v.lo.map((x) => f(x, 2)).join(' ')} | ${f(mean(v.lo), 3)} / ${f(sd(v.lo), 3)} |`);
}
// Normal approximation of the pooled verdict at 20 rows per cell (equal rows, ten puzzles each): the class passes when the
// mean of the screen rows' hi is at most the mean of the no-screen rows' lo; sd inflated x1, x2 and x3 for five-seed tails.
md.push('', 'Pass margin at 20 seeds per cell (normal approximation of the pooled means; z = margin / standard error; the sd of',
  'each cell inflated by k for the thin five-seed tails). Stress "worst row": every validation row of a cell at its worst pilot',
  'row (the screen arm at its highest hi, the no-screen arm at its lowest lo).', '',
  '| Pool | margin G | z (k=1) | z (k=2) | z (k=3) | worst-row screen hi | worst-row none lo | worst-row verdict |', '|---|---:|---:|---:|---:|---:|---:|---|');
out.robust = {};
for (const name of ['196-215 (14x14, 15x15b10)', '196-256 (14x14, 15x15b10, 16x16)']) {
  const cells = POOLS[name];
  const k = cells.length;
  const mHi = mean(cells.map((c) => mean(perCell[c].hi)));
  const mLo = mean(cells.map((c) => mean(perCell[c].lo)));
  const zs = [1, 2, 3].map((infl) => {
    const se = Math.sqrt(cells.reduce((a, c) => a + ((infl * sd(perCell[c].hi)) ** 2 + (infl * sd(perCell[c].lo)) ** 2) / 20, 0)) / k;
    return (mLo - mHi) / se;
  });
  const wHi = mean(cells.map((c) => Math.max(...perCell[c].hi)));
  const wLo = mean(cells.map((c) => Math.min(...perCell[c].lo)));
  out.robust[name] = { margin: mLo - mHi, z: zs, worstHi: wHi, worstLo: wLo };
  md.push(`| ${name} | ${f(mLo - mHi, 3)} | ${f(zs[0], 1)} | ${f(zs[1], 1)} | ${f(zs[2], 1)} | ${f(wHi, 3)} | ${f(wLo, 3)} | ${wHi <= wLo ? 'pass' : 'unknown'} |`);
}

// ---- (2) The Hell 1 prior: pooled accepted median (prior-v1's own rule), median of per-request medians, and PM1's windows.
md.push('', '## 2. Hell 1 prior fits', '',
  'fr-base rows. "Pooled" = the median clue share of all accepted puzzles of the cell (prior-v1\'s rule, `fit-prior.mjs:36-48`);',
  '"per request" = the median of the per-request medians (SA-Astra\'s rule); "wc/K" = SA-Opus round 1 (`s2-prior.json`).', '',
  '| Cell | puzzles | pooled median share | per-request medians | median of them | wc/K (round 1) |', '|---|---:|---:|---|---:|---:|');
const prior2 = JSON.parse(readFileSync(join(HERE, 's2-prior.json'), 'utf8'));
out.hellPrior = {};
for (const cell of ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1']) {
  const rows = data['fr-base'][cell].rows;
  const all = rows.flatMap((r) => r.run.details.puzzles.map((/** @type {any} */ p) => p.clues / r.run.details.K));
  const perReq = rows.map((r) => /** @type {number} */ (med(r.run.details.puzzles.map((/** @type {any} */ p) => p.clues / r.run.details.K))));
  const ours = prior2.refit[`hell-1@${AREA[cell]}`]?.share ?? null;
  out.hellPrior[cell] = { n: all.length, pooled: med(all), perReq, perReqMedian: med(perReq), wcK: ours };
  md.push(`| ${cell} | ${all.length} | ${f(/** @type {number} */ (med(all)), 6)} | ${perReq.map((x) => f(x, 3)).join(' ')} | ${f(/** @type {number} */ (med(perReq)), 6)} | ${ours === null ? '-' : f(ours, 6)} |`);
}
const pm1Dir = join(ROOT, 'docs', 'improve-generating', 'evidence', 'provisional', 'IGP-05');
const fams = [...jsonl(join(pm1Dir, 'families-windows.jsonl')).map((x) => ({ ...x, file: 'windows' })),
  ...jsonl(join(pm1Dir, 'families-failed-sets.jsonl')).map((x) => ({ ...x, file: 'failed-sets' }))].filter((x) => x.level === 'hell-1');
const famKeys = fams.map((x) => `${x.case}|${x.set.seed}|${x.order}`);
const dupFamilies = famKeys.length - new Set(famKeys).size;
md.push('', `PM1 (IGP-05), Hell 1 families: ${fams.length} (${dupFamilies} duplicate case/seed/order keys across the two files).`,
  'Share per family = median of count/K over probes with `eligible` and `inBand`; per seed = median over its families; per area =',
  'median over seeds.', '', '| Area | cases | seeds with an eligible window | per-seed shares | area share |', '|---:|---|---:|---|---:|');
/** @type {Record<number, any[]>} */
const byArea = {};
for (const x of fams) (byArea[x.set.area] ??= []).push(x);
out.pm1 = {};
for (const area of Object.keys(byArea).map(Number).sort((a, b) => a - b)) {
  /** @type {Map<string, number[]>} */
  const bySeed = new Map();
  for (const x of byArea[area]) {
    const el = x.probes.filter((/** @type {any} */ p) => p.eligible === true && p.inBand === true).map((/** @type {any} */ p) => p.count / x.set.K);
    if (el.length === 0) continue;
    if (!bySeed.has(x.set.seed)) bySeed.set(x.set.seed, []);
    /** @type {number[]} */ (bySeed.get(x.set.seed)).push(/** @type {number} */ (med(el)));
  }
  const seedShares = [...bySeed.values()].map((v) => /** @type {number} */ (med(v)));
  const share = seedShares.length ? med(seedShares) : null;
  out.pm1[area] = { cases: [...new Set(byArea[area].map((x) => x.case))], seeds: seedShares.length, seedShares, share };
  md.push(`| ${area} | ${out.pm1[area].cases.join(', ')} | ${seedShares.length} | ${seedShares.map((x) => f(x, 4)).join(' ')} | ${share === null ? '-' : f(share, 6)} |`);
}

// ---- (3) Successful call work against budget tables.
const classOf = (/** @type {string} */ cell) => (cell.endsWith('nightmare') ? 'nightmare' : AREA[cell] <= 215 ? 'hell-1 <=215' : 'hell-1 >=216');
const TABLES = {
  'SA-Astra (8 / 32 / 16 G)': { nightmare: 8, 'hell-1 <=215': 32, 'hell-1 >=216': 16 },
  'SA-Opus round 1 (10 / 40 / 40 G)': { nightmare: 10, 'hell-1 <=215': 40, 'hell-1 >=216': 40 },
  'x1.5 rule per class (10 / 40 / 21 G)': { nightmare: 10, 'hell-1 <=215': 40, 'hell-1 >=216': 21 },
};
const okCalls = calls.filter((c) => UNCAPPED.has(c.arm) && c.result === 'ok');
md.push('', '## 3. Successful calls of the uncapped arms against budget tables', '',
  `${okCalls.length} calls ended \`ok\` in the six uncapped arms. Before-final work in G.`, '',
  '| Class | ok calls | rows | max before-final | max total | q90 | q99 | mean excess over q90 |', '|---|---:|---:|---:|---:|---:|---:|---:|');
out.budget = { classes: {}, tables: {} };
for (const cls of ['nightmare', 'hell-1 <=215', 'hell-1 >=216']) {
  const cs = okCalls.filter((c) => classOf(c.cell) === cls);
  const bf = cs.map((c) => c.beforeFinal / G);
  const q90 = /** @type {number} */ (quant(bf, 0.9));
  const tail = bf.filter((x) => x > q90);
  const s = tail.length ? mean(tail.map((x) => x - q90)) : 0;
  const rowsN = new Set(cs.map((c) => `${c.arm}|${c.rowKey}`)).size;
  out.budget.classes[cls] = { n: cs.length, rows: rowsN, maxBefore: Math.max(...bf), maxTotal: Math.max(...cs.map((c) => c.lo / G)), q90,
    q99: quant(bf, 0.99), tailN: tail.length, s };
  md.push(`| ${cls} | ${cs.length} | ${rowsN} | ${f(Math.max(...bf), 3)} | ${f(Math.max(...cs.map((c) => c.lo / G)), 3)} | ${f(q90, 3)} | ${f(/** @type {number} */ (quant(bf, 0.99)), 3)} | ${f(s, 3)} |`);
}
// Validation-size projection: an exponential tail fitted above q90; requests of the two bounded twins in V4-S4 per class:
// Nightmare 15 cells x 20 x 2, Hell 1 <=215 one board x 20 x 2, Hell 1 >=216 three boards x 20 x 2.
const VAL_REQ = { nightmare: 600, 'hell-1 <=215': 40, 'hell-1 >=216': 120 };
md.push('', 'Per table: pilot ok calls whose before-final work reaches the budget, and the expected number of successful calls',
  'stopped in V4-S4\'s two bounded twins (exponential tail above q90; ok calls per pilot request x requests; an indication).', '',
  '| Table | Nightmare: pilot stops / expected in V4-S4 | Hell 1 <=215 | Hell 1 >=216 |', '|---|---|---|---|');
for (const [name, t] of Object.entries(TABLES)) {
  const cells = ['nightmare', 'hell-1 <=215', 'hell-1 >=216'].map((cls) => {
    const c = out.budget.classes[cls];
    const B = t[cls];
    const pilot = okCalls.filter((x) => classOf(x.cell) === cls && x.beforeFinal >= B * G).length;
    const pTail = c.s > 0 && B > c.q90 ? (c.tailN / c.n) * Math.exp(-(B - c.q90) / c.s) : 1;
    const exp = (c.n / c.rows) * VAL_REQ[cls] * pTail;
    return { cls, B, pilot, expected: exp };
  });
  out.budget.tables[name] = cells;
  md.push(`| ${name} | ${cells.map((c) => `${c.B} G: ${c.pilot} / ${f(c.expected, 2)}`).join(' | ')} |`);
}
const h14 = okCalls.filter((c) => c.arm === 'fr-base' && c.cell === '14x14-hell-1');
const h14b = h14.filter((c) => c.stage === 'batch');
out.budget.h14 = { okCalls: h14.length, okBatch: h14b.length, batchBeforeFinalAtLeast2G: h14b.filter((c) => c.beforeFinal >= 2 * G).length,
  batchTotalAbove2G: h14b.filter((c) => c.lo > 2 * G).length, allBeforeFinalAtLeast2G: h14.filter((c) => c.beforeFinal >= 2 * G).length };
md.push('', `14x14 Hell 1, fr-base: ${h14.length} ok calls (${h14b.length} batch); batch calls with before-final >= 2 G: ` +
  `${out.budget.h14.batchBeforeFinalAtLeast2G}; with total > 2 G: ${out.budget.h14.batchTotalAbove2G}; all ok calls with before-final >= 2 G: ${out.budget.h14.allBeforeFinalAtLeast2G}.`);
md.push('', 'Largest before-final work per arm and Hell 1 cell (ok calls), G:', '');
for (const cell of ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1']) {
  const parts = [...UNCAPPED].map((arm) => {
    const cs = okCalls.filter((c) => c.arm === arm && c.cell === cell);
    return cs.length ? `${arm} ${f(Math.max(...cs.map((c) => c.beforeFinal / G)), 3)} (total ${f(Math.max(...cs.map((c) => c.lo / G)), 3)}, n ${cs.length})` : null;
  }).filter((x) => x !== null);
  md.push(`- ${cell}: ${parts.join('; ')}`);
}

// ---- (4) `require` evidence from V4-S2P.
const P2 = join(ROOT, 'tests', 'artifacts', 'ig-proto', 'frozen', 'V4-S2P');
out.require = {};
md.push('', '## 4. `require` evidence (V4-S2P; every P-1 item runs `uniqueness: \'require\'`: `v4-check.mjs:129`, `lib/lane-worker.mjs` `selectItem`)', '');
for (const arm of ['fr-base', 'fr-p5']) {
  const dir = join(P2, `parity-${arm}`);
  const ends = jsonl(join(dir, 'items.jsonl')).filter((l) => l.type === 'item-end');
  const genFolder = readdirSync(join(dir, 'logs')).find((n) => n.endsWith('_ig-v4_replay_12x12-nightmare_gen'));
  const gdir = join(dir, 'logs', /** @type {string} */ (genFolder));
  const lines = readdirSync(gdir).filter((n) => n.endsWith('.jsonl') && !n.endsWith('.link.jsonl')).flatMap((n) => jsonl(join(gdir, n)));
  const starts = lines.filter((l) => l.t === 'start');
  const gends = lines.filter((l) => l.t === 'end');
  const set = starts.filter((l) => l.stage === 'set').map((l) => l.call);
  const setEnds = gends.filter((l) => set.includes(l.call));
  const items = ends.map((l) => ({ item: l.item.split(':').slice(2).join(':'), outcome: l.result?.outcome, ok: l.result?.ok,
    reason: l.result?.reason, totalWork: l.result?.ledger?.totalWork ?? l.result?.work ?? null, ms: l.ms }));
  out.require[arm] = { setStarts: set.length, batchStarts: starts.filter((l) => l.stage === 'batch').length, ends: gends.length,
    setEnds: setEnds.map((l) => ({ result: l.result, spent: l.locate?.spent, budgetStop: l.locate?.budgetStop ?? null })), items };
  md.push(`- ${arm}: generation (12x12 Nightmare, quantity 2, one worker): ${set.length} set starts, ${out.require[arm].batchStarts} batch starts, ${gends.length} ends;` +
    ` set ends ${setEnds.map((l) => `${l.result}@${f(l.locate?.spent / G, 3)}${l.locate?.budgetStop ? 'S' : ''}`).join(' ')} (S = budget stop).`);
  for (const it of items) md.push(`  - ${it.item}: ${it.outcome}${it.ok === undefined ? '' : ` ok=${it.ok}`}${it.reason ? ` ${it.reason}` : ''}; work ${it.totalWork === null ? '-' : f(it.totalWork / G, 3)} G; ${it.ms} ms`);
}
for (const arm of ['fr-base']) {
  const gdir = join(P2, `parity-${arm}`, 'logs');
  const genFolder = readdirSync(gdir).find((n) => n.endsWith('_ig-v4_replay_12x12-nightmare_gen'));
  const lines = readdirSync(join(gdir, /** @type {string} */ (genFolder))).filter((n) => n.endsWith('.jsonl') && !n.endsWith('.link.jsonl'))
    .flatMap((n) => jsonl(join(gdir, /** @type {string} */ (genFolder), n)));
  const gends = lines.filter((l) => l.t === 'end');
  out.require.fbGenCalls = gends.map((l) => ({ call: l.call, result: l.result, spent: l.locate?.spent }));
  md.push(`- fr-base generation calls (spent, G): ${gends.map((l) => `${l.result}@${f(l.locate?.spent / G, 3)}`).join(' ')}`);
}

// ---- (5) Per-set transport (fr-ps).
md.push('', '## 5. Per-set prior transport (fr-ps)', '');
out.perSet = {};
for (const cell of ['20x20-hell-1', '26x26-hell-1']) {
  const cs = calls.filter((c) => c.arm === 'fr-ps' && c.cell === cell);
  let batch = 0;
  let match = 0;
  for (const rowKey of new Set(cs.map((c) => c.rowKey))) {
    const rc = cs.filter((c) => c.rowKey === rowKey);
    const run = data['fr-ps'][cell].rows.find((r) => r.rowKey === rowKey).run;
    const chosen = rc.find((c) => c.stage === 'set' && c.attempt === run.details?.setAttempt);
    for (const b of rc.filter((c) => c.stage === 'batch')) {
      batch += 1;
      if (chosen && b.priorCount === chosen.wc) match += 1;
    }
  }
  const meanLocate = (/** @type {string} */ arm) => {
    const b = calls.filter((c) => c.arm === arm && c.cell === cell && c.stage === 'batch');
    return mean(b.map((c) => c.phases.locate ?? 0));
  };
  out.perSet[cell] = { batch, match, meanLocateBase: meanLocate('fr-base'), meanLocatePs: meanLocate('fr-ps') };
  md.push(`- ${cell}: ${batch} batch calls (started), priorCount equal to the wc of the set attempt the run records (\`details.setAttempt\`) on ${match}; mean locate profiles per batch call fr-base ${f(meanLocate('fr-base'), 3)}, fr-ps ${f(meanLocate('fr-ps'), 3)}.`);
}

// ---- (6) Linkage: idle worker time while awaiting, per arm and cell (sum over five rows).
md.push('', '## 6. Await idle worker time (T06 `linkSummary`, sum over the five rows of an arm and cell)', '');
const idle = [];
for (const arm of ARMS) for (const [cell, d] of Object.entries(data[arm])) idle.push({ arm, cell, idleS: d.idleMs.reduce((a, b) => a + b, 0) / 1000, awaitS: d.awaitMs.reduce((a, b) => a + b, 0) / 1000 });
out.idle = idle;
md.push(`Idle s per arm and cell: min ${f(Math.min(...idle.map((x) => x.idleS)), 3)}, max ${f(Math.max(...idle.map((x) => x.idleS)), 3)}, median ${f(/** @type {number} */ (med(idle.map((x) => x.idleS))), 3)} over ${idle.length} groups; await s min ${f(Math.min(...idle.map((x) => x.awaitS)), 1)}, max ${f(Math.max(...idle.map((x) => x.awaitS)), 1)}.`);

// ---- (7) Table-prior starts of the Hell 1 set calls (fr-base).
md.push('', '## 7. Table-prior start counts of the Hell 1 set calls (fr-base `start` lines, `priorCount`)', '');
out.starts = {};
for (const cell of ['14x14-hell-1', '20x20-hell-1', '24x24-hell-1', '26x26-hell-1']) {
  const st = calls.filter((c) => c.arm === 'fr-base' && c.cell === cell && c.stage === 'set');
  /** @type {Record<string, number>} */
  const hist = {};
  for (const c of st) hist[String(c.priorCount)] = (hist[String(c.priorCount)] ?? 0) + 1;
  out.starts[cell] = hist;
  md.push(`- ${cell}: ${st.length} set starts; priorCount ${Object.entries(hist).map(([k, v]) => `${k} x${v}`).join(', ')}`);
}

// ---- (8) c4 and close profiles.
md.push('', '## 8. (c4) `below` and bracket-close `close` profiles', '');
out.profiles = {};
for (const [arm, ph] of [['fr-c4', 'below'], ['fr-close', 'close']]) {
  for (const cell of Object.keys(data[arm])) {
    const cs = calls.filter((c) => c.arm === arm && c.cell === cell);
    const ended = cs.filter((c) => c.result !== 'no-end').reduce((a, c) => a + (c.phases[ph] ?? 0), 0);
    const open = cs.filter((c) => c.result === 'no-end').reduce((a, c) => a + (c.phases[ph] ?? 0), 0);
    out.profiles[`${arm} ${cell}`] = { ended, open };
    md.push(`- ${arm} ${cell}: completed \`${ph}\` profiles ${ended + open} (${ended} in ended calls, ${open} in calls without an end)`);
  }
}

// ---- (9) fr-p5's set attempts ended `not-in-band` by a budget stop (N-V4-21 (a)).
const p5Set = calls.filter((c) => c.arm === 'fr-p5' && c.stage === 'set' && c.result === 'not-in-band' && c.budgetStop !== null);
out.p5SetStops = p5Set.map((c) => ({ row: c.rowKey, attempt: c.attempt, spent: c.lo }));
md.push('', '## 9. fr-p5 set attempts ended `not-in-band` by a budget stop', '',
  ...p5Set.map((c) => `- ${c.rowKey} attempt ${c.attempt}: ${f(c.lo / G, 9)} G`));

writeCrlf(join(HERE, 'x1-recheck.json'), JSON.stringify(out, null, 2));
writeCrlf(join(HERE, 'x1-recheck.md'), md.join('\n'));
process.stdout.write(`${md.join('\n')}\n`);
