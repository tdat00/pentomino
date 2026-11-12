// D21 population run for the early-stop rule: many selectClues calls on cheap boards, recorded by the preload
// (register.mjs), so that simulate.mjs can look for results the rule would change or central candidates it would miss.
//   node --import ./docs/difficulty-v3/d21-2026-11-12/register.mjs ./docs/difficulty-v3/d21-2026-11-12/pop.mjs \
//     --recipe-board 200            (the 12 classic pentominoes on 10 x 6: 200 seeds per level, 30 for `require`)
//   node ... pop.mjs --cell 10x6:hard --sets 15 --seeds 8     (generated sets: selectClues on each set's witness)
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.env.D21_ROOT ?? '.');
const imp = (/** @type {string} */ p) => import(pathToFileURL(join(root, p)).href);
const { boardFromRows } = await imp('core/engine/board.js');
const { selectClues } = await imp('core/engine/clues.js');
const { setAttempt } = await imp('core/engine/generate.js');
const { level } = await imp('core/engine/levels.js');
const { createRng } = await imp('core/engine/rng.js');
const { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } = await imp('core/engine/workspace.js');
const { RECIPE_BOARD_ROWS, recipeWitness } = await imp('tests/fixtures/clue-recipes.js');
const { CLASSIC_PENTOMINOES } = await imp('tests/fixtures/polyominoes.js');

const argv = process.argv.slice(2);
const opt = (/** @type {string} */ name, /** @type {string} */ fallback) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback);
const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const scratch = createWorkspace(SCRATCH_WORKSPACE_BYTES);

if (argv.includes('--recipe-board')) {
  const count = Number(opt('recipe-board', '200'));
  const board = boardFromRows([...RECIPE_BOARD_ROWS]);
  const pieces = [...CLASSIC_PENTOMINOES];
  const layout = recipeWitness();
  for (const id of ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master']) {
    for (const uniqueness of ['any', 'require']) {
      const seeds = uniqueness === 'any' ? count : Math.min(count, 30);
      for (let k = 0; k < seeds; k += 1) {
        globalThis.__d21Tag = `pop/recipe/${id}/${uniqueness}/${k}`;
        selectClues({
          board, pieces, layout, target: level(id), rng: createRng(`pop-${id}-${uniqueness}-${k}`), uniqueness,
          excludeClueKeys: new Set(), ws,
        });
      }
    }
  }
}

if (argv.includes('--cell')) {
  const [size, levelId] = opt('cell', '10x6:hard').split(':');
  const [w, h] = size.split('x').map(Number);
  const board = boardFromRows(Array(h).fill('#'.repeat(w)));
  const sets = Number(opt('sets', '10'));
  const seeds = Number(opt('seeds', '5'));
  const execution = { main: ws, scratch };
  for (let k = 0; k < sets; k += 1) {
    let set = null;
    for (let j = 0; j < 32 && set === null; j += 1) {
      globalThis.__d21Tag = `pop/${size}/${levelId}/set${k}/cal${j}`;
      const r = setAttempt({ board, rotation: 0, levelId, seedText: `pop-set-${size}-${levelId}-${k}`, uniqueness: 'any', execution }, j);
      set = r.ok ? r : null;
    }
    if (set === null) {
      continue;
    }
    for (let s = 0; s < seeds; s += 1) {
      globalThis.__d21Tag = `pop/${size}/${levelId}/set${k}/seed${s}`;
      selectClues({
        board, pieces: set.set.pieces, layout: set.set.witness, target: level(levelId), rng: createRng(`pop-clues-${size}-${levelId}-${k}-${s}`),
        uniqueness: 'any', excludeClueKeys: new Set(), ws,
      });
    }
  }
}
