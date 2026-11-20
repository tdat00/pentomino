// @ts-check
// The worker of the pool probe (task pack v4, V4-T10c; R17): one of the `w` worker threads that `widthDispatch`
// (width-probe.mjs) starts together for a width `w`. From `workerData` `{ treeRoot, items, rounds }` it loads the tree's
// engine, creates its own main workspace and posts `{ type: 'ready' }`; on `{ type: 'go' }` it rates every item of
// `items` (a corpus of `kernelCorpus`: `{ caseId, boardRows, pieces, clues, idx }`) `rounds` times, in order, with
// `rate()` (an `IncompleteRatingError` counts as a rating) and times each rating with `performance.now()`. Its one
// terminal message is `{ type: 'result', ms }` (the list of the ratings' times in ms, item by item, `rounds` per item)
// or `{ type: 'error', message }` on an exception; it then closes its port.
import { parentPort, workerData } from 'node:worker_threads';

import { loadEngine } from './engine.mjs';

const port = /** @type {import('node:worker_threads').MessagePort} */ (parentPort);

try {
  const { treeRoot, items, rounds } = workerData;
  const e = await loadEngine(treeRoot);
  const ws = e.workspace.createWorkspace(e.workspace.MAIN_WORKSPACE_BYTES);
  await new Promise((resolve) => {
    port.on('message', (/** @type {any} */ message) => {
      if (message?.type === 'go') {
        resolve(undefined);
      }
    });
    port.postMessage({ type: 'ready' });
  });
  /** @type {number[]} */
  const ms = [];
  for (const item of items) {
    const board = e.board.boardFromRows(item.boardRows);
    for (let round = 0; round < rounds; round += 1) {
      const t0 = performance.now();
      try {
        e.difficulty.rate(board, item.pieces, item.clues, ws);
      } catch (error) {
        if (!(error instanceof e.difficulty.IncompleteRatingError)) {
          throw error;
        }
      }
      ms.push(Math.round((performance.now() - t0) * 1000) / 1000);
    }
  }
  port.postMessage({ type: 'result', ms });
} catch (error) {
  port.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
}
port.close();
