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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { boardFromRows, boardToRows } from '../core/engine/board.js';
import { selectClues } from '../core/engine/clues.js';
import { MODEL, rate } from '../core/engine/difficulty.js';
import { firstSetAttempt, runFold } from '../core/engine/generate.js';
import { canonicalKey } from '../core/engine/geometry.js';
import { clueKey, layoutKey, puzzleId } from '../core/engine/keys.js';
import { level } from '../core/engine/levels.js';
import { POLICY_ID } from '../core/engine/policy.js';
import { createRng, RNG_ID, SEED_SCHEME } from '../core/engine/rng.js';
import { isValidLayout } from '../core/engine/tiling.js';
import { ALGO_ID, APP_VERSION } from '../core/engine/version.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';

/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').Pack} Pack */
/** @typedef {import('../core/engine/types.js').BatchContext} BatchContext */
/** @typedef {import('../core/engine/generate.js').FoldState} FoldState */

export const BOARD_ROWS = Object.freeze(Array(6).fill('#'.repeat(10)));
export const SEED_COUNT = 50;
export const SAMPLE_LEVELS = /** @type {const} */ (['easy', 'normal', 'hard']);
const FIXTURE_FILES = /** @type {const} */ ({ recipe: 'generation-case.json', sample: 'generated-sample-pack.json' });
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
    const fresh = rate(board, pack.pieces, puzzle.clues, ws);
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
 * @param {string[]} argv
 * @returns {number} Exit code.
 */
export function main(argv) {
  const dirAt = argv.indexOf('--dir');
  const dir = dirAt >= 0 && argv[dirAt + 1] !== undefined ? resolve(argv[dirAt + 1]) : DEFAULT_DIR;
  const reasonAt = argv.indexOf('--reason');
  const reason = reasonAt >= 0 ? argv[reasonAt + 1] : undefined;
  const modes = ['--create', '--check', '--replace'].filter((m) => argv.includes(m));
  if (modes.length !== 1) {
    console.error('usage: record-fixtures.mjs --create | --check | --replace --reason <text> [--dir <path>]');
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
  process.exitCode = main(process.argv.slice(2));
}
