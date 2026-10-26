// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeCells, boardFromRows, classifyBlocked, preset } from '../core/engine/board.js';
import { orientedCells, outlineLoops } from '../core/engine/geometry.js';
import { rotatedExtent, ANGLES } from '../core/engine/view.js';
import {
  alignedOrientedCells,
  applyMatrix,
  boardFrame,
  cellFromLocal,
  displayMatrix,
  invertMatrix,
  labelCell,
  labelsVisible,
  pathData,
  pieceName,
  seamPath,
  shade,
} from '../core/browser/svg-board.js';
import { createPointerTracker, dragThreshold } from '../core/browser/pointer.js';

/** @typedef {import('../core/engine/types.js').XY} XY */

const near = (/** @type {number} */ a, /** @type {number} */ b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('display matrix round-trips cells at all eight angles', () => {
  const { board } = preset('heart', { n: 10 });
  const pivot = /** @type {XY} */ ([5, 5]);
  for (const theta of ANGLES) {
    const m = displayMatrix(theta, pivot);
    const inv = invertMatrix(m);
    for (let y = 0; y < board.height; y += 1) {
      for (let x = 0; x < board.width; x += 1) {
        const [sx, sy] = applyMatrix(m, x + 0.5, y + 0.5);
        const [lx, ly] = applyMatrix(inv, sx, sy);
        assert.deepEqual(cellFromLocal(board, lx, ly, { includeBlocked: true }), [x, y], `theta ${theta} cell ${x},${y}`);
      }
    }
  }
});

test('hit-testing: play needs an active cell, edit accepts any cell inside the grid', () => {
  const { board } = preset('heart', { n: 10 });
  assert.equal(cellFromLocal(board, 7.5, 2.5), null, 'blocked notch in play');
  assert.deepEqual(cellFromLocal(board, 7.5, 2.5, { includeBlocked: true }), [7, 2]);
  assert.deepEqual(cellFromLocal(board, 2.5, 2.5), [2, 2]);
  assert.equal(cellFromLocal(board, -0.01, 2, { includeBlocked: true }), null);
  assert.equal(cellFromLocal(board, 10, 2, { includeBlocked: true }), null);
  assert.equal(cellFromLocal(board, Number.NaN, 2, { includeBlocked: true }), null);
  assert.deepEqual(cellFromLocal(board, 0, 0), [0, 0]);
});

test('heart at 45 degrees: notch points up, bottom-left logical cell is lowest, 75 cells stay', () => {
  const { board } = preset('heart', { n: 10 });
  const cells = activeCells(board);
  assert.equal(cells.length, 75);
  const m = displayMatrix(45, [5, 5]);
  const screen = (/** @type {XY} */ [x, y]) => applyMatrix(m, x + 0.5, y + 0.5);
  const lowest = cells.reduce((best, c) => (screen(c)[1] > screen(best)[1] ? c : best));
  assert.deepEqual(lowest, [0, 9]);
  // The blocked quadrant's center is the notch: it sits on the vertical axis above the middle.
  const [nx, ny] = applyMatrix(m, 7.5, 2.5);
  assert.ok(ny < 5, 'notch is above the center');
  near(nx, 5);
});

test('rotated frame matches the shared extent for play and covers the whole grid for edit', () => {
  const { board } = preset('heart', { n: 10 });
  for (const theta of ANGLES) {
    const play = boardFrame(board, theta, 'play');
    const ref = rotatedExtent(activeCells(board), theta);
    near(play.w, ref.w);
    near(play.h, ref.h);
    near(play.minX, ref.minX);
    near(play.minY, ref.minY);
    const edit = boardFrame(board, theta, 'edit');
    assert.ok(edit.w >= play.w - 1e-9 && edit.h >= play.h - 1e-9, 'edit frame contains the play frame');
    // Every grid corner lands inside the edit frame.
    const m = displayMatrix(theta, edit.pivot);
    for (const [x, y] of [[0, 0], [10, 0], [0, 10], [10, 10]]) {
      const [sx, sy] = applyMatrix(m, x, y);
      assert.ok(sx >= edit.minX - 1e-9 && sx <= edit.minX + edit.w + 1e-9, `x in frame at ${theta}`);
      assert.ok(sy >= edit.minY - 1e-9 && sy <= edit.minY + edit.h + 1e-9, `y in frame at ${theta}`);
    }
  }
});

test('labels need the switch and a 10 px cell', () => {
  assert.equal(labelsVisible(true, 10), true);
  assert.equal(labelsVisible(true, 9.9), false);
  assert.equal(labelsVisible(false, 40), false);
});

test('outline path data, seams, shade and label cell', () => {
  const l = /** @type {XY[]} */ ([[0, 0], [1, 0], [0, 1]]);
  assert.equal(pathData(outlineLoops(l)), 'M0 0L2 0L2 1L1 1L1 2L0 2Z');
  assert.equal(seamPath(l), 'M1 0L1 1M0 1L1 1');
  const ring = /** @type {XY[]} */ ([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]]);
  assert.equal(pathData(outlineLoops(ring)).split('Z').length - 1, 2, 'outer and hole loops');
  assert.equal(shade('#ffffff'), '#a6a6a6');
  assert.equal(shade('#e6194b'), '#961031');
  assert.equal(shade('nope'), '#000000');
  assert.deepEqual(labelCell(/** @type {XY[]} */ ([[0, 0], [1, 0], [2, 0]])), [1, 0]);
  assert.deepEqual(labelCell(/** @type {XY[]} */ ([[0, 0], [1, 0]])), [0, 0], 'ties pick the smaller (y, x)');
  // A piece with an empty bounding-box corner still labels an occupied cell.
  const ell = /** @type {XY[]} */ ([[0, 0], [0, 1], [0, 2], [1, 2]]);
  assert.deepEqual(labelCell(ell), [0, 1]);
});

