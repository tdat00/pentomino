// @ts-check
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { activeCount, boardFromRows, rectangle } from '../core/engine/board.js';
import { carveMacro, finalizeSet } from '../core/engine/carve.js';
import { poseCells } from '../core/engine/geometry.js';
import { layoutKey } from '../core/engine/keys.js';
import { BUDGETS, pieceCountRange } from '../core/engine/policy.js';
import { createRng } from '../core/engine/rng.js';
import {
  buildModel,
  clusterFor,
  isValidLayout,
  lnsStep,
  lnsWalk,
  luby,
  randomTiling,
  solveFirst,
} from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').PieceSet} PieceSet */

const main = createWorkspace(MAIN_WORKSPACE_BYTES);
const scratch = createWorkspace(SCRATCH_WORKSPACE_BYTES);
const pieces = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);
const sixByTen = rectangle(10, 6);

/**
 * @param {string} id
 * @param {[number, number][]} cells
 * @returns {Piece}
 */
const piece = (id, cells) => ({ id, label: id, color: '#000000', cells });

/**
 * Stream wrapper that records every derive label, however deeply nested.
 * @param {import('../core/engine/rng.js').Rng} rng
 * @param {string[]} log
 * @param {string} [prefix]
 * @returns {import('../core/engine/rng.js').Rng}
 */
function spy(rng, log, prefix = '') {
  return { ...rng, derive: (label) => { log.push(prefix + label); return spy(rng.derive(label), log, `${prefix}${label}/`); } };
}

/**
 * @param {string} seed
 * @returns {Pose[]}
 */
function classicLayout(seed) {
  const layout = randomTiling(sixByTen, pieces, createRng(seed), scratch, { totalRowTrials: 100000, restartBase: 2000 });
  assert.ok(layout, 'a 6x10 pentomino tiling is found within the budget');
  return layout;
}

/**
 * @param {Pose[]} layout
 * @param {string[]} ids
 * @returns {string}
 */
function footprints(layout, ids) {
  return ids.map((id) => {
    const pose = /** @type {Pose} */ (layout.find((p) => p.piece === id));
    const p = /** @type {Piece} */ (pieces.find((q) => q.id === id));
    return poseCells(p, pose).map(([x, y]) => y * 10 + x).sort((a, b) => a - b).join(',');
  }).join('|');
}

describe('luby', () => {
  test('follows 1,1,2,1,1,2,4,1,1,2,1,1,2,4,8 and rejects bad indices', () => {
    assert.deepEqual(Array.from({ length: 15 }, (_, i) => luby(i + 1)), [1, 1, 2, 1, 1, 2, 4, 1, 1, 2, 1, 1, 2, 4, 8]);
    assert.equal(luby(31), 16);
    assert.throws(() => luby(0), RangeError);
    assert.throws(() => luby(1.5), RangeError);
  });
});

