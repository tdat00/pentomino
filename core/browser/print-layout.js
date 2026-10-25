// @ts-check
// Paper layout of a puzzle for printing on A4 (millimetres, y grows down): the preview sheet, the piece set packed
// onto sheets, and the board cut into parts that fit a sheet. Pure geometry, no DOM. The board and the pieces share
// one cell size, so a printed piece covers exactly one printed board cell. For two-sided printing the back of a
// sheet is the front mirrored left-to-right (paper turned about its long edge); `mirrorX` and `mirrorCells` give it.

import { activeCells } from '../engine/board.js';
import { normalizeCells, poseCells, transformCells } from '../engine/geometry.js';

/** @typedef {import('../engine/types.js').XY} XY */
/** @typedef {import('../engine/types.js').Board} Board */
/** @typedef {import('../engine/types.js').Piece} Piece */
/** @typedef {import('../engine/types.js').Pose} Pose */
/** @typedef {'small' | 'medium' | 'large' | 'fit_page'} PrintSize */

export const PAGE_WIDTH = 210;
export const PAGE_HEIGHT = 297;
/** Blank border of every sheet; printers cannot reach the very edge. */
export const PAGE_MARGIN = 10;
export const AREA_WIDTH = PAGE_WIDTH - 2 * PAGE_MARGIN;
export const AREA_HEIGHT = PAGE_HEIGHT - 2 * PAGE_MARGIN;
/** Free paper between two cut-out pieces. */
export const PIECE_GAP = 4;
export const PRINT_SIZES = Object.freeze(/** @type {PrintSize[]} */ (['small', 'medium', 'large', 'fit_page']));
/** Cell edge in mm of the fixed sizes. */
export const CELL_MM = Object.freeze({ small: 10, medium: 15, large: 20 });
/** "Fit page" never makes a cell bigger than this, however small the board. */
export const FIT_PAGE_MAX_CELL_MM = 25;

/** Header of the preview sheet: title and subtitle. */
export const PREVIEW_TOP = PAGE_MARGIN + 26;
/** Footer of the preview sheet: scale bar and print notes. */
export const PREVIEW_BOTTOM = PAGE_HEIGHT - PAGE_MARGIN - 14;
const PREVIEW_MAX_CELL_MM = 10;
const PREVIEW_MIN_CELL_MM = 1.5;
const PREVIEW_BOARD_MAX_HEIGHT_MM = 120;
const PREVIEW_LEGEND_MM = 6;
const PREVIEW_SECTION_MM = 8;
const PREVIEW_GAP_MM = 3;
const EPS = 1e-9;

/**
 * @param {number} value
 * @returns {number} The value rounded down to 0.1.
 */
const floorTenth = (value) => Math.floor(value * 10 + EPS) / 10;

/**
 * Display angle for paper: a multiple of 90, because a cut-out cell cannot be turned by 45 degrees. A 45-degree
 * step is dropped, so a board shown diagonally is printed upright in its grid.
 * @param {number} rotation Counter-clockwise degrees, a multiple of 45.
 * @returns {number} 0, 90, 180 or 270.
 */
export function snapRotation(rotation) {
  const turns = Math.floor((((rotation % 360) + 360) % 360) / 90);
  return turns * 90;
}

/**
 * @typedef {object} OrientedPiece
 * @property {Piece} piece
 * @property {number} index Position in the set; patterns follow it.
 * @property {XY[]} cells Normalized to (0, 0).
 * @property {number} w Width in cells.
 * @property {number} h Height in cells.
 */

/**
 * @typedef {object} PrintModel
 * @property {number} rotation Paper angle (0, 90, 180 or 270).
 * @property {number} cols Board width in cells.
 * @property {number} rows Board height in cells.
 * @property {XY[]} active Playable cells.
 * @property {OrientedPiece[]} pieces Every piece of the set.
 * @property {{ piece: Piece, index: number, cells: XY[] }[]} clues Pre-placed pieces, in board cells.
 * @property {OrientedPiece[]} toPlace The pieces the player has to place.
 */

/**
 * Turns the board, the pieces and the pre-placed pieces by the same angle.
 * @param {{ board: Board, pieces: Piece[], clues: Pose[], rotation: number }} job
 * @returns {PrintModel}
 */
