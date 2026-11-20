// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { rectangle } from '../core/engine/board.js';
import { packBoard } from '../core/engine/pack.js';
import {
  AREA_HEIGHT, AREA_WIDTH, CELL_MM, FIT_PAGE_MAX_CELL_MM, PAGE_WIDTH, PREVIEW_BOTTOM, PRINT_SIZES, cellSizeFor,
  estimateTextWidth, fitText, layoutBoard, layoutPieceSheets, layoutPreview, mirrorCells, mirrorX, orientModel, planPrint,
  snapRotation, titleBlock, wrapTitle, framesFor, planPrintMany, FRAME_GAP_MM, PAGE_MARGIN,
} from '../core/browser/print-layout.js';
import { PRINT_TEXTS_EN, PRINT_TEXTS_VI } from '../core/browser/print-texts.js';
import { makePuzzleQr } from '../core/browser/qr.js';

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

// ---- The heading and the code band of the first sheet (RP05) --------------------------------------------------------

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** @param {number} length */
const symbols = (length) => ALPHABET.repeat(Math.ceil(length / ALPHABET.length)).slice(0, length);

/**
 * A prepared share built with the real QR adapter, from a code of the given lengths.
 * @param {string} C
 * @param {string | null} T
 * @returns {import('../core/browser/puzzle-snapshot.js').PreparedPuzzleShare}
 */
function shareOf(C, T) {
  const F = T === null ? C : `${C}.${T}`;
  const made = makePuzzleQr({ urlPrefix: 'https://tdat00.github.io/pentomino/player/#p=', code: F, ec: 'M' });
  assert.ok(made.ok, 'the code fits a QR symbol');
  return { code: { C, T, F, version: 1 }, url: `https://tdat00.github.io/pentomino/player/#p=${F}`, carried: T === null ? 'C' : 'C.T', qr: made.value, notices: [] };
}

/** @param {number} count */
const details = (count) => Array.from({ length: count }, (_, i) => [{ text: `detail ${i}` }]);

test('the first sheet follows the mock-up: baselines, QR column and preview top; the code and the address are not printed', () => {
  const share = shareOf('1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR', '18V3WE');
  const plan = planPrint({ ...sampleJob(), title: 'Easy #1', details: details(1), share }, OPTIONS);
  const { band } = plan;
  assert.deepEqual(band.head.baselines, [19]);
  assert.deepEqual(band.head.detailBaselines, [26.5]);
  assert.deepEqual(band.qr, { x: 10, y: 10, size: 25, scanY: 39.5, columnEnd: 42 }, 'the QR box at the left and its one caption: no host line under it');
  assert.deepEqual([band.head.x, band.head.width], [41, 159], 'the heading starts 6 mm to the right of the QR');
  assert.equal(band.noCodeY, null);
  assert.equal(band.bottom, 42, 'the QR column ends the band');
  assert.equal(band.top, 46, 'the preview starts 4 mm under the band');
  assert.equal(plan.preview.boardY, 46);
  assert.deepEqual(Object.keys(band).sort(), ['bottom', 'head', 'noCodeY', 'qr', 'top'], 'no typed code, no continuation sheets');
  assert.deepEqual(plan.sheets.map((s) => s.kind).slice(0, 2), ['preview', 'pieces'], 'and no sheet for the code');
  const none = planPrint({ ...sampleJob(), title: 'Easy #1', details: [], share }, OPTIONS).band;
  assert.equal(none.head.lastBaseline, 19);
  assert.equal(none.top, 46);
});

test('a bigger QR box (version 11, version 40) narrows the heading, and the band covers its column', () => {
  const v11 = shareOf(symbols(120), symbols(30));
  const big = planPrint({ ...sampleJob(), title: 'Big', details: details(1), share: v11 }, OPTIONS);
  assert.ok(big.band.qr !== null && big.band.qr.size >= 25);
  assert.equal(big.band.head.width, AREA_WIDTH - 6 - big.band.qr.size);

  const v40 = shareOf(symbols(3000), symbols(300));
  assert.equal(v40.qr?.version, 40);
  assert.equal(v40.qr?.outerMm, 92.5);
  const plan = planPrint({ ...sampleJob(), title: 'Version forty', details: details(1), share: v40 }, OPTIONS);
  assert.deepEqual(plan.band.qr, { x: 10, y: 10, size: 92.5, scanY: 107, columnEnd: 109.5 });
  assert.deepEqual([plan.band.head.x, plan.band.head.width], [108.5, 91.5]);
  assert.equal(plan.band.top, 113.5);
  assert.ok(PREVIEW_BOTTOM - plan.preview.boardY > 150, 'the preview keeps plenty of room');
});

