// @ts-check
// Piece-set panel (design §10.4): piece thumbnails in the display rotation, the summary line, the
// generator's reference arrangement on demand, the last five sets, set export and set import.
import { el } from '../../core/browser/dom.js';
import { mountBoard, mountPiecePreview } from '../../core/browser/svg-board.js';
import { t, getLocale } from '../i18n.js';
import { describeSet, isBusy, readyLevelId, setTimelineLength } from '../state.js';
import { levelLabel } from '../strings.js';
import { loc, locAttrs } from './i18n-dom.js';
import { thumbnailCellPx } from './puzzle-panel.js';

/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('../state.js').GeneratorState} GeneratorState */
/** @typedef {ReturnType<typeof import('../jobs.js').createJobController>} JobController */

let panelCounter = 0;
const THUMB_CELL_PX = 12;
const BOARD_PREVIEW_PX = 260;

/**
 * "9 pieces · sizes 4–9 · Ready for Hard ✓"; an imported set has no calibration to claim.
 * @param {GeneratorState} state
 * @returns {string}
 */
export function summarizeSet(state) {
  const set = state.set;
  if (set === null) {
    return '';
  }
  const { pieces, sizeMin, sizeMax } = describeSet(set);
  const sizes = sizeMin === sizeMax ? t('set.summary.size', { size: sizeMin }) : t('set.summary.sizes', { min: sizeMin, max: sizeMax });
  const parts = [t('set.summary.pieces', { count: pieces }), sizes];
  if (state.calibration !== null && state.calibrationFor !== null) {
    parts.push(t('set.summary.ready', { level: levelLabel(readyLevelId(state)) }));
  } else if (set.carving === 'imported') {
    parts.push(t('set.summary.imported'));
  }
  return parts.join(' · ');
}

/**
 * @param {HTMLElement} host
 * @param {{ store: GeneratorStore, controller: JobController }} options
 */
