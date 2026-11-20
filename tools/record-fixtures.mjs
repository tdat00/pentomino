// @ts-check
// Records and replays the successful 10 x 6 generation fixtures:
//   tests/fixtures/generation-case.json       recipe + expected semantic keys
//   tests/fixtures/generated-sample-pack.json Easy/Normal/Hard sample pack
//
//   node tools/record-fixtures.mjs --create             refuses existing files
//   node tools/record-fixtures.mjs --check              replays, never writes
//   node tools/record-fixtures.mjs --replace --reason   only for an approved
//                                                       semantic/version change
//
// `--dir <path>` overrides the fixture directory. The set seed search is over
// `fixture-set-0..49` and batches use that seed plus `#1`; nothing is random.
//
// A separate mode records the replay case (gate GF-P4): one 10 x 6 Hard `require` set and two batches of it, made
// through the ordinary generation client, as tests/fixtures/replay-case.json (design §13).
//
//   node tools/record-fixtures.mjs --replay-case --search [--from <n>]   writes nothing; bounded and resumable
//   node tools/record-fixtures.mjs --replay-case --create --seed <n>     refuses an existing file
//   node tools/record-fixtures.mjs --replay-case --check                 regenerates the recorded seed, never writes
//   node tools/record-fixtures.mjs --replay-case --replace --seed <n> --reason <text>
//
// The seeds are `replay-case-0..49`; `--seed` and `--from` take an integer from 0 to 49.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createGenerationClient } from '../core/browser/generation-client.js';
import { createPool } from '../core/browser/worker-pool.js';
import { boardFromRows, boardToRows } from '../core/engine/board.js';
import { selectClues } from '../core/engine/clues.js';
import { IncompleteRatingError, MODEL, rate, rateV2 } from '../core/engine/difficulty.js';
import { firstSetAttempt, runFold } from '../core/engine/generate.js';
import { canonicalKey } from '../core/engine/geometry.js';
import { clueKey, layoutKey, puzzleId } from '../core/engine/keys.js';
import { level } from '../core/engine/levels.js';
import { POLICY_ID } from '../core/engine/policy.js';
import { createRng, RNG_ID, SEED_SCHEME } from '../core/engine/rng.js';
import { isValidLayout } from '../core/engine/tiling.js';
import { ALGO_ID, APP_VERSION } from '../core/engine/version.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { nodeWorkerFactory } from './node-worker.mjs';

/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').Pack} Pack */
/** @typedef {import('../core/engine/types.js').BatchContext} BatchContext */
/** @typedef {import('../core/engine/generate.js').FoldState} FoldState */

export const BOARD_ROWS = Object.freeze(Array(6).fill('#'.repeat(10)));
export const SEED_COUNT = 50;
export const SAMPLE_LEVELS = /** @type {const} */ (['easy', 'normal', 'hard']);
const FIXTURE_FILES = /** @type {const} */ ({ recipe: 'generation-case.json', sample: 'generated-sample-pack.json' });
const REPLAY_FILE = 'replay-case.json';
// A search run stops between seeds once this much time has passed, so that one command fits the 590 s helper bound.
const REPLAY_SEARCH_BOUND_MS = 540_000;
const REPLAY_CREATED_AT = '2026-01-01T00:00:00.000Z';
const DEFAULT_DIR = fileURLToPath(new URL('../tests/fixtures/', import.meta.url));

/**
 * @typedef {object} Recipe
 * @property {1} version
 * @property {string[]} boardRows
 * @property {0} rotation
 * @property {'hard'} levelId
 * @property {number} quantity
 * @property {string} seedText
 * @property {1} batchIndex
 * @property {string} batchSeed
 * @property {'any'} uniqueness
 * @property {{ algo: string, policy: string, rng: string, model: string }} versions
 * @property {{ pieceKeys: string[], layoutKeys: string[], clueKeys: string[], scores: number[] }} expected
 */

/**
 * @typedef {object} Replay
 * @property {import('../core/engine/types.js').PieceSet} set
 * @property {number} setAttempt
 * @property {BatchContext} ctx
 * @property {FoldState} fold
 */

