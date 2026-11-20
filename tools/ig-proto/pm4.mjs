// @ts-check
// PM4 (IGP-02): the screen certificate and the `W_screen` economics, test side only. A corpus of today's set-stage
// call profiles and of window subsets is rated canonically, then again under a lowered main-work limit `W` (nothing
// else lowered). A screen result whose main work is at most `W` must equal the canonical rating (IG-P-Q01 (b)); the
// rest is screen-capped. `calls` records the corpus, `screens` the screens (resumable), `report` the evidence.
//   node tools\ig-proto\pm4.mjs calls   --shard <name> --cases <id>[,<id>...] --label <L> [--run-id <id>] [--task <T>]
//        --source-label <SL> --horizon-s <H>
//   node tools\ig-proto\pm4.mjs screens --shard <name> --cases <id>[,<id>...] --label <L> [--run-id <id>] [--task <T>]
//        --source-label <SL> --horizon-s <H>
//   node tools\ig-proto\pm4.mjs report  --label <L> [--run-id <id>] [--task <T>] --source-label <SL>
// `--task IGP-02-dev` (with a run id `dry` or `dev<n>`) is for developer debugging: its files stay under
// tests/artifacts/ig-proto/<label>/IGP-02-dev/ and its report never goes to docs/.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { median, percentile, summarize } from '../bench/report.js';
import { startCountFor } from './lib/calls.mjs';
import { loadEngine } from './lib/engine.mjs';
import { createLanes } from './lib/lanes.mjs';
import { artifactDir, elapsedS, evidenceDir, parseArgs, rel } from './lib/paths.mjs';
import { banner, buildMeta, harnessInfo, writeJson, writeJsonl, writeText } from './lib/records.mjs';
import { caseBoard, firstCarvedSet, setInfo } from './lib/sets.mjs';
import { ensureTree } from './lib/tree.mjs';

class Stop extends Error {}

const TASK = 'IGP-02';
const DEV_TASK = 'IGP-02-dev';
export const FIXED_W = Object.freeze([95000000, 190000000, 380000000]);
export const BOUNDARY_KINDS = Object.freeze(['mainWork-1', 'workFirst-1', 'tail-mid']);
export const CLASSES = Object.freeze(['certified', 'scap0', 'scap1', 'over']);
const CELLS = Object.freeze([
  '10x10-nightmare', '12x12-nightmare', '14x14-nightmare', '15x15b10-nightmare', '26x26-nightmare', '26x26-hell-1',
  '26x26-master',
]);
const CHUNK = 128;
const OFFSET_BUCKETS = Object.freeze(['<0', '0', '1', '2', '3', '4', '>4']);

/**
 * The manifest of a run, fixed here: `main` is the seven cells with four sets each, `dry` one cell with one set (and,
 * for the developer's debugging task only, `dev<n>` with the dry manifest).
 * @param {string} runId
 * @param {string} task
 */
export function manifestOf(runId, task) {
  const common = {
    variant: 'instr',
    seedPrefix: 'ig-pm4',
    W: [...FIXED_W],
    window: { offsets: [1, 2, 3, 4], perCount: 3 },
    maxAttempts: 8,
    boundary: [...BOUNDARY_KINDS],
  };
  if (runId === 'main') {
    return { ...common, cells: [...CELLS], sets: 4 };
  }
  if (runId === 'dry' || (task === DEV_TASK && /^dev[0-9]+$/.test(runId))) {
    return { ...common, cells: ['10x10-nightmare'], sets: 1 };
  }
  throw new Stop(`unknown run id ${runId} for task ${task}`);
}

/** @param {Record<string, any>} args @param {string[]} names */
function need(args, names) {
  for (const name of names) {
    if (args[name] === undefined) {
      throw new Stop(`--${name} is required`);
    }
  }
}

/**
 * Opens a run: its folder, `run.json` (written at the first invocation, checked at every later one against the
 * manifest, the tree and the harness) and the tree.
 * @param {Record<string, string>} args
 */
async function openRun(args) {
  need(args, ['label']);
  const task = args.task ?? TASK;
  if (task !== TASK && task !== DEV_TASK) {
    throw new Stop(`--task must be ${TASK} or ${DEV_TASK}`);
  }
  const runId = args['run-id'] ?? 'main';
  const manifest = manifestOf(runId, task);
  const tree = await ensureTree(manifest.variant, { sourceLabel: args['source-label'] });
  const harness = harnessInfo();
  const runDir = artifactDir(args.label, task, runId);
  const runFile = join(runDir, 'run.json');
  const expected = {
    format: 'ig-proto-pm4-run', version: 1, task, runId, label: args.label, manifest,
    treeId: tree.treeId, copyDigest: tree.copyDigest, harnessHash: harness.harnessHash,
  };
  if (existsSync(runFile)) {
    const saved = JSON.parse(readFileSync(runFile, 'utf8'));
    for (const key of Object.keys(expected)) {
      if (!isDeepStrictEqual(saved[key], /** @type {any} */ (expected)[key])) {
        throw new Stop(`run.json of ${runId} differs in ${key} (the manifest, tree or harness changed): nothing was measured`);
      }
    }
  } else {
    writeJson(runFile, { ...expected, createdAt: new Date().toISOString() });
  }
  return { task, runId, label: args.label, manifest, tree, harness, runDir, sourceLabel: args['source-label'] };
}

/** @typedef {Awaited<ReturnType<typeof openRun>>} Run */

/** @param {string} file @returns {any} */
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** @param {string} file @returns {any[]} */
const readLines = (file) => (existsSync(file)
  ? readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l))
  : []);

/**
 * @param {string} text
 * @param {ReturnType<typeof manifestOf>} manifest
 * @returns {string[]} The cells of `--cases`: a duplicate-free subset of the manifest, in the given order.
 */
function parseCaseList(text, manifest) {
  const cases = text.split(',').filter((c) => c !== '');
  if (cases.length === 0 || new Set(cases).size !== cases.length) {
    throw new Stop(`--cases must name each cell once: ${text}`);
  }
  for (const c of cases) {
    if (!manifest.cells.includes(c)) {
      throw new Stop(`cell ${c} is not in the manifest of this run (${manifest.cells.join(', ')})`);
    }
  }
  return cases;
}

/** @param {string} name @returns {string} */
function shardName(name) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new Stop(`bad shard name: ${name}`);
  }
  return name;
}

/** @param {Run} run @param {string} kind @param {string} shard @returns {string} */
const stateFile = (run, kind, shard) => join(run.runDir, `${kind}-${shard}-state.json`);

/**
 * @param {Run} run
 * @param {string} kind `calls` or `screens`
 * @returns {Map<string, any>} The state of every shard of the kind.
 */
function shardStates(run, kind) {
  /** @type {Map<string, any>} */
  const out = new Map();
  if (!existsSync(run.runDir)) {
    return out;
  }
  const pattern = new RegExp(`^${kind}-([a-z0-9][a-z0-9-]*)-state\\.json$`);
  for (const name of readdirSync(run.runDir).sort()) {
    const match = pattern.exec(name);
    if (match !== null) {
      out.set(match[1], readJson(join(run.runDir, name)));
    }
  }
  return out;
}

/**
 * A shard's cell list is immutable and a cell belongs to one shard of a kind only.
 * @param {Run} run
 * @param {string} kind
 * @param {string} shard
 * @param {string[]} cases
 * @returns {any} The shard's state, or null at its first invocation.
 */
function claimShard(run, kind, shard, cases) {
  const states = shardStates(run, kind);
  const mine = states.get(shard) ?? null;
  if (mine !== null && !isDeepStrictEqual(mine.cases, cases)) {
    throw new Stop(`${kind} shard ${shard} started with the cells ${mine.cases.join(',')}: its cell list is immutable`);
  }
  for (const [name, state] of states) {
    const both = name === shard ? [] : state.cases.filter((/** @type {string} */ c) => cases.includes(c));
    if (both.length > 0) {
      throw new Stop(`cell(s) ${both.join(',')} already belong to ${kind} shard ${name}`);
    }
  }
  return mine;
}

