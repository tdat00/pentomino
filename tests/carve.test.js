// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { activeCount, boardFromRows, preset, rectangle } from '../core/engine/board.js';
import {
  allocateCounts,
  carveFlat,
  carveFlatSet,
  carveMacro,
  finalizeSet,
  macroPartition,
  validateSet,
} from '../core/engine/carve.js';
import { canonicalKey, hasHole, isConnected, poseCells } from '../core/engine/geometry.js';
import { labelFor } from '../core/engine/palette.js';
import { pieceCountRange, sizeWindow } from '../core/engine/policy.js';
import { createRng } from '../core/engine/rng.js';

/** @typedef {import('../core/engine/types.js').Board} Board */
/** @typedef {import('../core/engine/types.js').PieceSet} PieceSet */

const RECIPES = JSON.parse(readFileSync(new URL('./fixtures/carving-recipes.json', import.meta.url), 'utf8')).recipes;
const SEEDS = 50;
const MIN_SUCCESS = 45;

const BOARDS = /** @type {[string, Board, string][]} */ ([
  ['10x6', rectangle(10, 6), 'normal'],
  ['10x8', rectangle(10, 8), 'normal'],
  ['heart-75', preset('heart', { n: 10 }).board, 'normal'],
  ['ring-60', preset('ring', { n: 8 }).board, 'normal'],
  ['20x18', rectangle(20, 18), 'hard'],
]);

/**
 * @param {Board} board
 * @param {string} levelId
 * @param {string} seedText
 * @param {'flat' | 'macro'} mode
 * @param {number} [fixedK]
 */
function carveOnce(board, levelId, seedText, mode, fixedK) {
  const ks = /** @type {number[]} */ (pieceCountRange(levelId, activeCount(board)));
  const rng = createRng(seedText, 'set/0');
  const k = fixedK ?? ks[rng.int(ks.length)];
  const sub = rng.derive(mode);
  const carved = mode === 'flat' ? carveFlatSet(board, k, sub) : carveMacro(board, k, sub);
  return { k, carved, set: carved === null ? null : finalizeSet(board, carved.regions, 'regionOf' in carved ? carved.regionOf : null) };
}

/**
 * Test-side policy check that does not use validateSet.
 * @param {PieceSet} set
 * @param {number} k
 */
function assertPolicy(set, k) {
  const area = activeCount(set.board);
  const [lo, hi] = sizeWindow(area, k);
  assert.equal(set.pieces.length, k);
  const keys = new Set();
  const covered = new Uint8Array(set.board.active.length);
  let small = 0;
  for (const [i, piece] of set.pieces.entries()) {
    const size = piece.cells.length;
    assert.ok(size >= 3 && size >= lo && size <= hi, `size ${size} outside ${lo}-${hi}`);
    assert.ok(isConnected(piece.cells) && !hasHole(piece.cells));
    keys.add(canonicalKey(piece.cells));
    if (size <= 4) small++;
    assert.equal(piece.id, labelFor(i));
    assert.equal(set.witness?.[i].piece, piece.id);
    for (const [x, y] of poseCells(piece, /** @type {any} */ (set.witness)[i])) {
      const at = y * set.board.width + x;
      assert.equal(set.board.active[at], 1);
      assert.equal(covered[at], 0, 'overlap');
      covered[at] = 1;
    }
  }
  assert.deepEqual(covered, set.board.active);
  assert.equal(keys.size, k, 'shapes are pairwise distinct');
  assert.ok(small <= Math.floor(0.4 * k), 'small-piece cap');
  for (let i = 1; i < set.pieces.length; i++) {
    assert.ok(set.pieces[i - 1].cells.length >= set.pieces[i].cells.length, 'sizes descend');
  }
}

describe('carved sets over seeded boards', () => {
  for (const mode of /** @type {const} */ (['flat', 'macro'])) {
    for (const [name, board, levelId] of BOARDS) {
      test(`${mode} ${name}: ${SEEDS} seeds give valid sets`, () => {
        let successes = 0;
        for (let s = 0; s < SEEDS; s++) {
          const { k, carved, set } = carveOnce(board, levelId, `t08-${name}-${s}`, mode);
          if (carved === null || set === null) continue;
          successes++;
          assert.deepEqual(validateSet(set), []);
          assertPolicy(set, k);
          assert.equal(set.carving, mode);
          if (mode === 'macro') {
            const parts = /** @type {number[]} */ (set.macroRegion);
            assert.equal(parts.length, k);
            assert.ok(Math.max(...parts) >= 1, 'at least two macro parts');
          } else {
            assert.equal(set.macroRegion, null);
          }
        }
        assert.ok(successes >= MIN_SUCCESS, `only ${successes}/${SEEDS} seeds carved`);
      });
    }
  }

  test('the same seed gives the same set', () => {
    for (const mode of /** @type {const} */ (['flat', 'macro'])) {
      const a = carveOnce(BOARDS[0][1], 'normal', 'repeat', mode).set;
      const b = carveOnce(BOARDS[0][1], 'normal', 'repeat', mode).set;
      assert.ok(a !== null);
      assert.deepEqual(a, b);
    }
  });
});

