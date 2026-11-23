// @ts-check
// SA-Opus, round 1: P5's readings on V4-S2 (read-only, unlocked).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-p5.mjs
// 1. N-V4-16: per fr-p5 row, the set attempts 0 to 3 (their calls' end lines and the set-complete link outcomes) and the
//    row's partial reason: a row whose four first attempts all ended without a window on one side but not
//    `set:no-window-<side>` would be a glue defect.
// 2. N-V4-21 (a): the fr-p5 set attempts that ended `not-in-band` by a budget stop with no window side.
// 3. The work of successful calls in the uncapped arms (every fr-* arm but fr-p5), per cell, stage and class: the input of
//    P5's budget table (IG-P-Q10: a call must afford the pattern it needs), with the share a budget B would cut.
// 4. The set stage against the 115-s deadline: igSetMs per cell, and T09d's post-hoc `deadlineProjection` per reserve
//    (labelled: a post-hoc projection, not a live deadline gate).
// Writes s2-p5.json and s2-p5.md beside this script.
import { join } from 'node:path';

import { armShards, callsOf, f, HERE, med, QUANTITY, rowJournal, screenClass, V, writeCrlf } from './s2-lib.mjs';

const G = 1e9;
const md = ['# V4-S2: P5\'s readings (SA-Opus scratch, round 1)', '', 'Computed by `s2-p5.mjs` from the published runs and raw journals of V4-S2.', ''];
/** @type {any} */
const out = {};

// 1 and 2.
md.push('## N-V4-16 and N-V4-21: the set attempts of fr-p5', '',
  '| Row | partial reason | set attempts (attempt: call result / locate.result / noWindowProof / budget stop G / link outcome) |', '|---|---|---|');
out.p5Rows = [];
let budgetSetNoSide = 0;
let noWindowSets = 0;
for (const s of armShards('fr-p5')) {
  for (const r of s.rows) {
    const j = rowJournal('fr-p5', s.shard, r.rowKey);
    const calls = [...callsOf(j.lines).values()].filter((c) => c.start?.stage === 'set');
    const links = (j.linkLines ?? []).filter((/** @type {any} */ l) => l.ev === 'set-complete');
    const parts = [];
    for (const c of calls.sort((a, b) => a.start.attempt - b.start.attempt)) {
      const e = c.end;
      const link = links.find((/** @type {any} */ l) => l.attempt === c.start.attempt);
      const bs = e?.locate?.budgetStop ?? null;
      if (bs && e.result !== 'ok') budgetSetNoSide += 1;
      if (e?.locate?.noWindowProof || e?.result === 'no-window') noWindowSets += 1;
      parts.push(`${c.start.attempt}: ${e ? e.result : 'no end'} / ${e?.locate?.result ?? '-'} / ${e?.locate?.noWindowProof ?? '-'} / ${bs ? f(bs.spent / G, 2) : '-'} / ${link?.outcome ?? '-'}`);
    }
    out.p5Rows.push({ row: r.rowKey, partial: r.run.partialReason, attempts: parts });
    md.push(`| ${r.rowKey} | ${r.run.partialReason ?? '-'} | ${parts.join('; ')} |`);
  }
}
md.push('', `Set attempts of fr-p5 that ended without a result by a budget stop (no window side, never counted by the bound): ${budgetSetNoSide}.`,
  `Set calls of fr-p5 that ended without a window (a no-window proof): ${noWindowSets}.`, '');

// Every set call of every arm: how did set attempts end?
/** @type {Record<string, Record<string, number>>} */
const setEnds = {};
// 3. Successful call work in the uncapped arms.
/** @type {Record<string, { set: number[], batch: number[], all: number[], failed: number[] }>} */
const work = {};
for (const arm of ['fr-base', 'fr-screen', 'fr-none', 'fr-close', 'fr-c4', 'fr-ps', 'fr-p5']) {
  for (const s of armShards(arm)) {
    for (const r of s.rows) {
      const j = rowJournal(arm, s.shard, r.rowKey);
      for (const c of callsOf(j.lines).values()) {
        if (!c.start || !c.end) continue;
        const key = `${arm}`;
        if (c.start.stage === 'set') {
          setEnds[key] = setEnds[key] ?? {};
          const k = `${c.end.result}${c.end.locate?.budgetStop ? '+budget' : ''}`;
          setEnds[key][k] = (setEnds[key][k] ?? 0) + 1;
        }
        if (arm === 'fr-p5') continue;
        const area = r.run.details.area;
        const level = s.cell.endsWith('hell-1') ? 'hell-1' : 'nightmare';
        const wkey = `${arm}|${s.cell}|${screenClass(level, area)}`;
        work[wkey] = work[wkey] ?? { set: [], batch: [], all: [], failed: [] };
        if (c.end.result === 'ok') {
          work[wkey][c.start.stage === 'set' ? 'set' : 'batch'].push(c.end.work);
          work[wkey].all.push(c.end.work);
        } else {
          work[wkey].failed.push(c.end.work);
        }
      }
    }
  }
}
md.push('## How set calls ended, per arm', '', '| Arm | end results of set calls |', '|---|---|');
for (const [arm, m] of Object.entries(setEnds)) md.push(`| ${arm} | ${Object.entries(m).map(([k, n]) => `${k} ${n}`).join(', ')} |`);
out.setEnds = setEnds;