/**
 * @param {Run} run
 * @param {string} kind
 * @param {string} shard
 * @param {string[]} cases
 * @param {Record<string, any>} fields
 */
function writeState(run, kind, shard, cases, fields) {
  writeJson(stateFile(run, kind, shard), {
    format: 'ig-proto-state', version: 1, task: run.task, step: `${kind}-${shard}`, run: run.runId, label: run.label,
    shard, cases, treeId: run.tree.treeId, harnessHash: run.harness.harnessHash, ...fields,
  });
}

/** @param {Run} run @param {string} caseId @returns {string} */
const callsFile = (run, caseId) => join(run.runDir, caseId, 'calls.json');

/** @param {Run} run @param {string} caseId @returns {any} */
const readCalls = (run, caseId) => (existsSync(callsFile(run, caseId)) ? readJson(callsFile(run, caseId)) : null);

/** @param {Run} run @param {string} caseId @returns {string} */
const checkpointFile = (run, caseId) => join(run.runDir, caseId, 'screens.checkpoint.jsonl');

/** @param {any} record @returns {boolean} A canonical rating exists (the run was not capped, unsatisfiable or an error). */
export const isComplete = (record) => record.score !== null && record.score !== undefined;

/** @param {any} record @returns {boolean} Complete, in band and not refused by AR1. */
export const isUseful = (record) => isComplete(record) && record.side === 'in' && record.ar1 !== true;

/** @param {any} record @returns {number} Main and census work of a record, in units. */
export const workOf = (record) => (record.mainWork ?? 0) + (record.censusWork ?? 0);

/**
 * @param {any} set A set of calls.json.
 * @returns {{ source: 'call' | 'window', order: number, record: any }[]} Call profiles in call order, then windows.
 */
export function profilesOf(set) {
  return [
    ...set.profiles.map((/** @type {any} */ record, /** @type {number} */ k) => ({ source: /** @type {const} */ ('call'), order: k, record })),
    ...set.windows.map((/** @type {any} */ record, /** @type {number} */ k) => ({
      source: /** @type {const} */ ('window'), order: set.profiles.length + k, record,
    })),
  ];
}

/**
 * The limits a profile is screened at, in job order: the fixed values ascending, then the boundary values from its own
 * canonical record (only for a complete profile with a known first solution): the main work less one (the run passes
 * `W` at its very end), the work to the first solution less one (the limit is passed before it) and the middle of the
 * count tail (a cap during the tail). A value that coincides with another keeps both kinds; a value at or above the
 * canonical limit is no screen and is dropped.
 * @param {any} record Canonical record.
 * @param {number} canonicalLimit
 * @returns {Map<number, string[]>}
 */
export function screenValues(record, canonicalLimit) {
  /** @type {Map<number, string[]>} */
  const values = new Map(FIXED_W.map((W) => [W, ['fixed']]));
  if (isComplete(record) && record.workFirst > 0) {
    const tail = record.mainWork - record.workFirst;
    const add = (/** @type {number} */ W, /** @type {string} */ kind) => {
      if (W < 0 || W >= canonicalLimit) {
        return;
      }
      const kinds = values.get(W);
      if (kinds === undefined) {
        values.set(W, [kind]);
      } else {
        kinds.push(kind);
      }
    };
    add(record.mainWork - 1, 'mainWork-1');
    add(record.workFirst - 1, 'workFirst-1');
    if (tail >= 2) {
      add(record.workFirst + Math.floor(tail / 2), 'tail-mid');
    }
  }
  return values;
}

/**
 * @param {string} caseId
 * @param {any} calls The cell's calls.json.
 * @returns {{ key: string, caseId: string, set: number, order: number, source: string, W: number, kinds: string[],
 *   record: any, boardRows: string[], pieces: any[], witness: any[], levelId: string }[]}
 *   The cell's screen jobs in the fixed order: set, profile, then the limits in `screenValues` order.
 */
export function jobsFor(caseId, calls) {
  /** @type {any[]} */
  const jobs = [];
  for (const set of calls.sets) {
    if (set.pieces === null) {
      continue;
    }
    for (const p of profilesOf(set)) {
      for (const [W, kinds] of screenValues(p.record, calls.limits.work)) {
        jobs.push({
          key: `${set.i}/${p.order}/${W}`, caseId, set: set.i, order: p.order, source: p.source, W, kinds, record: p.record,
          boardRows: set.boardRows, pieces: set.pieces, witness: set.witness, levelId: calls.levelId,
        });
      }
    }
  }
  return jobs;
}

/** @param {unknown} x @returns {any} */
const plain = (x) => JSON.parse(JSON.stringify(x));

/** @param {any} a @param {any} b @returns {boolean} The two ratings are deep-equal. */
const sameRating = (a, b) => isDeepStrictEqual(plain(a), plain(b));

/**
 * Classifies a screen result against the canonical record of its profile and checks the certificate.
 * `certified` (a rating with main work at most `W`) must deep-equal the canonical rating; `scap0` (capped before the
 * first solution) needs a canonical record that is capped or has main work above `W`; `scap1` (a rating with main work
 * above `W` and stop `work-cap`) and `over` (another stop) are recorded with their equality; a boundary screen is
 * never certified. A problem is a violation.
 * @param {{ screen: any, canonical: any, W: number, kinds: string[] }} o
 * @returns {{ class: 'certified' | 'scap0' | 'scap1' | 'over' | 'other', equalCanonical: boolean | null,
 *   violation: boolean, problems: string[] }}
 */
export function classify({ screen, canonical, W, kinds }) {
  const complete = isComplete(canonical);
  /** @type {string[]} */
  const problems = [];
  /** @type {'certified' | 'scap0' | 'scap1' | 'over' | 'other'} */
  let cls;
  /** @type {boolean | null} */
  let equal = null;
  const outcome = screen.outcome;
  if (outcome === 'scap0') {
    cls = 'scap0';
    if (complete && canonical.mainWork <= W) {
      problems.push('scap0, but the canonical rating is complete with main work at most W');
    }
  } else if (outcome === 'scap1' || outcome === 'over') {
    cls = outcome;
    if (!(screen.mainWork > W)) {
      problems.push(`${outcome} with main work ${screen.mainWork} not above W`);
    }
    if (!complete) {
      problems.push(`${outcome}: a screen rating exists but the canonical run has none`);
    }
    equal = complete && sameRating(screen.rating, canonical.rating);
  } else if (outcome === 'unsat' || outcome === 'error' || outcome === 'capped') {
    cls = 'other';
    if (canonical.outcome !== outcome) {
      problems.push(`screen outcome ${outcome}, canonical outcome ${canonical.outcome}`);
    }
  } else {
    cls = 'certified';
    if (!(screen.mainWork <= W)) {
      problems.push(`a rating with main work ${screen.mainWork} above W was not classified as screen-capped`);
    }
    if (!complete) {
      problems.push('certified, but the canonical run has no rating (capped)');
    }
    equal = complete && sameRating(screen.rating, canonical.rating);
    if (complete && !equal) {
      problems.push('the certified screen differs from the canonical rating');
    }
    if (kinds.some((k) => k !== 'fixed')) {
      problems.push('a boundary screen was certified (impossible by construction)');
    }
  }
  return { class: cls, equalCanonical: equal, violation: problems.length > 0, problems };
}