describe('recorded recipes', () => {
  for (const recipe of RECIPES) {
    test(`${recipe.name} replays its recorded geometry`, () => {
      const board = boardFromRows(recipe.boardRows);
      const { k, carved, set } = carveOnce(board, recipe.levelId, recipe.seedText, recipe.mode, recipe.k);
      assert.ok(carved !== null && set !== null, 'a recorded recipe must carve');
      assert.deepEqual(validateSet(set), []);
      assertPolicy(set, k);
      assert.equal(set.carving, recipe.expect.carving);
      assert.equal(set.pieces.length, recipe.expect.pieces);
      assert.deepEqual(set.pieces.map((p) => p.cells.length), recipe.expect.sizes);
    });
  }
});

describe('carveFlat', () => {
  const rng = (/** @type {string} */ seed) => createRng(seed);

  test('carves a board whose residue splits into valid components', () => {
    const board = boardFromRows(['###.###', '###.###', '###.###']);
    let found = 0;
    for (let s = 0; s < 20; s++) {
      const used = new Set();
      const r = carveFlat(board, [4, 4, 5, 5], rng(`split${s}`), { stepBudget: 6000, growthTries: 24, used });
      if (r === null) {
        assert.equal(used.size, 0, 'a failure leaves used unchanged');
        continue;
      }
      found++;
      assert.equal(used.size, 4);
      assert.deepEqual(r.regions.flat().sort((a, b) => a - b), [...board.active.keys()].filter((i) => board.active[i] === 1));
    }
    assert.ok(found > 0, 'at least one seed must carve');
  });

  test('prunes an impossible subset-sum residue', () => {
    const board = boardFromRows(['####.#####']);
    const wide = boardFromRows(['##..###', '##..###']);
    const used = new Set(['sentinel']);
    // Components of 4 and 6 cells cannot be filled by sizes 3 and 7.
    assert.equal(carveFlat(wide, [3, 7], rng('a'), { stepBudget: 6000, growthTries: 24, used }), null);
    assert.equal(carveFlat(board, [3, 6], rng('b'), { stepBudget: 6000, growthTries: 24, used }), null);
    assert.deepEqual([...used], ['sentinel']);
  });

  test('cannot place distinct shapes when the small ones are unavailable or repeated', () => {
    const board = rectangle(3, 2);
    const options = { stepBudget: 6000, growthTries: 24 };
    // Two 3-cell pieces on 3x2 are always the same free shape.
    assert.equal(carveFlat(board, [3, 3], rng('d'), { ...options, used: new Set() }), null);
    const wide = boardFromRows(['#####', '#####']);
    const i3 = canonicalKey([[0, 0], [1, 0], [2, 0]]);
    let free = 0;
    for (let s = 0; s < 10; s++) {
      const taken = new Set([i3]);
      assert.equal(carveFlat(wide, [3, 3, 4], rng(`u${s}`), { ...options, used: taken }), null, 'only L3 is left, and it cannot repeat');
      assert.deepEqual([...taken], [i3]);
      if (carveFlat(wide, [3, 3, 4], rng(`u${s}`), { ...options, used: new Set() }) !== null) free++;
    }
    assert.ok(free > 0, 'I3 + L3 + I4 tiles the board when nothing is taken');
  });

  test('rejects ring-shaped candidates around a blocked cell', () => {
    const ring = boardFromRows(['###', '#.#', '###']);
    const options = { stepBudget: 6000, growthTries: 24 };
    assert.equal(carveFlat(ring, [8], rng('ring'), { ...options, used: new Set() }), null);
    let carved = null;
    for (let s = 0; s < 20 && carved === null; s++) {
      carved = carveFlat(ring, [3, 5], rng(`r${s}`), { ...options, used: new Set() });
    }
    assert.ok(carved !== null);
    assert.equal(carved.regions.length, 2);
  });

  test('stops cleanly when the call budget is spent', () => {
    const board = rectangle(6, 3);
    const used = new Set();
    assert.equal(carveFlat(board, [6, 6, 6], rng('budget'), { stepBudget: 1, growthTries: 24, used }), null);
    assert.equal(used.size, 0);
    assert.equal(carveFlat(board, [6, 6], rng('size-mismatch'), { stepBudget: 6000, growthTries: 24, used }), null);
  });
});

