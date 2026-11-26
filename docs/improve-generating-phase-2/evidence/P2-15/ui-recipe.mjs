// @ts-check
// P2-15 K9: runs the real-engine flow of tests/generator-controller.test.js ("real engine flows (slow)") for the recipe
// `square-22x22-nightmare` and records `pieces <n> puzzles <n> scores <list>` in ui-recipe.log before printing it.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createGenerationClient } from '../../../../core/browser/generation-client.js';
import { createPool } from '../../../../core/browser/worker-pool.js';
import { boardFromRows } from '../../../../core/engine/board.js';
import { createJobController } from '../../../../generator/jobs.js';
import { createGeneratorStore, defaultGeneratorState } from '../../../../generator/state.js';
import { nodeWorkerFactory } from '../../../../tools/node-worker.mjs';

const recipes = JSON.parse(readFileSync(new URL('../../../../tests/fixtures/ui-flow-recipes.json', import.meta.url), 'utf8')).recipes;
const recipe = recipes.find((/** @type {{ name: string }} */ r) => r.name === 'square-22x22-nightmare');
if (recipe === undefined) {
  throw new Error('the recipe square-22x22-nightmare is missing');
}

const pool = createPool({ size: 2, workerFactory: nodeWorkerFactory() });
const client = createGenerationClient(pool);
const board = boardFromRows(recipe.boardRows);
const store = createGeneratorStore(defaultGeneratorState({
  board, rotation: recipe.rotation, levelId: recipe.levelId, uniqueness: recipe.uniqueness, quantity: recipe.quantity,
}));
const controller = createJobController({
  store,
  hardware: { phone: false },
  client,
  cancelPending: () => pool.cancelAll(),
  randomNumber: () => `${recipe.seedText}#1`,
  openPlayer: async () => {},
});
try {
  await controller.generateSet({ seed: recipe.seedText });
  const afterSet = store.getState();
  if (afterSet.notice !== null) {
    throw new Error(`the set ended with a notice: ${JSON.stringify(afterSet.notice)}`);
  }
  await controller.addMore();
  const state = store.getState();
  if (state.notice !== null) {
    throw new Error(`the batch ended with a notice: ${JSON.stringify(state.notice)}`);
  }
  const line = `pieces ${afterSet.set?.pieces.length} puzzles ${state.puzzles.length} scores [${
    state.puzzles.map((p) => Math.round(p.rating?.score ?? -1)).join(', ')}]`;
  writeFileSync(fileURLToPath(new URL('./ui-recipe.log', import.meta.url)), `${line}\r\n`);
  console.log(line);
} finally {
  controller.destroy();
  pool.close();
}
