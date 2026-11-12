// @ts-check
// Rating probe (design §7.9; difficulty-v3 MP06a): rates the puzzles of a pack, of a fresh generation request or of
// regenerated landscape requests with the v2 rating, the deduction solver and, for exploration, candidate v3 knobs,
// and prints one JSON line per puzzle. Read-only and for diagnostics only: it writes nothing but stdout, stderr and
// the file given with --output, and no rating, puzzle or document a user sees depends on it.
//
//   node tools/rate-probe.mjs --pack tests/fixtures/generated-sample-pack.json --orders 2 --tie-orders 2
//   node tools/rate-probe.mjs --board 10x6 --level hard --count 5 --seed demo --workers 2
//   node tools/rate-probe.mjs --landscape 6x10-easy --reps 0-4 --expect <calibration report.json> --workers 4
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { MAX_POOL_SIZE } from '../core/browser/worker-pool.js';
import { activeCount, boardFromRows } from '../core/engine/board.js';
import { measureDeduction } from '../core/engine/deduce.js';
import { breakdownV3, rate } from '../core/engine/difficulty.js';
import { canonicalJson, sha256Hex } from '../core/engine/hash.js';
import { levelForScore } from '../core/engine/levels.js';
import { parsePack } from '../core/engine/pack.js';
import { DEDUCE, SCORE } from '../core/engine/policy.js';
import { createRng } from '../core/engine/rng.js';
import { buildModel, solveFirst } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';

import { buildLandscapeMatrix } from './bench/calibration-reference.js';
import { seedFor, validateAccepted } from './bench/runner.js';
import { parseArgs as parseGenerateArgs, run as runGenerate } from './generate.mjs';
import { currentVersions } from './record-fixtures.mjs';

/** @typedef {import('../core/engine/types.js').Pack} Pack */
/** @typedef {import('../core/engine/deduce.js').DeductionLimits} DeductionLimits */

/**
 * The shape of `SCORE_V3` (RES-18); `model` is optional.
 * @typedef {object} Knobs
 * @property {'difficulty-v3'} [model]
 * @property {{ max: number, scale: number }} base
 * @property {readonly number[]} rule Rule term by deduction tier 0 to 3.
 * @property {{ G: number, info: number }} weights
 * @property {{ few: number, many: number }} penalty
 */

/**
 * @typedef {object} KnobMetrics
 * @property {number} U Pieces minus clues.
 * @property {number} deductionTier 0 to 3.
 * @property {number} G Decisive guesses.
 * @property {number} info Decisive information.
 * @property {string} solutions The count status of the deduction search.
 */

/**
 * @typedef {object} Identity
 * @property {'pack' | 'generated' | 'landscape'} mode
 * @property {string | null} caseId
 * @property {number | null} rep
 * @property {string | null} seed
 * @property {string | null} digest
 * @property {string | null} expected
 * @property {boolean | null} match
 */

/**
 * @typedef {object} ProbeOptions
 * @property {number} [orders] DLX orders (default 5; 0 = none).
 * @property {number} [tieOrders] Deduction tie variants 0 .. k - 1 (default 1 = canonical only).
 * @property {Knobs | null} [knobs] Candidate v3 knobs.
 * @property {Partial<DeductionLimits>} [deduce] Overrides of the `DEDUCE` fields.
 */

/**
 * @typedef {object} ProbeConfig
 * @property {'pack' | 'generated' | 'landscape'} mode
 * @property {string | undefined} pack
 * @property {string[]} generationArgs Flags of `tools/generate.mjs`, passed unchanged.
 * @property {{ caseId: string, from: number, to: number, workers: number, expect: string | undefined } | undefined} landscape
 * @property {number} orders
 * @property {number} tieOrders
 * @property {Knobs | null} knobs
 * @property {Partial<DeductionLimits>} deduce
 * @property {string | undefined} output
 */

/**
 * @typedef {{ ok: true, options: ProbeConfig } | { ok: false, error: string } | { ok: 'help' }} ParseResult
 */

