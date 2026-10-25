// @ts-check
// The Print dialog shared by the Generator and the Player. The pages are drawn into a hidden element of the page
// (print.css shows only it while printing), so nothing leaves the browser. Texts are marked with `data-i18n`, so the
// app's language switch refreshes them; `t` is the app's lookup.
//
// The puzzle code and the QR symbol are prepared before Print is ready: the dialog takes the job's snapshot when it
// opens, prepares its code in a worker for that snapshot and Player address, and only then enables Print. Size, piece,
// board, two-sided and solution choices lay the same prepared data out again; a change of the puzzle, its angle or its
// printed heading starts a new preparation, and a late answer of an older one is ignored.

import { el } from './dom.js';
import { CELL_MM, PRINT_SIZES, planPrint } from './print-layout.js';
import { buildPrintPages, createTextMeasure, formatMm } from './print-sheet.js';
import { createPuzzleCodeClient } from './puzzle-code-client.js';
import { isSameSnapshot, preparePuzzleShare, puzzlePlayerTarget } from './puzzle-snapshot.js';

/** @typedef {import('../engine/types.js').Board} Board */
/** @typedef {import('../engine/types.js').Piece} Piece */
/** @typedef {import('../engine/types.js').Pose} Pose */
/** @typedef {import('./print-layout.js').PrintOptions} PrintOptions */
/** @typedef {import('./puzzle-snapshot.js').PuzzleSnapshot} PuzzleSnapshot */
/** @typedef {import('./puzzle-snapshot.js').PreparedPuzzleShare} PreparedPuzzleShare */

/**
 * @typedef {object} PrintJob
 * @property {Board} board
 * @property {Piece[]} pieces Every piece of the set, the pre-placed ones included.
 * @property {Pose[]} clues Pre-placed pieces of the puzzle.
 * @property {number} rotation Angle the board is shown at (counter-clockwise degrees).
 * @property {string} title The heading of the sheet; with a snapshot, its heading.
 * @property {PrintLine[]} details Lines under the title (see `puzzleDetails`).
 * @property {Pose[] | null} [solution] Every piece placed, for the "Print solution" option.
 * @property {PuzzleSnapshot | null} [snapshot] The puzzle exactly as its code carries it. A job without one prints no
 *   code and no QR.
 */

/** @typedef {import('./print-sheet.js').PrintLine} PrintLine */

const BOLD_MARK = '\u0000';

/**
 * The lines under the title of a printed puzzle, with the level names in bold, so the puzzle and its piece set can be
 * made again: "Nightmare: score 123" and "Set: Expert, ABCD-EFGH-JKLM". The seed of the puzzle is not printed: it
 * cannot recreate the puzzle by itself.
 * @param {(key: string, args?: Record<string, unknown>) => string} t
 * @param {{ level: string, score: number, saturated?: boolean } | null} rating Level name already in the reader's language.
 * @param {{ level: string | null, seed: string } | null} set Level name and seed of the piece set.
 * @returns {PrintLine[]}
 */
