// @ts-check
// Builds the SVG pages of a printout from its plan (print-layout.js). One page is one SVG of 210 x 297 user units,
// drawn at 1 unit = 1 mm and printed at 210 mm x 297 mm, so a cell of the board and a cell of a piece are the same
// number of millimetres on paper. Every text comes from `text(key, args)`.

import { outlineLoops } from '../engine/geometry.js';
import {
  PAGE_HEIGHT, PAGE_MARGIN, PAGE_WIDTH, mirrorCells, mirrorX,
} from './print-layout.js';
import { blockedCell, createDefs, drawPiece, nextViewId, pathData, svgEl, SVG_NS } from './svg-board.js';

/** @typedef {import('../engine/types.js').XY} XY */
/** @typedef {import('./print-layout.js').PrintPlan} PrintPlan */
/** @typedef {import('./print-layout.js').PiecePlacement} PiecePlacement */
/** @typedef {(key: string, args?: Record<string, unknown>) => string} Translate */

/**
 * @typedef {{ text: string, bold?: boolean }[]} PrintLine A line of text in parts, some of them bold.
 */

/**
 * @typedef {object} PrintHeading
 * @property {string} title Puzzle name, e.g. "Puzzle #3".
 * @property {PrintLine[]} details Rating and seeds, already in the reader's language (`puzzleDetails`).
 */

const FONT = 'system-ui, sans-serif';
const BOARD_FILL = '#f4f4f4';
const GRID_COLOR = '#9a9a9a';
const GRID_MM = 0.25;
const CUT_COLOR = '#111111';
const CUT_MM = 0.6;
/** Below this cell size a letter is too small to read. */
const MIN_LABEL_CELL_MM = 2.5;
const RULER_MM = 50;
/** Outline of a piece on the preview board, thick and dark so the pieces stay apart in black and white. */
const PIECE_OUTLINE_COLOR = '#000000';
const PIECE_OUTLINE_MM = 0.6;
const JOIN_COLOR = '#111111';

/**
 * @param {number} n
 * @returns {number}
 */
const mm = (n) => Math.round(n * 1000) / 1000;

/**
 * @param {number} value
 * @returns {string} The number with at most one decimal.
 */
export function formatMm(value) {
  return String(Math.round(value * 10) / 10);
}

/**
 * @param {string} content
 * @param {{ x: number, y: number, size: number, bold?: boolean, fill?: string, anchor?: 'start' | 'middle' | 'end' }} o
 * @returns {SVGElement}
 */
function textNode(content, { x, y, size, bold = false, fill = '#111111', anchor = 'start' }) {
  return svgEl('text', {
    x: mm(x), y: mm(y), 'font-size': size, 'font-family': FONT, 'font-weight': bold ? 700 : 400, fill, 'text-anchor': anchor,
  }, content);
}

/**
 * The heading of the puzzle and solution sheets: the title, then each detail line with its bold parts.
 * @param {string} title
 * @param {PrintLine[]} details
 * @returns {SVGElement[]}
 */
function headingNodes(title, details) {
  return [
    textNode(title, { x: PAGE_MARGIN, y: PAGE_MARGIN + 9, size: 8, bold: true }),
    ...details.map((line, i) => svgEl('text', {
      class: 'pm-print-detail', x: PAGE_MARGIN, y: mm(PAGE_MARGIN + 16.5 + i * 5.5), 'font-size': 4, 'font-family': FONT, fill: '#444444',
    }, ...line.map((part) => svgEl('tspan', { 'font-weight': part.bold === true ? 700 : 400, ...(part.bold === true ? { fill: '#111111' } : {}) }, part.text)))),
  ];
}

/**
 * @returns {{ svg: SVGSVGElement, id: string, defs: ReturnType<typeof createDefs> }}
 */
function newPage() {
  const id = nextViewId();
  const defs = createDefs(id);
  const svg = /** @type {SVGSVGElement} */ (svgEl('svg', {
    xmlns: SVG_NS, width: `${PAGE_WIDTH}mm`, height: `${PAGE_HEIGHT}mm`, viewBox: `0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`,
    focusable: 'false', 'aria-hidden': 'true',
  }));
  svg.append(defs.defs);
  return { svg, id, defs };
}

