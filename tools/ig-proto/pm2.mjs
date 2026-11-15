// @ts-check
// PM2 (IGP-06): where the rating time goes on 10x10 and 12x12 Nightmare, test side only. A corpus of today's set-stage
// calls and window subsets is made by the production call path on the `base` tree; every corpus rating is then
// repeated once, canonically, in one supervised worker thread (`pm2-worker.mjs`) under the V8 CPU profiler, and its
// samples are attributed to phases (search, census, model, DLX diagnostic, other), categories and functions by stack
// ancestry. `summarize` merges the attributions and gives the kernel share and P7's hypothetical sensitivity.
//   node tools\ig-proto\pm2.mjs run       --run-id <main|dry> --label <L> --source-label <SL> --horizon-s <H>   (locked)
//   node tools\ig-proto\pm2.mjs summarize --run-id <main|dry> --label <L> --source-label <SL>                  (unlocked)
// `--task IGP-06-dev` (with a run id `dry` or `dev<n>`) is for developer debugging: its files stay under
// tests/artifacts/ig-proto/<label>/IGP-06-dev/ and its summary never goes to docs/.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { Worker } from 'node:worker_threads';

import { median } from '../bench/report.js';
import { startCountFor } from './lib/calls.mjs';
import { loadEngine } from './lib/engine.mjs';
import { createLanes } from './lib/lanes.mjs';
import { artifactDir, elapsedS, evidenceDir, parseArgs, rel } from './lib/paths.mjs';
import { banner, buildMeta, harnessInfo, writeJson, writeText } from './lib/records.mjs';
import { caseBoard, firstCarvedSet, setInfo } from './lib/sets.mjs';
import { ensureTree } from './lib/tree.mjs';
import {
  addWeight, categoryOf, CATEGORIES, emptyAttribution, markerOf, MARKERS, nameOf, PHASES, SAMPLING_US,
} from './pm2-worker.mjs';

class Stop extends Error {}

const TASK = 'IGP-06';
const DEV_TASK = 'IGP-06-dev';
const WORKER_FILE = fileURLToPath(new URL('./pm2-worker.mjs', import.meta.url));
/** The supervisor cuts a rating that runs longer than this (a defect); a rating is admitted only when e + CUT_S <= H. */
const CUT_S = 30;
/** A call wave starts only when the lanes' own rule (120 s before H - 15) holds with this extra margin. */
const CALL_NEEDS_S = 130;
const CALL_MARGIN_S = 15;
const MAX_LANES = 6;
/** The raw profiles of the first ratings of each cell are kept for the host-side check of the reduction. */
const RAW_KEPT = 5;
/** Every TWIN_EVERY-th rating of a cell is also rated once without the profiler (the profiling overhead). */
const TWIN_EVERY = 10;
const OUTCOMES = Object.freeze(['capped', 'below', 'in', 'above', 'central', 'ar1']);
export const P7_SPEEDS = Object.freeze([1.25, 1.5, 2, 3]);
export const P7_FACTORS = Object.freeze([1.1, 1.3, 1.8, 1.87, 1.91]);
const KINDS = Object.freeze(['call', 'window']);
const CLASSES = Object.freeze(['all', 'complete', 'capped']);

/**
 * IGP-04's P6 figures (compare.md, "P6's work saving"): the share of rating ms saved on today's search (A:B), net of
 * the one recomputed diagnostic per ok call, and the prototype's Derived range.
 */
const P6_REFERENCE = Object.freeze({
  today: [
    { cell: '26x26 Nightmare', savedShare: 0.228 },
    { cell: '14x14 Master', savedShare: 0.154 },
    { cell: '26x26 Master', savedShare: 0.099 },
  ],
  todayText: '10 to 23 %',
  prototypeText: 'about 0 to 7 %',
  prototypeBasis: "Derived in the IGP-04 review: E:F's twin-call rating ratio 0.86 divided by the eight-worker slowdown "
    + "of B:C's twin calls, 0.80 to 0.92",
});

/**
 * The manifest of a run, fixed here: `main` is `10x10-nightmare` and `12x12-nightmare` with three sets each (seeds
 * `ig-pm2/<case>/<i>`); `dry` is `10x10-nightmare` with one set (seed `ig-pm2/dry/0`); the developer's debugging task
 * also has `dev<n>` with the dry manifest.
 * @param {string} runId
 * @param {string} task
 */
export function manifestOf(runId, task) {
  const common = { variant: 'base', window: { offsets: [1, 2, 3, 4], perCount: 3 }, maxAttempts: 8 };
  if (runId === 'main') {
    const cells = ['10x10-nightmare', '12x12-nightmare'];
    return {
      ...common,
      cells,
      calls: cells.flatMap((c) => [0, 1, 2].map((i) => ({ case: c, i, seed: `ig-pm2/${c}/${i}` }))),
    };
  }
  if (runId === 'dry' || (task === DEV_TASK && /^dev[0-9]+$/.test(runId))) {
    return { ...common, cells: ['10x10-nightmare'], calls: [{ case: '10x10-nightmare', i: 0, seed: 'ig-pm2/dry/0' }] };
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

/** @param {string} file @returns {any} */
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** @param {string} file @returns {any[]} */
const readLines = (file) => (existsSync(file)
  ? readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l))
  : []);

/** @param {string} file @param {unknown} value */
function appendLine(file, value) {
  mkdirSync(join(file, '..'), { recursive: true });
  appendFileSync(file, `${JSON.stringify(value)}\n`);
}

/** @param {unknown} x @returns {any} */
const plain = (x) => JSON.parse(JSON.stringify(x));