/** @returns {{ main: import('../core/engine/types.js').Workspace, scratch: import('../core/engine/types.js').Workspace }} */
function newExecution() {
  return { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
}

/** @returns {Recipe['versions']} */
export function currentVersions() {
  return { algo: ALGO_ID, policy: POLICY_ID, rng: RNG_ID, model: MODEL };
}

/**
 * Regenerates the set and its first batch from the recipe inputs alone.
 * @param {Omit<Recipe, 'expected'>} recipe
 * @returns {Replay}
 */
export function replayRecipe(recipe) {
  const board = boardFromRows(recipe.boardRows);
  const execution = newExecution();
  const { result } = firstSetAttempt({
    board, rotation: recipe.rotation, levelId: recipe.levelId, seedText: recipe.seedText, uniqueness: recipe.uniqueness, execution,
  });
  if (result === null) {
    throw new Error(`no piece set found for seed ${recipe.seedText}`);
  }
  /** @type {BatchContext} */
  const ctx = {
    set: result.set,
    targetLevelId: recipe.levelId,
    quantity: recipe.quantity,
    batchSeed: recipe.batchSeed,
    uniqueness: recipe.uniqueness,
    seenLayouts: new Set(),
    seenClues: new Set(),
    calibration: result.calibration,
    execution,
  };
  return { set: result.set, setAttempt: result.attempt, ctx, fold: runFold(ctx) };
}

/**
 * @param {Omit<Recipe, 'expected'>} recipe
 * @param {Replay} replay
 * @returns {Recipe['expected']}
 */
export function expectedOf(recipe, replay) {
  const { pieces } = replay.set;
  return {
    pieceKeys: pieces.map((p) => canonicalKey(p.cells)),
    layoutKeys: replay.fold.accepted.map((c) => c.layoutKey),
    clueKeys: replay.fold.accepted.map((c) => c.clueKey),
    scores: replay.fold.accepted.map((c) => c.rating.score),
  };
}

/**
 * Easy, Normal and Hard clue subsets taken from three different layouts of the
 * batch, each selected for exactly its own band.
 * @param {Omit<Recipe, 'expected'>} recipe
 * @param {Replay} replay
 * @returns {Pack | null} null when some level finds no unused layout.
 */
export function buildSample(recipe, replay) {
  const { set, ctx, fold } = replay;
  const { board, pieces } = set;
  const witness = /** @type {Pose[]} */ (set.witness);
  const usedLayouts = new Set();
  const usedClues = new Set();
  const puzzles = [];
  for (const levelId of SAMPLE_LEVELS) {
    let found = null;
    for (let i = 0; i < fold.accepted.length && found === null; i += 1) {
      const candidate = fold.accepted[i];
      if (usedLayouts.has(candidate.layoutKey)) {
        continue;
      }
      const sel = selectClues({
        board,
        pieces,
        layout: candidate.layout,
        target: level(levelId),
        rng: createRng(recipe.seedText, `sample/${levelId}/${i}`),
        uniqueness: 'any',
        excludeClueKeys: usedClues,
        ws: ctx.execution.main,
      });
      if (sel.ok) {
        found = { candidate, sel };
      }
    }
    if (found === null) {
      return null;
    }
    usedLayouts.add(found.candidate.layoutKey);
    usedClues.add(clueKey(board, pieces, found.sel.clues));
    puzzles.push({
      id: puzzleId(board, pieces, found.sel.clues),
      title: level(levelId).label,
      clues: found.sel.clues,
      solution: found.candidate.layout,
      rating: found.sel.rating,
    });
  }
  return {
    format: 'pentomino-pack',
    version: 1,
    kind: 'puzzle-pack',
    rules: 'free-polyomino-v1',
    board: { rows: boardToRows(board) },
    presentation: { rotation: 0 },
    pieces,
    witness,
    puzzles,
    generation: {
      app: `pentomino-generator/${APP_VERSION}`,
      algo: ALGO_ID,
      policy: POLICY_ID,
      rng: RNG_ID,
      seedScheme: SEED_SCHEME,
      setSeed: recipe.seedText,
    },
  };
}

/**
 * The fresh rating of sample puzzle `i`: `difficulty-v2` for a puzzle that claims it (the Player sample), `rate`
 * otherwise. A capped puzzle is unrateable and stops the tool with its index.
 * @param {number} i
 * @param {import('../core/engine/types.js').Board} board
 * @param {import('../core/engine/types.js').Piece[]} pieces
 * @param {Pack['puzzles'][number]} puzzle
 * @param {import('../core/engine/types.js').Workspace} ws
 */
function rateFresh(i, board, pieces, puzzle, ws) {
  if (puzzle.rating?.model === 'difficulty-v2') {
    return rateV2(board, pieces, puzzle.clues, ws);
  }
  try {
    return rate(board, pieces, puzzle.clues, ws);
  } catch (e) {
    if (e instanceof IncompleteRatingError) {
      throw new Error(`puzzle ${i}: unrateable, the deduction path was capped (${e.counters.stop})`, { cause: e });
    }
    throw e;
  }
}

/**
 * Independent verification of a sample pack: valid canonical solutions on three
 * distinct layouts and clue keys, clues taken from their solution, and a fresh
 * rating that matches the stored one and the Easy/Normal/Hard title.
 * @param {Pack} pack
 * @returns {string[]} Problems; empty when the pack verifies.
 */
export function verifySample(pack) {
  /** @type {string[]} */
  const problems = [];
  const board = boardFromRows(pack.board.rows);
  const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
  const layouts = new Set();
  const clues = new Set();
  if (pack.puzzles.length !== SAMPLE_LEVELS.length) {
    problems.push(`expected ${SAMPLE_LEVELS.length} puzzles, found ${pack.puzzles.length}`);
  }
  pack.puzzles.forEach((puzzle, i) => {
    const want = SAMPLE_LEVELS[i];
    const solution = puzzle.solution ?? [];
    if (puzzle.title !== level(want).label) {
      problems.push(`puzzle ${i}: title ${puzzle.title} is not ${level(want).label}`);
    }
    if (puzzle.certificate !== undefined) {
      problems.push(`puzzle ${i}: must not claim a certificate`);
    }
    if (!isValidLayout(board, pack.pieces, solution)) {
      problems.push(`puzzle ${i}: invalid solution`);
      return;
    }
    const byPiece = new Map(solution.map((p) => [p.piece, p]));
    if (!puzzle.clues.every((c) => JSON.stringify(byPiece.get(c.piece)) === JSON.stringify(c))) {
      problems.push(`puzzle ${i}: a clue is not a pose of the solution`);
    }
    layouts.add(layoutKey(board, pack.pieces, solution));
    clues.add(clueKey(board, pack.pieces, puzzle.clues));
    const fresh = rateFresh(i, board, pack.pieces, puzzle, ws);
    if (fresh.level !== want || JSON.stringify(fresh) !== JSON.stringify(puzzle.rating)) {
      problems.push(`puzzle ${i}: stored rating differs from a fresh ${want} rating`);
    }
    if (puzzle.id !== puzzleId(board, pack.pieces, puzzle.clues)) {
      problems.push(`puzzle ${i}: id does not match its clues`);
    }
  });
  if (layouts.size !== pack.puzzles.length || clues.size !== pack.puzzles.length) {
    problems.push('layout keys and clue keys must be pairwise distinct');
  }
  return problems;
}

/**
 * First `fixture-set-N` (N = 0..49) whose first batch is a complete hard batch
 * and whose sample pack can be built and verified.
 * @returns {{ recipe: Recipe, sample: Pack }}
 */
export function searchRecipe() {
  for (let n = 0; n < SEED_COUNT; n += 1) {
    const seedText = `fixture-set-${n}`;
    const base = /** @type {Omit<Recipe, 'expected'>} */ ({
      version: 1,
      boardRows: [...BOARD_ROWS],
      rotation: 0,
      levelId: 'hard',
      quantity: 10,
      seedText,
      batchIndex: 1,
      batchSeed: `${seedText}#1`,
      uniqueness: 'any',
      versions: currentVersions(),
    });
    let replay;
    try {
      replay = replayRecipe(base);
    } catch {
      continue;
    }
    if (replay.fold.status !== 'complete') {
      continue;
    }
    const sample = buildSample(base, replay);
    if (sample !== null && verifySample(sample).length === 0) {
      return { recipe: { ...base, expected: expectedOf(base, replay) }, sample };
    }
  }
  throw new Error(`no fixture-set seed in 0..${SEED_COUNT - 1} produced ten Hard puzzles and a sample pack`);
}

/**
 * @param {unknown} value
 * @returns {string} Two-space JSON, CRLF, final newline.
 */
function toFileText(value) {
  return `${JSON.stringify(value, null, 2).replace(/\n/g, '\r\n')}\r\n`;
}

/**
 * Replays the recorded recipe and compares it and the sample with the files.
 * @param {string} dir
 * @returns {string[]} Differences; empty when everything replays identically.
 */
export function checkFixtures(dir) {
  /** @type {string[]} */
  const problems = [];
  /** @type {Recipe} */
  const recipe = JSON.parse(readFileSync(resolve(dir, FIXTURE_FILES.recipe), 'utf8'));
  /** @type {Pack} */
  const sample = JSON.parse(readFileSync(resolve(dir, FIXTURE_FILES.sample), 'utf8'));
  if (recipe.batchSeed !== `${recipe.seedText}#${recipe.batchIndex}` || recipe.batchIndex !== 1) {
    problems.push('batchSeed must equal seedText + "#1"');
  }
  if (JSON.stringify(recipe.versions) !== JSON.stringify(currentVersions())) {
    problems.push('recorded versions differ from the current algo/policy/rng/model ids (approved change needs --replace)');
  }
  const replay = replayRecipe(recipe);
  if (replay.fold.status !== 'complete' || replay.fold.accepted.length !== recipe.quantity) {
    problems.push(`replay is ${replay.fold.status} with ${replay.fold.accepted.length} puzzles`);
  }
  if (JSON.stringify(expectedOf(recipe, replay)) !== JSON.stringify(recipe.expected)) {
    problems.push('replayed pieceKeys/layoutKeys/clueKeys/scores differ from the recipe');
  }
  const rebuilt = buildSample(recipe, replay);
  if (rebuilt === null || JSON.stringify(rebuilt) !== JSON.stringify(sample)) {
    problems.push('rebuilt sample pack differs from the file');
  }
  problems.push(...verifySample(sample));
  return problems;
}

/**
 * @typedef {object} ReplayRecipe
 * @property {string[]} boardRows
 * @property {0} rotation
 * @property {'hard'} levelId
 * @property {'require'} uniqueness
 * @property {number} quantity
 * @property {string} seedText
 */

/**
 * @typedef {object} ReplayFile
 * @property {1} version
 * @property {ReplayRecipe} recipe
 * @property {Recipe['versions']} versions
 * @property {Pack[]} packs Batch 1 (it reuses the set's calibration puzzle) and batch 2.
 */

/**
 * @param {number} n
 * @returns {ReplayRecipe}
 */
function replayRecipeOf(n) {
  return {
    boardRows: [...BOARD_ROWS], rotation: 0, levelId: 'hard', uniqueness: 'require', quantity: 4, seedText: `replay-case-${n}`,
  };
}

/**
 * @param {Record<string, import('../core/engine/types.js').Made>} made
 * @returns {boolean} Whether a candidate record names at least one subset skip (an `overflow` record names none).
 */
function hasSubsetSkip(made) {
  return Object.values(made).some((m) => m.kind === 'candidate' && m.skips !== 'overflow' && m.skips.subsets.length > 0);
}

/**
 * One line per pack: the record kinds of its puzzles, with the skip counts of a candidate.
 * @param {Record<string, import('../core/engine/types.js').Made>[]} records
 * @returns {string[]}
 */
function describeRecords(records) {
  return records.map((made, i) => {
    const kinds = Object.values(made).map((m) => {
      if (m.kind !== 'candidate') {
        return m.kind;
      }
      return m.skips === 'overflow' ? 'candidate (skips overflow)' : `candidate (subsets ${m.skips.subsets.length}, repairs ${m.skips.repairs.length})`;
    });
    return `  pack ${i + 1}: ${kinds.join(', ')}`;
  });
}

/**
 * Generates replay seed `n` once through the ordinary client path: the set, batch 1 (which must reuse the calibration
 * puzzle) and batch 2, all complete.
 * @param {import('../core/browser/generation-client.js').GenerationClient} client
 * @param {number} n
 * @returns {Promise<{ file: ReplayFile, subsetSkip: boolean, records: Record<string, import('../core/engine/types.js').Made>[] } | { failed: string }>}
 */
async function generateReplaySeed(client, n) {
  const recipe = replayRecipeOf(n);
  const { boardRows, rotation, levelId, uniqueness, quantity, seedText } = recipe;
  try {
    const set = await client.generateSet({ boardRows, rotation, levelId, seedText, uniqueness, maxActive: 676 });
    if (set.status !== 'complete' || set.set === undefined || set.calibration === undefined || set.setOrigin === undefined) {
      return { failed: `the set is ${set.status}${set.reason === undefined ? '' : ` (${set.reason})`}` };
    }
    const input = {
      set: set.set,
      rotation,
      targetLevelId: levelId,
      quantity,
      setSeed: seedText,
      uniqueness,
      setLevel: levelId,
      setAttempt: set.attempt,
      setOrigin: set.setOrigin,
    };
    const b1 = await client.generateBatch({ ...input, batchIndex: 1, seenLayouts: [], seenClues: [], calibration: set.calibration });
    if (b1.status !== 'complete' || b1.pack === undefined) {
      return { failed: `batch 1 is ${b1.status}${b1.reason === undefined ? '' : ` (${b1.reason})`}` };
    }
    if (b1.made[b1.accepted[0].id]?.kind !== 'calibration') {
      return { failed: 'batch 1 does not start with the reused calibration puzzle' };
    }
    const b2 = await client.generateBatch({ ...input, batchIndex: 2, seenLayouts: b1.seenLayouts, seenClues: b1.seenClues });
    if (b2.status !== 'complete' || b2.pack === undefined) {
      return { failed: `batch 2 is ${b2.status}${b2.reason === undefined ? '' : ` (${b2.reason})`}` };
    }
    return {
      file: { version: 1, recipe, versions: currentVersions(), packs: [b1.pack, b2.pack] },
      subsetSkip: hasSubsetSkip(b1.made) || hasSubsetSkip(b2.made),
      records: [b1.made, b2.made],
    };
  } catch (e) {
    return { failed: e instanceof Error ? `${e.name}: ${e.message}`.replace(/\s+/g, ' ').slice(0, 200) : 'unknown error' };
  }
}

/**
 * Runs `fn` with a one-worker client whose metadata clock is fixed, and closes the pool afterwards.
 * @template T
 * @param {(client: import('../core/browser/generation-client.js').GenerationClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withReplayClient(fn) {
  const pool = createPool({ size: 1, workerFactory: nodeWorkerFactory() });
  try {
    return await fn(createGenerationClient(pool, { createdAt: () => REPLAY_CREATED_AT }));
  } finally {
    pool.close();
  }
}

/**
 * The bounded, resumable search: prints one line per seed and writes nothing. Selection of the seed is the caller's.
 * @param {number} from First seed.
 * @returns {Promise<number>} Exit code: 0 after a seed qualifies or after seed 49, 1 at the time bound.
 */
async function searchReplayCase(from) {
  const started = Date.now();
  return withReplayClient(async (client) => {
    for (let n = from; n < SEED_COUNT; n += 1) {
      if (Date.now() - started >= REPLAY_SEARCH_BOUND_MS) {
        console.log(`stopped at the ${REPLAY_SEARCH_BOUND_MS / 1000} s bound; continue with --from ${n}`);
        return 1;
      }
      const seedStarted = Date.now();
      const r = await generateReplaySeed(client, n);
      const subsetSkip = 'file' in r && r.subsetSkip;
      console.log(`replay-case-${n}: ${'file' in r ? 'ok' : `failed ${r.failed}`}, subset skip ${subsetSkip ? 'yes' : 'no'}, ${Date.now() - seedStarted} ms`);
      if (subsetSkip) {
        console.log(`selected replay-case-${n}`);
        return 0;
      }
    }
    console.log('no seed with a subset skip');
    return 0;
  });
}

/**
 * Regenerates the recorded seed and compares the whole file text.
 * @param {string} path
 * @returns {Promise<string[]>} Differences; empty when the file replays identically.
 */
async function checkReplayCase(path) {
  if (!existsSync(path)) {
    return [`${REPLAY_FILE}: file missing (record it with --replay-case --search, then --create --seed <n>)`];
  }
  const text = readFileSync(path, 'utf8');
  /** @type {any} */
  let recorded;
  try {
    recorded = JSON.parse(text);
  } catch {
    return [`${REPLAY_FILE} is not valid JSON`];
  }
  const match = /^replay-case-(\d+)$/.exec(String(recorded?.recipe?.seedText));
  const n = match === null ? NaN : Number(match[1]);
  if (!Number.isInteger(n) || n >= SEED_COUNT) {
    return [`${REPLAY_FILE}: recipe.seedText is not replay-case-0 ... replay-case-${SEED_COUNT - 1}`];
  }
  /** @type {string[]} */
  const problems = [];
  if (JSON.stringify(recorded.versions) !== JSON.stringify(currentVersions())) {
    problems.push('recorded versions differ from the current algo/policy/rng/model ids (approved change needs --replace)');
  }
  const r = await withReplayClient((client) => generateReplaySeed(client, n));
  if (!('file' in r)) {
    return [...problems, `replay-case-${n} no longer meets the conditions: ${r.failed}`];
  }
  const rebuilt = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (r.file));
  for (const key of ['recipe', 'versions']) {
    if (JSON.stringify(rebuilt[key]) !== JSON.stringify(recorded[key])) {
      problems.push(`replayed ${key} differs from the file`);
    }
  }
  r.file.packs.forEach((pack, i) => {
    if (JSON.stringify(pack) !== JSON.stringify(recorded.packs?.[i])) {
      problems.push(`replayed pack ${i + 1} differs from the file`);
    }
  });
  // Git stores the file with LF and a checkout may give LF or CRLF, so the line ends are not compared.
  if (problems.length === 0 && toFileText(r.file).replace(/\r\n/g, '\n') !== text.replace(/\r\n/g, '\n')) {
    problems.push(`${REPLAY_FILE} text differs from the replay (formatting)`);
  }
  return problems;
}