/** @param {unknown} text @returns {string} A message without absolute paths (records refuse them). */
const clean = (text) => String(text ?? '').replace(/[A-Za-z]:[\\/][^\s"']*/g, '<path>');

/** @param {any} record @returns {Record<string, any>} A record without its rating and details. */
function slim(record) {
  const { rating, details, W, idx, ...rest } = record;
  void rating;
  void details;
  void W;
  void idx;
  return rest;
}

/**
 * @param {Run} run
 * @param {string} kind
 * @param {string} shard
 * @param {string[]} cases
 * @param {string} startedAt
 * @param {number} horizonS
 * @param {Record<string, number>} progress
 * @param {Record<string, any>} fields
 */
function finishState(run, kind, shard, cases, startedAt, horizonS, progress, fields) {
  const seconds = Math.round(elapsedS() * 1000) / 1000;
  writeState(run, kind, shard, cases, {
    ...fields,
    lastInvocation: { start: startedAt, end: new Date().toISOString(), seconds, horizonS, progress },
  });
  return seconds;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function callsCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'run-id', 'shard', 'cases', 'label', 'source-label', 'horizon-s'] });
  need(args, ['shard', 'cases', 'label']);
  const run = await openRun(args);
  const cases = parseCaseList(args.cases, run.manifest);
  const shard = shardName(args.shard);
  const prev = claimShard(run, 'calls', shard, cases);
  if (prev?.inProgress) {
    throw new Stop(`calls shard ${shard}: an earlier invocation started calls and recorded no result (a started observation without its record): the pack author decides`);
  }
  const horizonS = Number(args['horizon-s'] ?? 285);
  const startedAt = new Date(Date.now() - elapsedS() * 1000).toISOString();
  /** @type {{ caseId: string, i: number }[]} */
  const pending = [];
  /** @type {Set<string>} */
  const recorded = new Set();
  for (const caseId of cases) {
    const calls = readCalls(run, caseId);
    for (const set of calls?.sets ?? []) {
      recorded.add(`${caseId}/${set.i}`);
    }
    for (let i = 0; i < run.manifest.sets; i += 1) {
      if (!recorded.has(`${caseId}/${i}`)) {
        pending.push({ caseId, i });
      }
    }
  }
  const expected = cases.length * run.manifest.sets;
  if (prev === null) {
    writeState(run, 'calls', shard, cases, { done: false, inProgress: null, lastInvocation: null });
  }
  /** @type {any} */
  let engine = null;
  let ran = 0;
  let censored = 0;
  /** @type {string[]} */
  const failures = [];
  if (pending.length > 0) {
    const lanes = await createLanes({ variant: run.manifest.variant, size: 4, horizonS });
    writeState(run, 'calls', shard, cases, {
      done: false, inProgress: { start: startedAt, sets: pending.map((p) => `${p.caseId}/${p.i}`) },
      lastInvocation: prev?.lastInvocation ?? null,
    });
    try {
      const out = await lanes.runAll(pending.map(({ caseId, i }) => {
        const entry = caseBoard(caseId);
        return {
          kind: 'call', boardRows: entry.boardRows, levelId: entry.levelId, seedText: `${run.manifest.seedPrefix}/${caseId}/${i}`,
          maxAttempts: run.manifest.maxAttempts, window: run.manifest.window,
        };
      }));
      /** @type {Map<string, any[]>} */
      const added = new Map();
      for (const [n, { caseId, i }] of pending.entries()) {
        const result = out.results[n];
        if (result === undefined) {
          continue;
        }
        const entry = caseBoard(caseId);
        const seedText = `${run.manifest.seedPrefix}/${caseId}/${i}`;
        /** @type {Record<string, any>} */
        let record = {
          i, seed: seedText, outcome: result.outcome, boardRows: entry.boardRows, attempt: null, K: null, area: entry.area,
          offeredInSource: null, startCount: null, sizes: null, carving: null, pieces: null, witness: null,
          callResult: result.result ?? null, censored: result.outcome === 'censored', cutAtS: result.cutAtS ?? null,
          message: result.message === undefined ? null : clean(result.message), failures: result.failures ?? null,
          reason: result.reason === undefined ? null : clean(result.reason),
          profiles: result.profiles ?? [], windows: result.windows ?? [],
        };
        if (result.outcome === 'ok' || result.outcome === 'censored') {
          engine ??= await loadEngine(run.tree.root);
          const carved = firstCarvedSet(engine, { boardRows: entry.boardRows, levelId: entry.levelId, seedText, maxAttempts: run.manifest.maxAttempts });
          if (!carved.ok) {
            throw new Stop(`the host could not carve ${seedText} again`);
          }
          const info = setInfo(carved);
          const workerInfo = result.set ?? null;
          if (workerInfo !== null && !isDeepStrictEqual(info, workerInfo)) {
            throw new Stop(`the host carve of ${seedText} differs from the lane's set`);
          }
          record = {
            ...record, attempt: info.attempt, K: info.K, area: info.area, offeredInSource: info.offeredInSource, sizes: info.sizes,
            carving: info.carving, startCount: startCountFor(engine, entry.levelId, info.K), pieces: plain(carved.set.pieces),
            witness: plain(carved.set.witness),
          };
        }
        if (result.outcome === 'error' || result.outcome === 'defect') {
          failures.push(`${seedText}: ${clean(result.message ?? result.reason)}`);
        }
        ran += 1;
        censored += record.censored ? 1 : 0;
        added.set(caseId, [...(added.get(caseId) ?? []), record]);
      }
      for (const [caseId, sets] of added) {
        engine ??= await loadEngine(run.tree.root);
        const entry = caseBoard(caseId);
        const level = engine.levels.level(entry.levelId);
        const existing = readCalls(run, caseId);
        const merged = [...(existing?.sets ?? []), ...sets].sort((a, b) => a.i - b.i);
        writeText(callsFile(run, caseId), JSON.stringify({
          format: 'ig-proto-pm4-calls', version: 1, task: run.task, run: run.runId, case: caseId, levelId: entry.levelId,
          band: { min: level.min, max: Number.isFinite(level.max) ? level.max : null, share: level.share },
          area: entry.area, limits: { work: engine.policy.DEDUCE.work, census: engine.policy.DEDUCE.census },
          treeId: run.tree.treeId, harnessHash: run.harness.harnessHash, sets: merged,
        }));
      }
      if (out.defect !== null) {
        failures.push(`defect: ${out.defect.reason}`);
      }
    } finally {
      await lanes.close();
    }
  }
  let have = 0;
  for (const caseId of cases) {
    const calls = readCalls(run, caseId);
    have += (calls?.sets ?? []).filter((/** @type {any} */ s) => s.outcome !== 'error').length;
  }
  const done = failures.length === 0 && have === expected;
  const seconds = finishState(run, 'calls', shard, cases, startedAt, horizonS, { calls: ran }, {
    done, inProgress: null, sets: { recorded: have, expected, censored }, failures,
  });
  process.stdout.write(`pm4: calls ${shard}: ${ran} call(s) recorded in this invocation (${censored} censored), ${have} of ${expected} in all (${seconds} s)${done ? '; done' : ''}\n`);
  if (failures.length > 0) {
    process.stderr.write(`pm4: STOP: ${failures.join('; ')}\n`);
    return 1;
  }
  return 0;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function screensCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'run-id', 'shard', 'cases', 'label', 'source-label', 'horizon-s'] });
  need(args, ['shard', 'cases', 'label']);
  const run = await openRun(args);
  const cases = parseCaseList(args.cases, run.manifest);
  const shard = shardName(args.shard);
  const prev = claimShard(run, 'screens', shard, cases);
  const callsStates = shardStates(run, 'calls');
  for (const caseId of cases) {
    const owner = [...callsStates.values()].find((s) => s.cases.includes(caseId));
    if (owner === undefined || owner.done !== true) {
      throw new Stop(`cell ${caseId} has no done calls shard: run its calls first`);
    }
  }
  const horizonS = Number(args['horizon-s'] ?? 285);
  const startedAt = new Date(Date.now() - elapsedS() * 1000).toISOString();
  if (prev === null) {
    writeState(run, 'screens', shard, cases, { done: false, lastInvocation: null });
  }
  /** @type {Map<string, ReturnType<typeof jobsFor>>} */
  const jobsByCase = new Map();
  /** @type {Map<string, Set<string>>} */
  const doneByCase = new Map();
  /** @type {any[]} */
  const pending = [];
  for (const caseId of cases) {
    const calls = readCalls(run, caseId);
    const jobs = jobsFor(caseId, calls);
    const file = checkpointFile(run, caseId);
    const lines = readLines(file);
    if (lines.length === 0) {
      mkdirSync(join(run.runDir, caseId), { recursive: true });
      appendFileSync(file, `${JSON.stringify({ t: 'header', task: run.task, run: run.runId, case: caseId, treeId: run.tree.treeId, harnessHash: run.harness.harnessHash })}\n`);
    } else if (lines[0].treeId !== run.tree.treeId || lines[0].harnessHash !== run.harness.harnessHash) {
      throw new Stop(`the checkpoint of ${caseId} was started on another tree or harness: nothing was rated`);
    }
    const done = new Set(lines.filter((l) => l.t === 'screen').map((l) => l.key));
    jobsByCase.set(caseId, jobs);
    doneByCase.set(caseId, done);
    pending.push(...jobs.filter((j) => !done.has(j.key)));
  }
  let ran = 0;
  /** @type {any[]} */
  const violations = [];
  /** @type {string | null} */
  let defect = null;
  if (pending.length > 0) {
    const lanes = await createLanes({ variant: run.manifest.variant, size: 4, horizonS });
    try {
      for (let at = 0; at < pending.length && defect === null && violations.length === 0; at += CHUNK) {
        const batch = pending.slice(at, at + CHUNK);
        const out = await lanes.runAll(batch.map((job) => ({
          kind: 'rate', boardRows: job.boardRows, pieces: job.pieces, clues: job.record.idx.map((/** @type {number} */ i) => job.witness[i]),
          W: job.W, levelId: job.levelId, idx: job.record.idx,
        })));
        for (const [n, job] of batch.entries()) {
          const result = out.results[n];
          if (result === undefined) {
            continue;
          }
          if (result.outcome === 'defect' || (result.message !== undefined && result.profiles !== undefined)) {
            defect = `the lane failed on ${job.caseId} ${job.key}: ${clean(result.message ?? result.reason)}`;
            break;
          }
          const verdict = classify({ screen: result, canonical: job.record, W: job.W, kinds: job.kinds });
          const line = {
            t: 'screen', key: job.key, case: job.caseId, set: job.set, order: job.order, source: job.source, W: job.W, kinds: job.kinds,
            class: verdict.class, equalCanonical: verdict.equalCanonical, violation: verdict.violation, problems: verdict.problems,
            screen: slim(result),
          };
          appendFileSync(checkpointFile(run, job.caseId), `${JSON.stringify(line)}\n`);
          doneByCase.get(job.caseId)?.add(job.key);
          ran += 1;
          if (verdict.violation) {
            violations.push({ ...line, screenRating: result.rating ?? null, canonical: job.record });
          }
        }
        if (out.defect !== null) {
          defect = out.defect.reason;
        }
        if (!out.done) {
          break;
        }
      }
    } finally {
      await lanes.close();
    }
  }
  let recorded = 0;
  let expected = 0;
  /** @type {Record<string, { expected: number, recorded: number }>} */
  const perCase = {};
  for (const caseId of cases) {
    const total = jobsByCase.get(caseId)?.length ?? 0;
    const have = doneByCase.get(caseId)?.size ?? 0;
    perCase[caseId] = { expected: total, recorded: have };
    expected += total;
    recorded += have;
  }
  if (violations.length > 0) {
    writeJson(join(run.runDir, `screens-${shard}-violations.json`), { run: run.runId, shard, violations });
  }
  const done = recorded === expected && violations.length === 0 && defect === null;
  const seconds = finishState(run, 'screens', shard, cases, startedAt, horizonS, { jobs: ran }, {
    done, jobs: { recorded, expected, perCase }, violations: violations.length, defect,
  });
  process.stdout.write(`pm4: screens ${shard}: ${ran} screen(s) recorded in this invocation, ${recorded} of ${expected} in all (${seconds} s)${done ? '; done' : ''}\n`);
  if (violations.length > 0) {
    process.stderr.write(`pm4: STOP: ${violations.length} certificate violation(s): ${violations.map((v) => `${v.case} ${v.key} ${v.problems.join(' / ')}`).join('; ')}\n`);
    return 1;
  }
  if (defect !== null) {
    process.stderr.write(`pm4: STOP: ${defect}\n`);
    return 1;
  }
  return 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Analysis

