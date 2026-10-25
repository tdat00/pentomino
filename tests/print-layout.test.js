// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { rectangle } from '../core/engine/board.js';
import { packBoard } from '../core/engine/pack.js';
import {
  AREA_HEIGHT, AREA_WIDTH, CELL_MM, FIT_PAGE_MAX_CELL_MM, PAGE_WIDTH, PRINT_SIZES, cellSizeFor, layoutBoard, layoutPieceSheets, layoutPreview,
  mirrorCells, mirrorX, orientModel, planPrint, snapRotation,
} from '../core/browser/print-layout.js';
import { PRINT_TEXTS_EN, PRINT_TEXTS_VI } from '../core/browser/print-texts.js';

const pack = JSON.parse(readFileSync(new URL('../player/samples/sample-pack.json', import.meta.url), 'utf8'));
const board = packBoard(pack);
/** @param {number} rotation */
const sampleJob = (rotation = 0) => ({ board, pieces: pack.pieces, clues: pack.puzzles[0].clues, rotation });
const OPTIONS = { pieces: true, board: true, size: /** @type {const} */ ('medium'), duplex: false };

/**
 * @param {{ x: number, y: number, w: number, h: number }[]} boxes
 * @param {number} gap
 */
function assertSeparate(boxes, gap) {
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const apart = a.x + a.w + gap <= b.x + 1e-6 || b.x + b.w + gap <= a.x + 1e-6 || a.y + a.h + gap <= b.y + 1e-6 || b.y + b.h + gap <= a.y + 1e-6;
      assert.ok(apart, `boxes ${i} and ${j} overlap or touch`);
    }
  }
}

test('45-degree steps are dropped: paper turns only by quarters', () => {
  assert.deepEqual([0, 45, 90, 135, 180, 225, 270, 315, 360, -45, -90].map(snapRotation), [0, 0, 90, 90, 180, 180, 270, 270, 0, 270, 270]);
});

test('turning the view turns the board, the clues and the pieces together', () => {
  for (const rotation of [0, 90, 180, 270]) {
    const model = orientModel(sampleJob(rotation));
    const cells = new Set(model.active.map(([x, y]) => `${x},${y}`));
    assert.equal(cells.size, 60);
    assert.ok(model.clues.length > 0);
    for (const clue of model.clues) {
      assert.ok(clue.cells.every(([x, y]) => cells.has(`${x},${y}`)), `a clue of ${rotation} degrees lies on the board`);
    }
    assert.equal(model.pieces.length, pack.pieces.length);
    assert.equal(model.toPlace.length, pack.pieces.length - pack.puzzles[0].clues.length);
    assert.equal(model.cols * model.rows, 60);
    assert.ok(Math.min(...model.active.map((c) => c[0])) === 0 && Math.min(...model.active.map((c) => c[1])) === 0);
  }
  const upright = orientModel(sampleJob(0));
  const sideways = orientModel(sampleJob(90));
  assert.equal(upright.cols, sideways.rows);
  assert.equal(upright.rows, sideways.cols);
});

test('a cell of the fixed sizes is 10, 15 or 20 mm, and fit-page makes the board one sheet', () => {
  const model = orientModel(sampleJob());
  assert.equal(cellSizeFor(model, 'small').cellMm, CELL_MM.small);
  assert.equal(cellSizeFor(model, 'medium').cellMm, CELL_MM.medium);
  assert.equal(cellSizeFor(model, 'large').cellMm, CELL_MM.large);
  const fit = cellSizeFor(model, 'fit_page').cellMm;
  assert.ok(fit <= FIT_PAGE_MAX_CELL_MM && model.cols * fit <= AREA_WIDTH && model.rows * fit <= AREA_HEIGHT);

  const big = orientModel({ board: rectangle(22, 22), pieces: [], clues: [], rotation: 0 });
  const bigFit = cellSizeFor(big, 'fit_page').cellMm;
  assert.ok(22 * bigFit <= AREA_WIDTH && bigFit > 8);
  assert.equal(layoutBoard(big, bigFit).tiles.length, 1);
});

test('every piece is printed once, inside the margins and apart from the others', () => {
  const model = orientModel(sampleJob());
  for (const cellMm of [10, 15, 20]) {
    const sheets = layoutPieceSheets(model.pieces, cellMm);
    const placed = sheets.flat();
    assert.deepEqual(placed.map((p) => p.item.piece.id).sort(), model.pieces.map((p) => p.piece.id).sort());
    for (const sheet of sheets) {
      assertSeparate(sheet, 4);
      for (const p of sheet) {
        assert.ok(p.x >= 10 - 1e-6 && p.y >= 10 - 1e-6 && p.x + p.w <= 200 + 1e-6 && p.y + p.h <= 287 + 1e-6);
        assert.ok(Math.abs(p.w - p.item.w * cellMm) < 1e-9, 'a printed piece cell is exactly one cell of the board');
      }
    }
  }
});

