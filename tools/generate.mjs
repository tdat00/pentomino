// @ts-check
// Headless generator (design §8.2, §8.6; T15). It drives the same generation
// client and engine worker as the browser, so the same recipe gives the same
// semantic puzzles at any worker count.
//
//   node tools/generate.mjs --board 10x6 --level hard --count 5 --seed demo --workers 4
//   node tools/generate.mjs --recipe tests/fixtures/generation-case.json --workers 1
//
// Only the pack JSON goes to stdout (or to --output); progress and errors go to
// stderr. Exit 0 = complete, 2 = valid partial or cancelled pack, 1 = no usable
// result or invalid input. A batch is always generated with an empty history:
// `--batch-index N` selects the seed `<seed>#N`, nothing replays earlier batches.
import { readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { pathToFileURL } from 'node:url';

import { createGenerationClient, GenerationError } from '../core/browser/generation-client.js';
import { createPool, MAX_POOL_SIZE } from '../core/browser/worker-pool.js';
import { boardFromRows, boardToRows, MAX_SIDE, preset } from '../core/engine/board.js';
import { canonicalKey } from '../core/engine/geometry.js';
import { level } from '../core/engine/levels.js';
import { parsePack, serializePack } from '../core/engine/pack.js';
import { normalizeSeedText, randomSeedText } from '../core/engine/rng.js';

import { nodeWorkerFactory } from './node-worker.mjs';
import { currentVersions } from './record-fixtures.mjs';

/** @typedef {import('../core/engine/types.js').Pack} Pack */

export const DEFAULT_MAX_ACTIVE = 676;
export const MIN_MAX_ACTIVE = 30;
export const MAX_COUNT = 10;
const FLAG_NAMES = [
  'board', 'cols', 'rows', 'preset', 'n', 'rotation', 'level', 'count', 'seed', 'uniqueness', 'workers',
  'output', 'batch-index', 'max-active', 'recipe', 'help',
];
const RECIPE_ONLY_FLAGS = new Set(['workers', 'max-active', 'output', 'recipe', 'help']);
const RECIPE_FIELDS = [
  'version', 'boardRows', 'rotation', 'levelId', 'quantity', 'seedText', 'batchIndex', 'batchSeed', 'uniqueness',
  'versions', 'expected',
];
const MAX_BOARD_SIDE = 64;

export const USAGE = `usage: node tools/generate.mjs --board <cols>x<rows> --level <id> [options]
       node tools/generate.mjs --recipe <file.json> [--workers N] [--max-active N] [--output file]

board     --board 10x6 | --cols 10 --rows 6 | --preset rectangle|heart|diamond|cross|ring [--n N]
          [--rotation 0|45|...|315]
level     --level very-easy|easy|normal|hard|expert|master|nightmare|hell-N
options   --count 1-10 (default 5)   --seed <text> (default: random)   --uniqueness any|require (default any)
          --workers 1-4 (default: cores, at most 4)   --batch-index N (default 1)
          --max-active 30-676 (default ${DEFAULT_MAX_ACTIVE})   --output <file>
A recipe fixes every semantic input; only --workers, --max-active and --output may accompany it.
Exit codes: 0 complete, 2 valid partial or cancelled pack, 1 no usable result or invalid input.
`;

/**
 * @typedef {object} Config
 * @property {string[]} boardRows
 * @property {number} rotation
 * @property {string} levelId
 * @property {number} quantity
 * @property {string} seedText
 * @property {number} batchIndex
 * @property {'any' | 'require'} uniqueness
 * @property {number} workers
 * @property {number} maxActive
 * @property {string | undefined} output
 * @property {Record<string, any> | undefined} expected Recipe evidence, compared after the run.
 * @property {boolean} seedGenerated
 */

/**
 * @typedef {{ ok: true, config: Config } | { ok: false, error: string } | { ok: 'help' }} ParseResult
 */

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
    throw new RangeError(`--${name} must be an integer from ${min} to ${max}, got "${text}"`);
  }
  return value;
}