test('the band covers the QR column for every code, title and number of detail lines', () => {
  for (const [C, T] of [[symbols(12), null], [symbols(60), symbols(20)], [symbols(300), symbols(90)], [symbols(1500), symbols(300)], [symbols(3000), symbols(321)], [symbols(3300), null]]) {
    const share = shareOf(C, T);
    for (const count of [0, 1, 2]) {
      for (const title of ['X', 'A title that needs more than one line because it is rather long, as titles go, yes it is', 'W'.repeat(80)]) {
        const plan = planPrint({ ...sampleJob(), title, details: details(count), share }, OPTIONS);
        const { band } = plan;
        assert.equal(plan.preview.boardY, band.top);
        const qrEnd = band.qr?.columnEnd ?? 0;
        assert.ok(band.bottom >= qrEnd, 'the band covers the QR column');
        assert.ok(band.bottom >= band.head.lastBaseline + 2 - 1e-9, 'and the heading');
        const lines = band.head.lines;
        assert.ok(lines.length >= 1 && lines.length <= 3);
        for (const [i, text] of lines.entries()) {
          assert.ok(estimateTextWidth(text, 8, true) <= band.head.width + 1e-9, `title line ${i} fits ${band.head.width} mm`);
        }
      }
    }
  }
});

test('without a QR the band holds the heading and the "too large" line; without a share there is no band at all', () => {
  const none = { ...shareOf(symbols(40), null), qr: null, url: null };
  const plan = planPrint({ ...sampleJob(), title: 'Huge', details: details(2), share: none }, OPTIONS);
  assert.equal(plan.band.qr, null);
  assert.equal(plan.band.noCodeY, 38, 'under the details');
  assert.equal(plan.band.head.width, 190, 'no QR column, so the full width');
  assert.equal(plan.band.head.x, 10, 'and the heading at the margin');
  assert.equal(plan.preview.boardY, 44);
  const bare = planPrint(sampleJob(), OPTIONS);
  assert.equal(bare.preview.boardY, 40, 'a job without a title keeps today\'s preview top');
  assert.equal(bare.band.noCodeY, null);
  const titled = planPrint({ ...sampleJob(), title: 'Easy #1', details: details(2) }, OPTIONS);
  assert.equal(titled.preview.boardY, 40, 'no code asked: the heading alone ends at 34 mm, the old top is kept');
});

test('long titles wrap at spaces in three lines, break unbroken words between code points and end with an ellipsis', () => {
  const width = 100;
  const lines = wrapTitle('The quick brown fox jumps over the lazy dog and then keeps running', width, estimateTextWidth);
  assert.ok(lines.length > 1 && lines.length <= 3);
  assert.ok(lines.every((line) => estimateTextWidth(line, 8, true) <= width), 'every line fits');
  assert.equal(lines.slice(0, -1).some((line) => line.endsWith(' ')), false);
  const unbroken = wrapTitle('W'.repeat(80), width, estimateTextWidth);
  assert.equal(unbroken.length, 3);
  assert.ok(unbroken[2].endsWith('…'), 'the third line carries the ellipsis');
  assert.ok(unbroken.every((line) => estimateTextWidth(line, 8, true) <= width));
  const astral = wrapTitle('😀'.repeat(60), width, estimateTextWidth);
  assert.ok(astral.every((line) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(line)), 'no surrogate pair is split');
  assert.ok(astral.every((line) => estimateTextWidth(line, 8, true) <= width));
  assert.deepEqual(wrapTitle('Hard #3', width, estimateTextWidth), ['Hard #3']);
  assert.deepEqual(wrapTitle('  spaced   out  ', width, estimateTextWidth), ['spaced out']);
  assert.equal(fitText('abcdefghij', 1000, 3, false, estimateTextWidth), 'abcdefghij');
  assert.ok(fitText('abcdefghij'.repeat(20), 20, 3, false, estimateTextWidth).endsWith('…'));
  const block = titleBlock('Hard #3', 2, 159, estimateTextWidth);
  assert.deepEqual([block.baselines, block.detailBaselines, block.lastBaseline], [[19], [26.5, 32], 32]);
  const three = titleBlock('W'.repeat(80), 2, 91.5, estimateTextWidth);
  assert.deepEqual([three.baselines, three.detailBaselines], [[19, 28, 37], [44.5, 50]], 'the title\'s 9 mm pitch, the details 7.5 mm under it');
});