describe('randomTiling', () => {
  test('is seeded, valid and uses the named restart streams', () => {
    const log = /** @type {string[]} */ ([]);
    const a = randomTiling(sixByTen, pieces, spy(createRng('rt'), log), scratch, { totalRowTrials: 100000, restartBase: 2000 });
    assert.ok(a);
    assert.ok(isValidLayout(sixByTen, pieces, a));
    assert.ok(log.length >= 1);
    log.forEach((label, i) => assert.equal(label, `r${i + 1}`));
    const b = randomTiling(sixByTen, pieces, createRng('rt'), scratch, { totalRowTrials: 100000, restartBase: 2000 });
    assert.deepEqual(a, b);
    const other = randomTiling(sixByTen, pieces, createRng('rt2'), scratch, { totalRowTrials: 100000, restartBase: 2000 });
    assert.notEqual(layoutKey(sixByTen, pieces, /** @type {Pose[]} */ (other)), layoutKey(sixByTen, pieces, a));
  });

  test('keeps clues in the result', () => {
    const clues = [classicLayout('clue-source').find((p) => p.piece === 'X')];
    const layout = randomTiling(sixByTen, pieces, createRng('rt'), scratch, {
      clues: /** @type {Pose[]} */ (clues), totalRowTrials: 100000, restartBase: 2000,
    });
    assert.ok(layout && isValidLayout(sixByTen, pieces, layout));
    assert.deepEqual(layout.find((p) => p.piece === 'X'), clues[0]);
  });

  test('clamps every restart to the remaining total and terminates with null', () => {
    /** @type {import('../core/engine/tiling.js').RestartInfo[]} */
    const info = [];
    const layout = randomTiling(sixByTen, pieces, createRng('tiny'), scratch, {
      totalRowTrials: 30, restartBase: 2, onRestart: (i) => info.push(i),
    });
    assert.equal(layout, null);
    let spent = 0;
    info.forEach((r, i) => {
      assert.equal(r.index, i + 1);
      assert.equal(r.limit, Math.min(2 * luby(i + 1), 30 - spent));
      assert.ok(r.rowTrials <= r.limit);
      spent += r.rowTrials;
    });
    assert.equal(spent, 30);
    assert.ok(info.length <= 30);
  });

  test('an exhausted zero-solution search or a zero-row dead end returns null at once', () => {
    const board = boardFromRows(['###', '###']);
    /** @type {import('../core/engine/tiling.js').RestartInfo[]} */
    const exhausted = [];
    const stripe = [piece('A', [[0, 0], [1, 0], [2, 0]]), piece('B', [[0, 0], [0, 1], [1, 1]])];
    assert.equal(randomTiling(board, stripe, createRng('s'), scratch, {
      totalRowTrials: 1000, restartBase: 10, onRestart: (i) => exhausted.push(i),
    }), null);
    assert.equal(exhausted.length, 1);
    assert.equal(exhausted[0].exhausted, true);
    /** @type {import('../core/engine/tiling.js').RestartInfo[]} */
    const dead = [];
    const tooLong = [piece('A', [[0, 0], [1, 0], [2, 0], [3, 0]]), piece('B', [[0, 0], [1, 0]])];
    assert.equal(randomTiling(board, tooLong, createRng('s'), scratch, {
      totalRowTrials: 1000, restartBase: 10, onRestart: (i) => dead.push(i),
    }), null);
    assert.deepEqual(dead.map((r) => [r.rowTrials, r.exhausted]), [[0, true]]);
  });

  test('rejects invalid budgets', () => {
    assert.throws(() => randomTiling(sixByTen, pieces, createRng('x'), scratch, { totalRowTrials: -1, restartBase: 2 }), RangeError);
    assert.throws(() => randomTiling(sixByTen, pieces, createRng('x'), scratch, { totalRowTrials: 10, restartBase: 0 }), RangeError);
    assert.equal(randomTiling(sixByTen, pieces, createRng('x'), scratch, { totalRowTrials: 0, restartBase: 2 }), null);
  });
});