/**
 * @param {string[]} argv
 * @param {string} name
 * @returns {number | undefined | null} The option's integer 0 ... 49; undefined when absent; null when invalid.
 */
function seedOption(argv, name) {
  const at = argv.indexOf(name);
  if (at < 0) {
    return undefined;
  }
  const text = argv[at + 1];
  const value = text !== undefined && /^\d{1,2}$/.test(text) ? Number(text) : NaN;
  return value < SEED_COUNT ? value : null;
}

/**
 * The `--replay-case` modes (gate GF-P4).
 * @param {string[]} argv
 * @param {string} dir
 * @returns {Promise<number>} Exit code: 0 success, 1 refused or differs, 2 usage.
 */
async function replayMain(argv, dir) {
  const usage = 'usage: record-fixtures.mjs --replay-case --search [--from <n>] | --create --seed <n> | --check'
    + ' | --replace --seed <n> --reason <text> [--dir <path>]   (n: 0 ... 49)';
  const modes = ['--search', '--create', '--check', '--replace'].filter((m) => argv.includes(m));
  const seed = seedOption(argv, '--seed');
  const from = seedOption(argv, '--from');
  const reasonAt = argv.indexOf('--reason');
  const reason = reasonAt >= 0 ? argv[reasonAt + 1] : undefined;
  const writes = modes[0] === '--create' || modes[0] === '--replace';
  if (modes.length !== 1 || seed === null || from === null || (writes ? seed === undefined : seed !== undefined)
    || (modes[0] !== '--search' && from !== undefined)) {
    console.error(usage);
    return 2;
  }
  if (modes[0] === '--replace' && (reason === undefined || reason.trim() === '')) {
    console.error('record-fixtures: --replace needs --reason "<approved semantic/version change>"');
    return 2;
  }
  const path = resolve(dir, REPLAY_FILE);
  if (modes[0] === '--search') {
    return searchReplayCase(from ?? 0);
  }
  if (modes[0] === '--check') {
    const problems = await checkReplayCase(path);
    if (problems.length > 0) {
      console.error(problems.join('\n'));
      return 1;
    }
    console.log('record-fixtures: replay case OK');
    return 0;
  }
  if (modes[0] === '--create' && existsSync(path)) {
    console.error(`record-fixtures: ${REPLAY_FILE} already exists; --create never overwrites (use --replace for an approved change)`);
    return 1;
  }
  const n = /** @type {number} */ (seed);
  const r = await withReplayClient((client) => generateReplaySeed(client, n));
  if (!('file' in r)) {
    console.error(`record-fixtures: replay-case-${n} does not meet the conditions: ${r.failed}`);
    return 1;
  }
  writeFileSync(path, toFileText(r.file));
  console.log(`record-fixtures: wrote replay-case-${n} (${path}); subset skip ${r.subsetSkip ? 'yes' : 'no'}`);
  console.log(describeRecords(r.records).join('\n'));
  return 0;
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>} Exit code.
 */
