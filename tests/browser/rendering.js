// @ts-check
// Browser regression harness for T16 (shared SVG rendering and pointer
// primitives). It runs in a real browser, writes a pass/fail list into the page
// and sets data-result on <html>. It is a developer fixture, not deployed.

import { activeCells, boardFromRows, preset, rectangle } from '../../core/engine/board.js';
import { packBoard, validatePack } from '../../core/engine/pack.js';
import { colorFor, labelFor, patternFor } from '../../core/engine/palette.js';
import { ANGLES, fitCellSize, rotatedExtent } from '../../core/engine/view.js';
import { mountBoard, mountPiecePreview } from '../../core/browser/svg-board.js';
import { createPointerTracker } from '../../core/browser/pointer.js';

/** @typedef {import('../../core/engine/types.js').XY} XY */

const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));

// Ledger of listeners per target, so destroy() can be checked for leaks.
const ledger = new Map();
const nativeAdd = EventTarget.prototype.addEventListener;
const nativeRemove = EventTarget.prototype.removeEventListener;
EventTarget.prototype.addEventListener = function patchedAdd(type, listener, options) {
  const key = `${type}`;
  const per = ledger.get(this) ?? new Map();
  per.set(key, (per.get(key) ?? new Set()).add(listener));
  ledger.set(this, per);
  return nativeAdd.call(this, type, listener, options);
};
EventTarget.prototype.removeEventListener = function patchedRemove(type, listener, options) {
  ledger.get(this)?.get(`${type}`)?.delete(listener);
  return nativeRemove.call(this, type, listener, options);
};
/**
 * @param {EventTarget} target
 * @returns {number}
 */
function listenerCount(target) {
  let n = 0;
  for (const set of ledger.get(target)?.values() ?? []) {
    n += set.size;
  }
  return n;
}

/**
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: String(/** @type {Error} */ (error)?.stack ?? error) });
  }
}

/**
 * @param {unknown} cond
 * @param {string} msg
 */
function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

/**
 * @param {number} a
 * @param {number} b
 * @param {string} msg
 * @param {number} [eps]
 */
function near(a, b, msg, eps = 0.5) {
  assert(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
}

const sandbox = document.createElement('div');
sandbox.id = 'sandbox';
document.body.append(sandbox);

/**
 * @param {number} w
 * @param {number} h
 * @param {HTMLElement} [parent]
 * @returns {HTMLElement}
 */
function makeHost(w, h, parent = sandbox) {
  const host = document.createElement('div');
  host.style.width = `${w}px`;
  host.style.height = `${h}px`;
  parent.append(host);
  return host;
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

/**
 * @param {string} type
 * @param {EventTarget} target
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} [extra]
 */
function pointer(type, target, x, y, extra = {}) {
  target.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, ...extra,
  }));
}

/**
 * @param {SVGSVGElement} svg
 * @returns {SVGGraphicsElement}
 */
const groupOf = (svg) => /** @type {SVGGraphicsElement} */ (svg.querySelector('.pm-board-group'));

/**
 * Client coordinates of a cell center, straight from the group's screen matrix.
 * @param {SVGSVGElement} svg
 * @param {number} x
 * @param {number} y
 * @returns {DOMPoint}
 */
const centerOf = (svg, x, y) => new DOMPoint(x + 0.5, y + 0.5).matrixTransform(/** @type {DOMMatrix} */ (groupOf(svg).getScreenCTM()));