describe('lnsStep', () => {
  const start = classicLayout('lns-start');

  test('returns a valid layout that changes only the cluster, in the scratch workspace', () => {
    const model = buildModel(sixByTen, pieces, [], main);
    const before = solveFirst(model, { rowTrialLimit: 100000 });
    const classic = { board: sixByTen, pieces, witness: start, carving: /** @type {const} */ ('imported'), macroRegion: null };
    let changed = 0;
    for (let i = 0; i < 12; i += 1) {
      const { cluster } = clusterFor(classic, start, 0, 0, createRng(`cluster${i}`));
      const next = lnsStep(sixByTen, pieces, start, cluster, createRng(`step${i}`), scratch, { rowTrialLimit: 3000, maxSolutions: 8 });
      if (next === null) {
        continue;
      }
      changed += 1;
      assert.ok(isValidLayout(sixByTen, pieces, next));
      assert.equal(next.length, 12);
      const others = pieces.map((p) => p.id).filter((id) => !cluster.some((c) => pieces[c].id === id));
      assert.equal(footprints(next, others), footprints(start, others));
      const ids = cluster.map((c) => pieces[c].id);
      assert.notEqual(footprints(next, ids), footprints(start, ids));
    }
    assert.ok(changed >= 3, `only ${changed} of 12 clusters could be re-tiled`);
    // The main model stays live: lnsStep never rebuilt it.
    assert.deepEqual(solveFirst(model, { rowTrialLimit: 100000 }).layout, before.layout);
  });

  test('a cluster with no alternative, or a tiny row limit, gives null', () => {
    assert.equal(lnsStep(sixByTen, pieces, start, [3], createRng('one'), scratch, { rowTrialLimit: 3000, maxSolutions: 8 }), null);
    assert.equal(lnsStep(sixByTen, pieces, start, [0, 1, 2, 3, 4, 5], createRng('tiny'), scratch, { rowTrialLimit: 1, maxSolutions: 8 }), null);
  });

  test('rejects an invalid cluster or layout instead of guessing', () => {
    const o = { rowTrialLimit: 100, maxSolutions: 8 };
    assert.throws(() => lnsStep(sixByTen, pieces, start, [], createRng('x'), scratch, o), RangeError);
    assert.throws(() => lnsStep(sixByTen, pieces, start, [1, 1], createRng('x'), scratch, o), RangeError);
    assert.throws(() => lnsStep(sixByTen, pieces, start, [12], createRng('x'), scratch, o), RangeError);
    assert.throws(() => lnsStep(sixByTen, pieces, start.slice(1), [0], createRng('x'), scratch, o), RangeError);
  });
});

/**
 * @param {string} seedText
 * @param {number} w
 * @param {number} h
 * @param {string} levelId
 * @param {number} [fixedK]
 * @returns {PieceSet | null}
 */
function macroSet(seedText, w, h, levelId, fixedK) {
  const board = rectangle(w, h);
  const ks = /** @type {number[]} */ (pieceCountRange(levelId, activeCount(board)));
  const rng = createRng(seedText, 'set/0');
  const k = fixedK ?? ks[rng.int(ks.length)];
  const carved = carveMacro(board, k, rng.derive('macro'), BUDGETS);
  return carved === null ? null : finalizeSet(board, carved.regions, carved.regionOf);
}

