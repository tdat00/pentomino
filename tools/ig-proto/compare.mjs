// @ts-check
// Paired comparison of two arms on matched seeds (IGP-01 §4; check-list §3 "Statistics", §5 rows).
//   node tools\ig-proto\compare.mjs --task <T> --pairs <before>:<after>[,...] --label <L> [--reference mp12b1]
//        [--pm4 <task>] [--pm1 <task>] [--source-label <SL>] [--out-dir <scratch folder>]
// It reads the published runs and call journals of the arms (arm.mjs publish) and MP12b1's reports. Every "after"
// value is Measured and provisional; every ratio is Derived. `--out-dir` writes the records to a scratch folder
// (tests of the script only).
// An arm is `<arm>` (of --task) or `<task>/<arm>`; only matched seeds are paired. With a task-qualified arm the
// script runs as a study (IGP-03): it adds the per-W, population, split (R33), shift, offset, 26x26 Master and
// arity-3 sections, reads IGP-02's PM4 record from --pm4, and checks the journals of the no-screen arm.
// IGP-03h adds two report-only sections to a study: an arm-only section for each cell of the task's own arms that no
// headline cell covers (no before partner: request outcomes, accepted puzzles, locate probes and the first in-band
// profile per call, MP12b1's outcome and, with --pm1 <task>, PM1's windows), and the screen against no screen by seed
// over every arm of the roles w760 and main (arms of different tasks are paired by seed and role, never by tree id; a
// seed that two arms of one role ran must give equal puzzles, else the run fails).
// With an arm whose variant adds P6 or eight workers (IGP-04) the script runs as a factor study instead: the paired
// factors of T10, T1, the batch and the response per pair and cell, the identity of each pair, P6's work saving from the
// call journals, the first-phase Projection, both memory criteria and the reproduction of IGP-01's after arm.
//   node tools\ig-proto\compare.mjs --task <T> --reproduce <arm>:IGP-01/after --label <L> [--common-seeds]
//   (exit 1 when the puzzles differ; --common-seeds compares only the seeds that both arms ran)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { median, percentile, summarize } from '../bench/report.js';
import { comparePair } from './identity.mjs';
import { abs, artifactDir, evidenceDir, MP12B1_DIGEST, mp12b1Report, parseArgs, treeDir } from './lib/paths.mjs';
import { banner, buildMeta, worktreeDigest, writeJson, writeText } from './lib/records.mjs';

/** The analysts' P1 to P5 scenario rows at four workers (check-list §5; Projections), with today's report values. */
const HEADLINE = Object.freeze([
  { id: '14x14-nightmare', label: '14x14 Nightmare', rows: 'R01 R02 R03 R10 R29', opus: '17.7 s', astra: '16.0 s' },
  { id: '15x15b10-nightmare', label: '15x15b10 Nightmare', rows: 'R03 R04', opus: '13.8 s', astra: '13.7 s' },
  { id: '12x12-nightmare', label: '12x12 Nightmare', rows: 'R03 R05 R29', opus: 'about 39-48 s', astra: '44.5 s' },
  { id: '26x26-nightmare', label: '26x26 Nightmare', rows: 'R06 R29', opus: '15.5 s', astra: '17.8 s' },
  { id: '14x14-master', label: '14x14 Master', rows: 'R07', opus: 'unchanged (today 2.57 s)', astra: 'unchanged' },
  { id: '26x26-master', label: '26x26 Master', rows: 'R07', opus: 'unchanged (today 8.36 s)', astra: 'unchanged' },
  { id: '26x26-hell-1', label: 'Hell 1 26x26', rows: 'R08', opus: 'about 28 s (if a window holds)', astra: '50-60 s (if a window holds)' },
]);
const RERATE_PHASES = new Set(['rescue', 'rerate', 'repair']);
const PROTO_WINDOW_PHASES = new Set(['window', 'p2', 'beam', 'rerate']);
const STAGES = Object.freeze(['set', 'batch', 'completion', 'other']);

