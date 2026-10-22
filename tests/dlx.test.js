// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { poseCells } from '../core/engine/geometry.js';
import { ExactCover } from '../core/engine/dlx.js';
import { preparePlacements } from '../core/engine/placements.js';
import { createRng } from '../core/engine/rng.js';
import { createWorkspace, fillArena } from '../core/engine/workspace.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

const MiB = 1048576;

/**
 * @param {number} columns
 * @param {number[][]} rows
 * @param {import('../core/engine/workspace.js').Workspace} [ws]
 */
function cover(columns, rows, ws = createWorkspace(16 * MiB)) {
  const start = new Int32Array(rows.length + 1);
  rows.forEach((r, i) => {
    start[i + 1] = start[i] + r.length;
  });
  return new ExactCover(ws, columns, Int32Array.from(rows.flat()), start, rows.length);
}

/** @param {{ solutions: Int32Array[] }} result */
const solutionSet = (result) => result.solutions.map((s) => [...s].sort((a, b) => a - b).join(',')).sort();

/** Subset-enumeration oracle: every row subset whose columns are covered exactly once. */
function oracle(/** @type {number} */ columns, /** @type {number[][]} */ rows) {
  /** @type {string[]} */
  const out = [];
  for (let mask = 0; mask < 1 << rows.length; mask += 1) {
    const seen = new Array(columns).fill(0);
    const chosen = [];
    for (let r = 0; r < rows.length; r += 1) {
      if ((mask >> r) & 1) {
        chosen.push(r);
        rows[r].forEach((c) => {
          seen[c] += 1;
        });
      }
    }
    if (seen.every((n) => n === 1)) {
      out.push(chosen.join(','));
    }
  }
  return out.sort();
}

/** @param {ExactCover} c */
const links = (c) => JSON.stringify(['L', 'R', 'U', 'D', 'S'].map((k) => [...(/** @type {any} */ (c).v)[k]]));

const KNUTH = [[2, 4, 5], [0, 3, 6], [1, 2, 5], [0, 3], [1, 6], [3, 4, 6]];

test("Knuth's example has the single cover {A,D,E} (rows 0, 3, 4)", () => {
  const c = cover(7, KNUTH);
  const r = c.solve({ maxSolutions: Infinity });
  assert.deepEqual(solutionSet(r), ['0,3,4']);
  assert.equal(r.found, 1);
  assert.equal(r.exhausted, true);
  assert.equal(r.stop, 'exhausted');
});

test('exhaustive tiny Boolean matrices agree with the subset oracle, canonical and seeded', () => {
  const rng = createRng('dlx-oracle');
  for (let trial = 0; trial < 300; trial += 1) {
    const columns = rng.int(6);
    const rowCount = rng.int(9);
    /** @type {number[][]} */
    const rows = [];
    for (let r = 0; r < rowCount; r += 1) {
      const row = [];
      for (let c = 0; c < columns; c += 1) {
        if (rng.int(3) === 0) {
          row.push(c);
        }
      }
      if (row.length > 0) {
        rows.push(rng.shuffle(row));
      }
    }
    const want = oracle(columns, rows);
    const c = cover(columns, rows);
    const canonical = c.solve({ maxSolutions: Infinity });
    assert.deepEqual(solutionSet(canonical), want, `trial ${trial}`);
    assert.equal(canonical.exhausted, true);
    const seeded = c.solve({ maxSolutions: Infinity, rng: createRng(`s${trial}`) });
    assert.deepEqual(solutionSet(seeded), want, `seeded trial ${trial}`);
    assert.equal(seeded.exhausted, true);
  }
});