export async function main(argv) {
  const dirAt = argv.indexOf('--dir');
  const dir = dirAt >= 0 && argv[dirAt + 1] !== undefined ? resolve(argv[dirAt + 1]) : DEFAULT_DIR;
  const reasonAt = argv.indexOf('--reason');
  const reason = reasonAt >= 0 ? argv[reasonAt + 1] : undefined;
  if (argv.includes('--replay-case')) {
    return replayMain(argv, dir);
  }
  const modes = ['--create', '--check', '--replace'].filter((m) => argv.includes(m));
  if (modes.length !== 1 || ['--search', '--seed', '--from'].some((flag) => argv.includes(flag))) {
    console.error('usage: record-fixtures.mjs --create | --check | --replace --reason <text> [--dir <path>]\n'
      + '       record-fixtures.mjs --replay-case --search [--from <n>] | --create --seed <n> | --check'
      + ' | --replace --seed <n> --reason <text> [--dir <path>]');
    return 2;
  }
  const paths = [FIXTURE_FILES.recipe, FIXTURE_FILES.sample].map((name) => resolve(dir, name));
  if (modes[0] === '--check') {
    const problems = checkFixtures(dir);
    if (problems.length > 0) {
      console.error(problems.join('\n'));
      return 1;
    }
    console.log('record-fixtures: OK');
    return 0;
  }
  if (modes[0] === '--create' && paths.some((p) => existsSync(p))) {
    console.error('record-fixtures: fixtures already exist; --create never overwrites (use --replace for an approved change)');
    return 1;
  }
  if (modes[0] === '--replace' && (reason === undefined || reason.trim() === '')) {
    console.error('record-fixtures: --replace needs --reason "<approved semantic/version change>"');
    return 2;
  }
  const { recipe, sample } = searchRecipe();
  writeFileSync(paths[0], toFileText(recipe));
  writeFileSync(paths[1], toFileText(sample));
  console.log(`record-fixtures: wrote ${recipe.seedText} (${paths.join(', ')})`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