/** @param {any[]} values @returns {number[]} */
const num = (values) => values.filter((x) => typeof x === 'number' && Number.isFinite(x));
/** @param {number[]} v */
const sum = (v) => v.reduce((s, x) => s + x, 0);
/** @param {number[]} v @returns {number | null} */
const mean = (v) => (v.length === 0 ? null : sum(v) / v.length);
/** @param {number[]} v */
const stat = (v) => ({ n: v.length, median: median(v), p90: percentile(v, 0.9), max: v.length === 0 ? null : Math.max(...v) });
/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
const fix = (x, d = 2) => (x === null || x === undefined ? '-' : x.toFixed(d));
/** @param {number | null | undefined} ms @returns {string} */
const sec = (ms) => (ms === null || ms === undefined ? '-' : (ms / 1000).toFixed(2));
/** @param {number | null} a @param {number | null} b @returns {number | null} */
const div = (a, b) => (a === null || b === null || b === 0 ? null : a / b);
/** @param {Record<string, number>} tally @returns {string} */
const tallyText = (tally) => Object.entries(tally).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k} ${v}`).join(', ') || '-';

/** @param {string} file @returns {any[]} */
function readJsonl(file) {
  return readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
}

/**
 * Calls assembled from journal lines: start, phase entries, tuples and end (null: unfinished).
 * @param {any[]} lines
 * @returns {any[]}
 */
export function assembleCalls(lines) {
  /** @type {Map<string, any>} */
  const map = new Map();
  for (const l of lines) {
    if (l.t === 'row') {
      continue;
    }
    let c = map.get(l.call);
    if (c === undefined) {
      c = { id: l.call, row: String(l.call).split(':')[0], stage: 'other', start: null, phases: [], tuples: [], end: null };
      map.set(l.call, c);
    }
    if (l.t === 'start') {
      c.start = l;
      c.stage = l.stage;
    } else if (l.t === 'phase') {
      c.phases.push(l.phase);
    } else if (l.t === 'p') {
      const t = l.tuple;
      c.tuples.push({ phase: t[0], count: t[1], outcome: t[2], score: t[3], work: t[4] + t[5], ms: t[12], flags: t[13] });
    } else if (l.t === 'end') {
      c.end = l;
    }
  }
  return [...map.values()];
}

/**
 * @param {string} label
 * @param {string} task
 * @param {string} arm
 * @returns {{ arm: string, variant: string, rows: any[], byRow: Map<string, any[]>, lines: number, source: string[] }}
 */
export function loadArm(label, task, arm) {
  const dir = evidenceDir(label, task, arm);
  if (!existsSync(dir)) {
    throw new Error(`arm ${arm} of ${task} is not published: run arm.mjs publish first`);
  }
  /** @type {any[]} */
  const rows = [];
  /** @type {any[]} */
  const lines = [];
  /** @type {string[]} */
  const source = [];
  let variant = arm;
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.runs.json')).sort()) {
    const record = JSON.parse(readFileSync(join(dir, name), 'utf8'));
    variant = Object.keys(record.meta.trees)[0] ?? variant;
    rows.push(...record.rows.map((/** @type {any} */ r) => ({ ...r, shard: record.shard })));
    const full = join(dir, `${record.shard}.calls.jsonl`);
    const logs = join(artifactDir(label, task, arm, record.shard), 'logs');
    if (existsSync(full)) {
      lines.push(...readJsonl(full));
      source.push(`${record.shard}: published journal`);
    } else if (existsSync(logs)) {
      for (const n of readdirSync(logs).sort()) {
        lines.push(...readJsonl(join(logs, n)).map((/** @type {any} */ l) => {
          const { accepted, ...rest } = l;
          return rest;
        }));
      }
      source.push(`${record.shard}: raw logs (the published journal is above 5 MB or absent)`);
    } else {
      source.push(`${record.shard}: no journal`);
    }
  }
  /** @type {Map<string, any[]>} */
  const byRow = new Map();
  for (const call of assembleCalls(lines)) {
    byRow.set(call.row, [...(byRow.get(call.row) ?? []), call]);
  }
  return { arm, variant, rows, byRow, lines: lines.length, source };
}

/** @param {any} row @returns {boolean} A row cut at the child limit R (its times are the limit, never a measurement). */
const isCensored = (row) => row.run.errors?.some((/** @type {{ code: string }} */ e) => e.code === 'child-timeout') === true;
/** @param {any} row @returns {boolean} */
const reachedTen = (row) => !isCensored(row) && row.run.tenthReadyMs !== null && row.run.tenthReadyMs !== undefined;

/**
 * @param {any[]} calls
 * @returns {Record<string, any>} Per stage: calls, ok, no-window, unfinished, profiles, outcomes, ms, work.
 */
function stageStats(calls) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const stage of STAGES) {
    const list = calls.filter((c) => c.stage === stage);
    if (list.length === 0) {
      continue;
    }
    const finished = list.filter((c) => c.end !== null);
    const probes = (/** @type {any} */ c) => c.tuples.filter((/** @type {any} */ t) => !RERATE_PHASES.has(t.phase)).length;
    /** @type {Record<string, number>} */
    const outcomes = {};
    for (const t of list.flatMap((c) => c.tuples)) {
      outcomes[t.outcome] = (outcomes[t.outcome] ?? 0) + 1;
    }
    out[stage] = {
      calls: list.length,
      ok: finished.filter((c) => c.end.result === 'ok').length,
      noWindow: finished.filter((c) => c.end.result === 'no-window').length,
      unfinished: list.length - finished.length,
      unfinishedProfiles: sum(list.filter((c) => c.end === null).map(probes)),
      profiles: stat(finished.map(probes)),
      outcomes,
      ms: stat(num(finished.map((c) => c.end.ms))),
      work: stat(num(finished.map((c) => c.end.work))),
    };
  }
  return out;
}

/** @param {any[]} calls @returns {Record<string, any>} The dead-end entries and their share of the profile time. */
function deadEnd(calls) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const [name, stages] of [['batch', ['batch']], ['set', ['set']], ['both', ['batch', 'set']]]) {
    const list = calls.filter((c) => stages.includes(c.stage));
    const tuples = list.flatMap((c) => c.tuples);
    const p2ms = sum(num(tuples.filter((t) => t.phase === 'p2').map((t) => t.ms)));
    const allMs = sum(num(tuples.map((t) => t.ms)));
    const entered = list.filter((c) => c.phases.includes('p2')).length;
    out[name] = {
      calls: list.length, callsWithP2: entered, callShare: div(entered, list.length), p2Tuples: tuples.filter((t) => t.phase === 'p2').length,
      p2Ms: Math.round(p2ms), allMs: Math.round(allMs), timeShare: div(p2ms, allMs),
    };
  }
  return out;
}

/** @param {any[]} calls @returns {{ tuples: number, capped: number, share: number | null, calls: number }} Today's start count. */
function startCountCapped(calls) {
  let tuples = 0;
  let capped = 0;
  let n = 0;
  for (const c of calls) {
    if (c.start === null) {
      continue;
    }
    const at = c.tuples.filter((/** @type {any} */ t) => t.phase === 'p1' && t.count === c.start.startCount);
    if (at.length > 0) {
      n += 1;
    }
    tuples += at.length;
    capped += at.filter((/** @type {any} */ t) => t.outcome === 'capped').length;
  }
  return { tuples, capped, share: div(capped, tuples), calls: n };
}

/** @param {any[]} calls @returns {Record<string, any>} Locate results and proofs of the prototype's finished calls. */
function locateStats(calls) {
  const located = calls.filter((c) => c.end?.locate !== undefined && c.end.locate !== null);
  /** @type {Record<string, number>} */
  const results = {};
  /** @type {Record<string, number>} */
  const proofs = {};
  /** @type {Record<string, number>} */
  const rescueSides = {};
  let rescued = 0;
  for (const c of located) {
    const l = c.end.locate;
    results[l.result ?? 'final'] = (results[l.result ?? 'final'] ?? 0) + 1;
    const proof = l.noWindowProof ?? 'direct';
    proofs[proof] = (proofs[proof] ?? 0) + 1;
    if (l.rescue.length > 0) {
      rescued += 1;
    }
    for (const r of l.rescue) {
      rescueSides[`${r.side}${r.kind === 'too-few' ? ' (capped)' : ''}`] = (rescueSides[`${r.side}${r.kind === 'too-few' ? ' (capped)' : ''}`] ?? 0) + 1;
    }
  }
  return {
    calls: located.length, results, proofs, callsWithRescue: rescued, rescueSides, probes: stat(located.map((c) => c.end.locate.probes)),
    heuristicEnds: proofs.heuristic ?? 0,
  };
}

/**
 * Everything one arm gives for one case.
 * @param {any[]} rows
 * @param {Map<string, any[]>} byRow
 * @returns {Record<string, any>}
 */
function armCell(rows, byRow) {
  const calls = rows.flatMap((r) => byRow.get(r.rowKey) ?? []);
  const timed = rows.filter((r) => !isCensored(r));
  const ten = rows.filter(reachedTen);
  const proto = calls.some((c) => c.tuples.some((/** @type {any} */ t) => t.phase === 'locate'));
  const okCalls = calls.filter((c) => c.end?.result === 'ok');
  const windowProfiles = (/** @type {any} */ c) => (proto ? c.tuples.filter((/** @type {any} */ t) => PROTO_WINDOW_PHASES.has(t.phase)).length : c.tuples.length);
  const rerates = calls.filter((c) => c.end !== null).map((c) => c.tuples.filter((/** @type {any} */ t) => t.phase === 'rescue' || t.phase === 'rerate'));
  const allTuples = calls.flatMap((c) => c.tuples);
  const rerateTuples = rerates.flat();
  const perRequest = rows.map((r) => {
    const mine = byRow.get(r.rowKey) ?? [];
    const work = (/** @type {any} */ c) => (c.end === null ? sum(c.tuples.map((/** @type {any} */ t) => t.work)) : c.end.work);
    const main = mine.filter((c) => c.stage !== 'set');
    return {
      accepted: r.run.acceptedCount,
      withoutSet: sum(main.map(work)), withSet: sum(mine.map(work)),
      unfinished: mine.filter((c) => c.end === null).length,
      okBatchMs: num(mine.filter((c) => c.stage === 'batch' && c.end?.result === 'ok').map((c) => c.end.ms)),
      t1: r.run.firstReadyMs, t10: r.run.tenthReadyMs, reached: reachedTen(r),
    };
  });
  const waves = perRequest.filter((p) => p.reached && p.t1 !== null && p.okBatchMs.length > 0).map((p) => (p.t10 - p.t1) / /** @type {number} */ (median(p.okBatchMs)));
  return {
    requests: rows.length,
    reached: ten.length,
    censored: rows.length - timed.length,
    t1: summarize(num(timed.map((r) => r.run.firstReadyMs))),
    t10: summarize(num(ten.map((r) => r.run.tenthReadyMs))),
    response: summarize(num(timed.map((r) => r.run.responseMs))),
    accepted: rows.map((r) => r.run.acceptedCount),
    journal: { calls: calls.length, finished: calls.filter((c) => c.end !== null).length },
    stages: stageStats(calls),
    deadEnd: deadEnd(calls),
    startCountCapped: startCountCapped(calls),
    locate: proto ? locateStats(calls) : null,
    windowProfiles: { basis: proto ? 'phases window, p2, beam, rerate' : 'all tuples of the call', okCalls: okCalls.length, ...stat(okCalls.map(windowProfiles)), mean: mean(okCalls.map(windowProfiles)) },
    rerates: proto ? {
      callsFinished: rerates.length, perCallMean: mean(rerates.map((r) => r.length)), perCallMax: rerates.length === 0 ? null : Math.max(...rerates.map((r) => r.length)),
      msShare: div(sum(num(rerateTuples.map((t) => t.ms))), sum(num(allTuples.map((t) => t.ms)))),
      workShare: div(sum(rerateTuples.map((t) => t.work)), sum(allTuples.map((t) => t.work))),
    } : null,
    workPerAccepted: {
      withoutSet: stat(perRequest.filter((p) => p.accepted > 0).map((p) => p.withoutSet / p.accepted)),
      withSet: stat(perRequest.filter((p) => p.accepted > 0).map((p) => p.withSet / p.accepted)),
      requestsWithUnfinishedCalls: perRequest.filter((p) => p.unfinished > 0).length,
      unfinishedCalls: sum(perRequest.map((p) => p.unfinished)),
    },
    waves: stat(waves),
    setShare: stat(perRequest.filter((p) => p.reached && p.t1 !== null).map((p) => p.t1 / p.t10)),
  };
}

/** @param {number[]} ratios */
const ratioStat = (ratios) => ({ n: ratios.length, median: median(ratios), min: ratios.length === 0 ? null : Math.min(...ratios), max: ratios.length === 0 ? null : Math.max(...ratios) });

/**
 * @param {any[]} before
 * @param {any[]} after
 * @returns {Record<string, any>} The matched cohort: seeds present in both arms.
 */
function pairedCell(before, after) {
  const seeds = before.filter((b) => after.some((a) => a.seed === b.seed)).map((b) => b.seed);
  const t10Ratios = [];
  const responseRatios = [];
  /** @type {string[]} */
  const fewerPuzzles = [];
  for (const seed of seeds) {
    const b = before.find((r) => r.seed === seed);
    const a = after.find((r) => r.seed === seed);
    if (a.run.acceptedCount < b.run.acceptedCount) {
      fewerPuzzles.push(`${seed}: ${a.run.acceptedCount} < ${b.run.acceptedCount}`);
    }
    if (reachedTen(b) && reachedTen(a)) {
      t10Ratios.push(b.run.tenthReadyMs / a.run.tenthReadyMs);
    }
    if (!isCensored(b) && !isCensored(a)) {
      responseRatios.push(b.run.responseMs / a.run.responseMs);
    }
  }
  return {
    seeds, t10Ratio: ratioStat(t10Ratios), responseRatio: ratioStat(responseRatios), fewerPuzzles,
    completion: { before: before.filter((r) => seeds.includes(r.seed) && reachedTen(r)).length, after: after.filter((r) => seeds.includes(r.seed) && reachedTen(r)).length, of: seeds.length },
  };
}

/**
 * MP12b1 on the cell: the whole report (today) and the matched seeds.
 * @param {string} caseId
 * @param {string[]} seeds
 */
function mp12Cell(caseId, seeds) {
  const found = mp12b1Report(caseId);
  if (found === null) {
    return null;
  }
  const runs = found.report.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation');
  const matched = runs.filter((/** @type {any} */ r) => seeds.includes(r.seed));
  const ten = (/** @type {any[]} */ list) => num(list.map((r) => r.tenthReadyMs));
  return {
    report: found.path,
    all: { requests: runs.length, reached: ten(runs).length, t10: summarize(ten(runs)), response: summarize(num(runs.map((/** @type {any} */ r) => r.responseMs))) },
    matched: {
      requests: matched.length, reached: ten(matched).length, t1: summarize(num(matched.map((/** @type {any} */ r) => r.firstReadyMs))),
      t10: summarize(ten(matched)), response: summarize(num(matched.map((/** @type {any} */ r) => r.responseMs))),
    },
    runs: matched,
  };
}

/** @param {any} s @returns {string} */
const t10Text = (s) => `${sec(s.t10.median)} / ${sec(s.t10.p95)} (ten of ${s.requests})`;
/** @param {any} r @returns {string} */
const ratioText = (r) => (r.n === 0 ? '-' : `${fix(r.median)} [${fix(r.min)}-${fix(r.max)}] n ${r.n}`);

// The study sections (IGP-03): per-W table, population (R32), split (R33), shifts, offsets, 26x26 Master and arity 3.

const SCREEN_OUTCOMES = new Set(['scap0', 'scap1', 'over']);
const IN_BAND = new Set(['in', 'central']);
const BUCKETS = Object.freeze(['<0', '0', '1', '2', '3', '4', '>4']);
const NO_SCREEN_W = 760000000;
/** The role of an arm, by its variant. */
const ROLE_OF_VARIANT = Object.freeze(/** @type {Record<string, string>} */ ({
  log: 'before', 'p1p5-main': 'main', 'p1p5-w095': 'w095', 'p1p5-w380': 'w380', 'p1p5-w760': 'w760', 'p1p5-main-a3': 'a3',
}));
const ROLES = Object.freeze(['before', 'w095', 'main', 'w380', 'w760', 'a3']);
const W_ROLES = Object.freeze(['before', 'w095', 'main', 'w380', 'w760']);
/** The W (units) each variant's journals must show on every start line (checked; main and a3 differ by level). */
const EXPECTED_W = Object.freeze(/** @type {Record<string, number>} */ ({ w095: 95000000, w380: 380000000, w760: NO_SCREEN_W }));

/** @param {number} o @returns {string} The offset bucket of PM4 (`<0`, `0` to `4`, `>4`). */
const bucketOf = (o) => (o < 0 ? '<0' : o > 4 ? '>4' : String(o));
/** @param {number[]} v */
const dist = (v) => ({
  n: v.length, min: v.length === 0 ? null : Math.min(...v), p10: percentile(v, 0.1), p25: percentile(v, 0.25), median: median(v),
  p75: percentile(v, 0.75), p90: percentile(v, 0.9), max: v.length === 0 ? null : Math.max(...v),
});
/** @param {number[]} v @returns {number | null} */
const geoMean = (v) => (v.length === 0 ? null : Math.exp(sum(v.map((x) => Math.log(x))) / v.length));
/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
const pct = (x, d = 0) => (x === null || x === undefined ? '-' : `${(100 * x).toFixed(d)} %`);
/** @param {number | null | undefined} x @returns {string} Work in M units. */
const mUnits = (x) => (x === null || x === undefined ? '-' : (x / 1e6).toFixed(1));
/** @param {any} s @param {number} [d] @returns {string} p10 / median / p90 of a `dist`. */
const p10p90 = (s, d = 3) => `${fix(s.p10, d)} / ${fix(s.median, d)} / ${fix(s.p90, d)}`;

/**
 * One request of an arm: its row, set, accepted clue counts and calls.
 * @param {any} row
 * @param {Map<string, any[]>} byRow
 */
function requestInfo(row, byRow) {
  const calls = byRow.get(row.rowKey) ?? [];
  const d = row.run.details ?? {};
  const K = typeof d.K === 'number' ? d.K : null;
  const puzzles = Array.isArray(d.puzzles) ? d.puzzles : [];
  return {
    seed: row.seed, row, calls, K, puzzles, clues: puzzles.map((/** @type {any} */ p) => p.clues), accepted: row.run.acceptedCount,
    startCount: calls.find((c) => c.start !== null && c.start.K === K)?.start.startCount ?? null,
    setAttempt: d.setAttempt ?? null, setKey: d.igSetKey ?? null,
  };
}

/**
 * @param {{ clues: number, K: number, U: number, score: number }[]} list
 * @param {{ min: number, max: number } | null} band
 */
function population(list, band) {
  const width = band === null ? null : band.max - band.min;
  return {
    puzzles: list.length, share: dist(list.map((p) => p.clues / p.K)), clues: dist(list.map((p) => p.clues)), K: dist(list.map((p) => p.K)),
    U: dist(num(list.map((p) => p.U))), score: dist(list.map((p) => p.score)),
    position: dist(band === null ? [] : list.map((p) => (p.score - band.min) / /** @type {number} */ (width))),
    centralShare: band === null ? null : div(list.filter((p) => Math.abs(p.score - (band.min + band.max) / 2) <= /** @type {number} */ (width) / 4).length, list.length),
  };
}

/** @param {any[]} runs @returns {{ clues: number, K: number, U: number, score: number }[]} */
const puzzlesOfRuns = (runs) => runs.flatMap((run) => (run.details?.puzzles ?? []).map((/** @type {any} */ p) => (
  { clues: p.clues, K: run.details.K, U: p.U, score: p.score })));

/**
 * Everything one arm gives for one case on the cohort seeds.
 * @param {any} arm
 * @param {string} caseId
 * @param {string[]} seeds
 */
function studyArm(arm, caseId, seeds) {
  const rows = arm.rows.filter((/** @type {any} */ r) => r.caseId === caseId && seeds.includes(r.seed));
  const reqs = rows.map((/** @type {any} */ r) => requestInfo(r, arm.byRow));
  const calls = reqs.flatMap((/** @type {any} */ q) => q.calls);
  const first = calls.find((/** @type {any} */ c) => c.start !== null)?.start;
  const band = first !== undefined && Number.isFinite(first.max) && first.max !== null ? { min: first.min, max: first.max } : null;
  const tuples = calls.flatMap((/** @type {any} */ c) => c.tuples.map((/** @type {any} */ t) => ({ ...t, startCount: c.start?.startCount ?? null })));
  const probes = tuples.filter((/** @type {any} */ t) => !RERATE_PHASES.has(t.phase));
  const reRated = tuples.filter((/** @type {any} */ t) => t.phase === 'rescue' || t.phase === 'rerate');
  /** @type {Record<string, { n: number, capped: number, inBand: number, ms: number[] }>} */
  const probeOffsets = Object.fromEntries(BUCKETS.map((b) => [b, { n: 0, capped: 0, inBand: 0, ms: [] }]));
  for (const t of probes) {
    if (t.startCount !== null) {
      const o = probeOffsets[bucketOf(t.count - t.startCount)];
      o.n += 1;
      o.capped += SCREEN_OUTCOMES.has(t.outcome) || t.outcome === 'capped' ? 1 : 0;
      o.inBand += IN_BAND.has(t.outcome) ? 1 : 0;
      if (typeof t.ms === 'number') {
        o.ms.push(t.ms);
      }
    }
  }
  /** @type {Record<string, number>} */
  const acceptedOffsets = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
  for (const q of reqs) {
    if (q.startCount !== null) {
      for (const c of q.clues) {
        acceptedOffsets[bucketOf(c - q.startCount)] += 1;
      }
    }
  }
  const count = (/** @type {(t: any) => boolean} */ f) => probes.filter(f).length;
  return {
    variant: arm.variant, W: first?.W ?? null, rows, reqs, band, cell: armCell(rows, arm.byRow),
    puzzles: puzzlesOfRuns(rows.map((/** @type {any} */ r) => r.run)),
    profilesPerAccepted: stat(reqs.filter((/** @type {any} */ q) => q.accepted > 0)
      .map((/** @type {any} */ q) => sum(q.calls.map((/** @type {any} */ c) => c.tuples.length)) / q.accepted)),
    probes: {
      n: probes.length, screenCapped: count((t) => SCREEN_OUTCOMES.has(t.outcome)), canonicalCapped: count((t) => t.outcome === 'capped'),
      inBand: count((t) => IN_BAND.has(t.outcome)),
      byOffset: Object.fromEntries(Object.entries(probeOffsets).map(([b, o]) => [b, { n: o.n, capped: o.capped, inBand: o.inBand, msMedian: median(o.ms) }])),
    },
    reRated: { n: reRated.length, inBand: reRated.filter((/** @type {any} */ t) => IN_BAND.has(t.outcome)).length },
    acceptedOffsets,
  };
}

/** @param {string} role @param {any} sa @returns {string} */
function armLabel(role, sa) {
  const w = sa.W === null ? '' : ` W ${sa.W / 1e6} M`;
  return role === 'before' ? 'today (before)' : role === 'w760' ? 'no screen (W 760 M)' : role === 'main' ? `IGP-01 after (${w.trim()})`
    : role === 'a3' ? `arity 3 (${w.trim()})` : w.trim();
}

/** @param {any} sa @returns {any} The arm's figures without its rows, requests and calls (for the record). */
function brief(sa) {
  const { rows, reqs, cell, ...rest } = sa;
  return {
    ...rest, requests: reqs.map((/** @type {any} */ q) => ({ seed: q.seed, K: q.K, startCount: q.startCount, setAttempt: q.setAttempt, setKey: q.setKey, accepted: q.accepted, clues: q.clues })),
    summary: {
      requests: cell.requests, reached: cell.reached, censored: cell.censored, t10: cell.t10, response: cell.response, t1: cell.t1, workPerAccepted: cell.workPerAccepted,
      rerates: cell.rerates,
    },
  };
}

/** @param {any} q @param {any} ref @returns {string} Which set a request was served on, against a reference request. */
function relationOf(q, ref) {
  if (q.setKey === null || ref.setKey === null) {
    return 'unknown';
  }
  return q.setKey === ref.setKey ? 'same set' : q.setAttempt < ref.setAttempt ? 'earlier set' : q.setAttempt > ref.setAttempt ? 'later set' : 'other set';
}

/** @param {any} sa @returns {Record<string, any>} The set stage of an arm: probes per call, arity-3 rounds, wasted probes. */
function setStage(sa) {
  const setCalls = sa.reqs.flatMap((/** @type {any} */ q) => q.calls.filter((/** @type {any} */ c) => c.stage === 'set'));
  const finished = setCalls.filter((/** @type {any} */ c) => c.end !== null);
  const probeCount = (/** @type {any} */ c) => c.tuples.filter((/** @type {any} */ t) => !RERATE_PHASES.has(t.phase)).length;
  const rounds = finished.flatMap((/** @type {any} */ c) => c.end.locate?.rounds ?? []);
  return {
    calls: setCalls.length, finished: finished.length, unfinished: setCalls.length - finished.length,
    unfinishedProbes: sum(setCalls.filter((/** @type {any} */ c) => c.end === null).map(probeCount)),
    probesPerCall: stat(finished.map(probeCount)), probesPerCallMean: mean(finished.map(probeCount)), probesTotal: sum(finished.map(probeCount)),
    a3Probes: sum(setCalls.map((/** @type {any} */ c) => c.tuples.filter((/** @type {any} */ t) => t.phase === 'locate-a3').length)),
    rounds: rounds.length, wastedProbes: sum(rounds.map((/** @type {any} */ r) => r.probes.length - r.consumed)),
    serialMs: stat(num(rounds.map((/** @type {any} */ r) => r.serialMs))), criticalMs: stat(num(rounds.map((/** @type {any} */ r) => r.criticalMs))),
  };
}

/**
 * Per request: the call that produced its set and the idealised call-level T1 bound (a Projection).
 * @param {any} sa
 */
function t1Bound(sa) {
  return sa.reqs.map((/** @type {any} */ q) => {
    const win = q.calls.find((/** @type {any} */ c) => c.stage === 'set' && c.start?.attempt === q.setAttempt && c.end?.result === 'ok');
    const rounds = win?.end.locate?.rounds ?? [];
    const savingMs = sum(rounds.map((/** @type {any} */ r) => r.serialMs - r.criticalMs));
    const t1 = q.row.run.firstReadyMs ?? null;
    const inFlight = win === undefined ? null : q.calls.filter((/** @type {any} */ c) => c !== win && c.stage === 'set' && c.start !== null
      && c.start.at < win.end.at && (c.end === null || c.end.at > win.start.at)).length;
    return {
      seed: q.seed, t1, winnerMs: win?.end.ms ?? null, rounds: rounds.length, savingMs, boundMs: t1 === null ? null : t1 - savingMs, attemptsInFlight: inFlight,
    };
  });
}

/**
 * The journals of an arm against what its variant promises (every start line has the expected W; the no-screen arm has no
 * screen outcome and no re-rating).
 * @param {any} arm
 * @param {string[]} failures
 * @returns {Record<string, any>}
 */
function checkJournals(arm, failures) {
  const role = ROLE_OF_VARIANT[arm.variant];
  const calls = [...arm.byRow.values()].flat();
  const want = EXPECTED_W[role];
  const wrongW = want === undefined ? 0 : calls.filter((c) => c.start !== null && c.start.W !== want).length;
  const tuples = calls.flatMap((c) => c.tuples);
  const screenOutcomes = role === 'w760' ? tuples.filter((t) => SCREEN_OUTCOMES.has(t.outcome)).length : null;
  const rerates = role === 'w760' ? tuples.filter((t) => t.phase === 'rescue' || t.phase === 'rerate').length : null;
  const a3InBatch = role === 'a3' ? calls.filter((c) => c.stage !== 'set' && c.tuples.some((t) => t.phase === 'locate-a3')).length : null;
  if (wrongW > 0) {
    failures.push(`${arm.name}: ${wrongW} start lines without W ${want}`);
  }
  if (screenOutcomes !== null && screenOutcomes > 0) {
    failures.push(`${arm.name}: ${screenOutcomes} screen outcomes (scap0, scap1 or over) in a no-screen journal`);
  }
  if (rerates !== null && rerates > 0) {
    failures.push(`${arm.name}: ${rerates} re-rating tuples in a no-screen journal`);
  }
  if (a3InBatch !== null && a3InBatch > 0) {
    failures.push(`${arm.name}: ${a3InBatch} calls outside the set stage with arity-3 probes`);
  }
  return { arm: arm.name, role, calls: calls.length, expectedW: want ?? null, startLinesWithOtherW: wrongW, screenOutcomes, reRatingTuples: rerates, a3CallsOutsideSetStage: a3InBatch, pass: wrongW === 0 && !screenOutcomes && !rerates && !a3InBatch };
}

// The arm-only and the screen-by-seed sections (IGP-03h; report only).

/** The label of a cell that is not a headline cell. */
const EXTRA_LABELS = Object.freeze(/** @type {Record<string, string>} */ ({ '20x20-hell-1': 'Hell 1 20x20' }));

/** @param {string} seed @returns {number} The repetition of a landscape seed. */
const repOf = (seed) => Number(seed.split('/').at(-1));

/** @param {any} a @returns {string} An arm as `<task>/<arm>` (the `name` of a study arm drops the task of the study). */
const armId = (a) => `${a.task}/${a.arm}`;

/**
 * MP12b1's prescreen of a cell that has no ordinary report (`<case>-s3-<date>.json`: no set was made).
 * @param {string} caseId
 * @returns {{ path: string, report: any } | null}
 */
function mp12b1Prescreen(caseId) {
  const folder = 'docs/difficulty-v3/landscape-v3-full';
  const dir = abs(folder);
  const pattern = new RegExp(`^${caseId}-s3-\\d{4}-\\d{2}-\\d{2}\\.json$`);
  const name = (existsSync(dir) ? readdirSync(dir).filter((n) => pattern.test(n)).sort() : []).at(-1);
  return name === undefined ? null : { path: `${folder}/${name}`, report: JSON.parse(readFileSync(join(dir, name), 'utf8')) };
}

/** @param {any} c @returns {number} Locate probes of a call: the journaled count when it finished, else the tuples seen. */
const locateProbes = (c) => c.end?.locate?.probes ?? c.tuples.filter((/** @type {any} */ t) => t.phase === 'locate' || t.phase === 'locate-a3').length;

/**
 * The first in-band rating of a call: its place among the call's profiles, its clue count, its offset from today's start
 * count and its score.
 * @param {any} c
 */
function firstInBand(c) {
  const at = c.tuples.findIndex((/** @type {any} */ t) => IN_BAND.has(t.outcome));
  if (at < 0) {
    return null;
  }
  const t = c.tuples[at];
  const start = c.start?.startCount ?? null;
  return { ordinal: at + 1, phase: t.phase, count: t.count, offset: start === null ? null : t.count - start, score: t.score ?? null, outcome: t.outcome };
}

/**
 * PM1's windows on a cell (IGP-05 `pm1.json`, part 1) as a population of its in-band ratings.
 * @param {any} cell
 */
function pm1Windows(cell) {
  const K = median(cell.sets.map((/** @type {any} */ s) => s.K));
  const list = cell.inBandRatings.map((/** @type {any} */ r) => ({ clues: r.count, K, U: NaN, score: r.score }));
  return {
    band: cell.band, sets: cell.sets.length, K, startCount: median(cell.sets.map((/** @type {any} */ s) => s.startCount)), families: cell.families,
    ratings: cell.ratings, capped: cell.capped, inBand: cell.inBand, eligible: cell.eligible, population: population(list, cell.band),
    offsets: dist(cell.inBandRatings.map((/** @type {any} */ r) => r.offset)), mainWorkAbove: cell.mainWorkAbove, boundaries: cell.boundaries,
    msPerInBand: cell.msPerInBand,
  };
}

/**
 * A cell of the task's own arm without a before partner (IGP-03h): the arm's request outcomes, accepted puzzles and calls
 * beside MP12b1's outcome on the same seeds and PM1's windows.
 * @param {any} arm
 * @param {string} caseId
 * @param {any} pm1Cell PM1's record of the cell, or null.
 * @param {string} cellLabel
 * @returns {{ json: any, lines: string[] }}
 */
function armOnly(arm, caseId, pm1Cell, cellLabel) {
  const seeds = [...new Set(arm.rows.filter((/** @type {any} */ r) => r.caseId === caseId).map((/** @type {any} */ r) => r.seed))].sort();
  const sa = studyArm(arm, caseId, seeds);
  const found = mp12b1Report(caseId);
  const reference = found ?? mp12b1Prescreen(caseId);
  const refName = found === null ? 'MP12b1 prescreen' : 'MP12b1';
  const refRuns = reference === null ? [] : reference.report.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation');
  const requests = sa.reqs.map((/** @type {any} */ q) => {
    const run = q.row.run;
    const ref = refRuns.find((/** @type {any} */ r) => r.seed === q.seed) ?? null;
    return {
      seed: q.seed, accepted: q.accepted, t1: run.firstReadyMs ?? null, t10: reachedTen(q.row) ? run.tenthReadyMs : null, response: run.responseMs,
      partial: run.partialReason ?? null, childLimitCut: isCensored(q.row), K: q.K, startCount: q.startCount, setAttempt: q.setAttempt,
      ratingCensored: run.ratingCensoredCount ?? 0,
      today: ref === null ? null : { accepted: ref.acceptedCount, t1: ref.firstReadyMs ?? null, t10: ref.tenthReadyMs ?? null, response: ref.responseMs, partial: ref.partialReason ?? null },
    };
  });
  const accepted = sum(requests.map((/** @type {any} */ r) => r.accepted));
  const ratingCensored = sum(requests.map((/** @type {any} */ r) => r.ratingCensored));
  const offsets = sa.reqs.flatMap((/** @type {any} */ q) => (q.startCount === null ? [] : q.clues.map((/** @type {number} */ c) => c - q.startCount)));
  const pop = population(sa.puzzles, sa.band);
  const windows = pm1Cell === null ? null : pm1Windows(pm1Cell);
  const calls = sa.reqs.flatMap((/** @type {any} */ q) => q.calls.map((/** @type {any} */ c) => ({ seed: q.seed, c })));
  const stages = STAGES.map((stage) => {
    const list = calls.filter(({ c }) => c.stage === stage);
    const finished = list.filter(({ c }) => c.end !== null);
    const ok = finished.filter(({ c }) => c.end.result === 'ok');
    const firsts = ok.map(({ c }) => firstInBand(c)).filter((x) => x !== null);
    return {
      stage, calls: list.length, finished: finished.length, ok: ok.length, noWindow: finished.filter(({ c }) => c.end.result === 'no-window').length,
      unfinished: list.length - finished.length, locateProbes: stat(finished.map(({ c }) => locateProbes(c))), locateProbesOk: stat(ok.map(({ c }) => locateProbes(c))),
      profiles: stat(finished.map(({ c }) => c.tuples.length)), okWithInBand: firsts.length,
      firstInBand: { ordinal: stat(firsts.map((f) => f.ordinal)), count: stat(firsts.map((f) => f.count)), offset: stat(num(firsts.map((f) => f.offset))) },
    };
  }).filter((s) => s.calls > 0);
  const perCall = calls.map(({ seed, c }) => ({
    rep: repOf(seed), call: c.id, stage: c.stage, attempt: c.start?.attempt ?? null, K: c.start?.K ?? null, c0: c.end?.locate?.c0 ?? null,
    result: c.end === null ? 'unfinished' : c.end.result, locateProbes: locateProbes(c), profiles: c.tuples.length, locateHit: c.end?.locate?.hit ?? null,
    firstInBand: firstInBand(c), ms: c.end?.ms ?? null,
    path: c.tuples.filter((/** @type {any} */ t) => t.phase === 'locate' || t.phase === 'locate-a3').map((/** @type {any} */ t) => `${t.count}:${t.outcome}`).join(' '),
  }));
  const share = accepted === 0 ? null : ratingCensored / accepted;
  const cell = sa.cell;
  const indication = `a ${['zero', 'one', 'two', 'three', 'four'][seeds.length] ?? seeds.length}-request indication`;
  const json = {
    arm: armId(arm), variant: arm.variant, seeds, band: sa.band, reference: reference === null ? null : { kind: refName, path: reference.path },
    requests, reached: cell.reached, t1: cell.t1, t10: cell.t10, response: cell.response, accepted, ratingCensored, ratingCensoredShare: share,
    population: pop, offsets: dist(offsets), acceptedOffsets: sa.acceptedOffsets, stages, perCall, pm1: windows,
  };

  /** @type {string[]} */
  const lines = ['', `### ${cellLabel}: arm only, no before partner (${armId(arm)}, ${indication})`, '',
    `IGP-01 has no before arm on this cell, so the arm is read by itself, beside ${refName} on the same seeds${reference === null ? ' (no report found)' : ` (\`${reference.path}\`)`} and, where given, PM1's windows (IGP-05). Offsets are clue counts less today's start count. "Rating-censored" counts accepted puzzles whose rating is an estimate (a census stopped at its relative budget, R27); "child-limit cut" is a request stopped at the row limit.`, '',
    `| Seed | Accepted | T1 s | T10 s | Response s | Ended | Child-limit cut | Rating-censored | K | Start count | Set attempt | ${refName}: accepted / T1 s / T10 s / response s / ended |`, '|---|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---|'];
  for (const r of requests) {
    const t = r.today;
    lines.push(`| ${repOf(r.seed)} | ${r.accepted} | ${sec(r.t1)} | ${sec(r.t10)} | ${sec(r.response)} | ${r.partial ?? 'complete'} | ${r.childLimitCut ? 'yes' : 'no'} | ${r.ratingCensored} of ${r.accepted} | ${r.K ?? '-'} | ${r.startCount ?? '-'} | ${r.setAttempt ?? '-'} | ${t === null ? '-' : `${t.accepted} / ${sec(t.t1)} / ${sec(t.t10)} / ${sec(t.response)} / ${t.partial ?? 'complete'}`} |`);
  }
  const refSeeds = refRuns.filter((/** @type {any} */ r) => seeds.includes(r.seed));
  lines.push('', `Ten of n: ${cell.reached} of ${cell.requests}${reference === null ? '' : `; ${refName}: ${refSeeds.filter((/** @type {any} */ r) => r.tenthReadyMs !== null && r.tenthReadyMs !== undefined).length} of ${refSeeds.length} on the same seeds (${refRuns.length} requests in the report)`}. T1 median ${sec(cell.t1.median)} s, T10 median ${sec(cell.t10.median)} s, response median ${sec(cell.response.median)} s. Accepted puzzles ${accepted}; rating-censored ${ratingCensored} of ${accepted} (${pct(share)}).`, '',
    '| Source | Puzzles | Clue share p10 / median / p90 | Median clues (K) | Offset min / median / max | Score position median (0.5 is the centre) | Central share |', '|---|---:|---|---|---|---:|---:|');
  const od = dist(offsets);
  lines.push(`| ${armId(arm)}: accepted puzzles | ${pop.puzzles} | ${p10p90(pop.share)} | ${fix(pop.clues.median, 1)} (${fix(pop.K.median, 1)}) | ${od.n === 0 ? '-' : `${od.min} / ${fix(od.median, 1)} / ${od.max}`} | ${fix(pop.position.median, 2)} | ${pct(pop.centralShare)} |`);
  if (windows !== null) {
    const wp = windows.population;
    const wo = windows.offsets;
    lines.push(`| PM1 (IGP-05): in-band ratings of the cell | ${wp.puzzles} | ${p10p90(wp.share)} | ${fix(wp.clues.median, 1)} (${fix(windows.K, 1)}) | ${wo.n === 0 ? '-' : `${wo.min} / ${fix(wo.median, 1)} / ${wo.max}`} | ${fix(wp.position.median, 2)} | ${pct(wp.centralShare)} |`);
    const above = (/** @type {string} */ w) => `${windows.mainWorkAbove?.[w]?.inBand?.n ?? '-'} of ${windows.mainWorkAbove?.[w]?.inBand?.of ?? '-'}`;
    lines.push('', `PM1's windows on this cell (IGP-05, \`ig-pm1\` seeds, two sets of K ${windows.K}, today's start count ${windows.startCount}, band [${windows.band.min}, ${windows.band.max})): ${windows.inBand.ratings} in-band ratings (${windows.eligible.ratings} eligible) of ${windows.ratings} ratings, ${windows.capped} capped, in ${windows.inBand.families} of ${windows.families} families; main work above 95 / 190 / 380 M: ${above('95')} / ${above('190')} / ${above('380')} in-band ratings; ${fix(windows.msPerInBand === null ? null : windows.msPerInBand / 1000, 1)} s of rating per in-band rating.`);
  }
  lines.push('', 'Locate and calls, per stage (locate probes are the rated counts of phase A; the first in-band profile is the first rating of the call inside the band and not refused by AR1):', '',
    '| Stage | Calls | Ok | No-window | Unfinished | Locate probes per finished call: median / p90 / max | Per ok call: median / max | Profiles per finished call: median / max | Ok calls with an in-band profile | First in-band: probe no. median [range] | Clue count median [range] | Offset median [range] |', '|---|---:|---:|---:|---:|---|---|---|---:|---|---|---|');
  const rangeOf = (/** @type {number[]} */ v) => (v.length === 0 ? '-' : `${fix(median(v), 1)} [${Math.min(...v)}-${Math.max(...v)}]`);
  for (const s of stages) {
    const firsts = calls.filter(({ c }) => c.stage === s.stage && c.end?.result === 'ok').map(({ c }) => firstInBand(c)).filter((x) => x !== null);
    lines.push(`| ${s.stage} | ${s.calls} | ${s.ok} | ${s.noWindow} | ${s.unfinished} | ${fix(s.locateProbes.median, 1)} / ${fix(s.locateProbes.p90, 1)} / ${fix(s.locateProbes.max, 0)} | ${fix(s.locateProbesOk.median, 1)} / ${fix(s.locateProbesOk.max, 0)} | ${fix(s.profiles.median, 1)} / ${fix(s.profiles.max, 0)} | ${s.okWithInBand} | ${rangeOf(firsts.map((f) => f.ordinal))} | ${rangeOf(firsts.map((f) => f.count))} | ${rangeOf(num(firsts.map((f) => f.offset)))} |`);
  }
  const shown = perCall.slice(0, 60);
  lines.push('', 'Every call (rep, call, stage, set attempt, K, start of the locate, result, locate probes, profiles, journaled locate hit, first in-band profile as probe no. / count / offset / score, ms, locate path as count:outcome):', '',
    '| Rep | Call | Stage | Attempt | K | c0 | Result | Locate probes | Profiles | Locate hit | First in-band | ms | Locate path |', '|---:|---|---|---:|---:|---:|---|---:|---:|---:|---|---:|---|');
  for (const p of shown) {
    const f = p.firstInBand;
    lines.push(`| ${p.rep} | ${p.call} | ${p.stage} | ${p.attempt ?? '-'} | ${p.K ?? '-'} | ${p.c0 ?? '-'} | ${p.result} | ${p.locateProbes} | ${p.profiles} | ${p.locateHit ?? '-'} | ${f === null ? '-' : `${f.ordinal} / ${f.count} / ${f.offset === null ? '-' : (f.offset >= 0 ? '+' : '') + f.offset} / ${f.score ?? '-'}`} | ${fix(p.ms, 0)} | ${p.path} |`);
  }
  if (perCall.length > shown.length) {
    lines.push('', `${perCall.length - shown.length} further calls are in \`compare.json\`.`);
  }
  return { json, lines };
}

