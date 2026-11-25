// @ts-check
// SA-Opus, round 1: the stage-2 report's journal readings from V4-S2's raw journals (read-only, unlocked).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-calls.mjs
// Per arm, cell and row: the calls by stage, the start lines' W against the arm's class value (N-V4-17), the end
// lines' locate.close and locate.c4 by side (N-V4-17), budget stops (N-V4-21), the set attempts' sides (N-V4-16),
// dead-end entries (`p2` phase), the work ledger of T09c (`rowLedger`: lo, hi, open primitives; N-V4-14) and the
// linkage summary of T06a (`linkSummary`). Writes s2-calls.json (per cell and row; per call only the calls where
// bracket close, (c4) or a budget stop acted, `mechanismCalls`) and s2-calls.md beside this script.
import { join } from 'node:path';

import { armShards, arms, callsOf, f, HERE, LINK, med, QUANTITY, rowJournal, screenClass, V, writeCrlf } from './s2-lib.mjs';

/** The class values of the stage-2 arms (variants/fr-*.json; T08), in units; null is no screen (760 M). */
const TABLES = {
  'fr-base': { 'hell-1': null, 'n-small': null, 'n-mid': 190e6, 'n-large': null },
  'fr-screen': { 'hell-1': 380e6, 'n-small': 190e6, 'n-mid': 190e6, 'n-large': 190e6 },
  'fr-none': { 'hell-1': null, 'n-small': null, 'n-mid': null, 'n-large': null },
};
const DEDUCE_WORK = 760e6;
/** @param {string} arm @param {string|null} cls */
function expectedW(arm, cls) {
  const t = TABLES[arm] ?? TABLES['fr-base'];
  const w = cls === null ? null : t[cls] ?? null;
  return typeof w === 'number' && w > 0 && w < DEDUCE_WORK ? w : DEDUCE_WORK;
}

/** @type {any} */
const out = { arms: {} };
const md = ['# V4-S2: journal readings per arm and cell (SA-Opus scratch, round 1)', '',
  'Computed by `s2-calls.mjs` from the raw journals under `tests/artifacts/ig-proto/frozen/V4-S2/<arm>/<shard>/logs/`',
  'with the harness\'s own `parseLines`, `rowLedger` and `deadEnds` (`tools/ig-proto/verdicts.mjs`) and `linkSummary`',
  '(`tools/ig-proto/linkage.mjs`). Work in G units (1e9).', ''];
