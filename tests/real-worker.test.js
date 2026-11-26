// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createGenerationClient } from '../core/browser/generation-client.js';
import { createPool } from '../core/browser/worker-pool.js';
import { canonicalKey } from '../core/engine/geometry.js';
import { rectRows } from '../tools/bench/calibration-reference.js';
import { nodeWorkerFactory } from '../tools/node-worker.mjs';

const SEED = 'p2-16a/widths';

/**
 * One real request (a set, then a batch of three) on a pool of the given width.
 * @param {number} width
 */
async function request(width) {
  const pool = createPool({ size: width, workerFactory: nodeWorkerFactory() });
  try {
    const client = createGenerationClient(pool);
    const set = await client.generateSet({
      boardRows: rectRows(10, 10), rotation: 0, levelId: 'nightmare', seedText: SEED, uniqueness: 'any', maxActive: 676,
    });
    assert.equal(set.status, 'complete', `width ${width}: the set`);
    const batch = await client.generateBatch({
      set: /** @type {any} */ (set.set), rotation: 0, targetLevelId: 'nightmare', quantity: 3, setSeed: SEED, batchIndex: 1, uniqueness: 'any',
      seenLayouts: [], seenClues: [], calibration: set.calibration, setLevel: 'nightmare', setAttempt: set.attempt, setOrigin: set.setOrigin,
    });
    return {
      width,
      status: batch.status,
      reason: batch.reason,
      pieceKeys: /** @type {any} */ (set.set).pieces.map((/** @type {{ cells: any }} */ p) => canonicalKey(p.cells)),
      layoutKeys: batch.seenLayouts,
      clueKeys: batch.seenClues,
      scores: batch.accepted.map((p) => p.rating?.score ?? NaN),
      made: batch.accepted.map((p) => batch.made[p.id]),
    };
  } finally {
    pool.close();
  }
}

describe('real worker pools', () => {
  test('slow: gen-v4 gives the same puzzles at real pool widths 1, 2 and 4', async () => {
    const runs = [];
    for (const width of [1, 2, 4]) {
      runs.push(await request(width));
    }
    const cut = runs.filter((r) => r.reason === 'time-limit');
    const [first, ...rest] = runs;
    assert.ok(first.layoutKeys.length >= 1, 'the first run accepts a puzzle');
    for (const run of runs) {
      assert.deepEqual(run.pieceKeys, first.pieceKeys, `width ${run.width}: the set's piece keys`);
      assert.equal(run.layoutKeys.length, run.clueKeys.length, `width ${run.width}: one clue key per layout key`);
      assert.equal(run.scores.length, run.layoutKeys.length, `width ${run.width}: one score per layout key`);
      const candidates = run.made.filter((m) => m?.kind === 'candidate');
      assert.ok(candidates.length >= 1, `width ${run.width}: a candidate puzzle is accepted`);
      for (const made of candidates) {
        assert.equal(/** @type {any} */ (made).versions.algo, 'gen-v4', `width ${run.width}: the algorithm id`);
      }
    }
    if (cut.length === 0) {
      for (const run of runs) {
        assert.equal(run.status, 'complete', `width ${run.width}: complete`);
      }
    }
    const n = Math.min(...runs.map((r) => r.layoutKeys.length));
    for (const run of cut) {
      console.log(`p2-16a: clock cut at width ${run.width}; prefix ${n} compared`);
    }
    for (const run of rest) {
      assert.deepEqual(run.layoutKeys.slice(0, n), first.layoutKeys.slice(0, n), `width ${run.width}: layout keys`);
      assert.deepEqual(run.clueKeys.slice(0, n), first.clueKeys.slice(0, n), `width ${run.width}: clue keys`);
      assert.deepEqual(run.scores.slice(0, n), first.scores.slice(0, n), `width ${run.width}: scores`);
      if (cut.length === 0) {
        assert.equal(run.layoutKeys.length, first.layoutKeys.length, `width ${run.width}: the same number of puzzles`);
      }
    }
  });
});