/** @param {unknown} text @returns {string} A message without absolute paths (records refuse them). */
const clean = (text) => String(text ?? '').replace(/[A-Za-z]:[\\/][^\s"']*/g, '<path>');

const round3 = (/** @type {number} */ x) => Math.round(x * 1000) / 1000;
const round6 = (/** @type {number} */ x) => Math.round(x * 1000000) / 1000000;

/**
 * Opens a run: its folder, `run.json` (written by `run` at its first invocation, checked at every later one against
 * the manifest, the tree and the harness) and the tree. `summarize` (`create: false`) needs the file; a harness hash
 * that differs from the one the run started with (a report-only change) is noted in the record, not a stop.
 * @param {Record<string, string>} args
 * @param {{ create: boolean }} o
 */
async function openRun(args, { create }) {
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
    format: 'ig-proto-pm2-run', version: 1, task, runId, label: args.label, manifest,
    treeId: tree.treeId, copyDigest: tree.copyDigest, harnessHash: harness.harnessHash,
  };
  /** @type {string | null} */
  let harnessNote = null;
  if (existsSync(runFile)) {
    const saved = readJson(runFile);
    for (const key of Object.keys(expected)) {
      if (key === 'harnessHash' && !create) {
        if (saved.harnessHash !== harness.harnessHash) {
          harnessNote = `harness hash at the run's start ${saved.harnessHash}, at the summary ${harness.harnessHash} (a report-only change)`;
        }
        continue;
      }
      if (!isDeepStrictEqual(saved[key], /** @type {any} */ (expected)[key])) {
        throw new Stop(`run.json of ${runId} differs in ${key} (the manifest, tree or harness changed): nothing was measured`);
      }
    }
  } else if (create) {
    writeJson(runFile, { ...expected, createdAt: new Date().toISOString() });
  } else {
    throw new Stop(`run ${runId} of ${task} has no run.json: nothing to summarize`);
  }
  const files = {
    corpus: join(runDir, 'corpus.jsonl'),
    state: join(runDir, 'state.json'),
    ratings: (/** @type {string} */ cell) => join(runDir, cell, 'ratings.jsonl'),
    raw: (/** @type {string} */ cell, /** @type {number} */ index) => join(runDir, cell, `raw-${index}.cpuprofile`),
  };
  return { task, runId, label: args.label, manifest, tree, harness, harnessNote, runDir, files, sourceLabel: args['source-label'] };
}

/** @typedef {Awaited<ReturnType<typeof openRun>>} Run */

/** @param {{ case: string, i: number }} c @returns {string} */
const callKey = (c) => `${c.case}/${c.i}`;

/**
 * The corpus journal: every manifest call has at most one `started` and one `recorded` line. When `strict`, a started
 * call without its recorded line (a killed invocation), or a recorded call with a defect, stops the task.
 * @param {Run} run
 * @param {boolean} [strict]
 * @returns {{ started: Map<string, any>, recorded: Map<string, any> }}
 */
function readCorpus(run, strict = true) {
  const known = new Set(run.manifest.calls.map(callKey));
  /** @type {Map<string, any>} */
  const started = new Map();
  /** @type {Map<string, any>} */
  const recorded = new Map();
  for (const line of readLines(run.files.corpus)) {
    const key = callKey(line);
    if (!known.has(key)) {
      throw new Stop(`corpus.jsonl names ${key}, which is not in the manifest`);
    }
    if (line.t === 'started' && !started.has(key)) {
      started.set(key, line);
    } else if (line.t === 'recorded' && started.has(key) && !recorded.has(key)) {
      recorded.set(key, line);
    } else {
      throw new Stop(`corpus.jsonl: unexpected line ${line.t} for ${key}`);
    }
  }
  for (const key of started.keys()) {
    if (strict && !recorded.has(key)) {
      throw new Stop(`call ${key} started and has no recorded line (a started observation without its record): nothing is rerun, the pack author decides`);
    }
  }
  for (const [key, line] of recorded) {
    if (strict && (line.outcome === 'error' || (line.defects ?? []).length > 0)) {
      throw new Stop(`call ${key} is recorded with a defect (${line.outcome}: ${line.message ?? (line.defects ?? []).join('; ')})`);
    }
  }
  return { started, recorded };
}

/**
 * @param {'call' | 'window'} kind
 * @param {number} order
 * @param {any} record
 * @param {any[]} witness
 * @param {string[]} defects
 * @returns {Record<string, any>} A corpus profile: the canonical outcome and the inputs (`idx` and the clues).
 */
function profileLine(kind, order, record, witness, defects) {
  const { rating, details, W, idx, workFirst, nodesFirst, r7Cut, r7CutCensus, ...rest } = record;
  void rating;
  void details;
  void W;
  void workFirst;
  void nodesFirst;
  void r7Cut;
  void r7CutCensus;
  if (!OUTCOMES.includes(record.outcome)) {
    defects.push(`${kind} profile ${order}: outcome ${record.outcome}`);
  }
  if (!Array.isArray(idx) || idx.some((/** @type {number} */ i) => !(i >= 0 && i < witness.length))) {
    defects.push(`${kind} profile ${order}: no clue indices`);
  }
  return {
    kind, order, class: record.outcome === 'capped' ? 'capped' : 'complete', ...rest, idx,
    clues: (idx ?? []).map((/** @type {number} */ i) => plain(witness[i])),
  };
}

/**
 * The `recorded` line of one call from its lane result; a result that never came (not admitted) is an error line.
 * @param {Run} run
 * @param {any} engine
 * @param {{ case: string, i: number, seed: string }} c
 * @param {any} result
 * @returns {Record<string, any>}
 */
function recordCall(run, engine, c, result) {
  const entry = caseBoard(c.case);
  /** @type {string[]} */
  const defects = [];
  /** @type {Record<string, any>} */
  const line = {
    t: 'recorded', case: c.case, i: c.i, seed: c.seed, at: new Date().toISOString(), outcome: 'error', levelId: entry.levelId,
    boardRows: entry.boardRows, area: entry.area, attempt: null, K: null, startCount: null, sizes: null, carving: null,
    pieces: null, witness: null, callResult: null, cutAtS: null, message: null, reason: null, failures: null,
    profiles: [], defects,
  };
  if (result === undefined) {
    return { ...line, message: 'the call was not admitted after its started line' };
  }
  line.outcome = result.outcome;
  line.callResult = result.result ?? null;
  line.cutAtS = result.cutAtS ?? null;
  line.message = result.message === undefined ? null : clean(result.message);
  line.reason = result.reason === undefined ? null : clean(result.reason);
  line.failures = result.failures ?? null;
  if (result.outcome === 'ok' || result.outcome === 'censored') {
    const carved = firstCarvedSet(engine, { boardRows: entry.boardRows, levelId: entry.levelId, seedText: c.seed, maxAttempts: run.manifest.maxAttempts });
    if (!carved.ok) {
      return { ...line, outcome: 'error', message: 'the host could not carve the set again' };
    }
    const info = setInfo(carved);
    if (result.set !== null && result.set !== undefined && !isDeepStrictEqual(info, result.set)) {
      return { ...line, outcome: 'error', message: "the host carve differs from the lane's set" };
    }
    const witness = plain(carved.set.witness);
    line.attempt = info.attempt;
    line.K = info.K;
    line.sizes = info.sizes;
    line.carving = info.carving;
    line.startCount = startCountFor(engine, entry.levelId, info.K);
    line.pieces = plain(carved.set.pieces);
    line.witness = witness;
    line.profiles = [
      ...(result.profiles ?? []).map((/** @type {any} */ p, /** @type {number} */ k) => profileLine('call', k, p, witness, defects)),
      ...(result.windows ?? []).map((/** @type {any} */ p, /** @type {number} */ k) => profileLine('window', (result.profiles ?? []).length + k, p, witness, defects)),
    ];
  } else if (result.outcome !== 'no-set') {
    defects.push(`call outcome ${result.outcome}`);
  }
  return line;
}

/**
 * Stage 1: the call jobs that never started, in waves of one call per lane, each wave journaled `started` before its
 * dispatch and `recorded` after it. A wave starts only when its calls fit before the horizon.
 * @param {Run} run
 * @param {{ case: string, i: number, seed: string }[]} pending
 * @param {number} horizonS
 */
async function corpusStage(run, pending, horizonS) {
  let ran = 0;
  let censored = 0;
  /** @type {string[]} */
  const failures = [];
  if (pending.length === 0 || elapsedS() + CALL_NEEDS_S > horizonS - CALL_MARGIN_S) {
    return { ran, censored, failures };
  }
  const size = Math.min(MAX_LANES, pending.length);
  const lanes = await createLanes({ variant: run.manifest.variant, size, horizonS });
  try {
    /** @type {any} */
    let engine = null;
    for (let at = 0; at < pending.length; at += size) {
      if (elapsedS() + CALL_NEEDS_S > horizonS - CALL_MARGIN_S) {
        break;
      }
      const wave = pending.slice(at, at + size);
      for (const c of wave) {
        appendLine(run.files.corpus, { t: 'started', case: c.case, i: c.i, seed: c.seed, at: new Date().toISOString() });
      }
      const out = await lanes.runAll(wave.map((c) => ({
        kind: 'call', boardRows: caseBoard(c.case).boardRows, levelId: caseBoard(c.case).levelId, seedText: c.seed,
        maxAttempts: run.manifest.maxAttempts, window: run.manifest.window,
      })));
      engine ??= await loadEngine(run.tree.root);
      for (const [n, c] of wave.entries()) {
        /** @type {Record<string, any>} */
        let line;
        try {
          line = recordCall(run, engine, c, out.results[n]);
        } catch (e) {
          line = {
            t: 'recorded', case: c.case, i: c.i, seed: c.seed, at: new Date().toISOString(), outcome: 'error',
            message: clean(e instanceof Error ? e.message : e), profiles: [], defects: [],
          };
        }
        appendLine(run.files.corpus, line);
        ran += 1;
        censored += line.outcome === 'censored' ? 1 : 0;
        if (line.outcome === 'error' || line.defects.length > 0) {
          failures.push(`${c.seed}: ${line.message ?? line.defects.join('; ')}`);
        }
      }
    }
  } finally {
    await lanes.close();
  }
  return { ran, censored, failures };
}

/**
 * @typedef {object} Item One corpus profile to rate.
 * @property {string} cell
 * @property {number} index Position in the cell's list: cell sets in manifest order, then profiles in order.
 * @property {number} set The call's `i`.
 * @property {any} profile The corpus profile (`kind`, `class`, canonical outcome, clues).
 * @property {any} call The `recorded` line of the call (board rows, pieces).
 */

/**
 * @param {Run} run
 * @param {{ recorded: Map<string, any> }} corpus
 * @returns {Map<string, Item[]>} Per cell, the corpus profiles in order (cell, set, profile).
 */
function profileLists(run, corpus) {
  /** @type {Map<string, Item[]>} */
  const lists = new Map(run.manifest.cells.map((cell) => [cell, []]));
  for (const c of run.manifest.calls) {
    const call = corpus.recorded.get(callKey(c));
    const list = /** @type {Item[]} */ (lists.get(c.case));
    for (const profile of call?.profiles ?? []) {
      list.push({ cell: c.case, index: list.length, set: c.i, profile, call });
    }
  }
  return lists;
}

/**
 * The ratings journal of a cell: `started`, `recorded` and `cut` lines. The recorded indices are a prefix of the
 * cell's list; a started rating without its recorded line, a cut, a mismatch or an error stops the task.
 * @param {Run} run
 * @param {string} cell
 * @returns {{ recorded: Map<number, any> }}
 */
function readRatings(run, cell) {
  /** @type {Set<number>} */
  const started = new Set();
  /** @type {Map<number, any>} */
  const recorded = new Map();
  for (const line of readLines(run.files.ratings(cell))) {
    if (line.t === 'cut') {
      throw new Stop(`${cell}: rating ${line.index} was cut (${line.reason}): a defect, the pack author decides`);
    }
    if (line.t === 'started' && !started.has(line.index)) {
      started.add(line.index);
    } else if (line.t === 'recorded' && started.has(line.index) && !recorded.has(line.index)) {
      recorded.set(line.index, line);
    } else {
      throw new Stop(`${cell}: unexpected ratings line ${line.t} for ${line.index}`);
    }
  }
  for (const index of started) {
    if (!recorded.has(index)) {
      throw new Stop(`${cell}: rating ${index} started and has no recorded line (a started observation without its record): nothing is rerun`);
    }
  }
  for (const [index, line] of recorded) {
    if (line.match !== true) {
      throw new Stop(`${cell}: rating ${index} is recorded as ${line.outcome} and differs from its corpus rating (or failed)`);
    }
    if (index >= recorded.size) {
      throw new Stop(`${cell}: the recorded ratings are not a prefix of the cell's list`);
    }
  }
  return { recorded };
}

/**
 * @param {any} profile Corpus profile.
 * @param {any} result The worker's outcome of the profiled rating.
 * @returns {boolean} The profiled rating is the corpus rating: same class, score and work.
 */
function sameRating(profile, result) {
  if (profile.class === 'capped') {
    return result.outcome === 'capped' && profile.mainWork === result.mainWork;
  }
  return result.outcome === 'complete' && profile.score === result.score && profile.mainWork === result.mainWork
    && profile.censusWork === result.censusWork;
}

/**
 * @param {Worker} worker
 * @param {string} treeId
 * @returns {Promise<void>}
 */
function waitReady(worker, treeId) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.off('message', onMessage);
      worker.off('error', onError);
      worker.off('exit', onExit);
    };
    const onMessage = (/** @type {any} */ m) => {
      if (m.type === 'ready') {
        cleanup();
        if (m.treeId === treeId) {
          resolve();
        } else {
          reject(new Stop(`the worker loaded tree ${m.treeId}, expected ${treeId}`));
        }
      }
    };
    const onError = (/** @type {Error} */ e) => {
      cleanup();
      reject(e);
    };
    const onExit = (/** @type {number} */ code) => {
      cleanup();
      reject(new Error(`the worker exited with code ${code} before it was ready`));
    };
    worker.on('message', onMessage);
    worker.on('error', onError);
    worker.on('exit', onExit);
  });
}

