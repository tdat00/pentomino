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
//   node tools/record-fixtures.mjs --replay-case --refusal               the old replay-case.json is refused by version
//
// The seeds are `replay-case-0..49`; `--seed` and `--from` take an integer from 0 to 49.
// `--recipe hard|screen` (default hard) picks the recipe: `screen` is a 14 x 14 Nightmare `any` set whose steps show the
// screen (seeds `replay-case-screen-0..49`) and needs the gen-v4 family. `--file <name>` picks the file inside `--dir`;
// the default is replay-case-v4.json (hard, gen-v4 family), replay-case.json (hard, before it) and
// replay-case-v4-screen.json (screen). `--refusal` always reads replay-case.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { createGenerationClient } from '../core/browser/generation-client.js';
import { createPool } from '../core/browser/worker-pool.js';
import { boardFromRows, boardToRows } from '../core/engine/board.js';
import { selectClues } from '../core/engine/clues.js';
import { IncompleteRatingError, MODEL, rate, rateV2 } from '../core/engine/difficulty.js';
import { firstSetAttempt, provenanceVersions, runFold } from '../core/engine/generate.js';
import { canonicalKey } from '../core/engine/geometry.js';
import { isV4Family, PRIOR_TABLE_ID, SCREEN_TABLE_ID } from '../core/engine/gen-v4.js';
import { clueKey, layoutKey, puzzleId } from '../core/engine/keys.js';
import { level } from '../core/engine/levels.js';
import { parsePack, serializePack } from '../core/engine/pack.js';
import { POLICY_ID } from '../core/engine/policy.js';
import { replayPuzzle, sameVersions } from '../core/engine/replay.js';
import { createRng, RNG_ID, SEED_SCHEME } from '../core/engine/rng.js';
import { isValidLayout } from '../core/engine/tiling.js';
import { ALGO_ID, APP_VERSION } from '../core/engine/version.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { rectRows } from './bench/calibration-reference.js';
import { nodeWorkerFactory } from './node-worker.mjs';

/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').Pack} Pack */
/** @typedef {import('../core/engine/types.js').BatchContext} BatchContext */
/** @typedef {import('../core/engine/generate.js').FoldState} FoldState */

export const BOARD_ROWS = Object.freeze(Array(6).fill('#'.repeat(10)));
export const SEED_COUNT = 50;
export const SAMPLE_LEVELS = /** @type {const} */ (['easy', 'normal', 'hard']);
const FIXTURE_FILES = /** @type {const} */ ({ recipe: 'generation-case.json', sample: 'generated-sample-pack.json' });
// The old (gen-v3) replay case: the default file before the gen-v4 family, and the file of the refusal check.
const REPLAY_FILE = 'replay-case.json';
const REPLAY_FILE_V4 = 'replay-case-v4.json';
const REPLAY_FILE_V4_SCREEN = 'replay-case-v4-screen.json';
const REPLAY_RECIPES = /** @type {const} */ (['hard', 'screen']);
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
 * @property {{ algo: string, policy: string, rng: string, model: string, priorTable?: string, screenTable?: string }} versions
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
  const versions = { algo: ALGO_ID, policy: POLICY_ID, rng: RNG_ID, model: MODEL };
  return isV4Family(ALGO_ID) ? { ...versions, priorTable: PRIOR_TABLE_ID, screenTable: SCREEN_TABLE_ID } : versions;
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
 * @property {'hard' | 'nightmare'} levelId
 * @property {'require' | 'any'} uniqueness
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

/** @typedef {typeof REPLAY_RECIPES[number]} ReplayRecipeName */

/**
 * @param {number} n
 * @param {ReplayRecipeName} [recipe] `hard` (default) or `screen`: a 14 x 14 Nightmare set whose replayed steps show the
 *   screen.
 * @returns {ReplayRecipe}
 */
function replayRecipeOf(n, recipe = 'hard') {
  if (recipe === 'screen') {
    return { boardRows: rectRows(14, 14), rotation: 0, levelId: 'nightmare', uniqueness: 'any', quantity: 4, seedText: `${replaySeedPrefix(recipe)}${n}` };
  }
  return {
    boardRows: [...BOARD_ROWS], rotation: 0, levelId: 'hard', uniqueness: 'require', quantity: 4, seedText: `${replaySeedPrefix(recipe)}${n}`,
  };
}

