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
/** The board preview and the pieces to place keep at least this much height on the first sheet. */
export const PREVIEW_MIN_HEIGHT = 120;
/** The code band of the first sheet ends here at the latest, so the preview keeps `PREVIEW_MIN_HEIGHT`. */
export const BAND_LIMIT = PREVIEW_BOTTOM - PREVIEW_MIN_HEIGHT - 4;
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
export function layoutPreview(model, top = PREVIEW_TOP) {
  const start = PREVIEW_SCALE * Math.min(PREVIEW_MAX_CELL_MM, AREA_WIDTH / model.cols, PREVIEW_BOARD_MAX_HEIGHT_MM / model.rows);
  /** @type {PreviewLayout | null} */
  let found = null;
  for (let cell = start; found === null; cell = Math.max(PREVIEW_MIN_CELL_MM, cell * 0.95)) {
    const boardY = top;
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
export const CODE_LABEL_SIZE_MM = 3.2;
const CODE_LABEL_AFTER_DETAIL_MM = 6;
export const CORE_SIZE_MM = 4.2;
const CORE_PITCH_MM = 5.5;
const CORE_AFTER_LABEL_MM = 6;
export const TAIL_SIZE_MM = 3.2;
const TAIL_PITCH_MM = 4.5;
const TAIL_LABEL_AFTER_CORE_MM = 6;
const TAIL_AFTER_LABEL_MM = 5;
/** A monospace character is this many times its font size wide; `textLength` makes it so whatever the installed font. */
export const CODE_ADVANCE_EM = 0.6;
export const CODE_GROUP_SYMBOLS = 4;
/** Room reserved under a line's baseline. */
const LINE_BOTTOM_MM = 2;
/** Pitch of the "continued on the next sheet" notice. */
export const CODE_MORE_PITCH_MM = 5.5;
/** QR box: its top-right corner is the corner of the content area; the text column keeps 6 mm clear of it. */
const QR_COLUMN_GAP_MM = 6;
const QR_SCAN_BASELINE_MM = 4.5;
const QR_HOST_BASELINE_MM = 8.5;
const QR_COLUMN_END_MM = 10;
export const QR_SCAN_SIZE_MM = 3.2;
export const QR_HOST_SIZE_MM = 2.8;
const BAND_GAP_MM = 4;
/** Continuation sheets: heading, puzzle heading, then the code from the same baseline down to the content area. */
export const CONTINUATION_TITLE_SIZE_MM = 6;
export const CONTINUATION_HEADING_SIZE_MM = 4;
const CONTINUATION_HEADING_BASELINE = PAGE_MARGIN + 16.5;
const CONTINUATION_FIRST_LINE = 36;
const CONTENT_BOTTOM = PAGE_HEIGHT - PAGE_MARGIN;

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
 * @returns {TitleBlock}
 */
export function titleBlock(title, detailCount, width, measure) {
  const lines = title === '' ? [] : wrapTitle(title, width, measure);
  const baselines = lines.map((_, i) => TITLE_FIRST_BASELINE + i * TITLE_PITCH_MM);
  const lastTitle = baselines.length > 0 ? baselines[baselines.length - 1] : TITLE_FIRST_BASELINE;
  const detailBaselines = Array.from({ length: detailCount }, (_, i) => lastTitle + DETAIL_AFTER_TITLE_MM + i * DETAIL_PITCH_MM);
  return { lines, width, baselines, detailBaselines, lastBaseline: detailBaselines.length > 0 ? detailBaselines[detailCount - 1] : lastTitle };
}

/**
 * @param {string} symbols
 * @returns {string[]} The symbols in groups of four, the last one possibly shorter.
 */
export function codeGroups(symbols) {
  /** @type {string[]} */
  const groups = [];
  for (let i = 0; i < symbols.length; i += CODE_GROUP_SYMBOLS) {
    groups.push(symbols.slice(i, i + CODE_GROUP_SYMBOLS));
  }
  return groups;
}

/**
 * Whole groups of a line: a group is its symbols and one space, and a line holds as many as fit the width.
 * @param {number} width mm
 * @param {number} advance mm per character
 * @param {boolean} dot The line starts with the tail's dot, one more character.
 * @returns {number} At least 1.
 */
export function groupsPerLine(width, advance, dot = false) {
  const full = CODE_GROUP_SYMBOLS + 1;
  let groups = Math.floor((width + advance) / (full * advance) + EPS);
  if (dot && groups > 1 && full * groups * advance > width + EPS) {
    groups -= 1;
  }
  return Math.max(1, groups);
}

/**
 * One printed line of code: `text` is drawn as a single text element of exactly `textLength` mm.
 * @typedef {object} CodeLine
 * @property {'core' | 'tail'} part
 * @property {string} text Groups of four symbols, a space apart; the first line of a tail starts with its dot.
 * @property {number} x
 * @property {number} y Baseline.
 * @property {number} size Font size in mm.
 * @property {number} textLength Characters x 0.6 x size.
 */

/**
 * @typedef {object} CodeSheet
 * @property {number} n 1-based number of the continuation sheet.
 * @property {number} total Number of continuation sheets.
 * @property {CodeLine[]} lines Core lines, then tail lines, in reading order.
 * @property {number | null} tailLabelY Baseline of the tail label when the tail starts on this sheet.
 */

/**
 * @typedef {object} BandLayout
 * @property {TitleBlock} head
 * @property {{ x: number, y: number, size: number, scanY: number, hostY: number, columnEnd: number } | null} qr The QR
 *   box (the top-right corner of the content area) and the baselines of the two captions under it.
 * @property {{ labelY: number, labelWidth: number, count: number, lines: CodeLine[], tailLabelY: number | null,
 *   moreY: number | null } | null} code The typed code on the first sheet: its label, lines, the tail label and the
 *   "continued" notice when lines go to the next sheets.
 * @property {number | null} noCodeY Baseline of the "too large for a puzzle code" line, instead of the code and the QR.
 * @property {CodeSheet[]} continuation
 * @property {number} bottom End of the band: the larger of the text column's last baseline + 2 mm and the QR column.
 * @property {number} top Where the board preview starts.
 */

/**
 * The heading and, when the share has them, the code and the QR of the first sheet; the rest of the code goes to
 * continuation sheets.
 * @param {{ title: string, detailCount: number, share: import('./puzzle-snapshot.js').PreparedPuzzleShare | null | undefined,
 *   measure: TextMeasure }} input A `share` of undefined means the job asks for no code at all.
 * @returns {BandLayout}
 */
export function layoutBand({ title, detailCount, share, measure }) {
  const qrBox = share?.qr ?? null;
  const size = qrBox === null ? 0 : qrBox.outerMm;
  const columnEnd = qrBox === null ? 0 : PAGE_MARGIN + size + QR_COLUMN_END_MM;
  const narrow = AREA_WIDTH - QR_COLUMN_GAP_MM - size;
  /** Width of a line whose top is at `top`: narrow while it is beside the QR column. */
  const widthAt = (/** @type {number} */ top) => (qrBox !== null && top < columnEnd - EPS ? narrow : AREA_WIDTH);
  // The three title lines all start above the end of the shortest QR column, so they share one width.
  const head = titleBlock(title, detailCount, qrBox === null ? AREA_WIDTH : narrow, measure);
  const qr = qrBox === null ? null : {
    x: PAGE_WIDTH - PAGE_MARGIN - size,
    y: PAGE_MARGIN,
    size,
    scanY: PAGE_MARGIN + size + QR_SCAN_BASELINE_MM,
    hostY: PAGE_MARGIN + size + QR_HOST_BASELINE_MM,
    columnEnd,
  };
  const labelY = head.lastBaseline + (detailCount > 0 ? CODE_LABEL_AFTER_DETAIL_MM : DETAIL_AFTER_TITLE_MM);
  /** @type {BandLayout['continuation']} */
  const continuation = [];

  if (share === undefined || share === null) {
    const bottom = head.lastBaseline + LINE_BOTTOM_MM;
    return { head, qr: null, code: null, noCodeY: null, continuation, bottom, top: Math.max(PREVIEW_TOP, bottom + BAND_GAP_MM) };
  }
  if (qrBox === null) {
    const bottom = labelY + LINE_BOTTOM_MM;
    return { head, qr: null, code: null, noCodeY: labelY, continuation, bottom, top: Math.max(PREVIEW_TOP, bottom + BAND_GAP_MM) };
  }

  const coreAdvance = CODE_ADVANCE_EM * CORE_SIZE_MM;
  const tailAdvance = CODE_ADVANCE_EM * TAIL_SIZE_MM;
  const coreGroups = codeGroups(share.code.C);
  const tailGroups = share.code.T === null ? [] : codeGroups(share.code.T);
  const firstCore = labelY + CORE_AFTER_LABEL_MM;

  /**
   * @param {'core' | 'tail'} part
   * @param {string[]} groups
   * @param {number} from
   * @param {number} y
   * @param {number} width
   * @param {boolean} dot
   * @returns {CodeLine & { taken: number }}
   */
  const lineOf = (part, groups, from, y, width, dot) => {
    const tail = part === 'tail';
    const advance = tail ? tailAdvance : coreAdvance;
    const taken = Math.min(groupsPerLine(width, advance, dot), groups.length - from);
    const text = `${dot ? '.' : ''}${groups.slice(from, from + taken).join(' ')}`;
    return { part, text, x: PAGE_MARGIN, y, size: tail ? TAIL_SIZE_MM : CORE_SIZE_MM, textLength: text.length * advance, taken };
  };

  /**
   * Flows the code down the first sheet; a line is placed only when its reserved bottom stays within the limit.
   * @param {number} limit
   */
  const flowFirst = (limit) => {
    /** @type {CodeLine[]} */
    const lines = [];
    let core = 0;
    let tail = 0;
    let y = firstCore;
    let last = null;
    let tailLabelY = null;
    while (core < coreGroups.length && y + LINE_BOTTOM_MM <= limit + EPS) {
      const line = lineOf('core', coreGroups, core, y, widthAt(y - CORE_SIZE_MM), false);
      lines.push(line);
      core += line.taken;
      last = y;
      y += CORE_PITCH_MM;
    }
    if (core === coreGroups.length && tailGroups.length > 0 && last !== null) {
      // The label and the first tail line stay together.
      const label = last + TAIL_LABEL_AFTER_CORE_MM;
      y = label + TAIL_AFTER_LABEL_MM;
      if (y + LINE_BOTTOM_MM <= limit + EPS) {
        tailLabelY = label;
        while (tail < tailGroups.length && y + LINE_BOTTOM_MM <= limit + EPS) {
          const line = lineOf('tail', tailGroups, tail, y, widthAt(y - TAIL_SIZE_MM), tail === 0);
          lines.push(line);
          tail += line.taken;
          last = y;
          y += TAIL_PITCH_MM;
        }
      }
    }
    return { lines, core, tail, last: /** @type {number} */ (last ?? firstCore), tailLabelY, complete: core === coreGroups.length && tail === tailGroups.length };
  };

  let flow = flowFirst(BAND_LIMIT);
  /** @type {number | null} */
  let moreY = null;
  if (!flow.complete) {
    // Something goes on to the next sheets: keep room for the notice under the last line.
    flow = flowFirst(BAND_LIMIT - CODE_MORE_PITCH_MM);
    moreY = flow.last + CODE_MORE_PITCH_MM;
  }

  if (!flow.complete) {
    let coreAt = flow.core;
    let tailAt = flow.tail;
    /** @type {Omit<CodeSheet, 'total'>[]} */
    const pages = [];
    while (coreAt < coreGroups.length || tailAt < tailGroups.length) {
      /** @type {CodeLine[]} */
      const lines = [];
      let y = CONTINUATION_FIRST_LINE;
      /** @type {number | null} */
      let last = null;
      /** @type {number | null} */
      let tailLabelY = null;
      while (coreAt < coreGroups.length && y + LINE_BOTTOM_MM <= CONTENT_BOTTOM + EPS) {
        const line = lineOf('core', coreGroups, coreAt, y, AREA_WIDTH, false);
        lines.push(line);
        coreAt += line.taken;
        last = y;
        y += CORE_PITCH_MM;
      }
      if (coreAt === coreGroups.length && tailAt < tailGroups.length) {
        // A tail that starts on this sheet has its label, kept together with its first line.
        const starts = tailAt === 0;
        const label = last === null ? CONTINUATION_FIRST_LINE : last + TAIL_LABEL_AFTER_CORE_MM;
        y = starts ? label + TAIL_AFTER_LABEL_MM : CONTINUATION_FIRST_LINE;
        if (y + LINE_BOTTOM_MM <= CONTENT_BOTTOM + EPS) {
          tailLabelY = starts ? label : null;
          while (tailAt < tailGroups.length && y + LINE_BOTTOM_MM <= CONTENT_BOTTOM + EPS) {
            const line = lineOf('tail', tailGroups, tailAt, y, AREA_WIDTH, tailAt === 0);
            lines.push(line);
            tailAt += line.taken;
            y += TAIL_PITCH_MM;
          }
        }
      }
      if (lines.length === 0) {
        throw new RangeError('a continuation sheet cannot hold a line of the code');
      }
      pages.push({ n: pages.length + 1, lines, tailLabelY });
    }
    continuation.push(...pages.map((page) => ({ ...page, total: pages.length })));
  }

  const lastBaseline = Math.max(flow.last, moreY ?? 0);
  const bottom = Math.max(lastBaseline + LINE_BOTTOM_MM, columnEnd);
  return {
    head,
    qr,
    code: {
      labelY,
      labelWidth: widthAt(labelY - CODE_LABEL_SIZE_MM),
      count: share.code.C.length,
      lines: flow.lines.map(({ taken: _taken, ...line }) => line),
      tailLabelY: flow.tailLabelY,
      moreY,
    },
    noCodeY: null,
    continuation,
    bottom,
    top: bottom + BAND_GAP_MM,
  };
}

/**
 * @typedef {object} PrintOptions
 * @property {boolean} pieces Print the piece set.
 * @property {boolean} board Print the board.
 * @property {PrintSize} size
 * @property {boolean} duplex Print on both sides of the paper.
 * @property {boolean} [solution] Add a last sheet with the solved board (needs the job's solution).
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
 * @typedef {{ kind: 'preview' } | { kind: 'pieces', n: number, total: number, placements: PiecePlacement[] }
 *   | { kind: 'board', tile: BoardTile, total: number, tilesAcross: number, tilesDown: number }
 *   | ({ kind: 'code' } & CodeSheet)
 *   | { kind: 'solution', layout: SolutionLayout }} Sheet
 */

/**
 * @typedef {object} PrintPlan
 * @property {PrintModel} model
 * @property {PrintOptions} options
 * @property {number} cellMm
 * @property {boolean} reduced
 * @property {boolean} turned The board is printed a quarter turn from the shown view, to need fewer parts.
 * @property {BandLayout} band The heading and the code band of the first sheet, and the continuation sheets of the code.
 * @property {import('./puzzle-snapshot.js').PreparedPuzzleShare | null} share The prepared code the band was laid out for.
 * @property {TextMeasure} measure The text measure the band was laid out with; the sheets use it to elide captions.
 * @property {PreviewLayout} preview
 * @property {Sheet[]} sheets The printed faces in order. One side: the puzzle, the continuation sheets of its code, the
 *   solution when asked, the pieces, the board. Two sides: the puzzle, its solution when asked, the continuation sheets,
 *   the pieces, the board.
 * @property {{ sheet: Sheet, side: 'front' | 'back' }[]} pages The pages sent to the printer: with two sides, the
 *   back of every sheet follows its front; the back of the puzzle is blank, or holds the solution when it is printed,
 *   and every continuation sheet has a blank back, so each piece and board sheet keeps its mirrored back on its leaf.
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
 * @returns {SolutionLayout}
 */
export function layoutSolution(job, solution, model) {
  const solved = orientModel({ ...job, clues: solution, rotation: model.rotation });
  const cellMm = floorTenth(Math.min(PREVIEW_MAX_CELL_MM, AREA_WIDTH / model.cols, (PREVIEW_BOTTOM - PREVIEW_TOP) / model.rows));
  return {
    cellMm,
    boardX: PAGE_MARGIN + (AREA_WIDTH - model.cols * cellMm) / 2,
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
  const { model, turned } = chooseModel(job, options);
  const { cellMm, reduced } = cellSizeFor(model, options.size);
  const measure = job.measure ?? estimateTextWidth;
  const band = layoutBand({ title: job.title ?? '', detailCount: job.details?.length ?? 0, share: job.share, measure });
  /** @type {Sheet[]} */
  const sheets = [{ kind: 'preview' }];
  // The solution comes right after the puzzle; on two sides it is the back of the puzzle's sheet, and the continuation
  // sheets of the code follow it, each with a blank back, so that the pieces and the board keep their mirrored backs.
  const withSolution = options.solution === true && job.solution !== undefined && job.solution !== null && job.solution.length > 0;
  /** @type {Sheet | null} */
  const solutionSheet = withSolution ? { kind: 'solution', layout: layoutSolution(job, /** @type {Pose[]} */ (job.solution), model) } : null;
  if (solutionSheet !== null && options.duplex) {
    sheets.push(solutionSheet);
  }
  for (const sheet of band.continuation) {
    sheets.push({ kind: 'code', ...sheet });
  }
  if (solutionSheet !== null && !options.duplex) {
    sheets.push(solutionSheet);
  }
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
  const twoSided = options.duplex && sheets.length > 1;
  for (const sheet of sheets) {
    pages.push({ sheet, side: 'front' });
    if (twoSided && !(withSolution && (sheet.kind === 'preview' || sheet.kind === 'solution'))) {
      pages.push({ sheet, side: 'back' });
    }
  }
  const paper = sheets.length - (twoSided && withSolution ? 1 : 0);
  return { model, options, cellMm, reduced, turned, band, share: job.share ?? null, measure, preview: layoutPreview(model, band.top), sheets, pages, paper, boardParts };
}