/**
 * The supervisor of one rating: resolves with the worker's reply, or with a cut after `CUT_S` seconds or when the
 * worker fails or exits.
 * @param {Worker} worker
 * @param {number} index
 * @returns {Promise<{ reply?: any, cut?: string }>}
 */
function supervise(worker, index) {
  return new Promise((resolve) => {
    const finish = (/** @type {{ reply?: any, cut?: string }} */ value) => {
      clearTimeout(timer);
      worker.off('message', onMessage);
      worker.off('error', onError);
      worker.off('exit', onExit);
      resolve(value);
    };
    const timer = setTimeout(() => finish({ cut: `longer than ${CUT_S} s` }), CUT_S * 1000);
    const onMessage = (/** @type {any} */ m) => {
      if ((m.type === 'rated' || m.type === 'failed') && m.index === index) {
        finish({ reply: m });
      }
    };
    const onError = (/** @type {Error} */ e) => finish({ cut: `worker error: ${clean(e.message)}` });
    const onExit = (/** @type {number} */ code) => finish({ cut: `worker exited with code ${code}` });
    worker.on('message', onMessage);
    worker.on('error', onError);
    worker.on('exit', onExit);
  });
}

/**
 * Stage 2: every corpus profile in order, one rating at a time in the worker: `started` before its dispatch,
 * `recorded` after its reply, a `cut` (exit 1) when the supervisor has to terminate the worker.
 * @param {Run} run
 * @param {Map<string, Item[]>} lists
 * @param {number} horizonS
 */