/**
 * The screen against the search without it, by seed, over every arm of the roles `w760` and `main` (IGP-03h part 3): arms
 * of different tasks are paired by seed and by role (the variant), never by tree id. Today is MP12b1's record.
 * @param {any[]} armList
 * @param {string} caseId
 * @param {string} cellLabel
 * @param {string[]} failures
 * @returns {{ json: any, lines: string[] } | null}
 */
function screenBySeed(armList, caseId, cellLabel, failures) {
  const collect = (/** @type {string} */ role) => {
    /** @type {Map<string, { arm: any, row: any, others: { arm: any, row: any }[] }>} */
    const found = new Map();
    for (const arm of armList.filter((a) => ROLE_OF_VARIANT[a.variant] === role)) {
      for (const row of arm.rows.filter((/** @type {any} */ r) => r.caseId === caseId)) {
        const at = found.get(row.seed);
        if (at === undefined) {
          found.set(row.seed, { arm, row, others: [] });
        } else {
          at.others.push({ arm, row });
        }
      }
    }
    return found;
  };
  const w = collect('w760');
  const m = collect('main');
  const seeds = [...w.keys()].filter((s) => m.has(s)).sort((a, b) => repOf(a) - repOf(b));
  if (seeds.length === 0) {
    return null;
  }
  const mp = mp12b1Report(caseId);
  const mpRuns = mp === null ? [] : mp.report.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation');
  const medianOf = (/** @type {number[]} */ v) => (v.length === 0 ? null : median(v));
  const side = (/** @type {Map<string, any>} */ found, /** @type {string} */ seed) => {
    const f = found.get(seed);
    const q = requestInfo(f.row, f.arm.byRow);
    const clues = medianOf(q.clues);
    for (const o of f.others) {
      const r = comparePair(f.row.run, o.row.run);
      if (!(r.countsEqual && r.digestEqual === true && r.setKeyEqual !== false && r.keyPrefixEqual !== false)) {
        failures.push(`${seed}: ${armId(f.arm)} and ${armId(o.arm)} ran the same seed and differ (${r.note})`);
      }
    }
    return {
      source: armId(f.arm), also: f.others.map((/** @type {any} */ o) => armId(o.arm)), accepted: q.accepted, t1: f.row.run.firstReadyMs ?? null, t10: reachedTen(f.row) ? f.row.run.tenthReadyMs : null,
      response: f.row.run.responseMs, childLimitCut: isCensored(f.row), clues, K: q.K, share: clues === null || q.K === null ? null : clues / q.K,
      setAttempt: q.setAttempt, setKey: q.setKey, ratingCensored: f.row.run.ratingCensoredCount ?? 0, digest: f.row.run.details?.resultDigest ?? null,
      duplicates: f.others.map((/** @type {any} */ o) => ({ source: armId(o.arm), digestEqual: (o.row.run.details?.resultDigest ?? null) === (f.row.run.details?.resultDigest ?? null) })),
    };
  };
  const todayOf = (/** @type {string} */ seed) => {
    const r = mpRuns.find((/** @type {any} */ x) => x.seed === seed);
    if (r === undefined) {
      return null;
    }
    const clues = medianOf((r.details?.puzzles ?? []).map((/** @type {any} */ p) => p.clues));
    const K = r.details?.K ?? null;
    return {
      accepted: r.acceptedCount, t1: r.firstReadyMs ?? null, t10: r.tenthReadyMs ?? null, response: r.responseMs, clues, K, share: clues === null || K === null ? null : clues / K,
      setAttempt: r.details?.setAttempt ?? null,
    };
  };
  const ratioOf = (/** @type {number | null} */ a, /** @type {number | null} */ b) => (a === null || b === null || b === 0 ? null : a / b);
  const rows = seeds.map((seed) => {
    const a = side(w, seed);
    const b = side(m, seed);
    const today = todayOf(seed);
    const sameSet = a.setKey === null || b.setKey === null ? null : a.setKey === b.setKey;
    return {
      seed, rep: repOf(seed), today, w760: a, main: b,
      t10Ratio: ratioOf(a.t10, b.t10), responseRatio: a.childLimitCut || b.childLimitCut ? null : ratioOf(a.response, b.response),
      todayOverW760: ratioOf(today?.t10 ?? null, a.t10), todayOverMain: ratioOf(today?.t10 ?? null, b.t10),
      sameSet, shiftClues: sameSet === true && a.clues !== null && b.clues !== null ? b.clues - a.clues : null,
      shiftShare: sameSet === true && a.share !== null && b.share !== null ? b.share - a.share : null,
    };
  });
  const nums = (/** @type {(r: any) => number | null} */ f) => /** @type {number[]} */ (rows.map(f).filter((x) => x !== null));
  const ratioSummary = (/** @type {number[]} */ v) => ({ ...ratioStat(v), geoMean: geoMean(v) });
  const bandArm = armList.find((a) => ROLE_OF_VARIANT[a.variant] === 'w760');
  const startLine = bandArm === undefined ? undefined : (bandArm.byRow.get(w.get(seeds[0])?.row.rowKey) ?? []).find((/** @type {any} */ c) => c.start !== null)?.start;
  const band = startLine !== undefined && Number.isFinite(startLine.max) && startLine.max !== null ? { min: startLine.min, max: startLine.max } : null;
  const popBand = (/** @type {any[]} */ runs) => population(puzzlesOfRuns(runs), band);
  const populations = {
    today: popBand(mpRuns.filter((/** @type {any} */ r) => seeds.includes(r.seed))), w760: popBand(seeds.map((s) => /** @type {any} */ (w.get(s)).row.run)),
    main: popBand(seeds.map((s) => /** @type {any} */ (m.get(s)).row.run)), mp12b1All: popBand(mpRuns),
  };
  const reached = (/** @type {'w760' | 'main'} */ role) => rows.filter((r) => r[role].t10 !== null).length;
  const summary = {
    seeds: seeds.length, reached: { w760: reached('w760'), main: reached('main'), today: rows.filter((r) => r.today?.t10 !== null && r.today?.t10 !== undefined).length },
    t10Ratio: ratioSummary(nums((r) => r.t10Ratio)), responseRatio: ratioSummary(nums((r) => r.responseRatio)),
    todayOverW760: ratioSummary(nums((r) => r.todayOverW760)), todayOverMain: ratioSummary(nums((r) => r.todayOverMain)),
    shiftClues: { n: nums((r) => r.shiftClues).length, median: medianOf(nums((r) => r.shiftClues)) },
    shiftShare: { n: nums((r) => r.shiftShare).length, median: medianOf(nums((r) => r.shiftShare)) },
    sameSet: rows.filter((r) => r.sameSet === true).length, populations,
  };
  const mainLabel = caseId.includes('hell') ? 'at 380 M' : 'at 190 M';
  const sources = (/** @type {'w760' | 'main'} */ role) => [...new Set(rows.map((r) => r[role].source))].join(', ');
  const cs = (/** @type {any} */ x) => (x === null ? '-' : `${x.accepted} / ${sec(x.t10)} / ${sec(x.response)}`);
  /** @type {string[]} */
  const lines = ['', `### ${cellLabel}: the screen against no screen, by seed, all seeds (R33; ${seeds.length} seed${seeds.length === 1 ? '' : 's'})`, '',
    `Paired by seed and by variant role, never by tree id. No screen (\`p1p5-w760\`) from ${sources('w760')}; the screen ${mainLabel} (\`p1p5-main\`) from ${sources('main')}; today is MP12b1's record of the same seeds. Cells are accepted / T10 s / response s (T10 is blank where a request did not reach ten). Ratios above 1 mean the first named arm is slower. A set is "the same" when \`igSetKey\` is equal.`, '',
    '| Rep | Today (MP12b1) | No screen | Screen | T10 no screen / screen | Response no screen / screen | T10 today / no screen | T10 today / screen | Set attempt: today / no screen / screen | Same set (no screen, screen) | Median clues: today / no screen / screen | Screen − no screen, same set: clues, share |',
    '|---:|---|---|---|---:|---:|---:|---:|---|---|---|---|'];
  for (const r of rows) {
    lines.push(`| ${r.rep} | ${cs(r.today)} | ${cs(r.w760)} | ${cs(r.main)}${r.main.also.length > 0 ? ` (also ${r.main.also.join(', ')}: digest ${r.main.duplicates.every((/** @type {any} */ d) => d.digestEqual) ? 'equal' : 'DIFFERS'})` : ''} | ${fix(r.t10Ratio)} | ${fix(r.responseRatio)} | ${fix(r.todayOverW760)} | ${fix(r.todayOverMain)} | ${r.today?.setAttempt ?? '-'} / ${r.w760.setAttempt ?? '-'} / ${r.main.setAttempt ?? '-'} | ${r.sameSet === null ? 'unknown' : r.sameSet ? 'same' : 'different'} | ${fix(r.today?.clues, 1)} / ${fix(r.w760.clues, 1)} / ${fix(r.main.clues, 1)} | ${r.shiftClues === null ? '-' : `${r.shiftClues >= 0 ? '+' : ''}${fix(r.shiftClues, 1)}, ${r.shiftShare === null ? '-' : `${r.shiftShare >= 0 ? '+' : ''}${fix(r.shiftShare, 3)}`}`} |`);
  }
  const rs = (/** @type {any} */ s) => (s.n === 0 ? '-' : `median ${fix(s.median)} [${fix(s.min)}-${fix(s.max)}], geometric mean ${fix(s.geoMean)}, n ${s.n}`);
  lines.push('', `Ten of n: today ${summary.reached.today} of ${seeds.length}, no screen ${summary.reached.w760}, screen ${summary.reached.main}. T10 ratio no screen / screen: ${rs(summary.t10Ratio)}; response ratio: ${rs(summary.responseRatio)}; today / no screen: ${rs(summary.todayOverW760)}; today / screen: ${rs(summary.todayOverMain)}. On the ${summary.sameSet} of ${seeds.length} seeds served on the same set by both arms, the screen's clue shift (screen − no screen) has median ${fix(summary.shiftClues.median, 1)} clues (n ${summary.shiftClues.n}) and ${fix(summary.shiftShare.median, 3)} of K.`, '',
    '| Population of the accepted puzzles | Puzzles | Clue share p10 / median / p90 | Median clues (K) | Score position median | Central share |', '|---|---:|---|---|---:|---:|');
  for (const [name, pop] of [['Today, MP12b1, these seeds', populations.today], ['No screen', populations.w760], ['Screen', populations.main], ['MP12b1, all reps', populations.mp12b1All]]) {
    lines.push(`| ${name} | ${pop.puzzles} | ${p10p90(pop.share)} | ${fix(pop.clues.median, 1)} (${fix(pop.K.median, 1)}) | ${fix(pop.position.median, 2)} | ${pct(pop.centralShare)} |`);
  }
  return { json: { seeds, rows, summary }, lines };
}

