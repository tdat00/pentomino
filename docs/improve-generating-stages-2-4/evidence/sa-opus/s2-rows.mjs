// @ts-check
// SA-Opus, round 1: the stage-2 report's row tables from V4-S2's published runs (read-only, unlocked).
//   node docs\improve-generating-stages-2-4\evidence\sa-opus\s2-rows.mjs
// Writes s2-rows.json and s2-rows.md beside this script.
import { join } from 'node:path';

import { armShards, arms, CAP_MS, f, geo, HERE, med, QUANTITY, RESPONSE_BOUND_MS, screenClass, V, writeCrlf } from './s2-lib.mjs';

const REPS = [0, 1, 2, 3, 4];
const ARMS = arms();
/** @type {Record<string, Record<string, any[]>>} */
const byArm = {};
/** @type {Record<string, { area: number, K: number[], level: string }>} */
const cellInfo = {};
for (const arm of ARMS) {
  byArm[arm] = {};
  for (const s of armShards(arm)) {
    byArm[arm][s.cell] = s.rows;
    for (const r of s.rows) {
      const d = r.run.details ?? {};
      const info = cellInfo[s.cell] ?? { area: d.area, K: [], level: s.cell.endsWith('hell-1') ? 'hell-1' : 'nightmare' };
      if (typeof d.K === 'number') info.K[r.rep] = d.K;
      cellInfo[s.cell] = info;
    }
  }
}

