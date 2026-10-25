// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { rectangle } from '../core/engine/board.js';
import { packBoard } from '../core/engine/pack.js';
import {
  AREA_HEIGHT, AREA_WIDTH, BAND_LIMIT, CELL_MM, FIT_PAGE_MAX_CELL_MM, PAGE_WIDTH, PREVIEW_BOTTOM, PRINT_SIZES, cellSizeFor, codeGroups,
  estimateTextWidth, fitText, groupsPerLine, layoutBoard, layoutPieceSheets, layoutPreview, mirrorCells, mirrorX, orientModel, planPrint,
  snapRotation, titleBlock, wrapTitle,
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

/** @param {ReturnType<typeof planPrint>} plan @returns {string} Everything typed, in reading order, without the spaces. */
function typedCode(plan) {
  const lines = [...(plan.band.code?.lines ?? []), ...plan.band.continuation.flatMap((sheet) => sheet.lines)];
  return lines.map((line) => line.text.replaceAll(' ', '')).join('');
}

test('the first sheet follows the report\'s mock-up: baselines, QR column and preview top', () => {
  const share = shareOf('1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR', '18V3WE');
  const plan = planPrint({ ...sampleJob(), title: 'Easy #1', details: details(2), share }, OPTIONS);
  const { band } = plan;
  assert.deepEqual(band.head.baselines, [19]);
  assert.deepEqual(band.head.detailBaselines, [26.5, 32]);
  assert.equal(band.code?.labelY, 38, 'the label is 6 mm under the last detail line');
  assert.equal(band.code?.count, 38);
  assert.deepEqual(band.code?.lines.map((l) => [l.part, l.y, l.size]), [['core', 44, 4.2], ['tail', 55, 3.2]]);
  assert.equal(band.code?.lines[0].text, '1D0J 492G 47DM XNG6 YCP1 0HCY 05KZ W8S4 HCN2 QR');
  assert.equal(band.code?.lines[1].text, '.18V3 WE', 'the dot is printed in front of the tail');
  assert.equal(band.code?.tailLabelY, 50, '6 mm under the last core line, and the first tail line 5 mm under it');
  assert.equal(band.code?.moreY, null);
  assert.deepEqual(band.qr, { x: 175, y: 10, size: 25, scanY: 39.5, hostY: 43.5, columnEnd: 45 });
  assert.equal(band.bottom, 57, 'the last baseline + 2 mm');
  assert.equal(band.top, 61, 'the preview starts 4 mm under the band');
  assert.equal(plan.preview.boardY, 61);
  assert.equal(band.continuation.length, 0);
  assert.equal(typedCode(plan), share.code.F);
  for (const line of band.code?.lines ?? []) {
    const advance = line.part === 'core' ? 2.52 : 1.92;
    assert.ok(Math.abs(line.textLength - line.text.length * advance) < 1e-9, 'textLength is the characters times 0.6 em');
  }

  const one = planPrint({ ...sampleJob(), title: 'Easy #1', details: details(1), share }, OPTIONS).band;
  assert.equal(one.code?.labelY, 32.5, 'one detail line');
  const none = planPrint({ ...sampleJob(), title: 'Easy #1', details: [], share }, OPTIONS).band;
  assert.equal(none.code?.labelY, 26.5, 'no details: 7.5 mm under the last title baseline');
  assert.equal(none.code?.lines[0].y, 32.5);
});

test('groups per line: 12 beside a 25 mm box, 7 beside a version-40 box, 15 at full width, never fewer than 1', () => {
  assert.equal(groupsPerLine(AREA_WIDTH - 6 - 25, 2.52), 12);
  assert.equal(groupsPerLine(AREA_WIDTH - 6 - 92.5, 2.52), 7);
  assert.equal(groupsPerLine(AREA_WIDTH, 2.52), 15);
  assert.equal(groupsPerLine(AREA_WIDTH, 1.92), 19);
  assert.equal(groupsPerLine(1, 2.52), 1);
  assert.equal(groupsPerLine(AREA_WIDTH - 6 - 25, 1.92, true), 16, 'the dot costs a character of the first tail line');
  assert.deepEqual(codeGroups('ABCDEFGHIJ'), ['ABCD', 'EFGH', 'IJ']);
});

test('a 576-cell code (version 11, 34.5 mm box) and a version-40 box (92.5 mm) keep their text beside them and fit', () => {
  const v11 = shareOf(symbols(120), symbols(30));
  const big = planPrint({ ...sampleJob(), title: 'Big', details: details(2), share: v11 }, OPTIONS);
  assert.ok(big.band.qr !== null && big.band.qr.size >= 25);
  assert.equal(typedCode(big), v11.code.F);

  const v40 = shareOf(symbols(3000), symbols(300));
  assert.equal(v40.qr?.version, 40);
  assert.equal(v40.qr?.outerMm, 92.5);
  const plan = planPrint({ ...sampleJob(), title: 'Version forty', details: details(2), share: v40 }, OPTIONS);
  const { band } = plan;
  assert.deepEqual(band.qr, { x: 107.5, y: 10, size: 92.5, scanY: 107, hostY: 111, columnEnd: 112.5 });
  const core = band.code?.lines.filter((l) => l.part === 'core') ?? [];
  assert.equal(core[0].text.split(' ').length, 7, 'seven groups beside the big box (W = 91.5)');
  for (const line of core) {
    const groups = line.text.split(' ').length;
    const beside = line.y - 4.2 < band.qr.columnEnd;
    assert.ok(groups <= (beside ? 7 : 15), `a line at ${line.y} holds ${groups} groups`);
    assert.ok(beside ? groups === 7 : groups === 15 || line === core.at(-1), 'full lines, but the last');
    assert.ok(line.textLength <= (beside ? 91.5 : 190) + 1e-9, 'the line stays clear of the QR column');
  }
  assert.equal(band.code?.labelWidth, 91.5);
  assert.ok(band.continuation.length > 0, 'a long code continues on the next sheets');
  assert.ok(band.code?.moreY !== null);
  assert.equal(typedCode(plan), v40.code.F);
});

test('the band never takes more than the first sheet allows, and the preview keeps 120 mm', () => {
  for (const [C, T] of [[symbols(12), null], [symbols(60), symbols(20)], [symbols(300), symbols(90)], [symbols(1500), symbols(300)], [symbols(3000), symbols(321)], [symbols(3300), null]]) {
    const share = shareOf(C, T);
    for (const count of [0, 1, 2]) {
      for (const title of ['X', 'A title that needs more than one line because it is rather long, as titles go, yes it is', 'W'.repeat(80)]) {
        const plan = planPrint({ ...sampleJob(), title, details: details(count), share }, OPTIONS);
        const { band } = plan;
        assert.ok(band.bottom <= BAND_LIMIT + 1e-9, `band bottom ${band.bottom}`);
        assert.ok(PREVIEW_BOTTOM - plan.preview.boardY >= 120 - 1e-9, `the preview keeps 120 mm (${band.top})`);
        assert.equal(plan.preview.boardY, band.top);
        assert.equal(typedCode(plan), share.code.F);
        const qrEnd = band.qr?.columnEnd ?? 0;
        assert.ok(band.bottom >= qrEnd, 'the band covers the QR column');
        const last = [...(band.code?.lines ?? [])].at(-1);
        assert.ok(last !== undefined && last.y + 2 <= band.bottom + 1e-9);
        if (band.code?.moreY != null) {
          assert.equal(band.code.moreY, last.y + 5.5, 'the notice follows the last line by 5.5 mm');
          assert.ok(last.y + 2 + 5.5 <= BAND_LIMIT + 1e-9, 'there is room for the notice');
        }
        const lines = band.head.lines;
        assert.ok(lines.length >= 1 && lines.length <= 3);
        for (const [i, text] of lines.entries()) {
          assert.ok(estimateTextWidth(text, 8, true) <= band.head.width + 1e-9, `title line ${i} fits ${band.head.width} mm`);
        }
      }
    }
  }
});

/**
 * A prepared share with a stand-in QR of the given box size, for the layout alone (the band reads only the box).
 * @param {string} C
 * @param {string | null} T
 * @param {number} [outerMm]
 * @returns {import('../core/browser/puzzle-snapshot.js').PreparedPuzzleShare}
 */
function layoutShare(C, T, outerMm = 25) {
  const F = T === null ? C : `${C}.${T}`;
  const qr = /** @type {import('../core/browser/qr.js').PuzzleQrMatrix} */ (/** @type {unknown} */ ({ outerMm }));
  return { code: { C, T, F, version: 1 }, url: null, carried: T === null ? 'C' : 'C.T', qr, notices: [] };
}

test('typed code that does not fit goes to continuation sheets in order, whole groups, the dot kept', () => {
  const found = new Set();
  /** @param {ReturnType<typeof planPrint>} plan */
  const everyLine = (plan) => [...(plan.band.code?.lines ?? []), ...plan.band.continuation.flatMap((s) => s.lines)];
  for (const box of [25, 34.5, 60]) {
    for (let core = 800; core <= 1500; core += 3) {
      for (const tail of [0, 1, 4, 5, 60, 300]) {
        const share = layoutShare(symbols(core), tail === 0 ? null : symbols(tail), box);
        const plan = planPrint({ ...sampleJob(), title: 'Easy #1', details: details(2), share }, OPTIONS);
        assert.equal(typedCode(plan), share.code.F, `${core}.${tail} reads back in order`);
        const lines = everyLine(plan);
        const firstTail = lines.find((l) => l.part === 'tail');
        for (const line of lines) {
          const text = line.text.replace(/^\./, '');
          assert.ok(text.split(' ').slice(0, -1).every((g) => g.length === 4), 'a group is never split across lines');
          assert.equal(line.text.startsWith('.'), line === firstTail, 'only the first tail line has the dot');
        }
        const sheets = plan.band.continuation;
        assert.deepEqual(sheets.map((s) => s.n), sheets.map((_, i) => i + 1));
        assert.ok(sheets.every((s) => s.total === sheets.length));
        for (const sheet of sheets) {
          for (const line of sheet.lines) {
            assert.equal(line.x, 10);
            assert.ok(line.y >= 36 && line.y + 2 <= 287 + 1e-9, 'inside the content area');
            assert.ok(line.textLength <= 190 + 1e-9);
          }
          const startsWithLabel = sheet.tailLabelY !== null && sheet.lines[0].part === 'tail';
          assert.equal(sheet.tailLabelY === 36 ? 41 : 36, sheet.lines[0].y, `the code starts at baseline 36, under a tail label that begins the sheet (${startsWithLabel})`);
        }
        if (sheets.length > 0 && tail > 0) {
          const coreOnFirst = (plan.band.code?.lines.filter((l) => l.part === 'core').reduce((n, l) => n + l.text.replaceAll(' ', '').length, 0) ?? 0);
          if (plan.band.code?.tailLabelY != null) {
            found.add('tail starts on the first sheet');
            assert.ok(plan.band.code.lines.some((l) => l.part === 'tail'), 'a label is never alone');
          } else if (coreOnFirst === core) {
            found.add('core complete, tail on a continuation sheet');
            assert.ok(sheets[0].tailLabelY !== null && sheets[0].lines.some((l) => l.part === 'tail'), 'the label and its first line stay together');
          } else {
            found.add('tail starts on a continuation sheet');
          }
        }
      }
    }
  }
  assert.deepEqual([...found].sort(), ['core complete, tail on a continuation sheet', 'tail starts on a continuation sheet', 'tail starts on the first sheet']);
});

test('a continuation sheet holds 46 lines of 15 groups: 2,760 core symbols, then the rest', () => {
  const long = layoutShare(symbols(5000), symbols(700), 92.5);
  const plan = planPrint({ ...sampleJob(), title: 'Long', details: details(2), share: long }, OPTIONS);
  const [first, second] = plan.band.continuation;
  assert.ok(first && second && plan.band.continuation.length === 2);
  assert.equal(first.lines.length, 46, 'up to 46 lines');
  assert.ok(first.lines.every((l) => l.part === 'core' && l.text.split(' ').length === 15));
  assert.equal(first.lines.at(-1)?.y, 36 + 45 * 5.5);
  assert.equal(first.lines.reduce((n, l) => n + l.text.replaceAll(' ', '').length, 0), 2760);
  assert.equal(first.tailLabelY, null);
  assert.ok(second.tailLabelY !== null && second.lines.some((l) => l.part === 'tail'), 'the tail starts on the last sheet, under its label');
  assert.equal(typedCode(plan), long.code.F);
  const last = second.lines.at(-1);
  assert.ok(last?.part === 'tail' && last.text.endsWith(symbols(700).slice(-(700 % 4 || 4))), 'the last sheet ends with the last symbols, a short group and all');
  assert.equal(second.total, 2);
});

test('without a code the band holds the heading and the "too large" line; without a share there is no band at all', () => {
  const none = { ...shareOf(symbols(40), null), qr: null, url: null };
  const plan = planPrint({ ...sampleJob(), title: 'Huge', details: details(2), share: none }, OPTIONS);
  assert.equal(plan.band.qr, null);
  assert.equal(plan.band.code, null);
  assert.equal(plan.band.noCodeY, 38, 'where the code label would be');
  assert.equal(plan.band.head.width, 190, 'no QR column, so the full width');
  assert.equal(plan.band.continuation.length, 0);
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

test('continuation sheets: the order, the blank backs and the paper count, one side and two', () => {
  const solution = pack.puzzles[0].solution;
  const share = shareOf(symbols(3000), symbols(300));
  const job = { ...sampleJob(), title: 'Long', details: details(2), share, solution };
  const count = planPrint(job, OPTIONS).band.continuation.length;
  assert.ok(count >= 1);
  const kinds = (/** @type {ReturnType<typeof planPrint>} */ plan) => plan.sheets.map((s) => s.kind);

  const one = planPrint(job, { ...OPTIONS, solution: true });
  assert.deepEqual(kinds(one).slice(0, 2 + count), ['preview', ...Array(count).fill('code'), 'solution'], 'one side: puzzle, continuation sheets, solution');
  assert.equal(one.pages.length, one.sheets.length);
  assert.ok(one.pages.every((p) => p.side === 'front'));

  const two = planPrint(job, { ...OPTIONS, solution: true, duplex: true });
  assert.deepEqual(kinds(two).slice(0, 2 + count), ['preview', 'solution', ...Array(count).fill('code')], 'two sides: the solution is the back of the puzzle, the continuation sheets follow');
  assert.deepEqual(two.pages.slice(0, 2).map((p) => `${p.sheet.kind}:${p.side}`), ['preview:front', 'solution:front']);
  const codePages = two.pages.filter((p) => p.sheet.kind === 'code').map((p) => p.side);
  assert.deepEqual(codePages, Array(count).fill(['front', 'back']).flat(), 'every continuation sheet has a blank back');
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
  const without = planPrint({ ...job, share: undefined }, { ...OPTIONS, duplex: true });
  assert.equal(plain.paper, without.paper + count, 'one more paper per continuation sheet');
  assert.equal(two.paper, planPrint({ ...job, share: undefined }, { ...OPTIONS, duplex: true, solution: true }).paper + count);
  const oneWithout = planPrint({ ...job, share: undefined }, OPTIONS);
  assert.equal(planPrint(job, OPTIONS).paper, oneWithout.paper + count);
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