/**
 * The cells of a board (or a part of it) with grid lines and a cut line around the playable area, in mm. Holes
 * (blocked cells inside the board) are light grey with a cross, as on screen.
 * @param {XY[]} cells
 * @param {XY[]} holes
 * @param {number} x mm
 * @param {number} y mm
 * @param {number} cellMm
 * @returns {SVGElement}
 */
function boardCells(cells, holes, x, y, cellMm) {
  const outline = pathData(outlineLoops(cells));
  const grid = cells.map(([cx, cy]) => `M${cx} ${cy}h1v1h-1z`).join('');
  return svgEl('g', { class: 'pm-print-board', transform: `translate(${mm(x)} ${mm(y)}) scale(${cellMm})` },
    svgEl('path', { d: outline, fill: BOARD_FILL, 'fill-rule': 'evenodd' }),
    svgEl('path', { d: grid, fill: 'none', stroke: GRID_COLOR, 'stroke-width': mm(GRID_MM / cellMm) }),
    ...holes.flatMap(([hx, hy]) => blockedCell(hx, hy, { className: 'pm-print-hole', themed: false, lineWidth: mm(GRID_MM / cellMm) })),
    svgEl('path', { d: outline, fill: 'none', stroke: CUT_COLOR, 'stroke-width': mm(CUT_MM / cellMm), 'stroke-linejoin': 'miter' }));
}

/**
 * One piece with its letter (and padlock when it is pre-placed), in cell units. `outline` (in cell units) adds a dark
 * outline, so the piece stands out on a black-and-white print.
 * @param {import('../engine/types.js').Piece} piece
 * @param {XY[]} cells
 * @param {{ id: string, defs: ReturnType<typeof createDefs>, index: number, count: number, clue: boolean, labels: boolean, outline?: number }} o
 * @returns {SVGElement}
 */
function pieceNode(piece, cells, o) {
  const { group, overlays } = drawPiece(piece, cells, {
    id: o.id, defs: o.defs, theta: 0, clue: o.clue, movable: false, interactive: false, selected: false,
    index: o.index, count: o.count, showPatterns: true, name: '',
  });
  group.removeAttribute('role');
  group.removeAttribute('aria-label');
  if (o.outline !== undefined) {
    group.append(svgEl('path', {
      class: 'pm-print-outline', d: pathData(outlineLoops(cells)), fill: 'none', stroke: PIECE_OUTLINE_COLOR,
      'stroke-width': mm(o.outline), 'stroke-linejoin': 'miter',
    }));
  }
  return svgEl('g', { class: 'pm-print-piece', 'data-piece-id': piece.id }, group,
    ...(o.labels ? [overlays.label, ...(overlays.lock === null ? [] : [overlays.lock])] : []));
}

/**
 * @param {PrintPlan} plan
 * @param {PrintHeading} heading
 * @param {Translate} text
 * @returns {SVGSVGElement}
 */
function previewPage(plan, heading, text) {
  const { model, preview, cellMm } = plan;
  const { svg, id, defs } = newPage();
  svg.append(...headingNodes(heading.title, heading.details));
  const c = preview.cellMm;
  const labels = c >= MIN_LABEL_CELL_MM;
  const board = boardCells(model.active, model.holes ?? [], preview.boardX, preview.boardY, c);
  svg.append(board);
  const clues = svgEl('g', { transform: `translate(${mm(preview.boardX)} ${mm(preview.boardY)}) scale(${mm(c)})` },
    ...model.clues.map((p) => pieceNode(p.piece, p.cells, {
      id, defs, index: p.index, count: model.pieces.length, clue: true, labels, outline: PIECE_OUTLINE_MM / c,
    })));
  svg.append(clues);
  if (model.clues.length > 0) {
    svg.append(textNode(text('print.sheet.legend'), { x: PAGE_MARGIN, y: preview.legendY + 1.5, size: 3, fill: '#555555' }));
  }
  if (model.toPlace.length > 0) {
    svg.append(textNode(text('print.sheet.toPlace', { count: model.toPlace.length }), { x: PAGE_MARGIN, y: preview.sectionY, size: 4.5, bold: true }));
    for (const p of preview.pieces) {
      svg.append(svgEl('g', { transform: `translate(${mm(p.x)} ${mm(p.y)}) scale(${mm(c)})` },
        pieceNode(p.item.piece, p.item.cells, { id, defs, index: p.item.index, count: model.pieces.length, clue: false, labels, outline: PIECE_OUTLINE_MM / c })));
    }
  }
  // The bar lets the reader check that the printer did not scale the page.
  const barY = PAGE_HEIGHT - PAGE_MARGIN - 6;
  svg.append(
    svgEl('path', {
      d: `M${PAGE_MARGIN} ${barY}h${RULER_MM}M${PAGE_MARGIN} ${barY - 1.5}v3M${PAGE_MARGIN + RULER_MM} ${barY - 1.5}v3`,
      fill: 'none', stroke: '#111111', 'stroke-width': 0.4,
    }),
    textNode(`${RULER_MM} mm`, { x: PAGE_MARGIN + RULER_MM / 2, y: barY + 4.5, size: 3, anchor: 'middle' }),
    textNode(text('print.sheet.cell', { mm: formatMm(cellMm) }), { x: PAGE_MARGIN + RULER_MM + 6, y: barY - 0.5, size: 3.2 }),
    textNode(text('print.sheet.scale', { mm: RULER_MM }), { x: PAGE_MARGIN + RULER_MM + 6, y: barY + 3.8, size: 3.2, fill: '#555555' }));
  return svg;
}