/**
 * @param {{ arms: Record<string, any>, task: string, pm4: any, pm1: any, failures: string[] }} o
 * @returns {{ json: any, lines: string[], rows: Record<string, any> }}
 */
function buildStudy({ arms, task, pm4, pm1, failures }) {
  /** @type {Record<string, any>} */
  const byRole = {};
  for (const arm of Object.values(arms)) {
    byRole[ROLE_OF_VARIANT[arm.variant] ?? arm.variant] ??= arm;
  }
  const own = Object.values(arms).filter((a) => a.task === task);
  const owners = own.length > 0 ? own : Object.values(arms);
  const cellIds = HEADLINE.map((h) => h.id).filter((id) => owners.some((a) => a.rows.some((/** @type {any} */ r) => r.caseId === id)));
  const checks = Object.values(arms).filter((a) => a.task === task || own.length === 0).map((a) => checkJournals(a, failures));
  const checkLines = checks.filter((c) => c.expectedW !== null || c.screenOutcomes !== null || c.a3CallsOutsideSetStage !== null)
    .map((c) => `${c.arm} ${c.pass ? 'passes' : 'FAILS'} (${c.calls} calls${c.expectedW === null ? '' : `, every start line has W ${c.expectedW / 1e6} M`}${c.screenOutcomes === null ? '' : `, ${c.screenOutcomes} screen outcomes (scap0, scap1, over), ${c.reRatingTuples} re-rating tuples`}${c.a3CallsOutsideSetStage === null ? '' : `, ${c.a3CallsOutsideSetStage} calls outside the set stage with arity-3 probes`})`);
  /** @type {string[]} */
  const lines = [];
  /** @type {Record<string, any>} */
  const cells = {};
  /** @type {Record<string, any>} */
  const rows = {};
  const label = (/** @type {string} */ id) => HEADLINE.find((h) => h.id === id)?.label ?? EXTRA_LABELS[id] ?? id;

  lines.push('', '## Study of the W variants, the no-screen arm and arity 3 (IGP-03)', '',
    'The per-W, split, shift and offset tables rest on the matched seeds of each cell (two seeds on 14x14 and 12x12 Nightmare and on Hell 1 26x26, five on 26x26 Master): **a two-seed indication** (five-seed on Master), not an estimate of a factor or a rate. PM4 (IGP-02) carries the per-W economics. No `W_screen` is recommended here: the least-work W is descriptive, and the choice waits for the answer to IG-P-Q17 and the frozen round.', '');
  lines.push('Journal checks: ' + (checkLines.length === 0 ? 'none applicable.' : `${checkLines.join('; ')}.`), '');

  for (const caseId of cellIds) {
    const own3 = owners.filter((a) => a.rows.some((/** @type {any} */ r) => r.caseId === caseId));
    const seeds = [...new Set(own3.flatMap((a) => a.rows.filter((/** @type {any} */ r) => r.caseId === caseId).map((/** @type {any} */ r) => r.seed)))]
      .filter((s) => own3.every((a) => a.rows.some((/** @type {any} */ r) => r.caseId === caseId && r.seed === s))).sort();
    /** @type {Record<string, any>} */
    const sa = {};
    for (const role of ROLES) {
      if (byRole[role] !== undefined) {
        const found = studyArm(byRole[role], caseId, seeds);
        if (found.rows.length > 0) {
          sa[role] = found;
        }
      }
    }
    const roles = ROLES.filter((r) => sa[r] !== undefined);
    const wRoles = W_ROLES.filter((r) => sa[r] !== undefined);
    const band = roles.map((r) => sa[r].band).find((b) => b !== null) ?? null;
    const found = mp12b1Report(caseId);
    const mpRuns = found === null ? [] : found.report.runs.filter((/** @type {any} */ r) => r.probeKind === 'generation');
    const mp = population(puzzlesOfRuns(mpRuns), band);
    const pm4Cell = pm4?.cells?.[caseId] ?? null;
    const cell = { seeds, band, arms: Object.fromEntries(roles.map((r) => [r, brief(sa[r])])), mp12b1: { runs: mpRuns.length, population: mp } };
    cells[caseId] = cell;
    lines.push('', `### ${label(caseId)}: seeds ${seeds.map((s) => s.split('/').at(-1)).join(', ')}`, '');
    const indication = `a ${['zero', 'one', 'two', 'three', 'four', 'five', 'six'][seeds.length] ?? seeds.length}-seed indication`;

    // Per W (R16, R18).
    const perW = wRoles.map((r) => {
      const a = sa[r];
      const c = a.cell;
      const pm = pm4Cell?.perW?.[String(a.W)] ?? null;
      return { role: r, W: a.W, requests: c.requests, reached: c.reached, t10: c.t10, response: c.response, workWithSet: c.workPerAccepted.withSet, workWithoutSet: c.workPerAccepted.withoutSet, profilesPerAccepted: a.profilesPerAccepted, probes: a.probes.n, screenCapped: a.probes.screenCapped, canonicalCapped: a.probes.canonicalCapped, rerates: c.rerates, reRated: a.reRated, unfinishedCalls: c.workPerAccepted.unfinishedCalls, pm4: pm === null ? null : { usefulLost: pm.usefulLost, saving: pm.cost.saving, perUseful: pm.perUseful } };
    });
    const screenedRows = perW.filter((p) => p.role !== 'before' && p.workWithSet.median !== null);
    const least = screenedRows.length === 0 ? null : screenedRows.reduce((m, p) => (p.workWithSet.median < m.workWithSet.median ? p : m));
    cell.perW = { rows: perW, leastWorkRole: least?.role ?? null };
    lines.push('#### Per W (R16, R18)', '',
      '| Arm | Ten of n | T10 median s | Response median s | Work per accepted puzzle, batch and completion, M units (median) | With the set stage, M units | Profiles per accepted puzzle (median) | Unfinished calls |',
      '|---|---|---:|---:|---:|---:|---:|---:|');
    for (const p of perW) {
      lines.push(`| ${armLabel(p.role, sa[p.role])} | ${p.reached} of ${p.requests} | ${sec(p.t10.median)} | ${sec(p.response.median)} | ${mUnits(p.workWithoutSet.median)} | ${mUnits(p.workWithSet.median)} | ${fix(p.profilesPerAccepted.median, 1)} | ${p.unfinishedCalls} |`);
    }
    lines.push('', least === null ? 'No arm accepted a puzzle.' : `Least median work per accepted puzzle with the set stage on these seeds (descriptive, R16): ${armLabel(least.role, sa[least.role])}, ${mUnits(least.workWithSet.median)} M units. It is not a recommendation.`, '',
      '| Arm | Capped probes: screen / canonical (of probes) | Re-ratings per call: mean (max) | Re-ratings, share of the work | Re-rated probes in band (of re-rated): a lower bound of the useful ratings lost | IGP-02 (PM4) at this W: useful lost (of) | PM4 P2 saving | PM4 time per useful rating, canonical → with the screen, s |',
      '|---|---|---|---|---|---|---|---|');
    for (const p of perW) {
      const r = p.rerates;
      const pm = p.pm4;
      lines.push(`| ${armLabel(p.role, sa[p.role])} | ${p.screenCapped} / ${p.canonicalCapped} (${p.probes}) | ${r === null ? '-' : `${fix(r.perCallMean, 2)} (${fix(r.perCallMax, 0)})`} | ${r === null ? '-' : pct(r.workShare, 1)} | ${p.role === 'before' ? '-' : `${p.reRated.inBand} of ${p.reRated.n}`} | ${pm === null ? '-' : `${pm.usefulLost.n} of ${pm.usefulLost.of}`} | ${pm === null ? '-' : fix(pm.saving, 2)} | ${pm === null ? '-' : `${sec(pm.perUseful.canonicalMs)} → ${sec(pm.perUseful.withScreenMs)}`} |`);
    }

    // Population (R32).
    lines.push('', '#### Population of the accepted puzzles (R32)', '',
      '| Arm | Puzzles | Clue share p10 / median / p90 | Median clues (median K) | U median | Score position median (0.5 is the centre) | Central share |', '|---|---:|---|---|---:|---:|---:|');
    for (const r of roles) {
      const pop = population(sa[r].puzzles, sa[r].band ?? band);
      cell.arms[r].population = pop;
      lines.push(`| ${armLabel(r, sa[r])} | ${pop.puzzles} | ${p10p90(pop.share)} | ${fix(pop.clues.median, 1)} (${fix(pop.K.median, 1)}) | ${fix(pop.U.median, 1)} | ${fix(pop.position.median, 2)} | ${pct(pop.centralShare)} |`);
    }
    lines.push(`| MP12b1, 20 reps | ${mp.puzzles} | ${p10p90(mp.share)} | ${fix(mp.clues.median, 1)} (${fix(mp.K.median, 1)}) | ${fix(mp.U.median, 1)} | ${fix(mp.position.median, 2)} | ${pct(mp.centralShare)} |`);

    // The split (R33).
    if (sa.w760 !== undefined && sa.before !== undefined) {
      /** @type {{ from: string, to: string }[]} */
      const steps = [['before', 'w760'], ['w760', 'main'], ['before', 'main'], ['w760', 'w380'], ['w760', 'w095']]
        .filter(([a, b]) => sa[a] !== undefined && sa[b] !== undefined).map(([from, to]) => ({ from, to }));
      const shareMedian = (/** @type {string} */ r) => population(sa[r].puzzles, band).share.median;
      const factors = steps.map(({ from, to }) => {
        const paired = pairedCell(sa[from].rows, sa[to].rows);
        return { from, to, t10: paired.t10Ratio, response: paired.responseRatio, completion: paired.completion, shareShift: shareMedian(to) === null || shareMedian(from) === null ? null : shareMedian(to) - shareMedian(from) };
      });
      cell.split = { factors, clueShare: Object.fromEntries(roles.map((r) => [r, shareMedian(r)])) };
      lines.push('', `#### The split (R33): before → no screen → ${sa.main?.W ? sa.main.W / 1e6 : 190} M (${indication})`, '',
        '| Arm | Ten of n | T10 median s | Response median s | Median clue share |', '|---|---|---:|---:|---:|');
      for (const r of ['before', 'w760', 'w380', 'main', 'w095'].filter((x) => sa[x] !== undefined)) {
        const c = sa[r].cell;
        lines.push(`| ${armLabel(r, sa[r])} | ${c.reached} of ${c.requests} | ${sec(c.t10.median)} | ${sec(c.response.median)} | ${fix(shareMedian(r), 3)} |`);
      }
      lines.push('', '| Step (ratio = from / to; above 1 is faster) | T10 ratio, median [min-max] n | Response ratio, median [min-max] n | Ten of n, from / to | Median clue share, to − from |', '|---|---|---|---|---:|');
      for (const f of factors) {
        const note = f.from === 'before' && f.to === 'w760' ? ' (the search without the screen: P1, P3, P4)' : f.from === 'w760' && f.to === 'main' ? ' (the screen)' : '';
        lines.push(`| ${armLabel(f.from, sa[f.from])} → ${armLabel(f.to, sa[f.to])}${note} | ${ratioText(f.t10)} | ${ratioText(f.response)} | ${f.completion.before} / ${f.completion.after} of ${f.completion.of} | ${fix(f.shareShift, 3)} |`);
      }
    }

    // The two parts of the shift.
    if (sa.before !== undefined && roles.length > 1) {
      const shiftRoles = ROLES.filter((r) => r !== 'before' && r !== 'a3' && sa[r] !== undefined);
      const reqOf = (/** @type {string} */ role, /** @type {string} */ seed) => sa[role].reqs.find((/** @type {any} */ q) => q.seed === seed);
      const medianClues = (/** @type {any} */ q) => median(q.clues);
      /** @type {Record<string, any>} */
      const sets = {};
      /** @type {Record<string, any>} */
      const sameSet = {};
      lines.push('', `#### Which set each request was served on, and the same-set clue shift (${indication})`, '',
        `| Seed | ${['before', ...shiftRoles].map((r) => armLabel(r, sa[r])).join(' | ')} |`, `|---|${'---|'.repeat(1 + shiftRoles.length)}`);
      for (const seed of seeds) {
        const ref = reqOf('before', seed);
        lines.push(`| ${seed.split('/').at(-1)} | ${['before', ...shiftRoles].map((r) => {
          const q = reqOf(r, seed);
          return q === undefined ? '-' : `attempt ${q.setAttempt}${r === 'before' || ref === undefined ? '' : ` (${relationOf(q, ref)})`}`;
        }).join(' | ')} |`);
      }
      for (const r of shiftRoles) {
        const mine = seeds.map((s) => reqOf(r, s)).filter((q) => q !== undefined);
        const relation = mine.map((q) => relationOf(q, reqOf('before', q.seed) ?? q));
        sets[r] = { requests: mine.length, earlier: relation.filter((x) => x === 'earlier set').length, same: relation.filter((x) => x === 'same set').length, later: relation.filter((x) => x === 'later set').length };
        /** @type {Record<string, any>} */
        const entry = {};
        for (const ref of ['before', 'w760'].filter((x) => x !== r && sa[x] !== undefined)) {
          const deltas = mine.map((q) => ({ q, ref: reqOf(ref, q.seed) })).filter(({ q, ref: rq }) => rq !== undefined && relationOf(q, rq) === 'same set' && medianClues(q) !== null && medianClues(rq) !== null)
            .map(({ q, ref: rq }) => ({ seed: q.seed, delta: /** @type {number} */ (medianClues(q)) - /** @type {number} */ (medianClues(rq)) }));
          entry[ref] = { n: deltas.length, median: median(deltas.map((d) => d.delta)), perRequest: deltas };
        }
        sameSet[r] = entry;
      }
      cell.shift = { sets, sameSet };
      lines.push('', '| Arm | Served on an earlier set than the before arm\'s | On the same set | On a later set | Same-set median clue shift against the before arm, per request (median, n) | Against the no-screen arm, per request (median, n) |', '|---|---:|---:|---:|---|---|');
      for (const r of shiftRoles) {
        const s = sets[r];
        const text = (/** @type {any} */ e) => (e === undefined ? '-' : `${e.perRequest.map((/** @type {any} */ d) => `${d.seed.split('/').at(-1)}: ${d.delta >= 0 ? '+' : ''}${fix(d.delta, 1)}`).join(', ') || 'none'} (${fix(e.median, 1)}, n ${e.n})`);
        lines.push(`| ${armLabel(r, sa[r])} | ${s.earlier} of ${s.requests} | ${s.same} | ${s.later} | ${text(sameSet[r].before)} | ${text(sameSet[r].w760)} |`);
      }
    }

    // Offsets.
    const offRoles = roles.filter((r) => r !== 'a3');
    const pmOff = pm4Cell?.costByOffset ?? null;
    cell.offsets = { pm4: pmOff };
    lines.push('', `#### Accepted puzzles and probes by clue offset from today's start count (${indication})`, '',
      `| Offset | ${offRoles.map((r) => `${armLabel(r, sa[r])}: accepted`).join(' | ')} | ${offRoles.map((r) => `${armLabel(r, sa[r])}: probes (capped, in band, median ms)`).join(' | ')} | PM4 canonical (IGP-02): profiles (capped, useful, median ms) |`,
      `|---|${'---:|'.repeat(offRoles.length)}${'---|'.repeat(offRoles.length + 1)}`);
    for (const b of BUCKETS) {
      const pr = (/** @type {string} */ r) => {
        const o = sa[r].probes.byOffset[b];
        return o.n === 0 ? '0' : `${o.n} (${pct(o.capped / o.n)}, ${pct(o.inBand / o.n)}, ${fix(o.msMedian, 0)})`;
      };
      const pm = pmOff?.[b];
      lines.push(`| ${b} | ${offRoles.map((r) => sa[r].acceptedOffsets[b]).join(' | ')} | ${offRoles.map(pr).join(' | ')} | ${pm === undefined || pm.n === 0 ? '0' : `${pm.n} (${pct(pm.cappedShare)}, ${pm.useful}, ${fix(pm.msMedian, 0)})`} |`);
    }
    lines.push('', `Offset = clue count − today's start count of the request's set (the \`startCount\` of the journal start lines). Probes are every rating attempt of the cohort's calls except re-ratings; capped = screen-capped (scap0, scap1, over) or canonically capped; in band = a rating inside the score band, not refused by AR1.${band === null ? ' The band is open above: score positions are not computed.' : ''}`);
  }

  // Cells without a before partner, and the screen against no screen on every seed (IGP-03h).
  const armList = Object.values(arms);
  const ownCases = [...new Set(owners.flatMap((a) => a.rows.map((/** @type {any} */ r) => r.caseId)))];
  /** @type {Record<string, any>} */
  const armOnlyCells = {};
  for (const caseId of ownCases.filter((id) => !cellIds.includes(id)).sort()) {
    for (const arm of owners.filter((a) => a.rows.some((/** @type {any} */ r) => r.caseId === caseId))) {
      const result = armOnly(arm, caseId, pm1?.part1?.[caseId] ?? null, label(caseId));
      armOnlyCells[caseId] = { ...armOnlyCells[caseId], [ROLE_OF_VARIANT[arm.variant] ?? arm.variant]: result.json };
      lines.push(...result.lines);
    }
  }
  /** @type {Record<string, any>} */
  const bySeed = {};
  for (const caseId of ownCases) {
    const result = screenBySeed(armList, caseId, label(caseId), failures);
    if (result !== null) {
      bySeed[caseId] = result.json;
      lines.push(...result.lines);
    }
  }

  // 26x26 Master at 380 M (R07).
  const master = cells['26x26-master'];
  if (master !== undefined && master.arms.w380 !== undefined) {
    const m = master.arms;
    const perSeed = master.seeds.map((/** @type {string} */ seed) => {
      const ten = (/** @type {string} */ r) => {
        const row = byRole[r]?.rows.find((/** @type {any} */ x) => x.caseId === '26x26-master' && x.seed === seed);
        return row !== undefined && reachedTen(row) ? row.run.tenthReadyMs : null;
      };
      const ratio = (/** @type {string} */ a, /** @type {string} */ b) => div(ten(a), ten(b));
      return { seed, t10: { before: ten('before'), main: ten('main'), w380: ten('w380') }, beforeOverMain: ratio('before', 'main'), beforeOverW380: ratio('before', 'w380'), mainOverW380: ratio('main', 'w380') };
    });
    const summary = (/** @type {string} */ key) => { const v = /** @type {number[]} */ (perSeed.map((/** @type {any} */ p) => p[key]).filter((/** @type {any} */ x) => x !== null)); return { n: v.length, median: median(v), geoMean: geoMean(v), min: v.length === 0 ? null : Math.min(...v), max: v.length === 0 ? null : Math.max(...v) }; };
    master.w380Table = { perSeed, beforeOverMain: summary('beforeOverMain'), beforeOverW380: summary('beforeOverW380'), mainOverW380: summary('mainOverW380') };
    lines.push('', '### 26x26 Master at 380 M against IGP-01 (R07)', '',
      '| Arm | Ten of n | T10 median s | Response median s | Screen-capped probes (of probes) |', '|---|---|---:|---:|---|');
    for (const r of ['before', 'main', 'w380'].filter((x) => m[x] !== undefined)) {
      lines.push(`| ${armLabel(r, m[r])} | ${m[r].summary.reached} of ${m[r].summary.requests} | ${sec(m[r].summary.t10.median)} | ${sec(m[r].summary.response.median)} | ${m[r].probes.screenCapped} (${m[r].probes.n}; ${pct(div(m[r].probes.screenCapped, m[r].probes.n), 1)}) |`);
    }
    lines.push('', '| Seed | T10 before s | T10 190 M s | T10 380 M s | before / 190 M | before / 380 M | 190 M / 380 M |', '|---|---:|---:|---:|---:|---:|---:|');
    for (const p of perSeed) {
      lines.push(`| ${p.seed.split('/').at(-1)} | ${sec(p.t10.before)} | ${sec(p.t10.main)} | ${sec(p.t10.w380)} | ${fix(p.beforeOverMain)} | ${fix(p.beforeOverW380)} | ${fix(p.mainOverW380)} |`);
    }
    const s3 = (/** @type {any} */ s) => `median ${fix(s.median)}, geometric mean ${fix(s.geoMean)}, range ${fix(s.min)}-${fix(s.max)}, n ${s.n}`;
    lines.push('', `Paired T10 ratios (above 1 is faster): before / 190 M: ${s3(master.w380Table.beforeOverMain)}; before / 380 M: ${s3(master.w380Table.beforeOverW380)}; 190 M / 380 M: ${s3(master.w380Table.mainOverW380)}. IGP-01 found this cell mixed (0.38-2.13 per seed) with ${m.main?.probes.screenCapped ?? '-'} screen-capped probes at 190 M. The accepted puzzles by offset follow.`);
    const mRoles = ['before', 'main', 'w380'].filter((x) => m[x] !== undefined);
    lines.push('', `| Offset | ${mRoles.map((r) => `${armLabel(r, m[r])}: accepted`).join(' | ')} |`, `|---|${'---:|'.repeat(mRoles.length)}`);
    for (const b of BUCKETS) {
      lines.push(`| ${b} | ${mRoles.map((r) => m[r].acceptedOffsets[b]).join(' | ')} |`);
    }
  }

  // Arity 3 (R20).
  for (const caseId of cellIds) {
    const cell = cells[caseId];
    if (cell.arms.a3 === undefined || cell.arms.main === undefined) {
      continue;
    }
    const a = studyArm(byRole.main, caseId, cell.seeds);
    const b = studyArm(byRole.a3, caseId, cell.seeds);
    const sa3 = setStage(a);
    const sb3 = setStage(b);
    const bounds = t1Bound(b);
    const t1Main = cell.arms.main.summary.t1;
    const t1A3 = cell.arms.a3.summary.t1;
    const boundMs = num(bounds.map((x) => x.boundMs));
    const digestOf = (/** @type {any} */ s, /** @type {string} */ seed) => s.reqs.find((/** @type {any} */ q) => q.seed === seed)?.row.run.details?.resultDigest ?? null;
    const identical = cell.seeds.map((/** @type {string} */ seed) => {
      const da = digestOf(a, seed);
      const db = digestOf(b, seed);
      return { seed, identical: da === null || db === null ? null : da === db };
    });
    const identityText = `The arms are paired by seed; their puzzles per seed, from \`resultDigest\`: ${identical.map((x) => `${x.seed.split('/').at(-1)} ${x.identical === null ? 'not established (no digest)' : x.identical ? 'identical' : 'differ'}`).join(', ')}.${identical.every((x) => x.identical === true)
      ? ' The T1 comparison is between runs with the same results.'
      : identical.some((x) => x.identical === false) ? ' Where the puzzles differ, the T1 comparison is between runs with different results.' : ''}`;
    cell.a3 = { setStage: { main: sa3, a3: sb3 }, perRequest: bounds, puzzles: identical, t1: { main: t1Main, a3: t1A3 }, idealisedT1Bound: summarize(boundMs), kind: 'Projection: three idle lanes for each round of the winning set-stage call' };
    lines.push('', `### Arity-3 set stage on ${label(caseId)} (R20; a Projection, nothing is adopted)`, '',
      '| Set-stage figure | IGP-01 after (sequential bisection) | Arity 3 |', '|---|---:|---:|',
      `| Calls (finished, unfinished) | ${sa3.calls} (${sa3.finished}, ${sa3.unfinished}) | ${sb3.calls} (${sb3.finished}, ${sb3.unfinished}) |`,
      `| Probes per finished call: median / mean / max | ${fix(sa3.probesPerCall.median, 1)} / ${fix(sa3.probesPerCallMean, 2)} / ${fix(sa3.probesPerCall.max, 0)} | ${fix(sb3.probesPerCall.median, 1)} / ${fix(sb3.probesPerCallMean, 2)} / ${fix(sb3.probesPerCall.max, 0)} |`,
      `| Probes in all finished calls (every probe counted, wasted ones included) | ${sa3.probesTotal} | ${sb3.probesTotal} |`,
      `| Arity-3 probes, of them wasted (rated after the probe that ended the call) | - | ${sb3.a3Probes}, ${sb3.wastedProbes} |`,
      `| Rounds; serial ms median; critical ms median | - | ${sb3.rounds}; ${fix(sb3.serialMs.median, 0)}; ${fix(sb3.criticalMs.median, 0)} |`,
      `| Probes of unfinished calls (seen) | ${sa3.unfinishedProbes} | ${sb3.unfinishedProbes} |`,
      `| T1 measured, median s | ${sec(t1Main.median)} | ${sec(t1A3.median)} |`,
      `| T1 with the idealised call-level bound, median s (Projection) | - | ${sec(summarize(boundMs).median)} |`, '',
      '| Seed | T1 arity 3, s | Winning call ms | Rounds | Saving (Σ serial − critical), ms | Idealised T1 bound, s | Other set attempts in flight while the winning call ran |', '|---|---:|---:|---:|---:|---:|---:|');
    for (const x of bounds) {
      lines.push(`| ${x.seed.split('/').at(-1)} | ${sec(x.t1)} | ${fix(x.winnerMs, 0)} | ${x.rounds} | ${fix(x.savingMs, 0)} | ${sec(x.boundMs)} | ${x.attemptsInFlight ?? '-'} |`);
    }
    lines.push('', 'Assumption of the bound: for the call that produced the request\'s set (the lowest successful attempt), T1 minus the sum over its rounds of (serial − critical ms), as if three lanes were idle for each round; the real set stage already runs attempts in parallel on the pool and consumes them in order, so the figure is a lower bound on T1, not a measured gain. ' + identityText);
  }

  // The section values of the check-list.
  for (const [caseId, c] of Object.entries(cells)) {
    rows.R16 = { ...rows.R16, [caseId]: { least: c.perW.leastWorkRole, perW: c.perW.rows.map((/** @type {any} */ p) => ({ role: p.role, W: p.W, t10: p.t10, reached: `${p.reached} of ${p.requests}`, workWithSet: p.workWithSet.median, workWithoutSet: p.workWithoutSet.median })) } };
    rows.R18 = { ...rows.R18, [caseId]: c.perW.rows.map((/** @type {any} */ p) => ({ role: p.role, rerates: p.rerates, reRated: p.reRated })) };
    rows.R32 = { ...rows.R32, [caseId]: Object.fromEntries(Object.entries(c.arms).map(([r, a]) => [r, { puzzles: a.population.puzzles, share: a.population.share, position: a.population.position.median, central: a.population.centralShare }])) };
    if (c.split !== undefined) {
      rows.R33 = { ...rows.R33, [caseId]: { factors: c.split.factors, shift: c.shift } };
    }
    if (c.a3 !== undefined) {
      rows.R20 = { ...rows.R20, [caseId]: { setStage: c.a3.setStage, idealisedT1Bound: c.a3.idealisedT1Bound, t1: c.a3.t1 } };
    }
  }
  if (master?.w380Table !== undefined) {
    rows.R07 = { '26x26-master': master.w380Table };
  }
  for (const [caseId, byRole2] of Object.entries(armOnlyCells)) {
    rows.R27 = { ...rows.R27, [caseId]: Object.fromEntries(Object.entries(byRole2).map(([role, a]) => [role, { accepted: a.accepted, ratingCensored: a.ratingCensored, share: a.ratingCensoredShare }])) };
  }
  for (const [caseId, s] of Object.entries(bySeed)) {
    rows.R33 = { ...rows.R33, [caseId]: { ...rows.R33?.[caseId], screenBySeed: s.summary } };
  }
  return { json: { checks, cells, armOnly: armOnlyCells, screenBySeed: bySeed }, lines, rows };
}

