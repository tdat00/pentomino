// D21: replays the selectClues vectors of tests/clues.test.js (same boards, seeds, targets and scripted ratings) so
// that the preload (register.mjs) records their rating sequences. Run with the preload and D21_OUT set:
//   node --import ./docs/difficulty-v3/d21-2026-11-12/register.mjs ./docs/difficulty-v3/d21-2026-11-12/vectors.mjs
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.env.D21_ROOT ?? '.');
const imp = (/** @type {string} */ p) => import(pathToFileURL(join(root, p)).href);
const { boardFromRows } = await imp('core/engine/board.js');
const { selectClues } = await imp('core/engine/clues.js');
const { level, levelForScore } = await imp('core/engine/levels.js');
const { createRng } = await imp('core/engine/rng.js');
const { buildModel, solveFirst } = await imp('core/engine/tiling.js');
const { createWorkspace, MAIN_WORKSPACE_BYTES } = await imp('core/engine/workspace.js');
const { clueKey } = await imp('core/engine/keys.js');
const { RECIPE_BOARD_ROWS, recipeWitness } = await imp('tests/fixtures/clue-recipes.js');
const { CLASSIC_PENTOMINOES } = await imp('tests/fixtures/polyominoes.js');

const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const board = boardFromRows([...RECIPE_BOARD_ROWS]);
const pieces = [...CLASSIC_PENTOMINOES];
const layout = recipeWitness();

const scripted = (/** @type {Record<number, number>} */ table) => (/** @type {any} */ _b, /** @type {any[]} */ p, /** @type {any[]} */ clues) => {
  const score = table[clues.length] ?? 10;
  return { model: 'difficulty-v2', score, level: levelForScore(score).id, saturated: false, metrics: { U: p.length - clues.length } };
};
const T = { min: 20, max: 30, share: 0.22 };
const S = scripted({ 1: 40, 2: 25, 3: 21, 4: 18 });

/** @param {string} tag @param {object} o */
function run(tag, o) {
  globalThis.__d21Tag = `vec/${tag}`;
  return selectClues({
    board, pieces, layout, target: level('normal'), rng: createRng(o.seed), uniqueness: 'any', excludeClueKeys: new Set(), ws, ...o,
  });
}

// "any, centre reconstruction"
for (const id of ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master']) {
  run(`centre-${id}`, { target: level(id), seed: `centre-${id}` });
}
run('reserve-0', { target: { min: 34, max: 36, share: 0.3 }, seed: 'reserve-0' });
run('reserve-3', { target: { min: 28, max: 30, share: 0.3 }, seed: 'reserve-3' });
// "any, ties by key", "unbounded", the scripted require cases
run('tie-0', { rate: scripted({ 2: 21, 3: 29 }), target: T, seed: 'tie-0' });
run('unbounded-any', { target: { min: 17, max: Infinity, share: 0.38 }, seed: 'unbounded' });
run('unbounded-require', { target: { min: 17, max: Infinity, share: 0.38 }, seed: 'unbounded-1', uniqueness: 'require' });
run('req-0', { rate: S, target: T, uniqueness: 'require', seed: 'req-0' });
run('req-2', { rate: S, target: T, uniqueness: 'require', seed: 'req-2' });
const req3 = run('req-3', { rate: S, target: T, uniqueness: 'require', seed: 'req-3' });
run('req-3-excluded', { rate: S, target: T, uniqueness: 'require', seed: 'req-3', excludeClueKeys: new Set([clueKey(board, pieces, req3.clues)]) });
run('budget-0', { rate: scripted({ 1: 25 }), target: T, uniqueness: 'require', seed: 'budget-0' });
run('budget-1', { rate: scripted({ 1: 25 }), target: T, uniqueness: 'require', seed: 'budget-1' });
run('none-0-any', { rate: scripted({}), target: T, uniqueness: 'any', seed: 'none-0' });
run('none-0-require', { rate: scripted({}), target: T, uniqueness: 'require', seed: 'none-0' });
// "any, end of search" on the 3 x 5 board of P, U and V
{
  const b = boardFromRows(Array(3).fill('#####'));
  const ps = ['P', 'U', 'V'].map((id) => pieces.find((p) => p.id === id));
  const witness = solveFirst(buildModel(b, ps, [], ws), { rowTrialLimit: 1e6 }).layout;
  globalThis.__d21Tag = 'vec/end';
  selectClues({
    board: b, pieces: ps, layout: witness, target: { min: 6, max: 14, share: 0.3 }, rng: createRng('end'),
    uniqueness: 'any', excludeClueKeys: new Set(), ws,
  });
}
// the older tests of the file that call selectClues with the real rating
for (const id of ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master']) {
  run(`any-${id}`, { target: level(id), seed: `any-${id}` });
}
for (const id of ['easy', 'hard', 'master']) {
  run(`required-${id}`, { target: level(id), uniqueness: 'require', seed: `req-${id}` });
}
for (const id of ['nightmare', 'hell-1']) {
  run(`unreachable-${id}`, { target: level(id), seed: `none-${id}` });
}
run('beam-seed5', { target: { min: 34, max: 36, share: 0.3 }, seed: 'seed5' });
run('repair-seed3-any', { target: { min: 36, max: 38, share: 0.3 }, seed: 'seed3' });
run('repair-seed3-require', { target: { min: 36, max: 38, share: 0.3 }, seed: 'seed3', uniqueness: 'require' });
run('perm-hard', { target: level('hard'), seed: 'perm' });
run('same', { seed: 'same' });
