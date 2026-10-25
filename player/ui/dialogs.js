// @ts-check
// Modal dialogs of the player on the native <dialog> (focus trap, Escape and inert page come from the browser): a
// confirmation and the shortcut help. Fixed texts are marked for translation, so they follow a language switch.

import { el } from '../../core/browser/dom.js';
import { loc } from './i18n-dom.js';
import { shortcutList } from './keyboard.js';

let dialogCount = 0;

/**
 * @typedef {object} Modal
 * @property {HTMLDialogElement} dialog
 * @property {HTMLElement} body
 * @property {HTMLElement} actions
 * @property {() => void} show
 * @property {() => void} close
 * @property {() => boolean} isOpen
 */

/**
 * @param {HTMLElement} host
 * @param {{ titleKey: string, className?: string }} options
 * @returns {Modal}
 */
export function createModal(host, { titleKey, className = '' }) {
  dialogCount += 1;
  const headingId = `pm-dialog-title-${dialogCount}`;
  const heading = loc(titleKey, { className: 'pm-dialog-title', attrs: { id: headingId } }, 'h2');
  const body = el('div', { className: 'pm-dialog-body' });
  const actions = el('div', { className: 'pm-dialog-actions' });
  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', {
    className: `pm-dialog ${className}`.trim(),
    attrs: { 'aria-labelledby': headingId },
  }, heading, body, actions));
  host.append(dialog);
  /** @type {Element | null} */
  let opener = null;
  // Focus goes back to whatever opened the dialog, unless that element is gone.
  dialog.addEventListener('close', () => {
    if (opener instanceof HTMLElement && opener.isConnected) {
      opener.focus();
    }
    opener = null;
  });
  return {
    dialog,
    body,
    actions,
    show() {
      if (dialog.open) {
        return;
      }
      opener = host.ownerDocument.activeElement;
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    },
    close() {
      if (!dialog.open) {
        return;
      }
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    },
    isOpen: () => dialog.open,
  };
}

/**
 * @param {string} textKey
 * @param {() => void} run
 * @param {string} action
 * @returns {HTMLButtonElement}
 */
export function dialogButton(textKey, run, action) {
  return /** @type {HTMLButtonElement} */ (loc(textKey, {
    className: 'pm-btn', attrs: { type: 'button' }, dataset: { action }, on: { click: () => run() },
  }, 'button'));
}

/**
 * @param {HTMLElement} host
 * @param {{ titleKey: string, messageKey: string, confirmKey: string, onConfirm: () => void }} options
 */
export function createConfirmDialog(host, { titleKey, messageKey, confirmKey, onConfirm }) {
  const modal = createModal(host, { titleKey, className: 'pm-confirm' });
  modal.dialog.setAttribute('role', 'alertdialog');
  modal.body.append(loc(messageKey, {}, 'p'));
  const cancel = dialogButton('ui.cancel', () => modal.close(), 'confirm-cancel');
  const confirm = dialogButton(confirmKey, () => {
    modal.close();
    onConfirm();
  }, 'confirm-ok');
  modal.actions.append(cancel, confirm);
  return {
    open() {
      modal.show();
      cancel.focus();
    },
    isOpen: modal.isOpen,
    dialog: modal.dialog,
  };
}

/**
 * @param {HTMLElement} host
 */
export function createHelpDialog(host) {
  const modal = createModal(host, { titleKey: 'ui.helpTitle', className: 'pm-help' });
  const rows = el('tbody');
  const table = el('table', { className: 'pm-shortcuts' },
    el('thead', {}, el('tr', {}, loc('ui.keyColumn', { attrs: { scope: 'col' } }, 'th'), loc('ui.actionColumn', { attrs: { scope: 'col' } }, 'th'))),
    rows);
  modal.body.append(table);
  const close = dialogButton('ui.close', () => modal.close(), 'help-close');
  modal.actions.append(close);

  /** Lists the shortcuts in the current language. */
  function fill() {
    rows.replaceChildren(...shortcutList().map(([key, action]) => el('tr', {}, el('th', { text: key, attrs: { scope: 'row' } }), el('td', { text: action }))));
  }
  fill();
  return {
    open() {
      fill();
      modal.show();
      close.focus();
    },
  };
}
