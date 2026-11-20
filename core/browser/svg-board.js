// @ts-check
// Shared SVG rendering for the board, the tray and thumbnails. The board lives in logical cell units inside one group
// that carries the display rotation, so hit-testing is the inverse of that group's screen matrix. Nothing here
// decides legality or mutates game state.

import { activeCells, classifyBlocked } from '../engine/board.js';
import { outlineLoops, transformCells } from '../engine/geometry.js';
import { patternFor } from '../engine/palette.js';
import { displayColor, inkFor, pieceGlyph, pieceLabelText } from './piece-look.js';
import { activeCenter, fitCellSize, normalizeAngle, rotatedExtent } from '../engine/view.js';

/** @typedef {import('../engine/types.js').XY} XY */
/** @typedef {import('../engine/types.js').Board} Board */
/** @typedef {import('../engine/types.js').Piece} Piece */
/** @typedef {import('../engine/types.js').Pose} Pose */

/**
 * @typedef {object} BoardViewOptions
 * @property {'play' | 'edit' | 'thumbnail'} mode
 * @property {boolean} [showBlocked] Thumbnail: frame the whole grid and mark blocked cells like the editor does.
 * @property {number} [rotation] Display angle, counter-clockwise, multiple of 45.
 * @property {number} [cellPx] Initial cell size in CSS px. Without it play/edit fit the host once.
 * @property {boolean} [autoFit] Refit with a ResizeObserver; off by default so layout never moves mid-gesture.
 * @property {string} [label] Accessible name of the board surface.
 * @property {string} [describedBy] Id of the element holding usage instructions.
 * @property {(cell: XY, event: PointerEvent) => void} [onCell] Edit: every cell painted (press and drag). Play: a tap on a cell.
 * @property {(pieceId: string, event: PointerEvent | KeyboardEvent) => void} [onPiece] A tap, Enter or Space on a movable board piece.
 */

/**
 * @typedef {object} BoardViewModel
 * @property {Board} board
 * @property {Piece[]} pieces
 * @property {Pose[]} clues
 * @property {Pose[]} placements
 * @property {{ pose: Pose, valid: boolean, reason?: string } | null} [preview]
 * @property {string | null} [selectedId]
 * @property {XY | null} [cursor]
 * @property {XY[]} [invalidCells]
 * @property {boolean} showLabels
 * @property {boolean} showPatterns
 */

/**
 * @typedef {object} BoardView
 * @property {(model: BoardViewModel) => void} render
 * @property {(theta: number) => void} setRotation
 * @property {(cellPx: number) => void} setZoom
 * @property {(factor: number, clientX: number, clientY: number) => void} zoomAt Edit: scales the cell size, keeping the point under the pointer still.
 * @property {(on: boolean) => void} setPanMode Edit: while on, a drag moves the view instead of painting.
 * @property {(x: number, y: number) => void} panTo Centers the viewport on logical board point (x, y).
 * @property {(clientX: number, clientY: number, o?: { includeBlocked?: boolean }) => XY | null} cellAt
 * @property {(clientX: number, clientY: number) => DOMPoint} localPoint
 * @property {(avail?: { width: number, height: number }) => number} fit Applies the fitted cell size and returns it.
 * @property {() => void} refit Recomputes the view frame from the current board (deliberate, may move the viewport).
 * @property {() => { rotation: number, cellPx: number, scrollable: boolean }} getState
 * @property {HTMLElement} surface Stable scroll surface; attach pointer trackers here.
 * @property {SVGSVGElement} svg
 * @property {() => void} destroy
 */

/**
 * @typedef {object} PiecePreviewOptions
 * @property {number} [rotation] Display angle shared with the board.
 * @property {number} [cellPx]
 * @property {number} [index] Palette index of the piece, for patterns.
 * @property {number} [count] Piece count of the set, for patterns.
 * @property {string} [name] Accessible name; defaults to "Piece F, 5 cells".
 * @property {boolean} [interactive] Adds per-cell hit areas for pointer trackers (default true).
 */

export const SVG_NS = 'http://www.w3.org/2000/svg';
export const MIN_LABEL_CELL_PX = 10;
export const MIN_FIT_CELL_PX = 14;
export const MAX_FIT_CELL_PX = 64;
export const BOARD_PADDING = 0.5;
export const PREVIEW_PADDING = 0.25;

const DEFAULT_CELL_PX = 32;
const THUMBNAIL_CELL_PX = 8;
const MIN_ZOOM_PX = 1;
const MAX_ZOOM_PX = 256;
const OUTLINE_MIX = 0.35;
const OUTLINE_WIDTH = 0.06;
const SEAM_WIDTH = 0.02;
const SEAM_OPACITY = 0.25;
const FOCUS_COLOR = '#0b5fff';
const VALID_COLOR = '#1a9850';
const INVALID_COLOR = '#d73027';
const TAP_THRESHOLD = { mouse: 6, pen: 6, touch: 10 };

const HALF = Math.SQRT1_2;
// Exact cos/sin per 45-degree step, so right angles carry no float noise.
const TRIG = Object.freeze([
  [1, 0], [HALF, HALF], [0, 1], [-HALF, HALF], [-1, 0], [-HALF, -HALF], [0, -1], [HALF, -HALF],
]);

let viewCounter = 0;

/** @returns {string} A document-unique id prefix for SVG definitions. */
export function nextViewId() {
  viewCounter += 1;
  return `pmv${viewCounter}`;
}

/**
 * Whether labels are drawn: the switch is on and a cell is at least 10 CSS px.
 * @param {boolean} showLabels
 * @param {number} cellPx
 * @returns {boolean}
 */
export function labelsVisible(showLabels, cellPx) {
  return showLabels === true && cellPx >= MIN_LABEL_CELL_PX;
}

/**
 * Affine matrix of `rotate(-theta, cx, cy)` as SVG `matrix(a b c d e f)`.
 * @param {number} theta counter-clockwise degrees, multiple of 45
 * @param {XY} pivot
 * @returns {{ a: number, b: number, c: number, d: number, e: number, f: number }}
 */
export function displayMatrix(theta, pivot) {
  const [cos, sin] = TRIG[normalizeAngle(theta) / 45];
  const [cx, cy] = pivot;
  return { a: cos, b: -sin, c: sin, d: cos, e: cx - cos * cx - sin * cy, f: cy + sin * cx - cos * cy };
}

/**
 * @param {{ a: number, b: number, c: number, d: number, e: number, f: number }} m
 * @param {number} x
 * @param {number} y
 * @returns {XY}
 */
