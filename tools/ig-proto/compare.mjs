// @ts-check
// Paired comparison of two arms on matched seeds (IGP-01 §4; check-list §3 "Statistics", §5 rows).
//   node tools\ig-proto\compare.mjs --task <T> --pairs <before>:<after>[,...] --label <L> [--reference mp12b1]
//        [--pm4 <task>] [--source-label <SL>] [--out-dir <scratch folder>]
// It reads the published runs and call journals of the arms (arm.mjs publish) and MP12b1's reports. Every "after"
// value is Measured and provisional; every ratio is Derived. `--out-dir` writes the records to a scratch folder
// (tests of the script only).
// An arm is `<arm>` (of --task) or `<task>/<arm>`; only matched seeds are paired. With a task-qualified arm the
// script runs as a study (IGP-03): it adds the per-W, population, split (R33), shift, offset, 26x26 Master and
// arity-3 sections, reads IGP-02's PM4 record from --pm4, and checks the journals of the no-screen arm.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { median, percentile, summarize } from '../bench/report.js';
import { comparePair } from './identity.mjs';
import { artifactDir, evidenceDir, MP12B1_DIGEST, mp12b1Report, parseArgs } from './lib/paths.mjs';
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

/**
 * @param {{ arms: Record<string, any>, task: string, pm4: any, failures: string[] }} o
 * @returns {{ json: any, lines: string[], rows: Record<string, any> }}
 */
function buildStudy({ arms, task, pm4, failures }) {
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
  const label = (/** @type {string} */ id) => HEADLINE.find((h) => h.id === id)?.label ?? id;

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
      lines.push('', `#### The split (R33): before → no screen → 190 M (${indication})`, '',
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
    cell.a3 = { setStage: { main: sa3, a3: sb3 }, perRequest: bounds, t1: { main: t1Main, a3: t1A3 }, idealisedT1Bound: summarize(boundMs), kind: 'Projection: three idle lanes for each round of the winning set-stage call' };
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
    lines.push('', 'Assumption of the bound: for the call that produced the request\'s set (the lowest successful attempt), T1 minus the sum over its rounds of (serial − critical ms), as if three lanes were idle for each round; the real set stage already runs attempts in parallel on the pool and consumes them in order, so the figure is a lower bound on T1, not a measured gain. The arms are paired by seed but their puzzles differ (the arity-3 probe order changes the random stream).');
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
  return { json: { checks, cells }, lines, rows };
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

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'pairs', 'label', 'reference', 'pm4', 'source-label', 'out-dir'] });
  for (const name of ['task', 'pairs', 'label']) {
    if (args[name] === undefined) {
      throw new Error(`--${name} is required`);
    }
  }
  const { task, label } = args;
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
  const meta = await buildMeta({ task, label, kind: 'compare', trees: [...new Set(armNames.map((a) => arms[a].variant))], sourceLabel: args['source-label'] });
  const stateFile = join(artifactDir(label, task, 'self-test'), 'state.json');
  const appendCostMs = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')).appendCostMs ?? null : null;

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
  const studyResult = study ? buildStudy({ arms, task, pm4, failures }) : null;
  if (studyResult !== null) {
    const kinds = { R07: 'Measured; ratio Derived', R16: 'Measured; Derived', R18: 'Derived', R20: 'Measured; the T1 bound is a Projection', R32: 'Measured; Derived', R33: 'Measured; ratios Derived' };
    const formulas = {
      R07: '26x26 Master reps 0-4: T10 before, IGP-01 after (190 M) and 380 M, per-seed ratios',
      R16: 'median work per accepted puzzle (batch and completion; with the set stage) per W and cell; the W with the least median is descriptive',
      R18: 're-ratings per call and their share of the work; re-rated probes in band per W and cell',
      R20: 'set-stage probes per call (wasted included), rounds, serial and critical ms, the idealised call-level T1 bound and the measured T1',
      R32: 'population of the accepted puzzles per W and cell (clue share p10 / median / p90, position, central share)',
      R33: 'paired factors before -> no screen -> 190 M with their n, the two parts of the shift',
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