/**
 * @param {string[]} argv
 * @returns {Map<string, string>} flag name to value; `help` has an empty value.
 */
function readFlags(argv) {
  /** @type {Map<string, string>} */
  const flags = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const match = /^--([a-z-]+)(?:=(.*))?$/s.exec(token);
    if (match === null || !FLAG_NAMES.includes(match[1])) {
      throw new RangeError(`unknown argument: ${token}`);
    }
    const name = match[1];
    if (flags.has(name)) {
      throw new RangeError(`--${name} was given twice`);
    }
    if (name === 'help') {
      flags.set(name, '');
      continue;
    }
    let value = match[2];
    if (value === undefined) {
      i += 1;
      value = argv[i];
      if (value === undefined || value.startsWith('--')) {
        throw new RangeError(`--${name} needs a value`);
      }
    }
    flags.set(name, value);
  }
  return flags;
}

/**
 * @param {Map<string, string>} flags
 * @returns {{ boardRows: string[], rotation: number }}
 */
function boardFromFlags(flags) {
  const sized = flags.has('cols') || flags.has('rows');
  const given = [flags.has('board'), sized && !flags.has('preset'), flags.has('preset')].filter(Boolean).length;
  if (given !== 1) {
    throw new RangeError('give exactly one board: --board <cols>x<rows>, --cols with --rows, or --preset');
  }
  if (flags.has('n') && !flags.has('preset')) {
    throw new RangeError('--n belongs to --preset');
  }
  /** @param {string} name */
  const side = (name) => integerFlag(name, /** @type {string} */ (flags.get(name)), 1, MAX_BOARD_SIDE);
  const rotationText = flags.get('rotation');
  const rotation = rotationText === undefined ? undefined : integerFlag('rotation', rotationText, 0, 359);
  if (rotation !== undefined && rotation % 45 !== 0) {
    throw new RangeError('--rotation must be 0, 45, 90, ... or 315');
  }
  if (flags.has('preset')) {
    const id = /** @type {'rectangle' | 'heart' | 'diamond' | 'cross' | 'ring'} */ (flags.get('preset'));
    const made = preset(id, {
      n: flags.has('n') ? side('n') : undefined,
      w: flags.has('cols') ? side('cols') : undefined,
      h: flags.has('rows') ? side('rows') : undefined,
    });
    return { boardRows: boardToRows(made.board), rotation: rotation ?? made.rotation };
  }
  let cols;
  let rows;
  if (flags.has('board')) {
    const match = /^([0-9]{1,3})[xX]([0-9]{1,3})$/.exec(/** @type {string} */ (flags.get('board')));
    if (match === null) {
      throw new RangeError('--board must look like 10x6 (columns x rows)');
    }
    [cols, rows] = [Number(match[1]), Number(match[2])];
  } else {
    if (!flags.has('cols') || !flags.has('rows')) {
      throw new RangeError('--cols and --rows go together');
    }
    [cols, rows] = [side('cols'), side('rows')];
  }
  if (cols < 1 || rows < 1 || cols > MAX_BOARD_SIDE || rows > MAX_BOARD_SIDE) {
    throw new RangeError(`board sides must be from 1 to ${MAX_BOARD_SIDE} (generation allows at most ${MAX_SIDE})`);
  }
  return { boardRows: Array(rows).fill('#'.repeat(cols)), rotation: rotation ?? 0 };
}

/**
 * @param {Map<string, string>} flags
 * @returns {{ workers: number, maxActive: number, output: string | undefined }}
 */
function hostFlags(flags) {
  const workers = flags.has('workers')
    ? integerFlag('workers', /** @type {string} */ (flags.get('workers')), 1, MAX_POOL_SIZE)
    : Math.max(1, Math.min(MAX_POOL_SIZE, availableParallelism()));
  const maxActive = flags.has('max-active')
    ? integerFlag('max-active', /** @type {string} */ (flags.get('max-active')), MIN_MAX_ACTIVE, DEFAULT_MAX_ACTIVE)
    : DEFAULT_MAX_ACTIVE;
  const output = flags.get('output');
  if (output !== undefined && output.length === 0) {
    throw new RangeError('--output needs a file name');
  }
  return { workers, maxActive, output };
}