/** @param {number | null | undefined} x @param {number} [d] @returns {number | null} */
const round = (x, d = 6) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

/** @param {number} n @param {number} of @returns {number | null} */
const share = (n, of) => (of === 0 ? null : n / of);

/** @param {number[]} values */
export function dist(values) {
  return {
    n: values.length,
    p10: round(percentile(values, 0.1)),
    median: round(median(values)),
    p90: round(percentile(values, 0.9)),
    min: values.length === 0 ? null : round(Math.min(...values)),
    max: values.length === 0 ? null : round(Math.max(...values)),
  };
}

/** @param {number} offset The clue count less the set's start count. @returns {string} */
export function offsetBucket(offset) {
  return offset < 0 ? '<0' : offset > 4 ? '>4' : String(offset);
}

/**
 * @typedef {object} Run1 One screen run of a profile.
 * @property {number} W
 * @property {string[]} kinds
 * @property {string} class
 * @property {boolean | null} equalCanonical
 * @property {boolean} violation
 * @property {string[]} problems
 * @property {Record<string, any>} screen
 */

/**
 * @typedef {object} Prof
 * @property {string} cell
 * @property {number} set
 * @property {number} order
 * @property {'call' | 'window'} source
 * @property {number} count
 * @property {number} K
 * @property {number} startCount
 * @property {number[]} idx
 * @property {any} canonical
 * @property {Run1[]} runs
 * @property {Record<string, Run1>} byW The runs at the fixed limits, by limit.
 */

/**
 * @param {string} caseId
 * @param {any} calls
 * @param {Map<string, any>} lines Checkpoint lines by job key.
 * @returns {{ profiles: Prof[], missing: string[] }}
 */
export function loadProfiles(caseId, calls, lines) {
  /** @type {Prof[]} */
  const profiles = [];
  /** @type {string[]} */
  const missing = [];
  for (const set of calls.sets) {
    if (set.pieces === null) {
      continue;
    }
    for (const p of profilesOf(set)) {
      /** @type {Run1[]} */
      const runs = [];
      for (const [W, kinds] of screenValues(p.record, calls.limits.work)) {
        const line = lines.get(`${set.i}/${p.order}/${W}`);
        if (line === undefined) {
          missing.push(`${caseId} ${set.i}/${p.order}/${W}`);
          continue;
        }
        runs.push({
          W, kinds, class: line.class, equalCanonical: line.equalCanonical, violation: line.violation, problems: line.problems, screen: line.screen,
        });
      }
      profiles.push({
        cell: caseId, set: set.i, order: p.order, source: p.source, count: p.record.count, K: set.K, startCount: set.startCount,
        idx: p.record.idx, canonical: p.record, runs,
        byW: Object.fromEntries(runs.filter((r) => r.kinds.includes('fixed')).map((r) => [String(r.W), r])),
      });
    }
  }
  return { profiles, missing };
}

/** @param {Run1} r @returns {boolean} Not certified: the screen result steers the search only. */
const screenCapped = (r) => r.class === 'scap0' || r.class === 'scap1' || r.class === 'over';

/**
 * The economics of one limit on a set of profiles (today's call profiles, or the window subsets).
 * @param {Prof[]} profiles
 * @param {number} W
 */
