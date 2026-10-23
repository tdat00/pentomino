// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { boardFromRows } from '../core/engine/board.js';
import { enumerateLayouts } from '../core/engine/enumerate.js';
import { layoutKey } from '../core/engine/keys.js';
import { buildModel, rowPose } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */

const BIG = { placementLimit: Infinity, nodeLimit: Infinity };
const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const pentomino = (/** @type {string} */ ids) => ids.split('').map((id) => /** @type {Piece} */ (CLASSIC_PENTOMINOES.find((p) => p.id === id)));
const board = (/** @type {string[]} */ rows) => boardFromRows(rows);
const rect = (/** @type {number} */ w, /** @type {number} */ h) => board(Array(h).fill('#'.repeat(w)));

/**
 * Independent oracle: every exact cover of the empty model, reduced to strict layout keys.
 * @param {import('../core/engine/types.js').Board} b
 * @param {Piece[]} pieces
 */
function dlxArrangements(b, pieces) {
  const model = buildModel(b, pieces, [], ws);
  const keys = new Set();
  let raw = 0;
  model.cover.solve({ maxSolutions: Infinity, onSolution: (rows) => {
    raw += 1;
    keys.add(layoutKey(b, pieces, Array.from(rows, (r) => rowPose(model, r))));
  } });
  return { keys, raw };
}

describe('enumerateLayouts', () => {
  test('counts the same symmetry-reduced arrangements as the exact-cover model, on several boards and piece sets', () => {
    const cases = /** @type {[string, import('../core/engine/types.js').Board, string][]} */ ([
      ['4x5 F L U Y', rect(5, 4), 'FLUY'],
      ['4x5 L P T V', rect(5, 4), 'LPTV'],
      ['3x5 P U V', rect(5, 3), 'PUV'],
      ['asymmetric notched board F L N P', board(['######', '######', '#####.', '###...']), 'FLNP'],
      ['5x5 F I L U Y', rect(5, 5), 'FILUY'],
      ['3x10 six pieces', rect(10, 3), 'FILNPT'],
      ['4x5 F I L N', rect(5, 4), 'FILN'],
    ]);
    for (const [name, b, ids] of cases) {
      const pieces = pentomino(ids);
      const oracle = dlxArrangements(b, pieces);
      const found = enumerateLayouts(b, pieces, oracle.keys, BIG);
      assert.equal(found.status, 'exhausted', name);
      assert.equal(found.total, oracle.keys.size, name);
      assert.equal(found.solutions, oracle.raw, `${name}: raw tilings`);
      assert.equal(found.limit, null);
      if (oracle.keys.size > 1) {
        const [first, ...rest] = oracle.keys;
        assert.equal(enumerateLayouts(b, pieces, new Set(rest), BIG).status, 'more', `${name}: one unused arrangement`);
        assert.equal(enumerateLayouts(b, pieces, new Set([first]), BIG).status, 'more', name);
      }
      if (oracle.keys.size > 0) {
        assert.equal(enumerateLayouts(b, pieces, new Set(), BIG).status, 'more', `${name}: nothing used`);
      }
    }
  });

  test('pieces of identical shape are interchangeable: arrangements are counted once, not per permutation', () => {
    const dominoes = ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id, color: '#888', cells: /** @type {[number, number][]} */ ([[0, 0], [1, 0]]) }));
    const b = rect(4, 2);
    const oracle = dlxArrangements(b, dominoes);
    assert.equal(oracle.raw, 5 * 24, 'five tilings, each with 4! labelings in the exact-cover model');
    const found = enumerateLayouts(b, dominoes, oracle.keys, BIG);
    assert.deepEqual([found.status, found.total, found.solutions], ['exhausted', oracle.keys.size, 5]);
  });

  test('a piece set that cannot cover the board has no arrangement', () => {
    const found = enumerateLayouts(rect(5, 4), pentomino('FLU'), new Set(), BIG);
    assert.deepEqual([found.status, found.total, found.solutions], ['exhausted', 0, 0]);
    const none = enumerateLayouts(board(['#####', '#####', '####.', '##..#']), pentomino('FLUY'), new Set(), BIG);
    assert.deepEqual([none.status, none.total], ['exhausted', 0]);
  });

  test('a limit proves nothing and names itself; limits are counted in search steps', () => {
    const b = rect(5, 4);
    const pieces = pentomino('FLUY');
    const known = dlxArrangements(b, pieces).keys;
    const placements = enumerateLayouts(b, pieces, known, { placementLimit: 3, nodeLimit: Infinity });
    assert.deepEqual([placements.status, placements.limit], ['limit', 'placements']);
    const nodes = enumerateLayouts(b, pieces, known, { placementLimit: Infinity, nodeLimit: 1 });
    assert.deepEqual([nodes.status, nodes.limit], ['limit', 'nodes']);
    const whole = enumerateLayouts(b, pieces, known, BIG);
    assert.ok(whole.placements > 3 && whole.nodes > 1);
    const exact = enumerateLayouts(b, pieces, known, { placementLimit: whole.placements, nodeLimit: whole.nodes });
    assert.equal(exact.status, 'exhausted', 'a limit equal to the work needed still finishes');
    assert.deepEqual(enumerateLayouts(b, pieces, known, BIG), whole, 'the same input always gives the same counts');
  });
});