export function applyMatrix(m, x, y) {
  return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
}

/**
 * @param {{ a: number, b: number, c: number, d: number, e: number, f: number }} m
 * @returns {{ a: number, b: number, c: number, d: number, e: number, f: number }}
 */
export function invertMatrix(m) {
  const det = m.a * m.d - m.b * m.c;
  if (det === 0) {
    throw new RangeError('matrix is not invertible');
  }
  const a = m.d / det;
  const b = -m.b / det;
  const c = -m.c / det;
  const d = m.a / det;
  return { a, b, c, d, e: -(a * m.e + c * m.f), f: -(b * m.e + d * m.f) };
}

/**
 * Cell under a point in board-local logical units. Play requires an active
 * cell; `includeBlocked` (editor) accepts any cell inside W x H.
 * @param {Board} board
 * @param {number} x
 * @param {number} y
 * @param {{ includeBlocked?: boolean }} [o]
 * @returns {XY | null}
 */
export function cellFromLocal(board, x, y, o = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= board.width || cy >= board.height) {
    return null;
  }
  if (o.includeBlocked !== true && board.active[cy * board.width + cx] !== 1) {
    return null;
  }
  return [cx, cy];
}

/**
 * Bounding box of the rotated corners of the given cells about `pivot`.
 * @param {XY[]} cells
 * @param {number} theta
 * @param {XY} pivot
 * @returns {{ w: number, h: number, minX: number, minY: number }}
 */
export function rotatedFrame(cells, theta, pivot) {
  const m = displayMatrix(theta, pivot);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of cells) {
    for (const [px, py] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) {
      const [rx, ry] = applyMatrix(m, px, py);
      minX = Math.min(minX, rx);
      minY = Math.min(minY, ry);
      maxX = Math.max(maxX, rx);
      maxY = Math.max(maxY, ry);
    }
  }
  return { w: maxX - minX, h: maxY - minY, minX, minY };
}

/**
 * View frame of a board. The pivot is always the center of the active bounding
 * box. Play and thumbnails frame the active cells; the editor frames the whole
 * W x H grid so blocked margins stay reachable.
 * @param {Board} board
 * @param {number} theta
 * @param {'play' | 'edit' | 'thumbnail'} mode
 * @returns {{ pivot: XY, w: number, h: number, minX: number, minY: number }}
 */
export function boardFrame(board, theta, mode) {
  const active = activeCells(board);
  const pivot = activeCenter(active) ?? [board.width / 2, board.height / 2];
  const framed = mode === 'edit' || active.length === 0
    ? /** @type {XY[]} */ ([[0, 0], [board.width - 1, 0], [0, board.height - 1], [board.width - 1, board.height - 1]])
    : active;
  return { pivot, ...rotatedFrame(framed, theta, pivot) };
}

/**
 * Cell nearest the centroid of the cells; ties go to the smaller (y, x).
 * @param {XY[]} cells
 * @returns {XY}
 */
export function labelCell(cells) {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of cells) {
    sx += x + 0.5;
    sy += y + 0.5;
  }
  const mx = sx / cells.length;
  const my = sy / cells.length;
  let best = cells[0];
  let bestD = Infinity;
  for (const cell of cells) {
    const d = (cell[0] + 0.5 - mx) ** 2 + (cell[1] + 0.5 - my) ** 2;
    const better = d < bestD - 1e-9
      || (Math.abs(d - bestD) <= 1e-9 && (cell[1] < best[1] || (cell[1] === best[1] && cell[0] < best[0])));
    if (better) {
      best = cell;
      bestD = d;
    }
  }
  return best;
}

/**
 * Mixes a `#rrggbb` color toward black.
 * @param {string} hex
 * @param {number} [amount] 0..1
 * @returns {string}
 */
export function shade(hex, amount = OUTLINE_MIX) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (m === null) {
    return '#000000';
  }
  const n = parseInt(m[1], 16);
  const channel = (/** @type {number} */ shift) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * @param {number} n
 * @returns {string}
 */
function num(n) {
  return String(Math.round(n * 1e4) / 1e4);
}

/**
 * SVG path data for outline loops; use with `fill-rule="evenodd"`.
 * @param {XY[][]} loops
 * @returns {string}
 */