test('empty exact cover, zero-size columns and limit zero', () => {
  const empty = cover(0, []).solve({ maxSolutions: Infinity });
  assert.equal(empty.found, 1);
  assert.deepEqual([...empty.solutions[0]], []);
  assert.equal(empty.exhausted, true);
  const first = cover(0, []).solve();
  assert.equal(first.found, 1);
  assert.equal(first.stop, 'solution-limit');
  assert.equal(first.exhausted, false);

  const noRows = cover(3, []).solve({ maxSolutions: Infinity });
  assert.deepEqual([noRows.found, noRows.exhausted, noRows.stop], [0, true, 'exhausted']);
  const zeroColumn = cover(3, [[0], [1]]).solve({ maxSolutions: Infinity });
  assert.deepEqual([zeroColumn.found, zeroColumn.exhausted, zeroColumn.rowTrials], [0, true, 0]);

  const c = cover(7, KNUTH);
  const noWork = c.solve({ rowTrialLimit: 0 });
  assert.deepEqual([noWork.found, noWork.rowTrials, noWork.exhausted, noWork.stop], [0, 0, false, 'row-limit']);
  const noSolutions = c.solve({ maxSolutions: 0 });
  assert.deepEqual([noSolutions.found, noSolutions.rowTrials, noSolutions.exhausted, noSolutions.stop], [0, 0, false, 'solution-limit']);
  const noBranch = c.solve({ branchTrialLimit: 0 });
  assert.deepEqual([noBranch.found, noBranch.branchTrials, noBranch.exhausted, noBranch.stop], [0, 0, false, 'branch-limit']);
});

test('stopping at a solution never claims exhaustion; two found and full exhaustion differ', () => {
  const rows = [[0], [0], [1], [1]];
  const c = cover(2, rows);
  const one = c.solve();
  assert.deepEqual([one.found, one.exhausted, one.stop], [1, false, 'solution-limit']);
  const two = c.solve({ maxSolutions: 2 });
  assert.deepEqual([two.found, two.exhausted, two.stop], [2, false, 'solution-limit']);
  const all = c.solve({ maxSolutions: 10 });
  assert.deepEqual([all.found, all.exhausted, all.stop], [4, true, 'exhausted']);
  assert.deepEqual(solutionSet(all), ['0,2', '0,3', '1,2', '1,3']);
  const unique = cover(2, [[0], [1]]).solve({ maxSolutions: 2 });
  assert.deepEqual([unique.found, unique.exhausted], [1, true]);
});

test('forced rows are row trials only; branching rows count as branch trials', () => {
  const forced = cover(3, [[0], [1], [2]]).solve();
  assert.deepEqual([forced.rowTrials, forced.branchTrials, forced.found], [3, 0, 1]);

  // Column 1 is forced first, then column 0 chooses between two rows.
  const rows = [[0], [0], [1]];
  const c = cover(2, rows);
  const full = c.solve({ maxSolutions: Infinity });
  assert.deepEqual([full.rowTrials, full.branchTrials, full.found], [3, 2, 2]);
  const firstOnly = c.solve();
  assert.deepEqual([firstOnly.rowTrials, firstOnly.branchTrials], [2, 1]);

  const branchStop = c.solve({ maxSolutions: Infinity, branchTrialLimit: 1 });
  assert.deepEqual([branchStop.stop, branchStop.exhausted, branchStop.found, branchStop.branchTrials, branchStop.rowTrials],
    ['branch-limit', false, 1, 1, 2]);
  const rowStop = c.solve({ maxSolutions: Infinity, rowTrialLimit: 2 });
  assert.deepEqual([rowStop.stop, rowStop.exhausted, rowStop.found, rowStop.rowTrials], ['row-limit', false, 1, 2]);
  // A limit equal to the work needed still completes and proves exhaustion.
  const exact = c.solve({ maxSolutions: Infinity, rowTrialLimit: 3, branchTrialLimit: 2 });
  assert.deepEqual([exact.stop, exact.exhausted, exact.found], ['exhausted', true, 2]);
});

