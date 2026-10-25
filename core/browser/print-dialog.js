// @ts-check
// The Print dialog shared by the Generator and the Player: what to print (the piece set, the board and its size,
// two-sided paper), the summary of the paper it needs, and the print itself. The pages are drawn into a hidden
// element of the page (print.css shows only it while printing), so nothing leaves the browser. Texts are marked with
// `data-i18n`, so the app's language switch refreshes them; `t` is the app's lookup.

import { el } from './dom.js';
import { PRINT_SIZES, planPrint } from './print-layout.js';
import { buildPrintPages, formatMm } from './print-sheet.js';

/** @typedef {import('../engine/types.js').Board} Board */
/** @typedef {import('../engine/types.js').Piece} Piece */
/** @typedef {import('../engine/types.js').Pose} Pose */
/** @typedef {import('./print-layout.js').PrintOptions} PrintOptions */

/**
 * @typedef {object} PrintJob
 * @property {Board} board
 * @property {Piece[]} pieces Every piece of the set, the pre-placed ones included.
 * @property {Pose[]} clues Pre-placed pieces of the puzzle.
 * @property {number} rotation Angle the board is shown at (counter-clockwise degrees).
 * @property {string} title
 * @property {string} subtitle
 */

/**
 * @typedef {object} PrintDialogOptions
 * @property {HTMLElement} host Where the dialog element lives.
 * @property {(key: string, args?: Record<string, unknown>) => string} t
 * @property {() => PrintJob | null} getJob The puzzle to print, read when the dialog opens and when Print is pressed.
 * @property {Window & typeof globalThis} [win]
 */

let dialogCount = 0;

/** @type {PrintOptions} */
const DEFAULT_OPTIONS = Object.freeze({ pieces: true, board: true, size: 'medium', duplex: false });

/**
 * Prints the pages: they replace the app on paper only while the browser prints.
 * @param {Document} doc
 * @param {Window & typeof globalThis} win
 * @param {HTMLElement[]} pages
 */
export function printPages(doc, win, pages) {
  const root = el('div', { className: 'pm-print-root', attrs: { 'aria-hidden': 'true' } }, ...pages);
  doc.body.append(root);
  doc.documentElement.classList.add('pm-printing');
  let finished = false;
  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    win.removeEventListener('afterprint', finish);
    doc.documentElement.classList.remove('pm-printing');
    root.remove();
  };
  win.addEventListener('afterprint', finish);
  if (typeof win.print === 'function') {
    win.print();
  } else {
    finish();
  }
}

/**
 * @param {PrintDialogOptions} options
 */
