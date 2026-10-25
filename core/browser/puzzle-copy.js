// @ts-check
// "Copy this puzzle link" of the Generator and the Player. One action copies the Player address of the selected puzzle:
// the very address that the QR code of the printout carries for the same puzzle. Nothing is encoded here: the snapshot,
// the Player target and the preparation (code, capacity ladder, address) are the shared ones of `puzzle-snapshot.js`,
// and the code itself is made by a worker. This module only owns the click: the busy state, the guards that keep an
// answer of an older click or of an older selection from being copied, the clipboard and its feedback, and the
// read-only field that shows the address when the clipboard refuses it.

import { MAX_URL_CHARS, WARN_URL_CHARS } from '../engine/sharecode.js';
import { copyText, el, showToast } from './dom.js';
import { createPuzzleCodeClient } from './puzzle-code-client.js';
import { preparePuzzleShare, puzzlePlayerTarget } from './puzzle-snapshot.js';
import { svgEl } from './svg-board.js';
import { isAbortError } from './worker-pool.js';

/** @typedef {import('./puzzle-snapshot.js').PuzzleSnapshot} PuzzleSnapshot */
/** @typedef {import('./puzzle-snapshot.js').PreparedPuzzleShare} PreparedPuzzleShare */
/** @typedef {import('./puzzle-code-client.js').PuzzleCodeClient} PuzzleCodeClient */

/**
 * @typedef {object} PuzzleCopyOptions
 * @property {() => PuzzleSnapshot | null} getSnapshot The selected puzzle, from the same provider as Print; null when
 *   there is none (the click then does nothing).
 * @property {() => { target: string, notice: null | 'localTarget' }} getTarget The Player address the link opens: the
 *   normal rule, never the Print dialog's developer override.
 * @property {(snapshot: PuzzleSnapshot, target: string, notice: null | 'localTarget') => Promise<PreparedPuzzleShare>} prepare
 *   The shared preparation (`preparePuzzleShare`).
 * @property {(text: string) => Promise<boolean>} writeClipboard Resolves true only when the browser took the text.
 * @property {(url: string) => void} showManualCopy Shows the address in a read-only field to select and copy.
 * @property {(key: string, params?: Record<string, unknown>) => void} notify Feedback, by text key.
 * @property {(busy: boolean) => void} setBusy
 */

/**
 * @typedef {object} PuzzleCopyAction
 * @property {() => Promise<void>} copy Prepares and copies the link of the selected puzzle; never rejects.
 * @property {() => void} cancel Drops the operation in flight: nothing is written and nothing is announced.
 * @property {() => void} dispose Like `cancel`, for good: later calls do nothing.
 */

/**
 * Creates the copy action. Every click owns a revision: a newer click, `cancel` and `dispose` invalidate the older
 * ones, and an answer is used only while its revision and the selected puzzle (its snapshot key) are still the ones
 * it was made for. That is checked after the preparation and again after the clipboard write, so the link of one puzzle
 * is never announced for another. A finished clipboard write is never undone.
 * @param {PuzzleCopyOptions} options
 * @returns {PuzzleCopyAction}
 */
export function createPuzzleCopyAction(options) {
  const { getSnapshot, getTarget, prepare, writeClipboard, showManualCopy, notify, setBusy } = options;
  let revision = 0;
  /** Revision of the operation that owns the busy state, 0 for none. */
  let busyFor = 0;
  let disposed = false;

  /**
   * @param {string} key
   * @param {Record<string, unknown>} [params]
   */
  const tell = (key, params) => {
    try {
      notify(key, params);
    } catch {
      // Feedback is best effort: a failing message must not undo or repeat the copy.
    }
  };

  /** @returns {PuzzleSnapshot | null} */
  const selected = () => {
    try {
      return getSnapshot();
    } catch {
      return null;
    }
  };

  /** Invalidates every operation; the busy state ends with it. */
  function stop() {
    revision += 1;
    if (busyFor !== 0) {
      busyFor = 0;
      setBusy(false);
    }
  }

  async function copy() {
    if (disposed) {
      return;
    }
    /** @type {PuzzleSnapshot | null} */
    let snapshot;
    try {
      snapshot = getSnapshot();
    } catch {
      tell('print.code.error');
      return;
    }
    if (snapshot === null) {
      return;
    }
    const captured = snapshot;
    revision += 1;
    const mine = revision;
    busyFor = mine;
    setBusy(true);
    /** @returns {boolean} Whether this click is still the latest and its puzzle is still the selected one. */
    const current = () => !disposed && revision === mine && selected()?.key === captured.key;
    try {
      const { target, notice } = getTarget();
      const prepared = await prepare(captured, target, notice);
      if (!current()) {
        return;
      }
      const url = prepared.url;
      if (url === null || url.length > MAX_URL_CHARS) {
        tell('code.copyTooLong');
        return;
      }
      /** @type {boolean} */
      let copied;
      try {
        copied = (await writeClipboard(url)) === true;
      } catch {
        copied = false;
      }
      // The write has finished (or failed) by now; an answer for a puzzle that is no longer the selected one is dropped.
      if (!current()) {
        return;
      }
      if (copied) {
        tell(prepared.qr === null ? 'code.copyNoQr' : 'code.copied');
      } else {
        try {
          showManualCopy(url);
        } catch {
          // The message below still says what happened.
        }
        tell('code.copyFailed');
      }
      if (url.length > WARN_URL_CHARS) {
        tell('code.copyLong', { count: url.length });
      }
    } catch (error) {
      if (current() && !isAbortError(error)) {
        tell('print.code.error');
      }
    } finally {
      if (busyFor === mine) {
        busyFor = 0;
        setBusy(false);
      }
    }
  }

  return {
    copy,
    cancel: stop,
    dispose() {
      if (disposed) {
        return;
      }
      stop();
      disposed = true;
    },
  };
}

