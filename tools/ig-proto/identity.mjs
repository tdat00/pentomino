// @ts-check
// Identity of the arms against MP12b1 (IGP-00 §9, check-list §3 "Determinism"): per seed and per pair of runs the
// strongest level the records can establish.
//   node tools\ig-proto\identity.mjs --task IGP-00 --arms base,log --label provisional
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { median } from '../bench/report.js';
import { artifactDir, evidenceDir, MP12B1_DIGEST, mp12b1Report, parseArgs } from './lib/paths.mjs';
import { banner, buildMeta, worktreeDigest, writeJson, writeText } from './lib/records.mjs';

const SUMMARY_FIELDS = ['area', 'K', 'sizes', 'setAttempt'];

/**
 * @param {any} run
 * @returns {{ accepted: number, t1: number | null, t10: number | null, response: number, resultDigest: string | null,
 *   set: any }}
 */
function describe(run) {
  const d = run.details;
  return {
    accepted: run.acceptedCount,
    t1: run.firstReadyMs ?? null,
    t10: run.tenthReadyMs ?? null,
    response: run.responseMs,
    resultDigest: d?.resultDigest ?? null,
    set: d === undefined ? null : Object.fromEntries(SUMMARY_FIELDS.map((f) => [f, d[f]])),
  };
}

/**
 * Compares two runs of one seed at the strongest level available (check-list §3).
 * @param {any} a
 * @param {any} b
 */
export function comparePair(a, b) {
  const da = a.details;
  const db = b.details;
  const countsEqual = a.acceptedCount === b.acceptedCount;
  const comparable = da?.resultDigest !== undefined && db?.resultDigest !== undefined;
  const digestEqual = comparable ? da.resultDigest === db.resultDigest : null;
  const keyed = Array.isArray(da?.igPuzzleKeys) && Array.isArray(db?.igPuzzleKeys);
  /** @type {boolean | null} */
  let keyPrefixEqual = null;
  /** @type {boolean | null} */
  let setKeyEqual = null;
  if (keyed) {
    setKeyEqual = da.igSetKey === db.igSetKey;
    const n = Math.min(da.igPuzzleKeys.length, db.igPuzzleKeys.length);
    keyPrefixEqual = isDeepStrictEqual(da.igPuzzleKeys.slice(0, n), db.igPuzzleKeys.slice(0, n));
  }
  const sa = da === undefined ? null : Object.fromEntries(SUMMARY_FIELDS.map((f) => [f, da[f]]));
  const sb = db === undefined ? null : Object.fromEntries(SUMMARY_FIELDS.map((f) => [f, db[f]]));
  const setSummaryEqual = isDeepStrictEqual(sa, sb);
  const n = Math.min(da?.puzzles?.length ?? 0, db?.puzzles?.length ?? 0);
  let metricPrefixLength = 0;
  /** @type {any} */
  let firstDifference = null;
  if (!setSummaryEqual) {
    firstDifference = { field: 'set summary', a: sa, b: sb };
  } else {
    for (let i = 0; i < n && firstDifference === null; i += 1) {
      const pa = da.puzzles[i];
      const pb = db.puzzles[i];
      const fields = /** @type {[string, any, any][]} */ ([
        ['clues', pa.clues, pb.clues], ['U', pa.U, pb.U], ['score', pa.score, pb.score],
        ['metrics.work', pa.metrics?.work, pb.metrics?.work], ['metrics.nodes', pa.metrics?.nodes, pb.metrics?.nodes],
      ]);
      const differing = fields.find(([, x, y]) => x !== y);
      if (differing === undefined) {
        metricPrefixLength = i + 1;
      } else {
        firstDifference = { puzzle: i, field: differing[0], a: differing[1], b: differing[2] };
      }
    }
  }
  const prefixIdentity = keyed && setKeyEqual === true && keyPrefixEqual === true;
  const digestIdentity = countsEqual && digestEqual === true;
  /** @type {'puzzle-identity' | 'metric-prefix'} */
  const level = (digestIdentity || prefixIdentity) && firstDifference === null ? 'puzzle-identity' : 'metric-prefix';
  /** @type {string[]} */
  const problems = [];
  if (countsEqual && digestEqual === false) {
    problems.push('resultDigest differs at equal accepted counts');
  }
  if (keyed && (setKeyEqual === false || keyPrefixEqual === false)) {
    problems.push('the set key or the common prefix of the puzzle keys differs');
  }
  if (firstDifference !== null) {
    problems.push(`first difference: ${JSON.stringify(firstDifference)}`);
  }
  let note;
  if (level === 'puzzle-identity') {
    note = prefixIdentity && !digestIdentity
      ? `puzzle identity (prefix identity: set key and the first ${Math.min(da.igPuzzleKeys.length, db.igPuzzleKeys.length)} puzzle keys equal)`
      : `puzzle identity (resultDigest equal at equal accepted counts, ${a.acceptedCount})`;
  } else {
    note = `metric-prefix agreement over ${metricPrefixLength} puzzle(s); puzzle identity not established`;
  }
  return {
    level, countsEqual, acceptedA: a.acceptedCount, acceptedB: b.acceptedCount, digestEqual, keyPrefixEqual, setKeyEqual,
    setSummaryEqual, metricPrefixLength, firstDifference, note, problems,
  };
}