/**
 * @typedef {object} Io
 * @property {(text: string) => void} stdout
 * @property {(text: string) => void} stderr
 * @property {(path: string) => string} readText
 * @property {(path: string, text: string) => void} writeText
 * @property {() => () => import('../core/browser/worker-pool.js').WorkerLike} [workerFactory]
 * @property {(cancel: () => void) => (() => void)} [onInterrupt]
 */

const OWN_FLAGS = ['pack', 'landscape', 'reps', 'expect', 'orders', 'tie-orders', 'knobs', 'deduce', 'output', 'help'];
const GENERATION_FLAGS = [
  'board', 'cols', 'rows', 'preset', 'n', 'rotation', 'level', 'count', 'seed', 'uniqueness', 'batch-index',
  'max-active', 'recipe', 'workers',
];
const DEFAULT_ORDERS = 5;
const MAX_ORDERS = 1000;
const DEFAULT_WORKERS = 4;
const LANDSCAPE_SEEDS = 20;
// The progress lines of tools/generate.mjs, which a landscape run (many requests) does not repeat.
const GENERATION_PROGRESS = /^(generating a |piece set: attempt |puzzle \d+ of \d+ accepted)/;

export const USAGE = `usage: node tools/rate-probe.mjs --pack <file.json> [options]
       node tools/rate-probe.mjs <generation flags of tools/generate.mjs> [options]
       node tools/rate-probe.mjs --landscape <case id> --reps <a>-<b> [--expect <report.json>] [--workers N] [options]
options  --orders k        DLX diagnostic under k seeded orders (default ${DEFAULT_ORDERS}; 0 = none)
         --tie-orders k    deduction under the tie variants 0 .. k-1 (default 1 = canonical only)
         --knobs <json>    v3 scores for these SCORE_V3 knobs (JSON text or a file name; exploration only)
         --deduce <json>   overrides of DEDUCE fields (JSON text or a file name), for example {"census":0}
         --output <file>   JSON lines to this file instead of stdout (its folder is created when missing)
Prints one JSON line per puzzle; read-only, for diagnostics only.
Exit codes: 0 every puzzle probed; 2 a generation was partial or an identity check failed (lines are still written); 1 invalid input or no pack.
`;

/** The starting knobs of RES-18. */
export const STARTING_KNOBS = Object.freeze({
  model: /** @type {const} */ ('difficulty-v3'),
  base: Object.freeze({ max: 12, scale: 6 }),
  rule: Object.freeze([0, 0, 2, 4]),
  weights: Object.freeze({ G: 6, info: 4 }),
  penalty: Object.freeze({ few: 2, many: 4 }),
});

// Experimental ranges of the knobs (JR-P3 (a)); a knob outside them is allowed for exploration and flagged.
const KNOB_RANGES = /** @type {const} */ ([
  ['base.max', 8, 12],
  ['base.scale', 3, 12],
  ['weights.G', 0, 8],
  ['weights.info', 0.5, 6],
  ['penalty.many', 0, 8],
]);

/**
 * @param {string} message
 * @returns {never}
 */
function invalid(message) {
  throw new RangeError(message);
}

/**
 * @param {string} name
 * @param {string} text
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function integerFlag(name, text, min, max) {
  const value = /^[0-9]{1,15}$/.test(text) ? Number(text) : NaN;
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    invalid(`--${name} must be an integer from ${min} to ${max}, got "${text}"`);
  }
  return value;
}

/**
 * @param {unknown} value
 * @param {string} name
 * @param {string[]} keys Every key the object must have; `optional` keys may be missing.
 * @param {string[]} [optional]
 * @returns {Record<string, unknown>}
 */
function plainObject(value, name, keys, optional = []) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    invalid(`${name} must be an object`);
  }
  const object = /** @type {Record<string, unknown>} */ (value);
  for (const key of Object.keys(object)) {
    if (!keys.includes(key) && !optional.includes(key)) {
      invalid(`${name} has an unknown field ${key}`);
    }
  }
  for (const key of keys) {
    if (!(key in object)) {
      invalid(`${name} needs a field ${key}`);
    }
  }
  return object;
}

/**
 * @param {unknown} value
 * @param {string} name
 * @returns {number}
 */
function finiteNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalid(`${name} must be a finite number`);
  }
  return value;
}

/**
 * Checks the knobs: the shape and the hard invariants are errors (RangeError); the experimental ranges only
 * flag the knobs.
 * @param {unknown} knobs
 * @returns {{ outsideRanges: boolean, outside: string[] }} The names of the knobs outside their ranges.
 */
export function checkKnobs(knobs) {
  const top = plainObject(knobs, 'knobs', ['base', 'rule', 'weights', 'penalty'], ['model']);
  if ('model' in top && top.model !== 'difficulty-v3') {
    invalid('knobs.model must be "difficulty-v3"');
  }
  const base = plainObject(top.base, 'knobs.base', ['max', 'scale']);
  const weights = plainObject(top.weights, 'knobs.weights', ['G', 'info']);
  const penalty = plainObject(top.penalty, 'knobs.penalty', ['few', 'many']);
  if (!Array.isArray(top.rule) || top.rule.length !== 4) {
    invalid('knobs.rule must be an array of four numbers');
  }
  const rule = top.rule.map((value, i) => finiteNumber(value, `knobs.rule[${i}]`));
  const baseMax = finiteNumber(base.max, 'knobs.base.max');
  const baseScale = finiteNumber(base.scale, 'knobs.base.scale');
  const weightG = finiteNumber(weights.G, 'knobs.weights.G');
  const weightInfo = finiteNumber(weights.info, 'knobs.weights.info');
  const few = finiteNumber(penalty.few, 'knobs.penalty.few');
  const many = finiteNumber(penalty.many, 'knobs.penalty.many');
  if (baseMax < 0 || baseScale <= 0) {
    invalid('knobs.base needs max >= 0 and scale > 0');
  }
  if (rule[0] !== 0 || rule[1] !== 0 || rule[2] < 0 || rule[2] > rule[3]) {
    invalid('knobs.rule must satisfy rule[0] = rule[1] = 0 <= rule[2] <= rule[3]');
  }
  if (baseMax + Math.max(...rule) > 16) {
    invalid('knobs must satisfy base.max + max(rule) <= 16');
  }
  if (few < 0 || few > many) {
    invalid('knobs.penalty must satisfy 0 <= few <= many');
  }
  if (weightG < 0 || weightInfo < 0) {
    invalid('knobs.weights must be >= 0');
  }
  const values = { 'base.max': baseMax, 'base.scale': baseScale, 'weights.G': weightG, 'weights.info': weightInfo, 'penalty.many': many };
  const outside = KNOB_RANGES
    .filter(([name, low, high]) => values[name] < low || values[name] > high)
    .map(([name]) => name);
  return { outsideRanges: outside.length > 0, outside };
}

/**
 * The RES-18 breakdown under candidate knobs (exploration only): validates the knobs (the invariants are an error,
 * the ranges only a flag), then `breakdownV3` computes every term and the one rounded score.
 * @param {KnobMetrics} m
 * @param {Knobs} knobs
 * @returns {{ base: number, rule: number, guess: number, penalty: number, unrounded: number, score: number }}
 */
export function scoreWithKnobs(m, knobs) {
  checkKnobs(knobs);
  return breakdownV3(/** @type {import('../core/engine/difficulty.js').ScoreInputV3} */ (m), knobs);
}

/**
 * Digest of the landscape runner for the puzzles of a regenerated request (RES-14): the layout keys, clue keys
 * and scores of the valid accepted puzzles, in order.
 * @param {Pack} pack
 * @param {string} levelId
 * @returns {string}
 */
export function landscapeDigest(pack, levelId) {
  const set = { board: boardFromRows(pack.board.rows), pieces: pack.pieces };
  const { valid } = validateAccepted(set, /** @type {any} */ (pack.puzzles), levelId);
  return sha256Hex(canonicalJson({
    layoutKeys: valid.map((v) => v.layoutKey),
    clueKeys: valid.map((v) => v.clueKey),
    scores: valid.map((v) => v.puzzle.rating?.score ?? null),
  }));
}

/**
 * @param {number[]} values
 * @returns {{ min: number, median: number, max: number } | null} The median of an even count is the lower middle value.
 */