export function pathData(loops) {
  return loops
    .map((loop) => `${loop.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${num(x)} ${num(y)}`).join('')}Z`)
    .join('');
}

/**
 * Segments between neighbouring cells of one piece, as path data.
 * @param {XY[]} cells
 * @returns {string}
 */
export function seamPath(cells) {
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  const parts = [];
  for (const [x, y] of cells) {
    if (set.has(`${x + 1},${y}`)) {
      parts.push(`M${x + 1} ${y}L${x + 1} ${y + 1}`);
    }
    if (set.has(`${x},${y + 1}`)) {
      parts.push(`M${x} ${y + 1}L${x + 1} ${y + 1}`);
    }
  }
  return parts.join('');
}

/**
 * @param {Pose} pose
 * @returns {number}
 */
export function poseTransform(pose) {
  return (pose.mirrored ? 4 : 0) + pose.turn;
}

/**
 * Oriented cells in the same order as `piece.cells`, translated to min (0, 0),
 * so index i is the image of source cell i.
 * @param {XY[]} cells
 * @param {number} t
 * @returns {XY[]}
 */
export function alignedOrientedCells(cells, t) {
  const moved = transformCells(cells, t);
  const minX = Math.min(...moved.map((c) => c[0]));
  const minY = Math.min(...moved.map((c) => c[1]));
  return moved.map(([x, y]) => [x - minX, y - minY]);
}

/**
 * Accessible name of a piece.
 * @param {Piece} piece
 * @param {string} [status] e.g. "in tray" or "locked clue"
 * @param {XY[] | null} [cells] absolute cells when on the board
 * @returns {string}
 */
export function pieceName(piece, status = '', cells = null) {
  const parts = [`Piece ${pieceLabelText(piece.label)}`, `${piece.cells.length} ${piece.cells.length === 1 ? 'cell' : 'cells'}`];
  if (status !== '') {
    let where = '';
    if (cells !== null && cells.length > 0) {
      const [x, y] = [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0])[0];
      where = ` at row ${y + 1}, column ${x + 1}`;
    }
    parts.push(`${status}${where}`);
  }
  return parts.join(', ');
}

/**
 * @param {string} tag
 * @param {Record<string, string | number | boolean>} [attrs]
 * @param {...(Node | string | null | undefined)} children
 * @returns {SVGElement}
 */
export function svgEl(tag, attrs = {}, ...children) {
  const node = /** @type {SVGElement} */ (globalThis.document.createElementNS(SVG_NS, tag));
  for (const [name, value] of Object.entries(attrs)) {
    const lower = name.toLowerCase();
    if (lower.startsWith('on') || lower === 'style') {
      throw new TypeError(`Attribute "${name}" is not allowed`);
    }
    node.setAttribute(name, String(value));
  }
  for (const child of children) {
    if (child !== null && child !== undefined) {
      node.append(typeof child === 'string' ? globalThis.document.createTextNode(child) : child);
    }
  }
  return node;
}

/**
 * The cross that marks a blocked cell, so it stands out from an active one.
 * @param {number} x
 * @param {number} y
 * @param {string} stroke
 * @param {string} [className]
 * @returns {SVGElement}
 */
function crossMark(x, y, stroke, className = 'pm-cross') {
  return svgEl('path', {
    ...(className === '' ? {} : { class: className }),
    d: `M${x + 0.3} ${y + 0.3}L${x + 0.7} ${y + 0.7}M${x + 0.7} ${y + 0.3}L${x + 0.3} ${y + 0.7}`,
    fill: 'none', stroke, 'stroke-width': 0.08, 'stroke-linecap': 'round', 'pointer-events': 'none',
  });
}

/** Look of a blocked cell everywhere a board is drawn: a grey square with a cross in the middle, dark enough to tell
 * from the board on screen and on a black-and-white print. */
export const BLOCKED_FILL = '#c4c4c4';
export const BLOCKED_LINE = '#a9a9a9';
export const BLOCKED_MARK = '#555555';

/**
 * A blocked cell: a light grey square with a cross. On screen the theme recolours it through its classes; on paper
 * pass `themed: false` so the colours stay as given.
 * @param {number} x
 * @param {number} y
 * @param {{ className?: string, themed?: boolean, lineWidth?: number }} [o] `className` is added to the square.
 * @returns {SVGElement[]}
 */
export function blockedCell(x, y, { className = '', themed = true, lineWidth = 0.03 } = {}) {
  const squareClass = themed ? ['pm-blocked', className].filter(Boolean).join(' ') : className;
  return [
    svgEl('rect', {
      ...(squareClass === '' ? {} : { class: squareClass }),
      x, y, width: 1, height: 1, fill: BLOCKED_FILL, stroke: BLOCKED_LINE, 'stroke-width': lineWidth,
    }),
    crossMark(x, y, BLOCKED_MARK, themed ? 'pm-cross' : ''),
  ];
}

/**
 * Pattern definitions for one mounted view. Ids carry the view prefix so two
 * puzzle cards on a page can never reference each other's patterns.
 * @param {string} id
 * @returns {{ defs: SVGElement, piecePattern: (kind: 'dots' | 'hlines' | 'vlines', color: string) => string }}
 */
export function createDefs(id) {
  const defs = svgEl('defs');
  defs.append(
    svgEl('pattern', { id: `${id}-clue`, width: 0.3, height: 0.3, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
      svgEl('rect', { width: 0.3, height: 0.3, fill: '#ffffff', 'fill-opacity': 0.12 }),
      svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 0.3, stroke: '#000000', 'stroke-opacity': 0.45, 'stroke-width': 0.07 })),
  );
  /** @type {Map<string, string>} */
  const cache = new Map();
  return {
    defs,
    piecePattern(kind, color) {
      const ref = `${id}-${kind}-${color.replace('#', '')}`;
      if (!cache.has(ref)) {
        const ink = shade(color, 0.5);
        const attrs = { id: ref, patternUnits: 'userSpaceOnUse', width: 0.34, height: 0.34 };
        const body = kind === 'dots'
          ? svgEl('circle', { cx: 0.17, cy: 0.17, r: 0.07, fill: ink, 'fill-opacity': 0.55 })
          : kind === 'hlines'
            ? svgEl('line', { x1: 0, y1: 0.17, x2: 0.34, y2: 0.17, stroke: ink, 'stroke-opacity': 0.5, 'stroke-width': 0.07 })
            : svgEl('line', { x1: 0.17, y1: 0, x2: 0.17, y2: 0.34, stroke: ink, 'stroke-opacity': 0.5, 'stroke-width': 0.07 });
        defs.append(svgEl('pattern', attrs, body));
        cache.set(ref, ref);
      }
      return `url(#${ref})`;
    },
  };
}

/**
 * @typedef {object} PieceDrawOptions
 * @property {string} id View id prefix.
 * @property {ReturnType<typeof createDefs>} defs
 * @property {number} theta
 * @property {boolean} clue
 * @property {boolean} movable Gets focus, a role and per-cell hit areas.
 * @property {boolean} interactive Hit areas for pointer trackers.
 * @property {boolean} selected
 * @property {number} index Palette index of the piece.
 * @property {number} count Piece count of the set.
 * @property {boolean} showPatterns
 * @property {string} name
 */

/**
 * Draws one piece: even-odd fill, optional pattern, seams, clue hatching and
 * outline in one group, plus the overlay nodes (label, lock) that stay upright.
 * @param {Piece} piece
 * @param {XY[]} cells absolute cells aligned with `piece.cells`
 * @param {PieceDrawOptions} o
 * @returns {{ group: SVGElement, overlays: { label: SVGElement, lock: SVGElement | null } }}
 */