async function profileStage(run, lists, horizonS) {
  let rated = 0;
  /** @type {string[]} */
  const failures = [];
  /** @type {Item[]} */
  const todo = [];
  for (const cell of run.manifest.cells) {
    const { recorded } = readRatings(run, cell);
    todo.push(...(/** @type {Item[]} */ (lists.get(cell))).filter((item) => !recorded.has(item.index)));
  }
  if (todo.length === 0 || elapsedS() + CUT_S > horizonS) {
    return { rated, failures };
  }
  const worker = new Worker(WORKER_FILE, { workerData: { pm2: true, treeRoot: run.tree.root } });
  try {
    await waitReady(worker, run.tree.treeId);
    for (const item of todo) {
      if (elapsedS() + CUT_S > horizonS) {
        break;
      }
      const file = run.files.ratings(item.cell);
      const twin = item.index % TWIN_EVERY === 0 ? ((item.index / TWIN_EVERY) % 2 === 0 ? 'after' : 'before') : null;
      appendLine(file, { t: 'started', index: item.index, at: new Date().toISOString() });
      worker.postMessage({
        type: 'rate', index: item.index, boardRows: item.call.boardRows, pieces: item.call.pieces, clues: item.profile.clues,
        keepRaw: item.index < RAW_KEPT, twin,
      });
      const { reply, cut } = await supervise(worker, item.index);
      if (cut !== undefined) {
        appendLine(file, { t: 'cut', index: item.index, reason: cut, at: new Date().toISOString() });
        failures.push(`${item.cell} rating ${item.index}: cut (${cut})`);
        break;
      }
      if (reply.type === 'failed') {
        appendLine(file, { t: 'recorded', index: item.index, outcome: 'error', message: clean(reply.message), match: false });
        failures.push(`${item.cell} rating ${item.index}: ${clean(reply.message)}`);
        break;
      }
      if (reply.raw !== null) {
        writeFileSync(run.files.raw(item.cell, item.index), JSON.stringify(reply.raw));
      }
      const match = sameRating(item.profile, reply.result);
      appendLine(file, {
        t: 'recorded', index: item.index, outcome: reply.result.outcome, ms: reply.ms, plainMs: reply.plainMs, twin, match,
        result: reply.result, attribution: reply.attribution,
      });
      rated += 1;
      if (!match) {
        failures.push(`${item.cell} rating ${item.index}: the profiled rating differs from its corpus rating`);
        break;
      }
    }
  } finally {
    await worker.terminate();
  }
  return { rated, failures };
}

/** @param {Run} run @param {Record<string, any>} fields */
function writeState(run, fields) {
  writeJson(run.files.state, {
    format: 'ig-proto-state', version: 1, task: run.task, step: 'run', run: run.runId, label: run.label,
    treeId: run.tree.treeId, harnessHash: run.harness.harnessHash, ...fields,
  });
}

/** @param {string[]} argv @returns {Promise<number>} */
async function runCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'run-id', 'label', 'source-label', 'horizon-s'] });
  need(args, ['label']);
  const run = await openRun(args, { create: true });
  const horizonS = Number(args['horizon-s'] ?? 285);
  const startedAt = new Date(Date.now() - elapsedS() * 1000).toISOString();
  const corpusBefore = readCorpus(run);
  const pending = run.manifest.calls.filter((c) => !corpusBefore.started.has(callKey(c)));
  /** @type {string[]} */
  const failures = [];
  let ratings = 0;
  const stage1 = await corpusStage(run, pending, horizonS);
  failures.push(...stage1.failures);
  let corpus = readCorpus(run, false);
  const corpusDone = run.manifest.calls.every((c) => corpus.recorded.has(callKey(c)));
  const lists = corpusDone ? profileLists(run, corpus) : null;
  if (lists !== null && failures.length === 0) {
    const stage2 = await profileStage(run, lists, horizonS);
    ratings = stage2.rated;
    failures.push(...stage2.failures);
  }
  corpus = readCorpus(run, false);
  /** @type {Record<string, number>} */
  const profiled = {};
  /** @type {Record<string, number>} */
  const planned = {};
  let done = corpusDone && failures.length === 0;
  for (const cell of run.manifest.cells) {
    profiled[cell] = readLines(run.files.ratings(cell)).filter((l) => l.t === 'recorded' && l.match === true).length;
    planned[cell] = lists === null ? 0 : /** @type {Item[]} */ (lists.get(cell)).length;
    done &&= planned[cell] > 0 && profiled[cell] === planned[cell];
  }
  const censored = [...corpus.recorded.values()].filter((l) => l.outcome === 'censored').length;
  const seconds = round3(elapsedS());
  writeState(run, {
    done,
    corpus: { calls: run.manifest.calls.length, recorded: corpus.recorded.size, censored },
    profiled,
    planned,
    failures,
    lastInvocation: {
      start: startedAt, end: new Date().toISOString(), seconds, horizonS, progress: { calls: stage1.ran, ratings },
    },
  });
  process.stdout.write(`pm2: run ${run.runId}: ${stage1.ran} call(s) and ${ratings} rating(s) recorded in this invocation `
    + `(corpus ${corpus.recorded.size} of ${run.manifest.calls.length} calls, profiled ${JSON.stringify(profiled)}; ${seconds} s)${done ? '; done' : ''}\n`);
  if (failures.length > 0) {
    process.stderr.write(`pm2: STOP: ${failures.join('; ')}\n`);
    return 1;
  }
  return 0;
}

/**
 * The reduction of a raw profile by a top-down walk (the worker's walks the ancestors of each node), the weights
 * from the deltas (the worker's from timestamps): the host side of the check of the worker's attribution.
 * @param {{ nodes: any[], samples: number[], timeDeltas: number[], startTime: number, endTime: number }} profile
 * @returns {Record<string, any>}
 */
export function reduceByWalk(profile) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const hasParent = new Set(profile.nodes.flatMap((n) => n.children ?? []));
  /** @type {Map<number, { name: string, file: string, category: string, phase: string }>} */
  const info = new Map();
  /** @type {[number, number][]} */
  const stack = profile.nodes.filter((n) => !hasParent.has(n.id)).map((n) => [n.id, Infinity]);
  while (stack.length > 0) {
    const [id, inherited] = /** @type {[number, number]} */ (stack.pop());
    const node = byId.get(id);
    const file = node.callFrame.url;
    const name = nameOf(node.callFrame);
    const marker = markerOf(name, file);
    const here = marker >= 0 ? Math.min(inherited, marker) : inherited;
    info.set(id, { name, file, category: categoryOf(name, file), phase: here === Infinity ? 'other' : MARKERS[here].phase });
    for (const child of node.children ?? []) {
      stack.push([child, here]);
    }
  }
  const out = emptyAttribution();
  const n = profile.samples.length;
  out.samples = n;
  out.spanUs = profile.endTime - profile.startTime;
  const lastStamp = profile.startTime + profile.timeDeltas.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i += 1) {
    const us = i + 1 < n ? profile.timeDeltas[i + 1] : Math.max(0, profile.endTime - lastStamp);
    const node = /** @type {{ name: string, file: string, category: string, phase: string }} */ (info.get(profile.samples[i]));
    if (node.name === '(idle)') {
      out.idleUs += us;
    } else {
      addWeight(out, node.phase, node.category, `${node.name}@${node.file}`, us);
    }
  }
  return out;
}

