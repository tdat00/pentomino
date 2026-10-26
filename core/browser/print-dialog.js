// @ts-check
// The Print dialog shared by the Generator and the Player. Pages are drawn into a hidden element that print.css shows
// only while printing, so nothing leaves the browser.
//
// Codes and QR symbols are prepared in a worker before Print is enabled. Layout choices only lay the prepared data out
// again; a change of a puzzle, its angle, its heading or the puzzles chosen prepares what is missing, and a late answer
// of an older preparation is ignored.

import { el } from './dom.js';
import { CELL_MM, PER_PAGE_CHOICES, PRINT_SIZES, planPrintMany } from './print-layout.js';
import { buildPrintPages, createTextMeasure, formatMm } from './print-sheet.js';
import { createPuzzleCodeClient } from './puzzle-code-client.js';
import { PUBLIC_PLAYER_URL, preparePuzzleShare, puzzlePlayerTarget } from './puzzle-snapshot.js';

/** @typedef {import('../engine/types.js').Board} Board */
/** @typedef {import('../engine/types.js').Piece} Piece */
/** @typedef {import('../engine/types.js').Pose} Pose */
/** @typedef {import('./print-layout.js').PrintOptions} PrintOptions */
/** @typedef {import('./print-layout.js').PerPage} PerPage */
/** @typedef {import('./puzzle-snapshot.js').PuzzleSnapshot} PuzzleSnapshot */
/** @typedef {import('./puzzle-snapshot.js').PreparedPuzzleShare} PreparedPuzzleShare */

/**
 * @typedef {object} PrintJob
 * @property {Board} board
 * @property {Piece[]} pieces Every piece of the set, the pre-placed ones included.
 * @property {Pose[]} clues Pre-placed pieces of the puzzle.
 * @property {number} rotation Angle the board is shown at (counter-clockwise degrees).
 * @property {string} title The heading printed on the puzzle's sheet: the name the puzzle has in the app's list ("Puzzle #6").
 *   The code in the snapshot carries its own heading.
 * @property {PrintLine[]} details Lines under the title (see `puzzleDetails`).
 * @property {Pose[] | null} [solution] Every piece placed, for the "Print solution" option.
 * @property {PuzzleSnapshot | null} [snapshot] The puzzle exactly as its code carries it. A job without one prints no
 *   code and no QR.
 */

/** @typedef {import('./print-sheet.js').PrintLine} PrintLine */

const BOLD_MARK = '\u0000';

/**
 * The line under the title of a printed puzzle, with the level name in bold: "Nightmare: score 123". Neither the seed
 * of the puzzle nor the set's level and seed are printed: they cannot recreate the puzzle by themselves.
 * @param {(key: string, args?: Record<string, unknown>) => string} t
 * @param {{ level: string, score: number, saturated?: boolean } | null} rating Level name already in the reader's language.
 * @returns {PrintLine[]}
 */
export function puzzleDetails(t, rating) {
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
  return lines;
}

/**
 * @typedef {object} PrintListItem A puzzle of the app's list that the dialog offers.
 * @property {string} id Stable id of the puzzle in its list.
 * @property {string} title The name the puzzle is shown with.
 * @property {string} detail Its level and score, already in the reader's language ('' when it has none).
 * @property {number} [order] Where the puzzle is printed among the chosen ones (ascending); the position in `items`
 *   when absent. The list may show the puzzles in another order, such as newest first.
 * @property {() => PrintJob | null} job The puzzle as a job; read for the chosen puzzles only.
 */

/**
 * @typedef {object} PrintList
 * @property {string | null} current Id of the puzzle on show: the one chosen when the dialog opens.
 * @property {PrintListItem[]} items The puzzles of the list, in order. They share one board and piece set.
 */

