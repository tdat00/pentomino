// @ts-check
// Victory dialog; the app decides what its buttons do.

import { el } from '../../core/browser/dom.js';
import { svgEl } from '../../core/browser/svg-board.js';
import { formatElapsed } from '../strings.js';
import { createModal, dialogButton } from './dialogs.js';
import { loc } from './i18n-dom.js';

/**
 * @typedef {object} WinHandlers
 * @property {() => void} onNext
 * @property {() => void} onReplay
 */

/**
 * @typedef {object} WinInfo
 * @property {number} elapsedMs
 * @property {number} moves
 * @property {boolean} hasNext
 * @property {number} [hints] Proven hints used; shown only when above zero.
 */

/** A trophy in a ring of sparkles, drawn in the accent colours of the theme. */
function badge() {
  const sparkle = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ r) => svgEl('path', {
    class: 'win-sparkle', d: `M${x} ${y - r}L${x + r * 0.3} ${y - r * 0.3}L${x + r} ${y}L${x + r * 0.3} ${y + r * 0.3}L${x} ${y + r}L${x - r * 0.3} ${y + r * 0.3}L${x - r} ${y}L${x - r * 0.3} ${y - r * 0.3}Z`,
  });
  return el('div', { className: 'win-badge', attrs: { 'aria-hidden': 'true' } },
    svgEl('svg', { viewBox: '0 0 96 96', focusable: 'false' },
      svgEl('circle', { class: 'win-badge-disc', cx: 48, cy: 48, r: 34 }),
      svgEl('path', {
        class: 'win-trophy',
        d: 'M34 30h28v8c0 9-6 16-14 17-8-1-14-8-14-17zM34 33h-6c0 7 4 11 8 12M62 33h6c0 7-4 11-8 12M48 55v8M40 68h16v-5H40z',
      }),
      sparkle(14, 22, 6), sparkle(84, 18, 5), sparkle(82, 74, 7), sparkle(12, 70, 4), sparkle(48, 6, 4)));
}

/**
 * @param {string} labelKey
 * @param {string} className
 * @returns {{ tile: HTMLElement, value: HTMLElement }}
 */
function statTile(labelKey, className) {
  const value = el('dd', { className: `win-value ${className}` });
  return { tile: el('div', { className: 'win-stat' }, loc(labelKey, { className: 'win-label' }, 'dt'), value), value };
}

/**
 * @param {HTMLElement} host
 * @param {WinHandlers} handlers
 */
export function createWinDialog(host, handlers) {
  const modal = createModal(host, { titleKey: 'ui.winTitle', className: 'pm-win' });
  modal.dialog.prepend(badge());
  const time = statTile('ui.winTime', 'win-time');
  const moves = statTile('ui.winMoves', 'win-moves');
  const hints = statTile('ui.hintsUsed', 'win-hints');
  hints.tile.hidden = true;
  modal.body.append(
    loc('ui.winMessage', { className: 'win-message' }, 'p'),
    el('dl', { className: 'win-stats' }, time.tile, moves.tile, hints.tile));
  const next = dialogButton('ui.nextPuzzle', () => {
    modal.close();
    handlers.onNext();
  }, 'win-next');
  const replay = dialogButton('ui.replay', () => {
    modal.close();
    handlers.onReplay();
  }, 'win-replay');
  const close = dialogButton('ui.close', () => modal.close(), 'win-close');
  close.classList.add('primary');
  modal.actions.append(next, replay, close);

  return {
    /** @param {WinInfo} info */
    show(info) {
      time.value.textContent = formatElapsed(info.elapsedMs);
      moves.value.textContent = String(info.moves);
      const hintCount = info.hints ?? 0;
      hints.value.textContent = String(hintCount);
      hints.tile.hidden = hintCount === 0;
      next.hidden = !info.hasNext;
      modal.show();
      (info.hasNext ? next : close).focus();
    },
    hide: () => modal.close(),
    isOpen: modal.isOpen,
  };
}