test('the code adds no sheet: the order, the blank backs and the paper count are the same with or without it', () => {
  const solution = pack.puzzles[0].solution;
  const share = shareOf(symbols(3000), symbols(300));
  const job = { ...sampleJob(), title: 'Long', details: details(2), share, solution };
  const kinds = (/** @type {ReturnType<typeof planPrint>} */ plan) => plan.sheets.map((s) => s.kind);

  const one = planPrint(job, { ...OPTIONS, solution: true });
  assert.deepEqual(kinds(one).slice(0, 2), ['preview', 'solution'], 'one side: the puzzle, then the solution');
  assert.equal(one.pages.length, one.sheets.length);
  assert.ok(one.pages.every((p) => p.side === 'front'));

  const two = planPrint(job, { ...OPTIONS, solution: true, duplex: true });
  assert.deepEqual(two.pages.slice(0, 3).map((p) => `${p.sheet.kind}:${p.side}`), ['preview:front', 'solution:front', 'pieces:front'], 'two sides: the solution is the back of the puzzle');
  const plain = planPrint(job, { ...OPTIONS, duplex: true });
  assert.equal(plain.pages[1].side, 'back');
  assert.equal(plain.pages[1].sheet.kind, 'preview', 'the back of the puzzle sheet is blank');
  for (const plan of [two, plain]) {
    plan.pages.forEach((page, i) => {
      if (page.sheet.kind === 'pieces' || page.sheet.kind === 'board') {
        assert.equal(page.side === 'front' ? i % 2 : (i + 1) % 2, 0, 'a piece or board sheet keeps its mirrored back on the same leaf');
        assert.equal(plan.pages[page.side === 'front' ? i + 1 : i - 1].sheet, page.sheet);
      }
    });
  }
  const without = (/** @type {Parameters<typeof planPrint>[1]} */ options) => planPrint({ ...job, share: undefined }, options);
  assert.equal(plain.paper, without({ ...OPTIONS, duplex: true }).paper);
  assert.equal(two.paper, without({ ...OPTIONS, duplex: true, solution: true }).paper);
  assert.equal(planPrint(job, OPTIONS).paper, without(OPTIONS).paper);
});

test('the solution sheet keeps its own header and its top of 40 mm, whatever the code band takes', () => {
  const solution = pack.puzzles[0].solution;
  const share = shareOf(symbols(3000), symbols(300));
  const plan = planPrint({ ...sampleJob(), title: 'W'.repeat(80), details: details(2), share, solution }, { ...OPTIONS, solution: true });
  const sheet = plan.sheets.find((s) => s.kind === 'solution');
  assert.ok(sheet?.kind === 'solution');
  assert.equal(sheet.layout.boardY, 40);
  assert.ok(plan.preview.boardY > 100, 'while the puzzle sheet starts lower');
});

test('every option, size and angle keeps the first sheet inside the page: the band, then the preview', () => {
  const share = shareOf(symbols(3000), symbols(300));
  for (const rotation of [0, 45, 90, 135, 180, 225, 270, 315]) {
    for (const size of PRINT_SIZES) {
      for (const [pieces, boardOn, duplex] of [[true, true, false], [true, false, true], [false, true, true], [false, false, false]]) {
        const plan = planPrint({ ...sampleJob(rotation), title: 'Puzzle #1', details: details(2), share }, { pieces, board: boardOn, size, duplex });
        assert.ok(plan.preview.boardY >= plan.band.bottom + 4 - 1e-9);
        assert.ok(plan.preview.boardY + plan.model.rows * plan.preview.cellMm <= 273 + 1e-6, 'the board ends above the footer');
        for (const p of plan.preview.pieces) {
          assert.ok(p.y >= plan.preview.sectionY && p.y + p.h <= 273 + 1e-6, 'the pieces to place end above the footer');
        }
        assert.equal(plan.cellMm, planPrint({ ...sampleJob(rotation) }, { pieces, board: boardOn, size, duplex }).cellMm, 'the cut-out scale does not depend on the code');
      }
    }
  }
});

// ---- Several puzzles, one, two or four to a sheet ---------------------------------------------------------------------

