// @ts-check
// The Player's Share dialog: the Player address of the selected puzzle, or of every puzzle of the list, in a read-only
// field to copy, with the QR code of that very address beside it. Nothing is encoded here: the snapshots, the Player
// target and the preparation (codes, capacity ladder, address, QR symbol) are the shared ones of `puzzle-snapshot.js`,
// and the codes are made by a worker. `createShareController` is the DOM-free part: the state, the guards that keep an
// answer for an older selection from being shown or copied, and the clipboard. `createShareDialog` draws it.

import { WARN_URL_CHARS } from '../engine/sharecode.js';
import { copyText, el } from './dom.js';
import { createPuzzleCodeClient } from './puzzle-code-client.js';
import { PUBLIC_PLAYER_URL, preparePuzzleListShare, preparePuzzleShare, puzzlePlayerTarget } from './puzzle-snapshot.js';
import { qrRowRunPath } from './qr.js';
import { svgEl } from './svg-board.js';
import { isAbortError } from './worker-pool.js';

/** @typedef {import('./puzzle-snapshot.js').PuzzleSnapshot} PuzzleSnapshot */
/** @typedef {import('./puzzle-snapshot.js').ShareNotice} ShareNotice */
/** @typedef {import('./qr.js').PuzzleQrMatrix} PuzzleQrMatrix */
/** @typedef {import('./puzzle-code-client.js').PuzzleCodeClient} PuzzleCodeClient */

/**
 * What can be shared right now.
 * @typedef {object} ShareSource
 * @property {readonly PuzzleSnapshot[]} snapshots Every puzzle of the list, in list order.
 * @property {number} index The selected puzzle.
 */

/**
 * @typedef {object} PreparedLink
 * @property {string | null} url Null: too large to share as a link.
 * @property {PuzzleQrMatrix | null} qr Null: no QR symbol holds the link.
 * @property {readonly ShareNotice[]} notices
 */

/**
 * The link of the selected puzzle, or of every puzzle of the list, for the page's own Player.
 * @param {ShareSource} source
 * @param {boolean} all
 * @param {{ target: string, client: import('./puzzle-snapshot.js').PuzzleCodeClientLike }} options
 * @returns {Promise<PreparedLink>}
 */
export async function prepareShareLink(source, all, options) {
  if (all) {
    const prepared = await preparePuzzleListShare(source.snapshots, { ...options, index: source.index });
    return { url: prepared.url, qr: prepared.qr, notices: prepared.notices };
  }
  const prepared = await preparePuzzleShare(source.snapshots[source.index], options);
  return { url: prepared.url, qr: prepared.qr, notices: prepared.notices };
}

/**
 * @typedef {object} ShareState
 * @property {'closed' | 'preparing' | 'ready' | 'error'} status
 * @property {boolean} all Whether the link covers every puzzle of the list.
 * @property {boolean} canAll Whether the list has more than one puzzle (the option is offered only then).
 * @property {string | null} url The link, while `ready`; null when it is too large or not made yet.
 * @property {PuzzleQrMatrix | null} qr
 * @property {readonly ShareNotice[]} notices
 * @property {'copied' | 'failed' | null} copy The last copy, until the link changes.
 * @property {boolean} tooLarge The link exceeds the URL budget (`ready` without a `url`).
 * @property {boolean} long The link is longer than some chat apps keep.
 * @property {string} heading The name of the selected puzzle.
 * @property {number} count How many puzzles the list has.
 */

/**
 * @typedef {object} ShareControllerOptions
 * @property {() => ShareSource | null} getSource The puzzles to share; null when there is none (nothing opens).
 * @property {(source: ShareSource, all: boolean) => Promise<PreparedLink>} prepare Normally `prepareShareLink` with the
 *   page's target and the controller's own client.
 * @property {(text: string) => Promise<boolean>} writeClipboard Resolves true only when the browser took the text.
 * @property {(state: ShareState) => void} onChange
 */

/**
 * Creates the DOM-free part of the dialog. Every preparation owns a revision, and its answer is used only while that
 * revision and the selection it was made for (the keys of the snapshots, the number to open and the `all` choice) are
 * still the current ones; the same is checked again after the clipboard write. A finished clipboard write is never undone.
 * @param {ShareControllerOptions} options
 */