describe('macro partitioning and allocation', () => {
  test('partitions are disjoint, connected and large enough', () => {
    for (const [, board] of BOARDS) {
      const area = activeCount(board);
      const mu = area / 9;
      const parts = macroPartition(board, mu, [2, 3], createRng('part'));
      assert.ok(parts !== null);
      const seen = new Set();
      for (const part of parts) {
        assert.ok(part.length >= 2 * Math.ceil(mu));
        assert.ok(isConnected(part.map((i) => [i % board.width, Math.floor(i / board.width)])));
        for (const c of part) {
          assert.ok(!seen.has(c) && board.active[c] === 1);
          seen.add(c);
        }
      }
      assert.equal(seen.size, area);
    }
  });

  test('a part that cannot merge makes the partition fail', () => {
    const board = boardFromRows(['####...##', '####....#']);
    assert.equal(macroPartition(board, 3, [2, 3], createRng('iso')), null);
  });

  test('largest-remainder allocation keeps every part at two or more pieces', () => {
    assert.deepEqual(allocateCounts([18, 24, 18], 8), [3, 3, 2]);
    assert.deepEqual(allocateCounts([18, 24, 18], 9), [3, 3, 3]);
    assert.deepEqual(allocateCounts([5, 50, 5], 8), [2, 4, 2]);
    assert.equal(allocateCounts([10, 10, 10], 5), null);
    for (const k of [8, 9, 11, 13, 17]) {
      const counts = /** @type {number[]} */ (allocateCounts([20, 35, 20, 15], k));
      assert.equal(counts.reduce((a, b) => a + b, 0), k);
      assert.ok(counts.every((c) => c >= 2));
    }
  });
});

describe('carveMacro failure between parts', () => {
  test('the next partition starts with full quotas, no keys and no pieces', () => {
    const board = rectangle(10, 8);
    const k = 9;
    /** @type {{ attempt: number, part: number, used: number, pieces: number, small: number }[]} */
    const parts = [];
    /** @type {{ attempt: number, used: number, pieces: number, small: number }[]} */
    const starts = [];
    const result = carveMacro(board, k, createRng('inject'), undefined, {
      partitionStart: (s) => starts.push({ attempt: s.attempt, used: s.used.size, pieces: s.pieceCount, small: s.smallLeft }),
      beforePart: (s) => {
        parts.push({ attempt: s.attempt, part: s.part, used: s.used.size, pieces: s.pieceCount, small: s.smallLeft });
        return !(s.attempt < 2 && s.part === 1);
      },
    });
    assert.ok(result !== null, 'later partitions must still succeed');
    assert.ok(starts.length >= 3);
    for (const s of starts) {
      assert.deepEqual([s.used, s.pieces, s.small], [0, 0, Math.floor(0.4 * k)]);
    }
    const first = (/** @type {number} */ a) => /** @type {NonNullable<typeof parts[number]>} */ (parts.find((p) => p.attempt === a && p.part === 0));
    const second = (/** @type {number} */ a) => /** @type {NonNullable<typeof parts[number]>} */ (parts.find((p) => p.attempt === a && p.part === 1));
    assert.ok(second(0).used > 0 && second(0).pieces > 0, 'the failed partition had real state');
    for (const a of [1, 2]) assert.deepEqual([first(a).used, first(a).pieces, first(a).small], [0, 0, Math.floor(0.4 * k)]);
    const set = finalizeSet(board, result.regions, result.regionOf);
    assert.deepEqual(validateSet(set), []);
    assertPolicy(set, k);
  });

  test('gives up after the partition budget', () => {
    assert.equal(carveMacro(rectangle(10, 6), 8, createRng('none'), { macroPartitions: 3 }, { beforePart: () => false }), null);
  });
});