/** @param {number} count @param {import('../core/browser/puzzle-snapshot.js').PreparedPuzzleShare | undefined} [share] */
const puzzleJobs = (count, share) => Array.from({ length: count }, (_, i) => {
  const source = pack.puzzles[i % pack.puzzles.length];
  return { ...sampleJob(), clues: source.clues, solution: source.solution, title: `Puzzle #${i + 1}`, details: details(1), share };
});

test('one puzzle through planPrintMany is the plan of planPrint', () => {
  const [job] = puzzleJobs(1);
  for (const options of [OPTIONS, { ...OPTIONS, duplex: true, solution: true }]) {
    const a = planPrint(job, options);
    const b = planPrintMany([job], options);
    assert.deepEqual(b.sheets.map((s) => s.kind), a.sheets.map((s) => s.kind));
    assert.deepEqual(b.pages.map((p) => [p.sheet.kind, p.side]), a.pages.map((p) => [p.sheet.kind, p.side]));
    assert.equal(b.paper, a.paper);
    assert.deepEqual(b.sheets[0], { kind: 'preview', items: [{ puzzle: 0, dx: 0, dy: 0 }] });
  }
});

test('the frames of 2 and 4 puzzles lie inside the page, apart from each other', () => {
  assert.deepEqual(framesFor(1).slots, [{ dx: 0, dy: 0, col: 0 }]);
  for (const perPage of /** @type {const} */ ([2, 4])) {
    const { frame, slots } = framesFor(perPage);
    assert.equal(slots.length, perPage);
    const boxes = slots.map((s) => ({ x: PAGE_MARGIN + s.dx, y: PAGE_MARGIN + s.dy, w: frame.width, h: frame.bottom - PAGE_MARGIN }));
    assertSeparate(boxes, FRAME_GAP_MM - 1e-6);
    for (const box of boxes) {
      assert.ok(box.x >= PAGE_MARGIN - 1e-9 && box.x + box.w <= PAGE_WIDTH - PAGE_MARGIN + 1e-9, 'inside the margins across');
      assert.ok(box.y + box.h <= PREVIEW_BOTTOM + 1e-9, 'above the footer');
    }
  }
});

test('puzzles are grouped by the page, each followed by its solutions; the piece set and the board are printed once', () => {
  const jobs = puzzleJobs(5);
  const one = planPrintMany(jobs, { ...OPTIONS, solution: true, perPage: 1 });
  assert.deepEqual(one.sheets.map((s) => s.kind), ['preview', 'solution', 'preview', 'solution', 'preview', 'solution', 'preview', 'solution', 'preview', 'solution',
    ...one.sheets.slice(10).map((s) => s.kind)]);
  assert.equal(one.sheets.filter((s) => s.kind === 'pieces').length, planPrint(jobs[0], OPTIONS).sheets.filter((s) => s.kind === 'pieces').length);
  assert.equal(one.paper, planPrint(jobs[0], { ...OPTIONS, solution: true }).paper + 8, 'four more puzzles and solutions, nothing else more');

  for (const [perPage, groups] of /** @type {const} */ ([[2, 3], [4, 2]])) {
    const plan = planPrintMany(jobs, { ...OPTIONS, solution: true, perPage });
    const puzzleSheets = plan.sheets.filter((s) => s.kind === 'preview');
    assert.equal(puzzleSheets.length, groups);
    assert.deepEqual(puzzleSheets.flatMap((s) => (s.kind === 'preview' ? s.items.map((i) => i.puzzle) : [])), [0, 1, 2, 3, 4], 'in order, none lost');
    assert.deepEqual(plan.sheets.slice(0, 2 * groups).map((s) => s.kind), Array.from({ length: groups }, () => ['preview', 'solution']).flat());
    assert.equal(plan.perPage, perPage);
    const alone = planPrint(jobs[0], { ...OPTIONS, solution: true });
    assert.equal(plan.paper, alone.paper - 2 + 2 * groups, 'the paper of the puzzle and solution sheets, then the same cut-out sheets');
  }
});