/**
 * @param {PrintPlan} plan
 * @param {Extract<import('./print-layout.js').Sheet, { kind: 'pieces' }>} sheet
 * @param {'front' | 'back'} side
 * @param {string} caption
 * @returns {SVGSVGElement}
 */
function piecesPage(plan, sheet, side, caption) {
  const { svg, id, defs } = newPage();
  const back = side === 'back';
  const labels = plan.cellMm >= MIN_LABEL_CELL_MM;
  if (!back) {
    svg.append(textNode(caption, { x: PAGE_MARGIN, y: 7, size: 3.2, fill: '#666666' }));
  }
  for (const p of sheet.placements) {
    const cells = back ? mirrorCells(p.item.cells, p.item.w) : p.item.cells;
    const x = back ? mirrorX(p.x, p.w) : p.x;
    svg.append(svgEl('g', { transform: `translate(${mm(x)} ${mm(p.y)}) scale(${plan.cellMm})` },
      pieceNode(p.item.piece, cells, { id, defs, index: p.item.index, count: plan.model.pieces.length, clue: false, labels, outline: PIECE_OUTLINE_MM / plan.cellMm })));
  }
  return svg;
}

/** Triangle (cell units) of a join mark on the given edge of a cell, pointing into the cell, and where its number goes. */
const JOIN_SHAPES = {
  right: { tri: [[1, 0.3], [1, 0.7], [0.78, 0.5]], label: [0.56, 0.5] },
  left: { tri: [[0, 0.3], [0, 0.7], [0.22, 0.5]], label: [0.44, 0.5] },
  top: { tri: [[0.3, 0], [0.7, 0], [0.5, 0.22]], label: [0.5, 0.44] },
  bottom: { tri: [[0.3, 1], [0.7, 1], [0.5, 0.78]], label: [0.5, 0.56] },
};

/**
 * Marks on the edges where a board part meets its neighbours: a dark triangle on the edge and the neighbour's part
 * number. They sit inside the cut line, so they stay on the part after cutting; the two marks of a joint line up.
 * @param {import('./print-layout.js').BoardJoin[]} joins
 * @param {number} x mm
 * @param {number} y mm
 * @param {number} cellMm
 * @returns {SVGElement}
 */
function joinMarks(joins, x, y, cellMm) {
  return svgEl('g', { class: 'pm-print-joins', transform: `translate(${mm(x)} ${mm(y)}) scale(${cellMm})` },
    ...joins.map((join) => {
      const shape = JOIN_SHAPES[join.side];
      const points = shape.tri.map(([px, py]) => `${join.x + px},${join.y + py}`).join(' ');
      return svgEl('g', { class: 'pm-print-join', 'data-to': join.to, 'data-side': join.side },
        svgEl('polygon', { points, fill: JOIN_COLOR }),
        svgEl('text', {
          x: join.x + shape.label[0], y: join.y + shape.label[1], 'font-size': 0.3, 'font-family': FONT, 'font-weight': 700,
          fill: JOIN_COLOR, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        }, String(join.to)));
    }));
}

/**
 * @param {PrintPlan} plan
 * @param {Extract<import('./print-layout.js').Sheet, { kind: 'board' }>} sheet
 * @param {'front' | 'back'} side
 * @param {string} caption
 * @param {string} hint Second caption line, or '' for none.
 * @returns {SVGSVGElement}
 */
