// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { countPlacements, MAX_NONZEROS, MAX_ROWS, ModelError, preparePlacements } from '../core/engine/placements.js';
import { countModel, createWorkspace, fillArena, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */

const SIX_BY_TEN = Array.from({ length: 6 }, () => '#'.repeat(10));
const MiB = 1048576;

/** @param {string} id @param {number} n Straight piece of n cells. */
const line = (id, n) => ({ id, label: id, color: '#000000', cells: Array.from({ length: n }, (_, i) => [i, 0]) });

/** @param {import('../core/engine/workspace.js').Arena} a */
const snapshot = (a) => JSON.stringify([
  a.rows, a.nonzeros, a.columns, [...a.rowCols], [...a.rowStart], [...a.rowPiece], [...a.rowT],
  [...a.rowX], [...a.rowY], [...a.cellColumn], [...a.placementsPerPiece],
]);

/** @param {import('../core/engine/workspace.js').Workspace} ws @param {string[]} rows @param {Piece[]} pieces @param {any[]} clues */
function build(ws, rows, pieces, clues) {
  const plan = preparePlacements(boardFromRows(rows), pieces, clues);
  const arena = ws.reserve(plan);
  fillArena(plan, arena);
  return { plan, arena };
}

test('workspaces are created with a declared ceiling', () => {
  assert.equal(MAIN_WORKSPACE_BYTES, 160 * MiB);
  assert.equal(SCRATCH_WORKSPACE_BYTES, 32 * MiB);
  const ws = createWorkspace(MiB);
  assert.equal(ws.capacityBytes, MiB);
  assert.equal(ws.bytes(), 0);
  assert.throws(() => createWorkspace(-1), RangeError);
  assert.throws(() => createWorkspace(1.5), RangeError);
});

test('countModel equals what a fill writes, including exact bytes', () => {
  const pieces = [...CLASSIC_PENTOMINOES];
  const clues = [{ piece: 'T', x: 3, y: 2, turn: /** @type {0} */ (0), mirrored: false }];
  for (const used of [[], clues]) {
    const counted = countModel(boardFromRows(SIX_BY_TEN), pieces, used);
    const ws = createWorkspace(64 * MiB);
    const { arena } = build(ws, SIX_BY_TEN, pieces, used);
    assert.equal(arena.rows, counted.rows);
    assert.equal(arena.nonzeros, counted.nodes);
    assert.equal(arena.rowStart[arena.rows], counted.nodes);
    assert.equal(arena.rowCols.length, counted.nodes);
    assert.equal(arena.rowPiece.length, counted.rows);
    assert.equal(ws.bytes(), counted.bytes);
    assert.equal([...arena.placementsPerPiece].reduce((a, b) => a + b, 0), counted.rows);
  }
});

test('filled rows are canonical: ascending cells then the piece column, rows sorted', () => {
  const ws = createWorkspace(64 * MiB);
  const { plan, arena } = build(ws, SIX_BY_TEN, [...CLASSIC_PENTOMINOES], []);
  let previous = '';
  for (let r = 0; r < arena.rows; r += 1) {
    const row = [...arena.rowCols.subarray(arena.rowStart[r], arena.rowStart[r + 1])];
    assert.equal(row.length, 6);
    assert.equal(row[5], plan.freeCells + arena.rowPiece[r]);
    assert.ok(row.slice(0, 5).every((c, i, a) => i === 0 || a[i - 1] < c));
    const key = [row[5], ...row.slice(0, 5)].map((n) => String(n).padStart(6, '0')).join('');
    assert.ok(key > previous);
    previous = key;
  }
});

test('a smaller model reuses buffers with no new allocation and refills cleanly', () => {
  const pieces = [...CLASSIC_PENTOMINOES];
  const ws = createWorkspace(64 * MiB);
  build(ws, SIX_BY_TEN, pieces, []);
  const allocations = ws.allocationCount();
  const bytes = ws.bytes();
  const small = ['######', '######', '#####.'];
  const masks = [[], [{ piece: 'I', x: 0, y: 0, turn: /** @type {0} */ (0), mirrored: false }]];
  for (const clues of masks) {
    const reused = build(ws, small, pieces.slice(0, 6), clues);
    const fresh = build(createWorkspace(64 * MiB), small, pieces.slice(0, 6), clues);
    assert.equal(snapshot(reused.arena), snapshot(fresh.arena));
    assert.equal(ws.allocationCount(), allocations);
    assert.equal(ws.bytes(), bytes);
  }
  build(ws, SIX_BY_TEN, pieces, []);
  assert.equal(ws.allocationCount(), allocations);
});

test('growth never lets old plus new buffers exceed the declared capacity', () => {
  const pieces = [...CLASSIC_PENTOMINOES];
  const small = countModel(boardFromRows(['#####', '#####', '#####', '#####']), pieces.slice(0, 4), []);
  const large = countModel(boardFromRows(SIX_BY_TEN), pieces, []);
  assert.ok(small.bytes < large.bytes);
  const capacity = large.bytes + 1024;
  const ws = createWorkspace(capacity);
  build(ws, ['#####', '#####', '#####', '#####'], pieces.slice(0, 4), []);
  assert.ok(ws.bytes() + large.bytes > capacity, 'old and new together would not fit');
  build(ws, SIX_BY_TEN, pieces, []);
  assert.ok(ws.bytes() <= capacity);
  assert.ok(ws.peakBytes() <= capacity);
  build(ws, ['#####', '#####', '#####', '#####'], pieces.slice(0, 4), []);
  assert.ok(ws.peakBytes() <= capacity);
});

test('leftovers from an earlier model are recycled when they would break the ceiling', () => {
  const pieces = [...CLASSIC_PENTOMINOES];
  const side = 60;
  const square = {
    id: 'sq', label: 'sq', color: '#000000',
    cells: Array.from({ length: side * side }, (_, i) => [i % side, Math.floor(i / side)]),
  };
  const grid = Array.from({ length: side }, () => '#'.repeat(side));
  const manyRows = countModel(boardFromRows(SIX_BY_TEN), pieces, []);
  const manyColumns = countModel(boardFromRows(grid), [square], []);
  const capacity = Math.max(manyRows.bytes, manyColumns.bytes) + 2048;
  assert.ok(manyRows.bytes + 0.5 * manyColumns.bytes > capacity, 'per-slot maxima would overflow');
  const ws = createWorkspace(capacity);
  build(ws, SIX_BY_TEN, pieces, []);
  const columnHeavy = build(ws, grid, [square], []);
  assert.equal(columnHeavy.arena.rows, 1);
  assert.ok(ws.bytes() <= capacity);
  const again = build(ws, SIX_BY_TEN, pieces, []);
  assert.equal(again.arena.rows, manyRows.rows);
  assert.ok(ws.bytes() <= capacity);
  assert.ok(ws.peakBytes() <= capacity);
});


test('model-too-large fires before any allocation: byte ceiling', () => {
  const plan = preparePlacements(boardFromRows(SIX_BY_TEN), [...CLASSIC_PENTOMINOES], []);
  const need = countModel(boardFromRows(SIX_BY_TEN), [...CLASSIC_PENTOMINOES], []).bytes;
  const ws = createWorkspace(need - 1);
  assert.throws(() => ws.reserve(plan), (e) => e instanceof ModelError && e.code === 'model-too-large');
  assert.equal(ws.bytes(), 0);
  assert.equal(ws.allocationCount(), 0);
  const exact = createWorkspace(need);
  assert.doesNotThrow(() => exact.reserve(plan));
  assert.equal(exact.bytes(), need);
});

test('model-too-large fires before any allocation: row and nonzero caps', () => {
  const board = boardFromRows(Array.from({ length: 40 }, () => '#'.repeat(40)));
  const monominoes = Array.from({ length: 400 }, (_, i) => line(`m${String(i).padStart(3, '0')}`, 1));
  const rowHeavy = preparePlacements(board, monominoes, []);
  const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
  assert.throws(() => ws.reserve(rowHeavy), (e) => {
    return e instanceof ModelError && e.code === 'model-too-large' && e.details.rows > MAX_ROWS;
  });
  assert.equal(ws.allocationCount(), 0);
  assert.equal(countModel(board, monominoes, []).rows, 1600 * 400);

  const wide = boardFromRows(Array.from({ length: 32 }, () => '#'.repeat(32)));
  const tens = Array.from({ length: 400 }, (_, i) => line(`t${String(i).padStart(3, '0')}`, 10));
  const nonzeroHeavy = preparePlacements(wide, tens, []);
  const counted = countPlacements(nonzeroHeavy);
  assert.ok(counted.rows <= MAX_ROWS && counted.nonzeros > MAX_NONZEROS);
  assert.throws(() => ws.reserve(nonzeroHeavy), (e) => {
    return e instanceof ModelError && e.code === 'model-too-large' && e.details.nonzeros > MAX_NONZEROS;
  });
  assert.equal(ws.bytes(), 0);
});

test('fillArena rejects an arena that does not match its plan', () => {
  const ws = createWorkspace(64 * MiB);
  const plan = preparePlacements(boardFromRows(SIX_BY_TEN), [...CLASSIC_PENTOMINOES], []);
  const arena = ws.reserve(plan);
  assert.throws(() => fillArena(plan, { ...arena, rows: arena.rows - 1 }), ModelError);
  assert.throws(() => fillArena(plan, { ...arena, rows: arena.rows + 1 }), ModelError);
});