test('a piece wider than the paper is turned, and the cells shrink when no turn helps', () => {
  const long = { id: 'L', label: 'L', color: '#e6194b', cells: /** @type {[number, number][]} */ (Array.from({ length: 12 }, (_, i) => [i, 0])) };
  const model = orientModel({ board: rectangle(6, 6), pieces: [long], clues: [], rotation: 0 });
  const [sheet] = layoutPieceSheets(model.pieces, 20);
  assert.equal(sheet[0].item.h, 12, 'the 12 x 1 piece lies upright: 240 mm is more than 190 mm');
  const huge = { ...long, cells: /** @type {[number, number][]} */ (Array.from({ length: 30 }, (_, i) => [i, 0])) };
  const crowded = orientModel({ board: rectangle(6, 6), pieces: [huge], clues: [], rotation: 0 });
  const size = cellSizeFor(crowded, 'large');
  assert.equal(size.reduced, true);
  assert.ok(size.cellMm * 30 <= AREA_HEIGHT + 1e-9);
});

test('a big board is cut into parts that cover every playable square once and fit a sheet', () => {
  const model = orientModel({ board: rectangle(22, 22), pieces: [], clues: [], rotation: 0 });
  const { tiles, tilesAcross, tilesDown } = layoutBoard(model, CELL_MM.large);
  assert.equal(tilesAcross, 3);
  assert.equal(tilesDown, 2);
  assert.equal(tiles.reduce((sum, tile) => sum + tile.cells.length, 0), 484);
  for (const tile of tiles) {
    assert.ok(tile.cols * 20 <= AREA_WIDTH && tile.rows * 20 <= AREA_HEIGHT);
    assert.ok(Math.abs(mirrorX(tile.x, tile.cols * 20) - tile.x) < 1e-9, 'the back of a board part lies on its front');
  }
  assert.deepEqual(tiles.map((t) => t.n), [1, 2, 3, 4, 5, 6]);
  // Every joint carries a mark on both parts, at the same place of the whole board.
  const marks = tiles.flatMap((t) => t.joins.map((j) => ({ ...j, from: t.n })));
  const global = (/** @type {number} */ n, /** @type {number} */ x, /** @type {number} */ y) => {
    const t = tiles[n - 1];
    const col = [0, 8, 15][t.tileCol - 1];
    const row = [0, 11][t.tileRow - 1];
    return [col + x, row + y];
  };
  assert.equal(marks.length, 2 * (2 * 2 + 3), 'three parts across and two down share 7 cuts, each a single run');
  for (const m of marks) {
    const back = marks.find((o) => o.from === m.to && o.to === m.from);
    assert.ok(back !== undefined, `part ${m.to} marks its joint with part ${m.from}`);
    const [ax, ay] = global(m.from, m.x, m.y);
    const [bx, by] = global(back.from, back.x, back.y);
    assert.equal(Math.abs(ax - bx) + Math.abs(ay - by), 1, 'the two marks face each other across the cut');
  }
  assert.deepEqual(tiles[0].joins.map((j) => [j.side, j.to]), [['right', 2], ['bottom', 4]]);
});

test('a joint that is open in the middle gets one mark per run of shared cells, and a whole board none', () => {
  // Four parts across (8, 8, 7, 7 columns): the cut between parts 2 and 3 is at column 16; column 15 is open in the middle.
  const active = new Uint8Array(30 * 4).fill(1);
  for (let y = 1; y < 3; y += 1) {
    active[y * 30 + 15] = 0;
  }
  const model = orientModel({ board: { width: 30, height: 4, active }, pieces: [], clues: [], rotation: 0 });
  const { tiles } = layoutBoard(model, 20);
  assert.equal(tiles.length, 4);
  assert.deepEqual(tiles[1].joins.filter((j) => j.to === 3).map((j) => j.y), [0, 3], 'two runs, two marks');
  assert.deepEqual(layoutBoard(model, 5).tiles[0].joins, []);
});