export function createShareController(options) {
  const { getSource, prepare, writeClipboard, onChange } = options;
  /** @type {ShareState} */
  let state = { status: 'closed', all: false, canAll: false, url: null, qr: null, notices: [], copy: null, tooLarge: false, long: false, heading: '', count: 0 };
  let revision = 0;
  let disposed = false;
  /** Key of the selection the state is for or being prepared for. */
  let currentKey = '';
  const cache = new Map();

  /** @param {Partial<ShareState>} patch */
  function set(patch) {
    state = { ...state, ...patch };
    onChange(state);
  }

  /** @returns {ShareSource | null} */
  function source() {
    try {
      return getSource();
    } catch {
      return null;
    }
  }

  /**
   * @param {ShareSource} share
   * @param {boolean} all
   * @returns {string}
   */
  const keyOf = (share, all) => (all ? `all:${share.index}:${share.snapshots.map((snapshot) => snapshot.key).join('|')}` : `one:${share.snapshots[share.index].key}`);

  /** Prepares the link for the current choice, from the cache when it was made for this very selection. */
  async function run() {
    const share = source();
    if (share === null || share.snapshots[share.index] === undefined) {
      revision += 1;
      set({ status: 'closed' });
      return;
    }
    const canAll = share.snapshots.length > 1;
    const all = canAll && state.all;
    const key = keyOf(share, all);
    currentKey = key;
    revision += 1;
    const mine = revision;
    const cached = cache.get(key);
    const heading = share.snapshots[share.index].heading;
    const count = share.snapshots.length;
    if (cached !== undefined) {
      set({ status: 'ready', all, canAll, heading, count, url: cached.url, qr: cached.qr, notices: cached.notices, tooLarge: cached.url === null, long: (cached.url?.length ?? 0) > WARN_URL_CHARS, copy: null });
      return;
    }
    set({ status: 'preparing', all, canAll, heading, count, url: null, qr: null, notices: [], tooLarge: false, long: false, copy: null });
    try {
      const prepared = await prepare(share, all);
      const now = source();
      if (disposed || revision !== mine || state.status !== 'preparing' || now === null || now.snapshots[now.index] === undefined || keyOf(now, all) !== key) {
        return;
      }
      cache.set(key, prepared);
      set({ status: 'ready', url: prepared.url, qr: prepared.qr, notices: prepared.notices, tooLarge: prepared.url === null, long: (prepared.url?.length ?? 0) > WARN_URL_CHARS });
    } catch (error) {
      if (!disposed && revision === mine && !isAbortError(error)) {
        set({ status: 'error' });
      }
    }
  }

  return {
    /** @returns {ShareState} */
    getState: () => state,
    /** Opens with the choice reset to the selected puzzle only. */
    open() {
      if (disposed || source() === null) {
        return false;
      }
      state = { ...state, all: false };
      void run();
      return true;
    },
    close() {
      revision += 1;
      currentKey = '';
      if (state.status !== 'closed') {
        set({ status: 'closed', url: null, qr: null, copy: null });
      }
    },
    /** @param {boolean} all */
    setAll(all) {
      if (state.status === 'closed') {
        return;
      }
      state = { ...state, all };
      void run();
    },
    /** The selection may have changed (another puzzle, a removed one, a new pack, the angle): prepare again if so. */
    refresh() {
      if (state.status === 'closed') {
        return;
      }
      const share = source();
      if (share === null) {
        this.close();
        return;
      }
      const all = share.snapshots.length > 1 && state.all;
      if (share.snapshots[share.index] !== undefined && keyOf(share, all) === currentKey && state.status !== 'error') {
        return;
      }
      void run();
    },
    retry() {
      if (state.status === 'error') {
        void run();
      }
    },
    /** Copies the link; says whether the browser took it. */
    async copy() {
      const url = state.url;
      if (state.status !== 'ready' || url === null) {
        return;
      }
      const mine = revision;
      /** @type {boolean} */
      let copied;
      try {
        copied = (await writeClipboard(url)) === true;
      } catch {
        copied = false;
      }
      if (disposed || revision !== mine || state.url !== url) {
        return;
      }
      set({ copy: copied ? 'copied' : 'failed' });
    },
    dispose() {
      disposed = true;
      revision += 1;
      cache.clear();
    },
  };
}