/**
 * Checks a recipe object: every declared field and version must be understood,
 * and `batchSeed` must equal `seedText + "#" + batchIndex`. `expected` is kept
 * as evidence for the comparison after the run.
 * @param {unknown} data
 * @returns {Omit<Config, 'workers' | 'maxActive' | 'output' | 'seedGenerated'>}
 */
export function checkRecipe(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new RangeError('the recipe must be a JSON object');
  }
  const recipe = /** @type {Record<string, any>} */ (data);
  for (const key of Object.keys(recipe)) {
    if (!RECIPE_FIELDS.includes(key)) {
      throw new RangeError(`the recipe has an unknown field ${key}`);
    }
  }
  for (const key of RECIPE_FIELDS.filter((k) => k !== 'expected')) {
    if (!(key in recipe)) {
      throw new RangeError(`the recipe needs a field ${key}`);
    }
  }
  if (recipe.version !== 1) {
    throw new RangeError('unsupported recipe version');
  }
  if (!Array.isArray(recipe.boardRows)) {
    throw new RangeError('boardRows must be an array of strings');
  }
  boardFromRows(recipe.boardRows);
  const { rotation, quantity, batchIndex } = recipe;
  if (!Number.isInteger(rotation) || rotation < 0 || rotation >= 360 || rotation % 45 !== 0) {
    throw new RangeError('rotation must be 0, 45, ... or 315');
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_COUNT) {
    throw new RangeError(`quantity must be an integer from 1 to ${MAX_COUNT}`);
  }
  if (!Number.isSafeInteger(batchIndex) || batchIndex < 1) {
    throw new RangeError('batchIndex must be a positive integer');
  }
  if (typeof recipe.seedText !== 'string' || normalizeSeedText(recipe.seedText) !== recipe.seedText) {
    throw new RangeError('seedText must be a normalized seed of 1 to 64 characters');
  }
  if (recipe.batchSeed !== `${recipe.seedText}#${batchIndex}`) {
    throw new RangeError('batchSeed must equal seedText + "#" + batchIndex');
  }
  if (recipe.uniqueness !== 'any' && recipe.uniqueness !== 'require') {
    throw new RangeError('uniqueness must be "any" or "require"');
  }
  if (typeof recipe.levelId !== 'string') {
    throw new RangeError('levelId must be a level id');
  }
  level(recipe.levelId);
  const current = /** @type {Record<string, string>} */ (currentVersions());
  const declared = recipe.versions;
  if (typeof declared !== 'object' || declared === null || Array.isArray(declared)) {
    throw new RangeError('versions must be an object');
  }
  for (const key of Object.keys(declared)) {
    if (!(key in current)) {
      throw new RangeError(`the recipe declares an unknown version ${key}`);
    }
  }
  for (const key of Object.keys(current)) {
    if (declared[key] !== current[key]) {
      throw new RangeError(`the recipe needs ${key} ${String(declared[key])}, this build has ${current[key]}`);
    }
  }
  if (recipe.expected !== undefined && (typeof recipe.expected !== 'object' || recipe.expected === null)) {
    throw new RangeError('expected must be an object');
  }
  return {
    boardRows: recipe.boardRows,
    rotation,
    levelId: recipe.levelId,
    quantity,
    seedText: recipe.seedText,
    batchIndex,
    uniqueness: recipe.uniqueness,
    expected: recipe.expected,
  };
}

/**
 * @param {string[]} argv
 * @param {(path: string) => string} [readText]
 * @returns {ParseResult}
 */