function boardPage(plan, sheet, side, caption, hint) {
  const { svg } = newPage();
  const { tile } = sheet;
  const back = side === 'back';
  if (!back) {
    svg.append(textNode(caption, { x: PAGE_MARGIN, y: 7, size: 3.2, fill: '#666666' }));
    if (hint !== '') {
      svg.append(textNode(hint, { x: PAGE_MARGIN, y: PAGE_HEIGHT - 5, size: 3, fill: '#666666' }));
    }
  }
  const cells = back ? mirrorCells(tile.cells, tile.cols) : tile.cells;
  const holes = back ? mirrorCells(tile.holes, tile.cols) : tile.holes;
  /** @type {Record<string, 'left' | 'right' | 'top' | 'bottom'>} */
  const flip = { left: 'right', right: 'left', top: 'top', bottom: 'bottom' };
  const joins = back ? tile.joins.map((j) => ({ ...j, x: tile.cols - 1 - j.x, side: flip[j.side] })) : tile.joins;
  const left = back ? mirrorX(tile.x, tile.cols * plan.cellMm) : tile.x;
  svg.append(boardCells(cells, holes, left, tile.y, plan.cellMm));
  if (joins.length > 0) {
    svg.append(joinMarks(joins, left, tile.y, plan.cellMm));
  }
  return svg;
}

/**
 * The solution sheet: the heading, "Solution" and the board with every piece of the solution (the pre-placed ones in
 * their locked style), each with a dark outline for black-and-white printers.
 * @param {PrintPlan} plan
 * @param {Extract<import('./print-layout.js').Sheet, { kind: 'solution' }>} sheet
 * @param {PrintHeading} heading
 * @param {Translate} text
 * @returns {SVGSVGElement}
 */
function solutionPage(plan, sheet, heading, text) {
  const { model } = plan;
  const { layout } = sheet;
  const { svg, id, defs } = newPage();
  svg.append(...headingNodes(`${heading.title} · ${text('print.sheet.solution')}`, heading.details));
  const c = layout.cellMm;
  const clueIds = new Set(model.clues.map((p) => p.piece.id));
  svg.append(boardCells(model.active, model.holes ?? [], layout.boardX, layout.boardY, c));
  svg.append(svgEl('g', { class: 'pm-print-solution', transform: `translate(${mm(layout.boardX)} ${mm(layout.boardY)}) scale(${mm(c)})` },
    ...layout.placed.map((p) => pieceNode(p.piece, p.cells, {
      id, defs, index: p.index, count: model.pieces.length, clue: clueIds.has(p.piece.id), labels: c >= MIN_LABEL_CELL_MM,
      outline: PIECE_OUTLINE_MM / c,
    }))));
  return svg;
}

/**
 * @param {SVGSVGElement} svg
 * @returns {HTMLElement}
 */
function wrapPage(svg) {
  const page = globalThis.document.createElement('div');
  page.className = 'pm-print-page';
  page.append(svg);
  return page;
}

/**
 * The pages to send to the printer, in order: a sheet's back follows its front when printing on two sides.
 * @param {PrintPlan} plan
 * @param {PrintHeading} heading
 * @param {Translate} text
 * @returns {HTMLElement[]}
 */
export function buildPrintPages(plan, heading, text) {
  return plan.pages.map(({ sheet, side }) => {
    if (sheet.kind === 'preview') {
      return wrapPage(side === 'front' ? previewPage(plan, heading, text) : newPage().svg);
    }
    if (sheet.kind === 'solution') {
      return wrapPage(solutionPage(plan, sheet, heading, text));
    }
    if (sheet.kind === 'pieces') {
      const caption = `${heading.title} · ${text('print.sheet.pieces', { n: sheet.n, total: sheet.total })}`;
      return wrapPage(piecesPage(plan, sheet, side, caption));
    }
    const part = sheet.total === 1
      ? text('print.sheet.boardWhole')
      : text('print.sheet.boardPart', { n: sheet.tile.n, total: sheet.total, row: sheet.tile.tileRow, col: sheet.tile.tileCol });
    const hint = sheet.tile.joins.length > 0 ? text('print.sheet.boardJoin') : '';
    return wrapPage(boardPage(plan, sheet, side, `${heading.title} · ${part}`, hint));
  });
}