export function mountSetPanel(host, options) {
  const { store, controller } = options;
  const uid = `set-panel-${(panelCounter += 1)}`;

  const emptyText = loc('set.empty', { className: 'hint', dataset: { role: 'set-empty' } }, 'p');
  const pieceList = el('ul', { className: 'piece-list', attrs: locAttrs({ 'aria-label': 'set.pieces' }), dataset: { role: 'pieces' } });
  const summary = el('p', { className: 'set-summary', dataset: { role: 'summary' } });
  const staleText = el('p', { className: 'notice notice-warning', dataset: { role: 'set-stale' } });
  const solutionInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'show-solution' } }));
  const solutionToggle = el('label', { className: 'pm-toggle' }, solutionInput, loc('set.showSolution'));
  const solutionNote = el('p', { className: 'hint', dataset: { role: 'solution-note' } });
  const boardHost = el('div', { className: 'set-board', attrs: { hidden: '' }, dataset: { role: 'set-board' } });
  const olderButton = /** @type {HTMLButtonElement} */ (el('button', { text: '◀', attrs: { type: 'button', ...locAttrs({ 'aria-label': 'set.older' }), 'data-action': 'older-set' } }));
  const newerButton = /** @type {HTMLButtonElement} */ (el('button', { text: '▶', attrs: { type: 'button', ...locAttrs({ 'aria-label': 'set.newer' }), 'data-action': 'newer-set' } }));
  const positionText = el('span', { className: 'set-position', attrs: { 'aria-live': 'polite' }, dataset: { role: 'set-position' } });
  const history = el('div', { className: 'control-row set-history', dataset: { role: 'set-history' } }, olderButton, positionText, newerButton);
  const exportButton = /** @type {HTMLButtonElement} */ (loc('set.export', { attrs: { type: 'button', 'data-action': 'export-set' } }, 'button'));
  const exportRow = el('div', { className: 'control-row' }, exportButton);

  const fileInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'file', accept: '.json,application/json', 'data-field': 'import-file' } }));
  const pasteInput = /** @type {HTMLTextAreaElement} */ (el('textarea', {
    attrs: { rows: 3, spellcheck: 'false', autocomplete: 'off', 'data-field': 'import-text', id: `${uid}-paste` },
  }));
  const pasteButton = /** @type {HTMLButtonElement} */ (loc('set.importText', { attrs: { type: 'button', 'data-action': 'import-text' } }, 'button'));
  const importBox = el('details', { className: 'import-set', dataset: { role: 'import' } },
    loc('set.import', {}, 'summary'),
    loc('set.importHint', { className: 'hint' }, 'p'),
    el('label', { className: 'field' }, loc('set.file'), fileInput),
    el('label', { className: 'field', attrs: { for: `${uid}-paste` } }, loc('set.paste')),
    pasteInput, pasteButton);

  host.append(el('div', { className: 'set-panel' }, emptyText, pieceList, summary, staleText, solutionToggle, solutionNote, boardHost, history, exportRow, importBox));

  /** @type {Array<ReturnType<typeof mountPiecePreview>>} */
  let previews = [];
  /** @type {ReturnType<typeof mountBoard> | null} */
  let boardView = null;
  /** @type {object | null} */
  let shownSet = null;
  let shownLocale = getLocale();
  let destroyed = false;

  function clearPreviews() {
    for (const preview of previews) {
      preview.destroy();
    }
    previews = [];
    pieceList.replaceChildren();
    boardView?.destroy();
    boardView = null;
  }

  /** @param {GeneratorState} state */
  function render(state) {
    if (destroyed) {
      return;
    }
    const set = state.set;
    const busy = isBusy(state);
    if (shownSet !== set || shownLocale !== getLocale()) {
      clearPreviews();
      shownSet = set;
      shownLocale = getLocale();
      if (set !== null) {
        const sorted = set.pieces.map((piece, index) => ({ piece, index })).sort((a, b) => a.piece.id.localeCompare(b.piece.id, 'en', { numeric: true }));
        for (const { piece, index } of sorted) {
          const thumb = el('span', { className: 'piece-thumb' });
          const item = el('li', { className: 'piece-item', dataset: { pieceId: piece.id } },
            thumb, el('span', { className: 'piece-name', text: `${piece.label === '' ? piece.id : piece.label} · ${piece.cells.length}` }));
          pieceList.append(item);
          previews.push(mountPiecePreview(thumb, piece, {
            cellPx: THUMB_CELL_PX, index, count: set.pieces.length, interactive: false,
            name: t('set.pieceName', { name: piece.label === '' ? piece.id : piece.label, count: piece.cells.length }),
          }));
        }
        boardView = mountBoard(boardHost, { mode: 'thumbnail', cellPx: thumbnailCellPx(set.board, BOARD_PREVIEW_PX), label: t('set.referenceLabel') });
      }
    }
    emptyText.hidden = set !== null;
    summary.textContent = summarizeSet(state);
    staleText.textContent = set !== null && state.stale ? t('set.stale') : '';
    staleText.hidden = staleText.textContent === '';
    const hasWitness = set !== null && set.witness !== null;
    solutionToggle.hidden = set === null;
    solutionInput.disabled = !hasWitness;
    solutionNote.textContent = set === null ? '' : hasWitness ? t('set.solutionNote') : t('set.noReference');
    const showing = hasWitness && solutionInput.checked;
    boardHost.hidden = !showing;
    if (set !== null) {
      renderViews(state, showing);
    }
    const length = setTimelineLength(state);
    history.hidden = length <= 1;
    positionText.textContent = t('set.position', { n: state.setPosition + 1, total: length });
    olderButton.disabled = busy || state.setPosition + 1 >= length;
    newerButton.disabled = busy || state.setPosition <= 0;
    exportButton.disabled = set === null;
    exportRow.hidden = set === null;
    for (const control of [fileInput, pasteInput, pasteButton]) {
      control.disabled = busy;
    }
  }

  /**
   * @param {GeneratorState} state
   * @param {boolean} showing
   */
  function renderViews(state, showing) {
    const set = /** @type {NonNullable<GeneratorState['set']>} */ (state.set);
    for (const preview of previews) {
      preview.render({ t: 0, rotation: state.rotation, showLabels: state.prefs.labels, showPatterns: state.prefs.patterns });
    }
    if (boardView !== null) {
      if (boardView.getState().rotation !== state.rotation) {
        boardView.setRotation(state.rotation);
      }
      boardView.render({
        board: set.board, pieces: set.pieces, clues: [], placements: showing && set.witness !== null ? set.witness : [],
        showLabels: state.prefs.labels, showPatterns: state.prefs.patterns,
      });
    }
  }

  /** @type {Array<[EventTarget, string, EventListener]>} */
  const listeners = [];
  /**
   * @param {EventTarget} target
   * @param {string} type
   * @param {(event: any) => void} fn
   */
  const listen = (target, type, fn) => {
    target.addEventListener(type, fn);
    listeners.push([target, type, fn]);
  };
  listen(solutionInput, 'change', () => render(store.getState()));
  listen(olderButton, 'click', () => controller.stepSet(1));
  listen(newerButton, 'click', () => controller.stepSet(-1));
  listen(exportButton, 'click', () => controller.exportSet());
  listen(fileInput, 'change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file !== undefined) {
      void controller.importFile(file);
    }
  });
  listen(pasteButton, 'click', () => {
    const text = pasteInput.value;
    if (text.trim() !== '') {
      void controller.importText(text).then((ok) => {
        if (ok) {
          pasteInput.value = '';
        }
      });
    }
  });

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.set !== previous.set || state.rotation !== previous.rotation || state.job !== previous.job || state.stale !== previous.stale
      || state.setPosition !== previous.setPosition || state.setHistory !== previous.setHistory || state.prefs !== previous.prefs
      || state.calibration !== previous.calibration) {
      render(state);
    }
  });
  render(store.getState());

  return {
    refresh: () => render(store.getState()),
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      unsubscribe();
      for (const [target, type, fn] of listeners) {
        target.removeEventListener(type, fn);
      }
      listeners.length = 0;
      clearPreviews();
      host.replaceChildren();
    },
  };
}