function summarize(values) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  return { min: sorted[0], median: sorted[(sorted.length - 1) >> 1], max: sorted[sorted.length - 1] };
}

/**
 * @param {import('../core/engine/deduce.js').DeductionResult} result
 * @returns {number | null}
 */
const decisive = (result) => (result.first === null ? null : result.first.G);

/**
 * @param {import('../core/engine/deduce.js').DeductionResult} result
 * @returns {number | null}
 */
const decisiveInfo = (result) => (result.first === null ? null : result.first.info);

/** @returns {Identity} */
const packIdentity = () => ({ mode: 'pack', caseId: null, rep: null, seed: null, digest: null, expected: null, match: null });

/**
 * @param {number} orders
 * @param {number} tieOrders
 */
function checkCounts(orders, tieOrders) {
  if (!Number.isInteger(orders) || orders < 0 || orders > MAX_ORDERS) {
    invalid(`orders must be an integer from 0 to ${MAX_ORDERS}`);
  }
  if (!Number.isInteger(tieOrders) || tieOrders < 1 || tieOrders > MAX_ORDERS) {
    invalid(`tieOrders must be an integer from 1 to ${MAX_ORDERS}`);
  }
}

/**
 * One puzzle of a pack: model, canonical deduction (with the tie variants), the DLX diagnostic under seeded orders and
 * the old rating. Any error becomes a line with `error` in place of the rating fields.
 * @param {Pack} pack
 * @param {import('../core/engine/types.js').Board} board
 * @param {import('../core/engine/types.js').PackPuzzle} puzzle
 * @param {{ orders: number, tieOrders: number, knobs: Knobs | null, limits: DeductionLimits }} settings
 * @param {Identity} identity
 * @returns {Record<string, unknown>}
 */
function probePuzzle(pack, board, puzzle, settings, identity) {
  const head = {
    puzzleId: puzzle.id,
    board: { width: board.width, height: board.height, active: activeCount(board) },
    sourceModel: puzzle.rating?.model ?? null,
    storedScore: puzzle.rating?.score ?? null,
    identity,
  };
  try {
    const { pieces } = pack;
    const { clues } = puzzle;
    const { limits, knobs } = settings;
    // The workspace is fresh, so its peak is this puzzle's. The old rating builds its own model on it, hence it
    // runs last: it makes `model` stale.
    const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
    let started = performance.now();
    const model = buildModel(board, pieces, clues, ws);
    const buildMs = performance.now() - started;
    started = performance.now();
    const result = measureDeduction(model, limits);
    const deduceMs = performance.now() - started;
    const modelSize = { rows: model.rowCount, nonzeros: model.rowStart[model.rowCount], bytes: ws.peakBytes() };

    const first = result.first;
    const tieG = [decisive(result)];
    const tieInfo = [decisiveInfo(result)];
    for (let t = 1; t < settings.tieOrders; t += 1) {
      const variant = measureDeduction(model, limits, { tieOrder: t });
      tieG.push(decisive(variant));
      tieInfo.push(decisiveInfo(variant));
    }
    const seedText = puzzle.seed ?? puzzle.id;
    /** @type {number[]} */
    const B = [];
    for (let i = 0; i < settings.orders; i += 1) {
      const run = solveFirst(model, {
        rng: createRng(seedText, `order/${i}`),
        rowTrialLimit: SCORE.caps.rows,
        branchTrialLimit: SCORE.caps.branch,
      });
      B.push(run.layout === null ? SCORE.caps.branch : Math.min(run.branchTrials, SCORE.caps.branch));
    }
    started = performance.now();
    const rating = rate(board, pieces, clues, ws);
    const dlxMs = performance.now() - started;

    const raw = first === null ? null : {
      G: first.choices.length,
      info: first.choices.reduce((sum, c) => sum + Math.log2(c), 0),
      Cmax: first.choices.reduce((most, c) => Math.max(most, c), 0),
    };
    const intervals = first === null ? null
      : first.census.map((n) => [Math.log2(n.c / (n.c - n.f)), Math.log2(n.c / n.kLow)]);
    /** @type {Record<string, unknown>} */
    const line = {
      ...head,
      v2: { score: rating.score, level: rating.level, saturated: rating.saturated, metrics: rating.metrics },
      deduction: {
        path: result.path, first, search: result.search, count: result.count, census: result.census, raw, intervals,
      },
      orders: {
        B,
        G: tieG,
        info: tieInfo,
        summary: {
          B: summarize(B),
          G: summarize(/** @type {number[]} */ (tieG.filter((v) => v !== null))),
          info: summarize(/** @type {number[]} */ (tieInfo.filter((v) => v !== null))),
        },
      },
    };
    if (knobs !== null) {
      if (first === null) {
        line.v3 = null;
      } else {
        const breakdown = scoreWithKnobs({
          U: pieces.length - clues.length, deductionTier: first.deductionTier, G: first.G, info: first.info,
          solutions: result.count.solutions,
        }, knobs);
        line.v3 = {
          score: breakdown.score,
          level: levelForScore(breakdown.score).id,
          breakdown,
          knobs: checkKnobs(knobs).outsideRanges ? { ...knobs, outsideRanges: true } : knobs,
        };
      }
    }
    line.timing = { buildMs, dlxMs, deduceMs };
    line.modelSize = modelSize;
    return line;
  } catch (e) {
    const error = { name: e instanceof Error ? e.name : 'Error', message: e instanceof Error ? e.message : String(e) };
    return { ...head, error };
  }
}