test('aligned oriented cells keep source order and agree with orientedCells as a set', () => {
  const piece = /** @type {XY[]} */ ([[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]]);
  for (let t = 0; t < 8; t += 1) {
    const aligned = alignedOrientedCells(piece, t);
    const sorted = [...aligned].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    assert.deepEqual(sorted, orientedCells(piece, t));
    assert.equal(aligned.length, piece.length);
  }
  assert.deepEqual(alignedOrientedCells([[3, 4], [4, 4]], 0), [[0, 0], [1, 0]]);
});

test('piece names always carry label and size', () => {
  const piece = { id: 'F', label: 'F', color: '#e6194b', cells: /** @type {XY[]} */ ([[0, 0], [1, 0], [1, 1], [2, 1], [1, 2]]) };
  assert.equal(pieceName(piece), 'Piece F, 5 cells');
  assert.equal(pieceName(piece, 'in tray'), 'Piece F, 5 cells, in tray');
  assert.equal(pieceName(piece, 'on board', [[4, 2], [3, 2]]), 'Piece F, 5 cells, on board at row 3, column 4');
});

test('a board with an enclosed hole frames its active cells and hit-tests the hole only in edit', () => {
  const board = boardFromRows(['#####', '##.##', '#####']);
  assert.equal(classifyBlocked(board)[7], 2);
  assert.ok(boardFrame(board, 45, 'play').w > 0);
  assert.equal(cellFromLocal(board, 2.5, 1.5), null);
  assert.deepEqual(cellFromLocal(board, 2.5, 1.5, { includeBlocked: true }), [2, 1]);
});

/**
 * Minimal pointer surface + window fakes.
 * @param {Partial<import('../core/browser/pointer.js').PointerTrackerOptions>} [extra]
 */
function harness(extra = {}) {
  const surface = new EventTarget();
  const view = new EventTarget();
  /** @type {Array<() => void>} */
  const frames = [];
  const captured = new Set();
  Object.assign(surface, {
    setPointerCapture: (/** @type {number} */ id) => captured.add(id),
    releasePointerCapture: (/** @type {number} */ id) => captured.delete(id),
    hasPointerCapture: (/** @type {number} */ id) => captured.has(id),
  });
  /** @type {string[]} */
  const log = [];
  /** @type {any[]} */
  const infos = [];
  const note = (/** @type {string} */ name) => (/** @type {any} */ info) => {
    log.push(name);
    infos.push(info);
  };
  const tracker = createPointerTracker(surface, {
    select: note('select'), dragStart: note('dragStart'), dragMove: note('dragMove'), dragEnd: note('dragEnd'), cancel: note('cancel'),
    longPress: note('longPress'),
  }, {
    ...extra,
    view,
    resolve: (event) => ((/** @type {any} */ (event)).hit ? { pieceId: 'F', sourceCell: 3 } : null),
    schedule: (cb) => frames.push(cb),
    unschedule: () => {},
  });
  /**
   * @param {string} type
   * @param {Record<string, unknown>} [props]
   * @param {EventTarget} [target]
   */
  const fire = (type, props = {}, target = surface) => {
    const event = Object.assign(new Event(type), { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, clientX: 0, clientY: 0, hit: true }, props);
    target.dispatchEvent(event);
  };
  return { surface, view, frames, captured, log, infos, tracker, fire };
}