/** @returns {Record<string, any>} A merged attribution plus its rating counters. */
function newAgg() {
  return { ratings: 0, complete: 0, capped: 0, censusIncomplete: 0, wallMs: 0, ...emptyAttribution() };
}

/**
 * @param {Record<string, any>} agg
 * @param {any} line A `recorded` line.
 * @param {any} profile Its corpus profile.
 */
function addEntry(agg, line, profile) {
  const a = line.attribution;
  agg.ratings += 1;
  agg[profile.class] += 1;
  agg.censusIncomplete += line.result.censusComplete === false ? 1 : 0;
  agg.wallMs += line.ms;
  agg.samples += a.samples;
  agg.spanUs += a.spanUs;
  agg.totalUs += a.totalUs;
  agg.idleUs += a.idleUs;
  agg.unplacedUs += a.unplacedUs;
  for (const phase of PHASES) {
    agg.phases[phase] += a.phases[phase];
  }
  for (const category of CATEGORIES) {
    agg.categories[category] += a.categories[category];
  }
  for (const [phase, row] of Object.entries(a.phaseByCategory)) {
    const into = (agg.phaseByCategory[phase] ??= {});
    for (const [category, us] of Object.entries(/** @type {Record<string, number>} */ (row))) {
      into[category] = (into[category] ?? 0) + us;
    }
  }
  for (const [key, row] of Object.entries(a.functions)) {
    const into = (agg.functions[key] ??= {});
    for (const [phase, us] of Object.entries(/** @type {Record<string, number>} */ (row))) {
      into[phase] = (into[phase] ?? 0) + us;
    }
  }
}

/**
 * P7's hypothetical sensitivity: rating time divided by this when the kernel (share `k`) is `s` times faster.
 * @param {number} k @param {number} s @returns {number}
 */
export const sensitivity = (k, s) => 1 / (1 - k + k / s);

/**
 * @param {number} k Kernel share.
 * @param {number} factor A rating-time factor.
 * @returns {number | 'not reachable'} The kernel speed-up that gives `factor`, or `not reachable` when 1 / (1 - k) is
 *   at or below it.
 */
export function neededSpeedup(k, factor) {
  const room = 1 - 1 / factor;
  return k <= room ? 'not reachable' : round3(k / (k - room));
}

/**
 * @param {Record<string, any>} agg
 * @returns {Record<string, any>} The record of an aggregate: ms and shares of phases, the kernel share, P7's
 *   sensitivity and the needed speed-ups, the DLX share.
 */
export function describeAgg(agg) {
  const total = agg.totalUs;
  const share = (/** @type {number} */ us) => (total > 0 ? round6(us / total) : 0);
  const ms = (/** @type {number} */ us) => round3(us / 1000);
  const k = total > 0 ? (agg.phases.search + agg.phases.census) / total : 0;
  return {
    ratings: agg.ratings,
    ratingMs: ms(total),
    phases: Object.fromEntries(PHASES.map((p) => [p, { ms: ms(agg.phases[p]), share: share(agg.phases[p]) }])),
    kernelShare: round6(k),
    maxFactor: k < 1 ? round3(1 / (1 - k)) : null,
    p7Sensitivity: Object.fromEntries(P7_SPEEDS.map((s) => [String(s), round3(sensitivity(k, s))])),
    neededKernelSpeedup: Object.fromEntries(P7_FACTORS.map((f) => [String(f), neededSpeedup(k, f)])),
    dlxShare: share(agg.phases.dlx),
    unplacedShare: share(agg.unplacedUs),
  };
}

/**
 * @param {Record<string, any>} agg
 * @returns {Record<string, any>} The cell record: tables by phase, category and phase x category, the top 30 functions.
 */
function describeCell(agg) {
  const total = agg.totalUs;
  const share = (/** @type {number} */ us) => (total > 0 ? round6(us / total) : 0);
  const ms = (/** @type {number} */ us) => round3(us / 1000);
  const top = Object.entries(agg.functions)
    .map(([key, row]) => {
      const at = key.indexOf('@');
      const name = key.slice(0, at);
      const file = key.slice(at + 1);
      const us = Object.values(/** @type {Record<string, number>} */ (row)).reduce((a, b) => a + b, 0);
      return {
        function: name, file, category: categoryOf(name, file), ms: ms(us), share: share(us),
        phases: Object.fromEntries(PHASES.filter((p) => /** @type {any} */ (row)[p] > 0).map((p) => [p, ms(/** @type {any} */ (row)[p])])),
        us,
      };
    })
    .sort((a, b) => b.us - a.us || (a.function < b.function ? -1 : 1))
    .slice(0, 30)
    .map(({ us, ...rest }) => {
      void us;
      return rest;
    });
  return {
    ratings: { complete: agg.complete, capped: agg.capped },
    censusIncomplete: agg.censusIncomplete,
    ratingMs: ms(total),
    unplaced: { ms: ms(agg.unplacedUs), share: share(agg.unplacedUs) },
    phases: Object.fromEntries(PHASES.map((p) => [p, { ms: ms(agg.phases[p]), share: share(agg.phases[p]) }])),
    categories: Object.fromEntries(CATEGORIES.map((c) => [c, { ms: ms(agg.categories[c]), share: share(agg.categories[c]) }])),
    phaseByCategory: Object.fromEntries(PHASES.map((p) => [p, Object.fromEntries(CATEGORIES.map((c) => [
      c, { ms: ms(agg.phaseByCategory[p]?.[c] ?? 0), share: share(agg.phaseByCategory[p]?.[c] ?? 0) },
    ]))])),
    top,
  };
}

/**
 * @param {Record<string, any>} agg
 * @returns {Record<string, number>} The relative difference of each table's sum to the total.
 */
function sumCheck(agg) {
  const total = agg.totalUs;
  const rel1 = (/** @type {number} */ sum) => (total === 0 ? 0 : Math.abs(sum - total) / total);
  const sum = (/** @type {any} */ obj) => Object.values(obj).reduce((a, b) => a + /** @type {number} */ (b), 0);
  return {
    phases: rel1(sum(agg.phases)),
    categories: rel1(sum(agg.categories)),
    phaseByCategory: rel1(Object.values(agg.phaseByCategory).reduce((a, row) => a + sum(row), 0)),
    functions: rel1(Object.values(agg.functions).reduce((a, row) => a + sum(row), 0)),
  };
}

