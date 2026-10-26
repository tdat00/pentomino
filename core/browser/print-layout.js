// @ts-check
// Paper layout of a puzzle for printing on A4 (millimetres, y grows down); pure geometry, no DOM. The board and the
// pieces share one cell size, so a printed piece covers exactly one printed board cell. The back of a two-sided sheet
// is the front mirrored left-to-right (paper turned about its long edge).

import { activeCells, classifyBlocked } from '../engine/board.js';
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

/** Header of a sheet without a code band (the solution sheet, and a puzzle sheet whose heading is short): title and details. */
export const PREVIEW_TOP = PAGE_MARGIN + 30;
/** Footer of the preview sheet: scale bar and print notes. */
export const PREVIEW_BOTTOM = PAGE_HEIGHT - PAGE_MARGIN - 14;

/**
 * The room of one puzzle on a puzzle sheet, in the sheet's own coordinates as if the frame were the whole page: it
 * starts at the page margin, is `width` wide and its content ends at `bottom`. A sheet with several puzzles moves each
 * frame to its place by a translation, so the layout of a puzzle does not depend on where its frame is.
 * @typedef {{ width: number, bottom: number }} Frame
 */

/** @type {Frame} */
export const PAGE_FRAME = Object.freeze({ width: AREA_WIDTH, bottom: PREVIEW_BOTTOM });
/** Free paper between the frames of a sheet with several puzzles. */
export const FRAME_GAP_MM = 6;
/** Puzzles on one sheet. */
export const PER_PAGE_CHOICES = Object.freeze(/** @type {PerPage[]} */ ([1, 2, 4]));
/** @typedef {1 | 2 | 4} PerPage */

/** Height available to the frames of a sheet: from the top margin to the foot (the scale bar). */
const FRAMES_HEIGHT = PREVIEW_BOTTOM - PAGE_MARGIN;

/**
 * Where the frames of a sheet are and how large they are.
 * @param {PerPage} perPage 1 (the whole sheet), 2 (one above the other) or 4 (two by two).
 * @returns {{ frame: Frame, slots: { dx: number, dy: number, col: number }[], columns: number }} A slot's translation
 *   from the first frame, and its column (to mirror the sheet's back).
 */
export function framesFor(perPage) {
  if (perPage === 1) {
    return { frame: PAGE_FRAME, slots: [{ dx: 0, dy: 0, col: 0 }], columns: 1 };
  }
  const height = (FRAMES_HEIGHT - FRAME_GAP_MM) / 2;
  const frame = { width: perPage === 2 ? AREA_WIDTH : (AREA_WIDTH - FRAME_GAP_MM) / 2, bottom: PAGE_MARGIN + height };
  const stepY = height + FRAME_GAP_MM;
  if (perPage === 2) {
    return { frame, slots: [{ dx: 0, dy: 0, col: 0 }, { dx: 0, dy: stepY, col: 0 }], columns: 1 };
  }
  const stepX = frame.width + FRAME_GAP_MM;
  return {
    frame,
    slots: [{ dx: 0, dy: 0, col: 0 }, { dx: stepX, dy: 0, col: 1 }, { dx: 0, dy: stepY, col: 0 }, { dx: stepX, dy: stepY, col: 1 }],
    columns: 2,
  };
}
const PREVIEW_MAX_CELL_MM = 10;
/** The preview is drawn at this share of the largest size the page allows, so it stays a compact reading aid. */
const PREVIEW_SCALE = 0.6;
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
 * @property {XY[]} [holes] Blocked cells enclosed by the board (drawn grey with a cross); exterior ones are left out.
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
  const kinds = classifyBlocked(board);
  /** @type {XY[]} */
  const holeCells = [];
  kinds.forEach((kind, i) => {
    if (kind === 2) {
      holeCells.push([i % board.width, Math.floor(i / board.width)]);
    }
  });
  const holes = turn(holeCells);
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
    holes: shift(holes),
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
 * @property {XY[]} holes Enclosed blocked cells of the part, from its own corner.
 * @property {BoardJoin[]} joins Marks on the edges this part shares with its neighbours, one per run of shared cells.
 * @property {number} x mm from the left of the sheet to the part's corner.
 * @property {number} y mm from the top.
 */