// The factor study (IGP-04): P6 on today's search, and eight workers as an unadmitted upper bound.

const P7_ASSUMPTION = Object.freeze({ likely: 1.3, low: 1.1, high: 1.8 });
const ASSUMED_FIRST_PHASE = 1.9;
const UPPER_BOUND = 'unadmitted upper bound';
const MIB = 1024 * 1024;
/** IGP-01's after arm: the arm of `p1p5-main` in this study must reproduce its puzzles (`resultDigest`) on every seed. */
const IGP01_AFTER = Object.freeze({ task: 'IGP-01', arm: 'after' });
/** The arms of the study: P6 or not, eight workers or not, today's search or the prototype. */
const FACTOR_OF_VARIANT = Object.freeze(/** @type {Record<string, { p6: boolean, w8: boolean, search: string }>} */ ({
  log: { p6: false, w8: false, search: 'today\'s search' },
  'log-p6': { p6: true, w8: false, search: 'today\'s search' },
  'log-p6-w8': { p6: true, w8: true, search: 'today\'s search' },
  'p1p5-main': { p6: false, w8: false, search: 'the prototype (P1 to P5)' },
  'p1p5-main-p6-w8': { p6: true, w8: true, search: 'the prototype (P1 to P5)' },
}));

/**
 * What a pair of variants isolates: only P6, only the width, or both (a combined factor).
 * @param {string} beforeVariant
 * @param {string} afterVariant
 * @returns {{ kind: string, label: string }}
 */
function describePair(beforeVariant, afterVariant) {
  const b = FACTOR_OF_VARIANT[beforeVariant];
  const a = FACTOR_OF_VARIANT[afterVariant];
  if (b === undefined || a === undefined) {
    throw new Error(`no factor description for ${beforeVariant} against ${afterVariant}`);
  }
  const p6 = a.p6 !== b.p6;
  const w8 = a.w8 !== b.w8;
  if (p6 && w8) {
    return { kind: 'p6-w8', label: `P6 x eight workers combined, on ${a.search}: an ${UPPER_BOUND}, not P6 alone` };
  }
  if (p6) {
    return { kind: 'p6', label: `P6 alone, on ${a.search} at four workers: the isolated P6 factor` };
  }
  if (w8) {
    return { kind: 'w8', label: `eight workers alone, on ${a.search}: an ${UPPER_BOUND}, not P8 as IG-P-Q05 admits it` };
  }
  throw new Error(`${beforeVariant} and ${afterVariant} differ in neither P6 nor the width`);
}

/** @param {string} caseId @returns {string} The level of a cell id. */
const levelOf = (caseId) => (/-master$/.test(caseId) ? 'Master' : /-nightmare$/.test(caseId) ? 'Nightmare' : caseId);

/**
 * The paired factors of one cell: per matched seed the ratio of the first arm's time over the second's (above 1 is
 * faster in the second), with the requests that reached ten counted beside.
 * @param {any[]} xRows Rows of the first arm in the cell.
 * @param {any[]} yRows Rows of the second arm in the cell.
 */
