// @ts-check
// Single-pointer gesture tracker: captures on a stable surface and reports select / dragStart / dragMove / dragEnd /
// cancel signals. It never mutates game state; controllers decide what a signal means.

/**
 * @typedef {object} PointerInfo
 * @property {number} pointerId
 * @property {string} pointerType
 * @property {number} clientX
 * @property {number} clientY
 * @property {number} startX
 * @property {number} startY
 * @property {string | null} pieceId
 * @property {number | null} sourceCell Index into the grabbed piece's own cells, or null when unknown.
 * @property {string} [reason] Only on `cancel`: pointercancel, lostcapture, escape, resize, api, destroy.
 */

/**
 * @typedef {object} PointerHandlers
 * @property {(info: PointerInfo) => void} [select] Pointer released without crossing the drag threshold.
 * @property {(info: PointerInfo) => void} [dragStart] Threshold crossed; coordinates are the current position.
 * @property {(info: PointerInfo) => void} [dragMove] Throttled to one call per animation frame.
 * @property {(info: PointerInfo) => void} [dragEnd] Pointer released after a drag.
 * @property {(info: PointerInfo) => void} [cancel] The gesture was interrupted; revert any visual state.
 * @property {(info: PointerInfo) => void} [longPress] A touch stayed on a piece for `longPressMs` without moving. The
 *   gesture ends there: nothing follows for that touch (no select, no drag).
 */

/**
 * @typedef {object} PointerTrackerOptions
 * @property {(event: PointerEvent) => { pieceId: string, sourceCell: number | null } | null} [resolve]
 *   Maps a pointerdown to a piece. Defaults to the nearest `[data-movable="true"]` ancestor and its
 *   `data-source-cell`; returning null ignores the pointer so page scrolling is untouched.
 * @property {EventTarget} [view] Receives keydown (Escape) and resize; defaults to the element's window.
 * @property {(callback: () => void) => number} [schedule] Frame scheduler, `requestAnimationFrame` by default.
 * @property {(handle: number) => void} [unschedule]
 * @property {number} [longPressMs] Hold time of a touch that reports `longPress`; without it there is none.
 * @property {boolean} [holdTouchScroll] While a gesture is on a piece, a touch move does not scroll the page or the surface
 *   (`touch-action` is not honoured on SVG pieces by every browser, which cancels the pointer at the first move).
 * @property {'x' | 'y'} [scrollAxis] The surface scrolls along this axis under a touch. A touch that moves mainly along
 *   it is left to the scroll: it never becomes a drag and does not select.
 */

export const DRAG_THRESHOLD_PX = Object.freeze({ mouse: 6, pen: 6, touch: 10 });

/**
 * Movement in CSS px before a press becomes a drag.
 * @param {string} pointerType
 * @returns {number}
 */
export function dragThreshold(pointerType) {
  return pointerType === 'touch' ? DRAG_THRESHOLD_PX.touch : DRAG_THRESHOLD_PX.mouse;
}

/**
 * @param {PointerEvent} event
 * @returns {{ pieceId: string, sourceCell: number | null } | null}
 */
function defaultResolve(event) {
  const target = /** @type {Element | null} */ (event.target);
  if (target === null || typeof target.closest !== 'function') {
    return null;
  }
  const piece = target.closest('[data-movable="true"]');
  const pieceId = piece?.getAttribute('data-piece-id');
  if (!pieceId) {
    return null;
  }
  const raw = target.getAttribute('data-source-cell');
  const cell = raw === null ? Number.NaN : Number(raw);
  return { pieceId, sourceCell: Number.isInteger(cell) && cell >= 0 ? cell : null };
}

/**
 * @param {HTMLElement | SVGElement | EventTarget} el Stable surface that outlives re-renders.
 * @param {PointerHandlers} handlers
 * @param {PointerTrackerOptions} [options]
 * @returns {{ cancel: (reason: string) => void, destroy: () => void, isActive: () => boolean }}
 */