/**
 * @typedef {object} BoardJoin
 * @property {number} x Cell of the part (from its own corner) whose edge carries the mark.
 * @property {number} y
 * @property {'left' | 'right' | 'top' | 'bottom'} side Edge of that cell that meets the neighbour.
 * @property {number} to Number of the neighbouring part.
 */

/**
 * Where two neighbouring parts meet: one mark in the middle of each run of cells that are playable on both sides of
 * the cut, on both parts, so the two marks line up when the parts are joined.
 * @param {Set<string>} active `x,y` of the playable cells of the whole board.
 * @param {BoardTile} a The part on the left (or on top).
 * @param {BoardTile} b The part on the right (or below).
 * @param {{ start: number, count: number }} along Cells along the cut (rows for a vertical cut, columns otherwise).
 * @param {number} cut First column (or row) of `b`.
 * @param {{ start: number }} aOrigin Column (or row) where `a` starts across the cut.
 * @param {{ start: number }} alongOrigin Where both parts start along the cut.
 * @param {boolean} vertical
 */
function addJoins(active, a, b, along, cut, aOrigin, alongOrigin, vertical) {
  /** @param {number} i @param {number} j */
  const on = (i, j) => active.has(vertical ? `${i},${j}` : `${j},${i}`);
  let run = -1;
  for (let i = along.start; i <= along.start + along.count; i += 1) {
    const shared = i < along.start + along.count && on(cut - 1, i) && on(cut, i);
    if (shared && run === -1) {
      run = i;
    } else if (!shared && run !== -1) {
      const mid = Math.floor((run + i - 1) / 2) - alongOrigin.start;
      const last = cut - 1 - aOrigin.start;
      a.joins.push(vertical ? { x: last, y: mid, side: 'right', to: b.n } : { x: mid, y: last, side: 'bottom', to: b.n });
      b.joins.push(vertical ? { x: 0, y: mid, side: 'left', to: a.n } : { x: mid, y: 0, side: 'top', to: a.n });
      run = -1;
    }
  }
}

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
  /** @type {Map<string, BoardTile>} */
  const byPlace = new Map();
  ys.forEach((yr, ty) => {
    xs.forEach((xr, tx) => {
      /** @param {XY[]} list @returns {XY[]} */
      const inPart = (list) => list
        .filter(([x, y]) => x >= xr.start && x < xr.start + xr.count && y >= yr.start && y < yr.start + yr.count)
        .map(([x, y]) => [x - xr.start, y - yr.start]);
      const cells = inPart(model.active);
      if (cells.length > 0) {
        const tile = {
          n: tiles.length + 1,
          tileRow: ty + 1,
          tileCol: tx + 1,
          cols: xr.count,
          rows: yr.count,
          cells,
          holes: inPart(model.holes ?? []),
          joins: /** @type {BoardJoin[]} */ ([]),
          x: (PAGE_WIDTH - xr.count * cellMm) / 2,
          y: (PAGE_HEIGHT - yr.count * cellMm) / 2,
        };
        tiles.push(tile);
        byPlace.set(`${tx},${ty}`, tile);
      }
    });
  });
  const active = new Set(model.active.map(([x, y]) => `${x},${y}`));
  ys.forEach((yr, ty) => {
    xs.forEach((xr, tx) => {
      const tile = byPlace.get(`${tx},${ty}`);
      const right = byPlace.get(`${tx + 1},${ty}`);
      const below = byPlace.get(`${tx},${ty + 1}`);
      if (tile !== undefined && right !== undefined) {
        addJoins(active, tile, right, yr, xs[tx + 1].start, xr, yr, true);
      }
      if (tile !== undefined && below !== undefined) {
        addJoins(active, tile, below, xr, ys[ty + 1].start, yr, xr, false);
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
 * scale: 60 % of the largest the page allows (up to 10 mm cells), smaller still when the pieces need it.
 * @param {PrintModel} model
 * @param {number} [top] Where the board starts: under the heading and the code band of the sheet.
 * @returns {PreviewLayout}
 */
export function layoutPreview(model, top = PREVIEW_TOP, frame = PAGE_FRAME) {
  const width = frame.width;
  const start = PREVIEW_SCALE * Math.min(PREVIEW_MAX_CELL_MM, width / model.cols, PREVIEW_BOARD_MAX_HEIGHT_MM / model.rows);
  /** @type {PreviewLayout | null} */
  let found = null;
  for (let cell = start; found === null; cell = Math.max(PREVIEW_MIN_CELL_MM, cell * 0.95)) {
    const boardY = top;
    const piecesTop = boardY + model.rows * cell + PREVIEW_LEGEND_MM + PREVIEW_SECTION_MM;
    const items = model.toPlace.map((item) => (item.w * cell > width + EPS ? quarterTurned(item) : item))
      .sort((a, b) => b.h - a.h || b.w - a.w || a.index - b.index);
    const rows = packRows(items.map((item) => ({ w: item.w * cell, h: item.h * cell })), width, PREVIEW_GAP_MM);
    const last = rows.at(-1);
    const bottom = last === undefined ? piecesTop : piecesTop + last.y + last.h;
    if (bottom <= frame.bottom + EPS || cell <= PREVIEW_MIN_CELL_MM + EPS) {
      found = {
        cellMm: cell,
        boardX: PAGE_MARGIN + (width - model.cols * cell) / 2,
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

// ---------------------------------------------------------------------------------------------------------------------
// The heading and the code band of the first sheet. All numbers are millimetres on the A4 sheet; a text's baseline is
// its y, and a line reserves its baseline plus 2 mm below it.

/**
 * Width in mm of a text. The browser supplies the real one (a canvas measure of the font the page is drawn in); this
 * estimate lets the layout run without a DOM.
 * @typedef {(text: string, sizeMm: number, bold?: boolean) => number} TextMeasure
 */

export const TITLE_SIZE_MM = 8;
export const TITLE_FIRST_BASELINE = PAGE_MARGIN + 9;
export const TITLE_PITCH_MM = 9;
export const TITLE_MAX_LINES = 3;
export const DETAIL_SIZE_MM = 4;
const DETAIL_AFTER_TITLE_MM = 7.5;
const DETAIL_PITCH_MM = 5.5;
const NO_CODE_AFTER_DETAIL_MM = 6;
/** Room reserved under a line's baseline. */
const LINE_BOTTOM_MM = 2;
/** QR box: at the top-left corner of the content area; the text column keeps 6 mm clear of it. */
const QR_COLUMN_GAP_MM = 6;
const QR_SCAN_BASELINE_MM = 4.5;
const QR_COLUMN_END_MM = 7;
export const QR_SCAN_SIZE_MM = 3.2;
const BAND_GAP_MM = 4;

/**
 * A rough width: an average sans-serif letter is about 0.55 em, narrow letters and spaces less, capitals and wide
 * letters more, bold 8 % wider, plus 3 % for safety.
 * @type {TextMeasure}
 */
export function estimateTextWidth(text, sizeMm, bold = false) {
  let em = 0;
  for (const ch of text) {
    const code = /** @type {number} */ (ch.codePointAt(0));
    if (ch === ' ') {
      em += 0.28;
    } else if ('ijl.,:;!|\'`'.includes(ch)) {
      em += 0.3;
    } else if ('mwMW@'.includes(ch)) {
      em += 0.9;
    } else if (code >= 0x2e80) {
      em += 1;
    } else if (ch >= 'A' && ch <= 'Z') {
      em += 0.68;
    } else if (ch >= '0' && ch <= '9') {
      em += 0.58;
    } else {
      em += 0.56;
    }
  }
  return em * sizeMm * (bold ? 1.08 : 1) * 1.03;
}

/**
 * The text shortened with "…" so that it fits the width; code points are never split. Text that fits is returned as is.
 * @param {string} text
 * @param {number} width mm
 * @param {number} size mm
 * @param {boolean} bold
 * @param {TextMeasure} measure
 * @returns {string}
 */
export function fitText(text, width, size, bold, measure) {
  if (measure(text, size, bold) <= width + EPS) {
    return text;
  }
  const points = Array.from(text);
  while (points.length > 0) {
    points.pop();
    const shortened = `${points.join('').trimEnd()}…`;
    if (measure(shortened, size, bold) <= width + EPS) {
      return shortened;
    }
  }
  return '…';
}

/**
 * The title in at most three lines of the given width, broken at spaces; a word wider than a line is broken between
 * code points (never inside a surrogate pair). A title that needs more lines ends its last line with "…": on paper
 * only, the title itself is never changed.
 * @param {string} title
 * @param {number} width mm
 * @param {TextMeasure} measure
 * @param {number} [size]
 * @returns {string[]}
 */
export function wrapTitle(title, width, measure, size = TITLE_SIZE_MM) {
  const words = title.trim().split(/\s+/).filter((word) => word !== '').slice(0, 400);
  /** @param {string} text */
  const fits = (text) => measure(text, size, true) <= width + EPS;
  /** @type {string[]} */
  const lines = [];
  let current = '';
  for (const word of words) {
    const joined = current === '' ? word : `${current} ${word}`;
    if (fits(joined)) {
      current = joined;
      continue;
    }
    if (current !== '') {
      lines.push(current);
      current = '';
    }
    if (fits(word)) {
      current = word;
      continue;
    }
    for (const point of Array.from(word)) {
      if (current === '' || fits(current + point)) {
        current += point;
      } else {
        lines.push(current);
        current = point;
      }
    }
  }
  if (current !== '') {
    lines.push(current);
  }
  if (lines.length <= TITLE_MAX_LINES) {
    return lines;
  }
  const kept = lines.slice(0, TITLE_MAX_LINES);
  kept[TITLE_MAX_LINES - 1] = fitText(`${kept[TITLE_MAX_LINES - 1]}…`, width, size, true, measure);
  return kept;
}

/**
 * @typedef {object} TitleBlock
 * @property {string[]} lines The wrapped title (empty for no title).
 * @property {number} x Left edge of the lines in mm (beside a QR on the left it is under the QR's right edge).
 * @property {number} width mm the lines may use.
 * @property {number[]} baselines Baseline of each title line.
 * @property {number[]} detailBaselines Baseline of each detail line, 7.5 mm under the last title line, 5.5 mm apart.
 * @property {number} lastBaseline Baseline of the last detail line, or of the last title line.
 */

/**
 * The heading of the puzzle sheet: the title wrapped to the width (8 mm bold, 9 mm pitch, the first baseline at 19 mm)
 * and the detail lines under it. The sheet draws it from the same call, so layout and drawing agree.
 * @param {string} title
 * @param {number} detailCount
 * @param {number} width mm
 * @param {TextMeasure} measure
 * @param {number} [x] Left edge in mm.
 * @returns {TitleBlock}
 */
export function titleBlock(title, detailCount, width, measure, x = PAGE_MARGIN) {
  const lines = title === '' ? [] : wrapTitle(title, width, measure);
  const baselines = lines.map((_, i) => TITLE_FIRST_BASELINE + i * TITLE_PITCH_MM);
  const lastTitle = baselines.length > 0 ? baselines[baselines.length - 1] : TITLE_FIRST_BASELINE;
  const detailBaselines = Array.from({ length: detailCount }, (_, i) => lastTitle + DETAIL_AFTER_TITLE_MM + i * DETAIL_PITCH_MM);
  return { lines, x, width, baselines, detailBaselines, lastBaseline: detailBaselines.length > 0 ? detailBaselines[detailCount - 1] : lastTitle };
}

/**
 * @typedef {object} BandLayout
 * @property {TitleBlock} head
 * @property {{ x: number, y: number, size: number, scanY: number, columnEnd: number } | null} qr The QR box (the
 *   top-left corner of the content area) and the baseline of the caption under it.
 * @property {number | null} noCodeY Baseline of the "too large for a puzzle code" line, instead of the QR.
 * @property {number} bottom End of the band: the larger of the heading's last baseline + 2 mm and the QR column.
 * @property {number} top Where the board preview starts.
 */

/**
 * The heading and, when the share has a QR, the QR of the first sheet: the QR at the left, the puzzle name and its
 * details to the right of it. The puzzle code itself is not printed: the QR carries it.
 * @param {{ title: string, detailCount: number, share: import('./puzzle-snapshot.js').PreparedPuzzleShare | null | undefined,
 *   measure: TextMeasure, frame?: Frame }} input A `share` of undefined means the job asks for no code at all. In a frame
 *   narrower or lower than the page the QR box is drawn smaller than its natural size when it would take more than
 *   45 % of the frame's width or height (its modules then print below 0.5 mm).
 * @returns {BandLayout}
 */
export function layoutBand({ title, detailCount, share, measure, frame = PAGE_FRAME }) {
  const qrBox = share?.qr ?? null;
  const small = frame.width < AREA_WIDTH || frame.bottom < PREVIEW_BOTTOM;
  const cap = small ? 0.45 * Math.min(frame.width, frame.bottom - PAGE_MARGIN) : Infinity;
  const size = qrBox === null ? 0 : Math.min(qrBox.outerMm, cap);
  const columnEnd = qrBox === null ? 0 : PAGE_MARGIN + size + QR_COLUMN_END_MM;
  const headX = qrBox === null ? PAGE_MARGIN : PAGE_MARGIN + size + QR_COLUMN_GAP_MM;
  const head = titleBlock(title, detailCount, qrBox === null ? frame.width : frame.width - QR_COLUMN_GAP_MM - size, measure, headX);
  const labelY = head.lastBaseline + (detailCount > 0 ? NO_CODE_AFTER_DETAIL_MM : DETAIL_AFTER_TITLE_MM);

  if (share === undefined || share === null) {
    const bottom = head.lastBaseline + LINE_BOTTOM_MM;
    return { head, qr: null, noCodeY: null, bottom, top: Math.max(PREVIEW_TOP, bottom + BAND_GAP_MM) };
  }
  if (qrBox === null) {
    const bottom = labelY + LINE_BOTTOM_MM;
    return { head, qr: null, noCodeY: labelY, bottom, top: Math.max(PREVIEW_TOP, bottom + BAND_GAP_MM) };
  }
  const bottom = Math.max(head.lastBaseline + LINE_BOTTOM_MM, columnEnd);
  return {
    head,
    qr: { x: PAGE_MARGIN, y: PAGE_MARGIN, size, scanY: PAGE_MARGIN + size + QR_SCAN_BASELINE_MM, columnEnd },
    noCodeY: null,
    bottom,
    top: Math.max(PREVIEW_TOP, bottom + BAND_GAP_MM),
  };
}

/**
 * @typedef {object} PrintOptions
 * @property {boolean} pieces Print the piece set.
 * @property {boolean} board Print the board.
 * @property {PrintSize} size
 * @property {boolean} duplex Print on both sides of the paper.
 * @property {boolean} [solution] Add the solved board after the puzzle (for each puzzle that has a stored solution).
 * @property {PerPage} [perPage] Puzzles on one sheet (1 when absent).
 */

/**
 * @typedef {object} SolutionLayout
 * @property {number} cellMm
 * @property {number} boardX
 * @property {number} boardY
 * @property {{ piece: Piece, index: number, cells: XY[] }[]} placed Every piece of the solution, in board cells.
 */

/**
 * @typedef {object} PrintJobInput What the plan reads of a job.
 * @property {Board} board
 * @property {Piece[]} pieces
 * @property {Pose[]} clues
 * @property {number} rotation
 * @property {Pose[] | null} [solution]
 * @property {string} [title] The heading of the puzzle sheet; the plan lays it out in up to three lines.
 * @property {unknown[]} [details] The detail lines under the title (only their number matters here).
 * @property {import('./puzzle-snapshot.js').PreparedPuzzleShare | null} [share] The prepared code and QR; undefined asks
 *   for no code at all, a share without a QR prints the "too large for a puzzle code" line instead.
 * @property {TextMeasure} [measure] Width of a text in the font the sheet is drawn in (the browser's own measure).
 */

/**
 * @typedef {object} FrameItem A puzzle on a sheet: its index in the plan and the translation of its frame.
 * @property {number} puzzle
 * @property {number} dx
 * @property {number} dy
 */

/**
 * @typedef {{ kind: 'preview', items: FrameItem[] } | { kind: 'pieces', n: number, total: number, placements: PiecePlacement[] }
 *   | { kind: 'board', tile: BoardTile, total: number, tilesAcross: number, tilesDown: number }
 *   | { kind: 'solution', layout: SolutionLayout, items: FrameItem[] }} Sheet The puzzle and solution sheets hold one
 *   frame per puzzle; a solution sheet's `layout` is the one of its first puzzle.
 */

/**
 * @typedef {object} PuzzlePlan What the plan lays out for one puzzle of the printout.
 * @property {PrintModel} model The puzzle's board and pieces, turned like the rest of the printout.
 * @property {BandLayout} band The heading and the QR of the puzzle's frame.
 * @property {import('./puzzle-snapshot.js').PreparedPuzzleShare | null} share The prepared code the band was laid out for.
 * @property {PreviewLayout} preview
 * @property {SolutionLayout | null} solution Null without the solution option or a stored solution.
 */

/**
 * @typedef {object} PrintPlan
 * @property {PrintModel} model The model of the first puzzle: the piece and board sheets are made from it.
 * @property {PrintOptions} options
 * @property {PerPage} perPage
 * @property {Frame} frame The room of one puzzle on a puzzle sheet.
 * @property {PuzzlePlan[]} puzzles The puzzles in print order; `band`, `share`, `preview` below are the first one's.
 * @property {number} cellMm
 * @property {boolean} reduced
 * @property {boolean} turned The board is printed a quarter turn from the shown view, to need fewer parts.
 * @property {BandLayout} band The heading and the QR of the first sheet.
 * @property {import('./puzzle-snapshot.js').PreparedPuzzleShare | null} share The prepared code the band was laid out for.
 * @property {TextMeasure} measure The text measure the band was laid out with; the sheets use it to elide captions.
 * @property {PreviewLayout} preview
 * @property {Sheet[]} sheets The printed faces in order: the puzzle, the solution when asked, the pieces, the board.
 * @property {{ sheet: Sheet, side: 'front' | 'back' }[]} pages The pages sent to the printer: with two sides, the
 *   back of every sheet follows its front; the back of the puzzle is blank, or holds the solution when it is printed,
 *   so each piece and board sheet keeps its mirrored back on its leaf.
 * @property {number} paper Sheets of paper needed (on two sides the puzzle and its solution share one).
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
 * The solution sheet: the board with every piece of the solution, as large as the page allows up to 10 mm cells,
 * under the same heading as the preview.
 * @param {{ board: Board, pieces: Piece[], clues: Pose[], rotation: number }} job
 * @param {Pose[]} solution
 * @param {PrintModel} model The model the rest of the printout uses (its angle is kept).
 * @param {Frame} [frame] The room of the puzzle on its sheet.
 * @returns {SolutionLayout}
 */
export function layoutSolution(job, solution, model, frame = PAGE_FRAME) {
  const solved = orientModel({ ...job, clues: solution, rotation: model.rotation });
  const cellMm = floorTenth(Math.min(PREVIEW_MAX_CELL_MM, frame.width / model.cols, (frame.bottom - PREVIEW_TOP) / model.rows));
  return {
    cellMm,
    boardX: PAGE_MARGIN + (frame.width - model.cols * cellMm) / 2,
    boardY: PREVIEW_TOP,
    placed: solved.clues,
  };
}

/**
 * @param {PrintJobInput} job
 * @param {PrintOptions} options
 * @returns {PrintPlan}
 */
export function planPrint(job, options) {
  return planPrintMany([job], options);
}

/**
 * The printout of one or more puzzles of the same board and piece set. The puzzles come in the order given, `perPage`
 * of them (1, 2 or 4) on each puzzle sheet; each is followed by its solution sheet when asked (a sheet of the solutions
 * of the same puzzles, on the back of the puzzle sheet when printing on both sides). The piece set and the board are
 * printed once, from the first puzzle.
 * @param {PrintJobInput[]} jobs At least one.
 * @param {PrintOptions} options
 * @returns {PrintPlan}
 */
export function planPrintMany(jobs, options) {
  const [first] = jobs;
  const { model, turned } = chooseModel(first, options);
  const { cellMm, reduced } = cellSizeFor(model, options.size);
  const measure = first.measure ?? estimateTextWidth;
  const perPage = options.perPage ?? 1;
  const { frame, slots, columns } = framesFor(perPage);
  /** @type {PuzzlePlan[]} */
  const puzzles = jobs.map((job, i) => {
    const mine = i === 0 ? model : orientModel({ ...job, rotation: model.rotation });
    const band = layoutBand({ title: job.title ?? '', detailCount: job.details?.length ?? 0, share: job.share, measure, frame });
    const stored = options.solution === true && job.solution !== undefined && job.solution !== null && job.solution.length > 0;
    return {
      model: mine,
      band,
      share: job.share ?? null,
      preview: layoutPreview(mine, band.top, frame),
      solution: stored ? layoutSolution(job, /** @type {Pose[]} */ (job.solution), mine, frame) : null,
    };
  });
  const groups = Math.ceil(puzzles.length / perPage);
  const solvedGroups = Array.from({ length: groups }, (_, g) => puzzles.slice(g * perPage, (g + 1) * perPage).some((p) => p.solution !== null)).filter(Boolean).length;
  const packed = options.pieces ? layoutPieceSheets(model.pieces, cellMm) : [];
  const boardLayout = options.board ? layoutBoard(model, cellMm) : null;
  const twoSided = options.duplex && groups + solvedGroups + packed.length + (boardLayout?.tiles.length ?? 0) > 1;
  /** @type {Sheet[]} */
  const sheets = [];
  /** @type {PrintPlan['pages']} */
  const pages = [];
  let leaves = 0;
  for (let from = 0; from < puzzles.length; from += perPage) {
    const group = puzzles.slice(from, from + perPage).map((_, k) => from + k);
    /** @type {Sheet} */
    const preview = { kind: 'preview', items: group.map((puzzle, k) => ({ puzzle, dx: slots[k].dx, dy: slots[k].dy })) };
    sheets.push(preview);
    pages.push({ sheet: preview, side: 'front' });
    leaves += 1;
    const solved = group.filter((puzzle) => puzzles[puzzle].solution !== null);
    if (solved.length > 0) {
      // On the back of the paper a puzzle's solution is in the same place seen from behind, so a column is mirrored.
      const column = (/** @type {number} */ k) => (twoSided && columns === 2 ? 1 - slots[k].col : slots[k].col);
      const solution = /** @type {Sheet} */ ({
        kind: 'solution',
        layout: /** @type {SolutionLayout} */ (puzzles[solved[0]].solution),
        items: solved.map((puzzle) => {
          const k = group.indexOf(puzzle);
          const slot = slots.find((s) => s.dy === slots[k].dy && s.col === column(k)) ?? slots[k];
          return { puzzle, dx: slot.dx, dy: slot.dy };
        }),
      });
      sheets.push(solution);
      pages.push({ sheet: solution, side: 'front' });
      leaves += twoSided ? 0 : 1;
    } else if (twoSided) {
      pages.push({ sheet: preview, side: 'back' });
    }
  }
  packed.forEach((placements, i) => {
    const sheet = /** @type {Sheet} */ ({ kind: 'pieces', n: i + 1, total: packed.length, placements });
    sheets.push(sheet);
    pages.push({ sheet, side: 'front' }, ...(twoSided ? [{ sheet, side: /** @type {const} */ ('back') }] : []));
    leaves += 1;
  });
  let boardParts = 0;
  if (boardLayout !== null) {
    const { tiles, tilesAcross, tilesDown } = boardLayout;
    boardParts = tiles.length;
    for (const tile of tiles) {
      const sheet = /** @type {Sheet} */ ({ kind: 'board', tile, total: tiles.length, tilesAcross, tilesDown });
      sheets.push(sheet);
      pages.push({ sheet, side: 'front' }, ...(twoSided ? [{ sheet, side: /** @type {const} */ ('back') }] : []));
      leaves += 1;
    }
  }
  return {
    model, options, perPage, frame, puzzles, cellMm, reduced, turned, band: puzzles[0].band, share: puzzles[0].share, measure,
    preview: puzzles[0].preview, sheets, pages, paper: leaves, boardParts,
  };
}