test('blocked parts of a board are not printed', () => {
  const cross = new Uint8Array(30 * 30);
  for (let y = 0; y < 30; y += 1) {
    for (let x = 0; x < 30; x += 1) {
      cross[y * 30 + x] = x < 5 || y < 5 ? 1 : 0;
    }
  }
  const model = orientModel({ board: { width: 30, height: 30, active: cross }, pieces: [], clues: [], rotation: 0 });
  const { tiles, tilesAcross, tilesDown } = layoutBoard(model, 20);
  assert.ok(tiles.length < tilesAcross * tilesDown);
  assert.equal(tiles.reduce((sum, tile) => sum + tile.cells.length, 0), 30 * 5 * 2 - 25);
  assert.deepEqual(model.holes, [], 'blocked cells open to the outside are not holes');
});

test('holes inside the board are kept, turned with it, and land in their board part', () => {
  const active = new Uint8Array(6 * 4).fill(1);
  active[1 * 6 + 4] = 0;
  const board = { width: 6, height: 4, active };
  assert.deepEqual(orientModel({ board, pieces: [], clues: [], rotation: 0 }).holes, [[4, 1]]);
  const turned = orientModel({ board, pieces: [], clues: [], rotation: 90 });
  assert.equal(turned.holes?.length, 1);
  const [[hx, hy]] = /** @type {[number, number][]} */ (turned.holes);
  assert.ok(!turned.active.some(([x, y]) => x === hx && y === hy) && hx < turned.cols && hy < turned.rows, 'the hole stays inside the turned board');
  const { tiles } = layoutBoard(orientModel({ board, pieces: [], clues: [], rotation: 0 }), 40);
  assert.equal(tiles.reduce((sum, tile) => sum + tile.holes.length, 0), 1, 'the hole is in exactly one part');
});

test('the back of a piece is its mirror image, at the mirrored place', () => {
  assert.equal(mirrorX(10, 40), 160);
  assert.deepEqual(mirrorCells([[0, 0], [1, 0], [1, 2]], 2), [[1, 0], [0, 0], [0, 2]]);
  // Mirroring a placed piece twice gives the front again.
  const cells = /** @type {[number, number][]} */ ([[0, 0], [1, 0], [2, 1]]);
  assert.deepEqual(mirrorCells(mirrorCells(cells, 3), 3), cells);
  assert.equal(PAGE_WIDTH - mirrorX(25, 30) - 30, 25);
});

test('the preview fits the page: board, then the pieces to place at one scale', () => {
  const model = orientModel(sampleJob());
  const preview = layoutPreview(model);
  const largest = Math.min(10, AREA_WIDTH / model.cols, 120 / model.rows);
  assert.ok(preview.cellMm <= 0.6 * largest + 1e-9 && preview.cellMm > 1, 'the preview is at most 60 % of the largest the page allows');
  assert.equal(preview.pieces.length, model.toPlace.length);
  assertSeparate(preview.pieces, 0);
  for (const p of preview.pieces) {
    assert.ok(p.y >= preview.sectionY && p.y + p.h <= 297 - 10 - 14 + 1e-6);
  }
  const crowded = orientModel({
    board: rectangle(22, 22),
    pieces: Array.from({ length: 80 }, (_, i) => ({ id: `p${i}`, label: String(i), color: '#3cb44b', cells: /** @type {[number, number][]} */ ([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]]) })),
    clues: [],
    rotation: 0,
  });
  const dense = layoutPreview(crowded);
  assert.ok(dense.cellMm < 6, 'a crowded preview shrinks to fit');
  assert.ok(Math.max(...dense.pieces.map((p) => p.y + p.h)) <= 297 - 10 - 14 + 1e-6);
});

test('the board is turned a quarter when that needs fewer parts or gives bigger cells', () => {
  const large = planPrint(sampleJob(), { ...OPTIONS, size: 'large' });
  assert.equal(large.turned, true, '10 cells of 20 mm are wider than the paper, 6 are not');
  assert.equal(large.boardParts, 1);
  assert.equal(large.model.cols, 6);
  assert.equal(planPrint(sampleJob(), OPTIONS).turned, false);
  const fit = planPrint(sampleJob(), { ...OPTIONS, size: 'fit_page' });
  assert.equal(fit.turned, true);
  assert.equal(fit.cellMm, FIT_PAGE_MAX_CELL_MM);
  assert.equal(planPrint(sampleJob(), { ...OPTIONS, size: 'large', board: false }).turned, false, 'without a board the view is kept');
});