export function puzzleDetails(t, rating, set) {
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
  if (rating !== null) {
    const score = `${Number.isFinite(rating.score) ? Math.round(rating.score) : 0}${rating.saturated === true ? '+' : ''}`;
    lines.push(rich('print.sheet.ratingOnly', { score }, rating.level));
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
 * @property {string | URL} [pageBase] The page's address, from which the Player address is derived (`document.baseURI`).
 * @property {() => import('./puzzle-code-client.js').PuzzleCodeClient} [createClient] Makes the client of the
 *   puzzle-code worker, on first use (default: one module worker); the dialog disposes it with itself.
 * @property {(listener: () => void) => (() => void)} [watch] Subscribes to changes of the app's state while the dialog
 *   is open, so that a changed puzzle starts a new preparation; returns the unsubscribe function.
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
export function createPrintDialog({
  host, t, getJob, solutionOption = false, win: windowOverride, pageBase, createClient = createPuzzleCodeClient, watch,
}) {
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

  // The puzzle code and its QR: what is being prepared, where the QR leads, and what had to be left out.
  const codeStatus = el('p', { className: 'pm-print-code-status', dataset: { role: 'print-code-status' } });
  const codeTarget = el('p', { className: 'pm-print-code-target', dataset: { role: 'print-target' } });
  const codeNotes = el('ul', { className: 'pm-print-code-notes', dataset: { role: 'print-notices' } });
  const retry = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', attrs: { type: 'button', hidden: '' }, dataset: { action: 'print-retry', i18n: 'print.code.retry' }, text: t('print.code.retry'),
  }));
  const useThisPage = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox' }, dataset: { field: 'print-use-this-page' } }));
  // Offered on a local page only (see `puzzlePlayerTarget`); the choice lives in the open dialog and is not stored.
  const useThisPageLabel = el('label', { className: 'pm-print-toggle pm-print-local', attrs: { hidden: '' } }, useThisPage, loc('print.code.useThisPage', 'span'));
  const codeBox = el('div', { className: 'pm-print-code-box', attrs: { hidden: '' }, dataset: { role: 'print-code', state: 'idle' } },
    el('div', { attrs: { role: 'status' } }, codeStatus, codeTarget, codeNotes), retry, useThisPageLabel);
  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', { className: 'pm-print-dialog', attrs: { 'aria-labelledby': headingId } },
    el('h2', { className: 'pm-print-title', attrs: { id: headingId }, dataset: { i18n: 'print.title' }, text: t('print.title') }),
    loc('print.intro', 'p'),
    el('div', { className: 'pm-print-options' }, pieces.label, board.label, duplex.label, ...(solution === null ? [] : [solution.label]), sizeField),
    codeBox,
    summary,
    el('div', { className: 'pm-print-actions' }, cancel, confirm)));
  host.append(dialog);

  /**
   * One preparation of the code: for this snapshot and Player address, in one of three states.
   * @typedef {object} Session
   * @property {PuzzleSnapshot | null} snapshot Null for a job that asks for no code.
   * @property {ReturnType<typeof puzzlePlayerTarget>} info
   * @property {'preparing' | 'ready' | 'error'} state
   * @property {PreparedPuzzleShare | null} share
   */
  /** @type {Session | null} */
  let session = null;
  /** True from open() until the dialog is closed: only then is a preparation kept up to date. */
  let active = false;
  /** @type {(() => void) | null} */
  let unwatch = null;
  /** @type {import('./puzzle-code-client.js').PuzzleCodeClient | null} */
  let client = null;
  /** @type {import('./print-layout.js').TextMeasure | null} */
  let measure = null;

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

  /**
   * @returns {ReturnType<typeof puzzlePlayerTarget>} Where the QR leads: the page's own Player on the public web, the
   *   public Player from a local page unless the developer override is checked.
   */
  function targetInfo() {
    try {
      return puzzlePlayerTarget(pageBase ?? doc.baseURI, { useThisPage: useThisPage.checked });
    } catch {
      return puzzlePlayerTarget('https://localhost/');
    }
  }

  /**
   * @param {HTMLElement} node
   * @param {string} key
   * @param {Record<string, unknown>} [args]
   */
  function setText(node, key, args) {
    node.dataset.i18n = key;
    if (args === undefined) {
      delete node.dataset.i18nArgs;
    } else {
      node.dataset.i18nArgs = JSON.stringify(args);
    }
    node.textContent = t(key, args);
  }

  /** @param {HTMLElement} node */
  function clearText(node) {
    delete node.dataset.i18n;
    delete node.dataset.i18nArgs;
    node.textContent = '';
  }

  /** Cancels the preparation that is running and forgets the session. */
  function drop() {
    if (session?.state === 'preparing') {
      client?.cancel();
    }
    session = null;
  }

  /**
   * Starts the preparation of a job's snapshot for the current target. An older preparation that is still running
   * finds itself replaced and its answer is ignored.
   * @param {PrintJob} job
   */
  function begin(job) {
    drop();
    const snapshot = job.snapshot ?? null;
    const info = targetInfo();
    if (snapshot === null) {
      session = { snapshot: null, info, state: 'ready', share: null };
      return;
    }
    /** @type {Session} */
    const mine = { snapshot, info, state: 'preparing', share: null };
    session = mine;
    /** @param {Session['state']} state @param {PreparedPuzzleShare | null} share */
    const settle = (state, share) => {
      if (session !== mine) {
        return;
      }
      mine.state = state;
      mine.share = share;
      update();
    };
    try {
      client ??= createClient();
      preparePuzzleShare(snapshot, { target: info.target, client, targetNotice: info.notice }).then(
        (share) => settle('ready', share),
        () => settle('error', null));
    } catch {
      mine.state = 'error';
    }
  }

  /**
   * @param {PrintJob} job
   * @returns {boolean} Whether the session is the preparation of this very job.
   */
  function current(job) {
    return session !== null && (job.snapshot == null ? session.snapshot === null : isSameSnapshot(session.snapshot, job.snapshot));
  }

  /**
   * @param {PrintJob} job
   * @returns {boolean} Whether Print may run for this job: its code is prepared, or it asks for none.
   */
  function ready(job) {
    return current(job) && session?.state === 'ready';
  }

  /**
   * @param {PrintJob} job
   * @param {PreparedPuzzleShare | null | undefined} share
   * @returns {import('./print-layout.js').PrintJobInput}
   */
  function planned(job, share) {
    measure ??= createTextMeasure(doc);
    return { ...job, title: job.snapshot?.heading ?? job.title, share, measure };
  }

  /** Shows what the code needs, in the dialog's own words. */
  function renderCode() {
    const mine = session;
    const state = mine === null || mine.snapshot === null ? 'idle' : mine.state;
    codeBox.dataset.state = state;
    codeBox.hidden = state === 'idle';
    retry.hidden = state !== 'error';
    useThisPageLabel.hidden = mine === null || !mine.info.local || state === 'idle';
    if (state === 'preparing') {
      setText(codeStatus, 'print.code.preparing');
    } else if (state === 'error') {
      setText(codeStatus, 'print.code.error');
    } else {
      clearText(codeStatus);
    }
    const share = state === 'ready' ? mine?.share ?? null : null;
    if (share?.qr) {
      setText(codeTarget, 'print.code.target', { url: mine?.info.target });
    } else {
      clearText(codeTarget);
    }
    // The target's own notices are known at once; the ladder's come with the prepared code.
    const notices = share !== null ? share.notices : mine?.info.notice ? [mine.info.notice] : [];
    codeNotes.replaceChildren(...(state === 'idle' || state === 'error' ? [] : notices).map((notice) => {
      const item = el('li', { dataset: { notice } });
      setText(item, `print.code.${notice}`);
      return item;
    }));
  }

  /**
   * Writes the whole dialog again for the current job: the preparation (restarted when the job's snapshot is no longer
   * the prepared one), the code section, the paper each size needs and the notes on the board.
   */
  function update() {
    const job = getJob();
    if (solution !== null) {
      // A puzzle without a stored solution cannot print one; the choice comes back with the next puzzle that has one.
      const none = (job?.solution ?? []).length === 0;
      solution.input.disabled = none;
      solution.label.title = none ? t('print.solution.none') : '';
    }
    options = { ...read(), solution: solution !== null && solution.input.checked };
    if (active) {
      if (job === null) {
        drop();
      } else if (!current(job)) {
        begin(job);
      }
    }
    renderCode();
    confirm.disabled = job === null || !ready(job);
    if (job === null) {
      summary.textContent = '';
      for (const cell of sheetCells) {
        cell.textContent = '';
      }
      return;
    }
    const share = ready(job) ? session?.share : undefined;
    const waiting = job.snapshot != null && !ready(job);
    for (const [i, id] of PRINT_SIZES.entries()) {
      // The paper depends on the code only through its continuation sheets, which are known once it is prepared.
      sheetCells[i].textContent = waiting ? '…' : String(planPrint(planned(job, share), { ...read(), size: id }).paper);
    }
    const plan = planPrint(planned(job, share), read());
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

  /** Ends the open dialog's work: the preparation is cancelled and the choices that live only while it is open reset. */
  function teardown() {
    if (!active) {
      return;
    }
    active = false;
    unwatch?.();
    unwatch = null;
    drop();
    useThisPage.checked = false;
  }

  function run() {
    const job = getJob();
    if (job === null) {
      return;
    }
    if (!ready(job)) {
      // The puzzle changed since the code was prepared: prepare it again; printing needs a new press when it is ready.
      update();
      return;
    }
    options = { ...read(), solution: solution !== null && solution.input.checked };
    const plan = planPrint(planned(job, session?.share), read());
    const pages = buildPrintPages(plan, { title: job.snapshot?.heading ?? job.title, details: job.details }, t);
    teardown();
    dialog.close();
    printPages(doc, win, pages);
  }

  for (const input of [pieces.input, board.input, duplex.input, ...(solution === null ? [] : [solution.input]), ...sizeRadios]) {
    input.addEventListener('change', update);
  }
  // Another Player address: the same snapshot is prepared again for it.
  useThisPage.addEventListener('change', () => {
    const job = getJob();
    if (job !== null) {
      begin(job);
    }
    update();
  });
  retry.addEventListener('click', () => {
    const job = getJob();
    if (job !== null) {
      begin(job);
    }
    update();
  });
  cancel.addEventListener('click', () => {
    teardown();
    dialog.close();
  });
  confirm.addEventListener('click', run);
  // Hands the focus back to the button that opened the dialog.
  /** @type {Element | null} */
  let opener = null;
  dialog.addEventListener('close', () => {
    // A close event queued by an earlier closing can arrive after the dialog was opened again.
    if (dialog.open) {
      return;
    }
    teardown();
    if (opener instanceof HTMLElement && opener.isConnected) {
      opener.focus();
    }
    opener = null;
  });
  /** A change of the app's state: a changed puzzle, angle or heading needs a new preparation. */
  const onSourceChange = () => {
    if (!active) {
      return;
    }
    const job = getJob();
    if (job === null || !current(job)) {
      update();
    }
  };

  return {
    dialog,
    open() {
      if (dialog.open) {
        return;
      }
      opener = doc.activeElement;
      write();
      useThisPage.checked = false;
      session = null;
      active = true;
      unwatch = watch?.(onSourceChange) ?? null;
      update();
      dialog.showModal();
      if (!confirm.disabled) {
        confirm.focus();
      }
    },
    close() {
      teardown();
      if (dialog.open) {
        dialog.close();
      }
    },
    isOpen: () => dialog.open,
    /** Writes the dialog again while it is open, for example after a language switch (a changed heading starts a new preparation). */
    refresh() {
      if (active) {
        update();
      }
    },
    /** What the dialog has prepared, for the page's own checks: the state and the prepared share. */
    prepared: () => (session === null ? null : { state: session.state, share: session.share, target: session.info.target, snapshot: session.snapshot }),
    destroy() {
      teardown();
      client?.dispose();
      client = null;
      dialog.remove();
    },
  };
}