export function createPrintDialog({ host, t, getJob, win: windowOverride }) {
  const doc = host.ownerDocument;
  const win = windowOverride ?? /** @type {Window & typeof globalThis} */ (doc.defaultView ?? globalThis);
  dialogCount += 1;
  const headingId = `pm-print-title-${dialogCount}`;
  /** @type {PrintOptions} */
  let options = { ...DEFAULT_OPTIONS };

  /**
   * @param {string} key
   * @param {string} tag
   * @param {string} [className]
   * @returns {HTMLElement}
   */
  const loc = (key, tag, className = '') => el(tag, { className, text: t(key), dataset: { i18n: key } });
  /**
   * @param {string} field
   * @param {string} labelKey
   * @param {string} hintKey
   * @returns {{ label: HTMLElement, input: HTMLInputElement }}
   */
  const toggle = (field, labelKey, hintKey) => {
    const input = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox' }, dataset: { field } }));
    return { input, label: el('label', { className: 'pm-print-toggle' }, input, el('span', {}, loc(labelKey, 'strong'), loc(hintKey, 'small'))) };
  };
  const pieces = toggle('print-pieces', 'print.pieces', 'print.pieces.hint');
  const board = toggle('print-board', 'print.board', 'print.board.hint');
  const duplex = toggle('print-duplex', 'print.duplex', 'print.duplex.hint');
  const size = /** @type {HTMLSelectElement} */ (el('select', { dataset: { field: 'print-size' } },
    ...PRINT_SIZES.map((id) => el('option', { text: t(`print.size.${id}`), attrs: { value: id }, dataset: { i18n: `print.size.${id}` } }))));
  const sizeField = el('label', { className: 'pm-print-field' }, loc('print.size', 'span'), size, loc('print.size.hint', 'small'));
  const summary = el('p', { className: 'pm-print-summary', attrs: { role: 'status' }, dataset: { role: 'print-summary' } });
  const cancel = /** @type {HTMLButtonElement} */ (el('button', { className: 'pm-btn', attrs: { type: 'button' }, dataset: { action: 'print-cancel', i18n: 'print.cancel' }, text: t('print.cancel') }));
  const confirm = /** @type {HTMLButtonElement} */ (el('button', { className: 'pm-btn primary', attrs: { type: 'button' }, dataset: { action: 'print-confirm', i18n: 'print.confirm' }, text: t('print.confirm') }));
  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', { className: 'pm-print-dialog', attrs: { 'aria-labelledby': headingId } },
    el('h2', { className: 'pm-print-title', attrs: { id: headingId }, dataset: { i18n: 'print.title' }, text: t('print.title') }),
    loc('print.intro', 'p'),
    el('div', { className: 'pm-print-options' }, pieces.label, board.label, sizeField, duplex.label),
    summary,
    loc('print.note', 'p', 'pm-print-note'),
    el('div', { className: 'pm-print-actions' }, cancel, confirm)));
  host.append(dialog);

  /** @returns {PrintOptions} */
  function read() {
    const chosen = /** @type {import('./print-layout.js').PrintSize} */ (size.value);
    return { pieces: pieces.input.checked, board: board.input.checked, size: PRINT_SIZES.includes(chosen) ? chosen : 'medium', duplex: duplex.input.checked };
  }

  function write() {
    pieces.input.checked = options.pieces;
    board.input.checked = options.board;
    duplex.input.checked = options.duplex;
    size.value = options.size;
  }

  /** Shows the paper the choices need. */
  function refresh() {
    options = read();
    const job = getJob();
    confirm.disabled = job === null;
    if (job === null) {
      summary.textContent = '';
      return;
    }
    const plan = planPrint(job, options);
    const parts = [t('print.summary.sheets', { count: plan.sheets.length }), t('print.summary.cell', { mm: formatMm(plan.cellMm) })];
    if (plan.pages.length > plan.sheets.length) {
      parts.push(t('print.summary.duplex', { pages: plan.pages.length }));
    }
    if (plan.boardParts > 1) {
      parts.push(t('print.summary.parts', { count: plan.boardParts }));
    }
    if (plan.turned) {
      parts.push(t('print.summary.turned'));
    }
    summary.textContent = parts.join(' · ');
    if (plan.reduced) {
      summary.append(el('span', { className: 'pm-print-warning', text: t('print.summary.reduced') }));
    }
  }

  function run() {
    const job = getJob();
    if (job === null) {
      return;
    }
    options = read();
    const plan = planPrint(job, options);
    const pages = buildPrintPages(plan, { title: job.title, subtitle: job.subtitle }, t);
    dialog.close();
    printPages(doc, win, pages);
  }

  for (const input of [pieces.input, board.input, duplex.input, size]) {
    input.addEventListener('change', refresh);
  }
  cancel.addEventListener('click', () => dialog.close());
  confirm.addEventListener('click', run);
  // Hands the focus back to the button that opened the dialog.
  /** @type {Element | null} */
  let opener = null;
  dialog.addEventListener('close', () => {
    if (opener instanceof HTMLElement && opener.isConnected) {
      opener.focus();
    }
    opener = null;
  });

  return {
    dialog,
    open() {
      if (dialog.open) {
        return;
      }
      opener = doc.activeElement;
      write();
      refresh();
      dialog.showModal();
      confirm.focus();
    },
    close() {
      if (dialog.open) {
        dialog.close();
      }
    },
    isOpen: () => dialog.open,
    /** Writes the summary again, for example after a language switch. */
    refresh,
    destroy() {
      dialog.remove();
    },
  };
}
