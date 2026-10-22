// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { canonicalKey, orientedCells, poseCells } from '../core/engine/geometry.js';
import { countPlacements, ModelError, preparePlacements, visitPlacements } from '../core/engine/placements.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */

/**
 * @param {string[]} rows
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @returns {number[][]}
 */
function visitedRows(rows, pieces, clues) {
  const plan = preparePlacements(boardFromRows(rows), pieces, clues);
  /** @type {number[][]} */
  const out = [];
  visitPlacements(plan, (piece, _t, _x, _y, cells) => {
    out.push([...cells, plan.freeCells + piece]);
  });
  return out;
}

/** Independent model: brute-force transforms, set-based dedup and a plain sort. */
function oracleRows(/** @type {string[]} */ rows, /** @type {Piece[]} */ pieces, /** @type {Pose[]} */ clues) {
  const board = boardFromRows(rows);
  const covered = new Set();
  const clued = new Set(clues.map((c) => c.piece));
  for (const pose of clues) {
    const piece = /** @type {Piece} */ (pieces.find((p) => p.id === pose.piece));
    for (const [x, y] of poseCells(piece, pose)) {
      covered.add(`${x},${y}`);
    }
  }
  /** @type {string[]} */
  const free = [];
  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      if (board.active[y * board.width + x] === 1 && !covered.has(`${x},${y}`)) {
        free.push(`${x},${y}`);
      }
    }
  }
  const column = new Map(free.map((key, i) => [key, i]));
  const shapeOf = (/** @type {Piece} */ p) => {
    const key = canonicalKey(p.cells);
    const [n, list] = key.split(':');
    return { n: Number(n), tuple: list.split(';').map((s) => s.split(',').map(Number)) };
  };
  const freePieces = pieces.filter((p) => !clued.has(p.id)).sort((a, b) => {
    const sa = shapeOf(a);
    const sb = shapeOf(b);
    if (sa.n !== sb.n) {
      return sa.n - sb.n;
    }
    for (let i = 0; i < sa.tuple.length; i += 1) {
      const d = sa.tuple[i][1] - sb.tuple[i][1] || sa.tuple[i][0] - sb.tuple[i][0];
      if (d !== 0) {
        return d;
      }
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  /** @type {number[][]} */
  const out = [];
  freePieces.forEach((piece, pi) => {
    /** @type {Set<string>} */
    const seen = new Set();
    /** @type {number[][]} */
    const mine = [];
    for (let t = 0; t < 8; t += 1) {
      const cells = orientedCells(piece.cells, t);
      for (let oy = -1; oy <= board.height; oy += 1) {
        for (let ox = -1; ox <= board.width; ox += 1) {
          const cols = cells.map(([x, y]) => column.get(`${x + ox},${y + oy}`));
          if (cols.every((c) => c !== undefined)) {
            const sorted = /** @type {number[]} */ (cols).sort((a, b) => a - b);
            const key = sorted.join(',');
            if (!seen.has(key)) {
              seen.add(key);
              mine.push(sorted);
            }
          }
        }
      }
    }
    mine.sort((a, b) => {
      for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
          return a[i] - b[i];
        }
      }
      return 0;
    });
    for (const cols of mine) {
      out.push([...cols, free.length + pi]);
    }
  });
  return out;
}

const SIX_BY_TEN = Array.from({ length: 6 }, () => '#'.repeat(10));
const IRREGULAR = [
  '#########.',
  '########..',
  '#.########',
  '##########',
  '#########.',
  '.#########',
];

test('enumeration equals an independent sorted brute-force model', () => {
  assert.deepEqual(visitedRows(SIX_BY_TEN, [...CLASSIC_PENTOMINOES], []), oracleRows(SIX_BY_TEN, [...CLASSIC_PENTOMINOES], []));
  const clues = [
    { piece: 'X', x: 2, y: 0, turn: /** @type {0} */ (0), mirrored: false },
    { piece: 'L', x: 4, y: 3, turn: /** @type {0} */ (0), mirrored: true },
  ];
  const pieces = [...CLASSIC_PENTOMINOES];
  assert.deepEqual(visitedRows(IRREGULAR, pieces, clues), oracleRows(IRREGULAR, pieces, clues));
});

test('canonical piece order is size, numeric shape tuple, then id; input order is irrelevant', () => {
  const mixed = [
    { id: 'b', label: 'b', color: '#000000', cells: [[0, 0], [1, 0]] },
    { id: 'tri', label: 't', color: '#000000', cells: [[0, 0], [1, 0], [0, 1]] },
    { id: 'a', label: 'a', color: '#000000', cells: [[0, 0], [0, 1]] },
    { id: 'line', label: 'l', color: '#000000', cells: [[0, 0], [1, 0], [2, 0]] },
    { id: 'mono', label: 'm', color: '#000000', cells: [[5, 5]] },
  ];
  const board = boardFromRows(['#####', '#####']);
  const plan = preparePlacements(board, mixed, []);
  assert.deepEqual(plan.freePieceIds, ['mono', 'a', 'b', 'line', 'tri']);
  assert.deepEqual(plan.pieceOrder, plan.freePieceIds);
  assert.deepEqual(plan.freePieceSource.map((i) => mixed[i].id), plan.freePieceIds);
  const reversed = preparePlacements(board, [...mixed].reverse(), []);
  assert.deepEqual(reversed.freePieceIds, plan.freePieceIds);
  const rows = (/** @type {import('../core/engine/placements.js').PlacementPlan} */ p) => {
    /** @type {string[]} */
    const out = [];
    visitPlacements(p, (piece, t, x, y, cells) => out.push(`${piece}/${t}/${x}/${y}/${[...cells]}`));
    return out;
  };
  assert.deepEqual(rows(reversed), rows(plan));
});

