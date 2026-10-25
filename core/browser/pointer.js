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
 */

/**
 * @typedef {object} PointerTrackerOptions
 * @property {(event: PointerEvent) => { pieceId: string, sourceCell: number | null } | null} [resolve]
 *   Maps a pointerdown to a piece. Defaults to the nearest `[data-movable="true"]` ancestor and its
 *   `data-source-cell`; returning null ignores the pointer so page scrolling is untouched.
 * @property {EventTarget} [view] Receives keydown (Escape) and resize; defaults to the element's window.
 * @property {(callback: () => void) => number} [schedule] Frame scheduler, `requestAnimationFrame` by default.
 * @property {(handle: number) => void} [unschedule]
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

  /** @type {{ info: PointerInfo, dragging: boolean, threshold: number } | null} */
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
  }

  /** @param {PointerEvent} e */
  function onMove(e) {
    if (gesture === null || e.pointerId !== gesture.info.pointerId) {
      return;
    }
    if (!gesture.dragging) {
      const { startX, startY } = gesture.info;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < gesture.threshold) {
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
    const done = gesture;
    const info = infoAt(e);
    gesture = null;
    clearFrame();
    release(done.info.pointerId);
    if (done.dragging) {
      handlers.dragEnd?.(info);
    } else {
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
    },
  };
}
