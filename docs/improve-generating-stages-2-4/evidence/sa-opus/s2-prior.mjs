// @ts-check
// SA-Opus, round 1: P4's readings on V4-S2 (read-only, unlocked): the table prior against the windows the pilots found,
// and the per-set prior (fr-ps against fr-base).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-prior.mjs
// Per cell: K, the table prior of prior-v1 (`round(share x K)`, the start line's priorCount), the window count `wc` and the
// in-band hit of every ended call by stage, the accepted clue share, the locate probes, and the prior share a refit would
// give (the median of wc / K over the ended calls of the arms that start from the table prior). Writes s2-prior.json|md.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { armShards, callsOf, f, HERE, med, ROOT, rowJournal, writeCrlf } from './s2-lib.mjs';

const prior1 = JSON.parse(readFileSync(join(ROOT, 'tools', 'ig-proto', 'data', 'prior-v1.json'), 'utf8')).cells;
/** @type {Record<string, any>} */
const cells = {};
for (const arm of ['fr-base', 'fr-screen', 'fr-none', 'fr-c4', 'fr-close', 'fr-ps', 'fr-p5']) {
  for (const s of armShards(arm)) {
    const level = s.cell.endsWith('hell-1') ? 'hell-1' : 'nightmare';
    const area = s.rows[0].run.details.area;
    const c = cells[s.cell] ?? { level, area, key: `${level}@${area}`, arms: {} };
    cells[s.cell] = c;
    const a = { wcShare: [], wcShareSet: [], wcShareBatch: [], probesBatch: [], probesSet: [], priorCounts: new Set(), Ks: [], accShare: [], hitShare: [], callsBatch: 0, hitsBatch: 0 };
    for (const r of s.rows) {
      a.Ks.push(r.run.details.K);
      for (const p of r.run.details.puzzles ?? []) a.accShare.push(p.clues / r.run.details.K);
      const j = rowJournal(arm, s.shard, r.rowKey);
      for (const call of callsOf(j.lines).values()) {
        if (!call.start || !call.end?.locate) continue;
        const loc = call.end.locate;
        const K = call.start.K;
        a.priorCounts.add(call.start.priorCount);
        if (typeof loc.wc === 'number') {
          a.wcShare.push(loc.wc / K);
          (call.start.stage === 'set' ? a.wcShareSet : a.wcShareBatch).push(loc.wc / K);
        }
        if (call.start.stage === 'batch') {
          a.callsBatch += 1;
          a.probesBatch.push(loc.probes);
          if (loc.result === 'hit') a.hitsBatch += 1;
        } else if (call.start.stage === 'set') {
          a.probesSet.push(loc.probes);
        }
      }
    }
    c.arms[arm] = {
      K: med(a.Ks), priorCounts: [...a.priorCounts], wcShareMed: med(a.wcShare), wcShareSetMed: med(a.wcShareSet), wcShareBatchMed: med(a.wcShareBatch),
      accShareMed: med(a.accShare), probesBatchMed: med(a.probesBatch), probesSetMed: med(a.probesSet), n: a.wcShare.length,
      hitRate: a.callsBatch ? a.hitsBatch / a.callsBatch : null, wcShares: a.wcShare,
    };
  }
}
const md = ['# V4-S2: the count prior (SA-Opus scratch, round 1)', '',
  'Computed by `s2-prior.mjs` from the start and end lines of V4-S2\'s raw journals. `wc` is the window count of a call',
  '(`end.locate.wc`), K its piece count; the refit share is the median of wc / K over the ended calls (set and batch) of the',
  'arms that start every call from the table prior (fr-base, fr-screen, fr-none, fr-c4, fr-close); fr-ps\'s batch calls start',
  'from the calibration\'s wc and fr-p5\'s are cut by its budget, so neither enters the refit.', '',
  '| Cell | prior-v1 key | prior-v1 share (n) | K med | table start (priorCount seen) | wc/K med, set | wc/K med, batch | refit share (n calls) | accepted clue share med | locate probes med, batch: base / ps |',
  '|---|---|---:|---:|---|---:|---:|---:|---:|---|'];
/** @type {Record<string, any>} */
const refit = {};
for (const [cell, c] of Object.entries(cells)) {
  const fit = [];
  const set = [];
  const batch = [];
  const acc = [];
  for (const arm of ['fr-base', 'fr-screen', 'fr-none', 'fr-c4', 'fr-close']) {
    const a = c.arms[arm];
    if (!a) continue;
    fit.push(...a.wcShares);
    if (a.wcShareSetMed !== null) set.push(a.wcShareSetMed);
    if (a.wcShareBatchMed !== null) batch.push(a.wcShareBatchMed);
    acc.push(a.accShareMed);
  }
  const p1 = prior1[c.key];
  const anyArm = c.arms['fr-base'] ?? c.arms['fr-none'] ?? c.arms['fr-screen'];
  const share = med(fit);
  refit[c.key] = { caseId: cell, share: share === null ? null : Math.round(share * 1e6) / 1e6, n: fit.length, priorV1: p1 ?? null };
  md.push(`| ${cell} | ${c.key} | ${p1 ? `${p1.share} (${p1.n})` : 'none'} | ${anyArm?.K ?? '-'} | ${[...new Set(Object.values(c.arms).flatMap((a) => a.priorCounts))].join(', ')} | ${f(med(set), 3)} | ${f(med(batch), 3)} | ${f(share, 3)} (${fit.length}) | ${f(med(acc), 3)} | ${f(c.arms['fr-base']?.probesBatchMed, 1)} / ${f(c.arms['fr-ps']?.probesBatchMed, 1)} |`);
}
writeCrlf(join(HERE, 's2-prior.md'), md.join('\n'));
writeCrlf(join(HERE, 's2-prior.json'), JSON.stringify({ cells: Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, { ...v, arms: Object.fromEntries(Object.entries(v.arms).map(([a, x]) => [a, { ...x, wcShares: undefined }])) }])), refit }, null, 1));
process.stdout.write(md.join('\n') + '\n');
