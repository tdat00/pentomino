// @ts-check
// Modal dialogs of the player: a small shared shell on the native <dialog>
// (focus trap, Escape and inert page come from the browser), a confirmation and
// the shortcut help. All text goes in through `textContent`.

import { el } from '../../core/browser/dom.js';
import { LABELS } from '../strings.js';

let dialogCount = 0;

/**
 * @typedef {object} Modal
 * @property {HTMLDialogElement} dialog
 * @property {HTMLElement} body
 * @property {HTMLElement} actions
 * @property {HTMLElement} heading
 * @property {() => void} show
 * @property {() => void} close
 * @property {() => boolean} isOpen
 */

/**
 * @param {HTMLElement} host Where the dialog element lives.
 * @param {{ title: string, className?: string }} options
 * @returns {Modal}
 */
export function createModal(host, { title, className = '' }) {
  dialogCount += 1;
  const headingId = `pm-dialog-title-${dialogCount}`;
  const heading = el('h2', { className: 'pm-dialog-title', text: title, attrs: { id: headingId } });
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
    heading,
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
 * @param {string} text
 * @param {() => void} run
 * @param {string} action
 * @returns {HTMLButtonElement}
 */
export function dialogButton(text, run, action) {
  return /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', text, attrs: { type: 'button' }, dataset: { action }, on: { click: () => run() },
  }));
}

/**
 * @param {HTMLElement} host
 * @param {{ title: string, message: string, confirmText: string, onConfirm: () => void }} options
 */
export function createConfirmDialog(host, { title, message, confirmText, onConfirm }) {
  const modal = createModal(host, { title, className: 'pm-confirm' });
  modal.dialog.setAttribute('role', 'alertdialog');
  modal.body.append(el('p', { text: message }));
  const cancel = dialogButton(LABELS.cancel, () => modal.close(), 'confirm-cancel');
  const confirm = dialogButton(confirmText, () => {
    modal.close();
    onConfirm();
  }, 'confirm-ok');
  modal.actions.append(cancel, confirm);
  return {
    open() {
      modal.show();
      cancel.focus();
    },
    close: () => modal.close(),
    isOpen: modal.isOpen,
    dialog: modal.dialog,
  };
}

/**
 * @param {HTMLElement} host
 * @param {readonly (readonly [string, string])[]} shortcuts Key and action text.
 */
export function createHelpDialog(host, shortcuts) {
  const modal = createModal(host, { title: LABELS.helpTitle, className: 'pm-help' });
  const table = el('table', { className: 'pm-shortcuts' },
    el('thead', {}, el('tr', {}, el('th', { text: 'Key', attrs: { scope: 'col' } }), el('th', { text: 'Action', attrs: { scope: 'col' } }))),
    el('tbody', {}, ...shortcuts.map(([key, action]) => el('tr', {}, el('th', { text: key, attrs: { scope: 'row' } }), el('td', { text: action })))));
  modal.body.append(table);
  const close = dialogButton(LABELS.close, () => modal.close(), 'help-close');
  modal.actions.append(close);
  return {
    open() {
      modal.show();
      close.focus();
    },
    close: () => modal.close(),
    isOpen: modal.isOpen,
    dialog: modal.dialog,
  };
}
