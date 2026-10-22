// @ts-check
// Drag layer: a full-window, pointer-transparent overlay that carries the clone
// of the dragged piece at board scale and rotation, with its grabbed cell kept
// under the pointer. The committed state is never touched here.

import { el } from '../../core/browser/dom.js';
import { mountPiecePreview } from '../../core/browser/svg-board.js';

/** @typedef {import('../../core/engine/types.js').Piece} Piece */

/**
 * @typedef {object} CloneSpec
 * @property {Piece} piece
 * @property {number} index Palette index of the piece.
 * @property {number} count Piece count of the set.
 * @property {number} t Orientation being dragged.
 * @property {number} rotation Display angle.
 * @property {number} cellPx Board cell size.
 * @property {number} handleIndex Source cell under the pointer.
 * @property {boolean} showLabels
 * @property {boolean} showPatterns
 */

/**
 * @param {HTMLElement} parent
 */
export function createDragLayer(parent) {
  const layer = el('div', { className: 'drag-layer', attrs: { 'aria-hidden': 'true', hidden: '' }, dataset: { host: 'drag' } });
  parent.append(layer);
  /** @type {ReturnType<typeof mountPiecePreview> | null} */
  let preview = null;
  let offsetX = 0;
  let offsetY = 0;
  let x = 0;
  let y = 0;

  function place() {
    preview?.svg.style.setProperty('transform', `translate(${Math.round(x - offsetX)}px, ${Math.round(y - offsetY)}px)`);
  }

  return {
    /** Draws the clone; call again after every rotate or mirror. @param {CloneSpec} spec */
    show(spec) {
      preview?.destroy();
      layer.hidden = false;
      preview = mountPiecePreview(layer, spec.piece, { cellPx: spec.cellPx, index: spec.index, count: spec.count, name: spec.piece.label });
      preview.svg.classList.add('drag-piece');
      preview.render({ t: spec.t, rotation: spec.rotation, showLabels: spec.showLabels, showPatterns: spec.showPatterns });
      // A rotated square's bounding box has the same center, so the hit area of the handle cell locates it.
      const hit = preview.svg.querySelector(`.pm-hit[data-source-cell="${spec.handleIndex}"]`);
      const box = preview.svg.getBoundingClientRect();
      const cell = hit?.getBoundingClientRect();
      offsetX = cell === undefined ? box.width / 2 : cell.left + cell.width / 2 - box.left;
      offsetY = cell === undefined ? box.height / 2 : cell.top + cell.height / 2 - box.top;
      place();
    },
    /**
     * Puts the grabbed cell's center at a viewport point.
     * @param {number} clientX
     * @param {number} clientY
     */
    moveTo(clientX, clientY) {
      x = clientX;
      y = clientY;
      place();
    },
    hide() {
      preview?.destroy();
      preview = null;
      layer.hidden = true;
    },
    isShown: () => preview !== null,
    element: layer,
    destroy() {
      preview?.destroy();
      layer.remove();
    },
  };
}