/**
 * Probes every puzzle of a pack.
 * @param {Pack} pack
 * @param {ProbeOptions} [options]
 * @param {{ identity?: Identity }} [context] The identity written on every line (default: a pack).
 * @returns {Record<string, unknown>[]} One line object per puzzle, in pack order.
 */
export function probePack(pack, options = {}, context = {}) {
  const orders = options.orders ?? DEFAULT_ORDERS;
  const tieOrders = options.tieOrders ?? 1;
  checkCounts(orders, tieOrders);
  const knobs = options.knobs ?? null;
  if (knobs !== null) {
    checkKnobs(knobs);
  }
  const settings = { orders, tieOrders, knobs, limits: { ...DEDUCE, ...options.deduce } };
  const board = boardFromRows(pack.board.rows);
  const identity = context.identity ?? packIdentity();
  return pack.puzzles.map((puzzle) => probePuzzle(pack, board, puzzle, settings, identity));
}

/**
 * @param {string[]} argv
 * @returns {Map<string, string>} Flag name to value; `help` has an empty value.
 */
function readFlags(argv) {
  /** @type {Map<string, string>} */
  const flags = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const match = /^--([a-z-]+)(?:=(.*))?$/s.exec(token);
    const name = match === null ? '' : match[1];
    if (match === null || !(OWN_FLAGS.includes(name) || GENERATION_FLAGS.includes(name))) {
      invalid(`unknown argument: ${token}`);
    }
    if (flags.has(name)) {
      invalid(`--${name} was given twice`);
    }
    if (name === 'help') {
      if (match[2] !== undefined) {
        invalid('--help takes no value');
      }
      flags.set(name, '');
      continue;
    }
    let value = match[2];
    if (value === undefined) {
      i += 1;
      value = argv[i];
      if (value === undefined || value.startsWith('--')) {
        invalid(`--${name} needs a value`);
      }
    }
    flags.set(name, value);
  }
  return flags;
}

/**
 * JSON text (starting with `{`) or the name of a file that holds it.
 * @param {string} flag
 * @param {string} value
 * @param {(path: string) => string} readText
 * @returns {unknown}
 */
function jsonFlag(flag, value, readText) {
  const text = value.trimStart().startsWith('{') ? value : readText(value);
  try {
    return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    return invalid(`--${flag} is not valid JSON`);
  }
}

/**
 * @param {unknown} data
 * @returns {Partial<DeductionLimits>}
 */
function checkDeduceOverrides(data) {
  const overrides = plainObject(data, '--deduce', [], Object.keys(DEDUCE));
  for (const [key, value] of Object.entries(overrides)) {
    const least = key === 'solutions' ? 2 : 0;
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < least) {
      invalid(`--deduce ${key} must be an integer >= ${least}`);
    }
  }
  return /** @type {Partial<DeductionLimits>} */ (overrides);
}

