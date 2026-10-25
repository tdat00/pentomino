// @ts-check
// The Print dialog shared by the Generator and the Player. The pages are drawn into a hidden element of the page
// (print.css shows only it while printing), so nothing leaves the browser. Texts are marked with `data-i18n`, so the
// app's language switch refreshes them; `t` is the app's lookup.

import { el } from './dom.js';
import { CELL_MM, PRINT_SIZES, planPrint } from './print-layout.js';
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
 * @property {PrintLine[]} details Lines under the title (see `puzzleDetails`).
 * @property {Pose[] | null} [solution] Every piece placed, for the "Print solution" option.
 */

/** @typedef {import('./print-sheet.js').PrintLine} PrintLine */

const BOLD_MARK = '\u0000';

/**
 * The lines under the title of a printed puzzle, with the level names in bold, so the puzzle and its piece set can be
 * made again: "Nightmare: score 123, seed 4567" and "Set: Expert, ABCD-EFGH-JKLM".
 * @param {(key: string, args?: Record<string, unknown>) => string} t
 * @param {{ level: string, score: number, saturated?: boolean } | null} rating Level name already in the reader's language.
 * @param {string | null | undefined} seed Seed of the puzzle.
 * @param {{ level: string | null, seed: string } | null} set Level name and seed of the piece set.
 * @returns {PrintLine[]}
 */
export function puzzleDetails(t, rating, seed, set) {
  /**
   * @param {string} key
   * @param {Record<string, unknown>} args
   * @param {string} bold The text that replaces `{level}`, in bold.
   * @returns {PrintLine}
   */
  const rich = (key, args, bold) => {
    const [before, after = ''] = t(key, { ...args, level: BOLD_MARK }).split(BOLD_MARK);
    return [{ text: before }, { text: bold, bold: true }, { text: after }].filter((part) => part.text !== '');
  };
  /** @type {PrintLine[]} */
  const lines = [];
  const hasSeed = seed !== undefined && seed !== null && seed !== '';
  if (rating !== null) {
    const score = `${Number.isFinite(rating.score) ? Math.round(rating.score) : 0}${rating.saturated === true ? '+' : ''}`;
    lines.push(rich(hasSeed ? 'print.sheet.rating' : 'print.sheet.ratingOnly', { score, seed }, rating.level));
  } else if (hasSeed) {
    lines.push([{ text: t('print.sheet.seed', { seed }) }]);
  }
  if (set !== null && set.seed !== '') {
    lines.push(set.level === null ? [{ text: t('print.sheet.setSeed', { seed: set.seed }) }] : rich('print.sheet.set', { seed: set.seed }, set.level));
  }
  return lines;
}

/**
 * @typedef {object} PrintDialogOptions
 * @property {HTMLElement} host Where the dialog element lives.
 * @property {(key: string, args?: Record<string, unknown>) => string} t
 * @property {() => PrintJob | null} getJob The puzzle to print, read when the dialog opens and when Print is pressed.
 * @property {boolean} [solutionOption] Offer "Print solution" (the generator does; the player does not).
 * @property {Window & typeof globalThis} [win]
 */

let dialogCount = 0;