export function drawPiece(piece, cells, o) {
  const d = pathData(outlineLoops(cells));
  const group = svgEl('g', { class: `pm-piece ${o.clue ? 'pm-clue' : 'pm-movable'}`, 'data-piece-id': piece.id, 'data-movable': o.movable });
  if (o.movable) {
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', '0');
    group.setAttribute('aria-pressed', String(o.selected));
  } else {
    group.setAttribute('role', 'img');
  }
  group.setAttribute('aria-label', o.name);
  // Drawn colours come from piece-look.js (display only; the stored colour is unchanged).
  const color = displayColor(piece.color);
  group.append(svgEl('path', { class: 'pm-fill', d, fill: color, 'fill-rule': 'evenodd' }));
  const pattern = o.clue || !o.showPatterns ? 'none' : patternFor(o.index, o.count);
  if (pattern !== 'none') {
    group.append(svgEl('path', { class: 'pm-pattern', d, fill: o.defs.piecePattern(pattern, color), 'fill-rule': 'evenodd', 'pointer-events': 'none' }));
  }
  const seams = seamPath(cells);
  if (seams !== '') {
    group.append(svgEl('path', { class: 'pm-seams', d: seams, fill: 'none', stroke: '#000000', 'stroke-opacity': SEAM_OPACITY, 'stroke-width': SEAM_WIDTH, 'pointer-events': 'none' }));
  }
  if (o.clue) {
    group.append(svgEl('path', { class: 'pm-hatch', d, fill: `url(#${o.id}-clue)`, 'fill-rule': 'evenodd', 'pointer-events': 'none' }));
  }
  group.append(svgEl('path', { class: 'pm-outline', d, fill: 'none', stroke: shade(color), 'stroke-width': OUTLINE_WIDTH, 'stroke-linejoin': 'round', 'pointer-events': 'none' }));
  if (o.selected) {
    group.append(svgEl('path', { class: 'pm-selection', d, fill: 'none', stroke: FOCUS_COLOR, 'stroke-width': 0.14, 'stroke-linejoin': 'round', 'pointer-events': 'none' }));
  }
  if (o.movable && o.interactive) {
    cells.forEach(([x, y], i) => {
      group.append(svgEl('rect', { class: 'pm-hit', x, y, width: 1, height: 1, fill: '#000000', 'fill-opacity': 0, 'data-piece-id': piece.id, 'data-source-cell': i }));
    });
  }

  const [lx, ly] = labelCell(cells);
  const cx = lx + 0.5;
  const cy = ly + 0.5;
  const label = labelNode(piece.label, cx, cy, o.theta, color);
  let lock = null;
  if (o.clue) {
    // The padlock sits in the upper-right corner of the label cell, fully inside it (its halo included).
    lock = svgEl('g', { class: 'pm-lock', transform: `translate(${cx} ${cy}) rotate(${o.theta}) translate(0.28 -0.25) scale(0.26)`, 'pointer-events': 'none' },
      svgEl('path', { d: 'M-0.3 -0.05V-0.3A0.3 0.3 0 0 1 0.3 -0.3V-0.05', fill: 'none', stroke: '#ffffff', 'stroke-width': 0.4 }),
      svgEl('rect', { x: -0.55, y: -0.1, width: 1.1, height: 0.85, rx: 0.12, fill: '#ffffff' }),
      svgEl('path', { d: 'M-0.3 -0.05V-0.3A0.3 0.3 0 0 1 0.3 -0.3V-0.05', fill: 'none', stroke: '#1f1f1f', 'stroke-width': 0.18 }),
      svgEl('rect', { x: -0.45, y: 0, width: 0.9, height: 0.65, rx: 0.08, fill: '#1f1f1f' }));
  }
  return { group, overlays: { label, lock } };
}

/**
 * The label of a piece, upright in its label cell: one character, black or white with a halo of the other colour so
 * it reads on any fill and on a black-and-white print, and its mark (circle, square or black disc) for labels past Z.
 * @param {string} text The stored label.
 * @param {number} cx
 * @param {number} cy
 * @param {number} theta Display angle, undone so the label stays upright.
 * @param {string} fill Colour of the piece as drawn.
 * @returns {SVGElement}
 */
function labelNode(text, cx, cy, theta, fill) {
  const { char, mark } = pieceGlyph(text);
  const { ink, halo } = inkFor(fill);
  const marked = mark !== 'none';
  const size = char.length <= 1 ? (marked ? 0.48 : 0.62) : Math.min(0.62, 0.95 / (char.length * 0.62));
  const letterFill = mark === 'disc' ? halo : ink;
  /** @type {SVGElement[]} */
  const shapes = [];
  if (mark === 'circle') {
    shapes.push(
      svgEl('circle', { cx, cy, r: 0.38, fill: 'none', stroke: halo, 'stroke-width': 0.17 }),
      svgEl('circle', { class: 'pm-label-mark', cx, cy, r: 0.38, fill: 'none', stroke: ink, 'stroke-width': 0.07 }));
  } else if (mark === 'square') {
    shapes.push(
      svgEl('rect', { x: cx - 0.36, y: cy - 0.36, width: 0.72, height: 0.72, fill: 'none', stroke: halo, 'stroke-width': 0.17 }),
      svgEl('rect', { class: 'pm-label-mark', x: cx - 0.36, y: cy - 0.36, width: 0.72, height: 0.72, fill: 'none', stroke: ink, 'stroke-width': 0.07 }));
  } else if (mark === 'disc') {
    shapes.push(svgEl('circle', { class: 'pm-label-mark', cx, cy, r: 0.4, fill: ink, stroke: halo, 'stroke-width': 0.06 }));
  }
  return svgEl('g', { class: 'pm-label-group', 'data-mark': mark, transform: `rotate(${theta} ${cx} ${cy})`, 'pointer-events': 'none' },
    ...shapes,
    svgEl('text', {
      class: 'pm-label', x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'system-ui, sans-serif', 'font-weight': 700, 'font-size': size, fill: letterFill,
      ...(mark === 'disc' ? {} : { stroke: halo, 'stroke-width': 0.12, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }),
    }, char));
}

/**
 * @param {Element | null} node
 * @returns {Element | null}
 */
function movableTarget(node) {
  return node !== null && typeof node.closest === 'function' ? node.closest('[data-movable="true"]') : null;
}

/**
 * Draws a board in `host`: the step 1 editor (`edit`), the game board (`play`) or a static preview (`thumbnail`).
 * @param {HTMLElement} host
 * @param {BoardViewOptions} opts
 * @returns {BoardView}
 */