/** @param {Element} node */
const rectCenter = (node) => {
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

// Fixtures ---------------------------------------------------------------------

const heart = preset('heart', { n: 10 });
const holeBoard = boardFromRows(['#######', '#######', '###.###', '#######', '#######', '#######']);
const L_PIECE = { id: 'L', label: 'L', color: '#4363d8', cells: /** @type {XY[]} */ ([[0, 0], [0, 1], [0, 2], [1, 2]]) };

const packResponse = await fetch('../fixtures/hand-authored-pack.json');
const packResult = validatePack(await packResponse.json());
if (!packResult.ok) {
  throw new Error('hand-authored fixture failed validation');
}
const pack = packResult.value;
const packBoardModel = packBoard(pack);
const puzzle = pack.puzzles[0];
const clueIds = new Set(puzzle.clues.map((c) => c.piece));
const solutionPoses = /** @type {import('../../core/engine/types.js').Pose[]} */ (puzzle.solution);

/** @type {import('../../core/engine/types.js').Piece[]} */
const largePieces = Array.from({ length: 24 }, (_, i) => ({
  id: `P${i}`, label: labelFor(i), color: colorFor(i), cells: /** @type {XY[]} */ ([[0, 0], [1, 0]]),
}));
const largeBoard = rectangle(8, 6);
const largePlacements = largePieces.map((p, i) => ({ piece: p.id, x: (i % 4) * 2, y: Math.floor(i / 4), turn: /** @type {const} */ (0), mirrored: false }));

/**
 * @param {Partial<import('../../core/browser/svg-board.js').BoardViewModel>} [over]
 * @returns {import('../../core/browser/svg-board.js').BoardViewModel}
 */
function packModel(over = {}) {
  return {
    board: packBoardModel,
    pieces: pack.pieces,
    clues: puzzle.clues,
    placements: solutionPoses.filter((p) => !clueIds.has(p.piece)),
    showLabels: true,
    showPatterns: true,
    ...over,
  };
}

/**
 * @param {import('../../core/engine/types.js').Board} board
 * @returns {import('../../core/browser/svg-board.js').BoardViewModel}
 */
const emptyModel = (board) => ({ board, pieces: [], clues: [], placements: [], showLabels: true, showPatterns: true });

// Checks -----------------------------------------------------------------------

await check('BAC-1: Heart at 45 degrees has 75 cells, a raised notch and a lowest bottom-left cell', () => {
  const host = makeHost(420, 420);
  const view = mountBoard(host, { mode: 'play', rotation: 45, cellPx: 30 });
  view.render(emptyModel(heart.board));
  const cells = activeCells(heart.board);
  assert(cells.length === 75, `active cells ${cells.length}`);
  assert(view.svg.querySelectorAll('.pm-cell').length === 75, 'one drawn cell per active cell');
  const ys = cells.map(([x, y]) => centerOf(view.svg, x, y).y);
  const lowest = cells[ys.indexOf(Math.max(...ys))];
  assert(lowest[0] === 0 && lowest[1] === 9, `lowest cell ${lowest}`);
  const notch = centerOf(view.svg, 7, 2);
  const mid = centerOf(view.svg, 4.5, 4.5);
  assert(notch.y < mid.y - 20 && Math.abs(notch.x - mid.x) < 1, 'notch points up on the vertical axis');
  assert(view.cellAt(notch.x, notch.y) === null, 'notch is blocked in play');
  view.destroy();
});

await check('BAC-1: clicking a blocked notch cell in the editor reports it and a controller can unblock it', () => {
  const host = makeHost(420, 420);
  const painted = /** @type {XY[]} */ ([]);
  const view = mountBoard(host, { mode: 'edit', rotation: 45, cellPx: 30, onCell: (cell) => painted.push(cell) });
  const board = { width: 10, height: 10, active: Uint8Array.from(heart.board.active) };
  view.render(emptyModel(board));
  assert(view.svg.querySelectorAll('.pm-guide').length === 25, 'exterior cells are dashed guides in edit mode');
  const p = centerOf(view.svg, 7, 2);
  pointer('pointerdown', view.svg, p.x, p.y);
  const q = centerOf(view.svg, 8, 2);
  pointer('pointermove', view.svg, q.x, q.y);
  pointer('pointermove', view.svg, q.x + 1, q.y);
  pointer('pointerup', view.svg, q.x, q.y);
  assert(JSON.stringify(painted) === '[[7,2],[8,2]]', `painted ${JSON.stringify(painted)}`);
  const frameBefore = view.svg.getAttribute('viewBox');
  board.active[2 * 10 + 7] = 1;
  view.render(emptyModel(board));
  assert(activeCells(board).length === 76, '76 active cells after unblocking');
  assert(view.svg.querySelectorAll('.pm-cell').length === 76 && view.svg.querySelectorAll('.pm-guide').length === 24, 'cell redrawn as active');
  assert(view.svg.getAttribute('viewBox') === frameBefore, 'painting did not move the frame');
  view.destroy();
});

await check('TAC-2: hit-test round trip at all eight angles, at several zooms and scroll offsets', () => {
  for (const mode of /** @type {const} */ (['play', 'edit'])) {
    const host = makeHost(300, 300);
    const view = mountBoard(host, { mode, rotation: 0, cellPx: 20 });
    view.render(emptyModel(heart.board));
    for (const theta of ANGLES) {
      view.setRotation(theta);
      for (const zoom of [14, 20, 44]) {
        view.setZoom(zoom);
        for (const [sx, sy] of [[0, 0], [37, 61]]) {
          view.surface.scrollLeft = sx;
          view.surface.scrollTop = sy;
          for (let y = 0; y < 10; y += 1) {
            for (let x = 0; x < 10; x += 1) {
              const p = centerOf(view.svg, x, y);
              const active = heart.board.active[y * 10 + x] === 1;
              const got = view.cellAt(p.x, p.y, { includeBlocked: mode === 'edit' });
              const want = active || mode === 'edit' ? [x, y] : null;
              assert(JSON.stringify(got) === JSON.stringify(want), `${mode} theta ${theta} zoom ${zoom} scroll ${sx},${sy} cell ${x},${y}: ${JSON.stringify(got)}`);
              if (!active && mode === 'edit') {
                assert(view.cellAt(p.x, p.y) === null, 'default hit-test ignores blocked cells');
              }
              const local = view.localPoint(p.x, p.y);
              near(local.x, x + 0.5, `local x at ${theta}`, 1e-6);
              near(local.y, y + 0.5, `local y at ${theta}`, 1e-6);
            }
          }
          for (const [x, y] of [[-1, 4], [10, 4], [4, -1], [4, 10]]) {
            const p = centerOf(view.svg, x, y);
            assert(view.cellAt(p.x, p.y, { includeBlocked: true }) === null, `outside ${x},${y} at ${theta}`);
          }
        }
      }
    }
    view.destroy();
  }
});

await check('TAC-2: the editor surface reaches the whole grid including blocked margins', () => {
  const host = makeHost(300, 300);
  const view = mountBoard(host, { mode: 'edit', rotation: 45, cellPx: 40 });
  view.render(emptyModel(heart.board));
  assert(view.getState().scrollable, 'a 40 px board does not fit 300 px');
  const box = view.svg.getBoundingClientRect();
  for (const theta of ANGLES) {
    view.setRotation(theta);
    const b = view.svg.getBoundingClientRect();
    for (const [x, y] of [[0, 0], [10, 0], [0, 10], [10, 10]]) {
      const p = new DOMPoint(x, y).matrixTransform(/** @type {DOMMatrix} */ (groupOf(view.svg).getScreenCTM()));
      assert(p.x >= b.left - 0.5 && p.x <= b.right + 0.5 && p.y >= b.top - 0.5 && p.y <= b.bottom + 0.5, `grid corner ${x},${y} outside the svg at ${theta}`);
    }
  }
  assert(box.width > 0, 'svg has size');
  view.destroy();
});

await check('Rendering never moves the viewport during a gesture or when the host width changes', async () => {
  const host = makeHost(300, 300);
  const view = mountBoard(host, { mode: 'edit', rotation: 45, cellPx: 40, onCell: () => {} });
  const board = { width: 10, height: 10, active: Uint8Array.from(heart.board.active) };
  view.render(emptyModel(board));
  view.surface.scrollLeft = 55;
  view.surface.scrollTop = 40;
  const before = [view.surface.scrollLeft, view.surface.scrollTop, view.svg.getAttribute('viewBox'), view.svg.getAttribute('width')];
  const p = centerOf(view.svg, 7, 2);
  pointer('pointerdown', view.surface, p.x, p.y);
  board.active[2 * 10 + 7] = 1;
  view.render(emptyModel(board));
  host.style.width = '240px';
  await nextFrame();
  view.render(emptyModel(board));
  const after = [view.surface.scrollLeft, view.surface.scrollTop, view.svg.getAttribute('viewBox'), view.svg.getAttribute('width')];
  pointer('pointerup', view.surface, p.x, p.y);
  assert(before[0] === after[0] && before[1] === after[1], `scroll moved ${before} -> ${after}`);
  assert(before[2] === after[2] && before[3] === after[3], 'frame changed without a deliberate refit');
  view.destroy();
});

await check('Fit follows clamp(floor(min(w/(ext+1), h/(ext+1))), 14, 64) and scrolls below 14', () => {
  const host = makeHost(400, 300);
  const view = mountBoard(host, { mode: 'play', rotation: 0 });
  view.render(emptyModel(heart.board));
  for (const theta of ANGLES) {
    view.setRotation(theta);
    const ext = rotatedExtent(activeCells(heart.board), theta);
    const want = Math.min(64, Math.max(14, Math.floor(Math.min(400 / (ext.w + 1), 300 / (ext.h + 1)) + 1e-9)));
    assert(view.fit() === want, `fit at ${theta}: ${view.fit()} vs ${want}`);
  }
  const small = makeHost(120, 120);
  const tiny = mountBoard(small, { mode: 'play', rotation: 0 });
  tiny.render(emptyModel(heart.board));
  assert(tiny.fit() === 14 && tiny.getState().scrollable, 'never below 14; scrolls instead');
  view.destroy();
  tiny.destroy();
});

await check('TAC-3: mounted boards and previews have no SVG-ID collisions or cross references', () => {
  const views = [0, 1, 2].map(() => {
    const view = mountBoard(makeHost(300, 220), { mode: 'play', rotation: 45, cellPx: 20 });
    view.render(packModel({ pieces: pack.pieces.concat(largePieces) }));
    return view;
  });
  const preview = mountPiecePreview(makeHost(120, 120), pack.pieces[0], { index: 0, count: 24 });
  preview.render({ t: 2, rotation: 45, showLabels: true, showPatterns: true });
  const ids = [...document.querySelectorAll('[id]')].map((n) => n.id).filter((id) => id.startsWith('pmv'));
  assert(ids.length > 0 && new Set(ids).size === ids.length, 'duplicate svg ids');
  for (const svg of [...views.map((v) => v.svg), preview.svg]) {
    const own = new Set([...svg.querySelectorAll('[id]')].map((n) => n.id));
    for (const node of svg.querySelectorAll('[fill^="url(#"]')) {
      const ref = /url\(#([^)]+)\)/.exec(node.getAttribute('fill') ?? '')?.[1] ?? '';
      assert(own.has(ref), `${ref} is not defined inside its own view`);
    }
  }
  for (const v of views) {
    v.destroy();
  }
  preview.destroy();
});

await check('TAC-3: destroy removes DOM, listeners and observers', () => {
  const observed = new Set();
  const NativeObserver = window.ResizeObserver;
  window.ResizeObserver = class extends NativeObserver {
    /** @param {Element} target */
    observe(target) {
      observed.add(target);
      super.observe(target);
    }

    /** @param {Element} target */
    unobserve(target) {
      observed.delete(target);
      super.unobserve(target);
    }

    disconnect() {
      observed.clear();
      super.disconnect();
    }
  };
  try {
    let taps = 0;
    const host = makeHost(300, 300);
    const view = mountBoard(host, { mode: 'edit', cellPx: 24, autoFit: true, onCell: () => { taps += 1; } });
    view.render(emptyModel(heart.board));
    const surface = view.surface;
    assert(listenerCount(surface) > 0 && observed.size === 1, 'listeners and observer registered');
    const p = centerOf(view.svg, 2, 2);
    view.destroy();
    view.destroy();
    assert(listenerCount(surface) === 0, `listeners left on the surface: ${listenerCount(surface)}`);
    assert(observed.size === 0, 'observer disconnected');
    assert(host.childElementCount === 0, 'DOM removed from the host');
    pointer('pointerdown', surface, p.x, p.y);
    assert(taps === 0, 'no callbacks after destroy');
    assert(view.cellAt(p.x, p.y) === null, 'cellAt after destroy is null');
  } finally {
    window.ResizeObserver = NativeObserver;
  }
});

await check('BAC-3: labels and patterns toggle independently; clues keep lock and hatching', () => {
  const host = makeHost(400, 300);
  const view = mountBoard(host, { mode: 'play', rotation: 45, cellPx: 32 });
  const expectedPatterns = largePieces.filter((_, i) => patternFor(i, largePieces.length) !== 'none').length;
  assert(expectedPatterns === 4, `fixture expects 4 patterned pieces, got ${expectedPatterns}`);
  /**
   * @param {boolean} labels
   * @param {boolean} patterns
   */
  const draw = (labels, patterns) => view.render({
    board: largeBoard, pieces: largePieces, clues: [largePlacements[0]], placements: largePlacements.slice(1), showLabels: labels, showPatterns: patterns,
  });
  const labelDisplay = () => view.svg.querySelector('.pm-labels')?.getAttribute('display');
  const count = (/** @type {string} */ sel) => view.svg.querySelectorAll(sel).length;
  for (const [labels, patterns] of [[true, true], [true, false], [false, true], [false, false]]) {
    draw(labels, patterns);
    assert(labelDisplay() === (labels ? 'inline' : 'none'), `labels ${labels}`);
    assert(count('.pm-label') === 24, 'labels stay in the DOM');
    assert(count('.pm-pattern') === (patterns ? expectedPatterns : 0), `patterns ${patterns}: ${count('.pm-pattern')}`);
    assert(count('.pm-hatch') === 1 && count('.pm-lock') === 1, 'clue hatch and lock are independent of the switches');
    assert(count('.pm-movable .pm-hatch') === 0, 'movable pieces never use clue hatching');
    assert(!view.svg.querySelector('.pm-lock')?.closest('[display="none"]'), 'lock is visible with labels off');
  }
  draw(true, true);
  view.setZoom(9.5);
  assert(labelDisplay() === 'none', 'labels hide below 10 px cells');
  assert(count('.pm-pattern') === expectedPatterns, 'patterns stay at small zoom');
  view.setZoom(10);
  assert(labelDisplay() === 'inline', 'labels show at 10 px');
  const names = [...view.svg.querySelectorAll('[data-piece-id][aria-label]')].map((n) => n.getAttribute('aria-label'));
  assert(names.length === 24 && names.every((n) => /^Piece [A-Z]+, 2 cells, /.test(n ?? '')), 'accessible names always present');
  assert(view.svg.querySelectorAll('[style]').length === 0, 'no inline style attributes');
  view.destroy();
});

await check('BAC-2: preview and board draw the same piece and keep labels upright at every angle and orientation', () => {
  const boardHost = makeHost(300, 300);
  const board = rectangle(8, 8);
  const view = mountBoard(boardHost, { mode: 'play', rotation: 0, cellPx: 24 });
  const previewHost = makeHost(200, 200);
  const preview = mountPiecePreview(previewHost, L_PIECE, { cellPx: 24 });
  /** @param {Element} node */
  const upright = (node) => {
    const m = /** @type {SVGGraphicsElement} */ (/** @type {unknown} */ (node)).getScreenCTM();
    assert(m !== null && Math.abs(m.b) < 1e-6 && Math.abs(m.c) < 1e-6 && m.a > 0 && m.d > 0, 'label is rotated');
  };
  for (const theta of ANGLES) {
    view.setRotation(theta);
    for (let t = 0; t < 8; t += 1) {
      view.render({
        board, pieces: [L_PIECE], clues: [], placements: [{ piece: 'L', x: 2, y: 2, turn: /** @type {0 | 1 | 2 | 3} */ (t & 3), mirrored: t >= 4 }], showLabels: true, showPatterns: true,
      });
      preview.render({ t, rotation: theta, showLabels: true, showPatterns: true });
      const a = /** @type {Element} */ (view.svg.querySelector('.pm-fill')).getBoundingClientRect();
      const b = /** @type {Element} */ (preview.svg.querySelector('.pm-fill')).getBoundingClientRect();
      near(a.width, b.width, `width at ${theta}/${t}`);
      near(a.height, b.height, `height at ${theta}/${t}`);
      const la = rectCenter(/** @type {Element} */ (view.svg.querySelector('.pm-label')));
      const lb = rectCenter(/** @type {Element} */ (preview.svg.querySelector('.pm-label')));
      near(la.x - a.left, lb.x - b.left, `label x offset at ${theta}/${t}`);
      near(la.y - a.top, lb.y - b.top, `label y offset at ${theta}/${t}`);
      upright(/** @type {Element} */ (view.svg.querySelector('.pm-label')));
      upright(/** @type {Element} */ (preview.svg.querySelector('.pm-label')));
    }
  }
  view.destroy();
  preview.destroy();
});

await check('Preview sourceCellAt returns source indices and null for the empty bounding-box corner', () => {
  const host = makeHost(200, 200);
  const preview = mountPiecePreview(host, L_PIECE, { cellPx: 30 });
  for (const theta of ANGLES) {
    for (let t = 0; t < 8; t += 1) {
      preview.render({ t, rotation: theta, showLabels: true, showPatterns: true });
      const g = /** @type {SVGGraphicsElement} */ (preview.svg.querySelector('.pm-board-group'));
      const m = /** @type {DOMMatrix} */ (g.getScreenCTM());
      const hits = [...preview.svg.querySelectorAll('rect[data-source-cell]')].map((r) => Number(r.getAttribute('data-source-cell')));
      assert(hits.length === 4, 'one hit area per cell');
      const rects = [...preview.svg.querySelectorAll('rect[data-source-cell]')];
      for (const r of rects) {
        const c = rectCenter(r);
        assert(preview.sourceCellAt(c.x, c.y) === Number(r.getAttribute('data-source-cell')), `source cell at ${theta}/${t}`);
      }
      // The oriented bounding box is 2x3 or 3x2; find its one empty cell and probe it.
      const xs = rects.map((r) => Number(r.getAttribute('x')));
      const ys = rects.map((r) => Number(r.getAttribute('y')));
      const occupied = new Set(rects.map((r) => `${r.getAttribute('x')},${r.getAttribute('y')}`));
      let empty = 0;
      for (let y = Math.min(...ys); y <= Math.max(...ys); y += 1) {
        for (let x = Math.min(...xs); x <= Math.max(...xs); x += 1) {
          if (!occupied.has(`${x},${y}`)) {
            empty += 1;
            const p = new DOMPoint(x + 0.5, y + 0.5).matrixTransform(m);
            assert(preview.sourceCellAt(p.x, p.y) === null, `empty corner at ${theta}/${t}`);
          }
        }
      }
      assert(empty === 2, `L piece leaves 2 empty cells in its box, found ${empty}`);
    }
  }
  preview.destroy();
});

await check('Taps, Enter and focus: onPiece for movable pieces, onCell elsewhere, clues are not pieces', () => {
  const host = makeHost(480, 300);
  const pieceTaps = /** @type {string[]} */ ([]);
  const cellTaps = /** @type {XY[]} */ ([]);
  const view = mountBoard(host, { mode: 'play', rotation: 0, cellPx: 40, onPiece: (id) => pieceTaps.push(id), onCell: (c) => cellTaps.push(c) });
  view.render(packModel());
  const hit = /** @type {Element} */ (view.svg.querySelector('[data-movable="true"][data-piece-id="B"] rect[data-source-cell="1"]'));
  const p = rectCenter(hit);
  pointer('pointerdown', hit, p.x, p.y);
  pointer('pointerup', hit, p.x, p.y);
  assert(pieceTaps.join() === 'B' && cellTaps.length === 0, `piece tap ${pieceTaps}`);
  const clue = /** @type {Element} */ (view.svg.querySelector('[data-piece-id="A"] .pm-fill'));
  const cp = rectCenter(clue);
  pointer('pointerdown', clue, cp.x - 5, cp.y);
  pointer('pointerup', clue, cp.x - 5, cp.y);
  assert(pieceTaps.length === 1 && cellTaps.length === 1, 'clue tap is a cell tap');
  assert(!view.svg.querySelector('[data-piece-id="A"]')?.hasAttribute('tabindex'), 'clues are not focusable');
  // Drag beyond the threshold is not a tap.
  pointer('pointerdown', hit, p.x, p.y);
  pointer('pointermove', hit, p.x + 30, p.y);
  pointer('pointerup', hit, p.x + 30, p.y);
  assert(pieceTaps.length === 1, 'drag is not a tap');
  // Keyboard activation and focus retention across renders.
  const group = /** @type {SVGElement} */ (view.svg.querySelector('[data-movable="true"][data-piece-id="C"]'));
  group.focus();
  assert(document.activeElement === group, 'piece group is focusable');
  view.render(packModel({ selectedId: 'C' }));
  const again = document.activeElement;
  assert(again?.getAttribute('data-piece-id') === 'C' && again !== group, 'focus restored on the re-rendered piece');
  again.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert(pieceTaps.join() === 'B,C', `Enter activates the piece: ${pieceTaps}`);
  assert(again.getAttribute('aria-pressed') === 'true', 'selected piece exposes aria-pressed');
  view.destroy();
});

await check('Pointer tracker in a real board: thresholds, throttling, stable capture surface and cancellation', async () => {
  const host = makeHost(480, 300);
  const windowListenersBefore = listenerCount(window);
  const view = mountBoard(host, { mode: 'play', rotation: 45, cellPx: 40 });
  view.render(packModel());
  /** @type {string[]} */
  const log = [];
  /** @type {any[]} */
  const infos = [];
  const note = (/** @type {string} */ n) => (/** @type {any} */ info) => {
    log.push(n);
    infos.push(info);
  };
  const tracker = createPointerTracker(view.surface, {
    select: note('select'),
    dragStart: (info) => {
      note('dragStart')(info);
      view.render(packModel({ selectedId: info.pieceId }));
    },
    dragMove: note('dragMove'),
    dragEnd: note('dragEnd'),
    cancel: note('cancel'),
  });
  const grab = () => {
    const hit = /** @type {Element} */ (view.svg.querySelector('[data-movable="true"][data-piece-id="B"] rect[data-source-cell="2"]'));
    return { hit, ...rectCenter(hit) };
  };

  let g = grab();
  pointer('pointerdown', g.hit, g.x, g.y);
  pointer('pointermove', g.hit, g.x + 5, g.y);
  assert(log.length === 0, 'below the mouse threshold');
  pointer('pointermove', g.hit, g.x + 6, g.y);
  assert(log.join() === 'dragStart' && infos[0].pieceId === 'B' && infos[0].sourceCell === 2, `dragStart ${log}`);
  pointer('pointermove', view.surface, g.x + 20, g.y);
  pointer('pointermove', view.surface, g.x + 40, g.y);
  assert(log.join() === 'dragStart', 'moves are throttled to animation frames');
  await nextFrame();
  await nextFrame();
  assert(log.join() === 'dragStart,dragMove' && infos[1].clientX === g.x + 40, `dragMove ${log}`);
  pointer('pointerdown', view.surface, g.x, g.y, { pointerId: 2, pointerType: 'touch', isPrimary: false });
  pointer('pointerup', view.surface, g.x + 41, g.y);
  assert(log.join() === 'dragStart,dragMove,dragEnd', `dragEnd after re-render: ${log}`);

  log.length = 0;
  g = grab();
  pointer('pointerdown', g.hit, g.x, g.y, { pointerType: 'touch' });
  pointer('pointermove', g.hit, g.x + 9, g.y, { pointerType: 'touch' });
  assert(log.length === 0, 'touch threshold is 10 px');
  pointer('pointerup', g.hit, g.x + 9, g.y, { pointerType: 'touch' });
  assert(log.join() === 'select', `touch select ${log}`);

  for (const [reason, act] of /** @type {Array<[string, () => void]>} */ ([
    ['pointercancel', () => pointer('pointercancel', view.surface, 0, 0)],
    ['escape', () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))],
    ['resize', () => window.dispatchEvent(new Event('resize'))],
  ])) {
    log.length = 0;
    infos.length = 0;
    g = grab();
    pointer('pointerdown', g.hit, g.x, g.y);
    pointer('pointermove', g.hit, g.x + 12, g.y);
    act();
    assert(log.join() === 'dragStart,cancel' && infos.at(-1).reason === reason, `${reason}: ${log}`);
    pointer('pointerup', view.surface, g.x, g.y);
    assert(log.length === 2, `${reason}: no drop after cancel`);
  }

  const empty = rectCenter(view.surface);
  log.length = 0;
  pointer('pointerdown', view.surface, empty.x, empty.y);
  assert(log.length === 0 && !tracker.isActive(), 'empty board area is not captured by the tracker');
  const surface = view.surface;
  tracker.destroy();
  view.destroy();
  assert(listenerCount(surface) === 0, 'tracker and view released every listener on the surface');
  assert(listenerCount(window) === windowListenersBefore, 'tracker released its window listeners');
});