let dialogCount = 0;

/**
 * @typedef {object} ManualCopyOptions
 * @property {HTMLElement} host Where the dialog lives; a page-level element, so that a hidden screen cannot hide it.
 * @property {(key: string, args?: Record<string, unknown>) => string} t
 * @property {string} closeKey The app's existing text key for "Close".
 */

/**
 * The fallback of a refused clipboard: a modal dialog with the address in a labelled read-only field, selected, and a
 * Close button. The address is only ever a text value, never markup. Escape closes it and the focus returns to the
 * control that was used. Texts carry `data-i18n`, so the app's language switch rewrites them.
 * @param {ManualCopyOptions} options
 */
export function createManualCopyDialog({ host, t, closeKey }) {
  const doc = host.ownerDocument;
  dialogCount += 1;
  const labelId = `pm-copy-label-${dialogCount}`;
  const fieldId = `pm-copy-field-${dialogCount}`;
  /** @type {{ dialog: HTMLDialogElement, field: HTMLTextAreaElement, notes: HTMLElement } | null} */
  let parts = null;
  /** @type {Element | null} */
  let opener = null;

  /**
   * The dialog is built when it is first needed, so that a page that never fails to copy has no text field.
   * @returns {NonNullable<typeof parts>}
   */
  function build() {
    if (parts !== null) {
      return parts;
    }
    const label = el('label', { className: 'pm-copy-label', attrs: { id: labelId, for: fieldId }, dataset: { i18n: 'code.copyField' }, text: t('code.copyField') });
    const field = /** @type {HTMLTextAreaElement} */ (el('textarea', {
      className: 'pm-copy-field',
      attrs: { id: fieldId, readonly: '', rows: 5, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', wrap: 'soft' },
      dataset: { field: 'copy-link-url' },
    }));
    const notes = el('div', { className: 'pm-copy-notes', attrs: { role: 'status' }, dataset: { role: 'copy-notes' } });
    const close = el('button', {
      className: 'pm-btn', attrs: { type: 'button' }, dataset: { action: 'copy-close', i18n: closeKey }, text: t(closeKey),
    });
    const dialog = /** @type {HTMLDialogElement} */ (el('dialog', {
      className: 'pm-copy-dialog', attrs: { 'aria-labelledby': labelId }, dataset: { role: 'copy-dialog' },
    }, label, field, notes, el('div', { className: 'pm-copy-actions' }, close)));
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      // A close event queued by an earlier closing can arrive after the dialog was opened again.
      if (dialog.open) {
        return;
      }
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      }
      opener = null;
    });
    host.append(dialog);
    parts = { dialog, field, notes };
    return parts;
  }

  return {
    /** @returns {HTMLDialogElement | null} Null until the first failure to copy. */
    get element() {
      return parts?.dialog ?? null;
    },
    /**
     * @param {string} url
     * @param {Element | null} [from] The control to give the focus back to (the focused element by default).
     */
    open(url, from) {
      const { dialog, field, notes } = build();
      opener = from ?? doc.activeElement;
      field.value = url;
      notes.replaceChildren();
      if (!dialog.open) {
        dialog.showModal();
      }
      field.focus();
      field.select();
    },
    /**
     * @param {string} key
     * @param {Record<string, unknown>} [params]
     */
    say(key, params) {
      parts?.notes.append(el('p', {
        text: t(key, params), dataset: { i18n: key, ...(params === undefined ? {} : { i18nArgs: JSON.stringify(params) }) },
      }));
    },
    close() {
      if (parts?.dialog.open) {
        parts.dialog.close();
      }
    },
    isOpen: () => parts?.dialog.open === true,
    dispose() {
      opener = null;
      if (parts !== null) {
        if (parts.dialog.open) {
          parts.dialog.close();
        }
        parts.dialog.remove();
        parts = null;
      }
    },
  };
}