/** @param {number[]} xs @param {number} q */
const quant = (xs, q) => {
  const v = xs.slice().sort((a, b) => a - b);
  return v.length === 0 ? null : v[Math.min(v.length - 1, Math.ceil(q * v.length) - 1)];
};
const BUDGETS = [2, 4, 6, 8, 10, 15, 20, 30];
md.push('', '## Work of the ended calls in the uncapped arms (G units)', '',
  'Successful calls (result `ok`) by stage, and the share of successful calls whose work exceeds a budget B (such a call is',
  'cut; in `any` mode a cut call still returns its best waiting in-band candidate, so a cut is a completion at risk, not',
  'certainly lost). Failed ended calls are listed apart (their work is spent whatever the budget, up to B).', '',
  `| Arm | Cell | Class | ok calls | p50 | p90 | p95 | max | failed calls | failed max | ${BUDGETS.map((b) => `> ${b} G`).join(' | ')} |`,
  `|---|---|---|---:|---:|---:|---:|---:|---:|---:|${BUDGETS.map(() => '---:').join('|')}|`);
out.work = {};
/** @type {Record<string, number[]>} */
const pooled = {};
for (const [k, w] of Object.entries(work)) {
  const [arm, cell, cls] = k.split('|');
  const all = w.all;
  out.work[k] = { n: all.length, p50: quant(all, 0.5), p90: quant(all, 0.9), p95: quant(all, 0.95), max: quant(all, 1), failed: w.failed.length, failedMax: quant(w.failed, 1) };
  md.push(`| ${arm} | ${cell} | ${cls} | ${all.length} | ${f(quant(all, 0.5) / G)} | ${f(quant(all, 0.9) / G)} | ${f(quant(all, 0.95) / G)} | ${f(quant(all, 1) / G)} | ${w.failed.length} | ${f((quant(w.failed, 1) ?? NaN) / G)} | ${BUDGETS.map((b) => f(all.filter((x) => x > b * G).length / all.length, 2)).join(' | ')} |`);
  const pk = `${cell}`;
  pooled[pk] = (pooled[pk] ?? []).concat(all);
}
md.push('', '### Pooled over the uncapped arms, per cell', '', `| Cell | ok calls | p50 | p95 | p99 | max | ${BUDGETS.map((b) => `> ${b} G`).join(' | ')} |`, `|---|---:|---:|---:|---:|---:|${BUDGETS.map(() => '---:').join('|')}|`);
out.pooled = {};
for (const [cell, all] of Object.entries(pooled)) {
  out.pooled[cell] = { n: all.length, p50: quant(all, 0.5), p95: quant(all, 0.95), p99: quant(all, 0.99), max: quant(all, 1) };
  md.push(`| ${cell} | ${all.length} | ${f(quant(all, 0.5) / G)} | ${f(quant(all, 0.95) / G)} | ${f(quant(all, 0.99) / G)} | ${f(quant(all, 1) / G)} | ${BUDGETS.map((b) => f(all.filter((x) => x > b * G).length / all.length, 3)).join(' | ')} |`);
}

// 4. The set stage and the post-hoc projection.
const RESERVES = [0.3, 0.4, 0.5, 0.6, 0.7];
md.push('', '## The set stage against the 115-s deadline (post-hoc projection; not a live deadline gate)', '',
  'T09d\'s `deadlineProjection` per arm, cell and reserve r (the set stage is cut when `igSetMs > (1 - r) x 115 s`; served =',
  'puzzles accepted by 115 s; lost = reached ten in the record but not within the deadline). Set max = the largest `igSetMs`.', '',
  `| Arm | Cell | set med s | set max s | set max / 115 s | reached ten | ${RESERVES.map((r) => `r ${r}: cut/lost/completed`).join(' | ')} |`,
  `|---|---|---:|---:|---:|---:|${RESERVES.map(() => '---').join('|')}|`);
out.projection = {};
for (const arm of ['fr-base', 'fr-screen', 'fr-none', 'fr-ps', 'fr-p5', 'fr-c4', 'fr-close']) {
  for (const s of armShards(arm)) {
    const sets = s.rows.map((r) => r.run.igSetMs).filter((x) => typeof x === 'number');
    const ten = s.rows.filter((r) => r.status === 'valid' && V.reachedTen(r.run, { quantity: QUANTITY })).length;
    const cells = [];
    for (const reserve of RESERVES) {
      const p = V.deadlineProjection(s.rows, { reserve, quantity: QUANTITY });
      const cut = p.rows.filter((/** @type {any} */ x) => x.setCut).length;
      const lost = p.rows.filter((/** @type {any} */ x) => x.lost).length;
      const completed = p.rows.filter((/** @type {any} */ x) => x.completed).length;
      cells.push(`${cut}/${lost}/${completed}`);
      out.projection[`${arm}|${s.cell}|${reserve}`] = { cut, lost, completed };
    }
    md.push(`| ${arm} | ${s.cell} | ${f(med(sets) / 1000, 1)} | ${f(Math.max(...sets) / 1000, 1)} | ${f(Math.max(...sets) / 115000, 3)} | ${ten} | ${cells.join(' | ')} |`);
  }
}
writeCrlf(join(HERE, 's2-p5.md'), md.join('\n'));
writeCrlf(join(HERE, 's2-p5.json'), JSON.stringify(out, null, 1));
process.stdout.write(md.join('\n') + '\n');