export function mountBoard(host, opts) {
  const mode = opts.mode;
  if (mode !== 'play' && mode !== 'edit' && mode !== 'thumbnail') {
    throw new RangeError(`unknown board mode: ${String(mode)}`);
  }
  const doc = host.ownerDocument;
  const win = /** @type {Window & typeof globalThis} */ (doc.defaultView ?? globalThis);
  const interactive = mode !== 'thumbnail';
  const wholeGrid = mode === 'edit' || (mode === 'thumbnail' && opts.showBlocked === true);
  const id = nextViewId();
  let theta = normalizeAngle(opts.rotation ?? 0);
  let cellPx = clampZoom(opts.cellPx ?? (mode === 'thumbnail' ? THUMBNAIL_CELL_PX : DEFAULT_CELL_PX));
  let sizeFixed = opts.cellPx !== undefined || mode === 'thumbnail';
  /** @type {BoardViewModel | null} */
  let model = null;
  /** @type {ReturnType<typeof boardFrame> | null} */
  let frame = null;
  let frameKey = '';
  let cellsKey = '';
  let panMode = false;
  let destroyed = false;

  const defs = createDefs(id);
  const root = doc.createElement('div');
  root.className = 'pm-board';
  root.dataset.mode = mode;
  const scroller = doc.createElement('div');
  scroller.className = 'pm-scroll';
  const svg = /** @type {SVGSVGElement} */ (svgEl('svg', { class: 'pm-svg', xmlns: SVG_NS, focusable: 'false' }));
  if (mode === 'thumbnail') {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', opts.label ?? 'Board preview');
  } else {
    svg.setAttribute('role', mode === 'play' ? 'application' : 'group');
    svg.setAttribute('aria-label', opts.label ?? (mode === 'play' ? 'Puzzle board' : 'Board editor'));
    if (opts.describedBy) {
      svg.setAttribute('aria-describedby', opts.describedBy);
    }
  }
  const group = svgEl('g', { class: 'pm-board-group' });
  const cellsLayer = svgEl('g', { class: 'pm-cells' });
  const piecesLayer = svgEl('g', { class: 'pm-pieces' });
  const labelsLayer = svgEl('g', { class: 'pm-labels', 'pointer-events': 'none' });
  const locksLayer = svgEl('g', { class: 'pm-locks', 'pointer-events': 'none' });
  const overlayLayer = svgEl('g', { class: 'pm-overlay', 'pointer-events': 'none' });
  group.append(cellsLayer, piecesLayer, labelsLayer, locksLayer, overlayLayer);
  svg.append(defs.defs, group);
  scroller.append(svg);
  root.append(scroller);
  host.append(root);

  /** @type {Array<[EventTarget, string, EventListener]>} */
  const listeners = [];
  /**
   * @param {EventTarget} target
   * @param {string} type
   * @param {(event: any) => void} fn
   */
  const listen = (target, type, fn) => {
    target.addEventListener(type, fn);
    listeners.push([target, type, fn]);
  };

  /**
   * @param {number} px
   * @returns {number}
   */
  function clampZoom(px) {
    if (typeof px !== 'number' || !Number.isFinite(px) || px <= 0) {
      throw new RangeError(`cellPx must be a positive number, got ${px}`);
    }
    return Math.min(MAX_ZOOM_PX, Math.max(MIN_ZOOM_PX, px));
  }

  /** @returns {DOMMatrix | null} */
  const screenMatrix = () => (destroyed ? null : /** @type {SVGGraphicsElement} */ (group).getScreenCTM());

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @returns {DOMPoint}
   */
  function localPoint(clientX, clientY) {
    const ctm = screenMatrix();
    if (ctm === null) {
      return new win.DOMPoint(NaN, NaN);
    }
    return new win.DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @param {{ includeBlocked?: boolean }} [o]
   * @returns {XY | null}
   */
  function cellAt(clientX, clientY, o = {}) {
    if (model === null || destroyed) {
      return null;
    }
    const p = localPoint(clientX, clientY);
    return cellFromLocal(model.board, p.x, p.y, o);
  }

  /** @returns {XY | null} Logical point at the center of the scroll viewport. */
  function viewportCenterLogical() {
    const rect = scroller.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || screenMatrix() === null) {
      return null;
    }
    const p = localPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return Number.isFinite(p.x) ? [p.x, p.y] : null;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  function panTo(x, y) {
    const ctm = screenMatrix();
    if (ctm === null) {
      return;
    }
    const rect = scroller.getBoundingClientRect();
    const p = new win.DOMPoint(x, y).matrixTransform(ctm);
    scroller.scrollLeft += p.x - (rect.left + rect.width / 2);
    scroller.scrollTop += p.y - (rect.top + rect.height / 2);
  }

  function applyLayout() {
    if (frame === null) {
      return;
    }
    const pad = BOARD_PADDING;
    svg.setAttribute('viewBox', `${num(frame.minX - pad)} ${num(frame.minY - pad)} ${num(frame.w + 2 * pad)} ${num(frame.h + 2 * pad)}`);
    svg.setAttribute('width', String(Math.round((frame.w + 2 * pad) * cellPx)));
    svg.setAttribute('height', String(Math.round((frame.h + 2 * pad) * cellPx)));
    group.setAttribute('transform', `rotate(${-theta} ${num(frame.pivot[0])} ${num(frame.pivot[1])})`);
    labelsLayer.setAttribute('display', labelsVisible(model?.showLabels === true, cellPx) ? 'inline' : 'none');
    root.dataset.scrollable = String(isScrollable());
  }

  /** @returns {boolean} */
  function isScrollable() {
    return scroller.scrollWidth > scroller.clientWidth + 1 || scroller.scrollHeight > scroller.clientHeight + 1;
  }

  /**
   * @param {BoardViewModel} m
   * @param {boolean} force
   */
  function ensureFrame(m, force) {
    const b = m.board;
    // The editor keeps its frame while cells are toggled so painting never
    // shifts the grid; play frames the (fixed) active shape.
    const key = wholeGrid ? `${b.width}x${b.height}` : `${b.width}x${b.height}:${b.active.join('')}`;
    if (force || frame === null || key !== frameKey) {
      frame = boardFrame(b, theta, wholeGrid ? 'edit' : mode);
      frameKey = key;
    }
  }

  /** @param {BoardViewModel} m */
  function renderCells(m) {
    const b = m.board;
    const key = `${wholeGrid ? 'grid' : mode}:${b.width}x${b.height}:${b.active.join('')}`;
    if (key === cellsKey) {
      return;
    }
    cellsKey = key;
    const kinds = classifyBlocked(b);
    const nodes = [];
    for (let y = 0; y < b.height; y += 1) {
      for (let x = 0; x < b.width; x += 1) {
        const kind = kinds[y * b.width + x];
        if (kind === 0) {
          nodes.push(svgEl('rect', { class: 'pm-cell', x, y, width: 1, height: 1, fill: '#f6f4ec', stroke: '#c9c5b8', 'stroke-width': 0.03 }));
        } else if (wholeGrid) {
          // Every blocked cell looks the same in the editor, inside the board or not.
          nodes.push(...blockedCell(x, y, { className: 'pm-guide' }));
        } else if (kind === 2) {
          // A hole inside the board; exterior cells are not drawn, so a heart reads as a heart.
          nodes.push(...blockedCell(x, y, { className: 'pm-hole' }));
        }
      }
    }
    cellsLayer.replaceChildren(...nodes);
  }

  /** @param {BoardViewModel} m */
  function renderPieces(m) {
    const focused = doc.activeElement;
    const focusId = focused !== null && root.contains(focused)
      ? movableTarget(/** @type {Element} */ (focused))?.getAttribute('data-piece-id') ?? null
      : null;
    const byId = new Map(m.pieces.map((p, i) => [p.id, { piece: p, index: i }]));
    const pieceNodes = [];
    const overlayNodes = [];
    const labelNodes = [];
    /**
     * @param {Pose} pose
     * @param {boolean} clue
     */
    const draw = (pose, clue) => {
      const entry = byId.get(pose.piece);
      if (entry === undefined) {
        return;
      }
      const t = poseTransform(pose);
      const cells = alignedOrientedCells(entry.piece.cells, t).map(([x, y]) => /** @type {XY} */ ([x + pose.x, y + pose.y]));
      const selected = !clue && m.selectedId === pose.piece;
      const { group: node, overlays } = drawPiece(entry.piece, cells, {
        id, defs, theta, clue, movable: !clue && interactive && mode === 'play', interactive: interactive && mode === 'play',
        selected, index: entry.index, count: m.pieces.length, showPatterns: m.showPatterns,
        name: pieceName(entry.piece, clue ? 'locked clue' : 'on board', cells),
      });
      pieceNodes.push(node);
      labelNodes.push(overlays.label);
      if (overlays.lock !== null) {
        overlayNodes.push(overlays.lock);
      }
    };
    for (const pose of m.clues) {
      draw(pose, true);
    }
    for (const pose of m.placements) {
      draw(pose, false);
    }
    // A touch keeps sending its events to the node it began on, and the browser cancels it when that node is removed:
    // so the piece under a finger stays in the page (hidden while the model does not draw it) until the finger is up.
    const heldId = press !== null && press.type !== 'mouse' ? press.pieceId : null;
    const held = heldId === null ? null : piecesLayer.querySelector(`[data-movable="true"][data-piece-id="${CSS.escape(heldId)}"]`);
    if (held !== null) {
      const fresh = pieceNodes.findIndex((node) => node.getAttribute('data-piece-id') === heldId && node.getAttribute('data-movable') === 'true');
      if (fresh >= 0) {
        pieceNodes.splice(fresh, 1);
        held.removeAttribute('visibility');
      } else {
        held.setAttribute('visibility', 'hidden');
      }
      pieceNodes.push(held);
      heldKept = true;
    }
    piecesLayer.replaceChildren(...pieceNodes);
    labelsLayer.replaceChildren(...labelNodes);
    locksLayer.replaceChildren(...overlayNodes);

    const marks = [];
    for (const [x, y] of m.invalidCells ?? []) {
      marks.push(svgEl('rect', { class: 'pm-invalid', x, y, width: 1, height: 1, fill: INVALID_COLOR, 'fill-opacity': 0.35, stroke: INVALID_COLOR, 'stroke-width': 0.06 }));
    }
    if (m.preview) {
      const entry = byId.get(m.preview.pose.piece);
      if (entry !== undefined) {
        const cells = alignedOrientedCells(entry.piece.cells, poseTransform(m.preview.pose)).map(([x, y]) => /** @type {XY} */ ([x + m.preview.pose.x, y + m.preview.pose.y]));
        const color = m.preview.valid ? VALID_COLOR : INVALID_COLOR;
        const ghost = svgEl('path', {
          class: 'pm-ghost', d: pathData(outlineLoops(cells)), fill: color, 'fill-opacity': 0.3, 'fill-rule': 'evenodd',
          stroke: color, 'stroke-width': 0.12, 'stroke-linejoin': 'round', 'data-valid': m.preview.valid,
        });
        if (m.preview.reason) {
          ghost.setAttribute('data-reason', m.preview.reason);
        }
        marks.push(ghost);
      }
    }
    if (m.cursor) {
      marks.push(svgEl('rect', {
        class: 'pm-cursor', x: m.cursor[0] + 0.04, y: m.cursor[1] + 0.04, width: 0.92, height: 0.92, fill: 'none',
        stroke: FOCUS_COLOR, 'stroke-width': 0.1, 'stroke-dasharray': '0.2 0.1',
      }));
    }
    overlayLayer.replaceChildren(...marks);

    if (focusId !== null) {
      /** @type {SVGElement | null} */
      const target = piecesLayer.querySelector(`[data-movable="true"][data-piece-id="${CSS.escape(focusId)}"]`);
      target?.focus({ preventScroll: true });
    }
  }

  /** @param {BoardViewModel} m */
  function render(m) {
    if (destroyed) {
      return;
    }
    model = m;
    ensureFrame(m, false);
    renderCells(m);
    renderPieces(m);
    if (!sizeFixed) {
      sizeFixed = true;
      if (host.clientWidth > 0 && host.clientHeight > 0) {
        cellPx = fitSize(host.clientWidth, host.clientHeight);
      }
    }
    applyLayout();
  }

  /**
   * @param {number} availW
   * @param {number} availH
   * @returns {number}
   */
  function fitSize(availW, availH) {
    return frame === null ? cellPx : fitCellSize(frame, availW, availH, { min: MIN_FIT_CELL_PX, max: MAX_FIT_CELL_PX, marginCells: BOARD_PADDING });
  }

  /**
   * @param {{ width: number, height: number }} [avail]
   * @returns {number}
   */
  function fit(avail) {
    const width = avail?.width ?? host.clientWidth;
    const height = avail?.height ?? host.clientHeight;
    if (destroyed || frame === null || !(width > 0 && height > 0)) {
      return cellPx;
    }
    cellPx = fitSize(width, height);
    sizeFixed = true;
    applyLayout();
    panTo(frame.pivot[0], frame.pivot[1]);
    return cellPx;
  }

  /** @param {number} px */
  function setZoom(px) {
    if (destroyed) {
      return;
    }
    const next = clampZoom(px);
    const center = viewportCenterLogical();
    cellPx = next;
    sizeFixed = true;
    applyLayout();
    if (center !== null) {
      panTo(center[0], center[1]);
    }
  }

  /**
   * @param {number} factor
   * @param {number} clientX
   * @param {number} clientY
   */
  function zoomAt(factor, clientX, clientY) {
    if (destroyed || frame === null || !(factor > 0)) {
      return;
    }
    const before = localPoint(clientX, clientY);
    const next = clampZoom(cellPx * factor);
    if (next === cellPx) {
      return;
    }
    cellPx = next;
    sizeFixed = true;
    applyLayout();
    const ctm = screenMatrix();
    if (ctm !== null && Number.isFinite(before.x)) {
      const p = before.matrixTransform(ctm);
      scroller.scrollLeft += p.x - clientX;
      scroller.scrollTop += p.y - clientY;
    }
  }

  /** @param {boolean} on */
  function setPanMode(on) {
    if (mode === 'edit' && !destroyed) {
      panMode = on;
      root.dataset.pan = String(on);
    }
  }

  /** @param {number} next */
  function setRotation(next) {
    if (destroyed) {
      return;
    }
    theta = normalizeAngle(next);
    if (model !== null) {
      ensureFrame(model, true);
      renderPieces(model);
      applyLayout();
      if (frame !== null) {
        panTo(frame.pivot[0], frame.pivot[1]);
      }
    }
  }

  function refit() {
    if (!destroyed && model !== null) {
      ensureFrame(model, true);
      applyLayout();
    }
  }

  // Pointer input on the scroll surface: edit paints cells, play reports taps
  // and lets a mouse drag pan a scrollable board.
  /** True while a rendering kept the touched piece's old node in the page (see `renderPieces`). */
  let heldKept = false;
  /** @type {{ pointerId: number, type: 'mouse' | 'pen' | 'touch', x: number, y: number, pieceId: string | null, last: XY | null, moved: boolean, panning: boolean, left: number, top: number, pending: { cell: XY, event: PointerEvent } | null } | null} */
  let press = null;
  /** Edit: touches currently down, for the two-finger pinch and pan. @type {Map<number, XY>} */
  const touches = new Map();
  /** @type {{ dist: number, mx: number, my: number } | null} */
  let pinch = null;

  function pinchState() {
    const [a, b] = [...touches.values()];
    return { dist: Math.hypot(a[0] - b[0], a[1] - b[1]), mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 };
  }

  function updatePinch() {
    const from = pinch;
    const next = pinchState();
    if (from !== null) {
      if (from.dist > 0 && next.dist > 0) {
        zoomAt(next.dist / from.dist, from.mx, from.my);
      }
      scroller.scrollLeft -= next.mx - from.mx;
      scroller.scrollTop -= next.my - from.my;
    }
    pinch = next;
  }

  /** @param {number} pointerId */
  function forgetTouch(pointerId) {
    if (touches.delete(pointerId) && touches.size < 2) {
      pinch = null;
    }
  }

  /** @param {WheelEvent} e */
  function onWheel(e) {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
    zoomAt(Math.exp(-e.deltaY * unit * 0.0015), e.clientX, e.clientY);
  }

  /** @param {PointerEvent} e */
  function onPointerDown(e) {
    if (!interactive) {
      return;
    }
    if (mode === 'edit' && e.pointerType === 'touch') {
      touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (touches.size === 2) {
        // A second finger turns the gesture into zoom and pan; the first finger's tap is dropped.
        if (press !== null) {
          release(press.pointerId);
          press = null;
        }
        pinch = pinchState();
        return;
      }
      if (touches.size > 2) {
        return;
      }
    }
    if (press !== null || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) {
      return;
    }
    const type = /** @type {'mouse' | 'pen' | 'touch'} */ (e.pointerType in TAP_THRESHOLD ? e.pointerType : 'mouse');
    const piece = mode === 'play' ? movableTarget(/** @type {Element | null} */ (e.target)) : null;
    const cell = cellAt(e.clientX, e.clientY, { includeBlocked: mode === 'edit' });
    const panning = mode === 'edit' && panMode;
    // A touch may be the start of a pinch, so its first cell waits for a move or the release.
    const deferred = mode === 'edit' && !panning && type === 'touch' && cell !== null;
    press = {
      pointerId: e.pointerId, type, x: e.clientX, y: e.clientY, pieceId: piece?.getAttribute('data-piece-id') ?? null,
      last: mode === 'edit' && !panning && !deferred ? cell : null, moved: false, panning,
      left: scroller.scrollLeft, top: scroller.scrollTop, pending: deferred ? { cell: /** @type {XY} */ (cell), event: e } : null,
    };
    if (mode === 'edit') {
      capture(e.pointerId);
      if (cell !== null && !panning && !deferred) {
        opts.onCell?.(cell, e);
      }
    }
  }

  /** @param {number} pointerId */
  function capture(pointerId) {
    try {
      scroller.setPointerCapture(pointerId);
    } catch {
      // The pointer may already be gone; the gesture then ends via pointerup/cancel.
    }
  }

  /** @param {PointerEvent} e */
  function onPointerMove(e) {
    if (mode === 'edit' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch !== null) {
        updatePinch();
        return;
      }
    }
    if (press === null || e.pointerId !== press.pointerId) {
      return;
    }
    if (mode === 'edit') {
      if (press.panning) {
        scroller.scrollLeft = press.left - (e.clientX - press.x);
        scroller.scrollTop = press.top - (e.clientY - press.y);
        return;
      }
      if (press.pending !== null) {
        if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < TAP_THRESHOLD[press.type]) {
          return;
        }
        const { cell: first, event } = press.pending;
        press.pending = null;
        press.last = first;
        opts.onCell?.(first, event);
      }
      const cell = cellAt(e.clientX, e.clientY, { includeBlocked: true });
      if (cell !== null && (press.last === null || cell[0] !== press.last[0] || cell[1] !== press.last[1])) {
        press.last = cell;
        opts.onCell?.(cell, e);
      }
      return;
    }
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    if (!press.moved && Math.hypot(dx, dy) >= TAP_THRESHOLD[press.type]) {
      press.moved = true;
      if (press.pieceId === null && press.type !== 'touch' && isScrollable()) {
        press.panning = true;
        capture(e.pointerId);
      }
    }
    if (press.panning) {
      scroller.scrollLeft = press.left - dx;
      scroller.scrollTop = press.top - dy;
    }
  }

  /** Draws the pieces again once the touch that held a node in the page has ended. */
  function dropHeld() {
    if (heldKept) {
      heldKept = false;
      if (model !== null && !destroyed) {
        renderPieces(model);
      }
    }
  }

  /** @param {PointerEvent} e */
  function onPointerUp(e) {
    forgetTouch(e.pointerId);
    if (press === null || e.pointerId !== press.pointerId) {
      return;
    }
    const done = press;
    press = null;
    release(e.pointerId);
    dropHeld();
    if (done.pending !== null) {
      opts.onCell?.(done.pending.cell, done.pending.event);
    }
    if (mode === 'play' && !done.moved) {
      if (done.pieceId !== null) {
        opts.onPiece?.(done.pieceId, e);
      } else {
        const cell = cellAt(e.clientX, e.clientY);
        if (cell !== null) {
          opts.onCell?.(cell, e);
        }
      }
    }
  }

  /** @param {PointerEvent} e */
  function onPointerCancel(e) {
    forgetTouch(e.pointerId);
    if (press !== null && e.pointerId === press.pointerId) {
      press = null;
      release(e.pointerId);
      dropHeld();
    }
  }

  /** @param {number} pointerId */
  function release(pointerId) {
    try {
      if (scroller.hasPointerCapture(pointerId)) {
        scroller.releasePointerCapture(pointerId);
      }
    } catch {
      // Already released.
    }
  }

  /** @param {KeyboardEvent} e */
  function onKeyDown(e) {
    if (mode !== 'play' || (e.key !== 'Enter' && e.key !== ' ')) {
      return;
    }
    const piece = movableTarget(/** @type {Element | null} */ (e.target));
    const pieceId = piece?.getAttribute('data-piece-id');
    if (pieceId) {
      e.preventDefault();
      opts.onPiece?.(pieceId, e);
    }
  }

  if (interactive) {
    listen(scroller, 'pointerdown', onPointerDown);
    listen(scroller, 'pointermove', onPointerMove);
    listen(scroller, 'pointerup', onPointerUp);
    listen(scroller, 'pointercancel', onPointerCancel);
    listen(scroller, 'lostpointercapture', onPointerCancel);
    listen(scroller, 'keydown', onKeyDown);
  }
  if (mode === 'edit') {
    scroller.addEventListener('wheel', onWheel, { passive: false });
    listeners.push([scroller, 'wheel', /** @type {EventListener} */ (onWheel)]);
  }

  /** @type {ResizeObserver | null} */
  let observer = null;
  if (opts.autoFit === true && typeof win.ResizeObserver === 'function') {
    observer = new win.ResizeObserver(() => {
      fit();
    });
    observer.observe(host);
  }

  return {
    render,
    setRotation,
    setZoom,
    zoomAt,
    setPanMode,
    panTo(x, y) {
      if (!destroyed) {
        panTo(x, y);
      }
    },
    cellAt,
    localPoint,
    fit,
    refit,
    getState: () => ({ rotation: theta, cellPx, scrollable: isScrollable() }),
    surface: scroller,
    svg,
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      observer?.disconnect();
      observer = null;
      for (const [target, type, fn] of listeners) {
        target.removeEventListener(type, fn);
      }
      listeners.length = 0;
      press = null;
      root.remove();
      model = null;
      frame = null;
    },
  };
}