test('pointer thresholds: 6 px for mouse and pen, 10 px for touch', () => {
  assert.equal(dragThreshold('mouse'), 6);
  assert.equal(dragThreshold('pen'), 6);
  assert.equal(dragThreshold('touch'), 10);

  const mouse = harness();
  mouse.fire('pointerdown');
  mouse.fire('pointermove', { clientX: 5, clientY: 0 });
  assert.deepEqual(mouse.log, []);
  mouse.fire('pointermove', { clientX: 6, clientY: 0 });
  assert.deepEqual(mouse.log, ['dragStart']);
  assert.equal(mouse.infos[0].pieceId, 'F');
  assert.equal(mouse.infos[0].sourceCell, 3);

  const touch = harness();
  touch.fire('pointerdown', { pointerType: 'touch' });
  touch.fire('pointermove', { pointerType: 'touch', clientX: 9, clientY: 0 });
  assert.deepEqual(touch.log, []);
  touch.fire('pointermove', { pointerType: 'touch', clientX: 6, clientY: 8 });
  assert.deepEqual(touch.log, ['dragStart']);
});

test('a press without drag selects; a drag reports throttled moves then dragEnd', () => {
  const h = harness();
  h.fire('pointerdown');
  h.fire('pointerup');
  assert.deepEqual(h.log, ['select']);
  assert.equal(h.captured.size, 0, 'capture released');

  h.log.length = 0;
  h.fire('pointerdown');
  h.fire('pointermove', { clientX: 10 });
  h.fire('pointermove', { clientX: 20 });
  h.fire('pointermove', { clientX: 30 });
  assert.equal(h.frames.length, 1, 'one frame callback for three moves');
  h.frames[0]();
  assert.deepEqual(h.log, ['dragStart', 'dragMove']);
  assert.equal(h.infos.at(-1).clientX, 30, 'latest position wins');
  h.fire('pointerup', { clientX: 40 });
  assert.deepEqual(h.log, ['dragStart', 'dragMove', 'dragEnd']);
  assert.equal(h.infos.at(-1).clientX, 40);
  assert.equal(h.infos.at(-1).startX, 0);
});

test('a touch held still reports a long press and nothing after it; moving or a mouse does not', async () => {
  const wait = () => new Promise((resolve) => { setTimeout(resolve, 60); });
  const held = harness({ longPressMs: 20 });
  held.fire('pointerdown', { pointerType: 'touch' });
  await wait();
  assert.deepEqual(held.log, ['longPress']);
  assert.equal(held.infos[0].pieceId, 'F');
  assert.equal(held.tracker.isActive(), false);
  assert.equal(held.captured.size, 0, 'capture released');
  held.fire('pointerup', { pointerType: 'touch' });
  assert.deepEqual(held.log, ['longPress'], 'the release is no select');

  const moved = harness({ longPressMs: 20 });
  moved.fire('pointerdown', { pointerType: 'touch' });
  moved.fire('pointermove', { pointerType: 'touch', clientX: 20 });
  await wait();
  assert.deepEqual(moved.log, ['dragStart']);

  const lifted = harness({ longPressMs: 20 });
  lifted.fire('pointerdown', { pointerType: 'touch' });
  lifted.fire('pointerup', { pointerType: 'touch' });
  await wait();
  assert.deepEqual(lifted.log, ['select']);

  const mouse = harness({ longPressMs: 20 });
  mouse.fire('pointerdown');
  await wait();
  assert.deepEqual(mouse.log, []);
  mouse.tracker.destroy();
});