function factorCell(xRows, yRows) {
  const seeds = xRows.filter((x) => yRows.some((y) => y.seed === x.seed)).map((x) => x.seed).sort();
  /** @type {Record<string, number[]>} */
  const ratios = { t10: [], t1: [], batch: [], response: [] };
  const perSeed = seeds.map((seed) => {
    const x = xRows.find((r) => r.seed === seed);
    const y = yRows.find((r) => r.seed === seed);
    const timed = !isCensored(x) && !isCensored(y);
    const ten = reachedTen(x) && reachedTen(y);
    const t1x = x.run.firstReadyMs ?? null;
    const t1y = y.run.firstReadyMs ?? null;
    if (ten) {
      ratios.t10.push(x.run.tenthReadyMs / y.run.tenthReadyMs);
    }
    if (timed && t1x !== null && t1y !== null) {
      ratios.t1.push(t1x / t1y);
    }
    if (ten && t1x !== null && t1y !== null && x.run.tenthReadyMs > t1x && y.run.tenthReadyMs > t1y) {
      ratios.batch.push((x.run.tenthReadyMs - t1x) / (y.run.tenthReadyMs - t1y));
    }
    if (timed) {
      ratios.response.push(x.run.responseMs / y.run.responseMs);
    }
    return {
      seed, accepted: [x.run.acceptedCount, y.run.acceptedCount], reachedTen: [reachedTen(x), reachedTen(y)],
      censored: [isCensored(x), isCensored(y)], t1Ms: [t1x, t1y], t10Ms: [x.run.tenthReadyMs ?? null, y.run.tenthReadyMs ?? null],
      responseMs: [x.run.responseMs, y.run.responseMs],
    };
  });
  const medianOf = (/** @type {any[]} */ rows, /** @type {string} */ key) => median(num(rows.filter((r) => seeds.includes(r.seed) && reachedTen(r)).map((r) => r.run[key])));
  return {
    seeds, ratios,
    factors: { t10: ratioStat(ratios.t10), t1: ratioStat(ratios.t1), batch: ratioStat(ratios.batch), response: ratioStat(ratios.response) },
    n: seeds.length,
    completion: { before: xRows.filter((r) => seeds.includes(r.seed) && reachedTen(r)).length, after: yRows.filter((r) => seeds.includes(r.seed) && reachedTen(r)).length, of: seeds.length },
    t10Median: { before: medianOf(xRows, 'tenthReadyMs'), after: medianOf(yRows, 'tenthReadyMs') },
    perSeed,
  };
}

/**
 * Identity of two arms on the matched seeds of a cell: prefix identity is required (every arm here runs a keyed tree);
 * a row cut at the child limit has no record to compare.
 * @param {any[]} xRows
 * @param {any[]} yRows
 * @param {string} names
 * @param {string[]} failures
 */
function pairIdentity(xRows, yRows, names, failures) {
  return xRows.filter((x) => yRows.some((y) => y.seed === x.seed)).map((x) => {
    const y = yRows.find((r) => r.seed === x.seed);
    if (isCensored(x) || isCensored(y)) {
      return { seed: x.seed, level: 'not compared (a row cut at the child limit has no record)', prefixIdentity: null };
    }
    const r = comparePair(x.run, y.run);
    const prefixIdentity = r.setKeyEqual === true && r.keyPrefixEqual === true;
    for (const problem of r.problems) {
      failures.push(`${x.seed} ${names}: ${problem}`);
    }
    if (!prefixIdentity) {
      failures.push(`${x.seed} ${names}: prefix identity is not established (set key equal ${r.setKeyEqual}, key prefix equal ${r.keyPrefixEqual})`);
    }
    return {
      seed: x.seed, level: r.level, prefixIdentity, digestEqual: r.digestEqual, accepted: [r.acceptedA, r.acceptedB], note: r.note,
    };
  });
}

/**
 * The key of a finished call without its times: two arms that made the same puzzles run the same calls with the same
 * probes, so a call of one arm has its twin in the other.
 * @param {any} c
 * @returns {string}
 */
const callKey = (c) => JSON.stringify([
  c.stage, c.start.attempt, c.start.level, c.start.K, c.start.A, c.start.startCount,
  c.tuples.map((/** @type {any} */ t) => [t.phase, t.count, t.outcome, t.score, t.work, t.flags]), c.end.result, c.end.clueCount, c.end.profiles,
]);

/**
 * P6's saving from the call journals: the rating ms of the twin calls without and with the diagnostic, the recomputed
 * diagnostic of the P6 arm (`p6Ms` of its end lines) added back, and the whole call ms.
 * @param {any} x The arm without P6.
 * @param {any} y The arm with P6.
 * @param {string} caseId
 * @param {string[]} seeds
 */
function workSaving(x, y, caseId, seeds) {
  let matched = 0;
  let unmatchedBefore = 0;
  let unmatchedAfter = 0;
  let ratingBefore = 0;
  let ratingAfter = 0;
  let recompute = 0;
  let callBefore = 0;
  let callAfter = 0;
  for (const seed of seeds) {
    const rx = x.rows.find((/** @type {any} */ r) => r.caseId === caseId && r.seed === seed);
    const ry = y.rows.find((/** @type {any} */ r) => r.caseId === caseId && r.seed === seed);
    const finished = (/** @type {any} */ c) => c.start !== null && c.end !== null;
    const before = (rx === undefined ? [] : x.byRow.get(rx.rowKey) ?? []).filter(finished);
    const after = (ry === undefined ? [] : y.byRow.get(ry.rowKey) ?? []).filter(finished);
    /** @type {Map<string, any[]>} */
    const pool = new Map();
    for (const c of after) {
      const key = callKey(c);
      pool.set(key, [...(pool.get(key) ?? []), c]);
    }
    for (const c of before) {
      const twin = pool.get(callKey(c))?.shift();
      if (twin === undefined) {
        unmatchedBefore += 1;
        continue;
      }
      matched += 1;
      ratingBefore += sum(num(c.tuples.map((/** @type {any} */ t) => t.ms)));
      ratingAfter += sum(num(twin.tuples.map((/** @type {any} */ t) => t.ms)));
      recompute += twin.end.p6Ms ?? 0;
      callBefore += c.end.ms;
      callAfter += twin.end.ms;
    }
    unmatchedAfter += [...pool.values()].reduce((s, list) => s + list.length, 0);
  }
  const withRecompute = ratingAfter + recompute;
  return {
    matchedCalls: matched, unmatchedBefore, unmatchedAfter, ratingMs: { before: Math.round(ratingBefore), after: Math.round(ratingAfter), recompute: Math.round(recompute) },
    ratingRatio: { gross: div(ratingBefore, ratingAfter), net: div(ratingBefore, withRecompute) },
    savingShare: ratingBefore === 0 ? null : 1 - withRecompute / ratingBefore,
    callMs: { before: Math.round(callBefore), after: Math.round(callAfter) }, callRatio: div(callBefore, callAfter),
  };
}

/**
 * Both bench memory criteria of an arm, with the constants of the arm's own tree: the accounted peak against workers x
 * `WORKER_LIMIT_BYTES` + `MAIN_BUDGET_BYTES`, and the whole-process peak against the bench criterion.
 * @param {any} arm
 */
async function memoryOf(arm) {
  const root = treeDir(arm.variant);
  const pool = await import(pathToFileURL(join(root, 'core', 'browser', 'worker-pool.js')).href);
  const report = await import(pathToFileURL(join(root, 'tools', 'bench', 'report.js')).href);
  const workers = Math.max(...arm.rows.map((/** @type {any} */ r) => r.run.workerCount));
  const accountedLimit = workers * pool.WORKER_LIMIT_BYTES + pool.MAIN_BUDGET_BYTES;
  const processLimit = report.CRITERIA.processBytes;
  const peak = (/** @type {string} */ key) => arm.rows.filter((/** @type {any} */ r) => typeof r.run[key] === 'number')
    .reduce((m, /** @type {any} */ r) => (m === null || r.run[key] > m.bytes ? { bytes: r.run[key], row: r.rowKey } : m), /** @type {{ bytes: number, row: string } | null} */ (null));
  const accounted = peak('peakAccountedBytes');
  const process = peak('peakProcessBytes');
  /** @type {Record<string, { rows: number, maxAccounted: number | null, maxProcess: number | null }>} */
  const perCell = {};
  for (const r of arm.rows) {
    const c = (perCell[r.caseId] ??= { rows: 0, maxAccounted: null, maxProcess: null });
    c.rows += 1;
    c.maxAccounted = Math.max(c.maxAccounted ?? 0, r.run.peakAccountedBytes ?? 0);
    c.maxProcess = r.run.peakProcessBytes === null || r.run.peakProcessBytes === undefined ? c.maxProcess : Math.max(c.maxProcess ?? 0, r.run.peakProcessBytes);
  }
  const passAccounted = accounted === null ? null : accounted.bytes <= accountedLimit;
  const passProcess = process === null ? null : process.bytes <= processLimit;
  return {
    variant: arm.variant, workers, rows: arm.rows.length, maxPoolSize: pool.MAX_POOL_SIZE, workerLimitBytes: pool.WORKER_LIMIT_BYTES, mainBudgetBytes: pool.MAIN_BUDGET_BYTES,
    accountedLimit, maxAccounted: accounted?.bytes ?? null, maxAccountedRow: accounted?.row ?? null, passAccounted,
    processLimit, maxProcess: process?.bytes ?? null, maxProcessRow: process?.row ?? null, passProcess,
    pass: passAccounted === true && passProcess === true, worstCaseOverProcessLimit: accountedLimit > processLimit, perCell,
  };
}

/**
 * Arm E against IGP-01's after arm: the same puzzles on every seed (`resultDigest` equal at equal accepted counts; the
 * keys and the set key equal as well). A difference is a stop. With `commonOnly` (IGP-03h) the seeds that the reference arm
 * never ran are left out and listed (an arm that ran more seeds than the reference).
 * @param {any} e The arm (variant p1p5-main) of this study.
 * @param {any} ref IGP-01's after arm.
 * @param {boolean} [commonOnly]
 */
export function reproduction(e, ref, commonOnly = false) {
  const all = e.rows.map((/** @type {any} */ r) => ({ caseId: r.caseId, seed: r.seed })).sort((/** @type {any} */ a, /** @type {any} */ b) => (a.seed < b.seed ? -1 : 1));
  const seeds = commonOnly ? all.filter(({ seed }) => ref.rows.some((/** @type {any} */ r) => r.seed === seed)) : all;
  const skipped = all.filter((s) => !seeds.includes(s)).map((s) => s.seed);
  const perSeed = seeds.map(({ caseId, seed }) => {
    const mine = e.rows.find((/** @type {any} */ r) => r.seed === seed);
    const theirs = ref.rows.find((/** @type {any} */ r) => r.seed === seed);
    if (theirs === undefined) {
      return { caseId, seed, ok: false, note: `no row of this seed in ${IGP01_AFTER.task}/${IGP01_AFTER.arm}` };
    }
    const r = comparePair(theirs.run, mine.run);
    const ok = r.countsEqual && r.digestEqual === true && r.setKeyEqual !== false && r.keyPrefixEqual !== false;
    return {
      caseId, seed, ok, accepted: { igp01: r.acceptedA, arm: r.acceptedB }, digestEqual: r.digestEqual, setKeyEqual: r.setKeyEqual,
      keysEqual: r.keyPrefixEqual, resultDigest: mine.run.details?.resultDigest ?? null, note: r.note,
    };
  });
  return { reference: `${IGP01_AFTER.task}/${IGP01_AFTER.arm}`, ok: perSeed.length > 0 && perSeed.every((s) => s.ok), perSeed, skipped };
}

/**
 * The first-phase factor (R25): the T10 factor of the combined pair times the P7 assumption, a Projection, against ÷1.9.
 * @param {any} pair A pair with both P6 and eight workers.
 */
function firstPhaseOf(pair) {
  const project = (/** @type {number | null} */ f) => (f === null ? null : {
    likely: f * P7_ASSUMPTION.likely, low: f * P7_ASSUMPTION.low, high: f * P7_ASSUMPTION.high,
    p7NeededFor19: ASSUMED_FIRST_PHASE / f, aboveAssumptionLikely: f * P7_ASSUMPTION.likely >= ASSUMED_FIRST_PHASE,
  });
  return {
    pair: pair.name, label: pair.label,
    cells: Object.fromEntries(Object.entries(pair.cells).map(([id, c]) => [id, { n: c.factors.t10.n, t10: c.factors.t10, projection: project(c.factors.t10.median) }])),
    levels: Object.fromEntries(Object.entries(pair.levels).map(([id, f]) => [id, { n: f.t10.n, t10: f.t10, projection: project(f.t10.median) }])),
  };
}

/**
 * @param {{ task: string, label: string, args: Record<string, string>, arms: Record<string, any>, pairNames: string[][],
 *   failures: string[], meta: any, appendCostMs: number | null, out: (name: string) => string }} o
 * @returns {Promise<number>}
 */