export function createPointerTracker(el, handlers, options = {}) {
  const surface = /** @type {HTMLElement} */ (el);
  const view = options.view ?? surface.ownerDocument?.defaultView ?? globalThis;
  const resolve = options.resolve ?? defaultResolve;
  const schedule = options.schedule ?? ((/** @type {() => void} */ cb) => (typeof globalThis.requestAnimationFrame === 'function'
    ? globalThis.requestAnimationFrame(cb)
    : /** @type {number} */ (/** @type {unknown} */ (globalThis.setTimeout(cb, 16)))));
  const unschedule = options.unschedule ?? ((/** @type {number} */ h) => (typeof globalThis.cancelAnimationFrame === 'function'
    ? globalThis.cancelAnimationFrame(h)
    : globalThis.clearTimeout(h)));

  /** @type {{ info: PointerInfo, dragging: boolean, scrolling: boolean, threshold: number, timer: ReturnType<typeof setTimeout> | null } | null} */
  let gesture = null;
  /** @type {{ x: number, y: number } | null} */
  let pending = null;
  /** @type {number | null} */
  let frame = null;
  let destroyed = false;

  /**
   * @param {PointerEvent} e
   * @returns {PointerInfo}
   */
  const infoAt = (e) => {
    const current = /** @type {NonNullable<typeof gesture>} */ (gesture).info;
    return { ...current, clientX: e.clientX, clientY: e.clientY };
  };

  function clearFrame() {
    if (frame !== null) {
      unschedule(frame);
      frame = null;
    }
    pending = null;
  }

  function clearTimer() {
    if (gesture?.timer != null) {
      globalThis.clearTimeout(gesture.timer);
      gesture.timer = null;
    }
  }

  /** @param {number} pointerId */
  function release(pointerId) {
    try {
      if (typeof surface.hasPointerCapture !== 'function' || surface.hasPointerCapture(pointerId)) {
        surface.releasePointerCapture?.(pointerId);
      }
    } catch {
      // The pointer is already gone.
    }
  }

  /**
   * Ends the gesture without a drop and tells the controller why.
   * @param {string} reason
   */
  function abort(reason) {
    if (gesture === null) {
      return;
    }
    clearTimer();
    const done = gesture;
    gesture = null;
    clearFrame();
    release(done.info.pointerId);
    handlers.cancel?.({ ...done.info, reason });
  }

  /** @param {PointerEvent} e */
  function onDown(e) {
    if (gesture !== null || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) {
      return;
    }
    const hit = resolve(e);
    if (hit === null) {
      return;
    }
    gesture = {
      dragging: false,
      scrolling: false,
      timer: null,
      threshold: dragThreshold(e.pointerType),
      info: {
        pointerId: e.pointerId, pointerType: e.pointerType, clientX: e.clientX, clientY: e.clientY,
        startX: e.clientX, startY: e.clientY, pieceId: hit.pieceId, sourceCell: hit.sourceCell,
      },
    };
    try {
      surface.setPointerCapture?.(e.pointerId);
    } catch {
      // Without capture the gesture still ends on pointerup or pointercancel.
    }
    if (options.longPressMs !== undefined && options.longPressMs > 0 && e.pointerType === 'touch') {
      gesture.timer = globalThis.setTimeout(onLongPress, options.longPressMs);
    }
  }

  function onLongPress() {
    if (gesture === null) {
      return;
    }
    const done = gesture;
    done.timer = null;
    gesture = null;
    clearFrame();
    release(done.info.pointerId);
    handlers.longPress?.({ ...done.info });
  }

  /** @param {PointerEvent} e */
  function onMove(e) {
    if (gesture === null || e.pointerId !== gesture.info.pointerId) {
      return;
    }
    if (gesture.scrolling) {
      return;
    }
    if (!gesture.dragging) {
      const { startX, startY } = gesture.info;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < gesture.threshold) {
        return;
      }
      clearTimer();
      const along = options.scrollAxis === 'x' ? Math.abs(e.clientX - startX) : Math.abs(e.clientY - startY);
      const across = options.scrollAxis === 'x' ? Math.abs(e.clientY - startY) : Math.abs(e.clientX - startX);
      if (e.pointerType === 'touch' && options.scrollAxis !== undefined && along > across) {
        gesture.scrolling = true;
        return;
      }
      gesture.dragging = true;
      handlers.dragStart?.(infoAt(e));
      if (gesture === null) {
        return;
      }
    }
    pending = { x: e.clientX, y: e.clientY };
    if (frame === null) {
      frame = schedule(() => {
        frame = null;
        const at = pending;
        pending = null;
        if (gesture !== null && at !== null) {
          handlers.dragMove?.({ ...gesture.info, clientX: at.x, clientY: at.y });
        }
      });
    }
  }

  /** @param {PointerEvent} e */
  function onUp(e) {
    if (gesture === null || e.pointerId !== gesture.info.pointerId) {
      return;
    }
    clearTimer();
    const done = gesture;
    const info = infoAt(e);
    gesture = null;
    clearFrame();
    release(done.info.pointerId);
    if (done.dragging) {
      handlers.dragEnd?.(info);
    } else if (!done.scrolling) {
      handlers.select?.(info);
    }
  }

  /** @param {PointerEvent} e */
  function onCancel(e) {
    if (gesture !== null && e.pointerId === gesture.info.pointerId) {
      abort('pointercancel');
    }
  }

  /** @param {PointerEvent} e */
  function onLostCapture(e) {
    if (gesture !== null && e.pointerId === gesture.info.pointerId) {
      abort('lostcapture');
    }
  }

  /** @param {KeyboardEvent} e */
  function onKey(e) {
    if (e.key === 'Escape') {
      abort('escape');
    }
  }

  const onResize = () => abort('resize');

  /** @param {TouchEvent} e */
  function onTouchMove(e) {
    if (gesture !== null && !gesture.scrolling && e.cancelable) {
      e.preventDefault();
    }
  }

  /** @type {Array<[EventTarget, string, (event: any) => void]>} */
  const wiring = [
    [surface, 'pointerdown', onDown],
    [surface, 'pointermove', onMove],
    [surface, 'pointerup', onUp],
    [surface, 'pointercancel', onCancel],
    [surface, 'lostpointercapture', onLostCapture],
    [view, 'keydown', onKey],
    [view, 'resize', onResize],
    [view, 'orientationchange', onResize],
  ];
  for (const [target, type, fn] of wiring) {
    target.addEventListener(type, fn);
  }
  if (options.holdTouchScroll === true) {
    surface.addEventListener('touchmove', onTouchMove, { passive: false });
  }

  return {
    cancel(reason) {
      abort(String(reason));
    },
    isActive: () => gesture !== null,
    destroy() {
      if (destroyed) {
        return;
      }
      abort('destroy');
      destroyed = true;
      for (const [target, type, fn] of wiring) {
        target.removeEventListener(type, fn);
      }
      surface.removeEventListener('touchmove', onTouchMove);
    },
  };
}