export function perW(profiles, W) {
  const key = String(W);
  const counts = { certified: 0, scap0: 0, scap1: 0, over: 0, other: 0 };
  const equal = { over: { equal: 0, of: 0 }, scap1: { equal: 0, of: 0 } };
  let violations = 0;
  let screenMs = 0;
  let canonicalMs = 0;
  let screenWork = 0;
  let canonicalWork = 0;
  let lostMs = 0;
  let lostWork = 0;
  let capped = 0;
  const mis = { below: 0, inBand: 0, above: 0, canonicalCapped: 0 };
  let complete = 0;
  let completeLe = 0;
  let usefulLe = 0;
  /** @type {Prof[]} */
  const useful = [];
  /** @type {Prof[]} */
  const lost = [];
  for (const p of profiles) {
    const r = p.byW[key];
    const c = p.canonical;
    counts[/** @type {keyof typeof counts} */ (r.class)] += 1;
    violations += r.violation ? 1 : 0;
    if (r.class === 'over' || r.class === 'scap1') {
      equal[r.class].of += 1;
      equal[r.class].equal += r.equalCanonical === true ? 1 : 0;
    }
    screenMs += r.screen.ms;
    canonicalMs += c.ms;
    screenWork += workOf(r.screen);
    canonicalWork += workOf(c);
    const isCapped = screenCapped(r);
    capped += isCapped ? 1 : 0;
    if (isCapped) {
      if (!isComplete(c)) {
        mis.canonicalCapped += 1;
      } else if (c.side === 'below') {
        mis.below += 1;
      } else if (c.side === 'in') {
        mis.inBand += 1;
      } else {
        mis.above += 1;
      }
    }
    if (isComplete(c)) {
      complete += 1;
      completeLe += c.mainWork <= W ? 1 : 0;
    }
    if (isUseful(c)) {
      useful.push(p);
      usefulLe += c.mainWork <= W ? 1 : 0;
      if (isCapped) {
        lost.push(p);
        lostMs += c.ms;
        lostWork += workOf(c);
      }
    }
  }
  const clueShare = (/** @type {Prof} */ p) => p.count / p.K;
  const lostSet = new Set(lost);
  /** @type {Record<string, { lost: number, of: number }>} */
  const byOffset = Object.fromEntries(OFFSET_BUCKETS.map((b) => [b, { lost: 0, of: 0 }]));
  for (const p of useful) {
    const bucket = byOffset[offsetBucket(p.count - p.startCount)];
    bucket.of += 1;
    bucket.lost += lostSet.has(p) ? 1 : 0;
  }
  const lostShares = dist(lost.map(clueShare));
  const allShares = dist(useful.map(clueShare));
  const lostOffsets = dist(lost.map((p) => p.count - p.startCount));
  const allOffsets = dist(useful.map((p) => p.count - p.startCount));
  const net = canonicalMs === 0 ? null : (screenMs + lostMs) / canonicalMs;
  return {
    W,
    n: profiles.length,
    counts,
    violations,
    overEqualCanonical: equal.over,
    scap1EqualCanonical: equal.scap1,
    usefulLost: { n: lost.length, of: useful.length, share: round(share(lost.length, useful.length)) },
    lossesLie: {
      clueShareLost: lostShares,
      clueShareAllUseful: allShares,
      medianShift: lostShares.median === null || allShares.median === null ? null : round(lostShares.median - allShares.median),
      offsetLost: lostOffsets,
      offsetAllUseful: allOffsets,
      byOffset,
    },
    misdirected: {
      screenCapped: capped,
      below: mis.below,
      inBand: mis.inBand,
      above: mis.above,
      canonicalCapped: mis.canonicalCapped,
      share: { below: round(share(mis.below, capped)), inBand: round(share(mis.inBand, capped)) },
    },
    cost: {
      canonicalMs: round(canonicalMs, 3),
      screenMs: round(screenMs, 3),
      lostCanonicalMs: round(lostMs, 3),
      ratio: round(canonicalMs === 0 ? null : screenMs / canonicalMs),
      netRatio: round(net),
      saving: round(net === null || net === 0 ? null : 1 / net),
    },
    perUseful: {
      useful: useful.length,
      canonicalMs: round(useful.length === 0 ? null : canonicalMs / useful.length, 3),
      withScreenMs: round(useful.length === 0 ? null : (screenMs + lostMs) / useful.length, 3),
      canonicalWork: round(useful.length === 0 ? null : canonicalWork / useful.length, 0),
      withScreenWork: round(useful.length === 0 ? null : (screenWork + lostWork) / useful.length, 0),
    },
    mainLeW: {
      complete: { n: completeLe, of: complete, share: round(share(completeLe, complete)) },
      inBandEligible: { n: usefulLe, of: useful.length, share: round(share(usefulLe, useful.length)) },
    },
  };
}

/** @param {Prof[]} profiles */
export function canonicalBlock(profiles) {
  const cs = profiles.map((p) => p.canonical);
  return {
    n: cs.length,
    capped: cs.filter((c) => c.outcome === 'capped').length,
    unsat: cs.filter((c) => c.outcome === 'unsat').length,
    error: cs.filter((c) => c.outcome === 'error').length,
    complete: cs.filter(isComplete).length,
    inBand: cs.filter((c) => isComplete(c) && c.side === 'in').length,
    inBandEligible: cs.filter(isUseful).length,
    r7Cut: cs.filter((c) => c.r7Cut > 0).length,
    r7CutCensus: cs.filter((c) => c.r7CutCensus > 0).length,
  };
}

/** @param {Prof[]} profiles */
export function firstSolutionBlock(profiles) {
  const done = profiles.map((p) => p.canonical).filter(isComplete);
  const withFirst = done.filter((c) => c.workFirst >= 0);
  return {
    complete: done.length,
    workFirst: summarize(withFirst.map((c) => c.workFirst)),
    mainWork: summarize(done.map((c) => c.mainWork)),
    countTail: summarize(withFirst.map((c) => c.mainWork - c.workFirst)),
    censusWork: summarize(done.map((c) => c.censusWork)),
  };
}

/** @param {Prof[]} profiles */
export function costByOffset(profiles) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const bucket of OFFSET_BUCKETS) {
    const list = profiles.filter((p) => offsetBucket(p.count - p.startCount) === bucket);
    const ms = list.map((p) => p.canonical.ms);
    const done = list.map((p) => p.canonical).filter(isComplete);
    out[bucket] = {
      n: list.length,
      call: list.filter((p) => p.source === 'call').length,
      window: list.filter((p) => p.source === 'window').length,
      capped: list.filter((p) => p.canonical.outcome === 'capped').length,
      cappedShare: round(share(list.filter((p) => p.canonical.outcome === 'capped').length, list.length)),
      complete: done.length,
      useful: list.filter((p) => isUseful(p.canonical)).length,
      msMedian: round(median(ms), 3),
      msMean: round(ms.length === 0 ? null : ms.reduce((s, x) => s + x, 0) / ms.length, 3),
      mainWorkMedian: round(median(done.map((c) => c.mainWork)), 0),
    };
  }
  return out;
}

/**
 * Among the first four call profiles of each set at its start count, the share that is canonically capped (R29).
 * @param {Prof[]} callProfiles
 */
export function startCountCapped(callProfiles) {
  /** @type {Map<number, Prof[]>} */
  const bySet = new Map();
  for (const p of callProfiles) {
    if (p.count === p.startCount) {
      bySet.set(p.set, [...(bySet.get(p.set) ?? []), p]);
    }
  }
  let profiles = 0;
  let capped = 0;
  const sets = [...bySet.entries()].sort(([a], [b]) => a - b).map(([set, list]) => {
    const first = list.sort((a, b) => a.order - b.order).slice(0, 4);
    const n = first.filter((p) => p.canonical.outcome === 'capped').length;
    profiles += first.length;
    capped += n;
    return { set, profiles: first.length, capped: n };
  });
  return { sets, profiles, capped, share: round(share(capped, profiles)) };
}

/** @param {Prof[]} profiles */
export function boundaryBlock(profiles) {
  const classes = { certified: 0, scap0: 0, scap1: 0, over: 0, other: 0 };
  /** @type {Record<string, any>} */
  const byKind = Object.fromEntries(BOUNDARY_KINDS.map((k) => [k, { runs: 0, ...classes }]));
  let runs = 0;
  let r7Cut = 0;
  for (const p of profiles) {
    for (const r of p.runs) {
      if (!r.kinds.some((k) => k !== 'fixed')) {
        continue;
      }
      runs += 1;
      classes[/** @type {keyof typeof classes} */ (r.class)] += 1;
      r7Cut += r.screen.r7Cut > 0 ? 1 : 0;
      for (const kind of r.kinds.filter((k) => k !== 'fixed')) {
        byKind[kind].runs += 1;
        byKind[kind][r.class] += 1;
      }
    }
  }
  return { runs, classes, r7Cut, byKind };
}