/**
 * The icon of the control: two links of a chain.
 * @returns {SVGElement}
 */
export function copyLinkIcon() {
  return svgEl('svg', { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    svgEl('rect', { x: 2.5, y: 8.5, width: 11, height: 7, rx: 3.5 }),
    svgEl('rect', { x: 10.5, y: 8.5, width: 11, height: 7, rx: 3.5 }));
}

/**
 * @typedef {object} PuzzleCopyControlOptions
 * @property {HTMLButtonElement} button The control: it gets the click handler and `aria-busy` while a link is prepared.
 * @property {HTMLElement} host Where the manual-copy dialog lives.
 * @property {(key: string, args?: Record<string, unknown>) => string} t The app's text lookup.
 * @property {() => PuzzleSnapshot | null} getSnapshot The same snapshot provider as the app's Print job.
 * @property {string} closeKey The app's existing text key for "Close".
 * @property {string | URL} [pageBase] The page's address, from which the Player address is derived (`document.baseURI`).
 * @property {() => PuzzleCodeClient} [createClient] Makes this control's own puzzle-code client, on first use (default:
 *   one module worker). It is never the Print dialog's client: the two must not supersede each other's work.
 * @property {(text: string) => Promise<boolean>} [writeClipboard] Default: the clipboard helper of `dom.js`.
 */

/**
 * Binds the copy action to a button and to the page: the shared preparation with the normal Player target, polite
 * feedback in the page's status region (or inside the manual-copy dialog while it is open) and the manual-copy field.
 * @param {PuzzleCopyControlOptions} options
 */
export function createPuzzleCopyControl(options) {
  const { button, host, t, getSnapshot, closeKey, pageBase, createClient = createPuzzleCodeClient, writeClipboard = copyText } = options;
  const doc = host.ownerDocument;
  const dialog = createManualCopyDialog({ host, t, closeKey });
  /** @type {PuzzleCodeClient | null} */
  let client = null;
  /** Snapshot key of the puzzle whose address the open dialog shows. */
  let shownKey = '';

  /** @returns {PuzzleSnapshot | null} */
  const selected = () => {
    try {
      return getSnapshot();
    } catch {
      return null;
    }
  };

  const action = createPuzzleCopyAction({
    getSnapshot,
    getTarget() {
      let info;
      try {
        info = puzzlePlayerTarget(pageBase ?? doc.baseURI);
      } catch {
        info = puzzlePlayerTarget('https://localhost/');
      }
      return { target: info.target, notice: info.notice === 'localTarget' ? 'localTarget' : null };
    },
    prepare(snapshot, target, notice) {
      client ??= createClient();
      return preparePuzzleShare(snapshot, { target, client, targetNotice: notice });
    },
    writeClipboard,
    showManualCopy(url) {
      shownKey = selected()?.key ?? '';
      dialog.open(url, button);
    },
    notify(key, params) {
      if (dialog.isOpen()) {
        dialog.say(key, params);
      } else {
        showToast(t(key, params), { kind: key === 'code.copied' ? 'info' : 'warning' });
      }
    },
    setBusy(busy) {
      button.setAttribute('aria-busy', String(busy));
    },
  });

  const onClick = () => {
    void action.copy();
  };
  button.addEventListener('click', onClick);
  button.setAttribute('aria-busy', 'false');

  return {
    action,
    dialog,
    /** Closes the manual-copy dialog when the puzzle it shows is no longer the selected one. */
    refresh() {
      if (dialog.isOpen() && selected()?.key !== shownKey) {
        dialog.close();
      }
    },
    /** Drops the link in preparation, with its worker request. */
    cancel() {
      action.cancel();
      client?.cancel();
    },
    destroy() {
      button.removeEventListener('click', onClick);
      action.dispose();
      client?.dispose();
      client = null;
      dialog.dispose();
    },
  };
}