/**
 * The icon of the control: three nodes joined by two lines, the usual sign for sharing.
 * @returns {SVGElement}
 */
export function shareIcon() {
  return svgEl('svg', { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    svgEl('circle', { cx: 18, cy: 5, r: 3 }),
    svgEl('circle', { cx: 6, cy: 12, r: 3 }),
    svgEl('circle', { cx: 18, cy: 19, r: 3 }),
    svgEl('line', { x1: 8.6, y1: 13.5, x2: 15.4, y2: 17.5 }),
    svgEl('line', { x1: 15.4, y1: 6.5, x2: 8.6, y2: 10.5 }));
}

let dialogCount = 0;

/** @returns {SVGElement} Two overlapping sheets: copy. */
function copyIcon() {
  return svgEl('svg', { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    svgEl('rect', { x: 9, y: 9, width: 12, height: 12, rx: 2.5 }),
    svgEl('path', { d: 'M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15' }));
}

/** @returns {SVGElement} A check mark. */
function checkIcon() {
  return svgEl('svg', { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    svgEl('path', { d: 'M5 12.5l4.5 4.5L19 7.5' }));
}

/** @returns {SVGElement} A cross. */
function crossIcon() {
  return svgEl('svg', { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    svgEl('path', { d: 'M6 6l12 12M18 6L6 18' }));
}

/**
 * @param {PuzzleQrMatrix} qr
 * @returns {SVGElement} The symbol with its quiet zone, black on white.
 */
function qrSvg(qr) {
  const outer = qr.outerModules;
  return svgEl('svg', {
    class: 'pm-share-qr-svg', viewBox: `0 0 ${outer} ${outer}`, role: 'img', 'data-qr-version': qr.version, 'data-qr-ec': qr.ec, 'data-qr-code': qr.code,
  },
  svgEl('rect', { x: 0, y: 0, width: outer, height: outer, fill: '#ffffff' }),
  svgEl('path', {
    transform: `translate(${qr.quietModules} ${qr.quietModules})`, d: qrRowRunPath(qr.rows), fill: '#000000', stroke: 'none', 'shape-rendering': 'crispEdges',
  }));
}

/**
 * @typedef {object} ShareDialogOptions
 * @property {HTMLElement} host A page-level element, so that a hidden screen cannot hide the dialog.
 * @property {(key: string, args?: Record<string, unknown>) => string} t The app's text lookup.
 * @property {() => ShareSource | null} getSource The puzzles to share, from the same provider as Print.
 * @property {string} closeKey The app's existing text key for "Close".
 * @property {string | URL} [pageBase] The page's address, from which the Player address is derived (`document.baseURI`).
 * @property {() => PuzzleCodeClient} [createClient] Makes the dialog's own puzzle-code client, on first use (default: one
 *   module worker). It is never the Print dialog's client: the two must not supersede each other's work.
 * @property {(text: string) => Promise<boolean>} [writeClipboard] Default: the clipboard helper of `dom.js`.
 */

/**
 * The dialog: the QR code of the link on the left; on the right the link in a read-only field, the option to cover the
 * whole list, the notices and the Copy button. Texts carry `data-i18n` where fixed, so the app's language switch
 * rewrites them; the notices are drawn again by `refresh()`.
 * @param {ShareDialogOptions} options
 */
export function createShareDialog(options) {
  const { host, t, getSource, closeKey, pageBase, createClient = createPuzzleCodeClient, writeClipboard = copyText } = options;
  const doc = host.ownerDocument;
  dialogCount += 1;
  const titleId = `pm-share-title-${dialogCount}`;
  const fieldId = `pm-share-field-${dialogCount}`;
  /** @type {PuzzleCodeClient | null} */
  let client = null;
  /** @type {Element | null} */
  let opener = null;

  /** @param {string} key @returns {HTMLElement} */
  const text = (key, tag = 'span', className = '') => el(tag, { className, dataset: { i18n: key }, text: t(key) });

  const subtitle = el('p', { className: 'pm-head-sub', dataset: { role: 'share-subtitle' } });
  const closeX = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-head-x', attrs: { type: 'button', 'aria-label': t(closeKey), title: t(closeKey) },
    dataset: { action: 'share-x', i18nAttr: `aria-label:${closeKey},title:${closeKey}` },
  }, crossIcon()));
  const head = el('header', { className: 'pm-head' },
    el('span', { className: 'pm-head-badge', attrs: { 'aria-hidden': 'true' } }, shareIcon()),
    el('div', { className: 'pm-head-titles' },
      el('h2', { className: 'pm-head-title', attrs: { id: titleId }, dataset: { i18n: 'share.title' }, text: t('share.title') }), subtitle),
    closeX);

  const qrHost = el('div', { className: 'pm-share-qr', dataset: { role: 'share-qr' } });
  const qrCaption = el('figcaption', { className: 'pm-share-qr-caption', dataset: { i18n: 'share.qr.caption' }, text: t('share.qr.caption') });
  const qrCard = el('figure', { className: 'pm-share-qr-card' }, qrHost, qrCaption);
  const field = /** @type {HTMLTextAreaElement} */ (el('textarea', {
    className: 'pm-share-field',
    attrs: { id: fieldId, readonly: '', rows: 4, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', wrap: 'soft' },
    dataset: { field: 'share-url' },
  }));
  const label = el('label', { className: 'pm-share-label', attrs: { for: fieldId }, dataset: { i18n: 'share.link' }, text: t('share.link') });
  const allBox = /** @type {HTMLInputElement} */ (el('input', { className: 'pm-share-switch', attrs: { type: 'checkbox', role: 'switch' }, dataset: { field: 'share-all' } }));
  const allTitle = text('share.all', 'span', 'pm-share-option-title');
  const allHint = el('span', { className: 'pm-share-option-hint', dataset: { role: 'share-all-hint' } });
  const allRow = el('label', { className: 'pm-share-option' }, allBox, el('span', { className: 'pm-share-option-text' }, allTitle, allHint));
  const notes = el('div', { className: 'pm-share-notes', attrs: { role: 'status' }, dataset: { role: 'share-notes' } });
  const copyLabel = el('span', { className: 'pm-share-copy-label', dataset: { i18n: 'share.copy' }, text: t('share.copy') });
  const copyButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn primary pm-share-copy', attrs: { type: 'button' }, dataset: { action: 'share-copy' },
  }, copyIcon(), copyLabel));
  const retryButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', attrs: { type: 'button', hidden: '' }, dataset: { action: 'share-retry', i18n: 'share.retry' }, text: t('share.retry'),
  }));
  const closeButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', attrs: { type: 'button' }, dataset: { action: 'share-close', i18n: closeKey }, text: t(closeKey),
  }));
  const body = el('div', { className: 'pm-share-body', dataset: { role: 'share-body', state: 'closed' } },
    qrCard, el('div', { className: 'pm-share-main' }, label, field, allRow, notes));
  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', {
    className: 'pm-share-dialog pm-pop', attrs: { 'aria-labelledby': titleId }, dataset: { role: 'share-dialog' },
  }, head, body, el('div', { className: 'pm-share-actions' }, retryButton, closeButton, copyButton)));
  host.append(dialog);

  /** @returns {string} */
  const target = () => {
    try {
      return puzzlePlayerTarget(pageBase ?? doc.baseURI);
    } catch {
      return PUBLIC_PLAYER_URL;
    }
  };

  const controller = createShareController({
    getSource,
    prepare: (source, all) => {
      client ??= createClient();
      return prepareShareLink(source, all, { target: target(), client });
    },
    writeClipboard,
    onChange: (state) => draw(state),
  });

  /** @param {ShareState} state */
  function draw(state) {
    body.dataset.state = state.status;
    dialog.dataset.scope = state.all ? 'all' : 'one';
    subtitle.textContent = state.all ? t('share.subtitle.all', { count: state.count }) : state.heading;
    allRow.hidden = !state.canAll;
    allBox.checked = state.all;
    allHint.textContent = state.canAll ? t('share.all.hint', { count: state.count }) : '';
    field.value = state.url ?? '';
    field.placeholder = state.status === 'preparing' ? t('share.preparing') : '';
    const copied = state.copy === 'copied';
    copyButton.disabled = state.status !== 'ready' || state.url === null;
    copyButton.dataset.copied = String(copied);
    copyButton.replaceChildren(copied ? checkIcon() : copyIcon(), copyLabel);
    copyLabel.dataset.i18n = copied ? 'share.copied' : 'share.copy';
    copyLabel.textContent = t(copied ? 'share.copied' : 'share.copy');
    retryButton.hidden = state.status !== 'error';
    qrHost.replaceChildren();
    qrCaption.hidden = state.qr === null;
    if (state.qr !== null) {
      const svg = qrSvg(state.qr);
      svg.setAttribute('aria-label', t('share.qr'));
      qrHost.append(svg);
    } else if (state.status === 'preparing') {
      qrHost.append(el('span', { className: 'pm-share-skeleton', attrs: { role: 'status', 'aria-label': t('share.preparing') } }));
    } else if (state.status === 'ready') {
      qrHost.append(el('p', { className: 'pm-share-qr-empty', text: t('share.noQr.short') }));
    }
    drawNotes(state);
  }

  /** @param {ShareState} state */
  function drawNotes(state) {
    /** @type {{ key: string, kind: 'info' | 'warn' | 'ok', params?: Record<string, unknown> }[]} */
    const lines = [];
    if (state.status === 'error') {
      lines.push({ key: 'share.error', kind: 'warn' });
    } else if (state.status === 'ready') {
      if (state.tooLarge) {
        lines.push({ key: state.all ? 'share.tooLarge.all' : 'share.tooLarge', kind: 'warn' });
      } else {
        for (const notice of state.notices) {
          lines.push({ key: `share.notice.${notice}`, kind: 'info' });
        }
        if (state.long && state.url !== null) {
          lines.push({ key: 'share.long', kind: 'info', params: { count: state.url.length } });
        }
      }
      if (state.copy === 'failed') {
        lines.push({ key: 'code.copyFailed', kind: 'warn' });
      } else if (state.copy === 'copied') {
        lines.push({ key: 'code.copied', kind: 'ok' });
      }
    }
    notes.replaceChildren(...lines.map((line) => el('p', {
      className: `pm-share-note pm-share-note--${line.kind}`,
      text: t(line.key, line.params),
      dataset: { i18n: line.key, ...(line.params === undefined ? {} : { i18nArgs: JSON.stringify(line.params) }) },
    })));
  }

  allBox.addEventListener('change', () => controller.setAll(allBox.checked));
  closeX.addEventListener('click', () => dialog.close());
  copyButton.addEventListener('click', () => {
    void controller.copy().then(() => {
      if (controller.getState().copy === 'failed') {
        field.focus();
        field.select();
      }
    });
  });
  retryButton.addEventListener('click', () => controller.retry());
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    // A close event queued by an earlier closing can arrive after the dialog was opened again.
    if (dialog.open) {
      return;
    }
    controller.close();
    client?.cancel();
    if (opener instanceof HTMLElement && opener.isConnected) {
      opener.focus();
    }
    opener = null;
  });

  return {
    element: dialog,
    controller,
    /** @param {Element | null} [from] The control to give the focus back to (the focused element by default). */
    open(from) {
      if (!controller.open()) {
        return;
      }
      opener = from ?? doc.activeElement;
      if (!dialog.open) {
        dialog.showModal();
      }
      copyButton.focus();
    },
    close() {
      if (dialog.open) {
        dialog.close();
      }
    },
    isOpen: () => dialog.open,
    /** The puzzles may have changed under the open dialog. */
    refresh() {
      if (dialog.open) {
        controller.refresh();
      }
    },
    /** The language changed: the notices are drawn again (the fixed texts follow `data-i18n`). */
    refreshTexts() {
      draw(controller.getState());
    },
    dispose() {
      controller.dispose();
      client?.dispose();
      client = null;
      opener = null;
      if (dialog.open) {
        dialog.close();
      }
      dialog.remove();
    },
  };
}