/** @param {string[]} argv @returns {Promise<number>} */
async function summarizeCommand(argv) {
  const { args } = parseArgs(argv, { values: ['task', 'run-id', 'label', 'source-label', 'horizon-s'] });
  need(args, ['label']);
  const run = await openRun(args, { create: false });
  const state = existsSync(run.files.state) ? readJson(run.files.state) : null;
  if (state === null || state.done !== true) {
    throw new Stop(`run ${run.runId} is not done (its state says so): nothing to summarize`);
  }
  const corpus = readCorpus(run);
  const lists = profileLists(run, corpus);
  /** @type {Record<string, any>} */
  const cells = {};
  /** @type {Record<string, any>} */
  const corpusProfiles = {};
  /** @type {{ index: number, ms: number, plainMs: number, cell: string }[]} */
  const twins = [];
  let wallMs = 0;
  let attributedMs = 0;
  let rawTotal = 0;
  let rawEqual = 0;
  let worstSum = 0;
  /** @type {string[]} */
  const problems = [];
  for (const cell of run.manifest.cells) {
    const items = /** @type {Item[]} */ (lists.get(cell));
    const { recorded } = readRatings(run, cell);
    if (recorded.size !== items.length) {
      throw new Stop(`${cell}: ${recorded.size} ratings recorded, ${items.length} in the corpus`);
    }
    /** @type {Map<string, Record<string, any>>} */
    const aggs = new Map();
    const aggOf = (/** @type {string} */ key) => {
      let agg = aggs.get(key);
      if (agg === undefined) {
        agg = newAgg();
        aggs.set(key, agg);
      }
      return agg;
    };
    corpusProfiles[cell] = { call: 0, window: 0, complete: 0, capped: 0 };
    for (const item of items) {
      const line = recorded.get(item.index);
      const { kind, class: cls } = item.profile;
      for (const key of ['cell', `${kind}/all`, `${kind}/${cls}`]) {
        addEntry(aggOf(key), line, item.profile);
      }
      corpusProfiles[cell][kind] += 1;
      corpusProfiles[cell][cls] += 1;
      if (line.plainMs !== null && line.plainMs !== undefined) {
        twins.push({ index: item.index, ms: line.ms, plainMs: line.plainMs, cell });
      }
    }
    let rawEqualCell = 0;
    let rawCell = 0;
    for (let index = 0; index < Math.min(RAW_KEPT, items.length); index += 1) {
      const file = run.files.raw(cell, index);
      if (!existsSync(file)) {
        problems.push(`${cell}: raw profile ${index} is missing`);
        continue;
      }
      rawCell += 1;
      if (isDeepStrictEqual(reduceByWalk(readJson(file)), recorded.get(index).attribution)) {
        rawEqualCell += 1;
      } else {
        problems.push(`${cell}: the host reduction of raw profile ${index} differs from the worker's attribution`);
      }
    }
    rawTotal += rawCell;
    rawEqual += rawEqualCell;
    const whole = /** @type {Record<string, any>} */ (aggs.get('cell'));
    const checks = sumCheck(whole);
    for (const agg of aggs.values()) {
      worstSum = Math.max(worstSum, ...Object.values(sumCheck(agg)));
    }
    wallMs += whole.wallMs;
    attributedMs += whole.totalUs / 1000;
    /** @type {Record<string, any>} */
    const byClass = {};
    for (const kind of KINDS) {
      byClass[kind] = {};
      for (const cls of CLASSES) {
        const agg = aggs.get(`${kind}/${cls}`);
        byClass[kind][cls] = agg === undefined ? { ratings: 0 } : describeAgg(agg);
      }
    }
    const described = describeAgg(whole);
    cells[cell] = {
      ...describeCell(whole),
      kernelShare: described.kernelShare,
      maxFactor: described.maxFactor,
      p7Sensitivity: described.p7Sensitivity,
      neededKernelSpeedup: described.neededKernelSpeedup,
      dlxShare: described.dlxShare,
      byClass,
      reductionCheck: { rawProfiles: rawCell, equal: rawEqualCell === rawCell },
      sumCheck: checks,
      wallMs: round3(whole.wallMs),
      idleMs: round3(whole.idleUs / 1000),
      samples: whole.samples,
    };
  }
  if (worstSum > 0.01) {
    problems.push(`a table's sum differs from its total by ${(worstSum * 100).toFixed(2)} % (above 1 %)`);
  }
  const sum = (/** @type {number[]} */ xs) => xs.reduce((a, b) => a + b, 0);
  const overhead = {
    pairs: twins.length,
    profiledMs: round3(sum(twins.map((t) => t.ms))),
    plainMs: round3(sum(twins.map((t) => t.plainMs))),
    ratio: twins.length === 0 ? null : round3(sum(twins.map((t) => t.ms)) / sum(twins.map((t) => t.plainMs))),
    medianPairRatio: twins.length === 0 ? null : round3(/** @type {number} */ (median(twins.map((t) => t.ms / t.plainMs)))),
    pairsDetail: twins.map((t) => ({ cell: t.cell, index: t.index, profiledMs: t.ms, plainMs: t.plainMs })),
    twinEvery: TWIN_EVERY,
    coverage: round6(attributedMs / wallMs),
  };
  const censoredCalls = [...corpus.recorded.values()].filter((l) => l.outcome === 'censored').length;
  const meta = await buildMeta({ task: run.task, label: run.label, kind: 'pm2', trees: [run.manifest.variant], sourceLabel: run.sourceLabel });
  const record = {
    meta,
    samplingIntervalUs: SAMPLING_US,
    run: { runId: run.runId, task: run.task, seeds: run.manifest.calls.map((c) => c.seed), harnessNote: run.harnessNote },
    corpus: { calls: corpus.recorded.size, censored: censoredCalls, profiles: corpusProfiles },
    cells,
    overhead,
    reductionCheck: { rawProfiles: rawTotal, equal: rawTotal > 0 && rawEqual === rawTotal },
    p6Reference: P6_REFERENCE,
    problems,
  };
  const publish = run.task === TASK && run.runId === 'main';
  const outDir = publish ? evidenceDir(run.label, run.task) : join(run.runDir, 'report');
  writeJson(join(outDir, 'pm2.json'), record);
  writeText(join(outDir, 'pm2.md'), renderMarkdown(record));
  process.stdout.write(`pm2: summary written to ${rel(outDir)}: ${Object.entries(cells).map(([c, v]) => `${c} k ${v.kernelShare}`).join(', ')}; `
    + `sums within ${(worstSum * 100).toFixed(3)} %, reduction check ${rawEqual} of ${rawTotal}\n`);
  if (problems.length > 0) {
    process.stderr.write(`pm2: PROBLEMS: ${problems.join('; ')}\n`);
    return 1;
  }
  return 0;
}

/** @param {number} x @returns {string} */
const pct = (x) => `${(x * 100).toFixed(1)} %`;

/** @param {number} x @returns {string} */
const fix1 = (x) => x.toFixed(1);

/** @param {number | 'not reachable' | null} x @returns {string} */
const needed = (x) => (x === 'not reachable' || x === null ? 'not reachable' : `x ${x.toFixed(2)}`);

/**
 * @param {string[]} head
 * @param {string[][]} rows
 * @returns {string}
 */