describe('clusterFor and lnsWalk', () => {
  const set = /** @type {PieceSet} */ (macroSet('fixture-set-0', 10, 6, 'hard', 8));
  const witness = /** @type {Pose[]} */ (set.witness);

  test('macro clusters are one region, broadened to at most nine pieces every eighth step', () => {
    const macro = /** @type {number[]} */ (set.macroRegion);
    for (let i = 0; i < 20; i += 1) {
      const plain = clusterFor(set, witness, i % 7, 0, createRng(`c${i}`));
      assert.equal(new Set(plain.cluster.map((c) => macro[c])).size, 1);
      assert.equal(plain.cluster.length, macro.filter((r) => r === macro[plain.cluster[0]]).length);
      assert.equal(plain.rows, BUDGETS.lnsRowsMacro);
      const wide = clusterFor(set, witness, 7, 0, createRng(`c${i}`));
      assert.ok(wide.cluster.length >= plain.cluster.length && wide.cluster.length <= Math.max(9, plain.cluster.length));
      assert.ok(plain.cluster.every((c) => wide.cluster.includes(c)));
    }
    const broadened = [...Array(20).keys()].some((i) => clusterFor(set, witness, 7, 0, createRng(`c${i}`)).cluster.length
      > clusterFor(set, witness, 6, 0, createRng(`c${i}`)).cluster.length);
    assert.ok(broadened, 'step 7 widens at least one cluster');
  });

  test('flat clusters are capped at K, start at 6 pieces and widen while stuck', () => {
    const flat = /** @type {PieceSet} */ ({ ...set, carving: 'flat', macroRegion: null });
    const layout = classicLayout('flat-walk');
    const classic = { board: sixByTen, pieces, witness: layout, carving: /** @type {const} */ ('imported'), macroRegion: null };
    for (let i = 0; i < 20; i += 1) {
      const c = clusterFor(classic, layout, 0, 0, createRng(`f${i}`));
      assert.ok(c.cluster.length >= 6 && c.cluster.length <= 12);
      assert.equal(c.rows, BUDGETS.lnsRowsFlat);
      const stuck = clusterFor(classic, layout, 0, 8, createRng(`f${i}`));
      assert.ok(stuck.cluster.length >= Math.min(12, 6 + 4));
    }
    const small = clusterFor(flat, witness, 0, 12, createRng('k'));
    assert.equal(small.cluster.length, set.pieces.length, 'k is capped at K');
  });

  test('walks stay valid, are deterministic and reach other layouts', () => {
    const keys = new Set();
    for (let i = 0; i < 6; i += 1) {
      const walked = lnsWalk(set, witness, createRng('b#1', `slot/1/${i}`).derive('walk'), scratch, 8);
      assert.ok(isValidLayout(set.board, set.pieces, walked));
      keys.add(layoutKey(set.board, set.pieces, walked));
    }
    assert.ok(keys.size >= 2);
    const again = lnsWalk(set, witness, createRng('b#1', 'slot/1/0').derive('walk'), scratch, 8);
    assert.deepEqual(again, lnsWalk(set, witness, createRng('b#1', 'slot/1/0').derive('walk'), scratch, 8));
  });

  test('a rigid single-piece set returns the start after finite work', () => {
    const board = boardFromRows(['###', '#..']);
    const rigid = { board, pieces: [piece('A', [[0, 0], [1, 0], [2, 0], [0, 1]])], carving: /** @type {const} */ ('imported'), macroRegion: null };
    const layout = /** @type {Pose[]} */ (randomTiling(board, rigid.pieces, createRng('r'), scratch, { totalRowTrials: 100, restartBase: 5 }));
    assert.deepEqual(lnsWalk({ ...rigid, witness: layout }, layout, createRng('w'), scratch, 8), layout);
    assert.deepEqual(lnsWalk({ ...rigid, witness: layout }, layout, createRng('w'), scratch, 0), layout);
  });
});

describe('macro sets yield other layouts', () => {
  /**
   * @param {number} w
   * @param {number} h
   * @param {string} levelId
   * @param {number} k
   * @returns {number} Seeds (of 50) with at least two layout keys.
   */
  function multiLayoutSeeds(w, h, levelId, k) {
    let ok = 0;
    for (let n = 0; n < 50; n += 1) {
      const set = macroSet(`discovery-${w}x${h}-${n}`, w, h, levelId, k);
      if (set === null) {
        continue;
      }
      const witness = /** @type {Pose[]} */ (set.witness);
      const keys = new Set([layoutKey(set.board, set.pieces, witness)]);
      for (let a = 0; a < 3; a += 1) {
        const layout = lnsWalk(set, witness, createRng(`discovery-${n}#1`, `slot/1/${a}`).derive('walk'), scratch, 8);
        assert.ok(isValidLayout(set.board, set.pieces, layout), `seed ${n} attempt ${a}`);
        keys.add(layoutKey(set.board, set.pieces, layout));
      }
      ok += keys.size >= 2 ? 1 : 0;
    }
    return ok;
  }

  test('10x6 with K=8: at least 90% of 50 fixed seeds', () => {
    const ok = multiLayoutSeeds(10, 6, 'normal', 8);
    assert.ok(ok >= 45, `${ok}/50 seeds produced two layout keys`);
  });

  test('20x18 with K=18: at least 90% of 50 fixed seeds (slow)', () => {
    const ok = multiLayoutSeeds(20, 18, 'hard', 18);
    assert.ok(ok >= 45, `${ok}/50 seeds produced two layout keys`);
  });
});