export function orientModel({ board, pieces, clues, rotation }) {
  const angle = snapRotation(rotation);
  const turns = (4 - angle / 90) % 4;
  /** @param {XY[]} cells */
  const turn = (cells) => transformCells(cells, turns);
  const active = turn(activeCells(board));
  const placed = clues.map((pose) => {
    const index = pieces.findIndex((p) => p.id === pose.piece);
    if (index === -1) {
      throw new RangeError(`unknown piece ${pose.piece}`);
    }
    return { piece: pieces[index], index, cells: turn(poseCells(pieces[index], pose)) };
  });
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of active) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (active.length === 0) {
    throw new RangeError('the board has no playable cell');
  }
  /** @param {XY[]} cells @returns {XY[]} */
  const shift = (cells) => cells.map(([x, y]) => [x - minX, y - minY]);
  const oriented = pieces.map((piece, index) => orient(piece, index, turns));
  const clueIds = new Set(clues.map((pose) => pose.piece));
  return {
    rotation: angle,
    cols: maxX - minX + 1,
    rows: maxY - minY + 1,
    active: shift(active),
    pieces: oriented,
    clues: placed.map((p) => ({ ...p, cells: shift(p.cells) })),
    toPlace: oriented.filter((p) => !clueIds.has(p.piece.id)),
  };
}

/**
 * @param {Piece} piece
 * @param {number} index
 * @param {number} turns Clockwise quarter turns.
 * @returns {OrientedPiece}
 */
function orient(piece, index, turns) {
  const cells = normalizeCells(transformCells(piece.cells, turns));
  return { piece, index, cells, w: Math.max(...cells.map((c) => c[0])) + 1, h: Math.max(...cells.map((c) => c[1])) + 1 };
}

/**
 * The piece turned a quarter, for a piece that is too wide for the paper as it is.
 * @param {OrientedPiece} item
 * @returns {OrientedPiece}
 */
function quarterTurned(item) {
  return orient({ ...item.piece, cells: item.cells }, item.index, 1);
}

/**
 * Cell size that lets the largest piece fit a sheet (in either direction).
 * @param {OrientedPiece[]} pieces
 * @returns {number} mm
 */
function largestCellForPieces(pieces) {
  let best = Infinity;
  for (const { w, h } of pieces) {
    const upright = Math.min(AREA_WIDTH / w, AREA_HEIGHT / h);
    const sideways = Math.min(AREA_WIDTH / h, AREA_HEIGHT / w);
    best = Math.min(best, Math.max(upright, sideways));
  }
  return floorTenth(best);
}

/**
 * @param {PrintModel} model
 * @param {PrintSize} size
 * @returns {{ cellMm: number, reduced: boolean }} `reduced`: the largest piece does not fit a sheet at the chosen
 *   size, so the cells are smaller than the size asks.
 */
export function cellSizeFor(model, size) {
  const wanted = size === 'fit_page'
    ? floorTenth(Math.min(AREA_WIDTH / model.cols, AREA_HEIGHT / model.rows, FIT_PAGE_MAX_CELL_MM))
    : CELL_MM[size];
  const cellMm = Math.min(wanted, largestCellForPieces(model.pieces));
  return { cellMm, reduced: cellMm < wanted };
}

/**
 * Left-to-right rows: a box that no longer fits the width starts the next row.
 * @param {{ w: number, h: number }[]} boxes
 * @param {number} width
 * @param {number} gap
 * @returns {{ y: number, h: number, items: { index: number, x: number }[] }[]}
 */
function packRows(boxes, width, gap) {
  /** @type {{ y: number, h: number, items: { index: number, x: number }[] }[]} */
  const rows = [];
  let row = null;
  let x = 0;
  let y = 0;
  boxes.forEach((box, index) => {
    if (row === null || x + box.w > width + EPS) {
      if (row !== null) {
        y += row.h + gap;
      }
      row = { y, h: 0, items: [] };
      rows.push(row);
      x = 0;
    }
    row.items.push({ index, x });
    row.h = Math.max(row.h, box.h);
    x += box.w + gap;
  });
  return rows;
}

/**
 * @typedef {object} PiecePlacement
 * @property {OrientedPiece} item Cells as printed (turned a quarter when the piece is too wide).
 * @property {number} x mm from the left of the sheet.
 * @property {number} y mm from the top of the sheet.
 * @property {number} w mm
 * @property {number} h mm
 */

/**
 * The whole piece set on as few sheets as the rows allow; tall pieces first.
 * @param {OrientedPiece[]} pieces
 * @param {number} cellMm
 * @returns {PiecePlacement[][]} Placements of each sheet.
 */
export function layoutPieceSheets(pieces, cellMm) {
  const items = pieces
    .map((item) => (item.w * cellMm > AREA_WIDTH + EPS ? quarterTurned(item) : item))
    .sort((a, b) => b.h - a.h || b.w - a.w || a.index - b.index);
  const rows = packRows(items.map((item) => ({ w: item.w * cellMm, h: item.h * cellMm })), AREA_WIDTH, PIECE_GAP);
  /** @type {PiecePlacement[][]} */
  const sheets = [];
  /** @type {PiecePlacement[]} */
  let sheet = [];
  let top = 0;
  for (const row of rows) {
    if (sheet.length > 0 && row.y + row.h - top > AREA_HEIGHT + EPS) {
      sheets.push(sheet);
      sheet = [];
      top = row.y;
    }
    for (const { index, x } of row.items) {
      const item = items[index];
      sheet.push({ item, x: PAGE_MARGIN + x, y: PAGE_MARGIN + row.y - top, w: item.w * cellMm, h: item.h * cellMm });
    }
  }
  if (sheet.length > 0) {
    sheets.push(sheet);
  }
  return sheets;
}