function table(head, rows) {
  return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

/**
 * @param {Record<string, any>} record
 * @returns {string[]} The summary: per cell the phase shares and, per profile class, the kernel share, the DLX share and
 *   the kernel speed-up needed for the rating-time factors 1.87 and 1.91.
 */
function summaryLines(record) {
  /** @type {string[]} */
  const lines = [];
  /** @type {string[]} */
  const unreachable = [];
  for (const [cell, c] of Object.entries(record.cells)) {
    lines.push(`- **${cell}** (${c.ratings.complete + c.ratings.capped} ratings, ${c.ratings.capped} capped): `
      + `${PHASES.map((p) => `${p} ${pct(c.phases[p].share)}`).join(', ')}.`);
    const classes = [
      ['whole corpus', c],
      ['call profiles', c.byClass.call.all],
      ['complete window subsets (closest to the prototype\'s mix)', c.byClass.window.complete],
    ];
    for (const [name, v] of classes) {
      const x = /** @type {any} */ (v);
      if (!(x.ratingMs > 0)) {
        continue;
      }
      lines.push(`  - ${name}: kernel share k ${pct(x.kernelShare)}, DLX diagnostic ${pct(x.dlxShare)}; kernel speed-up needed for a rating-time factor of 1.87 / 1.91: `
        + `${needed(x.neededKernelSpeedup['1.87'])} / ${needed(x.neededKernelSpeedup['1.91'])}.`);
    }
    const every = [['whole corpus', c], ...KINDS.flatMap((kind) => CLASSES.map((cls) => [`${kind} ${cls}`, c.byClass[kind][cls]]))];
    for (const [name, v] of every) {
      const x = /** @type {any} */ (v);
      for (const f of ['1.87', '1.91']) {
        if (x.neededKernelSpeedup?.[f] === 'not reachable') {
          unreachable.push(`${cell}, ${name}, x ${f}`);
        }
      }
    }
  }
  lines.push(`- Factors "not reachable" by the kernel alone (1 / (1 - k) at or below the factor): ${unreachable.length === 0 ? 'none' : unreachable.join('; ')}.`);
  return lines;
}

/**
 * @param {Record<string, any>} record
 * @returns {string}
 */
function renderMarkdown(record) {
  const kernelLabel = 'kernel = the `search` and `census` phases';
  /** @type {string[]} */
  const out = [
    '# IGP-06 PM2: where rating time goes on 10x10 and 12x12 Nightmare',
    '',
    banner(record.meta),
    '',
    `Run \`${record.run.runId}\` of ${record.run.task}: ${record.corpus.calls} set-stage calls of the production call path on the \`base\` tree `
    + `(${record.corpus.censored} censored), every corpus rating rated once more, canonically, in one supervised worker thread under the V8 `
    + `CPU profiler (sampling interval ${record.samplingIntervalUs} us). **Measured:** shares of sampled self time. **Derived and hypothetical:** `
    + `the P7 sensitivity (${kernelLabel}); it is never a measured improvement. Carving and layout work are outside the denominator: the denominator `
    + 'is the rating time of the profiled corpus (the attributed self time of every recorded rating, `(idle)` samples excluded).',
    '',
    '## Corpus and ratings profiled',
    '',
    table(
      ['Cell', 'Call profiles', 'Window subsets', 'Complete', 'Capped', 'Census incomplete (of complete)', 'Rating ms (attributed)', 'Samples'],
      Object.entries(record.cells).map(([cell, c]) => [
        cell, String(record.corpus.profiles[cell].call), String(record.corpus.profiles[cell].window), String(c.ratings.complete),
        String(c.ratings.capped), String(c.censusIncomplete), fix1(c.ratingMs), String(c.samples),
      ]),
    ),
    '',
    'Call profiles are today\'s set-stage ratings (the profiles of `selectClues`); window subsets are three clue subsets at each of the start count + 1 to + 4 '
    + '(the rating mix closest to the prototype\'s, IGP-03: complete window-subset ratings). Complete = a rating was returned (its census may be incomplete); '
    + 'capped = the deduction path was capped (`IncompleteRatingError`), which ends before the census and the DLX diagnostic.',
    '',
    '## Summary',
    '',
    ...summaryLines(record),
  ];
  for (const [cell, c] of Object.entries(record.cells)) {
    out.push('', `## ${cell}`, '', '### Phases (by stack ancestry)', '');
    out.push(table(['Phase', 'ms', 'Share'], PHASES.map((p) => [p, fix1(c.phases[p].ms), pct(c.phases[p].share)])));
    out.push('', 'The phase of a sample is the first marker among the frame and its ancestors: `census` (`runProbes`, `settleCensus`, `probe`, `replayLadder`), '
      + 'else `dlx` (`solveFirst`), else `model` (`buildModel`), else `search` (`measureDeduction`, `search`, `branch`), else `other` (scoring, the harness, `(program)`, GC). '
      + 'The ladder rules, `select` and `undo` are thus charged to the phase they ran in. '
      + `Unplaced engine time (a \`deduce.js\` function that no marker could place, kept in \`other\`): ${pct(c.unplaced.share)} of this cell's rating time; see the notes.`);
    out.push('', '### Categories', '');
    out.push(table(['Category', 'ms', 'Share'], CATEGORIES.map((k) => [k, fix1(c.categories[k].ms), pct(c.categories[k].share)])));
    out.push('', '### Phase x category (ms, share of rating time)', '');
    out.push(table(
      ['Phase', ...CATEGORIES],
      PHASES.map((p) => [p, ...CATEGORIES.map((k) => (c.phaseByCategory[p][k].ms === 0 ? '-' : `${fix1(c.phaseByCategory[p][k].ms)} (${pct(c.phaseByCategory[p][k].share)})`))]),
    ));
    out.push('', '### Top 30 functions by self time', '');
    out.push(table(
      ['#', 'Function', 'File', 'Category', 'ms', 'Share', ...PHASES.map((p) => `${p} ms`)],
      c.top.map((/** @type {any} */ f, /** @type {number} */ i) => [
        String(i + 1), `\`${f.function}\``, f.file === '' ? '-' : `\`${f.file}\``, f.category, fix1(f.ms), pct(f.share),
        ...PHASES.map((p) => (f.phases[p] === undefined ? '-' : fix1(f.phases[p]))),
      ]),
    ));
  }
  out.push('', '## Kernel share and the P7 sensitivity by profile class (hypothetical)', '');
  out.push(`${kernelLabel}. A kernel s times faster in the same units divides rating time by 1 / (1 - k + k / s) (Derived, hypothetical: P7 is not prototyped). `
    + 'The needed speed-up for a factor F is k / (k - (1 - 1 / F)); it is "not reachable" when 1 / (1 - k) is at or below F. '
    + 'The factors 1.87 (the prototype, divided by 1.9 after P6 and eight workers give about 1.0) and 1.91 (today\'s 12x12 Nightmare, divided by 1.9) are the '
    + 'rating-time factors P7 would have to reach alone; 1.1, 1.3 and 1.8 are the report\'s P7 range and likely value.');
  for (const [cell, c] of Object.entries(record.cells)) {
    const rows = [['whole corpus', { ratings: c.ratings.complete + c.ratings.capped, ratingMs: c.ratingMs, phases: c.phases, kernelShare: c.kernelShare,
      maxFactor: c.maxFactor, p7Sensitivity: c.p7Sensitivity, neededKernelSpeedup: c.neededKernelSpeedup, dlxShare: c.dlxShare,
      unplacedShare: c.unplaced.share }]];
    for (const kind of KINDS) {
      for (const cls of CLASSES) {
        rows.push([`${kind === 'call' ? 'call profiles' : 'window subsets'}, ${cls}`, c.byClass[kind][cls]]);
      }
    }
    const live = rows.filter(([, v]) => /** @type {any} */ (v).ratings > 0);
    out.push('', `### ${cell}: phase shares and kernel share`, '');
    out.push(table(
      ['Class', 'Ratings', 'Rating ms', ...PHASES, 'k (kernel)', 'Max factor 1/(1-k)', 'Unplaced engine time'],
      live.map(([name, v]) => {
        const x = /** @type {any} */ (v);
        return [String(name), String(x.ratings), fix1(x.ratingMs), ...PHASES.map((p) => pct(x.phases[p].share)), pct(x.kernelShare),
          x.maxFactor === null ? 'unbounded' : `x ${x.maxFactor.toFixed(2)}`, pct(x.unplacedShare)];
      }),
    ));
    out.push('', `### ${cell}: P7 sensitivity (hypothetical) and the kernel speed-up needed`, '');
    out.push(table(
      ['Class', ...P7_SPEEDS.map((s) => `kernel x ${s}`), ...P7_FACTORS.map((f) => `needed for x ${f}`)],
      live.map(([name, v]) => {
        const x = /** @type {any} */ (v);
        return [String(name), ...P7_SPEEDS.map((s) => `x ${x.p7Sensitivity[String(s)].toFixed(2)}`), ...P7_FACTORS.map((f) => needed(x.neededKernelSpeedup[String(f)]))];
      }),
    ));
  }
  out.push('', '## The DLX diagnostic beside IGP-04\'s P6 figures', '');
  out.push('The `dlx` phase is the time under `solveFirst`, the diagnostic that P6 skips during the search; it is a gross share of rating time. '
    + 'P6 saves it less one recomputed diagnostic per ok call (IGP-04 "net"), so its saving is a little below this share.');
  /** @type {string[][]} */
  const dlxRows = [];
  for (const [cell, c] of Object.entries(record.cells)) {
    dlxRows.push([cell, 'whole corpus', pct(c.dlxShare)]);
    for (const kind of KINDS) {
      for (const cls of CLASSES) {
        const v = c.byClass[kind][cls];
        if (v.ratings > 0) {
          dlxRows.push([cell, `${kind === 'call' ? 'call profiles' : 'window subsets'}, ${cls}`, pct(v.dlxShare)]);
        }
      }
    }
  }
  out.push('', table(['Cell', 'Class', 'DLX share of rating time'], dlxRows));
  out.push('', `IGP-04's P6 (share of rating ms saved, net, on today's search, A:B; ${record.p6Reference.todayText}): `
    + `${record.p6Reference.today.map((/** @type {any} */ t) => `${t.cell} ${pct(t.savedShare)}`).join(', ')}. `
    + `On the prototype ${record.p6Reference.prototypeText} (${record.p6Reference.prototypeBasis}). `
    + '10x10 and 12x12 Nightmare are not IGP-04 cells; read the DLX share of the call profiles against today\'s figure and the complete window subsets against the prototype\'s.');
  out.push('', '## Checks', '');
  out.push(`- Phases, categories, phase x category and functions each add up to the rating time within 1 % (largest difference over every aggregate ${pct(Math.max(...Object.values(record.cells).flatMap((/** @type {any} */ c) => Object.values(c.sumCheck))))}).`);
  out.push(`- The host-side reduction (a top-down walk) of the ${record.reductionCheck.rawProfiles} kept raw profiles (the first ${RAW_KEPT} of each cell, \`raw-<index>.cpuprofile\`) `
    + `${record.reductionCheck.equal ? 'equals' : 'DIFFERS from'} the worker's attribution.`);
  out.push(`- Every profiled rating equals its corpus rating (class, score, main and census work), ran in the supervised worker under the ${CUT_S} s cut, `
    + 'and has a `started` and a `recorded` line.');
  out.push(`- Profiling overhead: ${record.overhead.pairs} ratings (every ${record.overhead.twinEvery}th of a cell, alternately before and after the profiled run) were also rated without the profiler: `
    + `profiled ${fix1(record.overhead.profiledMs)} ms against ${fix1(record.overhead.plainMs)} ms plain, ratio ${record.overhead.ratio ?? 'n/a'} (median of the pair ratios ${record.overhead.medianPairRatio ?? 'n/a'}). `
    + `The attributed time is ${pct(record.overhead.coverage)} of the ratings' wall time.`);
  if (record.run.harnessNote !== null) {
    out.push(`- Note: ${record.run.harnessNote}.`);
  }
  out.push('', '## Notes', '');
  out.push('- The sampling profiler adds a little time (the ratio above) and attributes inlined functions to their callers; a share is a share of sampled self time, '
    + 'so a function inlined into `ladder` or `search` shows there.');
  out.push('- Categories: `ladder` (the rules, `colour`, `liveRowOf`, `overWork`), `state` (`select`, `kill`, `mark`, `undo` of `deduce.js`), `control` (the rest of `deduce.js`: '
    + '`fewestColumn`, `listRows`, `branch`, `search`, `snapshot`, `keepPath`, `measureDeduction`, `result`, the census drivers and its helpers), `model` (`buildModel`, '
    + '`placements.js`, `workspace.js` and the `ExactCover` constructor), `dlx` (the rest of `dlx.js` and `tiling.js`), `gc` (`(garbage collector)`, charged to phase `other`), `other`.');
  out.push('- The census includes the ladder and state work done inside it (stack ancestry, not flat self time). Repeated exact states inside a rating are not counted here (a later round).');
  out.push('- **Inlining and the markers.** The profiler does not report inlined frames, and V8 inlines `measureDeduction` into `measureV3` once the latter is hot: the search\'s `search` frames then hang directly '
    + 'under `measureV3`. Read literally, "an ancestor is `measureDeduction`" would charge that time to `other` (a dev run put 99.9 % of a capped rating and 20.8 % of a 10x10 corpus there). '
    + 'The marker set therefore also holds the recursion of the main search (`search`, `branch`; the census recurses through `probe`, a census marker) and, for the model and DLX phases, every function of the '
    + '`model` and `dlx` categories (the files of the model build and of the diagnostic). The "Unplaced engine time" column is the time in a `deduce.js` function that no marker among its ancestors could place '
    + '(for example a sample whose stack the profiler could not walk, or a census replay under an inlined `runProbes`); it stays in `other`, so the kernel share is a lower bound by that amount. '
    + 'Functions and categories are never affected (the innermost frame is always kept).');
  out.push('- **Function-level shares depend on V8\'s inlining.** An inlined callee\'s time is charged to its caller, and which functions are inlined changes with the JIT state: for example the `control` category (mostly the own time of `measureDeduction`) is '
    + `${Object.entries(record.cells).map(([cell, c]) => `${pct(/** @type {any} */ (c).categories.control.share)} of ${cell}`).join(' and ')}. `
    + 'Read the phase and category tables first when ranking P7\'s items, and the function table as a guide.');
  out.push('- Complete and capped ratings differ in kind: a capped rating stops at the work cap and has no census and no DLX diagnostic. The whole-corpus figures mix both; '
    + 'the class tables separate them.');
  if (record.problems.length > 0) {
    out.push('', '## Problems', '', ...record.problems.map((/** @type {string} */ p) => `- ${p}`));
  }
  return out.join('\n');
}

/** @param {string[]} argv @returns {Promise<number>} */
async function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'run') {
    return runCommand(rest);
  }
  if (command === 'summarize') {
    return summarizeCommand(rest);
  }
  throw new Stop('usage: pm2.mjs run|summarize ...');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`pm2: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
  setTimeout(() => process.exit(process.exitCode ?? 0), 10000).unref();
}