await check('Touch targets: common.css enlarges controls to 44 px on coarse pointers', () => {
  let found = false;
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (rule instanceof CSSMediaRule && rule.conditionText.includes('pointer: coarse')) {
        const text = [...rule.cssRules].map((r) => r.cssText).join(' ');
        found = found || (text.includes('min-height: 44px') && text.includes('min-width: 44px'));
      }
    }
  }
  assert(found, 'no coarse-pointer 44px rule');
});

await check('TAC-4: no CSP violations and no inline style attributes', () => {
  assert(violations.length === 0, `CSP violations: ${violations.join('; ')}`);
  assert(document.querySelectorAll('svg [style]').length === 0, 'inline style attribute on svg content');
});

// Gallery ----------------------------------------------------------------------

sandbox.remove();
const gallery = /** @type {HTMLElement} */ (document.getElementById('gallery'));
gallery.style.display = 'flex';
gallery.style.flexWrap = 'wrap';
gallery.style.gap = '12px';

/**
 * @param {string} title
 * @param {number} w
 * @param {number} h
 * @returns {HTMLElement}
 */
function card(title, w, h) {
  const wrap = document.createElement('figure');
  const caption = document.createElement('figcaption');
  caption.textContent = title;
  const host = document.createElement('div');
  host.style.width = `${w}px`;
  host.style.height = `${h}px`;
  host.style.border = '1px solid #999';
  wrap.append(caption, host);
  gallery.append(wrap);
  return host;
}