export async function factorMain({ task, label, arms, pairNames, failures, meta, appendCostMs, out }) {
  /** @type {any[]} */
  const pairs = [];
  for (const [beforeToken, afterToken] of pairNames) {
    const before = arms[beforeToken];
    const after = arms[afterToken];
    const { kind, label: pairLabel } = describePair(before.variant, after.variant);
    const caseIds = [...new Set(before.rows.map((/** @type {any} */ r) => r.caseId))].filter((id) => after.rows.some((/** @type {any} */ r) => r.caseId === id))
      .sort((a, b) => HEADLINE.findIndex((h) => h.id === a) - HEADLINE.findIndex((h) => h.id === b));
    /** @type {Record<string, any>} */
    const cells = {};
    /** @type {Record<string, Record<string, number[]>>} */
    const pooled = {};
    for (const caseId of caseIds) {
      const xRows = before.rows.filter((/** @type {any} */ r) => r.caseId === caseId);
      const yRows = after.rows.filter((/** @type {any} */ r) => r.caseId === caseId);
      const cell = factorCell(xRows, yRows);
      const { ratios, ...rest } = cell;
      cells[caseId] = {
        ...rest, label: pairLabel, identity: pairIdentity(xRows, yRows, `${beforeToken}~${afterToken}`, failures),
        ...(kind === 'p6' ? { workSaving: workSaving(before, after, caseId, cell.seeds) } : {}),
      };
      const level = (pooled[levelOf(caseId)] ??= { t10: [], t1: [], batch: [], response: [] });
      for (const key of Object.keys(level)) {
        level[key].push(...ratios[key]);
      }
    }
    const levels = Object.fromEntries(Object.entries(pooled).map(([id, r]) => [id, {
      t10: ratioStat(r.t10), t1: ratioStat(r.t1), batch: ratioStat(r.batch), response: ratioStat(r.response),
    }]));
    const workers = (/** @type {any} */ arm) => Math.max(...arm.rows.map((/** @type {any} */ r) => r.run.workerCount));
    pairs.push({
      name: `${beforeToken}:${afterToken}`, before: before.name, after: after.name, kind, label: pairLabel,
      variants: { before: before.variant, after: after.variant }, workers: { before: workers(before), after: workers(after) },
      journal: { before: before.source, after: after.source }, cells, levels,
    });
  }
  const pairBy = (/** @type {string} */ b, /** @type {string} */ a) => pairs.find((p) => p.variants.before === b && p.variants.after === a);
  const today = pairBy('log', 'log-p6-w8');
  const prototype = pairBy('p1p5-main', 'p1p5-main-p6-w8');
  const firstPhase = {
    measured: { today: today === undefined ? null : firstPhaseOf(today), prototype: prototype === undefined ? null : firstPhaseOf(prototype) },
    p7Assumption: P7_ASSUMPTION, projection: 'measured T10 factor of the combined pair x the P7 assumption (P7 is not prototyped: IGP-06 gives a sensitivity)',
    against: ASSUMED_FIRST_PHASE, kind: `Projection; every eight-worker figure is an ${UPPER_BOUND}`,
  };

  /** @type {Record<string, any>} */
  const memory = {};
  for (const token of [...new Set(pairNames.flat())]) {
    memory[arms[token].name] = await memoryOf(arms[token]);
  }
  const eToken = Object.keys(arms).find((t) => arms[t].variant === 'p1p5-main' && arms[t].task === task);
  const reference = eToken === undefined ? null : loadArm(label, IGP01_AFTER.task, IGP01_AFTER.arm);
  const reproduced = eToken === undefined || reference === null ? null : { arm: arms[eToken].name, ...reproduction(arms[eToken], reference) };
  if (reproduced !== null && !reproduced.ok) {
    failures.push(`arm ${reproduced.arm} does not reproduce ${reproduced.reference}: ${reproduced.perSeed.filter((s) => !s.ok).map((s) => `${s.seed} (${s.note})`).join('; ')}`);
  }
  /** @type {Record<string, any>} */
  const mp12 = {};
  for (const token of Object.keys(arms).filter((t) => arms[t].variant === 'log')) {
    const arm = arms[token];
    for (const caseId of [...new Set(arm.rows.map((/** @type {any} */ r) => r.caseId))]) {
      const seeds = arm.rows.filter((/** @type {any} */ r) => r.caseId === caseId).map((/** @type {any} */ r) => r.seed);
      const mp = mp12Cell(/** @type {string} */ (caseId), seeds);
      mp12[arm.name] ??= {};
      mp12[arm.name][caseId] = arm.rows.filter((/** @type {any} */ r) => r.caseId === caseId).map((/** @type {any} */ row) => {
        const run = mp?.runs.find((/** @type {any} */ r) => r.seed === row.seed);
        if (run === undefined || isCensored(row)) {
          return { seed: row.seed, level: run === undefined ? 'no MP12b1 run' : 'not compared (a row cut at the child limit)' };
        }
        const result = comparePair(run, row.run);
        for (const problem of result.problems) {
          failures.push(`${row.seed} mp12b1~${arm.name}: ${problem}`);
        }
        return { seed: row.seed, level: result.level, countsEqual: result.countsEqual, note: result.note };
      });
    }
  }

  /** @type {Record<string, { value: any, kind: string, formula: string }>} */
  const rows = {};
  const slim = (/** @type {any} */ p, /** @type {string[]} */ keys) => p === undefined ? null : {
    pair: p.name, label: p.label,
    cells: Object.fromEntries(Object.entries(p.cells).map(([id, c]) => [id, { n: c.n, completion: c.completion, ...Object.fromEntries(keys.map((k) => [k, c.factors[k]])) }])),
    levels: Object.fromEntries(Object.entries(p.levels).map(([id, f]) => [id, Object.fromEntries(keys.map((k) => [k, f[k]]))])),
  };
  const isolated = pairBy('log', 'log-p6');
  rows.R22 = {
    value: { ...slim(isolated, ['t10', 'response']), workSaving: isolated === undefined ? null : Object.fromEntries(Object.entries(isolated.cells).map(([id, c]) => [id, c.workSaving])) },
    kind: 'Measured; ratios Derived', formula: 'median of the paired per-seed T10 ratios A / B (both reached ten) on matched seeds, per cell and per level; the work saving from the twin calls of the journals',
  };
  rows.R23 = {
    value: { label: `eight workers: ${UPPER_BOUND}`, widthAlone: slim(pairBy('log-p6', 'log-p6-w8'), ['t10', 't1', 'batch']), p6AndWidth: slim(today, ['t10', 't1', 'batch']) },
    kind: 'Measured; ratios Derived', formula: 'paired per-seed ratios B / C (the width alone) and A / C (P6 x the width): T10, T1 (the set stage) and T10 - T1 (the batch)',
  };
  rows.R25 = { value: firstPhase, kind: 'Projection (P7 assumed)', formula: 'the T10 factor of A:C and of E:F x the P7 assumption 1.3 (1.1 to 1.8), against ÷1.9' };
  rows.R26 = {
    value: Object.fromEntries(Object.entries(memory).map(([arm, m]) => [arm, {
      workers: m.workers, accountedLimit: m.accountedLimit, maxAccounted: m.maxAccounted, processLimit: m.processLimit, maxProcess: m.maxProcess, pass: m.pass,
    }])),
    kind: 'Measured', formula: 'the largest peakAccountedBytes of the rows against workers x WORKER_LIMIT_BYTES + MAIN_BUDGET_BYTES, and the largest peakProcessBytes against 1.5 GiB',
  };

  writeJson(out('compare.json'), {
    meta, pairs, firstPhase, memory, reproduction: reproduced, identityMp12b1: mp12, rows,
    journal: { appendCostMs }, failures,
  });

  const ratioCells = (/** @type {any} */ f) => [ratioText(f.t10), ratioText(f.t1), ratioText(f.batch), ratioText(f.response)];
  const verdict = failures.length === 0
    ? 'every required identity holds (prefix identity between the arms of each pair on every seed; arm E equals IGP-01\'s after arm; arm A agrees with MP12b1)'
    : `FAILURES: ${failures.length}`;
  const lines = [`# ${task} comparison: the first-phase factor (P6 and eight workers)`, '', banner(meta), '',
    'Provisional (pre-freeze) numbers. Times are *Measured*; every factor is *Derived*: the median of the per-seed ratios first arm / second arm on matched seeds only (above 1 is faster in the second arm), with n beside, and no factor estimate below n = 3; completion ("ten of n") is always beside a time. The first-phase factor is a *Projection*: P7 is assumed, not prototyped.', '',
    '**Labels.** Only A:B isolates P6 (today\'s search, four workers, the fast cells). B:C is the width alone, A:C is P6 and the width together on today\'s search, and E:F is P6 and the width together on the prototype: neither is P6 alone. Every eight-worker figure is an **unadmitted upper bound**: it raises `MAX_POOL_SIZE` to 8 without IG-P-Q05\'s width rule (above four only with `deviceMemory` of at least 8) and without its admission rule (a task is admitted only when its workspace ceiling times the width plus the main budget fits both memory checks); it is not the accepted P8 policy.', '',
    `Identity: ${verdict}.`, ''];
  if (reproduced !== null) {
    lines.push(`## Arm ${reproduced.arm} against ${reproduced.reference}`, '',
      reproduced.ok ? 'The prototype\'s default path reproduces IGP-01\'s after arm: the puzzles are equal on every seed.' : '**The arm does not reproduce IGP-01\'s after arm: a stop.**', '',
      '| Seed | Accepted (IGP-01 / this arm) | `resultDigest` equal | Set key equal | Puzzle keys equal | Result |', '|---|---|---|---|---|---|');
    for (const s of reproduced.perSeed) {
      lines.push(`| ${s.seed} | ${s.accepted === undefined ? '-' : `${s.accepted.igp01} / ${s.accepted.arm}`} | ${s.digestEqual ?? '-'} | ${s.setKeyEqual ?? '-'} | ${s.keysEqual ?? '-'} | ${s.ok ? 'equal' : `DIFFERS: ${s.note}`} |`);
    }
    lines.push('');
  }
  for (const p of pairs) {
    lines.push(`## ${p.name}: ${p.label}`, '',
      `First arm ${p.before} (${p.variants.before}, ${p.workers.before} workers), second arm ${p.after} (${p.variants.after}, ${p.workers.after} workers). Ratios are first / second.`, '',
      '| Cell | Matched seeds | Ten of n (first / second) | T10 factor (median [min-max] n) | T1 factor (the set stage) | T10 - T1 factor (the batch) | Response factor | T10 median, s (first → second) | Identity |',
      '|---|---:|---|---|---|---|---|---|---|');
    for (const h of HEADLINE) {
      const c = p.cells[h.id];
      if (c === undefined) {
        continue;
      }
      const prefix = c.identity.filter((/** @type {any} */ i) => i.prefixIdentity === true).length;
      lines.push(`| ${h.label} | ${c.n} | ${c.completion.before} / ${c.completion.after} of ${c.completion.of} | ${ratioCells(c.factors).join(' | ')} | ${sec(c.t10Median.before)} → ${sec(c.t10Median.after)} | prefix identity ${prefix} of ${c.identity.length} |`);
    }
    lines.push('', 'By level (the per-seed ratios of its cells pooled): ' + Object.entries(p.levels).map(([id, f]) => `${id}: T10 ${ratioText(/** @type {any} */ (f).t10)}; T1 ${ratioText(/** @type {any} */ (f).t1)}; batch ${ratioText(/** @type {any} */ (f).batch)}`).join('; ') + '.', '');
  }
  const isolatedPair = isolated;
  if (isolatedPair !== undefined) {
    lines.push(`## P6's work saving, from the call journals of ${isolatedPair.before} and ${isolatedPair.after}`, '',
      'Twin calls are finished calls with the same stage, attempt, start line and probe sequence (the arms made the same puzzles, so most calls have a twin; a call without a twin is a timing effect at the end of a request and is left out). Rating ms is the sum of the probes\' times; "with the recomputed diagnostic" adds the one `solveFirst` of each ok call that P6 puts back (`p6Ms`). The ratios are rating ms without P6 / with P6, a finer measure than the request ratio.', '',
      '| Cell | Twin calls (unmatched first / second) | Rating ms without P6 | Rating ms with P6 (+ recomputed) | Rating ratio, probes only | Rating ratio, net of the recomputed diagnostic | Share of rating ms saved (net) | Whole-call ms ratio |', '|---|---:|---:|---:|---:|---:|---:|---:|');
    for (const h of HEADLINE) {
      const w = isolatedPair.cells[h.id]?.workSaving;
      if (w !== undefined) {
        lines.push(`| ${h.label} | ${w.matchedCalls} (${w.unmatchedBefore} / ${w.unmatchedAfter}) | ${w.ratingMs.before} | ${w.ratingMs.after} (+ ${w.ratingMs.recompute}) | ${fix(w.ratingRatio.gross, 3)} | ${fix(w.ratingRatio.net, 3)} | ${pct(w.savingShare, 1)} | ${fix(w.callRatio, 3)} |`);
      }
    }
    lines.push('');
  }
  lines.push('## The first-phase factor (R25): a Projection', '',
    `The report's "after first phase" column divides today's times by ${ASSUMED_FIRST_PHASE} (Opus's illustrative assumption: P6, P7 and P8 together). Here the measured T10 factor of the combined pair (P6 x eight workers, an **${UPPER_BOUND}**) is multiplied by the P7 assumption ${P7_ASSUMPTION.likely} (range ${P7_ASSUMPTION.low} to ${P7_ASSUMPTION.high}); P7 is not prototyped (IGP-06 gives a sensitivity). "P7 needed" is the P7 factor at which the measured factor reaches ÷${ASSUMED_FIRST_PHASE}.`, '',
    '| Search | Cell or level | Measured T10 factor (median [min-max] n) | Projection with P7 1.3 (1.1-1.8) | P7 needed for ÷1.9 | Against ÷1.9 |', '|---|---|---|---|---:|---|');
  for (const [search, fp] of [['today (A:C)', firstPhase.measured.today], ['prototype (E:F)', firstPhase.measured.prototype]]) {
    if (fp === null) {
      continue;
    }
    const entries = [...HEADLINE.filter((h) => fp.cells[h.id] !== undefined).map((h) => [h.label, fp.cells[h.id]]), ...Object.entries(fp.levels).map(([id, f]) => [`${id} (pooled)`, f])];
    for (const [name, f] of entries) {
      const q = f.projection;
      lines.push(`| ${search} | ${name} | ${ratioText(f.t10)} | ${q === null ? '-' : `${fix(q.likely)} (${fix(q.low)}-${fix(q.high)})`} | ${q === null ? '-' : q.p7NeededFor19 <= 1 ? 'none needed' : fix(q.p7NeededFor19)} | ${q === null ? '-' : q.likely >= ASSUMED_FIRST_PHASE ? 'at or above ÷1.9' : 'below ÷1.9'} |`);
    }
  }
  lines.push('', `Every figure of the eight-worker arms is an ${UPPER_BOUND}.`, '',
    '## Memory at four and eight workers (R26)', '',
    'Both bench criteria, per arm, on every row: the accounted peak against workers x `WORKER_LIMIT_BYTES` + `MAIN_BUDGET_BYTES` (the constants of the arm\'s own tree), and the whole-process peak against 1.5 GiB. The accounted limit is also the worst case that eight 224 MiB workspace ceilings and the main budget can reach.', '',
    '| Arm | Variant | Workers | Rows | Accounted max / limit, MiB | Accounted | Process max / limit, MiB | Process | Both | Worst case (limit) above the process limit |', '|---|---|---:|---:|---|---|---|---|---|---|');
  for (const [name, m] of Object.entries(memory)) {
    const verdictOf = (/** @type {boolean | null} */ v) => (v === null ? 'not measured' : v ? 'pass' : 'FAIL');
    lines.push(`| ${name} | ${m.variant} | ${m.workers} | ${m.rows} | ${m.maxAccounted === null ? '-' : (m.maxAccounted / MIB).toFixed(0)} / ${(m.accountedLimit / MIB).toFixed(0)} | ${verdictOf(m.passAccounted)} | ${m.maxProcess === null ? '-' : (m.maxProcess / MIB).toFixed(0)} / ${(m.processLimit / MIB).toFixed(0)} | ${verdictOf(m.passProcess)} | ${m.pass ? 'pass' : 'not both'} | ${m.worstCaseOverProcessLimit ? 'yes' : 'no'} |`);
  }
  lines.push('', 'Largest peaks by arm and cell, MiB (accounted / process): ' + Object.entries(memory).map(([name, m]) => `${name}: ${Object.entries(m.perCell).map(([id, c]) => `${id} ${c.maxAccounted === null ? '-' : (c.maxAccounted / MIB).toFixed(0)} / ${c.maxProcess === null ? '-' : (c.maxProcess / MIB).toFixed(0)}`).join(', ')}`).join('; ') + '.');
  lines.push('', '## Agreement with MP12b1 (arm A)', '');
  for (const [name, cellsOf] of Object.entries(mp12)) {
    for (const [caseId, list] of Object.entries(/** @type {Record<string, any[]>} */ (cellsOf))) {
      lines.push(`- ${name} ${caseId}: ${list.map((i) => `seed ${i.seed.split('/').at(-1)}: ${i.note ?? i.level}`).join('; ')}.`);
    }
  }
  lines.push('', '## Values of the §5 rows', '', '| Row | Kind | Formula | Value |', '|---|---|---|---|');
  for (const [id, r] of Object.entries(rows)) {
    lines.push(`| ${id} | ${r.kind} | ${r.formula} | \`${JSON.stringify(r.value)}\` |`);
  }
  const names = [...new Set(pairNames.flat())].map((t) => arms[t]);
  lines.push('', '## Journal', '',
    `Journal lines (appends): ${names.map((a) => `${a.name} ${a.lines}`).join(', ')}. Measured cost of one append (self-test): ${appendCostMs === null ? 'not measured' : `${appendCostMs} ms`}. Journal sources: ${[...new Set(pairs.flatMap((p) => [...p.journal.before, ...p.journal.after]))].join('; ')}. The P6 arms (B, C, F) also journal the accepted ratings of their ok calls (\`logAccepted\`), which arm A does not.`);
  if (failures.length > 0) {
    lines.push('', '## Failures', '', ...failures.map((f) => `- ${f}`));
  }
  writeText(out('compare.md'), lines.join('\n'));
  process.stdout.write(`compare: ${verdict}\n`);
  return failures.length === 0 ? 0 : 1;
}

/**
 * @param {string} text
 * @param {string} task
 * @returns {{ name: string, task: string, arm: string }} An arm of the task, or `<task>/<arm>`.
 */
function parseArm(text, task) {
  const at = text.indexOf('/');
  const [t, a] = at < 0 ? [task, text] : [text.slice(0, at), text.slice(at + 1)];
  return { name: t === task ? a : `${t}/${a}`, task: t, arm: a };
}

/**
 * The check after arm E (IGP-04): its puzzles must equal IGP-01's after arm on every seed; exit 1 is a stop.
 * @param {string} task
 * @param {string} label
 * @param {string} text `<arm>:<task>/<arm>`
 * @param {boolean} commonOnly Compare only the seeds that both arms ran (IGP-03h).
 * @returns {number}
 */