test('every puzzle of a sheet is laid out inside its own frame', () => {
  const share = shareOf(symbols(120), symbols(30));
  const big = shareOf(symbols(3000), symbols(300));
  for (const perPage of /** @type {const} */ ([1, 2, 4])) {
    for (const s of [share, big, undefined]) {
      const plan = planPrintMany(puzzleJobs(4, s), { ...OPTIONS, solution: true, perPage });
      const { frame } = plan;
      for (const p of plan.puzzles) {
        assert.ok(p.preview.boardY + p.model.rows * p.preview.cellMm <= frame.bottom + 1e-6, `${perPage} per page: the board ends in the frame`);
        assert.ok(p.preview.boardX >= PAGE_MARGIN - 1e-9 && p.preview.boardX + p.model.cols * p.preview.cellMm <= PAGE_MARGIN + frame.width + 1e-6, 'and starts and ends inside its width');
        for (const piece of p.preview.pieces) {
          assert.ok(piece.x >= PAGE_MARGIN - 1e-9 && piece.x + piece.w <= PAGE_MARGIN + frame.width + 1e-6, 'a piece to place is inside the width');
          assert.ok(piece.y + piece.h <= frame.bottom + 1e-6 || p.preview.cellMm <= 1.5 + 1e-9, 'and above the bottom of the frame');
        }
        assert.ok(p.band.head.x + p.band.head.width <= PAGE_MARGIN + frame.width + 1e-6, 'the heading is inside the width');
        if (p.band.qr !== null) {
          assert.ok(p.band.qr.size <= (perPage === 1 ? 92.5 : 0.45 * Math.min(frame.width, frame.bottom - PAGE_MARGIN)) + 1e-9, 'the QR box is in proportion to the frame');
          assert.ok(p.band.qr.columnEnd <= frame.bottom, 'its column ends in the frame');
        }
        assert.ok(p.solution !== null && p.solution.boardX + p.model.cols * p.solution.cellMm <= PAGE_MARGIN + frame.width + 1e-6);
        assert.ok(p.solution !== null && p.solution.boardY + p.model.rows * p.solution.cellMm <= frame.bottom + 1e-6, 'the solution too');
      }
    }
  }
  const small = planPrintMany(puzzleJobs(4, shareOf(symbols(3000), symbols(300))), { ...OPTIONS, perPage: 4 });
  assert.ok(small.puzzles[0].band.qr !== null && small.puzzles[0].band.qr.size < 92.5, 'a version 40 box is drawn smaller in a quarter of a sheet');
  const normal = planPrintMany(puzzleJobs(4, shareOf(symbols(120), symbols(30))), { ...OPTIONS, perPage: 4 });
  assert.equal(normal.puzzles[0].band.qr?.size, normal.puzzles[0].share?.qr?.outerMm, 'a box that fits keeps its size');
});

test('solutions of the puzzles of a sheet share a sheet, on the back with the columns mirrored; a group without one has a blank back', () => {
  const jobs = puzzleJobs(5);
  jobs[2].solution = null;
  jobs[3].solution = null;
  jobs[4].solution = null;
  const dx = framesFor(4).slots[1].dx;
  const plan = planPrintMany(jobs, { ...OPTIONS, perPage: 4, solution: true, duplex: true });
  const [front, back] = plan.sheets;
  assert.ok(front.kind === 'preview' && back.kind === 'solution');
  assert.deepEqual(back.items.map((i) => [i.puzzle, i.dx, i.dy]), [[0, dx, 0], [1, 0, 0]], 'behind the puzzle that was on the left, the solution is on the right of the back');
  assert.deepEqual(plan.pages.slice(0, 3).map((p) => `${p.sheet.kind}:${p.side}`), ['preview:front', 'solution:front', 'preview:front']);
  assert.equal(plan.pages[3].side, 'back', 'the second group has no solution: its back is blank');
  assert.equal(plan.pages[3].sheet.kind, 'preview');
  const solutionsOnly = plan.sheets.filter((s) => s.kind === 'solution');
  assert.equal(solutionsOnly.length, 1, 'no sheet for a group without a solution');

  const oneSided = planPrintMany(jobs, { ...OPTIONS, perPage: 4, solution: true });
  const sheet = oneSided.sheets[1];
  assert.ok(sheet.kind === 'solution');
  assert.deepEqual(sheet.items.map((i) => [i.puzzle, i.dx]), [[0, 0], [1, dx]], 'on its own sheet the places are the same as on the puzzle sheet');
  assert.ok(oneSided.paper > plan.paper, 'two sides save the solution sheets');
  assert.equal(planPrintMany(jobs, { ...OPTIONS, perPage: 2, solution: false }).sheets.some((s) => s.kind === 'solution'), false);
});
