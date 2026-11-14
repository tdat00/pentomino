// @ts-check
// Paired comparison of two arms on matched seeds (IGP-01 §4; check-list §3 "Statistics", §5 rows).
//   node tools\ig-proto\compare.mjs --task <T> --pairs <before>:<after>[,...] --label <L> [--reference mp12b1]
//        [--source-label <SL>] [--out-dir <scratch folder>]
// It reads the published runs and call journals of the arms (arm.mjs publish) and MP12b1's reports. Every "after"
// value is Measured and provisional; every ratio is Derived. `--out-dir` writes the records to a scratch folder
// (tests of the script only).
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
function assembleCalls(lines) {
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
function loadArm(label, task, arm) {
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

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'pairs', 'label', 'reference', 'source-label', 'out-dir'] });
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
  const arms = Object.fromEntries(armNames.map((a) => [a, loadArm(label, task, a)]));
  const meta = await buildMeta({ task, label, kind: 'compare', trees: [...new Set(armNames.map((a) => arms[a].variant))], sourceLabel: args['source-label'] });
  const stateFile = join(artifactDir(label, task, 'self-test'), 'state.json');
  const appendCostMs = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')).appendCostMs ?? null : null;

  const pairs = [];
  for (const [beforeName, afterName] of pairNames) {
    const before = arms[beforeName];
    const after = arms[afterName];
    const caseIds = [...new Set(before.rows.map((r) => r.caseId))].sort((a, b) => {
      const order = HEADLINE.map((h) => h.id);
      return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
    });
    /** @type {Record<string, any>} */
    const cells = {};
    for (const caseId of caseIds) {
      const b = before.rows.filter((r) => r.caseId === caseId);
      const a = after.rows.filter((r) => r.caseId === caseId);
      const paired = pairedCell(b, a);
      const mp = mp12Cell(caseId, b.map((r) => r.seed));
      const bs = armCell(b, before.byRow);
      const identity = b.map((row) => {
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
  const appends = Object.fromEntries(armNames.map((a) => [a, arms[a].lines]));
  const journal = { appends, appendCostMs, overheadSeconds: Object.fromEntries(Object.entries(appends).map(([a, n]) => [a, appendCostMs === null ? null : Math.round(n * appendCostMs) / 1000])) };

  const verdict = failures.length === 0 ? 'The before arm agrees with MP12b1 on every seed (puzzle identity or metric-prefix agreement, named per seed).' : `FAILURES: ${failures.length}`;
  writeJson(out('compare.json'), { meta, pairs, rows, journal, failures });

  const lines = [`# ${task} comparison: before and after`, '', banner(meta), '',
    'Provisional (pre-freeze) numbers. "After" values are *Measured*, ratios are *Derived* (before / after on matched seeds), the estimates are the analysts\' *Projections* (check-list §5). Matched cohorts only: reps 0-2 on the slow cells (no p95 can be read from three requests), 0-4 and 0-5 on the fast shard. A faster request that delivers fewer puzzles is never read as a gain; completion is always beside a time. IGP-07 gives the descriptive verdicts.', '',
    `Identity: ${verdict}`, ''];
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
    for (const [caseId, c] of Object.entries(pair.cells)) {
      lines.push('', `## ${caseId}`, '', `MP12b1 report: ${c.mp12b1?.report ?? 'none'}; the before arm's response over MP12b1's on the same seeds: median ${fix(c.drift.median, 3)}.`, '',
        '| Seed | MP12b1 acc | MP12b1 T10 | MP12b1 resp | Before acc | Before T1 | Before T10 | Before resp | After acc | After T1 | After T10 | After resp | Identity (before vs MP12b1) |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|');
      for (const s of c.seeds) {
        const id = c.identity.find((/** @type {any} */ i) => i.seed === s.seed);
        const cellText = (/** @type {any} */ r) => (r === null ? '- | - | - | -' : `${r.accepted}${r.censored ? ' (cens.)' : ''} | ${sec(r.t1)} | ${sec(r.t10)} | ${sec(r.response)}`);
        lines.push(`| ${s.seed} | ${s.mp12b1 === null ? '-' : `${s.mp12b1.accepted} | ${sec(s.mp12b1.t10)} | ${sec(s.mp12b1.response)}`}${s.mp12b1 === null ? ' | - | -' : ''} | ${cellText(s.before)} | ${cellText(s.after)} | ${id?.note ?? id?.level} |`);
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
  }
  lines.push('', '## Values of the §5 rows', '', '| Row | Kind | Formula | Value |', '|---|---|---|---|');
  for (const [id, r] of Object.entries(rows)) {
    lines.push(`| ${id} | ${r.kind} | ${r.formula} | \`${JSON.stringify(r.value)}\` |`);
  }
  lines.push('', '## Journal', '',
    `Journal lines (appends): ${Object.entries(appends).map(([a, n]) => `${a} ${n}`).join(', ')}. Measured cost of one append (self-test): ${appendCostMs === null ? 'not measured' : `${appendCostMs} ms`}; ${Object.entries(journal.overheadSeconds).map(([a, s]) => `${a} ${s === null ? '-' : `${s} s`}`).join(', ')} in all (appends x cost), to be read beside the timings. Journal sources: ${pairs.flatMap((p) => [...p.journal.before, ...p.journal.after]).join('; ')}.`);
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