describe('finalizeSet', () => {
  test('sorts by size then shape, labels pieces and remaps macro regions', () => {
    const board = rectangle(6, 3);
    const regions = [[14, 15, 16, 17], [0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11, 12, 13]];
    const set = finalizeSet(board, regions, [7, 3, 9]);
    assert.deepEqual(set.pieces.map((p) => [p.id, p.label, p.cells.length]), [['A', 'A', 8], ['B', 'B', 6], ['C', 'C', 4]]);
    assert.deepEqual(set.macroRegion, [9, 3, 7]);
    assert.equal(set.carving, 'macro');
    const byId = new Map(set.pieces.map((p) => [p.id, p]));
    set.witness?.forEach((pose, i) => {
      const cells = poseCells(/** @type {any} */ (byId.get(pose.piece)), pose).map(([x, y]) => y * 6 + x).sort((a, b) => a - b);
      assert.deepEqual(cells, [...[regions[2], regions[1], regions[0]][i]]);
    });
    assert.deepEqual(validateSet(set), []);
  });

  test('is invariant to region order and keeps macro parts attached to their shapes', () => {
    const { carved, set } = carveOnce(BOARDS[0][1], 'normal', 'perm', 'macro');
    assert.ok(carved !== null && 'regionOf' in carved && set !== null);
    const order = createRng('perm-order').shuffle([...carved.regions.keys()]);
    const shuffled = finalizeSet(set.board, order.map((i) => carved.regions[i]), order.map((i) => carved.regionOf[i]));
    assert.deepEqual(shuffled, set);
  });

  test('rejects regions that are not active cells', () => {
    assert.throws(() => finalizeSet(boardFromRows(['##.#']), [[0, 1, 2]], null), RangeError);
    assert.throws(() => finalizeSet(rectangle(2, 2), [[0, 1, 2, 3]], [0, 1]), RangeError);
  });
});

describe('validateSet', () => {
  /** @returns {{ set: PieceSet, board: Board }} */
  function ringSet() {
    const board = preset('ring', { n: 8 }).board;
    const set = /** @type {PieceSet} */ (carveOnce(board, 'normal', 't08-ring-60-0', 'flat').set);
    return { set: structuredClone(set), board };
  }
  /** @param {PieceSet} set */
  const codes = (set) => new Set(validateSet(set).map((i) => i.code));

  test('accepts a carved set', () => {
    assert.deepEqual(validateSet(ringSet().set), []);
  });

  test('catches overlap and missing cells', () => {
    const { set } = ringSet();
    set.witness = /** @type {any[]} */ (set.witness).map((p) => ({ ...p }));
    set.witness[1] = { ...set.witness[0], piece: set.pieces[1].id };
    const found = codes(set);
    assert.ok(found.has('overlap') && found.has('missing-cells'), [...found].join());

    const open = ringSet().set;
    const hole = open.board.active.indexOf(0);
    open.board.active[hole] = 1;
    assert.deepEqual([...codes(open)], ['missing-cells']);
  });

  test('catches holes, duplicate shapes and wrong sizes', () => {
    const { set } = ringSet();
    set.pieces[0].cells = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
    assert.ok(codes(set).has('piece-hole'));

    const dup = ringSet().set;
    dup.pieces[1].cells = dup.pieces[0].cells.map(([x, y]) => [y, x]);
    assert.ok(codes(dup).has('duplicate-shape'));

    const tiny = ringSet().set;
    tiny.pieces[0].cells = [[0, 0], [1, 0]];
    assert.ok(codes(tiny).has('size-too-small'));

    const huge = ringSet().set;
    huge.pieces[0].cells = Array.from({ length: 30 }, (_, i) => /** @type {[number, number]} */ ([i, 0]));
    assert.ok(codes(huge).has('size-out-of-window'));

    const split = ringSet().set;
    split.pieces[0].cells = [[0, 0], [1, 0], [5, 5]];
    assert.ok(codes(split).has('piece-disconnected'));
  });

  test('catches too many small pieces, bad macro bookkeeping and a missing witness', () => {
    const board = rectangle(6, 3);
    /** @type {PieceSet | null} */
    let small = null;
    for (let s = 0; s < 50 && small === null; s++) {
      const r = carveFlat(board, [3, 3, 4, 4, 4], createRng(`small${s}`), { stepBudget: 6000, growthTries: 24, used: new Set() });
      if (r !== null) small = finalizeSet(board, r.regions, null);
    }
    assert.ok(small !== null);
    assert.ok(codes(small).has('too-many-small'));

    const { set } = ringSet();
    assert.ok(!codes(set).has('macro-region'));
    set.carving = 'macro';
    assert.ok(codes(set).has('macro-region'));
    set.carving = 'flat';
    set.witness = null;
    assert.ok(codes(set).has('witness-missing'));
  });

  test('imported sets are only checked structurally', () => {
    const board = rectangle(3, 2);
    const set = finalizeSet(board, [[0, 1, 2], [3, 4, 5]], null);
    assert.ok(codes(set).has('duplicate-shape'));
    set.carving = 'imported';
    assert.deepEqual(validateSet(set), []);
    set.witness = null;
    assert.deepEqual(validateSet(set), []);
  });
});