/**
 * @param {string} title
 * @param {number} w
 * @param {number} h
 * @param {import('../../core/browser/svg-board.js').BoardViewOptions} opts
 * @param {import('../../core/browser/svg-board.js').BoardViewModel} model
 */
function show(title, w, h, opts, model) {
  mountBoard(card(title, w, h), opts).render(model);
}

show('Pack puzzle, 0 degrees', 420, 280, { mode: 'play', rotation: 0, cellPx: 36 }, packModel());
show('Pack puzzle, 45 degrees, preview ghost', 420, 420, { mode: 'play', rotation: 45, cellPx: 30 }, packModel({
  selectedId: 'D',
  preview: { pose: { piece: 'H', x: 3, y: 1, turn: 1, mirrored: false }, valid: false, reason: 'overlap' },
  invalidCells: [[4, 4]],
}));
show('Heart, editor with guides, 45 degrees', 420, 420, { mode: 'edit', rotation: 45, cellPx: 30 }, emptyModel(heart.board));
show('Heart, play, 45 degrees', 360, 360, { mode: 'play', rotation: 45, cellPx: 26 }, emptyModel(heart.board));
show('Enclosed hole', 300, 240, { mode: 'play', rotation: 0, cellPx: 36 }, emptyModel(holeBoard));
show('24 pieces, labels off, patterns on', 380, 300, { mode: 'play', rotation: 0, cellPx: 40 }, {
  board: largeBoard, pieces: largePieces, clues: [largePlacements[0]], placements: largePlacements.slice(1), showLabels: false, showPatterns: true,
});
show('24 pieces, labels on, patterns off', 380, 300, { mode: 'play', rotation: 0, cellPx: 40 }, {
  board: largeBoard, pieces: largePieces, clues: [largePlacements[0]], placements: largePlacements.slice(1), showLabels: true, showPatterns: false,
});
show('Thumbnail', 120, 100, { mode: 'thumbnail', rotation: 45, cellPx: 8 }, packModel());
{
  const row = card('Tray previews at 45 degrees (t = 0..7)', 420, 130);
  row.style.display = 'flex';
  row.style.gap = '4px';
  for (let t = 0; t < 8; t += 1) {
    mountPiecePreview(row, L_PIECE, { cellPx: 20, interactive: false }).render({ t, rotation: 45, showLabels: true, showPatterns: true });
  }
}

const failed = results.filter((r) => !r.ok);
const list = /** @type {HTMLElement} */ (document.getElementById('results'));
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.ok ? '' : ` — ${r.error}`}`;
  li.className = r.ok ? 'pass' : 'fail';
  list.append(li);
}
const summary = /** @type {HTMLElement} */ (document.getElementById('summary'));
summary.textContent = failed.length === 0 ? `PASS ${results.length}/${results.length}` : `FAIL ${failed.length} of ${results.length}`;
document.documentElement.dataset.result = failed.length === 0 ? 'pass' : 'fail';
document.title = `${summary.textContent} - T16 rendering harness`;
