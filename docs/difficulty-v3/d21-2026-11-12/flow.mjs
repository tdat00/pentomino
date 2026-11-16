// D21 driver: the serial equivalent of "generate a piece set, then one batch" for one cell, run in the main
// thread so that the preload (register.mjs) sees every selectClues call. It calls the engine's own functions
// (setAttempt, foldStart, puzzleCandidate, foldAccept); only timing and event lines are added.
//   node --import ./docs/difficulty-v3/d21-2026-11-12/register.mjs ./docs/difficulty-v3/d21-2026-11-12/flow.mjs \
//     --recipe square-22x22-hell-3 --quantity 10
//   node ... flow.mjs --board 22x22 --level hell-1 --seed t18-big-a --quantity 5
// Environment: D21_OUT (jsonl file, required), D21_ROOT (tree to measure, default the working directory).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.env.D21_ROOT ?? '.');
const imp = (/** @type {string} */ p) => import(pathToFileURL(join(root, p)).href);
const { boardFromRows } = await imp('core/engine/board.js');
const { candidateContext, certifyTask, foldAccept, foldNext, foldStart, puzzleCandidate, setAttempt } = await imp('core/engine/generate.js');
const { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } = await imp('core/engine/workspace.js');

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
}
const rect = (/** @type {number} */ w, /** @type {number} */ h) => Array(h).fill('#'.repeat(w));

let boardRows;
let levelId;
let seedText;
let quantity = Number(args.get('quantity') ?? 5);
const recipeName = args.get('recipe');
if (recipeName !== undefined) {
  const file = join(root, 'tests', 'fixtures', 'ui-flow-recipes.json');
  const recipe = JSON.parse(readFileSync(file, 'utf8')).recipes.find((/** @type {any} */ r) => r.name === recipeName);
  ({ boardRows, levelId, seedText } = recipe);
  quantity = Number(args.get('quantity') ?? recipe.quantity);
} else {
  const [, w, h] = /^(\d+)x(\d+)$/.exec(args.get('board') ?? '') ?? [];
  boardRows = rect(Number(w), Number(h));
  levelId = args.get('level');
  seedText = args.get('seed');
}
const uniqueness = args.get('uniqueness') ?? 'any';
const label = args.get('label') ?? `${recipeName ?? `${args.get('board')}-${levelId}`}`;
const shortHash = (/** @type {string} */ text) => createHash('sha1').update(text).digest('hex').slice(0, 10);
const event = (/** @type {object} */ e) => globalThis.__d21Event({ label, ...e });

const board = boardFromRows(boardRows);
const execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
const startedAt = performance.now();
event({ ev: 'start', levelId, seedText, quantity, uniqueness, cols: boardRows[0].length, rows: boardRows.length });

// The set request: the lowest successful attempt, as the pool's lowest-j rule.
let set = null;
for (let j = 0; j < 32 && set === null; j += 1) {
  globalThis.__d21Tag = `${label}/set/${j}`;
  const t0 = performance.now();
  const r = setAttempt({ board, rotation: 0, levelId, seedText, uniqueness, execution }, j);
  event({ ev: 'set-attempt', j, ok: r.ok, reason: r.ok ? null : r.reason, ms: Math.round(performance.now() - t0) });
  if (r.ok) {
    set = r;
  }
}
const setMs = Math.round(performance.now() - startedAt);
if (set === null) {
  event({ ev: 'end', status: 'set-failed', setMs });
  process.exit(0);
}
event({ ev: 'set', attempt: set.attempt, K: set.set.pieces.length, calibrationScore: set.calibration.rating?.score ?? null, setMs });

// The batch request, folded in (slot, attempt) order from the frozen request-start history.
const ctx = {
  set: set.set,
  targetLevelId: levelId,
  quantity,
  batchSeed: `${seedText}#1`,
  uniqueness,
  seenLayouts: new Set(),
  seenClues: new Set(),
  calibration: set.calibration,
  execution,
};
let state = foldStart(ctx);
const frozen = candidateContext(ctx, state);
event({ ev: 'fold-start', fromCalibration: state.accepted.length, preferred: state.preferred });
const foldStartedAt = performance.now();
/** @type {Map<string, { slot: number, attempt: number }>} */
const origin = new Map();
for (let next = foldNext(state); next !== null; next = foldNext(state)) {
  globalThis.__d21Tag = `${label}/slot/${next.slot}/${next.attempt}`;
  const t0 = performance.now();
  const c = puzzleCandidate(frozen, next.slot, next.attempt);
  const ms = Math.round(performance.now() - t0);
  if ('fail' in c) {
    event({ ev: 'candidate', slot: next.slot, attempt: next.attempt, ms, outcome: `fail:${c.fail}` });
  } else {
    origin.set(c.layoutKey, next);
    event({ ev: 'candidate', slot: next.slot, attempt: next.attempt, ms, outcome: 'ok', score: c.rating.score, clues: c.clues.length });
  }
  const before = state.accepted.length;
  state = foldAccept(state, c);
  if (state.accepted.length > before) {
    const a = state.accepted[state.accepted.length - 1];
    const from = origin.get(a.layoutKey) ?? null;
    event({ ev: 'accepted', slot: state.accepted.length, from, score: a.rating.score, clues: a.clues.length, layout: shortHash(a.layoutKey) });
  }
}
event({
  ev: 'end',
  status: state.status,
  reason: state.reason ?? null,
  accepted: state.accepted.length,
  scores: state.accepted.map((/** @type {any} */ p) => p.rating.score),
  setMs,
  foldMs: Math.round(performance.now() - foldStartedAt),
  totalMs: Math.round(performance.now() - startedAt),
});
// Lazy certificates (never part of the batch time): the proof status of each accepted puzzle, timed alone.
if (args.get('certify') === '1') {
  for (const [i, p] of state.accepted.entries()) {
    const t0 = performance.now();
    const certificate = certifyTask({ set: ctx.set, execution }, p.clues);
    event({ ev: 'certify', slot: i + 1, clues: p.clues.length, ms: Math.round(performance.now() - t0), status: certificate.status });
  }
}