/**
 * @param {ReplayRecipeName} recipe
 * @returns {string} The seed text without its number.
 */
function replaySeedPrefix(recipe) {
  return recipe === 'screen' ? 'replay-case-screen-' : 'replay-case-';
}

/**
 * @param {ReplayRecipeName} recipe
 * @returns {string} What the recipe's search looks for, as the printed notes say it.
 */
function qualifierName(recipe) {
  return recipe === 'screen' ? 'screen steps' : 'subset skip';
}

/**
 * @param {Record<string, import('../core/engine/types.js').Made>} made
 * @returns {boolean} Whether a candidate record names at least one subset skip (an `overflow` record names none).
 */
function hasSubsetSkip(made) {
  return Object.values(made).some((m) => m.kind === 'candidate' && m.skips !== 'overflow' && m.skips.subsets.length > 0);
}

/**
 * The screen condition: the replays of the candidate puzzles of the packs hold a rated step of the locate phase and an
 * unrateable step that was screen-capped.
 * @param {import('../core/browser/generation-client.js').GenerationClient} client
 * @param {import('../core/engine/types.js').PieceSet} set
 * @param {import('../core/engine/types.js').SetOrigin} setOrigin
 * @param {{ pack: Pack, made: Record<string, import('../core/engine/types.js').Made> }[]} batches
 * @returns {Promise<boolean>}
 */
async function hasScreenSteps(client, set, setOrigin, batches) {
  let locate = false;
  let capped = false;
  for (const { pack, made } of batches) {
    for (const puzzle of pack.puzzles) {
      const record = made[puzzle.id];
      if (record?.kind !== 'candidate') {
        continue;
      }
      const { steps } = await client.replayPuzzle({ set, puzzle: /** @type {any} */ (puzzle), setOrigin, made: record });
      for (const step of steps) {
        locate = locate || (step.kind === 'rated' && step.args.phase === 'locate');
        capped = capped || (step.kind === 'unrateable' && step.args.reason === 'screen-capped');
      }
      if (locate && capped) {
        return true;
      }
    }
  }
  return false;
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
 * puzzle) and batch 2, all complete. The screen recipe also needs the screen steps in the replays of its candidates.
 * @param {import('../core/browser/generation-client.js').GenerationClient} client
 * @param {number} n
 * @param {ReplayRecipeName} [recipeName]
 * @returns {Promise<{ file: ReplayFile, qualifies: boolean, records: Record<string, import('../core/engine/types.js').Made>[] } | { failed: string }>}
 */
