// @ts-check
// Step 2 piece-set panel: navigator through the kept sets, summary line and piece thumbnails in balanced rows.
import { el } from '../../core/browser/dom.js';
import { mountPiecePreview } from '../../core/browser/svg-board.js';
import { t, getLocale } from '../i18n.js';
import { describeSet, isBusy, readyLevelId, setViewPosition } from '../state.js';
import { levelLabel } from '../strings.js';
import { loc, locAttrs } from './i18n-dom.js';

/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('../state.js').GeneratorState} GeneratorState */
/** @typedef {ReturnType<typeof import('../jobs.js').createJobController>} JobController */

const THUMB_CELL_PX = 12;

/**
 * @param {GeneratorState} state
 * @param {{ level?: boolean, seed?: boolean }} [include]
 * @returns {string[]}
 */
export function summaryParts(state, include = {}) {
  const set = state.set;
  if (set === null) {
    return [];
  }
  const { pieces, sizeMin, sizeMax } = describeSet(set);
  const sizes = sizeMin === sizeMax ? t('set.summary.size', { size: sizeMin }) : t('set.summary.sizes', { min: sizeMin, max: sizeMax });
  const level = state.calibrationFor === null && set.carving === 'imported' ? t('set.summary.imported') : levelLabel(readyLevelId(state));
  const parts = [t('set.summary.pieces', { count: pieces }), sizes];
  if (include.level !== false) {
    parts.unshift(level);
  }
  if (include.seed !== false && state.setSeed !== null) {
    parts.push(t('set.summary.seed', { seed: state.setSeed }));
  }
  return parts;
}

/**
 * "Hard | 13 pieces | Piece sizes 7–12 | Seed ABCD-EFGH-JKLM".
 * @param {GeneratorState} state
 * @returns {string}
 */
export function summarizeSet(state) {
  return summaryParts(state).join(' | ');
}

/**
 * Row sizes for `count` pieces when at most `maxPerRow` fit on a row: the fewest rows, with sizes that differ by at
 * most one, larger rows first (10 pieces, 4 per row → 4, 3, 3 rather than 4, 4, 2).
 * @param {number} count
 * @param {number} maxPerRow
 * @returns {number[]}
 */