export function parseArgs(argv, readText = (path) => readFileSync(path, 'utf8')) {
  try {
    const flags = readFlags(argv);
    if (flags.has('help')) {
      return { ok: 'help' };
    }
    const host = hostFlags(flags);
    if (flags.has('recipe')) {
      const extra = [...flags.keys()].filter((name) => !RECIPE_ONLY_FLAGS.has(name));
      if (extra.length > 0) {
        throw new RangeError(`a recipe fixes its own inputs; remove --${extra.join(', --')}`);
      }
      const text = readText(/** @type {string} */ (flags.get('recipe')));
      let data;
      try {
        data = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
      } catch {
        throw new RangeError('the recipe is not valid JSON');
      }
      return { ok: true, config: { ...checkRecipe(data), ...host, seedGenerated: false } };
    }
    const { boardRows, rotation } = boardFromFlags(flags);
    if (!flags.has('level')) {
      throw new RangeError('--level is required');
    }
    const levelId = /** @type {string} */ (flags.get('level'));
    level(levelId);
    const seedGenerated = !flags.has('seed');
    return {
      ok: true,
      config: {
        boardRows,
        rotation,
        levelId,
        quantity: flags.has('count') ? integerFlag('count', /** @type {string} */ (flags.get('count')), 1, MAX_COUNT) : 5,
        seedText: seedGenerated ? randomSeedText() : normalizeSeedText(/** @type {string} */ (flags.get('seed'))),
        batchIndex: flags.has('batch-index') ? integerFlag('batch-index', /** @type {string} */ (flags.get('batch-index')), 1, Number.MAX_SAFE_INTEGER) : 1,
        uniqueness: parseUniqueness(flags.get('uniqueness')),
        expected: undefined,
        seedGenerated,
        ...host,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * @param {string | undefined} text
 * @returns {'any' | 'require'}
 */
function parseUniqueness(text) {
  if (text === undefined || text === 'any') {
    return 'any';
  }
  if (text === 'require') {
    return 'require';
  }
  throw new RangeError('--uniqueness must be any or require');
}

/**
 * Compares the semantic summary of a run with a recipe's recorded evidence.
 * A partial run is compared over the puzzles it produced.
 * @param {Record<string, any>} expected
 * @param {{ pieceKeys: string[], layoutKeys: string[], clueKeys: string[], scores: number[] }} actual
 * @returns {string[]} Differences; empty when the run agrees.
 */
export function compareExpected(expected, actual) {
  /** @type {string[]} */
  const problems = [];
  if (Array.isArray(expected.pieceKeys) && JSON.stringify(expected.pieceKeys) !== JSON.stringify(actual.pieceKeys)) {
    problems.push('pieceKeys differ from the recipe');
  }
  for (const name of /** @type {const} */ (['layoutKeys', 'clueKeys', 'scores'])) {
    const want = expected[name];
    if (Array.isArray(want) && JSON.stringify(want.slice(0, actual[name].length)) !== JSON.stringify(actual[name])) {
      problems.push(`${name} differ from the recipe`);
    }
  }
  return problems;
}

/**
 * @param {Pack} pack
 * @returns {string} Two-space JSON with CRLF line ends and a final newline.
 */
export function packText(pack) {
  return `${serializePack(pack, { pretty: true }).replace(/\n/g, '\r\n')}\r\n`;
}

const REASONS = /** @type {Record<string, string>} */ ({
  'layouts-not-found': 'this piece set may allow only a few different arrangements',
  'difficulty-not-found': 'other arrangements of this piece set did not reach the level',
  'uniqueness-not-proved': 'uniqueness could not be proved for further arrangements',
  'time-limit': 'the time limit was reached',
});

/**
 * @typedef {object} Io
 * @property {(text: string) => void} stdout
 * @property {(text: string) => void} stderr
 * @property {(path: string) => string} readText
 * @property {(path: string, text: string) => void} writeText
 * @property {() => () => import('../core/browser/worker-pool.js').WorkerLike} [workerFactory]
 * @property {(cancel: () => void) => (() => void)} [onInterrupt] Registers a cancel handler; returns its remover.
 */

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
    writeText: (path, text) => writeFileSync(path, text),
    ...overrides,
  };
  const parsed = parseArgs(argv, io.readText);
  if (parsed.ok === 'help') {
    io.stdout(USAGE);
    return 0;
  }
  if (!parsed.ok) {
    io.stderr(`generate: ${parsed.error}\n${USAGE}`);
    return 1;
  }
  const { config } = parsed;
  const pool = createPool({ size: config.workers, workerFactory: (io.workerFactory ?? nodeWorkerFactory)() });
  const client = createGenerationClient(pool);
  const label = level(config.levelId).label;
  const unhook = io.onInterrupt?.(() => client.cancel());
  const hooks = {
    onProgress: (/** @type {{ job: string, stage: string, attempt?: number }} */ p) => {
      if (p.job === 'set' && p.stage === 'carving') {
        io.stderr(`piece set: attempt ${p.attempt} finished\n`);
      }
    },
    onAccepted: (/** @type {{ accepted: number, quantity: number, puzzle: { rating: { score: number } | null } }} */ e) => {
      io.stderr(`puzzle ${e.accepted} of ${e.quantity} accepted (score ${e.puzzle.rating?.score})\n`);
    },
  };
  try {
    if (parsed.config.seedGenerated) {
      io.stderr(`seed: ${config.seedText}\n`);
    }
    io.stderr(`generating a ${label} piece set for seed ${config.seedText}\n`);
    const set = await client.generateSet({
      boardRows: config.boardRows,
      rotation: config.rotation,
      levelId: config.levelId,
      seedText: config.seedText,
      uniqueness: config.uniqueness,
      maxActive: config.maxActive,
    }, hooks);
    if (set.status !== 'complete' || set.set === undefined) {
      io.stderr(set.status === 'cancelled'
        ? 'generate: cancelled before a piece set was found\n'
        : `generate: no ${label} piece set was found (${set.reason ?? 'unknown'})\n`);
      return 1;
    }
    const batch = await client.generateBatch({
      set: set.set,
      rotation: config.rotation,
      targetLevelId: config.levelId,
      quantity: config.quantity,
      setSeed: config.seedText,
      batchIndex: config.batchIndex,
      uniqueness: config.uniqueness,
      seenLayouts: [],
      seenClues: [],
      // Only the first batch of a fresh set may reuse the set's calibration puzzle.
      calibration: config.batchIndex === 1 ? set.calibration : undefined,
      setLevel: config.levelId,
      setAttempt: set.attempt,
    }, hooks);
    if (config.expected !== undefined) {
      const differences = compareExpected(config.expected, {
        pieceKeys: set.set.pieces.map((p) => canonicalKey(p.cells)),
        layoutKeys: batch.seenLayouts,
        clueKeys: batch.seenClues,
        scores: batch.accepted.map((p) => p.rating?.score ?? NaN),
      });
      if (differences.length > 0) {
        io.stderr(`generate: the run does not reproduce the recipe: ${differences.join('; ')}\n`);
        return 1;
      }
    }
    if (batch.pack === undefined) {
      io.stderr(`generate: no puzzle was accepted (${batch.reason ?? batch.status})\n`);
      return 1;
    }
    const text = packText(batch.pack);
    const checked = parsePack(text);
    if (!checked.ok) {
      io.stderr(`generate: the pack failed validation: ${checked.issues[0]?.message ?? 'unknown'}\n`);
      return 1;
    }
    if (config.output === undefined) {
      io.stdout(text);
    } else {
      io.writeText(config.output, text);
      io.stderr(`wrote ${config.output}\n`);
    }
    if (batch.status === 'complete') {
      return 0;
    }
    const why = batch.reason === undefined ? batch.status : `${batch.reason}: ${REASONS[batch.reason] ?? batch.reason}`;
    io.stderr(`generate: found ${batch.accepted.length} of ${config.quantity} ${label} puzzles (${why})\n`);
    return 2;
  } catch (e) {
    if (e instanceof GenerationError) {
      const kept = e.accepted.length > 0 ? ` (${e.accepted.length} accepted puzzles were not saved)` : '';
      io.stderr(`generate: ${e.code}: ${e.message}${kept}\n`);
    } else {
      io.stderr(`generate: ${e instanceof Error ? e.message : String(e)}\n`);
    }
    return 1;
  } finally {
    unhook?.();
    pool.close();
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
