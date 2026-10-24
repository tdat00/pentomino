// @ts-check
// Import screen: file chooser, paste box, sample and the Recent library. Every
// string is set through `textContent`; actions are reported to handlers and
// never decide anything about packs themselves.

import { el } from '../../core/browser/dom.js';
import { getLocale } from '../i18n.js';
import { LABELS } from '../strings.js';
import { loc, locAttrs } from './i18n-dom.js';

/** @typedef {import('../state.js').PlayerState} PlayerState */

/**
 * @typedef {object} ImportHandlers
 * @property {(file: File) => void} onFile
 * @property {(text: string) => void} onText
 * @property {() => void} onSample
 * @property {(packId: string) => void} onOpen
 * @property {(packId: string) => void} onExport
 * @property {(packId: string) => void} onDelete
 * @property {() => void} onBack
 */

/**
 * @param {string} iso
 * @returns {string}
 */
function shortDate(iso) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toLocaleDateString(getLocale()) : '';
}

/**
 * @param {HTMLElement} host
 * @param {ImportHandlers} handlers
 */
export function createImportView(host, handlers) {
  /** @type {string | null} */
  let confirming = null;
  /** @type {PlayerState | null} */
  let last = null;
  /** @type {PlayerState['library'] | null} */
  let renderedLibrary = null;
  /** @type {string | null} */
  let renderedConfirming = null;

  const fileInput = /** @type {HTMLInputElement} */ (el('input', {
    attrs: { type: 'file', accept: '.json,application/json', hidden: '', ...locAttrs({ 'aria-label': 'ui.chooseFile' }) },
    dataset: { role: 'file-input' },
    on: {
      change: () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (file) {
          handlers.onFile(file);
        }
      },
    },
  }));
  /**
   * @param {string} key
   * @param {string} action
   * @param {() => void} run
   * @param {Record<string, string | number | boolean>} [attrs]
   * @returns {HTMLButtonElement}
   */
  const actionButton = (key, action, run, attrs = {}) => /** @type {HTMLButtonElement} */ (loc(key, {
    className: 'pm-btn', attrs: { type: 'button', ...attrs }, dataset: { action }, on: { click: () => run() },
  }, 'button'));
  const fileButton = actionButton('ui.chooseFile', 'file', () => fileInput.click());
  const sampleButton = actionButton('ui.sample', 'sample', () => handlers.onSample());
  const backButton = actionButton('ui.back', 'back', () => handlers.onBack(), { hidden: '' });
  const paste = /** @type {HTMLTextAreaElement} */ (el('textarea', {
    className: 'import-paste',
    attrs: { id: 'import-paste', rows: 4, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off' },
  }));
  const pasteButton = actionButton('ui.pasteOpen', 'paste', () => {
    const text = paste.value;
    if (text.trim() !== '') {
      handlers.onText(text);
    }
  });
  const error = el('p', { className: 'import-error', attrs: { role: 'alert', hidden: '' } });
  const busy = loc('ui.loading', { className: 'import-busy', attrs: { role: 'status', hidden: '' } }, 'p');
  const list = el('ul', { className: 'library', attrs: locAttrs({ 'aria-label': 'ui.recent' }) });
  const empty = loc('ui.recentEmpty', { className: 'library-empty' }, 'p');

  const section = el('section', { className: 'import', attrs: { 'aria-labelledby': 'import-title' } },
    loc('ui.importTitle', { attrs: { id: 'import-title' } }, 'h2'),
    loc('ui.importIntro', {}, 'p'),
    error,
    busy,
    el('div', { className: 'import-actions' }, fileButton, fileInput, sampleButton, backButton),
    loc('ui.dropHint', { className: 'drop-hint' }, 'p'),
    loc('ui.pasteLabel', { attrs: { for: 'import-paste' } }, 'label'),
    paste,
    el('div', { className: 'import-actions' }, pasteButton),
    loc('ui.recent', {}, 'h3'),
    list,
    empty,
    el('p', {}, loc('ui.generator', { attrs: { href: '../generator/' } }, 'a')));
  host.append(section);

  /** @param {PlayerState} state */
  function renderLibrary(state) {
    const rows = state.library.map((entry) => {
      const confirm = confirming === entry.packId;
      const title = el('span', { className: 'library-title', text: entry.title });
      const meta = el('span', {
        className: 'library-meta',
        text: `${LABELS.solvedCount(entry.solved, entry.puzzles)} · ${shortDate(entry.lastOpened)}`,
      });
      const open = el('button', {
        className: 'pm-btn', text: LABELS.open, attrs: { type: 'button', 'aria-label': `${LABELS.open} ${entry.title}` },
        dataset: { action: 'open', packId: entry.packId }, on: { click: () => handlers.onOpen(entry.packId) },
      });
      const exportButton = el('button', {
        className: 'pm-btn', text: LABELS.export, attrs: { type: 'button', 'aria-label': `${LABELS.export} ${entry.title}` },
        dataset: { action: 'export', packId: entry.packId }, on: { click: () => handlers.onExport(entry.packId) },
      });
      const del = el('button', {
        className: 'pm-btn', text: confirm ? LABELS.confirmDelete : LABELS.delete,
        attrs: { type: 'button', 'aria-label': `${confirm ? LABELS.confirmDelete : LABELS.delete} ${entry.title}` },
        dataset: { action: 'delete', packId: entry.packId },
        on: {
          click: () => {
            if (confirming === entry.packId) {
              confirming = null;
              handlers.onDelete(entry.packId);
            } else {
              confirming = entry.packId;
              if (last !== null) {
                render(last);
                host.querySelector(`[data-action="delete"][data-pack-id="${entry.packId}"]`)?.focus();
              }
            }
          },
        },
      });
      return el('li', { dataset: { packId: entry.packId } }, el('div', { className: 'library-text' }, title, meta), el('div', { className: 'library-buttons' }, open, exportButton, del));
    });
    list.replaceChildren(...rows);
    list.hidden = rows.length === 0;
    empty.hidden = rows.length > 0;
  }

  /** @param {PlayerState} state */
  function render(state) {
    last = state;
    if (confirming !== null && !state.library.some((entry) => entry.packId === confirming)) {
      confirming = null;
    }
    const message = state.error?.message ?? '';
    error.textContent = message;
    error.hidden = message === '';
    busy.hidden = !state.loading;
    section.setAttribute('aria-busy', String(state.loading));
    backButton.hidden = state.game === null;
    for (const button of [fileButton, sampleButton, pasteButton]) {
      /** @type {HTMLButtonElement} */ (button).disabled = state.loading;
    }
    if (state.library !== renderedLibrary || confirming !== renderedConfirming) {
      renderedLibrary = state.library;
      renderedConfirming = confirming;
      renderLibrary(state);
    }
  }

  return {
    render,
    /** Draws the library again, e.g. after a language switch. */
    refresh() {
      renderedLibrary = null;
      if (last !== null) {
        render(last);
      }
    },
    destroy() {
      section.remove();
    },
  };
}