/**
 * @param {number} total
 * @param {number} parts
 * @returns {{ start: number, count: number }[]} The cells divided as evenly as possible.
 */
function evenSplit(total, parts) {
  const base = Math.floor(total / parts);
  const extra = total % parts;
  let start = 0;
  return Array.from({ length: parts }, (_, i) => {
    const count = base + (i < extra ? 1 : 0);
    const part = { start, count };
    start += count;
    return part;
  });
}

/**
 * @typedef {object} BoardTile
 * @property {number} n 1-based number of the part.
 * @property {number} tileRow 1-based row of the part in the arrangement of parts.
 * @property {number} tileCol 1-based column of the part.
 * @property {number} cols Cells across the part.
 * @property {number} rows Cells down the part.
 * @property {XY[]} cells Playable cells of the part, from its own corner.
 * @property {number} x mm from the left of the sheet to the part's corner.
 * @property {number} y mm from the top.
 */

/**
 * The board cut along cell edges into parts that each fit a sheet, centred on it. Parts without a playable cell are
 * left out. A mirrored back of a part lands on the same spot (its sheet position is symmetric).
 * @param {PrintModel} model
 * @param {number} cellMm
 * @returns {{ tiles: BoardTile[], tilesAcross: number, tilesDown: number }}
 */
export function layoutBoard(model, cellMm) {
  const perRow = Math.max(1, Math.floor(AREA_WIDTH / cellMm + EPS));
  const perColumn = Math.max(1, Math.floor(AREA_HEIGHT / cellMm + EPS));
  const xs = evenSplit(model.cols, Math.ceil(model.cols / perRow));
  const ys = evenSplit(model.rows, Math.ceil(model.rows / perColumn));
  /** @type {BoardTile[]} */
  const tiles = [];
  ys.forEach((yr, ty) => {
    xs.forEach((xr, tx) => {
      /** @type {XY[]} */
      const cells = model.active
        .filter(([x, y]) => x >= xr.start && x < xr.start + xr.count && y >= yr.start && y < yr.start + yr.count)
        .map(([x, y]) => [x - xr.start, y - yr.start]);
      if (cells.length > 0) {
        tiles.push({
          n: tiles.length + 1,
          tileRow: ty + 1,
          tileCol: tx + 1,
          cols: xr.count,
          rows: yr.count,
          cells,
          x: (PAGE_WIDTH - xr.count * cellMm) / 2,
          y: (PAGE_HEIGHT - yr.count * cellMm) / 2,
        });
      }
    });
  });
  return { tiles, tilesAcross: xs.length, tilesDown: ys.length };
}

/**
 * @typedef {object} PreviewLayout
 * @property {number} cellMm Cell size of the preview.
 * @property {number} boardX
 * @property {number} boardY
 * @property {number} legendY Baseline of the line under the board.
 * @property {number} sectionY Baseline of the heading of the pieces to place.
 * @property {PiecePlacement[]} pieces
 */

/**
 * The preview sheet: the board with its pre-placed pieces under the title, then the pieces to place, all at one
 * scale, as large as the page allows up to 10 mm cells.
 * @param {PrintModel} model
 * @returns {PreviewLayout}
 */
export function layoutPreview(model) {
  const start = Math.min(PREVIEW_MAX_CELL_MM, AREA_WIDTH / model.cols, PREVIEW_BOARD_MAX_HEIGHT_MM / model.rows);
  /** @type {PreviewLayout | null} */
  let found = null;
  for (let cell = start; found === null; cell = Math.max(PREVIEW_MIN_CELL_MM, cell * 0.95)) {
    const boardY = PREVIEW_TOP;
    const piecesTop = boardY + model.rows * cell + PREVIEW_LEGEND_MM + PREVIEW_SECTION_MM;
    const items = model.toPlace.map((item) => (item.w * cell > AREA_WIDTH + EPS ? quarterTurned(item) : item))
      .sort((a, b) => b.h - a.h || b.w - a.w || a.index - b.index);
    const rows = packRows(items.map((item) => ({ w: item.w * cell, h: item.h * cell })), AREA_WIDTH, PREVIEW_GAP_MM);
    const last = rows.at(-1);
    const bottom = last === undefined ? piecesTop : piecesTop + last.y + last.h;
    if (bottom <= PREVIEW_BOTTOM + EPS || cell <= PREVIEW_MIN_CELL_MM + EPS) {
      found = {
        cellMm: cell,
        boardX: PAGE_MARGIN + (AREA_WIDTH - model.cols * cell) / 2,
        boardY,
        legendY: boardY + model.rows * cell + 4,
        sectionY: boardY + model.rows * cell + PREVIEW_LEGEND_MM + 5.5,
        pieces: rows.flatMap((row) => row.items.map(({ index, x }) => ({
          item: items[index], x: PAGE_MARGIN + x, y: piecesTop + row.y, w: items[index].w * cell, h: items[index].h * cell,
        }))),
      };
    }
  }
  return found;
}