/** @param {any[]} rows */
function cellStats(rows) {
  const valid = rows.filter((r) => r.status === 'valid');
  const t1 = valid.map((r) => r.run.firstReadyMs).filter((x) => x !== null);
  const t10 = valid.filter((r) => V.reachedTen(r.run, { quantity: QUANTITY })).map((r) => r.run.tenthReadyMs);
  const capped = valid.map((r) => V.cappedT10(r.run, { quantity: QUANTITY, capMs: CAP_MS }));
  const resp = valid.map((r) => r.run.responseMs);
  const batch = valid.filter((r) => V.reachedTen(r.run, { quantity: QUANTITY })).map((r) => r.run.tenthReadyMs - r.run.firstReadyMs);
  const clues = [];
  const shares = [];
  const rowMedClues = [];
  for (const r of valid) {
    const d = r.run.details;
    const cs = (d?.puzzles ?? []).map((/** @type {any} */ p) => p.clues);
    clues.push(...cs);
    shares.push(...cs.map((/** @type {number} */ c) => c / d.K));
    if (cs.length > 0) rowMedClues.push(med(cs));
  }
  const pop = V.population(rows, { quantity: QUANTITY });
  const popCell = Object.values(pop)[0] ?? pop;
  return {
    rows: rows.length,
    statuses: rows.reduce((/** @type {Record<string, number>} */ m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {}),
    reachedTen: valid.filter((r) => V.reachedTen(r.run, { quantity: QUANTITY })).length,
    deadlineViolations: valid.filter((r) => V.deadlineViolation(r.run, { responseBoundMs: RESPONSE_BOUND_MS })).length,
    t1MedS: med(t1) === null ? null : med(t1) / 1000,
    t1MaxS: t1.length ? Math.max(...t1) / 1000 : null,
    t10MedS: med(t10) === null ? null : med(t10) / 1000,
    t10MaxS: t10.length ? Math.max(...t10) / 1000 : null,
    cappedT10MedS: med(capped) / 1000,
    cappedT10GeoS: geo(capped) / 1000,
    respMedS: med(resp) / 1000,
    respMaxS: Math.max(...resp) / 1000,
    batchMedS: med(batch) === null ? null : med(batch) / 1000,
    accepted: valid.reduce((s, r) => s + r.run.acceptedCount, 0),
    setAttempts: valid.map((r) => r.run.details?.setAttempt ?? null),
    partial: valid.filter((r) => r.run.partialReason !== null).map((r) => `${r.rep}:${r.run.partialReason}:${r.run.acceptedCount}`),
    cluesMed: med(clues),
    rowMedClues,
    shareMed: med(shares),
    K: rows.map((r) => r.run.details?.K ?? null),
    scorePosMed: popCell?.scorePosition?.median ?? null,
    censusEstimateShare: popCell?.censusEstimateShare ?? null,
    perRep: rows.map((r) => ({
      rep: r.rep, status: r.status, accepted: r.run.acceptedCount, t1S: r.run.firstReadyMs / 1000,
      t10S: r.run.tenthReadyMs === null ? null : r.run.tenthReadyMs / 1000, respS: r.run.responseMs / 1000,
      partial: r.run.partialReason, setAttempt: r.run.details?.setAttempt ?? null, setKey: r.run.details?.igSetKey ?? null,
      K: r.run.details?.K ?? null,
      clues: (r.run.details?.puzzles ?? []).map((/** @type {any} */ p) => p.clues),
    })),
  };
}

/** @type {any} */
const out = { cells: cellInfo, arms: {}, pairs: [] };
for (const arm of ARMS) {
  out.arms[arm] = {};
  for (const [cell, rows] of Object.entries(byArm[arm])) {
    out.arms[arm][cell] = cellStats(rows);
  }
}

/**
 * One comparison of arm a against arm b on a cell (ratio b over a of the capped T10, per seed).
 * @param {string} a @param {string} b @param {string} cell @param {string} kind
 */
function compare(a, b, cell, kind) {
  const rowsA = byArm[a]?.[cell];
  const rowsB = byArm[b]?.[cell];
  if (!rowsA || !rowsB) return null;
  const paired = V.pairRows(rowsA, rowsB, REPS);
  const ratios = V.ratiosOf(paired.pairs, REPS, { quantity: QUANTITY, capMs: CAP_MS });
  const matched = V.matchedSets(paired.pairs);
  const clue = V.clueRule(matched.matched);
  const perRep = paired.pairs.map((/** @type {any} */ p) => {
    const ka = p.a.run.details?.igPuzzleKeys ?? [];
    const kb = p.b.run.details?.igPuzzleKeys ?? [];
    const n = Math.min(ka.length, kb.length);
    let prefix = 0;
    while (prefix < n && ka[prefix] === kb[prefix]) prefix += 1;
    return {
      rep: p.rep,
      sameSet: p.a.run.details?.igSetKey === p.b.run.details?.igSetKey,
      sameKeys: ka.length === kb.length && prefix === ka.length,
      commonPrefix: prefix,
      acceptedA: p.a.run.acceptedCount,
      acceptedB: p.b.run.acceptedCount,
      t10A: p.a.run.tenthReadyMs, t10B: p.b.run.tenthReadyMs,
      cappedA: V.cappedT10(p.a.run, { quantity: QUANTITY, capMs: CAP_MS }),
      cappedB: V.cappedT10(p.b.run, { quantity: QUANTITY, capMs: CAP_MS }),
      batchA: p.a.run.tenthReadyMs === null ? null : p.a.run.tenthReadyMs - p.a.run.firstReadyMs,
      batchB: p.b.run.tenthReadyMs === null ? null : p.b.run.tenthReadyMs - p.b.run.firstReadyMs,
    };
  });
  const batchRatios = perRep.filter((r) => r.batchA !== null && r.batchB !== null).map((r) => r.batchB / r.batchA);
  return {
    kind, a, b, cell,
    problems: paired.problems,
    ratios,
    geo: geo(/** @type {number[]} */ (ratios.filter((x) => x !== null))),
    batchGeo: geo(batchRatios),
    matched: matched.matched.map((/** @type {any} */ m) => ({ rep: m.rep, a: m.screen, b: m.noScreen, d: m.d })),
    clue,
    perRep,
  };
}

const plan = [];
for (const cell of ['10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare', '16x16-nightmare',
  '15x20-nightmare', '26x26-nightmare', '26x26-hell-1']) plan.push(['fr-screen', 'fr-none', cell, 'S2-2 screen vs none']);
for (const cell of ['26x26-hell-1', '20x20-hell-1']) plan.push(['fr-ps', 'fr-base', cell, 'S2-1 per-set prior vs base']);
for (const cell of ['14x14-nightmare', '26x26-nightmare']) plan.push(['fr-c4', 'fr-base', cell, 'S2-3 (c4) vs base']);
for (const cell of ['12x12-nightmare', '14x14-nightmare', '26x26-hell-1']) plan.push(['fr-close', 'fr-base', cell, 'S2-4 close vs base']);
for (const cell of ['14x14-nightmare', '26x26-hell-1', '20x20-hell-1']) plan.push(['fr-p5', 'fr-base', cell, 'S2-6 P5 vs base']);
for (const cell of ['12x12-nightmare', '26x26-nightmare', '26x26-hell-1']) plan.push(['fr-base', 'fr-none', cell, 'same configuration (noise)']);
plan.push(['fr-base', 'fr-screen', '14x14-nightmare', 'same configuration (noise)']);
for (const [a, b, cell, kind] of plan) {
  const c = compare(a, b, cell, kind);
  if (c !== null) out.pairs.push(c);
}

// Markdown tables.
const md = [];
md.push('# V4-S2: rows per arm and cell (SA-Opus scratch, round 1)', '');
md.push('Computed by `s2-rows.mjs` from the published runs of `docs/improve-generating/evidence/frozen/V4-S2/` with the',
  'harness\'s own `ingestRow`, `reachedTen`, `cappedT10`, `population`, `pairRows`, `ratiosOf`, `matchedSets` and `clueRule`',
  '(`tools/ig-proto/verdicts.mjs`). Times in seconds; capped T10 at 120 s; "ten" = rows that reached ten of 5.', '');
md.push('| Arm | Cell | Class | ten | T1 med | T10 med | T10 max | capped T10 geo | batch med | resp max | >120 s | accepted | clues med | share med | score pos | census est | set attempts | partial |');
md.push('|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|');
for (const arm of ARMS) {
  for (const [cell, s] of Object.entries(out.arms[arm])) {
    const info = cellInfo[cell];
    md.push(`| ${arm} | ${cell} | ${screenClass(info.level, info.area)} | ${s.reachedTen} | ${f(s.t1MedS)} | ${f(s.t10MedS)} | ${f(s.t10MaxS)} | ${f(s.cappedT10GeoS)} | ${f(s.batchMedS)} | ${f(s.respMaxS)} | ${s.deadlineViolations} | ${s.accepted} | ${f(s.cluesMed, 1)} | ${f(s.shareMed, 3)} | ${f(s.scorePosMed, 3)} | ${f(s.censusEstimateShare, 3)} | ${s.setAttempts.join(' ')} | ${s.partial.join('; ') || '-'} |`);
  }
}
md.push('', '## Comparisons (ratio = capped T10 of b over a, per seed; matched sets by `igSetKey`)', '');
md.push('| Kind | a | b | Cell | ratios per rep 0-4 | geo | batch geo | matched | median d (a - b) | moved >= 2 | same set | same keys | problems |');
md.push('|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|---|');
for (const c of out.pairs) {
  md.push(`| ${c.kind} | ${c.a} | ${c.b} | ${c.cell} | ${c.ratios.map((/** @type {number|null} */ r) => f(r)).join(' ')} | ${f(c.geo, 3)} | ${f(c.batchGeo, 3)} | ${c.clue.n} | ${f(c.clue.medianDiff, 2)} | ${c.clue.moved2} | ${c.perRep.map((/** @type {any} */ r) => (r.sameSet ? 'y' : 'n')).join('')} | ${c.perRep.map((/** @type {any} */ r) => (r.sameKeys ? 'y' : `${r.commonPrefix}`)).join(' ')} | ${c.problems.join('; ') || '-'} |`);
}
writeCrlf(join(HERE, 's2-rows.md'), md.join('\n'));
writeCrlf(join(HERE, 's2-rows.json'), JSON.stringify(out, null, 1));
process.stdout.write(md.join('\n') + '\n');