const t1 = ['| Arm | Cell | calls (set/batch/compl) | ended | W seen (count) | W expected | close by side | c4 by side/kind | budget stops (set/batch) | dead ends | ledger complete | lo G | hi G | open | terminated | lo/acc G | hi/acc G | width/acc G |',
  '|---|---|---|---:|---|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
const t2 = ['| Arm | Cell | locate probes med (batch) | profiles/call med (batch) | window prior->wc med abs diff (batch) | in-band hit share (batch) | rescue re-ratings | rerate phase calls | await s | idle worker s | discards (done/inflight) |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|'];

for (const arm of arms()) {
  out.arms[arm] = {};
  for (const s of armShards(arm)) {
    const area = s.rows[0].run.details.area;
    const level = s.cell.endsWith('hell-1') ? 'hell-1' : 'nightmare';
    const cls = screenClass(level, area);
    const wExp = expectedW(arm, cls);
    const cellOut = { cls, wExpected: wExp, rows: [] };
    /** @type {Record<string, number>} */
    const wSeen = {};
    const stageCount = { set: 0, batch: 0, completion: 0, other: 0 };
    let ended = 0;
    /** @type {Record<string, number>} */
    const close = {};
    /** @type {Record<string, number>} */
    const c4 = {};
    const budget = { set: 0, batch: 0, completion: 0, other: 0, setOk: 0, batchOk: 0 };
    let deadEnds = 0;
    let ledgerComplete = 0;
    let lo = 0;
    let hi = 0;
    let open = 0;
    let terminated = 0;
    let accepted = 0;
    const probes = [];
    const profiles = [];
    const priorGap = [];
    let hits = 0;
    let batchEnded = 0;
    let rescues = 0;
    let rerateCalls = 0;
    let awaitMs = 0;
    let idleMs = 0;
    let discDone = 0;
    let discInflight = 0;
    for (const r of s.rows) {
      const j = rowJournal(arm, s.shard, r.rowKey);
      const calls = callsOf(j.lines ?? []);
      const rowOut = { rowKey: r.rowKey, rep: r.rep, calls: calls.size, mechanismCalls: [], ledger: null, link: null, deadEnds: 0, problems: j.problems };
      for (const [id, c] of calls) {
        const st = c.start?.stage ?? 'other';
        stageCount[st in stageCount ? st : 'other'] += 1;
        if (c.start) wSeen[String(c.start.W)] = (wSeen[String(c.start.W)] ?? 0) + 1;
        const e = c.end;
        if (e) ended += 1;
        const loc = e?.locate ?? null;
        if (loc?.close) close[`${loc.close.side}/${loc.close.kind}`] = (close[`${loc.close.side}/${loc.close.kind}`] ?? 0) + 1;
        if (loc?.c4) c4[`${loc.c4.side}/${loc.c4.kind}`] = (c4[`${loc.c4.side}/${loc.c4.kind}`] ?? 0) + 1;
        if (loc?.budgetStop) {
          budget[st in budget ? st : 'other'] += 1;
          if (e.result === 'ok' && st === 'set') budget.setOk += 1;
          if (e.result === 'ok' && st === 'batch') budget.batchOk += 1;
        }
        if (loc?.rescue?.length) rescues += loc.rescue.length;
        if (c.phases.includes('rerate')) rerateCalls += 1;
        if (st === 'batch' && e) {
          batchEnded += 1;
          probes.push(loc?.probes ?? NaN);
          profiles.push(e.profiles);
          if (loc?.result === 'hit') hits += 1;
          if (typeof loc?.prior === 'number' && typeof loc?.wc === 'number') priorGap.push(Math.abs(loc.wc - loc.prior));
        }
        if (loc?.close || loc?.c4 || loc?.budgetStop) rowOut.mechanismCalls.push({
          id, stage: st, attempt: c.start?.attempt ?? null, W: c.start?.W ?? null, priorCount: c.start?.priorCount ?? null,
          startCount: c.start?.startCount ?? null, K: c.start?.K ?? null, ended: e !== null,
          result: e?.result ?? null, profiles: e?.profiles ?? null, work: e?.work ?? null, rerates: e?.rerates ?? null,
          ms: e?.ms ?? null,
          locate: loc === null ? null : {
            c0: loc.c0, prior: loc.prior, probes: loc.probes, result: loc.result, hit: loc.hit, hiBelow: loc.hiBelow,
            loAbove: loc.loAbove, wc: loc.wc, noWindowProof: loc.noWindowProof, rescue: loc.rescue, close: loc.close ?? null,
            c4: loc.c4 ?? null, budgetStop: loc.budgetStop ?? null, spent: loc.spent ?? null, countWork: loc.countWork,
          },
          primitives: c.begins.length, pLines: c.ps.length,
        });
      }
      const dead = j.lines ? V.deadEnds(j.lines) : null;
      rowOut.deadEnds = dead;
      deadEnds += dead ?? 0;
      const ledger = j.lines ? V.rowLedger(j.lines, j.linkLines) : null;
      if (ledger) {
        rowOut.ledger = { complete: ledger.complete, problems: ledger.problems.slice(0, 8), calls: ledger.calls, ended: ledger.ended,
          terminated: ledger.terminated, open: ledger.open, lo: ledger.lo, hi: ledger.hi, ratingWork: ledger.ratingWork, countWork: ledger.countWork };
        if (ledger.complete) ledgerComplete += 1;
        lo += ledger.lo;
        hi += ledger.hi;
        open += ledger.open;
        terminated += ledger.terminated;
      }
      accepted += r.status === 'valid' ? r.run.acceptedCount : 0;
      if (j.linkLines) {
        const ls = LINK.linkSummary(j.linkLines, 4);
        rowOut.link = { awaitMs: ls.awaitMs, idleWorkerMs: ls.idleWorkerMs, discarded: ls.discarded, consumed: ls.consumed,
          dispatched: ls.dispatched, completed: ls.completed, problems: ls.problems };
        awaitMs += ls.awaitMs ?? 0;
        idleMs += ls.idleWorkerMs ?? 0;
        discDone += ls.discarded?.done ?? 0;
        discInflight += ls.discarded?.inflight ?? 0;
      }
      cellOut.rows.push(rowOut);
    }
    Object.assign(cellOut, { wSeen, stageCount, ended, close, c4, budget, deadEnds, ledgerComplete, lo, hi, open, terminated, accepted,
      loPerAcc: accepted ? lo / accepted : null, hiPerAcc: accepted ? hi / accepted : null,
      widthPerAcc: accepted ? (hi - lo) / accepted : null,
      probesMed: med(probes), profilesMed: med(profiles), priorGapMed: med(priorGap), hitShare: batchEnded ? hits / batchEnded : null,
      rescues, rerateCalls, awaitMs, idleMs, discDone, discInflight });
    out.arms[arm][s.cell] = cellOut;
    const G = 1e9;
    t1.push(`| ${arm} | ${s.cell} | ${stageCount.set}/${stageCount.batch}/${stageCount.completion}${stageCount.other ? `/other ${stageCount.other}` : ''} | ${ended} | ${Object.entries(wSeen).map(([w, n]) => `${(Number(w) / 1e6).toFixed(0)}M (${n})`).join(', ')} | ${(wExp / 1e6).toFixed(0)}M | ${Object.entries(close).map(([k, n]) => `${k} ${n}`).join(', ') || '-'} | ${Object.entries(c4).map(([k, n]) => `${k} ${n}`).join(', ') || '-'} | ${budget.set}/${budget.batch} (ok ${budget.setOk}/${budget.batchOk}) | ${deadEnds} | ${ledgerComplete}/${s.rows.length} | ${f(lo / G, 1)} | ${f(hi / G, 1)} | ${open} | ${terminated} | ${f(cellOut.loPerAcc / G, 2)} | ${f(cellOut.hiPerAcc / G, 2)} | ${f(cellOut.widthPerAcc / G, 2)} |`);
    t2.push(`| ${arm} | ${s.cell} | ${f(cellOut.probesMed, 1)} | ${f(cellOut.profilesMed, 1)} | ${f(cellOut.priorGapMed, 1)} | ${f(cellOut.hitShare, 2)} | ${rescues} | ${rerateCalls} | ${f(awaitMs / 1000, 1)} | ${f(idleMs / 1000, 1)} | ${discDone}/${discInflight} |`);
  }
}
md.push('## Calls, mechanisms, budget stops and the work ledger', '', ...t1, '', '## Locate, linkage', '', ...t2);
writeCrlf(join(HERE, 's2-calls.md'), md.join('\n'));
writeCrlf(join(HERE, 's2-calls.json'), JSON.stringify(out));
process.stdout.write(md.join('\n') + '\n');