function reproduceCommand(task, label, text, commonOnly) {
  const [mine, theirs] = text.split(':');
  const a = parseArm(mine, task);
  const r = parseArm(theirs, task);
  const result = reproduction(loadArm(label, a.task, a.arm), loadArm(label, r.task, r.arm), commonOnly);
  for (const s of result.perSeed) {
    process.stdout.write(`compare: ${s.seed}: ${s.ok ? 'puzzles equal' : `DIFFERS (${s.note})`}\n`);
  }
  if (result.skipped.length > 0) {
    process.stdout.write(`compare: not compared (${result.reference} never ran them): ${result.skipped.join(', ')}\n`);
  }
  process.stdout.write(`compare: arm ${a.name} ${result.ok ? 'reproduces' : 'DOES NOT reproduce'} ${result.reference} on ${result.perSeed.length} seed(s)\n`);
  return result.ok ? 0 : 1;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const { args, on } = parseArgs(argv, { values: ['task', 'pairs', 'label', 'reference', 'pm4', 'pm1', 'source-label', 'out-dir', 'reproduce'], switches: ['common-seeds'] });
  for (const name of args.reproduce === undefined ? ['task', 'pairs', 'label'] : ['task', 'label']) {
    if (args[name] === undefined) {
      throw new Error(`--${name} is required`);
    }
  }
  const { task, label } = args;
  if (args.reproduce !== undefined) {
    return reproduceCommand(task, label, args.reproduce, on.has('common-seeds'));
  }
  const out = (/** @type {string} */ name) => (args['out-dir'] === undefined ? evidenceDir(label, task, name) : join(args['out-dir'], name));
  /** @type {string[]} */
  const failures = [];
  const digest = await worktreeDigest();
  if (label === 'provisional' && digest !== MP12B1_DIGEST) {
    failures.push(`the worktree's source digest ${digest} differs from MP12b1's ${MP12B1_DIGEST}`);
  }
  const pairNames = args.pairs.split(',').map((p) => p.split(':'));
  const armNames = [...new Set(pairNames.flat())];
  const study = armNames.some((a) => a.includes('/'));
  const arms = Object.fromEntries(armNames.map((a) => {
    const parsed = parseArm(a, task);
    return [a, { ...loadArm(label, parsed.task, parsed.arm), ...parsed }];
  }));
  const pm4 = args.pm4 === undefined ? null : JSON.parse(readFileSync(evidenceDir(label, args.pm4, 'pm4.json'), 'utf8'));
  const pm1 = args.pm1 === undefined ? null : JSON.parse(readFileSync(evidenceDir(label, args.pm1, 'pm1.json'), 'utf8'));
  const meta = await buildMeta({ task, label, kind: 'compare', trees: [...new Set(armNames.map((a) => arms[a].variant))], sourceLabel: args['source-label'] });
  const stateFile = join(artifactDir(label, task, 'self-test'), 'state.json');
  const appendCostMs = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')).appendCostMs ?? null : null;

  const factorVariants = pairNames.map(([, after]) => FACTOR_OF_VARIANT[arms[after].variant]);
  if (!study && factorVariants.some((f) => f !== undefined && (f.p6 || f.w8))) {
    return factorMain({ task, label, arms, pairNames, failures, meta, appendCostMs, out });
  }

  const pairs = [];
  for (const [beforeToken, afterToken] of pairNames) {
    const before = arms[beforeToken];
    const after = arms[afterToken];
    const beforeName = before.name;
    const afterName = after.name;
    const afterCases = new Set(after.rows.map((/** @type {any} */ r) => r.caseId));
    const caseIds = [...new Set(before.rows.map((r) => r.caseId))].filter((id) => afterCases.has(id)).sort((a, b) => {
      const order = HEADLINE.map((h) => h.id);
      return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
    });
    /** @type {Record<string, any>} */
    const cells = {};
    for (const caseId of caseIds) {
      const matched = (/** @type {any} */ x, /** @type {any} */ y) => x.rows.filter((/** @type {any} */ r) => r.caseId === caseId && y.rows.some((/** @type {any} */ o) => o.caseId === caseId && o.seed === r.seed));
      const b = matched(before, after);
      const a = matched(after, before);
      const paired = pairedCell(b, a);
      const mp = mp12Cell(caseId, b.map((r) => r.seed));
      const bs = armCell(b, before.byRow);
      const identity = before.variant !== 'log' ? [] : b.map((row) => {
        const run = mp?.runs.find((/** @type {any} */ r) => r.seed === row.seed);
        if (run === undefined) {
          return { seed: row.seed, level: 'no MP12b1 run' };
        }
        const result = comparePair(run, row.run);
        for (const p of result.problems) {
          failures.push(`${row.seed} mp12b1~${beforeName}: ${p}`);
        }
        return { seed: row.seed, level: result.level, countsEqual: result.countsEqual, acceptedMp12b1: result.acceptedA, acceptedBefore: result.acceptedB, note: result.note };
      });
      const drift = b.map((row) => div(row.run.responseMs, mp?.runs.find((/** @type {any} */ r) => r.seed === row.seed)?.responseMs ?? null)).filter((x) => x !== null);
      cells[caseId] = {
        mp12b1: mp === null ? null : { report: mp.report, all: mp.all, matched: mp.matched },
        before: bs, after: armCell(a, after.byRow), paired, drift: { ratios: drift, median: median(/** @type {number[]} */ (drift)) }, identity,
        seeds: b.map((row) => {
          const ar = a.find((r) => r.seed === row.seed);
          const mr = mp?.runs.find((/** @type {any} */ r) => r.seed === row.seed);
          const brief = (/** @type {any} */ r) => (r === undefined ? null : { accepted: r.run.acceptedCount, t1: r.run.firstReadyMs ?? null, t10: r.run.tenthReadyMs ?? null, response: r.run.responseMs, partial: r.run.partialReason ?? null, censored: isCensored(r) });
          return { seed: row.seed, mp12b1: mr === undefined ? null : { accepted: mr.acceptedCount, t1: mr.firstReadyMs ?? null, t10: mr.tenthReadyMs ?? null, response: mr.responseMs }, before: brief(row), after: brief(ar) };
        }),
      };
    }
    pairs.push({ before: beforeName, after: afterName, variants: { before: before.variant, after: after.variant }, journal: { before: before.source, after: after.source }, cells });
  }

  const first = pairs[0];
  const cell = (/** @type {string} */ id) => first.cells[id];
  /** @type {Record<string, { value: any, kind: string, formula: string }>} */
  const rows = {};
  const pick = (/** @type {string[]} */ ids, /** @type {(c: any) => any} */ fn) => Object.fromEntries(ids.filter((id) => cell(id) !== undefined).map((id) => [id, fn(cell(id))]));
  if (!study) {
    rows.R01 = { value: pick(['14x14-nightmare'], (c) => ({ today: c.mp12b1?.all.t10, reRunBefore: c.before.t10, reached: `${c.before.reached} of ${c.before.requests}`, responseDriftMedian: c.drift.median })), kind: 'Measured; drift Derived', formula: 'before arm T10 on reps 0-2 beside MP12b1 (20 reps); drift = median of before response / MP12b1 response on the same seeds' };
    rows.R02 = { value: pick(['14x14-nightmare'], (c) => ({ afterT10: c.after.t10, pairedT10Ratio: c.paired.t10Ratio })), kind: 'Measured; ratio Derived', formula: 'after arm T10 median (n of 3); ratio = before T10 / after T10 per seed, both reached ten' };
    rows.R03 = { value: pick(['12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare'], (c) => ({ before: `${c.before.reached} of ${c.before.requests}`, after: `${c.after.reached} of ${c.after.requests}`, censored: c.after.censored })), kind: 'Measured', formula: 'requests that reached ten / requests, reps 0-2' };
    rows.R04 = { value: pick(['15x15b10-nightmare'], (c) => ({ afterT10: c.after.t10, pairedT10Ratio: c.paired.t10Ratio })), kind: 'Measured; ratio Derived', formula: 'as R02' };
    rows.R05 = { value: pick(['12x12-nightmare'], (c) => ({ afterT10: c.after.t10, pairedT10Ratio: c.paired.t10Ratio })), kind: 'Measured; ratio Derived', formula: 'as R02' };
    rows.R06 = { value: pick(['26x26-nightmare'], (c) => ({ afterT10: c.after.t10, pairedT10Ratio: c.paired.t10Ratio })), kind: 'Measured; ratio Derived', formula: 'as R02 (reps 0-5)' };
    rows.R07 = { value: pick(['14x14-master', '26x26-master'], (c) => ({ beforeT10: c.before.t10, afterT10: c.after.t10, pairedT10Ratio: c.paired.t10Ratio })), kind: 'Measured; ratio Derived', formula: 'before and after T10 medians (reps 0-4)' };
    rows.R08 = { value: pick(['26x26-hell-1'], (c) => ({ afterT10: c.after.t10, reached: `${c.after.reached} of ${c.after.requests}`, beforeReached: `${c.before.reached} of ${c.before.requests}`, pairedT10Ratio: c.paired.t10Ratio })), kind: 'Measured; ratio Derived', formula: 'as R02, ten of n beside' };
    rows.R10 = { value: pick(Object.keys(first.cells), (c) => c.before.deadEnd), kind: 'Derived', formula: 'calls with a p2 phase entry / calls; sum of the p2 tuples ms / sum of all tuples ms; batch, set and both (before arm)' };
    rows.R11 = { value: pick(Object.keys(first.cells), (c) => c.after.deadEnd), kind: 'Derived', formula: 'the same on the after arm (p2 entries per call)' };
    rows.R12 = { value: pick(Object.keys(first.cells), (c) => ({ before: c.before.windowProfiles, after: c.after.windowProfiles })), kind: 'Measured', formula: 'per ok call: before all tuples, after tuples of phases window, p2, beam, rerate; median' };
    rows.R13 = { value: pick(Object.keys(first.cells), (c) => ({ before: c.before.waves, after: c.after.waves })), kind: 'Derived (a proxy)', formula: 'per request that reached ten: (T10 - T1) / median ms of its ok batch calls; median' };
    rows.R18 = { value: pick(Object.keys(first.cells), (c) => c.after.rerates), kind: 'Derived', formula: 'rescue and rerate tuples per finished call; their share of the summed tuple ms and work' };
    rows.R19 = { value: pick(Object.keys(first.cells), (c) => c.after.locate), kind: 'Measured', formula: 'locate probes per finished call (median, p90) and the locate results and no-window proofs' };
    rows.R29 = { value: pick(Object.keys(first.cells), (c) => c.before.startCountCapped), kind: 'Derived', formula: 'p1 tuples at the call start count that are capped / all p1 tuples at it (before arm, every stage)' };
  }
  const studyResult = study ? buildStudy({ arms, task, pm4, pm1, failures }) : null;
  if (studyResult !== null) {
    const kinds = { R07: 'Measured; ratio Derived', R16: 'Measured; Derived', R18: 'Derived', R20: 'Measured; the T1 bound is a Projection', R27: 'Measured; Derived', R32: 'Measured; Derived', R33: 'Measured; ratios Derived' };
    const formulas = {
      R07: '26x26 Master reps 0-4: T10 before, IGP-01 after (190 M) and 380 M, per-seed ratios',
      R16: 'median work per accepted puzzle (batch and completion; with the set stage) per W and cell; the W with the least median is descriptive',
      R18: 're-ratings per call and their share of the work; re-rated probes in band per W and cell',
      R20: 'set-stage probes per call (wasted included), rounds, serial and critical ms, the idealised call-level T1 bound and the measured T1',
      R27: 'accepted puzzles of an arm-only cell whose rating is an estimate (`ratingCensoredCount`) / accepted puzzles',
      R32: 'population of the accepted puzzles per W and cell (clue share p10 / median / p90, position, central share)',
      R33: 'paired factors before -> no screen -> 190 M with their n, the two parts of the shift; screenBySeed: no screen / screen by seed over every arm of the two roles',
    };
    for (const [id, value] of Object.entries(studyResult.rows)) {
      rows[id] = { value, kind: /** @type {any} */ (kinds)[id], formula: /** @type {any} */ (formulas)[id] };
    }
  }
  const appends = Object.fromEntries(armNames.map((a) => [arms[a].name, arms[a].lines]));
  const journal = { appends, appendCostMs, overheadSeconds: Object.fromEntries(Object.entries(appends).map(([a, n]) => [a, appendCostMs === null ? null : Math.round(n * appendCostMs) / 1000])) };

  const verdict = failures.length === 0 ? 'The before arm agrees with MP12b1 on every seed (puzzle identity or metric-prefix agreement, named per seed).' : `FAILURES: ${failures.length}`;
  writeJson(out('compare.json'), { meta, pairs, rows, ...(studyResult === null ? {} : { study: studyResult.json }), journal, failures });

  const lines = [`# ${task} comparison: ${study ? 'W variants, no screen and arity 3 against IGP-01' : 'before and after'}`, '', banner(meta), '',
    'Provisional (pre-freeze) numbers. "After" values are *Measured*, ratios are *Derived* (before / after on matched seeds), the estimates are the analysts\' *Projections* (check-list §5). Matched cohorts only: reps 0-2 on the slow cells (no p95 can be read from three requests), 0-4 and 0-5 on the fast shard. A faster request that delivers fewer puzzles is never read as a gain; completion is always beside a time. IGP-07 gives the descriptive verdicts.', '',
    `Identity: ${verdict}`, ''];
  if (studyResult !== null) {
    lines.push('In this study each pair is "first arm / second arm" on matched seeds only (the seeds both arms ran): the headline tables below give the paired ratios, the study sections after them the per-W, population, split, shift, offset and arity-3 figures. The records of the arms of IGP-01 are read from its published folders.', '');
  }
  const detailed = new Set();
  for (const pair of pairs) {
    lines.push(`## Headline: ${pair.before} (${pair.variants.before}) against ${pair.after} (${pair.variants.after})`, '',
      '| Cell | Today, MP12b1 20 reps: T10 median / p95 | MP12b1 on these seeds: T10 median, response median | Before: T10 median / p95 | After: T10 median / p95 | Paired T10 ratio (median [min-max]) | Paired response ratio | Ten of n before / after | Opus | Astra |',
      '|---|---|---|---|---|---|---|---|---|---|');
    for (const h of HEADLINE) {
      const c = pair.cells[h.id];
      if (c === undefined) {
        continue;
      }
      lines.push(`| ${h.label} | ${c.mp12b1 === null ? '-' : t10Text(c.mp12b1.all)} | ${c.mp12b1 === null ? '-' : `${sec(c.mp12b1.matched.t10.median)}, ${sec(c.mp12b1.matched.response.median)} (ten of ${c.mp12b1.matched.requests})`} | ${t10Text(c.before)} | ${t10Text(c.after)} | ${ratioText(c.paired.t10Ratio)} | ${ratioText(c.paired.responseRatio)} | ${c.before.reached} of ${c.before.requests} / ${c.after.reached} of ${c.after.requests}${c.after.censored > 0 ? ` (${c.after.censored} censored)` : ''} | ${h.opus} | ${h.astra} |`);
    }
    lines.push('', 'T1, response and p95 of the response (median, s), before / after:', '');
    for (const h of HEADLINE) {
      const c = pair.cells[h.id];
      if (c !== undefined) {
        lines.push(`- ${h.label}: T1 ${sec(c.before.t1.median)} / ${sec(c.after.t1.median)}; response ${sec(c.before.response.median)} / ${sec(c.after.response.median)}; p95 of the response ${sec(c.before.response.p95)} / ${sec(c.after.response.p95)}; fewer puzzles in the after arm: ${c.paired.fewerPuzzles.length === 0 ? 'none' : c.paired.fewerPuzzles.join('; ')}`);
      }
    }
    for (const [caseId, c] of detailed.has(pair.after) ? [] : Object.entries(pair.cells)) {
      lines.push('', `## ${caseId}${study ? ` (${pair.before} / ${pair.after})` : ''}`, '', `MP12b1 report: ${c.mp12b1?.report ?? 'none'}; the before arm's response over MP12b1's on the same seeds: median ${fix(c.drift.median, 3)}.`, '',
        '| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|');
      for (const s of c.seeds) {
        const id = c.identity.find((/** @type {any} */ i) => i.seed === s.seed);
        const cellText = (/** @type {any} */ r) => (r === null ? '- | - | - | -' : `${r.accepted}${r.censored ? ' (cens.)' : ''} | ${sec(r.t1)} | ${sec(r.t10)} | ${sec(r.response)}`);
        lines.push(`| ${s.seed} | ${s.mp12b1 === null ? '-' : `${s.mp12b1.accepted} | ${sec(s.mp12b1.t10)} | ${sec(s.mp12b1.response)}`}${s.mp12b1 === null ? ' | - | -' : ''} | ${cellText(s.before)} | ${cellText(s.after)} | ${id?.note ?? id?.level ?? '-'} |`);
      }
      for (const arm of ['before', 'after']) {
        if (Object.keys(c[arm].stages).length === 0) {
          lines.push('', `### ${caseId}: ${arm} arm, calls per stage`, '', 'This arm has no journal.');
          continue;
        }
        lines.push('', `### ${caseId}: ${arm} arm, calls per stage`, '', '| Stage | Calls | Ok | No-window | Unfinished (profiles seen) | Profiles per call median / p90 / max | ms per call median / p90 | Work per call median / p90 | Outcomes |', '|---|---:|---:|---:|---|---|---|---|---|');
        for (const [stage, st] of Object.entries(c[arm].stages)) {
          lines.push(`| ${stage} | ${st.calls} | ${st.ok} | ${st.noWindow} | ${st.unfinished} (${st.unfinishedProfiles}) | ${fix(st.profiles.median, 1)} / ${fix(st.profiles.p90, 1)} / ${fix(st.profiles.max, 0)} | ${fix(st.ms.median, 0)} / ${fix(st.ms.p90, 0)} | ${fix(st.work.median === null ? null : st.work.median / 1e6, 1)} M / ${fix(st.work.p90 === null ? null : st.work.p90 / 1e6, 1)} M | ${tallyText(st.outcomes)} |`);
        }
      }
      const de = (/** @type {any} */ x) => `${x.callsWithP2} of ${x.calls} calls (${fix(x.callShare === null ? null : 100 * x.callShare, 1)} %), ${x.p2Tuples} tuples, ${fix(x.timeShare === null ? null : 100 * x.timeShare, 1)} % of the ms`;
      lines.push('', `### ${caseId}: the multipliers`, '',
        `- Dead-end entries (R10 before, R11 after), batch: ${de(c.before.deadEnd.batch)} / ${de(c.after.deadEnd.batch)}; set: ${de(c.before.deadEnd.set)} / ${de(c.after.deadEnd.set)}; both: ${de(c.before.deadEnd.both)} / ${de(c.after.deadEnd.both)}.`,
        `- Start-count capped share (R29, before arm): ${c.before.startCountCapped.capped} of ${c.before.startCountCapped.tuples} p1 tuples at the start count (${fix(c.before.startCountCapped.share === null ? null : c.before.startCountCapped.share, 3)}) over ${c.before.startCountCapped.calls} calls.`,
        `- Window profiles per ok call (R12), median / mean: before ${fix(c.before.windowProfiles.median, 1)} / ${fix(c.before.windowProfiles.mean, 2)} (${c.before.windowProfiles.okCalls} ok calls; ${c.before.windowProfiles.basis}); after ${fix(c.after.windowProfiles.median, 1)} / ${fix(c.after.windowProfiles.mean, 2)} (${c.after.windowProfiles.okCalls} ok calls; ${c.after.windowProfiles.basis}).`,
        `- Waves (proxy, R13), median: before ${fix(c.before.waves.median)} (n ${c.before.waves.n}), after ${fix(c.after.waves.median)} (n ${c.after.waves.n}). Set-stage share T1 / T10 (median): ${fix(c.before.setShare.median, 3)} / ${fix(c.after.setShare.median, 3)}.`,
        `- Work per accepted puzzle, batch and completion (set stage added), median, M units: before ${fix(c.before.workPerAccepted.withoutSet.median === null ? null : c.before.workPerAccepted.withoutSet.median / 1e6, 1)} (${fix(c.before.workPerAccepted.withSet.median === null ? null : c.before.workPerAccepted.withSet.median / 1e6, 1)}), after ${fix(c.after.workPerAccepted.withoutSet.median === null ? null : c.after.workPerAccepted.withoutSet.median / 1e6, 1)} (${fix(c.after.workPerAccepted.withSet.median === null ? null : c.after.workPerAccepted.withSet.median / 1e6, 1)}); unfinished calls (unknown tails): ${c.before.workPerAccepted.unfinishedCalls} / ${c.after.workPerAccepted.unfinishedCalls} in ${c.before.workPerAccepted.requestsWithUnfinishedCalls} / ${c.after.workPerAccepted.requestsWithUnfinishedCalls} requests.`);
      if (c.after.locate !== null) {
        const l = c.after.locate;
        lines.push(`- Locate (R19, after arm): ${l.calls} calls; results ${tallyText(l.results)}; no-window proofs ${tallyText(l.proofs)} (heuristic ends ${l.heuristicEnds}, never proofs); rescues in ${l.callsWithRescue} calls, sides ${tallyText(l.rescueSides)}; locate probes per call median ${fix(l.probes.median, 1)}, p90 ${fix(l.probes.p90, 1)}, max ${fix(l.probes.max, 0)}.`);
      }
      if (c.after.rerates !== null) {
        const r = c.after.rerates;
        lines.push(`- Re-ratings (R18, after arm): per finished call mean ${fix(r.perCallMean, 2)}, max ${fix(r.perCallMax, 0)}; ${fix(r.msShare === null ? null : 100 * r.msShare, 1)} % of the tuple ms, ${fix(r.workShare === null ? null : 100 * r.workShare, 1)} % of the work.`);
      }
    }
    detailed.add(pair.after);
  }
  if (studyResult !== null) {
    lines.push(...studyResult.lines);
  }
  lines.push('', '## Values of the §5 rows', '', '| Row | Kind | Formula | Value |', '|---|---|---|---|');
  for (const [id, r] of Object.entries(rows)) {
    lines.push(`| ${id} | ${r.kind} | ${r.formula} | \`${JSON.stringify(r.value)}\` |`);
  }
  lines.push('', '## Journal', '',
    `Journal lines (appends): ${Object.entries(appends).map(([a, n]) => `${a} ${n}`).join(', ')}. Measured cost of one append (self-test): ${appendCostMs === null ? 'not measured' : `${appendCostMs} ms`}; ${Object.entries(journal.overheadSeconds).map(([a, s]) => `${a} ${s === null ? '-' : `${s} s`}`).join(', ')} in all (appends x cost), to be read beside the timings. Journal sources: ${(study ? [...new Set(pairs.flatMap((p) => [...p.journal.before, ...p.journal.after]))] : pairs.flatMap((p) => [...p.journal.before, ...p.journal.after])).join('; ')}.`);
  if (failures.length > 0) {
    lines.push('', '## Failures', '', ...failures.map((f) => `- ${f}`));
  }
  writeText(out('compare.md'), lines.join('\n'));
  process.stdout.write(`compare: ${verdict}\n`);
  return failures.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`compare: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
