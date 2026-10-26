// @ts-check
// Summary of the step 1 board, shown under the step in the side panel once the wizard is past step 1: the preset and the
// size (columns×rows) on the first line, the thumbnail of the board, centered, under it.

import { el } from '../../core/browser/dom.js';
import { mountBoard } from '../../core/browser/svg-board.js';
import { getLocale, t } from '../i18n.js';
import { thumbnailCellPx } from './puzzle-panel.js';

/** @typedef {import('../state.js').GeneratorState} GeneratorState */
/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */

const PREVIEW_PX = 170;

/**
 * @param {HTMLElement} host
 * @param {{ store: GeneratorStore }} options
 */
export function mountBoardSummary(host, options) {
  const { store } = options;
  const info = el('div', { className: 'board-summary-info', dataset: { role: 'board-summary-info' } });
  const frame = el('div', { className: 'board-summary-thumb', dataset: { role: 'board-summary' } });
  host.append(el('div', { className: 'board-summary' }, info, frame));

  /** @type {ReturnType<typeof mountBoard> | null} */
  let view = null;
  /** @type {GeneratorState['board'] | null} */
  let shownBoard = null;
  let shownLocale = getLocale();
  let destroyed = false;

  /** @param {GeneratorState} state */
  function render(state) {
    if (destroyed) {
      return;
    }
    const resized = shownBoard === null || shownBoard.width !== state.board.width || shownBoard.height !== state.board.height;
    if (view === null || resized || shownLocale !== getLocale()) {
      view?.destroy();
      view = mountBoard(frame, { mode: 'thumbnail', cellPx: thumbnailCellPx(state.board, PREVIEW_PX), label: t('board.summary'), showBlocked: true });
      shownLocale = getLocale();
    }
    shownBoard = state.board;
    info.replaceChildren(el('p', { className: 'board-summary-title', text: `${t(`board.preset.${state.presetId}`)} ${state.board.width}×${state.board.height}` }));
    if (view.getState().rotation !== state.rotation) {
      view.setRotation(state.rotation);
    }
    view.render({ board: state.board, pieces: [], clues: [], placements: [], showLabels: false, showPatterns: false });
  }

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.board !== previous.board || state.rotation !== previous.rotation || state.presetId !== previous.presetId) {
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
      view?.destroy();
      view = null;
      host.replaceChildren();
    },
  };
}
