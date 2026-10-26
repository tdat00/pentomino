// @ts-check
// Hint panel under the game bar. It is only a view; hints.js decides everything.

import { el } from '../../core/browser/dom.js';
import { LABELS, richSegments } from '../strings.js';
import { createConfirmDialog } from './dialogs.js';
import { loc } from './i18n-dom.js';

/** @typedef {import('../state.js').PlayerState} PlayerState */
/** @typedef {import('../hints.js').HintController} HintController */

/**
 * @typedef {object} HintPanelOptions
 * @property {HintController} hints
 * @property {HTMLElement} dialogHost
 * @property {() => void} onReplay Starts a fresh, unassisted session of the open puzzle.
 * @property {() => HTMLElement | null | undefined} [hintButton] Gets the focus back when a panel button disappears.
 */

/**
 * @param {HTMLElement} host
 * @param {HintPanelOptions} options
 */
export function createHintPanel(host, { hints, dialogHost, onReplay, hintButton }) {
  /** Keyboard users keep their place: the focus goes back to Hint when the button they used goes away. */
  const refocus = () => hintButton?.()?.focus();
  /**
   * @param {string} action
   * @param {string} textKey
   * @param {() => void} run
   * @returns {HTMLButtonElement}
   */
  const button = (action, textKey, run) => /** @type {HTMLButtonElement} */ (loc(textKey, {
    className: 'pm-btn', attrs: { type: 'button' }, dataset: { action }, on: { click: () => run() },
  }, 'button'));
  const text = el('span', { className: 'status-text', dataset: { role: 'hint-text' } });
  const placeIt = button('hint-place', 'ui.placeIt', () => {
    hints.applyHint();
    refocus();
  });
  const removeIt = button('hint-remove', 'ui.removeIt', () => {
    hints.applyHint();
    refocus();
  });
  const dismiss = button('hint-dismiss', 'ui.dismiss', () => {
    hints.dismiss();
    refocus();
  });
  const cancel = button('hint-cancel', 'ui.cancelCheck', () => {
    hints.cancel();
    refocus();
  });
  const replay = button('hint-replay', 'ui.replay', () => onReplay());
  // The text takes the whole width; the buttons are on a row of their own under it.
  const root = el('div', { className: 'status-hint', attrs: { hidden: '' }, dataset: { host: 'hint' } },
    text, el('div', { className: 'status-hint-actions' }, placeIt, removeIt, cancel, dismiss, replay));
  host.append(root);

  let revealConfirmed = false;
  const revealDialog = createConfirmDialog(dialogHost, {
    titleKey: 'ui.revealTitle',
    messageKey: 'ui.revealBody',
    confirmKey: 'ui.revealConfirm',
    onConfirm: () => {
      revealConfirmed = true;
      void hints.reveal();
    },
  });
  revealDialog.dialog.classList.add('pm-reveal');
  revealDialog.dialog.addEventListener('close', () => {
    if (!revealConfirmed) {
      hints.declineReveal();
    }
    revealConfirmed = false;
  });
  let resetConfirmed = false;
  const resetDialog = createConfirmDialog(dialogHost, {
    titleKey: 'ui.resetRevealTitle',
    messageKey: 'ui.resetRevealBody',
    confirmKey: 'ui.resetRevealConfirm',
    onConfirm: () => {
      resetConfirmed = true;
      void hints.reveal({ replace: true });
    },
  });
  resetDialog.dialog.classList.add('pm-reveal-reset');
  resetDialog.dialog.addEventListener('close', () => {
    if (!resetConfirmed && hints.getState().phase === 'reveal-unsat') {
      hints.dismiss();
    }
    resetConfirmed = false;
  });

  let lastPhase = 'idle';
  /** @param {PlayerState} state */
  function render(state) {
    const hint = hints.getState();
    const revealed = state.game?.revealed === true;
    const working = hint.phase === 'working';
    const text0 = hint.message !== '' ? hint.message : revealed ? LABELS.revealedBadge : '';
    text.replaceChildren(...richSegments(hint.rich !== '' ? hint.rich : text0).map((segment) => (segment.bold ? el('strong', { text: segment.text }) : segment.text)));
    root.hidden = text0 === '' && !working;
    root.dataset.phase = hint.phase;
    root.dataset.revealed = String(revealed);
    placeIt.hidden = !(hint.phase === 'hint' && hint.marks?.kind === 'place');
    removeIt.hidden = !(hint.phase === 'hint' && hint.marks?.kind === 'remove');
    cancel.hidden = !working;
    dismiss.hidden = working || hint.message === '' || hint.phase === 'reveal-unsat';
    replay.hidden = !revealed;
    // A keyboard user who asked from the Hint button is taken to the answer.
    if (hint.phase === 'hint' && lastPhase !== 'hint' && hintButton?.() === dialogHost.ownerDocument.activeElement) {
      (placeIt.hidden ? removeIt : placeIt).focus();
    }
    lastPhase = hint.phase;
    if (hint.phase === 'reveal-unsat' && !resetDialog.isOpen()) {
      resetDialog.open();
    }
  }

  return {
    render,
    /** Asks for the confirmation; the board is not touched before the player agrees. */
    askReveal() {
      revealConfirmed = false;
      revealDialog.open();
    },
  };
}