/** @type {PrintOptions} */
const DEFAULT_OPTIONS = Object.freeze({ pieces: true, board: true, size: 'medium', duplex: false, solution: false });

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
export function createPrintDialog({ host, t, getJob, solutionOption = false, win: windowOverride }) {
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
  const solution = solutionOption ? toggle('print-solution', 'print.solution', 'print.solution.hint') : null;
  const sizeName = `pm-print-size-${dialogCount}`;
  const sizeRadios = PRINT_SIZES.map((id) => /** @type {HTMLInputElement} */ (el('input', {
    attrs: { type: 'radio', name: sizeName, value: id }, dataset: { field: 'print-size' },
  })));
  // A4 sheets each size needs with the other choices, filled in by refresh().
  const sheetCells = PRINT_SIZES.map(() => el('td', { className: 'pm-print-sheets' }));
  const sizeRows = PRINT_SIZES.map((id, i) => el('tr', { dataset: { size: id } },
    el('th', { attrs: { scope: 'row' } }, el('label', {}, sizeRadios[i], loc(`print.size.${id}`, 'span'))),
    id === 'fit_page' ? loc('print.size.fit_page.cell', 'td') : el('td', { text: `${formatMm(CELL_MM[id])} mm` }),
    sheetCells[i]));
  for (const [i, row] of sizeRows.entries()) {
    // The whole row picks its size, not only the radio button and its name.
    row.addEventListener('click', (event) => {
      if (!(event.target instanceof Element && event.target.closest('label')) && !sizeRadios[i].checked) {
        sizeRadios[i].click();
      }
    });
  }
  const sizeField = el('fieldset', { className: 'pm-print-field' },
    loc('print.size', 'legend'),
    el('table', { className: 'pm-print-sizes' },
      el('thead', {}, el('tr', {},
        el('th', { attrs: { scope: 'col' }, text: t('print.size.name'), dataset: { i18n: 'print.size.name' } }),
        el('th', { attrs: { scope: 'col' }, text: t('print.size.cell'), dataset: { i18n: 'print.size.cell' } }),
        el('th', { attrs: { scope: 'col' }, text: t('print.size.sheets'), dataset: { i18n: 'print.size.sheets' } }))),
      el('tbody', {}, ...sizeRows)),
    loc('print.size.hint', 'small'));
  const summary = el('p', { className: 'pm-print-summary', attrs: { role: 'status' }, dataset: { role: 'print-summary' } });
  const cancel = /** @type {HTMLButtonElement} */ (el('button', { className: 'pm-btn', attrs: { type: 'button' }, dataset: { action: 'print-cancel', i18n: 'print.cancel' }, text: t('print.cancel') }));
  const confirm = /** @type {HTMLButtonElement} */ (el('button', { className: 'pm-btn primary', attrs: { type: 'button' }, dataset: { action: 'print-confirm', i18n: 'print.confirm' }, text: t('print.confirm') }));
  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', { className: 'pm-print-dialog', attrs: { 'aria-labelledby': headingId } },
    el('h2', { className: 'pm-print-title', attrs: { id: headingId }, dataset: { i18n: 'print.title' }, text: t('print.title') }),
    loc('print.intro', 'p'),
    el('div', { className: 'pm-print-options' }, pieces.label, board.label, duplex.label, ...(solution === null ? [] : [solution.label]), sizeField),
    summary,
    el('div', { className: 'pm-print-actions' }, cancel, confirm)));
  host.append(dialog);

  /** @returns {PrintOptions} */
  function read() {
    const chosen = /** @type {import('./print-layout.js').PrintSize} */ (sizeRadios.find((radio) => radio.checked)?.value);
    return {
      pieces: pieces.input.checked, board: board.input.checked, size: PRINT_SIZES.includes(chosen) ? chosen : 'medium', duplex: duplex.input.checked,
      solution: solution !== null && solution.input.checked && !solution.input.disabled,
    };
  }

  function write() {
    pieces.input.checked = options.pieces;
    board.input.checked = options.board;
    duplex.input.checked = options.duplex;
    if (solution !== null) {
      solution.input.checked = options.solution === true;
    }
    for (const radio of sizeRadios) {
      radio.checked = radio.value === options.size;
    }
  }

  /** Shows the paper the choices need. */
  function refresh() {
    const job = getJob();
    if (solution !== null) {
      // A puzzle without a stored solution cannot print one; the choice comes back with the next puzzle that has one.
      const none = (job?.solution ?? []).length === 0;
      solution.input.disabled = none;
      solution.label.title = none ? t('print.solution.none') : '';
    }
    options = { ...read(), solution: solution !== null && solution.input.checked };
    confirm.disabled = job === null;
    if (job === null) {
      summary.textContent = '';
      for (const cell of sheetCells) {
        cell.textContent = '';
      }
      return;
    }
    for (const [i, id] of PRINT_SIZES.entries()) {
      sheetCells[i].textContent = String(planPrint(job, { ...read(), size: id }).paper);
    }
    const plan = planPrint(job, read());
    // The table says how much paper each size needs; this line only explains the board.
    const notes = [];
    if (plan.boardParts > 1) {
      notes.push(t('print.summary.parts', { count: plan.boardParts }));
    }
    if (plan.turned) {
      notes.push(t('print.summary.turned'));
    }
    summary.textContent = notes.join(' ');
    if (plan.reduced) {
      summary.append(el('span', { className: 'pm-print-warning', text: t('print.summary.reduced') }));
    }
  }

  function run() {
    const job = getJob();
    if (job === null) {
      return;
    }
    options = { ...read(), solution: solution !== null && solution.input.checked };
    const plan = planPrint(job, read());
    const pages = buildPrintPages(plan, { title: job.title, details: job.details }, t);
    dialog.close();
    printPages(doc, win, pages);
  }

  for (const input of [pieces.input, board.input, duplex.input, ...(solution === null ? [] : [solution.input]), ...sizeRadios]) {
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
