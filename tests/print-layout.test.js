// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { rectangle } from '../core/engine/board.js';
import { packBoard } from '../core/engine/pack.js';
import {
  AREA_HEIGHT, AREA_WIDTH, CELL_MM, FIT_PAGE_MAX_CELL_MM, PAGE_WIDTH, cellSizeFor, layoutBoard, layoutPieceSheets, layoutPreview,
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
  assert.ok(preview.cellMm <= 10 && preview.cellMm > 1);
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
  assert.ok(dense.cellMm < 10, 'a crowded preview shrinks to fit');
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

test('the texts of the dialog exist in both languages with the same placeholders', () => {
  assert.deepEqual(Object.keys(PRINT_TEXTS_VI).sort(), Object.keys(PRINT_TEXTS_EN).filter((k) => !k.endsWith('_one')).sort());
  for (const [key, text] of Object.entries(PRINT_TEXTS_VI)) {
    const holes = (/** @type {string} */ s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(holes(text), holes(PRINT_TEXTS_EN[key]), key);
  }
  for (const [id, mm] of Object.entries(CELL_MM)) {
    assert.ok(PRINT_TEXTS_EN[`print.size.${id}`].includes(`${mm} mm`), `the size name of ${id} states its cell size`);
    assert.ok(PRINT_TEXTS_VI[`print.size.${id}`].includes(`${mm} mm`));
  }
});
