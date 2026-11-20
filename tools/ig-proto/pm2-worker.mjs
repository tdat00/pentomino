// @ts-check
// PM2 worker (IGP-06): the supervised profiled-rating thread of `pm2.mjs`. The worker loads the `base` tree, owns one
// main workspace and a V8 inspector Session on its own thread. For each job it starts the CPU profiler, runs one
// canonical `rate()`, stops the profiler and reduces the profile to an attribution by phase, category and function.
// This module also exports the pure classification and reduction that `pm2.mjs` reuses (its host-side check of the
// kept raw profiles walks the tree top-down, a different traversal from the ancestor walk here). Imported on the
// main thread it runs nothing.
import { isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { readFileSync } from 'node:fs';

import { loadEngine } from './lib/engine.mjs';
import { ROOT } from './lib/paths.mjs';

export const SAMPLING_US = 1000;
export const PHASES = Object.freeze(['search', 'census', 'model', 'dlx', 'other']);
export const CATEGORIES = Object.freeze(['ladder', 'state', 'control', 'model', 'dlx', 'gc', 'other']);

const DEDUCE = 'core/engine/deduce.js';
const TILING = 'core/engine/tiling.js';
const DLX = 'core/engine/dlx.js';

/**
 * Phase markers in priority order: a sample takes the phase of the first marker found among its frame and its
 * ancestors. The profiler does not report inlined frames, and V8 inlines `measureDeduction` into `measureV3` once the
 * latter is hot, so the main search's own recursion (`search` and `branch`) is a `search` marker too (a dev run put
 * 99.9 % of a capped rating in `other` without it); `markerOf` also takes the model and DLX files as markers.
 */
export const MARKERS = Object.freeze([
  { phase: 'census', file: DEDUCE, names: ['runProbes', 'settleCensus', 'probe', 'replayLadder'] },
  { phase: 'dlx', file: TILING, names: ['solveFirst'] },
  { phase: 'model', file: TILING, names: ['buildModel'] },
  { phase: 'search', file: DEDUCE, names: ['measureDeduction', 'search', 'branch'] },
]);

/** Category rules in order: the first rule that matches a function (file, and name unless `names` is null) wins. */
export const CATEGORY_RULES = Object.freeze([
  {
    category: 'ladder',
    file: DEDUCE,
    names: ['colour', 'liveRowOf', 'forcedColumn', 'ruleR1', 'ruleR2', 'queueCell', 'fillSums', 'ruleR3', 'ruleR3Place',
      'ruleR4', 'ruleR5', 'overWork', 'closure', 'ruleR6', 'neighbourCell', 'labelPockets', 'gather', 'reachable',
      'ruleR7', 'findNecks', 'ruleR8', 'ruleR9', 'coversBoth', 'ladder'],
  },
  { category: 'state', file: DEDUCE, names: ['select', 'kill', 'mark', 'undo'] },
  { category: 'control', file: DEDUCE, names: null },
  { category: 'model', file: DLX, names: ['ExactCover'] },
  { category: 'dlx', file: DLX, names: null },
  { category: 'model', file: TILING, names: ['buildModel', 'assertLive'] },
  { category: 'dlx', file: TILING, names: null },
  { category: 'model', file: 'core/engine/placements.js', names: null },
  { category: 'model', file: 'core/engine/workspace.js', names: null },
]);

/**
 * @param {string} name
 * @param {string} file
 * @returns {number} The index of the phase marker the function is, or -1: a named marker, else any function of the
 *   `dlx` category (the DLX diagnostic's code) or of the `model` category (the model build's code).
 */
export function markerOf(name, file) {
  const named = MARKERS.findIndex((m) => m.file === file && m.names.includes(name));
  if (named >= 0) {
    return named;
  }
  const category = categoryOf(name, file);
  return category === 'dlx' ? 1 : category === 'model' ? 2 : -1;
}

/**
 * @param {string} name
 * @param {string} file
 * @returns {string} The function's category (`gc` for the collector, `other` when no rule matches).
 */
export function categoryOf(name, file) {
  if (name === '(garbage collector)') {
    return 'gc';
  }
  for (const rule of CATEGORY_RULES) {
    if (rule.file === file && (rule.names === null || rule.names.includes(name))) {
      return rule.category;
    }
  }
  return 'other';
}

/**
 * @param {string} url A call frame's URL.
 * @param {string} treeRoot Absolute path of the tree.
 * @returns {string} A file inside the tree relative to it, else a file inside the repository relative to its root,
 *   else the URL as it is (`node:` internals).
 */
export function fileOf(url, treeRoot) {
  if (!url.startsWith('file:')) {
    return url;
  }
  const path = fileURLToPath(url);
  for (const base of [treeRoot, ROOT]) {
    const r = relative(base, path);
    if (r !== '' && !r.startsWith('..') && !isAbsolute(r)) {
      return r.split(sep).join('/');
    }
  }
  return '<outside>';
}

/**
 * @param {{ functionName: string, lineNumber: number }} frame
 * @returns {string} The function's name; an anonymous function is named by its line.
 */
export const nameOf = (frame) => (frame.functionName === '' ? `(anonymous L${frame.lineNumber + 1})` : frame.functionName);

/** @returns {Record<string, any>} An attribution with its dense tables empty. */
export function emptyAttribution() {
  return {
    samples: 0,
    spanUs: 0,
    totalUs: 0,
    idleUs: 0,
    unplacedUs: 0,
    phases: Object.fromEntries(PHASES.map((p) => [p, 0])),
    categories: Object.fromEntries(CATEGORIES.map((c) => [c, 0])),
    phaseByCategory: {},
    functions: {},
  };
}

/**
 * Adds self time (µs) to a rating's attribution; a zero weight adds nothing. Time in a `deduce.js` function that no
 * marker could place (phase `other`, category `ladder`, `state` or `control`: for example a sample whose stack the
 * profiler could not walk) is also counted as `unplaced`; it stays in `other`.
 * @param {Record<string, any>} out
 * @param {string} phase
 * @param {string} category
 * @param {string} key `name@file`
 * @param {number} us
 */
export function addWeight(out, phase, category, key, us) {
  if (us === 0) {
    return;
  }
  out.totalUs += us;
  out.phases[phase] += us;
  out.categories[category] += us;
  if (phase === 'other' && (category === 'ladder' || category === 'state' || category === 'control')) {
    out.unplacedUs += us;
  }
  const row = (out.phaseByCategory[phase] ??= {});
  row[category] = (row[category] ?? 0) + us;
  const fn = (out.functions[key] ??= {});
  fn[phase] = (fn[phase] ?? 0) + us;
}

/**
 * The reduction of a profile whose URLs are already relative: every sample's self time (the time to the next sample,
 * the last one to the profile's end) goes to its phase (the first marker among the frame and its ancestors), its
 * function's category and the function. `(idle)` samples are not rating time and are only counted.
 * @param {{ nodes: any[], samples: number[], timeDeltas: number[], startTime: number, endTime: number }} profile
 * @returns {Record<string, any>}
 */
export function reduceProfile(profile) {
  const parent = new Map();
  for (const node of profile.nodes) {
    for (const child of node.children ?? []) {
      parent.set(child, node.id);
    }
  }
  /** @type {Map<number, { name: string, file: string, marker: number, category: string }>} */
  const table = new Map();
  for (const node of profile.nodes) {
    const file = node.callFrame.url;
    const name = nameOf(node.callFrame);
    table.set(node.id, { name, file, marker: markerOf(name, file), category: categoryOf(name, file) });
  }
  /** @type {Map<number, string>} */
  const phaseCache = new Map();
  const phaseOf = (/** @type {number} */ id) => {
    let phase = phaseCache.get(id);
    if (phase === undefined) {
      let best = Infinity;
      for (let cur = id; cur !== undefined; cur = parent.get(cur)) {
        const m = /** @type {{ marker: number }} */ (table.get(cur)).marker;
        if (m >= 0 && m < best) {
          best = m;
        }
      }
      phase = best === Infinity ? 'other' : MARKERS[best].phase;
      phaseCache.set(id, phase);
    }
    return phase;
  };
  const out = emptyAttribution();
  const n = profile.samples.length;
  out.samples = n;
  out.spanUs = profile.endTime - profile.startTime;
  let stamp = profile.startTime;
  const stamps = profile.timeDeltas.map((d) => (stamp += d));
  for (let i = 0; i < n; i += 1) {
    const us = i + 1 < n ? stamps[i + 1] - stamps[i] : Math.max(0, profile.endTime - stamps[i]);
    const info = /** @type {{ name: string, file: string, category: string }} */ (table.get(profile.samples[i]));
    if (info.name === '(idle)') {
      out.idleUs += us;
    } else {
      addWeight(out, phaseOf(profile.samples[i]), info.category, `${info.name}@${info.file}`, us);
    }
  }
  return out;
}

if (!isMainThread && parentPort !== null && workerData?.pm2 === true) {
  await startWorker(parentPort, workerData.treeRoot);
}

/**
 * @param {import('node:worker_threads').MessagePort} port
 * @param {string} treeRoot
 */
async function startWorker(port, treeRoot) {
  const { Session } = await import('node:inspector/promises');
  const engine = await loadEngine(treeRoot);
  const ws = engine.workspace.createWorkspace(engine.workspace.MAIN_WORKSPACE_BYTES);
  const { IncompleteRatingError, UnsatisfiableError } = engine.difficulty;
  const session = new Session();
  session.connect();
  await session.post('Profiler.enable');

  /**
   * One canonical rating, timed.
   * @param {{ boardRows: string[], pieces: any[], clues: any[] }} job
   */
  function once(job) {
    const board = engine.board.boardFromRows(job.boardRows);
    const t0 = performance.now();
    /** @type {Record<string, any>} */
    let result;
    try {
      const rating = engine.difficulty.rate(board, job.pieces, job.clues, ws);
      const m = rating.metrics;
      result = {
        outcome: 'complete', score: rating.score, mainWork: m.work - m.censusWork, censusWork: m.censusWork,
        censusComplete: m.censusComplete, stop: m.searchStop,
      };
    } catch (e) {
      if (e instanceof IncompleteRatingError) {
        result = { outcome: 'capped', score: null, mainWork: e.counters.work, censusWork: 0, censusComplete: null, stop: e.counters.stop };
      } else if (e instanceof UnsatisfiableError) {
        result = { outcome: 'unsat', score: null, mainWork: 0, censusWork: 0, censusComplete: null, stop: null };
      } else {
        throw e;
      }
    }
    return { result, ms: performance.now() - t0 };
  }

  /** @param {{ boardRows: string[], pieces: any[], clues: any[] }} job */
  async function profiled(job) {
    await session.post('Profiler.setSamplingInterval', { interval: SAMPLING_US });
    await session.post('Profiler.start');
    /** @type {ReturnType<typeof once> | undefined} */
    let rated;
    try {
      rated = once(job);
    } finally {
      const { profile } = await session.post('Profiler.stop');
      if (rated !== undefined) {
        for (const node of profile.nodes) {
          node.callFrame.url = fileOf(node.callFrame.url, treeRoot);
        }
        Object.assign(rated, { profile });
      }
    }
    return /** @type {ReturnType<typeof once> & { profile: any }} */ (rated);
  }

  const round3 = (/** @type {number} */ x) => Math.round(x * 1000) / 1000;

  port.on('message', async (/** @type {any} */ msg) => {
    if (msg.type !== 'rate') {
      return;
    }
    try {
      let plainMs = null;
      if (msg.twin === 'before') {
        plainMs = once(msg).ms;
      }
      const run = await profiled(msg);
      if (msg.twin === 'after') {
        plainMs = once(msg).ms;
      }
      port.postMessage({
        type: 'rated',
        index: msg.index,
        result: run.result,
        ms: round3(run.ms),
        plainMs: plainMs === null ? null : round3(plainMs),
        attribution: reduceProfile(run.profile),
        raw: msg.keepRaw === true ? run.profile : null,
      });
    } catch (e) {
      port.postMessage({ type: 'failed', index: msg.index, message: e instanceof Error ? `${e.name}: ${e.message}` : String(e) });
    }
  });
  const info = JSON.parse(readFileSync(join(treeRoot, 'ig-tree.json'), 'utf8'));
  port.postMessage({ type: 'ready', treeId: info.treeId });
}