test('identical imported shapes keep separate columns ordered by id; symmetric poses are not duplicated', () => {
  const dominoes = ['q', 'p'].map((id) => ({ id, label: id, color: '#000000', cells: [[0, 0], [1, 0]] }));
  const rows = visitedRows(['###', '###'], dominoes, []);
  const plan = preparePlacements(boardFromRows(['###', '###']), dominoes, []);
  assert.deepEqual(plan.freePieceIds, ['p', 'q']);
  // 7 distinct domino placements in 3x2 per piece column.
  assert.equal(rows.filter((r) => r[r.length - 1] === 6).length, 7);
  assert.equal(rows.length, 14);
  const x = CLASSIC_PENTOMINOES.find((p) => p.id === 'X');
  assert.equal(visitedRows(['###', '###', '###'], [/** @type {Piece} */ (x)], []).length, 1);
});

test('emitted origin and transform reproduce the occupied cells', () => {
  const pieces = [...CLASSIC_PENTOMINOES];
  const plan = preparePlacements(boardFromRows(IRREGULAR), pieces, []);
  /** @type {number[]} */
  const cellOf = [];
  plan.cellColumn.forEach((column, index) => {
    if (column >= 0) {
      cellOf[column] = index;
    }
  });
  let checked = 0;
  visitPlacements(plan, (piece, t, x, y, cols) => {
    const source = pieces[plan.freePieceSource[piece]];
    const pose = { piece: source.id, x, y, turn: /** @type {0 | 1 | 2 | 3} */ (t & 3), mirrored: t >= 4 };
    const want = poseCells(source, pose).map(([cx, cy]) => cy * plan.width + cx).sort((a, b) => a - b);
    assert.deepEqual([...cols].map((c) => cellOf[c]), want);
    checked += 1;
  });
  assert.ok(checked > 500);
});

test('counting equals visiting and stops once a limit is exceeded', () => {
  const plan = preparePlacements(boardFromRows(SIX_BY_TEN), [...CLASSIC_PENTOMINOES], []);
  let rows = 0;
  let nonzeros = 0;
  const perPiece = new Int32Array(12);
  visitPlacements(plan, (piece, _t, _x, _y, cols) => {
    rows += 1;
    nonzeros += cols.length + 1;
    perPiece[piece] += 1;
  });
  const counted = countPlacements(plan);
  assert.equal(counted.rows, rows);
  assert.equal(counted.nonzeros, nonzeros);
  assert.deepEqual([...counted.perPiece], [...perPiece]);
  assert.equal(counted.exceeded, false);
  const capped = countPlacements(plan, { maxRows: 10 });
  assert.equal(capped.exceeded, true);
  assert.equal(capped.rows, 11);
  assert.equal(countPlacements(plan, { maxNonzeros: 5 }).exceeded, true);
});

test('the emitted column view is reused, so callers must copy it', () => {
  const small = [{ id: 'd', label: 'd', color: '#000000', cells: [[0, 0], [1, 0]] }];
  const p2 = preparePlacements(boardFromRows(['###']), small, []);
  /** @type {Int32Array[]} */
  const views = [];
  visitPlacements(p2, (_pi, _t, _x, _y, cols) => views.push(cols));
  assert.equal(views.length, 2);
  assert.equal(views[0], views[1]);
});

test('invalid clues are rejected before any model exists', () => {
  const board = boardFromRows(['#####', '#.###', '#####', '#####']);
  const pieces = [...CLASSIC_PENTOMINOES];
  /** @param {Pose[]} clues */
  const bad = (clues) => assert.throws(() => preparePlacements(board, pieces, clues),
    (e) => e instanceof ModelError && e.code === 'invalid-clue');
  const I = { piece: 'I', x: 0, y: 0, turn: /** @type {0} */ (0), mirrored: false };
  bad([{ ...I, piece: 'nope' }]);
  bad([I, { ...I, y: 2 }]);
  bad([{ ...I, y: 1 }]);
  bad([{ ...I, x: 1 }]);
  bad([{ ...I, y: -1 }]);
  bad([I, { piece: 'T', x: 0, y: 0, turn: 0, mirrored: false }]);
  bad([{ ...I, x: 0.5 }]);
  bad([{ ...I, turn: /** @type {any} */ (4) }]);
  const ok = preparePlacements(board, pieces, [I]);
  assert.deepEqual(ok.clues, [I]);
  assert.notEqual(ok.clues[0], I);
  assert.equal(ok.freePieceCount, 11);
  assert.equal(ok.pieceOrder.length, 12);
  assert.equal(ok.freeCells, 14);
});

test('unusable boards and pieces are typed input errors; oversized boards are too large', () => {
  const piece = CLASSIC_PENTOMINOES[0];
  assert.throws(() => preparePlacements({ width: 0, height: 1, active: new Uint8Array(0) }, [piece], []),
    (e) => e instanceof ModelError && e.code === 'invalid-input');
  assert.throws(() => preparePlacements(boardFromRows(['###']), [piece, piece], []),
    (e) => e instanceof ModelError && e.code === 'invalid-input');
  assert.throws(() => preparePlacements(boardFromRows(['###']), [{ ...piece, cells: [] }], []),
    (e) => e instanceof ModelError && e.code === 'invalid-input');
  assert.throws(() => preparePlacements({ width: 400, height: 400, active: new Uint8Array(160000) }, [piece], []),
    (e) => e instanceof ModelError && e.code === 'model-too-large');
});