test('a touch that moves mainly along the scroll axis is left to the scroll', () => {
  const h = harness({ scrollAxis: 'x' });
  h.fire('pointerdown', { pointerType: 'touch' });
  h.fire('pointermove', { pointerType: 'touch', clientX: 14, clientY: 4 });
  h.fire('pointermove', { pointerType: 'touch', clientX: 40, clientY: 30 });
  assert.deepEqual(h.log, [], 'no drag, even when it later turns');
  h.fire('pointerup', { pointerType: 'touch', clientX: 40, clientY: 30 });
  assert.deepEqual(h.log, [], 'and no select');
  assert.equal(h.tracker.isActive(), false);

  const across = harness({ scrollAxis: 'x' });
  across.fire('pointerdown', { pointerType: 'touch' });
  across.fire('pointermove', { pointerType: 'touch', clientX: 4, clientY: -14 });
  assert.deepEqual(across.log, ['dragStart'], 'a swipe across the axis lifts the piece');

  const mouse = harness({ scrollAxis: 'x' });
  mouse.fire('pointerdown');
  mouse.fire('pointermove', { clientX: 14, clientY: 2 });
  assert.deepEqual(mouse.log, ['dragStart'], 'a mouse always drags');
});

test('other pointers are ignored while one manipulation is active', () => {
  const h = harness();
  h.fire('pointerdown');
  h.fire('pointerdown', { pointerId: 2, pointerType: 'touch', isPrimary: false });
  h.fire('pointerdown', { pointerId: 3 });
  h.fire('pointermove', { pointerId: 2, clientX: 50 });
  h.fire('pointerup', { pointerId: 2 });
  assert.deepEqual(h.log, []);
  assert.equal(h.tracker.isActive(), true);
  h.fire('pointerup', { pointerId: 1 });
  assert.deepEqual(h.log, ['select']);
});

test('presses that resolve to no piece and non-primary buttons are ignored', () => {
  const h = harness();
  h.fire('pointerdown', { hit: false });
  h.fire('pointerdown', { button: 2 });
  assert.equal(h.tracker.isActive(), false);
  assert.equal(h.captured.size, 0);
});

test('cancellation: pointercancel, lost capture, Escape, resize and the API all report a reason', () => {
  const cases = /** @type {Array<[string, (h: ReturnType<typeof harness>) => void]>} */ ([
    ['pointercancel', (h) => h.fire('pointercancel')],
    ['lostcapture', (h) => h.fire('lostpointercapture')],
    ['escape', (h) => h.fire('keydown', { key: 'Escape' }, h.view)],
    ['resize', (h) => h.fire('resize', {}, h.view)],
    ['rotate-device', (h) => h.tracker.cancel('rotate-device')],
  ]);
  for (const [reason, act] of cases) {
    const h = harness();
    h.fire('pointerdown');
    h.fire('pointermove', { clientX: 20 });
    act(h);
    assert.deepEqual(h.log, ['dragStart', 'cancel'], reason);
    assert.equal(h.infos.at(-1).reason, reason === 'rotate-device' ? 'rotate-device' : reason);
    assert.equal(h.tracker.isActive(), false);
    h.fire('pointerup');
    assert.equal(h.log.length, 2, 'no drop after cancel');
    assert.equal(h.captured.size, 0);
  }
  const idle = harness();
  idle.fire('keydown', { key: 'Escape' }, idle.view);
  assert.deepEqual(idle.log, [], 'nothing to cancel when idle');
});

test('a queued move is dropped once the gesture is cancelled; destroy detaches everything', () => {
  const h = harness();
  h.fire('pointerdown');
  h.fire('pointermove', { clientX: 20 });
  h.tracker.cancel('api');
  h.frames[0]?.();
  assert.deepEqual(h.log, ['dragStart', 'cancel']);

  h.fire('pointerdown');
  h.tracker.destroy();
  assert.deepEqual(h.log, ['dragStart', 'cancel', 'cancel']);
  assert.equal(h.infos.at(-1).reason, 'destroy');
  h.fire('pointerdown');
  h.fire('pointerup');
  h.fire('keydown', { key: 'Escape' }, h.view);
  assert.equal(h.log.length, 3, 'no events after destroy');
});