/**
 * Mounts one piece at logical orientation `t` under the shared display angle.
 * Pieces keep the same look in the tray, the drag ghost and on the board.
 * @param {HTMLElement} host
 * @param {Piece} piece
 * @param {PiecePreviewOptions} [opts]
 * @returns {{ render: (o: { t: number, rotation?: number, showLabels: boolean, showPatterns: boolean }) => void,
 *   sourceCellAt: (clientX: number, clientY: number) => number | null, svg: SVGSVGElement, destroy: () => void }}
 */
export function mountPiecePreview(host, piece, opts = {}) {
  const doc = host.ownerDocument;
  const win = /** @type {Window & typeof globalThis} */ (doc.defaultView ?? globalThis);
  const id = nextViewId();
  const defs = createDefs(id);
  const cellPx = opts.cellPx ?? DEFAULT_CELL_PX;
  const svg = /** @type {SVGSVGElement} */ (svgEl('svg', { class: 'pm-svg pm-preview', xmlns: SVG_NS, focusable: 'false', role: 'img', 'aria-label': opts.name ?? pieceName(piece) }));
  const group = svgEl('g', { class: 'pm-board-group' });
  svg.append(defs.defs, group);
  host.append(svg);
  /** @type {XY[]} */
  let aligned = [];
  let destroyed = false;

  return {
    svg,
    render({ t, rotation, showLabels, showPatterns }) {
      if (destroyed) {
        return;
      }
      const theta = normalizeAngle(rotation ?? opts.rotation ?? 0);
      aligned = alignedOrientedCells(piece.cells, t);
      const pivot = /** @type {XY} */ (activeCenter(aligned));
      const frame = rotatedExtent(aligned, theta);
      const pad = PREVIEW_PADDING;
      svg.setAttribute('viewBox', `${num(frame.minX - pad)} ${num(frame.minY - pad)} ${num(frame.w + 2 * pad)} ${num(frame.h + 2 * pad)}`);
      svg.setAttribute('width', String(Math.round((frame.w + 2 * pad) * cellPx)));
      svg.setAttribute('height', String(Math.round((frame.h + 2 * pad) * cellPx)));
      group.setAttribute('transform', `rotate(${-theta} ${num(pivot[0])} ${num(pivot[1])})`);
      const { group: node, overlays } = drawPiece(piece, aligned, {
        id, defs, theta, clue: false, movable: false, interactive: false, selected: false,
        index: opts.index ?? 0, count: opts.count ?? 0, showPatterns, name: '',
      });
      node.removeAttribute('role');
      node.removeAttribute('aria-label');
      node.setAttribute('aria-hidden', 'true');
      if (opts.interactive !== false) {
        aligned.forEach(([x, y], i) => {
          node.append(svgEl('rect', { class: 'pm-hit', x, y, width: 1, height: 1, fill: '#000000', 'fill-opacity': 0, 'data-piece-id': piece.id, 'data-source-cell': i }));
        });
        node.setAttribute('data-movable', 'true');
      }
      const labels = svgEl('g', { class: 'pm-labels', 'pointer-events': 'none', display: labelsVisible(showLabels, cellPx) ? 'inline' : 'none' }, overlays.label);
      group.replaceChildren(node, labels);
    },
    sourceCellAt(clientX, clientY) {
      const ctm = destroyed ? null : /** @type {SVGGraphicsElement} */ (group).getScreenCTM();
      if (ctm === null) {
        return null;
      }
      const p = new win.DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        return null;
      }
      const x = Math.floor(p.x);
      const y = Math.floor(p.y);
      const index = aligned.findIndex((c) => c[0] === x && c[1] === y);
      return index === -1 ? null : index;
    },
    destroy() {
      destroyed = true;
      svg.remove();
    },
  };
}