test('the plan lists the sheets and, on two sides, a back after every front (blank behind the preview)', () => {
  const one = planPrint(sampleJob(), OPTIONS);
  assert.equal(one.pages.length, one.sheets.length);
  assert.equal(one.sheets[0].kind, 'preview');
  assert.ok(one.sheets.some((s) => s.kind === 'pieces') && one.sheets.some((s) => s.kind === 'board'));

  const two = planPrint(sampleJob(), { ...OPTIONS, duplex: true });
  assert.equal(two.pages.length, 2 * two.sheets.length);
  two.pages.forEach((page, i) => {
    assert.equal(page.side, i % 2 === 0 ? 'front' : 'back');
    assert.equal(page.sheet, two.sheets[Math.floor(i / 2)]);
  });

  const pieces = planPrint(sampleJob(), { ...OPTIONS, board: false });
  assert.ok(pieces.sheets.every((s) => s.kind !== 'board') && pieces.boardParts === 0);
  const only = planPrint(sampleJob(), { ...OPTIONS, pieces: false, board: false, duplex: true });
  assert.equal(only.pages.length, 1, 'a lone preview has no back');
});

test('the printed board and the printed pieces use the same cell size', () => {
  for (const size of /** @type {const} */ (['small', 'medium', 'large', 'fit_page'])) {
    const plan = planPrint(sampleJob(), { ...OPTIONS, size });
    for (const sheet of plan.sheets) {
      if (sheet.kind === 'pieces') {
        for (const p of sheet.placements) {
          assert.ok(Math.abs(p.w - p.item.w * plan.cellMm) < 1e-9 && Math.abs(p.h - p.item.h * plan.cellMm) < 1e-9);
        }
      }
    }
    const widest = Math.max(...plan.model.pieces.map((p) => Math.max(p.w, p.h)));
    assert.ok(widest * plan.cellMm <= AREA_HEIGHT);
  }
});

test('Print solution puts the solved board right after the puzzle, and on two sides on its back', () => {
  const solution = pack.puzzles[0].solution;
  assert.ok(Array.isArray(solution) && solution.length === pack.pieces.length);
  const without = planPrint({ ...sampleJob(), solution }, OPTIONS);
  const plan = planPrint({ ...sampleJob(), solution }, { ...OPTIONS, solution: true });
  assert.equal(plan.paper, without.paper + 1, 'one sheet more on one side');
  assert.deepEqual(plan.sheets.slice(0, 2).map((s) => s.kind), ['preview', 'solution'], 'the solution follows the puzzle');
  const sheet = plan.sheets[1];
  assert.ok(sheet.kind === 'solution');
  assert.equal(sheet.layout.placed.length, pack.pieces.length);
  const cells = new Set(sheet.layout.placed.flatMap((p) => p.cells.map(([x, y]) => `${x},${y}`)));
  assert.equal(cells.size, plan.model.active.length, 'the solution covers the board exactly');
  assert.ok(plan.model.active.every(([x, y]) => cells.has(`${x},${y}`)));
  assert.ok(sheet.layout.cellMm <= 10 && sheet.layout.boardX + plan.model.cols * sheet.layout.cellMm <= 200 + 1e-9);

  const duplex = planPrint({ ...sampleJob(), solution }, { ...OPTIONS, solution: true, duplex: true });
  const plainDuplex = planPrint({ ...sampleJob(), solution }, { ...OPTIONS, duplex: true });
  assert.deepEqual(duplex.pages.slice(0, 3).map((p) => `${p.sheet.kind}:${p.side}`), ['preview:front', 'solution:front', 'pieces:front'],
    'two sides: the solution is the back of the puzzle, with no blank page');
  assert.equal(duplex.paper, plainDuplex.paper, 'and no extra sheet');
  assert.equal(duplex.pages.length, plainDuplex.pages.length);
  assert.equal(plainDuplex.pages[1].side, 'back', 'without the solution the back of the puzzle stays blank');
  assert.equal(planPrint({ ...sampleJob(), solution: null }, { ...OPTIONS, solution: true }).paper, without.paper, 'no solution, no sheet');
});

test('the texts of the dialog exist in both languages with the same placeholders', () => {
  assert.deepEqual(Object.keys(PRINT_TEXTS_VI).sort(), Object.keys(PRINT_TEXTS_EN).filter((k) => !k.endsWith('_one')).sort());
  for (const [key, text] of Object.entries(PRINT_TEXTS_VI)) {
    const holes = (/** @type {string} */ s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(holes(text), holes(PRINT_TEXTS_EN[key]), key);
  }
  for (const id of PRINT_SIZES) {
    assert.ok(PRINT_TEXTS_EN[`print.size.${id}`] && PRINT_TEXTS_VI[`print.size.${id}`], `the size ${id} has a name`);
  }
});
