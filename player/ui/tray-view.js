// @ts-check
// Tray adapter: one button per unplaced piece, drawn at its current tray
// orientation and the effective display angle through the shared T16 preview.
// It only reports selection and grab events; the gesture layer turns them into moves.

import { mountPiecePreview, pieceName } from '../../core/browser/svg-board.js';

/** @typedef {import('../../core/engine/types.js').Piece} Piece */
/** @typedef {import('../state.js').PlayerState} PlayerState */

const MIN_TRAY_CELL_PX = 12;
const MAX_TRAY_CELL_PX = 26;
// Longest side of the largest piece, in CSS px, so even 50-cell pieces fit a tray slot.
const TARGET_SLOT_PX = 150;
const COMPACT_SLOT_PX = 84;
const COMPACT_QUERY = '(max-width: 767px)';

/**
 * Cell size of tray pieces: the largest piece decides so all pieces share one scale.
 * @param {Piece[]} pieces
 * @param {number} angle
 * @param {number} [slotPx] Longest side available to the largest piece.
 * @returns {number}
 */
export function trayCellPx(pieces, angle, slotPx = TARGET_SLOT_PX) {
  let longest = 1;
  for (const piece of pieces) {
    const xs = piece.cells.map((c) => c[0]);
    const ys = piece.cells.map((c) => c[1]);
    const w = Math.max(...xs) - Math.min(...xs) + 1;
    const h = Math.max(...ys) - Math.min(...ys) + 1;
    longest = Math.max(longest, w, h, angle % 90 === 0 ? 0 : (w + h) / Math.SQRT2);
  }
  return Math.max(MIN_TRAY_CELL_PX, Math.min(MAX_TRAY_CELL_PX, Math.floor(slotPx / longest)));
}

/**
 * @typedef {object} TrayHooks
 * @property {(pieceId: string, event: Event) => void} [onSelect] Click, Enter or Space on a tray piece.
 * @property {(grab: { pieceId: string, sourceCell: number | null, event: PointerEvent }) => void} [onGrab]
 *   Pointer pressed on a tray piece; `sourceCell` indexes the piece's cells at its current orientation.
 */

/**
 * @typedef {object} Slot
 * @property {HTMLButtonElement} button
 * @property {ReturnType<typeof mountPiecePreview>} preview
 * @property {string} signature
 */

/**
 * @param {HTMLElement} host
 * @param {TrayHooks} [hooks]
 */
export function createTrayView(host, hooks = {}) {
  /** @type {Map<string, Slot>} */
  const slots = new Map();
  /** @type {object | null} */
  let lastPack = null;
  let lastCellPx = 0;
  /** @type {{ state: Pick<PlayerState, 'pack' | 'game' | 'prefs'>, angle: number } | null} */
  let last = null;

  /**
   * @param {string} id
   * @param {Piece} piece
   * @param {number} index
   * @param {number} count
   * @param {number} cellPx
   * @returns {Slot}
   */
  function ensure(id, piece, index, count, cellPx) {
    const known = slots.get(id);
    if (known !== undefined) {
      return known;
    }
    const button = host.ownerDocument.createElement('button');
    button.type = 'button';
    button.className = 'tray-piece';
    button.dataset.pieceId = id;
    const preview = mountPiecePreview(button, piece, { cellPx, index, count, name: pieceName(piece, 'in tray') });
    preview.svg.setAttribute('aria-hidden', 'true');
    preview.svg.removeAttribute('role');
    preview.svg.removeAttribute('aria-label');
    button.addEventListener('click', (event) => hooks.onSelect?.(id, event));
    button.addEventListener('pointerdown', (event) => {
      hooks.onGrab?.({ pieceId: id, sourceCell: preview.sourceCellAt(event.clientX, event.clientY), event });
    });
    /** @type {Slot} */
    const slot = { button, preview, signature: '' };
    slots.set(id, slot);
    return slot;
  }

  function dropAll() {
    for (const slot of slots.values()) {
      slot.preview.destroy();
      slot.button.remove();
    }
    slots.clear();
  }

  return {
    /**
     * @param {Pick<PlayerState, 'pack' | 'game' | 'prefs'>} state
     * @param {number} angle Effective display angle.
     */
    render(state, angle) {
      const { pack, game, prefs } = state;
      if (pack === null || game === null) {
        return;
      }
      last = { state, angle };
      const compact = host.ownerDocument.defaultView?.matchMedia?.(COMPACT_QUERY)?.matches === true;
      const cellPx = trayCellPx(pack.pieces, angle, compact ? COMPACT_SLOT_PX : TARGET_SLOT_PX);
      if (pack !== lastPack || cellPx !== lastCellPx) {
        dropAll();
        lastPack = pack;
        lastCellPx = cellPx;
      }
      const showPatterns = prefs.patterns && pack.pieces.length > 20;
      const order = [];
      pack.pieces.forEach((piece, index) => {
        const t = game.tray.get(piece.id);
        if (t === undefined) {
          return;
        }
        const slot = ensure(piece.id, piece, index, pack.pieces.length, cellPx);
        const selected = game.selected === piece.id;
        const signature = `${t}|${angle}|${prefs.labels}|${showPatterns}|${cellPx}`;
        if (slot.signature !== signature) {
          slot.signature = signature;
          slot.preview.render({ t, rotation: angle, showLabels: prefs.labels, showPatterns });
        }
        slot.button.setAttribute('aria-pressed', String(selected));
        slot.button.setAttribute('aria-label', pieceName(piece, selected ? 'in tray, selected' : 'in tray'));
        slot.button.dataset.t = String(t);
        order.push(slot);
      });
      const wanted = new Set(order.map((slot) => slot.button));
      for (const [id, slot] of [...slots]) {
        if (!wanted.has(slot.button)) {
          slot.preview.destroy();
          slot.button.remove();
          slots.delete(id);
        }
      }
      let cursor = host.firstElementChild;
      for (const { button } of order) {
        if (button === cursor) {
          cursor = cursor.nextElementSibling;
        } else {
          host.insertBefore(button, cursor);
        }
      }
      host.dataset.count = String(order.length);
    },
    /** Redraws with the last state, e.g. after the viewport crossed the compact breakpoint. */
    refresh() {
      if (last !== null) {
        this.render(last.state, last.angle);
      }
    },
    /**
     * Hides the original drawing of the tray piece that is being dragged; its slot stays.
     * @param {string | null} pieceId
     */
    setHidden(pieceId) {
      for (const [id, slot] of slots) {
        if (id === pieceId) {
          slot.button.dataset.dragging = 'true';
        } else {
          delete slot.button.dataset.dragging;
        }
      }
    },
    /** @param {string} pieceId @returns {HTMLButtonElement | null} */
    buttonFor: (pieceId) => slots.get(pieceId)?.button ?? null,
    destroy() {
      dropAll();
    },
  };
}