/**
 * @typedef {object} PrintDialogOptions
 * @property {HTMLElement} host Where the dialog element lives.
 * @property {(key: string, args?: Record<string, unknown>) => string} t
 * @property {() => PrintJob | null} getJob The puzzle to print, read when the dialog opens and when Print is pressed.
 *   Without `getPuzzles` it is the only puzzle.
 * @property {() => PrintList | null} [getPuzzles] The puzzles of the app's list. With more than one the dialog has a
 *   second column to choose the puzzles to print and how many go on a sheet; `getJob` is then not used.
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
const DEFAULT_OPTIONS = Object.freeze({ pieces: true, board: true, size: 'medium', duplex: false, solution: false, perPage: 1 });

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
 * @param {PrintJob} job
 * @returns {string | null} What identifies the code of the job: its snapshot's heading and content; null for no code.
 */
function shareKey(job) {
  return job.snapshot == null ? null : `${job.snapshot.heading}\u0000${job.snapshot.key}`;
}

/**
 * @param {PrintDialogOptions} options
 */
export function createPrintDialog({
  host, t, getJob, getPuzzles, solutionOption = false, win: windowOverride, pageBase, createClient = createPuzzleCodeClient, watch,
}) {
  const doc = host.ownerDocument;
  const win = windowOverride ?? /** @type {Window & typeof globalThis} */ (doc.defaultView ?? globalThis);
  dialogCount += 1;
  const headingId = `pm-print-title-${dialogCount}`;
  /** @type {PrintOptions} */
  let options = { ...DEFAULT_OPTIONS };
  /** Ids of the puzzles chosen in the list (used only while the list has more than one puzzle). */
  let selected = new Set(/** @type {string[]} */ ([]));
  let multi = false;

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

  // The second column, shown for a list: the puzzles to choose from, and how many go on a sheet.
  const listEl = el('ul', { className: 'pm-print-list', dataset: { role: 'print-list' } });
  const countLine = el('span', { className: 'pm-print-count', attrs: { role: 'status' }, dataset: { role: 'print-count' } });
  const selectAll = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', attrs: { type: 'button' }, dataset: { action: 'print-select-all', i18n: 'print.puzzles.all' }, text: t('print.puzzles.all'),
  }));
  const selectNone = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', attrs: { type: 'button' }, dataset: { action: 'print-select-none', i18n: 'print.puzzles.clear' }, text: t('print.puzzles.clear'),
  }));
  const puzzlesField = el('fieldset', { className: 'pm-print-field pm-print-puzzles', dataset: { role: 'print-puzzles' } },
    loc('print.puzzles', 'legend'),
    el('div', { className: 'pm-print-list-bar' }, countLine, el('div', { className: 'pm-print-cluster' }, selectAll, selectNone)),
    listEl);
  const perPageName = `pm-print-per-page-${dialogCount}`;
  const perPageLabelId = `pm-print-per-page-label-${dialogCount}`;
  const perPageRadios = PER_PAGE_CHOICES.map((n) => /** @type {HTMLInputElement} */ (el('input', {
    attrs: { type: 'radio', name: perPageName, value: String(n) }, dataset: { field: 'print-per-page' },
  })));
  const perPageField = el('div', { className: 'pm-print-per-page', dataset: { role: 'print-per-page' } },
    el('div', { className: 'pm-print-per-page-row' },
      el('span', { className: 'pm-print-label', attrs: { id: perPageLabelId }, dataset: { i18n: 'print.perPage' }, text: t('print.perPage') }),
      el('div', { className: 'pm-print-choices', attrs: { role: 'radiogroup', 'aria-labelledby': perPageLabelId } },
        ...PER_PAGE_CHOICES.map((n, i) => el('label', { className: 'pm-print-choice' }, perPageRadios[i], loc(`print.perPage.${n}`, 'span'))))),
    loc('print.perPage.hint', 'small'));
  const side = el('div', { className: 'pm-print-side', attrs: { hidden: '' }, dataset: { role: 'print-side' } }, perPageField, puzzlesField);

  // The status of the code preparation and what had to be left out.
  const codeStatus = el('p', { className: 'pm-print-code-status', dataset: { role: 'print-code-status' } });
  const codeNotes = el('ul', { className: 'pm-print-code-notes', dataset: { role: 'print-notices' } });
  const retry = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', attrs: { type: 'button', hidden: '' }, dataset: { action: 'print-retry', i18n: 'print.code.retry' }, text: t('print.code.retry'),
  }));
  const codeBox = el('div', { className: 'pm-print-code-box', attrs: { hidden: '' }, dataset: { role: 'print-code', state: 'idle' } },
    el('div', { attrs: { role: 'status' } }, codeStatus, codeNotes), retry);
  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', { className: 'pm-print-dialog', attrs: { 'aria-labelledby': headingId } },
    el('h2', { className: 'pm-print-title', attrs: { id: headingId }, dataset: { i18n: 'print.title' }, text: t('print.title') }),
    loc('print.intro', 'p'),
    el('div', { className: 'pm-print-body' },
      el('div', { className: 'pm-print-main' },
        el('div', { className: 'pm-print-options' }, pieces.label, board.label, duplex.label, ...(solution === null ? [] : [solution.label]), sizeField),
        codeBox,
        summary),
      side),
    el('div', { className: 'pm-print-actions' }, cancel, confirm)));
  host.append(dialog);

  /** True from open() until the dialog is closed: only then is a preparation kept up to date. */
  let active = false;
  /** @type {(() => void) | null} */
  let unwatch = null;
  /** @type {import('./puzzle-code-client.js').PuzzleCodeClient | null} */
  let client = null;
  /** @type {import('./print-layout.js').TextMeasure | null} */
  let measure = null;
  /** The Player address the QR codes of this opening lead to. */
  let target = '';
  /** The prepared codes of this opening by `shareKey`: what a change of the choices never has to prepare again. */
  const shares = new Map(/** @type {[string, PreparedPuzzleShare][]} */ ([]));
  /** The preparation under way: the keys it covers. A change of the choices keeps it while it covers what is missing. */
  /** @type {{ keys: Set<string> } | null} */
  let running = null;
  /** What the last failed preparation was missing: the dialog shows the failure until **Try again** or a new choice. */
  let failedFor = '';
  let doneCount = 0;
  let totalCount = 0;
  let lastSignature = '';
  /** What the list was last drawn for. */
  let listSignature = '';

  /** @returns {PrintList} The puzzles on offer. */
  function listNow() {
    if (getPuzzles === undefined) {
      return { current: '', items: [{ id: '', title: '', detail: '', job: getJob }] };
    }
    return getPuzzles() ?? { current: null, items: [] };
  }

  /**
   * @param {PrintList} list
   * @returns {PrintJob[]} The jobs to print, in the order of their `order`.
   */
  function jobsOf(list) {
    const chosen = list.items.length > 1 ? list.items.filter((item) => selected.has(item.id)) : list.items;
    const printed = chosen.map((item, at) => ({ item, key: item.order ?? at })).sort((a, b) => a.key - b.key);
    return /** @type {PrintJob[]} */ (printed.map(({ item }) => item.job()).filter((job) => job !== null));
  }

  /** @returns {PrintOptions} */
  function read() {
    const chosen = /** @type {import('./print-layout.js').PrintSize} */ (sizeRadios.find((radio) => radio.checked)?.value);
    const perPage = Number(perPageRadios.find((radio) => radio.checked)?.value);
    return {
      pieces: pieces.input.checked, board: board.input.checked, size: PRINT_SIZES.includes(chosen) ? chosen : 'medium', duplex: duplex.input.checked,
      solution: solution !== null && solution.input.checked && !solution.input.disabled,
      perPage: multi && PER_PAGE_CHOICES.includes(/** @type {PerPage} */ (perPage)) ? /** @type {PerPage} */ (perPage) : 1,
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
    for (const radio of perPageRadios) {
      radio.checked = Number(radio.value) === (options.perPage ?? 1);
    }
  }

  /** @returns {string} Where the QR leads: the Player of the page the dialog is opened on. */
  function playerTarget() {
    try {
      return puzzlePlayerTarget(pageBase ?? doc.baseURI);
    } catch {
      return PUBLIC_PLAYER_URL;
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

  /** Cancels the preparation that is running. */
  function drop() {
    if (running !== null) {
      client?.cancel();
    }
    running = null;
  }

  /**
   * @param {PrintJob[]} jobs
   * @returns {{ key: string, snapshot: PuzzleSnapshot }[]} The codes the jobs still need, each once.
   */
  function missingOf(jobs) {
    /** @type {Map<string, PuzzleSnapshot>} */
    const missing = new Map();
    for (const job of jobs) {
      const key = shareKey(job);
      if (key !== null && !shares.has(key) && !missing.has(key)) {
        missing.set(key, /** @type {PuzzleSnapshot} */ (job.snapshot));
      }
    }
    return [...missing].map(([key, snapshot]) => ({ key, snapshot }));
  }

  /**
   * Starts preparing what the jobs need and is not prepared, unless that is under way or has just failed. An older
   * preparation that no longer covers it is cancelled and its answer ignored.
   * @param {PrintJob[]} jobs
   */
  function ensure(jobs) {
    const missing = missingOf(jobs);
    if (missing.length === 0) {
      drop();
      failedFor = '';
      return;
    }
    const signature = missing.map((item) => item.key).join('\n');
    if (failedFor === signature || (running !== null && missing.every((item) => /** @type {{ keys: Set<string> }} */ (running).keys.has(item.key)))) {
      return;
    }
    drop();
    failedFor = '';
    /** @type {{ keys: Set<string> }} */
    const mine = { keys: new Set(missing.map((item) => item.key)) };
    running = mine;
    totalCount = missing.length;
    doneCount = 0;
    const fail = () => {
      if (running === mine) {
        running = null;
        failedFor = signature;
        update();
      }
    };
    try {
      client ??= createClient();
    } catch {
      fail();
      return;
    }
    const worker = client;
    (async () => {
      for (const { key, snapshot } of missing) {
        let share;
        try {
          share = await preparePuzzleShare(snapshot, { target, client: worker });
        } catch {
          fail();
          return;
        }
        if (running !== mine) {
          return;
        }
        shares.set(key, share);
        doneCount += 1;
        if (doneCount < totalCount) {
          renderCode(jobsOf(listNow()));
        }
      }
      if (running === mine) {
        running = null;
        update();
      }
    })();
  }

  /**
   * @param {PrintJob[]} jobs
   * @returns {boolean} Whether Print may run for these jobs: their codes are prepared, or they ask for none.
   */
  function ready(jobs) {
    return jobs.every((job) => {
      const key = shareKey(job);
      return key === null || shares.has(key);
    });
  }

  /**
   * @param {PrintJob} job
   * @returns {PreparedPuzzleShare | null | undefined} The prepared code; null for a job with no code, undefined while it is not prepared.
   */
  function shareOf(job) {
    const key = shareKey(job);
    return key === null ? null : shares.get(key);
  }

  /**
   * @param {PrintJob[]} jobs
   * @returns {'idle' | 'preparing' | 'ready' | 'error'}
   */
  function stateOf(jobs) {
    if (!jobs.some((job) => shareKey(job) !== null)) {
      return 'idle';
    }
    if (ready(jobs)) {
      return 'ready';
    }
    return failedFor !== '' && failedFor === missingOf(jobs).map((item) => item.key).join('\n') ? 'error' : 'preparing';
  }

  /**
   * @param {PrintJob[]} jobs
   * @param {PrintOptions} chosen
   * @returns {import('./print-layout.js').PrintPlan}
   */
  function plan(jobs, chosen) {
    measure ??= createTextMeasure(doc);
    const inputs = jobs.map((job) => ({ ...job, share: shareOf(job), measure: /** @type {import('./print-layout.js').TextMeasure} */ (measure) }));
    return planPrintMany(inputs, chosen);
  }

  /**
   * @param {PrintJob[]} jobs
   */
  function renderCode(jobs) {
    const state = stateOf(jobs);
    codeBox.dataset.state = state;
    codeBox.hidden = state === 'idle';
    retry.hidden = state !== 'error';
    if (state === 'preparing') {
      setText(codeStatus, 'print.code.preparing');
      if (totalCount > 1 && running !== null) {
        codeStatus.textContent = `${t('print.code.preparing')} ${Math.min(doneCount + 1, totalCount)} / ${totalCount}`;
      }
    } else if (state === 'error') {
      setText(codeStatus, 'print.code.error');
    } else {
      clearText(codeStatus);
    }
    // Not shown: the dialog says nothing of the address; it is kept for the checks that read where the QR leads.
    const first = state === 'ready' ? shareOf(jobs[0]) : null;
    if (first?.qr) {
      codeBox.dataset.target = target;
    } else {
      delete codeBox.dataset.target;
    }
    // The notices come with the prepared codes; with several puzzles each says which puzzle it is about.
    /** @type {HTMLElement[]} */
    const items = [];
    if (state === 'ready') {
      for (const job of jobs) {
        for (const notice of shareOf(job)?.notices ?? []) {
          const item = el('li', { dataset: { notice } });
          if (jobs.length > 1) {
            item.textContent = `${job.title}: ${t(`print.code.${notice}`)}`;
          } else {
            setText(item, `print.code.${notice}`);
          }
          items.push(item);
        }
      }
    }
    codeNotes.replaceChildren(...items);
  }

  /**
   * Draws the puzzle list again when it has changed; otherwise only the ticks follow the selection.
   * @param {PrintList} list
   */
  function renderList(list) {
    const signature = JSON.stringify(list.items.map((item) => [item.id, item.title, item.detail]));
    if (signature !== listSignature) {
      listSignature = signature;
      listEl.replaceChildren(...list.items.map((item) => {
        const input = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', value: item.id }, dataset: { field: 'print-puzzle' } }));
        input.addEventListener('change', () => {
          if (input.checked) {
            selected.add(item.id);
          } else {
            selected.delete(item.id);
          }
          update();
        });
        return el('li', { dataset: { puzzle: item.id } },
          el('label', { className: 'pm-print-puzzle' }, input,
            el('span', {}, el('strong', { text: item.title }), ...(item.detail === '' ? [] : [` · ${item.detail}`]))));
      }));
    }
    for (const input of /** @type {NodeListOf<HTMLInputElement>} */ (listEl.querySelectorAll('input'))) {
      input.checked = selected.has(input.value);
    }
    setText(countLine, 'print.puzzles.count', { count: list.items.filter((item) => selected.has(item.id)).length, total: list.items.length });
  }

  /** @returns {string} What a change of the app's state would have to differ in for the dialog to need drawing again. */
  function signatureOf() {
    const list = listNow();
    return JSON.stringify([list.current, list.items.map((item) => [item.id, item.title, item.detail]), jobsOf(list).map((job) => [shareKey(job), job.title, (job.solution ?? []).length])]);
  }

  /** Redraws the whole dialog for the current puzzles and starts preparing the codes still missing. */
  function update() {
    const list = listNow();
    multi = list.items.length > 1;
    selected = new Set([...selected].filter((id) => list.items.some((item) => item.id === id)));
    side.hidden = !multi;
    dialog.dataset.layout = multi ? 'two' : 'one';
    if (multi) {
      renderList(list);
    }
    const jobs = jobsOf(list);
    if (solution !== null) {
      // A puzzle without a stored solution cannot print one; the choice comes back with the next puzzle that has one.
      const none = jobs.every((job) => (job.solution ?? []).length === 0);
      solution.input.disabled = none;
      solution.label.title = none ? t(jobs.length > 1 ? 'print.solution.none.many' : 'print.solution.none') : '';
    }
    options = { ...read(), solution: solution !== null && solution.input.checked };
    if (active) {
      if (jobs.length === 0) {
        drop();
      } else {
        ensure(jobs);
      }
    }
    lastSignature = signatureOf();
    renderCode(jobs);
    confirm.disabled = jobs.length === 0 || !ready(jobs);
    if (jobs.length === 0) {
      summary.textContent = multi ? t('print.puzzles.empty') : '';
      for (const cell of sheetCells) {
        cell.textContent = '';
      }
      return;
    }
    const waiting = !ready(jobs);
    for (const [i, id] of PRINT_SIZES.entries()) {
      // The first sheet is laid out around the QR, which is known once the code is prepared.
      sheetCells[i].textContent = waiting ? '…' : String(plan(jobs, { ...read(), size: id }).paper);
    }
    const printout = plan(jobs, read());
    // The table says how much paper each size needs; this line only explains the board.
    const notes = [];
    if (printout.boardParts > 1) {
      notes.push(t('print.summary.parts', { count: printout.boardParts }));
    }
    if (printout.turned) {
      notes.push(t('print.summary.turned'));
    }
    summary.textContent = notes.join(' ');
    if (printout.reduced) {
      summary.append(el('span', { className: 'pm-print-warning', text: t('print.summary.reduced') }));
    }
  }

  /** Ends the open dialog's work: the preparation is cancelled and the prepared codes are forgotten. */
  function teardown() {
    if (!active) {
      return;
    }
    active = false;
    unwatch?.();
    unwatch = null;
    drop();
    shares.clear();
    failedFor = '';
  }

  function run() {
    const jobs = jobsOf(listNow());
    if (jobs.length === 0) {
      return;
    }
    if (!ready(jobs)) {
      // A puzzle changed since the codes were prepared: prepare them again; printing needs a new press when they are ready.
      update();
      return;
    }
    options = { ...read(), solution: solution !== null && solution.input.checked };
    const printout = plan(jobs, read());
    const pages = buildPrintPages(printout, jobs.map((job) => ({ title: job.title, details: job.details })), t);
    teardown();
    dialog.close();
    printPages(doc, win, pages);
  }

  for (const input of [pieces.input, board.input, duplex.input, ...(solution === null ? [] : [solution.input]), ...sizeRadios, ...perPageRadios]) {
    input.addEventListener('change', update);
  }
  selectAll.addEventListener('click', () => {
    selected = new Set(listNow().items.map((item) => item.id));
    update();
  });
  selectNone.addEventListener('click', () => {
    selected = new Set();
    update();
  });
  retry.addEventListener('click', () => {
    failedFor = '';
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
  /** A change of the app's state: a changed puzzle, angle or heading, or list, needs a new preparation. */
  const onSourceChange = () => {
    if (active && signatureOf() !== lastSignature) {
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
      shares.clear();
      failedFor = '';
      running = null;
      listSignature = '';
      target = playerTarget();
      const list = listNow();
      selected = new Set(list.current === null ? [] : [list.current]);
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
    /** What the dialog has prepared for its first puzzle, for the page's own checks: the state and the prepared share. */
    prepared() {
      if (!active) {
        return null;
      }
      const [job] = jobsOf(listNow());
      if (job === undefined) {
        return null;
      }
      const state = stateOf([job]);
      return { state: state === 'idle' ? 'ready' : state, share: shareOf(job) ?? null, target, snapshot: job.snapshot ?? null };
    },
    destroy() {
      teardown();
      client?.dispose();
      client = null;
      dialog.remove();
    },
  };
}