test('every stop restores the links, so re-solving matches a fresh instance', () => {
  const rows = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2], [4], [4, 5], [5], [0], [1], [2], [3]];
  const c = cover(6, rows);
  const before = links(c);
  const fresh = cover(6, rows).solve({ maxSolutions: Infinity });
  const stops = [
    { rowTrialLimit: 1 }, { rowTrialLimit: 4 }, { branchTrialLimit: 1 }, { branchTrialLimit: 3 },
    { maxSolutions: 1 }, { maxSolutions: 3 }, { rowTrialLimit: 0 }, { maxSolutions: 0 },
  ];
  for (const limits of stops) {
    c.solve({ maxSolutions: 5, ...limits });
    assert.equal(links(c), before, JSON.stringify(limits));
    c.solve({ maxSolutions: 5, rng: createRng('a'), ...limits });
    assert.equal(links(c), before, `seeded ${JSON.stringify(limits)}`);
  }
  assert.throws(() => c.solve({ maxSolutions: Infinity, onSolution: () => {
    throw new Error('boom');
  } }), /boom/);
  assert.equal(links(c), before);
  assert.throws(() => c.solve({ maxSolutions: Infinity, progressEvery: 1, onProgress: () => {
    throw new Error('stop');
  } }), /stop/);
  assert.equal(links(c), before);
  const again = c.solve({ maxSolutions: Infinity });
  assert.deepEqual(again.solutions.map((s) => [...s]), fresh.solutions.map((s) => [...s]));
  assert.deepEqual([again.rowTrials, again.branchTrials], [fresh.rowTrials, fresh.branchTrials]);
});

test('canonical mode consumes no RNG; seeded mode is deterministic and valid', () => {
  const rows = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2], [0], [1], [2], [3]];
  const c = cover(4, rows);
  const rng = createRng('unused');
  const spy = { ...rng, int: () => {
    throw new Error('rng used');
  } };
  assert.doesNotThrow(() => c.solve({ maxSolutions: Infinity, rng: null }));
  assert.doesNotThrow(() => c.solve({ maxSolutions: Infinity }));
  assert.throws(() => c.solve({ rng: /** @type {any} */ (spy) }), /rng used/);

  const want = oracle(4, rows);
  const orders = new Set();
  for (const seed of ['x', 'y', 'z', 'w']) {
    const a = c.solve({ maxSolutions: Infinity, rng: createRng(seed) });
    const b = c.solve({ maxSolutions: Infinity, rng: createRng(seed) });
    assert.deepEqual(a.solutions.map((s) => [...s]), b.solutions.map((s) => [...s]));
    assert.equal(a.rowTrials, b.rowTrials);
    assert.deepEqual(solutionSet(a), want);
    orders.add(JSON.stringify(a.solutions.map((s) => [...s])));
    for (const s of c.solve({ rng: createRng(seed) }).solutions) {
      assert.ok(want.includes([...s].sort((x, y) => x - y).join(',')));
    }
  }
  assert.ok(orders.size > 1, 'different seeds explore in different orders');
});

test('results and callbacks receive stable copies; progress fires every N row trials', () => {
  const rows = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
  const c = cover(4, rows);
  /** @type {Int32Array[]} */
  const seen = [];
  const r = c.solve({ maxSolutions: Infinity, onSolution: (s) => {
    seen.push(s);
    s.fill(99);
  } });
  assert.equal(seen.length, r.found);
  for (const s of r.solutions) {
    assert.ok([...s].every((n) => n >= 0 && n < rows.length));
  }
  /** @type {number[]} */
  const ticks = [];
  const full = cover(6, [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2], [4], [4, 5], [5], [0], [1], [2], [3]])
    .solve({ maxSolutions: Infinity, progressEvery: 3, onProgress: (n) => ticks.push(n) });
  assert.equal(ticks.length, Math.floor(full.rowTrials / 3));
  assert.deepEqual(ticks, ticks.map((_, i) => 3 * (i + 1)));
});

test('results are identical for a fresh and a reused workspace with other column counts', () => {
  const rows = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
  const ws = createWorkspace(16 * MiB);
  cover(40, Array.from({ length: 200 }, (_, i) => [i % 40, (i * 7 + 1) % 40]).filter((r) => r[0] !== r[1]), ws).solve({ rowTrialLimit: 50 });
  const reused = cover(4, rows, ws).solve({ maxSolutions: Infinity });
  const fresh = cover(4, rows).solve({ maxSolutions: Infinity });
  assert.deepEqual(reused.solutions.map((s) => [...s]), fresh.solutions.map((s) => [...s]));
  assert.deepEqual(oracle(4, rows), solutionSet(reused));
});

