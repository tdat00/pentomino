// D21-V3 certification reruns (MP09d2; cross-review TP03): the `require`-mode calls with a finite band of the D21-V3
// population that use the product's rating, with the arguments and tags of their drivers: pop.mjs --recipe-board
// <count> (per level, k below min(count, 30)) and the four real-rating require vectors of vectors.mjs. Run it under
// ../d21-2026-11-12/register.mjs (N = 12, the product) and under stall16.mjs (N = 16); certify.mjs compares the final
// results with the no-stall baseline. Environment: D21_OUT (jsonl file), D21_ROOT (tree, default the working dir).
//   node --import <preload> ./<this folder>/rerun.mjs --recipe-board 200
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.env.D21_ROOT ?? '.');
const imp = (/** @type {string} */ p) => import(pathToFileURL(join(root, p)).href);
const { boardFromRows } = await imp('core/engine/board.js');
const { selectClues } = await imp('core/engine/clues.js');
const { level } = await imp('core/engine/levels.js');
const { createRng } = await imp('core/engine/rng.js');
const { createWorkspace, MAIN_WORKSPACE_BYTES } = await imp('core/engine/workspace.js');
const { RECIPE_BOARD_ROWS, recipeWitness } = await imp('tests/fixtures/clue-recipes.js');
const { CLASSIC_PENTOMINOES } = await imp('tests/fixtures/polyominoes.js');

const argv = process.argv.slice(2);
const count = Number(argv.includes('--recipe-board') ? argv[argv.indexOf('--recipe-board') + 1] : '200');
const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const board = boardFromRows([...RECIPE_BOARD_ROWS]);
const pieces = [...CLASSIC_PENTOMINOES];
const layout = recipeWitness();
/** @param {string} tag @param {object} o */
const call = (tag, o) => {
  globalThis.__d21Tag = tag;
  selectClues({ board, pieces, layout, uniqueness: 'require', excludeClueKeys: new Set(), ws, ...o });
};

// pop.mjs --recipe-board: the require part, in its order (level, then k)
for (const id of ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master']) {
  for (let k = 0; k < Math.min(count, 30); k += 1) {
    call(`pop/recipe/${id}/require/${k}`, { target: level(id), rng: createRng(`pop-${id}-require-${k}`) });
  }
}
// vectors.mjs: the real-rating require calls with a finite band ('unbounded-require' has none)
for (const id of ['easy', 'hard', 'master']) {
  call(`vec/required-${id}`, { target: level(id), rng: createRng(`req-${id}`) });
}
call('vec/repair-seed3-require', { target: { min: 36, max: 38, share: 0.3 }, rng: createRng('seed3') });