async function generateReplaySeed(client, n, recipeName = 'hard') {
  const recipe = replayRecipeOf(n, recipeName);
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
    const batches = [{ pack: b1.pack, made: b1.made }, { pack: b2.pack, made: b2.made }];
    if (recipeName === 'screen' && !(await hasScreenSteps(client, set.set, set.setOrigin, batches))) {
      return { failed: 'no locate and screen-capped steps' };
    }
    return {
      file: { version: 1, recipe, versions: currentVersions(), packs: [b1.pack, b2.pack] },
      qualifies: recipeName === 'screen' || hasSubsetSkip(b1.made) || hasSubsetSkip(b2.made),
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
 * @param {ReplayRecipeName} recipe
 * @returns {Promise<number>} Exit code: 0 after a seed qualifies or after seed 49, 1 at the time bound.
 */
async function searchReplayCase(from, recipe) {
  const started = Date.now();
  const what = qualifierName(recipe);
  return withReplayClient(async (client) => {
    for (let n = from; n < SEED_COUNT; n += 1) {
      if (Date.now() - started >= REPLAY_SEARCH_BOUND_MS) {
        console.log(`stopped at the ${REPLAY_SEARCH_BOUND_MS / 1000} s bound; continue with --from ${n}`);
        return 1;
      }
      const seedStarted = Date.now();
      const r = await generateReplaySeed(client, n, recipe);
      const qualifies = 'file' in r && r.qualifies;
      console.log(`${replaySeedPrefix(recipe)}${n}: ${'file' in r ? 'ok' : `failed ${r.failed}`}, ${what} ${qualifies ? 'yes' : 'no'}, ${Date.now() - seedStarted} ms`);
      if (qualifies) {
        console.log(`selected ${replaySeedPrefix(recipe)}${n}`);
        return 0;
      }
    }
    console.log(`no seed with ${recipe === 'screen' ? 'screen steps' : 'a subset skip'}`);
    return 0;
  });
}

/**
 * Regenerates the recorded seed and compares the whole file text.
 * @param {string} path
 * @param {ReplayRecipeName} recipe
 * @returns {Promise<string[]>} Differences; empty when the file replays identically.
 */
async function checkReplayCase(path, recipe) {
  const name = basename(path);
  if (!existsSync(path)) {
    return [`${name}: file missing (record it with --replay-case --search, then --create --seed <n>)`];
  }
  const text = readFileSync(path, 'utf8');
  /** @type {any} */
  let recorded;
  try {
    recorded = JSON.parse(text);
  } catch {
    return [`${name} is not valid JSON`];
  }
  const prefix = replaySeedPrefix(recipe);
  const seedText = String(recorded?.recipe?.seedText);
  const match = seedText.startsWith(prefix) ? /^\d+$/.exec(seedText.slice(prefix.length)) : null;
  const n = match === null ? NaN : Number(match[0]);
  if (!Number.isInteger(n) || n >= SEED_COUNT) {
    return [`${name}: recipe.seedText is not ${prefix}0 ... ${prefix}${SEED_COUNT - 1}`];
  }
  /** @type {string[]} */
  const problems = [];
  if (JSON.stringify(recorded.versions) !== JSON.stringify(currentVersions())) {
    problems.push('recorded versions differ from the current algo/policy/rng/model ids (approved change needs --replace)');
  }
  const r = await withReplayClient((client) => generateReplaySeed(client, n, recipe));
  if (!('file' in r)) {
    return [...problems, `${prefix}${n} no longer meets the conditions: ${r.failed}`];
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
    problems.push(`${name} text differs from the replay (formatting)`);
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
 * The refusal check, apart from any regeneration: the old `replay-case.json` still parses, serializes back with its
 * `generation` fields unchanged, and (once the running versions are not the file's) every puzzle of it is refused by
 * version.
 * @param {string} dir
 * @returns {{ problems: string[], skipped: boolean }}
 */
function checkRefusal(dir) {
  const path = resolve(dir, REPLAY_FILE);
  if (!existsSync(path)) {
    return { problems: [`${REPLAY_FILE}: file missing`], skipped: false };
  }
  /** @type {any} */
  let recorded;
  try {
    recorded = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { problems: [`${REPLAY_FILE} is not valid JSON`], skipped: false };
  }
  if (!Array.isArray(recorded?.packs) || recorded.packs.length === 0) {
    return { problems: [`${REPLAY_FILE}: no packs`], skipped: false };
  }
  /** @type {string[]} */
  const problems = [];
  /** @type {Pack[]} */
  const packs = [];
  recorded.packs.forEach((/** @type {unknown} */ raw, /** @type {number} */ i) => {
    const parsed = parsePack(JSON.stringify(raw));
    if (!parsed.ok) {
      problems.push(`pack ${i + 1} does not parse: ${parsed.issues.map((issue) => `${issue.path} ${issue.code}`).join(', ')}`);
      return;
    }
    packs.push(parsed.value);
    const written = JSON.parse(serializePack(parsed.value));
    if (!isDeepStrictEqual(written.generation, /** @type {any} */ (raw).generation)) {
      problems.push(`pack ${i + 1} does not serialize back with its generation provenance unchanged`);
    }
  });
  const running = provenanceVersions();
  const same = recorded.packs.every((/** @type {any} */ raw) => sameVersions(raw?.generation?.setOrigin?.versions ?? {}, running));
  if (problems.length > 0 || same) {
    return { problems, skipped: problems.length === 0 };
  }
  const workspaces = { ws: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
  packs.forEach((pack, i) => {
    const set = { board: boardFromRows(pack.board.rows), pieces: pack.pieces, witness: pack.witness ?? null, carving: pack.generation?.carving, macroRegion: pack.generation?.macroRegion };
    for (const puzzle of pack.puzzles) {
      const result = replayPuzzle({ set: /** @type {any} */ (set), puzzle, generation: pack.generation }, workspaces);
      if (result.status !== 'unavailable' || result.reason !== 'set-versions') {
        problems.push(`pack ${i + 1}, puzzle ${puzzle.id}: replay is ${result.status}${result.reason === null ? '' : ` (${result.reason})`}, not unavailable (set-versions)`);
      }
    }
  });
  return { problems, skipped: false };
}

/**
 * @param {string[]} argv
 * @param {string} name
 * @returns {string | undefined | null} The option's value; undefined when absent; null when it has none.
 */
function valueOption(argv, name) {
  const at = argv.indexOf(name);
  if (at < 0) {
    return undefined;
  }
  const text = argv[at + 1];
  return text === undefined || text.startsWith('--') ? null : text;
}

/**
 * The `--replay-case` modes (gate GF-P4).
 * @param {string[]} argv
 * @param {string} dir
 * @returns {Promise<number>} Exit code: 0 success, 1 refused or differs, 2 usage.
 */
async function replayMain(argv, dir) {
  const usage = 'usage: record-fixtures.mjs --replay-case --search [--from <n>] | --create --seed <n> | --check'
    + ' | --replace --seed <n> --reason <text> | --refusal [--recipe hard|screen] [--file <name>] [--dir <path>]   (n: 0 ... 49)';
  const modes = ['--search', '--create', '--check', '--replace', '--refusal'].filter((m) => argv.includes(m));
  const seed = seedOption(argv, '--seed');
  const from = seedOption(argv, '--from');
  const recipeText = valueOption(argv, '--recipe');
  const fileText = valueOption(argv, '--file');
  const reasonAt = argv.indexOf('--reason');
  const reason = reasonAt >= 0 ? argv[reasonAt + 1] : undefined;
  const writes = modes[0] === '--create' || modes[0] === '--replace';
  const recipe = /** @type {ReplayRecipeName | undefined} */ (REPLAY_RECIPES.find((r) => r === (recipeText ?? 'hard')));
  if (modes.length !== 1 || seed === null || from === null || (writes ? seed === undefined : seed !== undefined)
    || (modes[0] !== '--search' && from !== undefined) || recipe === undefined
    || fileText === null || (fileText !== undefined && (fileText === '' || basename(fileText) !== fileText))) {
    console.error(usage);
    return 2;
  }
  if (modes[0] === '--replace' && (reason === undefined || reason.trim() === '')) {
    console.error('record-fixtures: --replace needs --reason "<approved semantic/version change>"');
    return 2;
  }
  if (modes[0] === '--refusal') {
    const { problems, skipped } = checkRefusal(dir);
    if (problems.length > 0) {
      console.error(problems.join('\n'));
      return 1;
    }
    console.log(skipped
      ? 'record-fixtures: refusal case skipped (the running versions are the file\'s)'
      : 'record-fixtures: refusal case OK');
    return 0;
  }
  if (recipe === 'screen' && !isV4Family(ALGO_ID)) {
    console.error('record-fixtures: the screen recipe needs the gen-v4 family');
    return 2;
  }
  const defaultFile = recipe === 'screen' ? REPLAY_FILE_V4_SCREEN : isV4Family(ALGO_ID) ? REPLAY_FILE_V4 : REPLAY_FILE;
  const file = fileText ?? defaultFile;
  const path = resolve(dir, file);
  if (modes[0] === '--search') {
    return searchReplayCase(from ?? 0, recipe);
  }
  if (modes[0] === '--check') {
    const problems = await checkReplayCase(path, recipe);
    if (problems.length > 0) {
      console.error(problems.join('\n'));
      return 1;
    }
    console.log('record-fixtures: replay case OK');
    return 0;
  }
  if (modes[0] === '--create' && existsSync(path)) {
    console.error(`record-fixtures: ${file} already exists; --create never overwrites (use --replace for an approved change)`);
    return 1;
  }
  const n = /** @type {number} */ (seed);
  const r = await withReplayClient((client) => generateReplaySeed(client, n, recipe));
  if (!('file' in r)) {
    console.error(`record-fixtures: ${replaySeedPrefix(recipe)}${n} does not meet the conditions: ${r.failed}`);
    return 1;
  }
  writeFileSync(path, toFileText(r.file));
  console.log(`record-fixtures: wrote ${replaySeedPrefix(recipe)}${n} (${path}); ${qualifierName(recipe)} ${r.qualifies ? 'yes' : 'no'}`);
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
      + ' | --replace --seed <n> --reason <text> | --refusal [--recipe hard|screen] [--file <name>] [--dir <path>]');
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