test('malformed matrices are rejected', () => {
  const ws = createWorkspace(MiB);
  const make = (/** @type {number} */ columns, /** @type {number[]} */ cols, /** @type {number[]} */ start) =>
    () => new ExactCover(ws, columns, Int32Array.from(cols), Int32Array.from(start), start.length - 1);
  assert.throws(make(2, [0, 0], [0, 2]), RangeError);
  assert.throws(make(2, [0, 2], [0, 2]), RangeError);
  assert.throws(make(2, [0, -1], [0, 2]), RangeError);
  assert.throws(make(2, [0, 1], [0, 2, 1]), RangeError);
  assert.throws(() => cover(2, [[0]]).solve({ maxSolutions: -1 }), RangeError);
  assert.throws(() => cover(2, [[0]]).solve({ rowTrialLimit: NaN }), RangeError);
});

/**
 * @param {string[]} rows
 * @param {number} limit
 * @param {{ rowTrialLimit?: number }} [extra]
 */
function tile(rows, limit = Infinity, extra = {}) {
  const board = boardFromRows(rows);
  const pieces = [...CLASSIC_PENTOMINOES];
  const plan = preparePlacements(board, pieces, []);
  const ws = createWorkspace(64 * MiB);
  const arena = ws.reserve(plan);
  fillArena(plan, arena);
  const dlx = new ExactCover(ws, plan.columns, arena.rowCols, arena.rowStart, arena.rows);
  const result = dlx.solve({ maxSolutions: limit, ...extra });
  return { plan, arena, result, board, pieces };
}

test('pentomino tilings of 3x20 give the 8 golden covers; no cell or piece is reused', () => {
  const { plan, arena, result } = tile(Array.from({ length: 3 }, () => '#'.repeat(20)));
  assert.equal(result.found, 8);
  assert.equal(result.exhausted, true);
  const seen = new Set();
  for (const s of result.solutions) {
    assert.equal(s.length, 12);
    const cells = new Set();
    const used = new Set();
    for (const row of s) {
      used.add(arena.rowPiece[row]);
      const source = CLASSIC_PENTOMINOES[plan.freePieceSource[arena.rowPiece[row]]];
      const t = arena.rowT[row];
      const pose = { piece: source.id, x: arena.rowX[row], y: arena.rowY[row], turn: /** @type {0 | 1 | 2 | 3} */ (t & 3), mirrored: t >= 4 };
      for (const [x, y] of poseCells(source, pose)) {
        assert.ok(x >= 0 && x < 20 && y >= 0 && y < 3);
        cells.add(`${x},${y}`);
      }
    }
    assert.equal(cells.size, 60);
    assert.equal(used.size, 12);
    seen.add([...s].sort((a, b) => a - b).join(','));
  }
  assert.equal(seen.size, 8);
});

test('a seeded tiling search enumerates the same covers and restores its links', () => {
  const rows = Array.from({ length: 3 }, () => '#'.repeat(20));
  const canonical = tile(rows);
  const board = boardFromRows(rows);
  const plan = preparePlacements(board, [...CLASSIC_PENTOMINOES], []);
  const ws = createWorkspace(64 * MiB);
  const arena = ws.reserve(plan);
  fillArena(plan, arena);
  const dlx = new ExactCover(ws, plan.columns, arena.rowCols, arena.rowStart, arena.rows);
  const before = links(dlx);
  const seeded = dlx.solve({ maxSolutions: Infinity, rng: createRng('tiling') });
  assert.equal(seeded.exhausted, true);
  assert.deepEqual(solutionSet(seeded), solutionSet(canonical.result));
  assert.equal(links(dlx), before);
  const again = dlx.solve({ maxSolutions: Infinity, rng: createRng('tiling') });
  assert.deepEqual(again.solutions.map((s) => [...s]), seeded.solutions.map((s) => [...s]));
});

test('a capped tiling search reports a limit, never impossibility', () => {
  const rows = Array.from({ length: 6 }, () => '#'.repeat(10));
  const capped = tile(rows, 1, { rowTrialLimit: 200 });
  assert.equal(capped.result.stop, 'row-limit');
  assert.equal(capped.result.exhausted, false);
  assert.equal(capped.result.rowTrials, 200);
  const first = tile(rows, 1);
  assert.deepEqual([first.result.found, first.result.exhausted], [1, false]);
});