/**
 * The certificate's coverage over every screen run (fixed and boundary limits, call and window profiles).
 * @param {Prof[]} profiles
 */
export function coverageOf(profiles) {
  const names = ['certified', 'over', 'scap1', 'scap0', 'other'];
  /** @type {Record<string, { runs: number, fixed: number, boundary: number }>} */
  const classes = Object.fromEntries(names.map((c) => [c, { runs: 0, fixed: 0, boundary: 0 }]));
  const zero = () => Object.fromEntries(names.map((c) => [c, 0]));
  const r7 = { runs: 0, fixed: 0, boundary: 0, byClass: zero(), equalCanonical: { equal: 0, of: 0 } };
  const census = { runs: 0, byClass: zero(), canonicalRuns: 0 };
  const equal = { certified: { equal: 0, of: 0 }, over: { equal: 0, of: 0 }, scap1: { equal: 0, of: 0 } };
  let canonicalR7 = 0;
  /** @type {any[]} */
  const violations = [];
  for (const p of profiles) {
    canonicalR7 += p.canonical.r7Cut > 0 ? 1 : 0;
    census.canonicalRuns += p.canonical.r7CutCensus > 0 ? 1 : 0;
    for (const r of p.runs) {
      const fixed = r.kinds.includes('fixed');
      const boundary = r.kinds.some((k) => k !== 'fixed');
      const c = classes[r.class];
      c.runs += 1;
      c.fixed += fixed ? 1 : 0;
      c.boundary += boundary ? 1 : 0;
      if (r.screen.r7Cut > 0) {
        r7.runs += 1;
        r7.fixed += fixed ? 1 : 0;
        r7.boundary += boundary ? 1 : 0;
        r7.byClass[r.class] += 1;
        if (r.equalCanonical !== null) {
          r7.equalCanonical.of += 1;
          r7.equalCanonical.equal += r.equalCanonical ? 1 : 0;
        }
      }
      if (r.screen.r7CutCensus > 0) {
        census.runs += 1;
        census.byClass[r.class] += 1;
      }
      if (r.class === 'over' || r.class === 'scap1' || r.class === 'certified') {
        equal[r.class].of += 1;
        equal[r.class].equal += r.equalCanonical === true ? 1 : 0;
      }
      if (r.violation) {
        violations.push({
          cell: p.cell, set: p.set, order: p.order, source: p.source, count: p.count, W: r.W, kinds: r.kinds, class: r.class, problems: r.problems,
        });
      }
    }
  }
  /** @type {string[]} */
  const gaps = [];
  for (const name of ['certified', 'over', 'scap1', 'scap0']) {
    if (classes[name].runs === 0) {
      gaps.push(`no ${name} run observed`);
    }
  }
  if (r7.runs === 0) {
    gaps.push("no run with an R7 early NONE in the main search (r7Cut > 0) observed");
  }
  return { classes, r7Cut: r7, r7CutCensus: census, equalCanonical: equal, canonicalR7Runs: canonicalR7, violations, gaps };
}

const ARGUMENT = 'Every main-phase check compares `work` with the same limit (core/engine/deduce.js lines 840, 1102, 1128, '
  + '1623) and work never decreases; R7 gives up only when `work > workLimit` and the next check of `branch` then stops '
  + 'with `work-cap`; the census budget is relative. A run whose main work at the end is at most `W` therefore passed no '
  + 'check differently from the canonical run (valid only with `DEDUCE.work` lowered and every other limit unchanged).';

/**
 * @param {string} caseId
 * @param {any} calls
 * @param {Prof[]} profiles
 */