/**
 * @param {string[]} argv
 * @param {(path: string) => string} [readText] Reads the files of --knobs and --deduce.
 * @returns {ParseResult}
 */
export function parseProbeArgs(argv, readText = (path) => readFileSync(path, 'utf8')) {
  try {
    const flags = readFlags(argv);
    if (flags.has('help')) {
      return { ok: 'help' };
    }
    const orders = flags.has('orders')
      ? integerFlag('orders', /** @type {string} */ (flags.get('orders')), 0, MAX_ORDERS) : DEFAULT_ORDERS;
    const tieOrders = flags.has('tie-orders')
      ? integerFlag('tie-orders', /** @type {string} */ (flags.get('tie-orders')), 1, MAX_ORDERS) : 1;
    let knobs = null;
    if (flags.has('knobs')) {
      knobs = /** @type {Knobs} */ (jsonFlag('knobs', /** @type {string} */ (flags.get('knobs')), readText));
      checkKnobs(knobs);
    }
    const deduce = flags.has('deduce')
      ? checkDeduceOverrides(jsonFlag('deduce', /** @type {string} */ (flags.get('deduce')), readText)) : {};
    const output = flags.get('output');
    if (output !== undefined && output.length === 0) {
      invalid('--output needs a file name');
    }
    const common = { orders, tieOrders, knobs, deduce, output };
    const generation = [...flags.keys()].filter((name) => GENERATION_FLAGS.includes(name));
    const generationArgs = [...flags]
      .filter(([name]) => GENERATION_FLAGS.includes(name))
      .flatMap(([name, value]) => [`--${name}`, value]);
    if (flags.has('pack') && flags.has('landscape')) {
      invalid('give one input: --pack, --landscape or the flags of a generation request');
    }
    if (flags.has('pack')) {
      if (generation.length > 0 || flags.has('reps') || flags.has('expect')) {
        invalid('--pack cannot be combined with generation flags, --reps or --expect');
      }
      const pack = /** @type {string} */ (flags.get('pack'));
      return { ok: true, options: { ...common, mode: 'pack', pack, generationArgs: [], landscape: undefined } };
    }
    if (flags.has('landscape')) {
      if (generation.some((name) => name !== 'workers')) {
        invalid('--landscape takes only --workers of the generation flags');
      }
      const caseId = /** @type {string} */ (flags.get('landscape'));
      if (!buildLandscapeMatrix({ seeds: LANDSCAPE_SEEDS }).cases.some((c) => c.id === caseId)) {
        invalid(`unknown landscape case: ${caseId}`);
      }
      const reps = /^([0-9]{1,2})-([0-9]{1,2})$/.exec(flags.get('reps') ?? '');
      if (reps === null) {
        invalid('--landscape needs --reps <a>-<b>, for example --reps 0-4');
      }
      const [from, to] = [Number(reps[1]), Number(reps[2])];
      if (from > to || to >= LANDSCAPE_SEEDS) {
        invalid(`--reps must be <a>-<b> with 0 <= a <= b <= ${LANDSCAPE_SEEDS - 1}`);
      }
      const workers = flags.has('workers')
        ? integerFlag('workers', /** @type {string} */ (flags.get('workers')), 1, MAX_POOL_SIZE) : DEFAULT_WORKERS;
      const landscapeOptions = { caseId, from, to, workers, expect: flags.get('expect') };
      return {
        ok: true,
        options: { ...common, mode: 'landscape', pack: undefined, generationArgs: [], landscape: landscapeOptions },
      };
    }
    if (flags.has('reps') || flags.has('expect')) {
      invalid('--reps and --expect belong to --landscape');
    }
    if (generation.length === 0) {
      invalid('give --pack, --landscape or the flags of a generation request');
    }
    return { ok: true, options: { ...common, mode: 'generated', pack: undefined, generationArgs, landscape: undefined } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * The run records of a calibration report (`<base>-<date>.json` of `tools/calibrate.mjs`).
 * @param {string} text
 * @returns {any[]}
 */
function reportRuns(text) {
  let report;
  try {
    report = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    return invalid('the --expect report is not valid JSON');
  }
  if (typeof report !== 'object' || report === null || !Array.isArray(report.runs)) {
    return invalid('the --expect report has no runs array');
  }
  return report.runs;
}

/**
 * The recorded `details.resultDigest` of the run with this case and seed, or null when there is none.
 * @param {any[]} runs
 * @param {string} caseId
 * @param {string} seed
 * @returns {string | null}
 */
function recordedDigest(runs, caseId, seed) {
  const found = runs.find((r) => r !== null && typeof r === 'object' && r.caseId === caseId && r.seed === seed);
  const digest = found?.details?.resultDigest;
  return typeof digest === 'string' ? digest : null;
}

/**
 * Runs the CLI and returns the exit code.
 * @param {string[]} argv
 * @param {Partial<Io>} [overrides]
 * @returns {Promise<number>}
 */
export async function run(argv, overrides = {}) {
  /** @type {Io} */
  const io = {
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
    readText: (path) => readFileSync(path, 'utf8'),
    writeText: (path, text) => {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    },
    ...overrides,
  };
  const parsed = parseProbeArgs(argv, io.readText);
  if (parsed.ok === 'help') {
    io.stdout(USAGE);
    return 0;
  }
  if (!parsed.ok) {
    io.stderr(`rate-probe: ${parsed.error}\n${USAGE}`);
    return 1;
  }
  const { options } = parsed;
  const probeOptions = {
    orders: options.orders, tieOrders: options.tieOrders, knobs: options.knobs, deduce: options.deduce,
  };
  if (options.knobs !== null) {
    const { outsideRanges, outside } = checkKnobs(options.knobs);
    if (outsideRanges) {
      io.stderr(`rate-probe: warning: knobs outside the experimental ranges (${outside.join(', ')})\n`);
    }
  }
  const output = options.output;
  let written = '';
  let lineCount = 0;
  let errorCount = 0;
  /** @param {Record<string, unknown>[]} lines */
  const emit = (lines) => {
    const text = lines.map((line) => `${JSON.stringify(line)}\n`).join('');
    lineCount += lines.length;
    errorCount += lines.filter((line) => 'error' in line).length;
    if (output === undefined) {
      io.stdout(text);
    } else {
      written += text;
      io.writeText(output, written);
    }
  };
  if (output !== undefined) {
    try {
      io.writeText(output, '');
    } catch (e) {
      io.stderr(`rate-probe: cannot write ${output}: ${e instanceof Error ? e.message : String(e)}\n`);
      return 1;
    }
  }
  let interrupted = false;
  /** @type {Partial<Io>} */
  const hostOverrides = {
    ...(io.workerFactory === undefined ? {} : { workerFactory: io.workerFactory }),
    ...(io.onInterrupt === undefined ? {} : {
      onInterrupt: (cancel) => /** @type {NonNullable<Io['onInterrupt']>} */ (io.onInterrupt)(() => {
        interrupted = true;
        cancel();
      }),
    }),
  };

  /**
   * One generation request through tools/generate.mjs, its pack text captured. With a tag (landscape mode, many
   * requests) the progress lines are dropped and the other lines get the tag.
   * @param {string[]} args
   * @param {(path: string) => string} readText
   * @param {string} tag
   */
  const generate = async (args, readText, tag) => {
    let text = '';
    const code = await runGenerate(args, {
      ...hostOverrides,
      readText,
      stdout: (chunk) => {
        text += chunk;
      },
      stderr: (chunk) => {
        if (tag === '') {
          io.stderr(chunk);
          return;
        }
        for (const line of chunk.split('\n')) {
          if (line !== '' && !GENERATION_PROGRESS.test(line)) {
            io.stderr(`${tag}${line}\n`);
          }
        }
      },
    });
    return { code, text };
  };

  try {
    let exit = 0;
    if (options.mode === 'pack') {
      const file = /** @type {string} */ (options.pack);
      const result = parsePack(io.readText(file));
      if (!result.ok) {
        io.stderr(`rate-probe: ${file} is not a valid pack: ${result.issues[0]?.path}: ${result.issues[0]?.message}\n`);
        return 1;
      }
      emit(probePack(result.value, probeOptions));
    } else if (options.mode === 'generated') {
      const check = parseGenerateArgs(options.generationArgs, io.readText);
      if (check.ok !== true) {
        io.stderr(`rate-probe: ${check.ok === false ? check.error : 'nothing to generate'}\n`);
        return 1;
      }
      const { code, text } = await generate(options.generationArgs, io.readText, '');
      const result = code === 1 ? null : parsePack(text);
      if (result === null || !result.ok) {
        io.stderr('rate-probe: the generation gave no usable pack\n');
        return 1;
      }
      const setSeed = /** @type {{ setSeed?: unknown } | undefined} */ (result.value.generation)?.setSeed;
      const identity = {
        ...packIdentity(), mode: /** @type {const} */ ('generated'), seed: typeof setSeed === 'string' ? setSeed : null,
      };
      emit(probePack(result.value, probeOptions, { identity }));
      exit = code === 0 ? 0 : 2;
    } else {
      const landscape = /** @type {NonNullable<ProbeConfig['landscape']>} */ (options.landscape);
      const runs = landscape.expect === undefined ? null : reportRuns(io.readText(landscape.expect));
      const c = /** @type {ReturnType<typeof buildLandscapeMatrix>['cases'][number]} */ (
        buildLandscapeMatrix({ seeds: LANDSCAPE_SEEDS }).cases.find((candidate) => candidate.id === landscape.caseId));
      let packs = 0;
      for (let rep = landscape.from; rep <= landscape.to && !interrupted; rep += 1) {
        const seedText = seedFor(c, rep);
        const recipe = {
          version: 1,
          boardRows: c.boardRows,
          rotation: c.rotation,
          levelId: c.levelId,
          quantity: c.quantity,
          seedText,
          batchIndex: 1,
          batchSeed: `${seedText}#1`,
          uniqueness: c.uniqueness,
          versions: currentVersions(),
        };
        const args = [
          '--recipe', 'probe-recipe', '--workers', String(landscape.workers), '--max-active', String(c.maxActive),
        ];
        const { code, text } = await generate(args, () => JSON.stringify(recipe), `${c.id}/${rep}: `);
        const result = code === 1 ? null : parsePack(text);
        if (result === null || !result.ok) {
          io.stderr(`rate-probe: ${c.id}/${rep}: the generation gave no usable pack\n`);
          exit = 2;
          continue;
        }
        packs += 1;
        const digest = landscapeDigest(result.value, c.levelId);
        const expected = runs === null ? null : recordedDigest(runs, c.id, seedText);
        const match = expected === null ? null : digest === expected;
        if (match === false) {
          io.stderr(`rate-probe: identity mismatch for ${c.id}/${rep}: digest ${digest}, recorded ${expected}\n`);
        } else if (runs !== null && expected === null) {
          io.stderr(`rate-probe: the report has no digest for ${c.id}/${rep} (seed ${seedText})\n`);
        }
        const identity = /** @type {Identity} */ ({
          mode: 'landscape', caseId: c.id, rep, seed: seedText, digest, expected, match,
        });
        emit(probePack(result.value, probeOptions, { identity }));
        if (code !== 0 || match === false) {
          exit = 2;
        }
      }
      if (interrupted) {
        exit = 2;
      }
      if (packs === 0) {
        io.stderr('rate-probe: no generation gave a pack\n');
        return 1;
      }
    }
    const summary = `${lineCount} puzzle lines${errorCount > 0 ? `, ${errorCount} with an error` : ''}`;
    io.stderr(`rate-probe: ${summary}${output === undefined ? '' : `, written to ${output}`}\n`);
    return exit;
  } catch (e) {
    io.stderr(`rate-probe: ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run(process.argv.slice(2), {
    onInterrupt: (cancel) => {
      process.once('SIGINT', cancel);
      return () => process.removeListener('SIGINT', cancel);
    },
  });
}