/**
 * @param {number} x mm from the left of the front.
 * @param {number} w mm width of the thing.
 * @returns {number} Where the thing's left edge is on the back of the paper.
 */
export function mirrorX(x, w) {
  return PAGE_WIDTH - x - w;
}

/**
 * Cells as they look from the back of the paper.
 * @param {XY[]} cells
 * @param {number} width Width in cells of the box holding them.
 * @returns {XY[]}
 */
export function mirrorCells(cells, width) {
  return cells.map(([x, y]) => [width - 1 - x, y]);
}

/**
 * @typedef {object} PrintOptions
 * @property {boolean} pieces Print the piece set.
 * @property {boolean} board Print the board.
 * @property {PrintSize} size
 * @property {boolean} duplex Print on both sides of the paper.
 */

/**
 * @typedef {{ kind: 'preview' } | { kind: 'pieces', n: number, total: number, placements: PiecePlacement[] }
 *   | { kind: 'board', tile: BoardTile, total: number, tilesAcross: number, tilesDown: number }} Sheet
 */

/**
 * @typedef {object} PrintPlan
 * @property {PrintModel} model
 * @property {PrintOptions} options
 * @property {number} cellMm
 * @property {boolean} reduced
 * @property {boolean} turned The board is printed a quarter turn from the shown view, to need fewer parts. * @property {PreviewLayout} preview
 * @property {Sheet[]} sheets One per sheet of paper, in printing order.
 * @property {{ sheet: Sheet, side: 'front' | 'back' }[]} pages The pages sent to the printer: with two sides, the
 *   back of every sheet follows its front (the back of the preview is blank).
 * @property {number} boardParts
 */

/**
 * The model to print. A board that is cut into fewer parts (or, on a single sheet, gets bigger cells) when it is
 * turned a quarter is printed turned, which saves paper; the preview and the pieces turn with it.
 * @param {{ board: Board, pieces: Piece[], clues: Pose[], rotation: number }} job
 * @param {PrintOptions} options
 * @returns {{ model: PrintModel, turned: boolean }}
 */
function chooseModel(job, options) {
  const upright = orientModel(job);
  if (!options.board) {
    return { model: upright, turned: false };
  }
  const sideways = orientModel({ ...job, rotation: upright.rotation + 90 });
  /** @param {PrintModel} model */
  const cost = (model) => {
    const { cellMm } = cellSizeFor(model, options.size);
    return { cellMm, parts: layoutBoard(model, cellMm).tiles.length };
  };
  const a = cost(upright);
  const b = cost(sideways);
  const better = b.cellMm > a.cellMm + EPS || (Math.abs(b.cellMm - a.cellMm) <= EPS && b.parts < a.parts);
  return better ? { model: sideways, turned: true } : { model: upright, turned: false };
}

/**
 * @param {{ board: Board, pieces: Piece[], clues: Pose[], rotation: number }} job
 * @param {PrintOptions} options
 * @returns {PrintPlan}
 */
export function planPrint(job, options) {
  const { model, turned } = chooseModel(job, options);
  const { cellMm, reduced } = cellSizeFor(model, options.size);
  /** @type {Sheet[]} */
  const sheets = [{ kind: 'preview' }];
  if (options.pieces) {
    const packed = layoutPieceSheets(model.pieces, cellMm);
    packed.forEach((placements, i) => sheets.push({ kind: 'pieces', n: i + 1, total: packed.length, placements }));
  }
  let boardParts = 0;
  if (options.board) {
    const { tiles, tilesAcross, tilesDown } = layoutBoard(model, cellMm);
    boardParts = tiles.length;
    for (const tile of tiles) {
      sheets.push({ kind: 'board', tile, total: tiles.length, tilesAcross, tilesDown });
    }
  }
  /** @type {PrintPlan['pages']} */
  const pages = [];
  for (const sheet of sheets) {
    pages.push({ sheet, side: 'front' });
    if (options.duplex && sheets.length > 1) {
      pages.push({ sheet, side: 'back' });
    }
  }
  return { model, options, cellMm, reduced, turned, preview: layoutPreview(model), sheets, pages, boardParts };
}