/**
 * @param {string} label
 * @param {string} task
 * @param {string} arm
 * @returns {{ rows: any[], variant: string | null }} Published rows of every shard of the arm.
 */
function publishedRows(label, task, arm) {
  const dir = evidenceDir(label, task, arm);
  /** @type {any[]} */
  const rows = [];
  let variant = null;
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.runs.json')).sort()) {
      const record = JSON.parse(readFileSync(join(dir, name), 'utf8'));
      rows.push(...record.rows);
      variant = Object.keys(record.meta.trees)[0] ?? variant;
    }
  }
  return { rows, variant };
}

/**
 * @param {string} label
 * @param {string} task
 * @param {string} arm
 * @returns {Record<string, { calls: number, unfinished: number, stages: string[], phases: string[], rowSeed: string | null }>}
 */
function journalSummary(label, task, arm) {
  const armDir = artifactDir(label, task, arm);
  /** @type {Record<string, any>} */
  const out = {};
  if (!existsSync(armDir)) {
    return out;
  }
  for (const shard of readdirSync(armDir, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    const logs = join(armDir, shard.name, 'logs');
    if (!existsSync(logs)) {
      continue;
    }
    for (const name of readdirSync(logs).sort()) {
      const key = name.split('.')[0];
      const entry = (out[key] ??= { starts: new Set(), ends: new Set(), stages: new Set(), phases: new Set(), rowSeed: null });
      for (const line of readFileSync(join(logs, name), 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '')) {
        const l = JSON.parse(line);
        if (l.t === 'row') {
          entry.rowSeed = l.seed;
        } else if (l.t === 'start') {
          entry.starts.add(l.call);
          entry.stages.add(l.stage);
        } else if (l.t === 'end') {
          entry.ends.add(l.call);
        } else if (l.t === 'phase') {
          entry.phases.add(l.phase);
        } else if (l.t === 'p') {
          entry.phases.add(l.tuple[0]);
        }
      }
    }
  }
  return Object.fromEntries(Object.entries(out).map(([key, e]) => [key, {
    calls: e.starts.size,
    unfinished: [...e.starts].filter((c) => !e.ends.has(c)).length,
    stages: [...e.stages].sort(),
    phases: [...e.phases].sort(),
    rowSeed: e.rowSeed,
  }]));
}

/** @param {number | null} x @returns {string} */
const ratio = (x) => (x === null ? '-' : x.toFixed(3));
/** @param {number | null} ms @returns {string} */
const sec = (ms) => (ms === null || ms === undefined ? '-' : (ms / 1000).toFixed(2));

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'arms', 'label', 'source-label'] });
  const task = args.task ?? 'IGP-00';
  const label = args.label ?? 'provisional';
  const armNames = (args.arms ?? 'base,log').split(',');
  /** @type {Record<string, { rows: any[], variant: string | null }>} */
  const published = Object.fromEntries(armNames.map((a) => [a, publishedRows(label, task, a)]));
  /** @type {string[]} */
  const failures = [];
  const digest = await worktreeDigest();
  const sameSource = digest === MP12B1_DIGEST;
  if (!sameSource && label === 'provisional') {
    failures.push(`the worktree's source digest ${digest} differs from MP12b1's ${MP12B1_DIGEST}`);
  }
  const variantOf = (/** @type {string} */ arm) => published[arm].variant ?? arm;
  const meta = await buildMeta({ task, label, kind: 'identity', trees: [...new Set(armNames.map(variantOf))], sourceLabel: args['source-label'] });

  /** @type {Record<string, { variant: string, treeId: string, copyDigest: string, rows: number }>} */
  const armInfo = {};
  for (const arm of armNames) {
    const t = meta.trees[variantOf(arm)];
    armInfo[arm] = { variant: variantOf(arm), treeId: t.treeId, copyDigest: t.copyDigest, rows: published[arm].rows.length };
  }
  if (armNames.includes('base') && armInfo.base.copyDigest !== digest) {
    failures.push(`the base copy's digest ${armInfo.base.copyDigest} differs from the worktree's ${digest}`);
  }

  const seeds = [];
  const first = published[armNames[0]].rows;
  /** @type {Record<string, any>} */
  const mp12Cache = {};
  for (const row of first) {
    const found = (mp12Cache[row.caseId] ??= mp12b1Report(row.caseId));
    const mp = found?.report.runs.find((/** @type {any} */ r) => r.seed === row.seed && r.probeKind === 'generation') ?? null;
    if (mp === null) {
      failures.push(`${row.seed}: MP12b1 has no run of this seed`);
      continue;
    }
    if (found.report.meta.sourceDigest !== MP12B1_DIGEST) {
      failures.push(`${row.seed}: the MP12b1 report ${found.path} has another source digest`);
    }
    /** @type {Record<string, any>} */
    const runs = { mp12b1: mp };
    for (const arm of armNames) {
      const r = published[arm].rows.find((/** @type {any} */ x) => x.seed === row.seed);
      if (r === undefined) {
        failures.push(`${row.seed}: arm ${arm} has no run of this seed`);
      } else {
        runs[arm] = r.run;
      }
    }
    const names = Object.keys(runs);
    /** @type {Record<string, any>} */
    const pairs = {};
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const result = comparePair(runs[names[i]], runs[names[j]]);
        if (names[i] === 'mp12b1' && !sameSource) {
          pairs[`${names[i]}~${names[j]}`] = { ...result, level: 'different-source', problems: [] };
        } else {
          pairs[`${names[i]}~${names[j]}`] = result;
          for (const p of result.problems) {
            failures.push(`${row.seed} ${names[i]}~${names[j]}: ${p}`);
          }
        }
      }
    }
    const response = (/** @type {string} */ n) => runs[n]?.responseMs ?? null;
    const div = (/** @type {number | null} */ x, /** @type {number | null} */ y) => (x === null || y === null || y === 0 ? null : x / y);
    seeds.push({
      case: row.caseId,
      seed: row.seed,
      rep: row.rep,
      ...Object.fromEntries(names.map((n) => [n, describe(runs[n])])),
      pairs,
      ratioBase: div(response('base'), response('mp12b1')),
      ratioLog: div(response('log'), response('mp12b1')),
      ratioLogBase: div(response('log'), response('base')),
    });
  }

  const journal = armNames.includes('log') ? journalSummary(label, task, 'log') : {};
  for (const s of seeds) {
    const key = `${s.case}~${s.rep}`;
    if (armNames.includes('log') && journal[key] !== undefined && journal[key].rowSeed !== s.seed) {
      failures.push(`${key}: the journal's row line names seed ${journal[key].rowSeed}, expected ${s.seed}`);
    }
  }
  const selfTest = artifactDir(label, task, 'self-test', 'state.json');
  const appendCostMs = existsSync(selfTest) ? JSON.parse(readFileSync(selfTest, 'utf8')).appendCostMs ?? null : null;

  const levelOf = (/** @type {any} */ s, /** @type {string} */ pair) => s.pairs[pair]?.level;
  const puzzleIdentity = seeds.filter((s) => armNames.every((a) => levelOf(s, `mp12b1~${a}`) === 'puzzle-identity')).length;
  const num = (/** @type {(number | null)[]} */ list) => /** @type {number[]} */ (list.filter((x) => x !== null));
  const summary = {
    seeds: seeds.length,
    puzzleIdentity,
    metricPrefixOnly: seeds.length - puzzleIdentity,
    failures: failures.length,
    medianRatioBase: median(num(seeds.map((s) => s.ratioBase))),
    medianRatioLog: median(num(seeds.map((s) => s.ratioLog))),
    medianLogOverhead: median(num(seeds.map((s) => s.ratioLogBase))),
    appendCostMs,
  };
  const verdict = failures.length === 0
    ? `R00: holds. ${puzzleIdentity} of ${seeds.length} seeds reached puzzle identity by digest or key prefix; ${seeds.length - puzzleIdentity} only metric-prefix agreement (puzzle identity not established).`
    : `R00: FAILS (${failures.length} problem(s)).`;

  writeJson(evidenceDir(label, task, 'identity.json'), { meta, arms: armInfo, seeds, summary, failures, journal });
  const lines = [`# ${task} identity of the arms against MP12b1`, '', banner(meta), '', verdict, '', '## Per seed', '',
    '| Seed | Source | Accepted | T1 s | T10 s | Response s | Set |', '|---|---|---:|---:|---:|---:|---|'];
  for (const s of seeds) {
    for (const name of ['mp12b1', ...armNames]) {
      const d = /** @type {any} */ (s)[name];
      lines.push(`| ${s.seed} | ${name} | ${d.accepted} | ${sec(d.t1)} | ${sec(d.t10)} | ${sec(d.response)} | K ${d.set?.K}, attempt ${d.set?.setAttempt} |`);
    }
  }
  lines.push('', '## Level reached per pair', '', '| Seed | Pair | Level | Accepted | Digest equal | Key prefix equal | Metric prefix | Note |', '|---|---|---|---|---|---|---:|---|');
  for (const s of seeds) {
    for (const [pair, p] of Object.entries(s.pairs)) {
      lines.push(`| ${s.seed} | ${pair} | ${p.level} | ${p.acceptedA} / ${p.acceptedB} | ${p.digestEqual} | ${p.keyPrefixEqual} | ${p.metricPrefixLength} | ${p.note} |`);
    }
  }
  lines.push('', '## Time ratios', '', '| Seed | base / MP12b1 | log / MP12b1 | log / base |', '|---|---:|---:|---:|');
  for (const s of seeds) {
    lines.push(`| ${s.seed} | ${ratio(s.ratioBase)} | ${ratio(s.ratioLog)} | ${ratio(s.ratioLogBase)} |`);
  }
  lines.push(`| median | ${ratio(summary.medianRatioBase)} | ${ratio(summary.medianRatioLog)} | ${ratio(summary.medianLogOverhead)} |`, '',
    `Cost of one journal append (self-test): ${appendCostMs === null ? 'not measured' : `${appendCostMs} ms`}.`, '',
    '## Trees', '', '| Arm | treeId | copyDigest |', '|---|---|---|');
  for (const [arm, info] of Object.entries(armInfo)) {
    lines.push(`| ${arm} | ${info.treeId.slice(0, 12)}… | ${info.copyDigest.slice(0, 12)}… |`);
  }
  if (Object.keys(journal).length > 0) {
    lines.push('', '## Journal of the log arm', '', '| Row | Calls | Unfinished | Stages | Phases | Row line seed |', '|---|---:|---:|---|---|---|');
    for (const [key, j] of Object.entries(journal)) {
      lines.push(`| ${key} | ${j.calls} | ${j.unfinished} | ${j.stages.join(', ')} | ${j.phases.join(', ')} | ${j.rowSeed} |`);
    }
  }
  if (failures.length > 0) {
    lines.push('', '## Failures', '', ...failures.map((f) => `- ${f}`));
  }
  writeText(evidenceDir(label, task, 'identity.md'), lines.join('\n'));
  process.stdout.write(`identity: ${verdict}\n`);
  return failures.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`identity: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}