export function analyseCell(caseId, calls, profiles) {
  const callProfiles = profiles.filter((p) => p.source === 'call');
  const windowProfiles = profiles.filter((p) => p.source === 'window');
  const perLimit = (/** @type {Prof[]} */ list) => Object.fromEntries(FIXED_W.map((W) => [String(W), perW(list, W)]));
  return {
    level: calls.levelId,
    band: calls.band,
    area: calls.area,
    sets: calls.sets.map((/** @type {any} */ s) => ({
      seed: s.seed, outcome: s.outcome, attempt: s.attempt, K: s.K, area: s.area, offeredInSource: s.offeredInSource, startCount: s.startCount,
      callResult: s.callResult, callProfiles: s.profiles.length, windowProfiles: s.windows.length, censored: s.censored, cutAtS: s.cutAtS,
    })),
    canonical: canonicalBlock(callProfiles),
    perW: perLimit(callProfiles),
    window: { canonical: canonicalBlock(windowProfiles), perW: perLimit(windowProfiles), firstSolution: firstSolutionBlock(windowProfiles) },
    boundary: boundaryBlock(profiles),
    firstSolution: firstSolutionBlock(callProfiles),
    startCountCappedShare: startCountCapped(callProfiles),
    costByOffset: costByOffset(profiles),
    censoredCalls: {
      calls: calls.sets.filter((/** @type {any} */ s) => s.censored).length,
      profiles: calls.sets
        .filter((/** @type {any} */ s) => s.censored)
        .reduce((/** @type {number} */ n, /** @type {any} */ s) => n + s.profiles.length + s.windows.length, 0),
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Report text

/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
const fix = (x, d = 3) => (x === null || x === undefined ? '-' : Number(x).toFixed(d));
/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
const pct = (x, d = 1) => (x === null || x === undefined ? '-' : `${(100 * x).toFixed(d)} %`);
/** @param {number | null | undefined} x @param {number} [d] @returns {string} */
const mega = (x, d = 1) => (x === null || x === undefined ? '-' : `${(x / 1e6).toFixed(d)} M`);
/** @param {number} W @returns {string} */
const wText = (W) => `${W / 1e6} M`;
/** @param {any} d @returns {string} median [p10-p90] of a distribution of shares */
const distText = (d) => (d.n === 0 ? '-' : `${fix(d.median)} [${fix(d.p10)}-${fix(d.p90)}]`);
/** @param {number} n @param {number} of @returns {string} */
const countText = (n, of) => `${n} (${pct(share(n, of), 0)})`;

/**
 * @param {string[]} head
 * @param {string[][]} rows
 * @returns {string[]}
 */
function table(head, rows) {
  return [`| ${head.join(' | ')} |`, `|${head.map((_, i) => (i === 0 ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)];
}

/** @param {Record<string, any>} perLimit @returns {string[]} The class and loss table of one set of profiles. */
function classTable(perLimit) {
  return table(
    ['W', 'profiles', 'certified', 'scap0', 'scap1', 'over', 'useful lost (of)', 'clue share lost / all useful, median [p10-p90]', 'capped, canonical below / in band', 'main work <= W: complete / useful'],
    FIXED_W.map((W) => {
      const x = perLimit[String(W)];
      const n = x.n;
      return [
        wText(W), String(n), countText(x.counts.certified, n), countText(x.counts.scap0, n), countText(x.counts.scap1, n),
        countText(x.counts.over, n), `${x.usefulLost.n} of ${x.usefulLost.of} (${pct(x.usefulLost.share, 0)})`,
        `${distText(x.lossesLie.clueShareLost)} / ${distText(x.lossesLie.clueShareAllUseful)}`,
        `${x.misdirected.below} / ${x.misdirected.inBand} of ${x.misdirected.screenCapped}`,
        `${pct(x.mainLeW.complete.share, 0)} / ${pct(x.mainLeW.inBandEligible.share, 0)}`,
      ];
    }),
  );
}

/** @param {Record<string, any>} perLimit @returns {string[]} The economics table of one set of profiles. */
function economicsTable(perLimit) {
  return table(
    ['W', 'canonical ms', 'screen ms', 'lost canonical ms', 'cost ratio', 'net ratio', 'P2 saving', 'per useful rating: canonical / with screen, ms', 'per useful rating: canonical / with screen, work'],
    FIXED_W.map((W) => {
      const x = perLimit[String(W)];
      return [
        wText(W), fix(x.cost.canonicalMs, 0), fix(x.cost.screenMs, 0), fix(x.cost.lostCanonicalMs, 0), fix(x.cost.ratio), fix(x.cost.netRatio),
        fix(x.cost.saving, 2), `${fix(x.perUseful.canonicalMs, 1)} / ${fix(x.perUseful.withScreenMs, 1)}`,
        `${mega(x.perUseful.canonicalWork)} / ${mega(x.perUseful.withScreenWork)}`,
      ];
    }),
  );
}

/** @param {Record<string, any>} perLimit @returns {string[]} Where the losses lie, by offset from the start count. */
function offsetTable(perLimit) {
  return table(
    ['W', ...OFFSET_BUCKETS.map((b) => `useful lost / of at offset ${b}`), 'offset lost / all, median'],
    FIXED_W.map((W) => {
      const x = perLimit[String(W)];
      return [
        wText(W), ...OFFSET_BUCKETS.map((b) => `${x.lossesLie.byOffset[b].lost} / ${x.lossesLie.byOffset[b].of}`),
        `${fix(x.lossesLie.offsetLost.median, 1)} / ${fix(x.lossesLie.offsetAllUseful.median, 1)}`,
      ];
    }),
  );
}

/** @param {any} f @returns {string[]} */
function firstSolutionTable(f) {
  const row = (/** @type {string} */ name, /** @type {any} */ s) => [name, String(s.n), mega(s.min), mega(s.median), mega(s.p95), mega(s.max)];
  return table(['Quantity (units)', 'n', 'min', 'median', 'p95', 'max'], [
    row('work to the first solution', f.workFirst), row('main work', f.mainWork), row('count tail (main work - first solution)', f.countTail),
    row('census work', f.censusWork),
  ]);
}

/**
 * @param {Record<string, any>} record The pm4.json object.
 * @param {any} meta
 * @returns {string} The Markdown record.
 */
export function renderMarkdown(record, meta) {
  const cert = record.certificate;
  const cov = cert.coverage;
  const certified = cov.certified;
  /** @type {string[]} */
  const lines = ['# IGP-02 PM4: the screen certificate and the `W_screen` economics', '', banner(meta), ''];
  lines.push('## Certificate verdict (R14)', '');
  lines.push(
    cert.violations.length === 0
      ? `**Holds: 0 violations on ${certified.runs} certified runs** (fixed limits ${certified.fixed}, boundary limits ${certified.boundary}; every certified screen deep-equals its canonical rating). The certificate "main work at the end <= \`W_screen\`, every other limit unchanged" gave the canonical rating on every screen run that satisfied it.`
      : `**FAILS: ${cert.violations.length} violation(s).** ${cert.violations.map((/** @type {any} */ v) => `${v.cell} set ${v.set} profile ${v.order} W ${v.W}: ${v.problems.join('; ')}`).join(' | ')}`,
    '',
  );
  lines.push(`Argument: ${cert.argument}`, '');
  lines.push('### Coverage of the named cases', '');
  lines.push(...table(['Case', 'Runs', 'Fixed limits', 'Boundary limits', 'Equal to canonical'], [
    ['certified (a rating with main work <= W)', String(cov.certified.runs), String(cov.certified.fixed), String(cov.certified.boundary), `${cov.equalCanonical.certified.equal} of ${cov.equalCanonical.certified.of}`],
    ['over (a normal stop after an overshoot)', String(cov.over.runs), String(cov.over.fixed), String(cov.over.boundary), `${cov.equalCanonical.over.equal} of ${cov.equalCanonical.over.of} (no equality required)`],
    ['scap1 (capped after the first solution)', String(cov.scap1.runs), String(cov.scap1.fixed), String(cov.scap1.boundary), `${cov.equalCanonical.scap1.equal} of ${cov.equalCanonical.scap1.of} (no equality required)`],
    ['scap0 (capped before the first solution)', String(cov.scap0.runs), String(cov.scap0.fixed), String(cov.scap0.boundary), 'not applicable'],
    ['other (unsatisfiable or error)', String(cov.other.runs), String(cov.other.fixed), String(cov.other.boundary), 'same outcome as canonical'],
    ['R7 early NONE in the main search (r7Cut > 0), any class', String(cov.r7Cut.runs), String(cov.r7Cut.fixed), String(cov.r7Cut.boundary), `by class: ${Object.entries(cov.r7Cut.byClass).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`],
  ]));
  lines.push('', `R7 coverage reads \`r7Cut\` of the main search only. Census-phase cuts (\`r7CutCensus\`, relative budget) are reported apart: ${cert.r7CutCensus.runs} screen runs (by class: ${Object.entries(cert.r7CutCensus.byClass).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}) and ${cert.r7CutCensus.canonicalRuns} canonical profiles; canonical profiles with a main-search R7 cut: ${cert.canonicalR7Runs}.`, '');
  lines.push(cov.gaps.length === 0 ? 'Named coverage gaps: none.' : `Named coverage gaps: ${cov.gaps.join('; ')}.`, '');
  lines.push('## Pooled over the cells (call profiles)', '');
  lines.push(...classTable(record.pooled.perW), '', ...economicsTable(record.pooled.perW), '', '### Where the losses lie, by offset from the start count', '', ...offsetTable(record.pooled.perW), '');
  for (const [caseId, cell] of Object.entries(/** @type {Record<string, any>} */ (record.cells))) {
    lines.push(`## ${caseId}`, '');
    const kinds = cell.sets.map((/** @type {any} */ s) => `K ${s.K ?? '-'}, start ${s.startCount ?? '-'}, ${s.callProfiles} call + ${s.windowProfiles} window profiles${s.censored ? ' (call censored)' : ''}${s.outcome === 'no-set' ? ' (no set)' : ''}`);
    lines.push(`Level ${cell.level}, band [${cell.band.min}, ${cell.band.max ?? 'inf'}), area ${cell.area}; ${cell.sets.length} sets: ${kinds.join('; ')}.`, '');
    const c = cell.canonical;
    lines.push(`Canonical call profiles: ${c.n}, complete ${c.complete}, capped ${c.capped}, in band ${c.inBand}, useful (in band, AR1-eligible) ${c.inBandEligible}. Start-count capped share (R29 cross-check): ${cell.startCountCappedShare.capped} of ${cell.startCountCappedShare.profiles} (${pct(cell.startCountCappedShare.share)}). Censored calls: ${cell.censoredCalls.calls} (${cell.censoredCalls.profiles} profiles contributed). Boundary screens: ${cell.boundary.runs} runs (certified ${cell.boundary.classes.certified}, scap0 ${cell.boundary.classes.scap0}, scap1 ${cell.boundary.classes.scap1}, over ${cell.boundary.classes.over}), R7 cuts ${cell.boundary.r7Cut}.`, '');
    lines.push('### Call profiles (today\'s mix)', '', ...classTable(cell.perW), '', ...economicsTable(cell.perW), '', ...offsetTable(cell.perW), '');
    lines.push('### First solution (complete canonical call profiles)', '', ...firstSolutionTable(cell.firstSolution), '');
    lines.push('### Window profiles (apart)', '');
    const w = cell.window.canonical;
    lines.push(`Window profiles: ${w.n}, complete ${w.complete}, capped ${w.capped}, in band ${w.inBand}, useful ${w.inBandEligible}.`, '', ...classTable(cell.window.perW), '', ...economicsTable(cell.window.perW), '');
    lines.push('### Canonical cost by clue offset from the start count (call and window profiles)', '', ...table(
      ['Offset', 'profiles (call / window)', 'capped', 'complete', 'useful', 'ms median', 'ms mean', 'main work median'],
      OFFSET_BUCKETS.map((b) => {
        const x = cell.costByOffset[b];
        return [b, `${x.n} (${x.call} / ${x.window})`, `${x.capped} (${pct(x.cappedShare, 0)})`, String(x.complete), String(x.useful), fix(x.msMedian, 1), fix(x.msMean, 1), mega(x.mainWorkMedian)];
      }),
    ), '');
  }
  lines.push('## Notes', '');
  for (const note of record.notes) {
    lines.push(`- ${note}`);
  }
  return lines.join('\n');
}

/** @param {string[]} argv @returns {Promise<number>} */
async function reportCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'run-id', 'label', 'source-label'] });
  const run = await openRun(args);
  const callsStates = shardStates(run, 'calls');
  const screensStates = shardStates(run, 'screens');
  /** @type {string[]} */
  const problems = [];
  for (const [kind, states] of [['calls', callsStates], ['screens', screensStates]]) {
    for (const caseId of run.manifest.cells) {
      const owners = [...(/** @type {Map<string, any>} */ (states)).entries()].filter(([, s]) => s.cases.includes(caseId));
      if (owners.length !== 1) {
        problems.push(`cell ${caseId} is covered by ${owners.length} ${kind} shards, expected 1`);
      } else if (owners[0][1].done !== true) {
        problems.push(`the ${kind} shard ${owners[0][0]} of ${caseId} is not done`);
      }
    }
  }
  /** @type {Record<string, any>} */
  const cells = {};
  /** @type {Prof[]} */
  const all = [];
  /** @type {Record<string, Prof[]>} */
  const profilesByCell = {};
  if (problems.length === 0) {
    for (const caseId of run.manifest.cells) {
      const calls = readCalls(run, caseId);
      if (calls === null || calls.sets.length !== run.manifest.sets) {
        problems.push(`${caseId}: calls.json holds ${calls?.sets.length ?? 0} sets, expected ${run.manifest.sets}`);
        continue;
      }
      const lines = new Map(readLines(checkpointFile(run, caseId)).filter((l) => l.t === 'screen').map((l) => [l.key, l]));
      const { profiles, missing } = loadProfiles(caseId, calls, lines);
      problems.push(...missing.map((m) => `missing screen result: ${m}`));
      for (const p of profiles) {
        for (const W of FIXED_W) {
          if (p.byW[String(W)] === undefined) {
            problems.push(`${caseId} set ${p.set} profile ${p.order} has no screen at ${W}`);
          }
        }
        if (isComplete(p.canonical) === false) {
          for (const r of p.runs) {
            if (r.class === 'certified') {
              problems.push(`${caseId} set ${p.set} profile ${p.order}: a canonical capped profile is certified at ${r.W}`);
            }
          }
        }
        for (const r of p.runs) {
          if (r.class === 'certified' && !(r.screen.mainWork <= r.W)) {
            problems.push(`${caseId} set ${p.set} profile ${p.order}: certified with main work above W ${r.W}`);
          }
          if (r.class === 'certified' && r.kinds.some((k) => k !== 'fixed')) {
            problems.push(`${caseId} set ${p.set} profile ${p.order}: a boundary screen at ${r.W} is certified`);
          }
        }
      }
      profilesByCell[caseId] = profiles;
      all.push(...profiles);
      cells[caseId] = analyseCell(caseId, calls, profiles);
    }
  }
  if (problems.length > 0) {
    throw new Stop(`the report's checks failed: ${problems.slice(0, 20).join('; ')}${problems.length > 20 ? ` (+${problems.length - 20} more)` : ''}`);
  }
  const allCall = all.filter((p) => p.source === 'call');
  const coverage = coverageOf(all);
  const meta = await buildMeta({ task: run.task, label: run.label, kind: 'pm4', trees: [run.manifest.variant], sourceLabel: run.sourceLabel });
  const record = {
    meta,
    run: run.runId,
    W: [...FIXED_W],
    certificate: {
      argument: ARGUMENT,
      violations: coverage.violations,
      certifiedRuns: coverage.classes.certified.runs,
      coverage: {
        certified: coverage.classes.certified, over: coverage.classes.over, scap1: coverage.classes.scap1, scap0: coverage.classes.scap0,
        other: coverage.classes.other, r7Cut: coverage.r7Cut, equalCanonical: coverage.equalCanonical, gaps: coverage.gaps,
      },
      r7CutCensus: coverage.r7CutCensus,
      canonicalR7Runs: coverage.canonicalR7Runs,
    },
    pooled: {
      canonical: canonicalBlock(allCall),
      perW: Object.fromEntries(FIXED_W.map((W) => [String(W), perW(allCall, W)])),
      boundary: boundaryBlock(all),
    },
    cells,
    notes: [
      'Today\'s mix: the call profiles are the ratings of today\'s set-stage search (`selectClues` of the unchanged source, `calibration` stream of each set), not the prototype\'s probe mix; PM3 (IGP-01, IGP-03) measures the real one. Window profiles are reported apart.',
      'Screen-capped means not certified: `scap0`, `scap1` and `over`. A useful rating is a complete canonical rating in band and not refused by AR1; it is lost at W when its screen is screen-capped.',
      'Misdirected: a screen-capped profile whose canonical rating is below the band is read as "too few clues" by P3, the wrong direction; one in band is a lost rating; one above the band, or a canonical cap, is not counted as misdirected (the direction is right or unknown).',
      'Cost ratio = sum of screen ms / sum of canonical ms over the profiles; net ratio = (sum of screen ms + sum of canonical ms of the lost useful ratings, each re-rated once) / sum of canonical ms; P2 saving = 1 / net ratio. Per useful rating: the same sums over the number of useful ratings (work = main + census work). Times come from the calls and screens invocations (four concurrent lanes), so ratios of sums carry timing noise.',
      'Where the losses lie: clue share = clues / K of the useful ratings lost against all useful ratings; the offset is the clue count less the set\'s start count (the share of K of `initialClueCount`).',
      'A boundary limit coinciding with another limit keeps both kinds and is rated once; a boundary limit at or above the canonical limit is dropped.',
      run.label === 'frozen'
        ? 'Frozen: measured on the frozen source `3fc65f4` (task pack v4, V4-T04): the certificate re-proved on the cases of R14; the plan\'s `W` list (95, 190, 380 M) is unchanged.'
        : 'Provisional: measured on the rating-v3 runtime of this worktree, not on the frozen post-MP17 source; the plan\'s `W` list (95, 190, 380 M) is fixed before the first measurement.',
    ],
  };
  const publish = run.task === TASK && run.runId === 'main';
  const outDir = publish ? evidenceDir(run.label, run.task) : join(run.runDir, 'report');
  mkdirSync(outDir, { recursive: true });
  writeJson(join(outDir, 'pm4.json'), record);
  writeText(join(outDir, 'pm4.md'), renderMarkdown(record, meta));
  for (const [caseId, profiles] of Object.entries(profilesByCell)) {
    writeJsonl(join(outDir, `profiles-${caseId}.jsonl`), profiles.map((p) => ({
      set: p.set, order: p.order, source: p.source, count: p.count, idx: p.idx,
      canonical: { ...slim(p.canonical), countTail: isComplete(p.canonical) && p.canonical.workFirst >= 0 ? p.canonical.mainWork - p.canonical.workFirst : null },
      screens: Object.fromEntries(FIXED_W.map((W) => {
        const r = p.byW[String(W)];
        return [String(W), { class: r.class, mainWork: r.screen.mainWork, r7Cut: r.screen.r7Cut, ms: r.screen.ms, equalCanonical: r.equalCanonical }];
      })),
      boundary: p.runs.flatMap((r) => r.kinds.filter((k) => k !== 'fixed').map((kind) => ({
        W: r.W, kind, class: r.class, mainWork: r.screen.mainWork, r7Cut: r.screen.r7Cut, ms: r.screen.ms, equalCanonical: r.equalCanonical,
      }))),
    })));
  }
  process.stdout.write(`pm4: report written to ${rel(outDir)}: ${all.length} profiles, certificate ${coverage.violations.length === 0 ? `holds (0 violations on ${coverage.classes.certified.runs} certified runs)` : `FAILS (${coverage.violations.length})`}\n`);
  return coverage.violations.length === 0 ? 0 : 1;
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'calls') {
    return callsCommand(rest);
  }
  if (command === 'screens') {
    return screensCommand(rest);
  }
  if (command === 'report') {
    return reportCommand(rest);
  }
  throw new Stop('usage: pm4.mjs calls|screens|report ...');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`pm4: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
  setTimeout(() => process.exit(process.exitCode ?? 0), 10000).unref();
}
