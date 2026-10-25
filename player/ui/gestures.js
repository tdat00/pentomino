// @ts-check
// Pointer gestures: one pointer tracker on the board and one on the tray turn drags and taps into play-controller
// calls and drag-layer updates. Pieces are handled by the trackers only, never by the board's own onPiece. A touch
// drag is lifted 1.25 cells above the finger, and the wheel turns the dragged piece.

import { createPointerTracker } from '../../core/browser/pointer.js';
import { effectiveRotation } from '../state.js';

/** @typedef {import('../play.js').createPlayController} CreatePlay */
/** @typedef {ReturnType<CreatePlay>} Play */
/** @typedef {import('../../core/browser/pointer.js').PointerInfo} PointerInfo */

const TOUCH_LIFT_CELLS = 1.25;
const WHEEL_GAP_MS = 120;
const CLICK_GUARD_MS = 450;

/**
 * A press anywhere in a tray slot, the frame around the piece included, grabs that piece: by the cell pressed, or
 * else by the cell of the piece nearest to the press.
 * @param {PointerEvent} event
 * @returns {{ pieceId: string, sourceCell: number | null } | null}
 */
export function trayPiece(event) {
  const target = /** @type {Element | null} */ (event.target);
  const slot = target !== null && typeof target.closest === 'function' ? target.closest('.tray-piece') : null;
  const pieceId = slot?.getAttribute('data-piece-id');
  if (slot === null || slot === undefined || !pieceId) {
    return null;
  }
  const direct = Number(target?.getAttribute('data-source-cell') ?? Number.NaN);
  if (Number.isInteger(direct) && direct >= 0) {
    return { pieceId, sourceCell: direct };
  }
  let sourceCell = null;
  let best = Infinity;
  for (const hit of slot.querySelectorAll('.pm-hit[data-source-cell]')) {
    const r = hit.getBoundingClientRect();
    const d = (event.clientX - (r.left + r.width / 2)) ** 2 + (event.clientY - (r.top + r.height / 2)) ** 2;
    if (d < best) {
      best = d;
      sourceCell = Number(hit.getAttribute('data-source-cell'));
    }
  }
  return { pieceId, sourceCell };
}

/**
 * @typedef {object} GestureOptions
 * @property {Window & typeof globalThis} win
 * @property {Play} play
 * @property {import('../state.js').PlayerStore} store
 * @property {ReturnType<import('./board-view.js').createBoardView>} boardView
 * @property {HTMLElement} trayHost
 * @property {HTMLElement} [dropHost] Area where a dropped piece goes back to the tray (the tray itself by default).
 * @property {ReturnType<import('./drag-layer.js').createDragLayer>} dragLayer
 */

/**
 * @param {GestureOptions} options
 */
export function bindGestures({ win, play, store, boardView, trayHost, dropHost = trayHost, dragLayer }) {
  /** @type {{ last: PointerInfo, shownT: number } | null} */
  let active = null;
  let lastHandled = -Infinity;
  let lastWheel = -Infinity;
  const surface = boardView.view.surface;

  /**
   * @param {HTMLElement} el
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  function inside(el, x, y) {
    const rect = el.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function showClone() {
    const state = store.getState();
    const drag = play.view().drag;
    if (active === null || drag === null || state.pack === null) {
      return;
    }
    const index = state.pack.pieces.findIndex((p) => p.id === drag.pieceId);
    dragLayer.show({
      piece: state.pack.pieces[index],
      index,
      count: state.pack.pieces.length,
      t: drag.t,
      rotation: effectiveRotation(state),
      cellPx: boardView.cellPx(),
      handleIndex: drag.index,
    });
    active.shownT = drag.t;
  }

  /** @param {PointerInfo} info */
  function update(info) {
    if (active === null) {
      return;
    }
    active.last = info;
    const lift = info.pointerType === 'touch' ? TOUCH_LIFT_CELLS * boardView.cellPx() : 0;
    const x = info.clientX;
    const y = info.clientY - lift;
    dragLayer.moveTo(x, y);
    const overTray = inside(dropHost, info.clientX, info.clientY);
    const overBoard = !overTray && inside(surface, x, y);
    const local = overBoard ? boardView.view.localPoint(x, y) : null;
    play.dragTo(local === null ? null : [local.x, local.y], overTray);
  }

  function cleanup() {
    active = null;
    dragLayer.hide();
    win.removeEventListener('wheel', onWheel);
    lastHandled = win.performance.now();
  }

  /** @param {WheelEvent} event */
  function onWheel(event) {
    if (active === null) {
      return;
    }
    event.preventDefault();
    const t = win.performance.now();
    if (t - lastWheel < WHEEL_GAP_MS || event.deltaY === 0) {
      return;
    }
    lastWheel = t;
    play.transform(event.deltaY > 0 ? 'cw' : 'ccw');
  }

  /**
   * @param {'tray' | 'board'} from
   * @returns {import('../../core/browser/pointer.js').PointerHandlers}
   */
  const handlers = (from) => ({
    select(info) {
      lastHandled = win.performance.now();
      if (info.pieceId !== null) {
        play.tapPiece(info.pieceId, from);
      }
    },
    dragStart(info) {
      if (info.pieceId === null || !play.beginDrag({ pieceId: info.pieceId, sourceCell: info.sourceCell })) {
        (from === 'tray' ? trayTracker : boardTracker).cancel('api');
        return;
      }
      active = { last: info, shownT: -1 };
      win.addEventListener('wheel', onWheel, { passive: false });
      showClone();
      update(info);
    },
    dragMove: update,
    dragEnd(info) {
      update(info);
      play.endDrag();
      cleanup();
    },
    cancel() {
      play.cancelDrag();
      cleanup();
    },
  });

  const boardTracker = createPointerTracker(surface, handlers('board'));
  const trayTracker = createPointerTracker(trayHost, handlers('tray'), { resolve: trayPiece });

  // A rotate or mirror during the drag redraws the clone; a drag ended from the
  // keyboard (Escape) releases the pointer.
  function sync() {
    if (active === null) {
      return;
    }
    const drag = play.view().drag;
    if (drag === null) {
      boardTracker.cancel('api');
      trayTracker.cancel('api');
      if (active !== null) {
        cleanup();
      }
      return;
    }
    if (drag.t !== active.shownT) {
      showClone();
      update(active.last);
    }
  }
  const stopPlay = play.subscribe(sync);
  const stopStore = store.subscribe(sync);

  return {
    /** @returns {boolean} A pointer gesture ended a moment ago, so the click that follows is already handled. */
    recentlyHandled: () => win.performance.now() - lastHandled < CLICK_GUARD_MS,
    isDragging: () => active !== null,
    destroy() {
      stopPlay();
      stopStore();
      boardTracker.destroy();
      trayTracker.destroy();
      win.removeEventListener('wheel', onWheel);
      dragLayer.hide();
    },
  };
}
