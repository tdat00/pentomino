// D21 driver for the real two-worker flow of tests/generator-controller.test.js (pool, client, job controller),
// instrumented only by wrapping the pool: every task and every request boundary gets a timestamped line.
//   D21_OUT=<jsonl> node ./docs/difficulty-v3/d21-2026-11-12/flow-pool.mjs --recipe square-22x22-hell-3 --quantity 10
// D21_ROOT (default: the working directory) selects the tree under test.
import { appendFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.env.D21_ROOT ?? '.');
const out = process.env.D21_OUT;
const imp = (/** @type {string} */ p) => import(pathToFileURL(join(root, p)).href);
const { createGenerationClient } = await imp('core/browser/generation-client.js');
const { createPool } = await imp('core/browser/worker-pool.js');
const { boardFromRows } = await imp('core/engine/board.js');
const { createJobController } = await imp('generator/jobs.js');
const { createGeneratorStore, defaultGeneratorState } = await imp('generator/state.js');
const { nodeWorkerFactory } = await imp('tools/node-worker.mjs');
const { TIME } = await imp('core/engine/policy.js');

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
}
const recipes = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'ui-flow-recipes.json'), 'utf8')).recipes;
const recipe = recipes.find((/** @type {any} */ r) => r.name === args.get('recipe'));
const quantity = Number(args.get('quantity') ?? recipe.quantity);
const label = args.get('label') ?? recipe.name;
const t0 = performance.now();
const log = (/** @type {object} */ e) => {
  const line = { label, atMs: Math.round(performance.now() - t0), ...e };
  if (out !== undefined) {
    appendFileSync(out, `${JSON.stringify(line)}\r\n`);
  }
};

const base = createPool({ size: 2, workerFactory: nodeWorkerFactory() });
const pool = {
  ...base,
  beginRequest(/** @type {any} */ o) {
    log({ ev: 'request-begin', requestId: o.requestId, dispatchStopMs: TIME.dispatchStopMs });
    base.beginRequest({
      ...o,
      onTimeout: (/** @type {any} */ info) => {
        log({ ev: 'request-timeout', requestId: o.requestId, elapsedMs: info.elapsedMs });
        o.onTimeout?.(info);
      },
    });
  },
  endRequest(/** @type {number} */ id) {
    log({ ev: 'request-end', requestId: id });
    base.endRequest(id);
  },
  run(/** @type {any} */ task, /** @type {any} */ onProgress) {
    const started = performance.now();
    const tag = { kind: task.kind, requestId: task.requestId, slot: task.payload?.slot, attempt: task.payload?.attempt };
    return base.run(task, onProgress).then((value) => {
      log({ ev: 'task', ...tag, ms: Math.round(performance.now() - started), outcome: 'ok' });
      return value;
    }, (error) => {
      log({ ev: 'task', ...tag, ms: Math.round(performance.now() - started), outcome: `error:${error?.reason ?? error?.code ?? error?.name}` });
      throw error;
    });
  },
};
const client = createGenerationClient(pool);
const board = boardFromRows(recipe.boardRows);
const store = createGeneratorStore(defaultGeneratorState({
  board, rotation: recipe.rotation, levelId: recipe.levelId, uniqueness: recipe.uniqueness, quantity,
}));
const controller = createJobController({
  store,
  hardware: { phone: false },
  client,
  cancelPending: () => pool.cancelAll(),
  randomNumber: () => `${recipe.seedText}#1`,
  openPlayer: async () => {},
});
log({ ev: 'start', recipe: recipe.name, quantity, dispatchStopMs: TIME.dispatchStopMs });
try {
  await controller.generateSet({ seed: recipe.seedText });
  log({ ev: 'set-done', notice: store.getState().notice?.code ?? null });
  await controller.addMore();
  const state = store.getState();
  log({
    ev: 'end',
    notice: state.notice?.code ?? null,
    puzzles: state.puzzles.length,
    scores: state.puzzles.map((/** @type {any} */ p) => Math.round(p.rating?.score ?? -1)),
  });
} finally {
  controller.destroy();
  base.close();
}
