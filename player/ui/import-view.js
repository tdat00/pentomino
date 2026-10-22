// @ts-check
// Import screen: file chooser, paste box, sample and the Recent library. Every
// string is set through `textContent`; actions are reported to handlers and
// never decide anything about packs themselves.

import { el } from '../../core/browser/dom.js';
import { LABELS } from '../strings.js';

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
  return Number.isFinite(ms) ? new Date(ms).toLocaleDateString() : '';
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
    attrs: { type: 'file', accept: '.json,application/json', 'aria-label': LABELS.chooseFile, hidden: '' },
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
  const fileButton = el('button', { className: 'pm-btn', text: LABELS.chooseFile, attrs: { type: 'button' }, dataset: { action: 'file' }, on: { click: () => fileInput.click() } });
  const sampleButton = el('button', { className: 'pm-btn', text: LABELS.sample, attrs: { type: 'button' }, dataset: { action: 'sample' }, on: { click: () => handlers.onSample() } });
  const backButton = el('button', { className: 'pm-btn', text: LABELS.back, attrs: { type: 'button', hidden: '' }, dataset: { action: 'back' }, on: { click: () => handlers.onBack() } });
  const paste = /** @type {HTMLTextAreaElement} */ (el('textarea', {
    className: 'import-paste',
    attrs: { id: 'import-paste', rows: 4, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off' },
  }));
  const pasteButton = el('button', {
    className: 'pm-btn',
    text: LABELS.pasteOpen,
    attrs: { type: 'button' },
    dataset: { action: 'paste' },
    on: {
      click: () => {
        const text = paste.value;
        if (text.trim() !== '') {
          handlers.onText(text);
        }
      },
    },
  });
  const error = el('p', { className: 'import-error', attrs: { role: 'alert', hidden: '' } });
  const busy = el('p', { className: 'import-busy', text: LABELS.loading, attrs: { role: 'status', hidden: '' } });
  const list = el('ul', { className: 'library', attrs: { 'aria-label': LABELS.recent } });
  const empty = el('p', { className: 'library-empty', text: LABELS.recentEmpty });

  const section = el('section', { className: 'import', attrs: { 'aria-labelledby': 'import-title' } },
    el('h1', { text: LABELS.importTitle, attrs: { id: 'import-title' } }),
    el('p', { text: LABELS.importIntro }),
    error,
    busy,
    el('div', { className: 'import-actions' }, fileButton, fileInput, sampleButton, backButton),
    el('p', { className: 'drop-hint', text: LABELS.dropHint }),
    el('label', { text: LABELS.pasteLabel, attrs: { for: 'import-paste' } }),
    paste,
    el('div', { className: 'import-actions' }, pasteButton),
    el('h2', { text: LABELS.recent }),
    list,
    empty,
    el('p', {}, el('a', { text: LABELS.generator, attrs: { href: '../generator/' } })));
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
    destroy() {
      section.remove();
    },
  };
}
