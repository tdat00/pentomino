// @ts-check
// Victory dialog: time, moves and level of the solved puzzle with Next puzzle,
// Replay and Back to generator. The dialog is only a view; the app decides what
// each button does.

import { el } from '../../core/browser/dom.js';
import { formatElapsed } from '../strings.js';
import { createModal, dialogButton } from './dialogs.js';
import { loc } from './i18n-dom.js';

/**
 * @typedef {object} WinHandlers
 * @property {() => void} onNext
 * @property {() => void} onReplay
 * @property {string} [backHref] Address of the generator.
 */

/**
 * @typedef {object} WinInfo
 * @property {number} elapsedMs
 * @property {number} moves
 * @property {string} level Level and score text; empty when the puzzle carries no rating.
 * @property {boolean} hasNext
 * @property {number} [hints] Proven hints used; shown only when above zero.
 */

/**
 * @param {HTMLElement} host
 * @param {WinHandlers} handlers
 */
export function createWinDialog(host, handlers) {
  const modal = createModal(host, { titleKey: 'ui.winTitle', className: 'pm-win' });
  const time = el('dd', { className: 'win-time' });
  const moves = el('dd', { className: 'win-moves' });
  const level = el('dd', { className: 'win-level' });
  const levelTerm = loc('ui.winLevel', {}, 'dt');
  const hintsTerm = loc('ui.hintsUsed', { attrs: { hidden: '' } }, 'dt');
  const hintsUsed = el('dd', { className: 'win-hints', attrs: { hidden: '' } });
  modal.body.append(el('dl', { className: 'win-stats' },
    loc('ui.winTime', {}, 'dt'), time,
    loc('ui.winMoves', {}, 'dt'), moves,
    levelTerm, level,
    hintsTerm, hintsUsed));
  const next = dialogButton('ui.nextPuzzle', () => {
    modal.close();
    handlers.onNext();
  }, 'win-next');
  const replay = dialogButton('ui.replay', () => {
    modal.close();
    handlers.onReplay();
  }, 'win-replay');
  const back = loc('ui.backToGenerator', { className: 'pm-btn', attrs: { href: handlers.backHref ?? '../generator/' }, dataset: { action: 'win-back' } }, 'a');
  const close = dialogButton('ui.close', () => modal.close(), 'win-close');
  modal.actions.append(next, replay, back, close);

  return {
    /** @param {WinInfo} info */
    show(info) {
      time.textContent = formatElapsed(info.elapsedMs);
      moves.textContent = String(info.moves);
      level.textContent = info.level;
      levelTerm.hidden = info.level === '';
      level.hidden = info.level === '';
      const hintCount = info.hints ?? 0;
      hintsUsed.textContent = String(hintCount);
      hintsTerm.hidden = hintCount === 0;
      hintsUsed.hidden = hintCount === 0;
      next.hidden = !info.hasNext;
      modal.show();
      (info.hasNext ? next : replay).focus();
    },
    hide: () => modal.close(),
    isOpen: modal.isOpen,
    dialog: modal.dialog,
  };
}