export function balancedRows(count, maxPerRow) {
  if (count <= 0) {
    return [];
  }
  const rows = Math.ceil(count / Math.max(1, maxPerRow));
  const base = Math.floor(count / rows);
  const extra = count % rows;
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * @param {HTMLElement} host
 * @param {{ store: GeneratorStore, controller: JobController }} options
 */
export function mountSetPanel(host, options) {
  const { store, controller } = options;

  const emptyText = loc('set.empty', { className: 'hint', dataset: { role: 'set-empty' } }, 'p');
  const pieceList = el('ul', { className: 'piece-list', attrs: locAttrs({ 'aria-label': 'set.pieces' }), dataset: { role: 'pieces' } });
  const summary = el('p', { className: 'set-summary', dataset: { role: 'summary' } });
  const olderButton = /** @type {HTMLButtonElement} */ (el('button', { text: '◀', attrs: { type: 'button', ...locAttrs({ 'aria-label': 'set.older' }), 'data-action': 'older-set' } }));
  const newerButton = /** @type {HTMLButtonElement} */ (el('button', { text: '▶', attrs: { type: 'button', ...locAttrs({ 'aria-label': 'set.newer' }), 'data-action': 'newer-set' } }));
  const positionText = el('span', { className: 'set-position', attrs: { 'aria-live': 'polite' }, dataset: { role: 'set-position' } });
  const navigator = el('span', { className: 'set-nav' }, olderButton, positionText, newerButton);
  const removeButton = /** @type {HTMLButtonElement} */ (loc('set.remove', { attrs: { type: 'button', 'data-action': 'remove-set' } }, 'button'));
  const removeAllButton = /** @type {HTMLButtonElement} */ (loc('set.removeAll', { attrs: { type: 'button', 'data-action': 'remove-all-sets' } }, 'button'));
  const setActions = el('span', { className: 'set-actions' }, removeButton, removeAllButton);
  const history = el('div', { className: 'control-row set-history', dataset: { role: 'set-history' } }, navigator, setActions);
  host.append(el('div', { className: 'set-panel' }, history, summary, emptyText, pieceList));
  const view = host.ownerDocument.defaultView;

  /** @type {Array<ReturnType<typeof mountPiecePreview>>} */
  let previews = [];
  /** @type {object | null} */
  let shownSet = null;
  let shownLocale = getLocale();
  let destroyed = false;
  let layoutKey = '';

  function clearPreviews() {
    for (const preview of previews) {
      preview.destroy();
    }
    previews = [];
    pieceList.replaceChildren();
    layoutKey = '';
  }

  /**
   * Splits the pieces into balanced rows: invisible break items end each row, and every piece is as wide as one
   * column of the fullest row, so shorter rows are centered under it.
   */
  function layoutRows() {
    const items = [...pieceList.querySelectorAll(':scope > .piece-item')];
    const width = pieceList.clientWidth;
    if (items.length === 0 || width === 0 || view === null) {
      return;
    }
    const style = view.getComputedStyle(pieceList);
    const gap = parseFloat(style.columnGap) || 0;
    const minItem = parseFloat(style.getPropertyValue('--piece-min')) || 88;
    const rows = balancedRows(items.length, Math.floor((width + gap) / (minItem + gap)));
    const key = `${items.length}|${rows.join(',')}`;
    if (key === layoutKey) {
      return;
    }
    layoutKey = key;
    for (const old of pieceList.querySelectorAll(':scope > .piece-break')) {
      old.remove();
    }
    pieceList.style.setProperty('--piece-cols', String(rows[0]));
    let end = 0;
    for (const size of rows.slice(0, -1)) {
      end += size;
      items[end - 1].after(el('li', { className: 'piece-break', attrs: { role: 'presentation', 'aria-hidden': 'true' } }));
    }
  }
  const resizeObserver = view !== null && typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(() => layoutRows()) : null;
  resizeObserver?.observe(pieceList);

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
        layoutRows();
      }
    }
    emptyText.hidden = set !== null;
    summary.textContent = summarizeSet(state);
    for (const preview of previews) {
      preview.render({ t: 0, rotation: state.rotation, showLabels: state.prefs.labels, showPatterns: state.prefs.patterns });
    }
    const { index, total: length } = setViewPosition(state);
    // Only the sets of the current board are listed. Remove shows with any set; the navigator and Remove all only
    // once there is somewhere to go.
    history.hidden = state.set === null;
    navigator.hidden = length === 0 || (length === 1 && index === 0);
    removeAllButton.hidden = length <= 1;
    removeButton.disabled = busy;
    removeAllButton.disabled = busy;
    // Sets are numbered oldest first: the newest set is "Set {total} of {total}"; a set of another board has no number.
    positionText.textContent = t('set.position', { n: index === -1 ? '–' : length - index, total: length });
    olderButton.disabled = busy || index + 1 >= length;
    newerButton.disabled = busy || index <= 0;
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
  listen(olderButton, 'click', () => controller.stepSet(1));
  listen(newerButton, 'click', () => controller.stepSet(-1));
  listen(removeButton, 'click', () => controller.removeSet());
  listen(removeAllButton, 'click', () => {
    const length = setViewPosition(store.getState()).total;
    // Removing every set also removes their puzzles, so it asks first.
    if (view === null || view.confirm(t('set.removeAll.confirm', { count: length }))) {
      controller.removeAllSets();
    }
  });

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.set !== previous.set || state.rotation !== previous.rotation || state.job !== previous.job
      || state.setPosition !== previous.setPosition || state.setsByBoard !== previous.setsByBoard || state.board !== previous.board
      || state.prefs !== previous.prefs || state.calibrationFor !== previous.calibrationFor) {
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
      resizeObserver?.disconnect();
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
