// @ts-check
// Summary of the chosen piece set, shown under step 2 in the side panel once the wizard is past step 2
// (like the board thumbnail under step 1), on three lines:
//   Set 4/6
//   Expert | ABCD-EFGH-JKLM
//   14 pieces | Piece sizes 5–13

import { el } from '../../core/browser/dom.js';
import { getLocale, t } from '../i18n.js';
import { setNumber } from '../state.js';
import { summaryParts } from './set-panel.js';

/** @typedef {import('../state.js').GeneratorState} GeneratorState */
/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */

/**
 * "Set 4/6": the set's number in the list (oldest first, as the navigator shows it) and the list size.
 * @param {GeneratorState} state
 * @returns {string}
 */
export function setTitle(state) {
  const { n, total } = setNumber(state);
  return t('set.summary.number', { n: n ?? '–', total });
}

/**
 * "Expert | ABCD-EFGH-JKLM": the level and the seed; just the level when the set has no seed.
 * @param {GeneratorState} state
 * @returns {string}
 */
export function levelAndSeed(state) {
  const [level = ''] = summaryParts(state, { seed: false });
  return state.setSeed === null ? level : t('set.summary.levelSeed', { level, seed: state.setSeed });
}

/**
 * @param {HTMLElement} host
 * @param {{ store: GeneratorStore }} options
 */
export function mountSetSummary(host, options) {
  const { store } = options;
  const card = el('div', { className: 'set-summary-card', dataset: { role: 'set-summary-card' } });
  host.append(card);
  let shownLocale = getLocale();
  let destroyed = false;

  /** @param {GeneratorState} state */
  function render(state) {
    if (destroyed) {
      return;
    }
    shownLocale = getLocale();
    card.replaceChildren(...(state.set === null ? [] : [
      el('p', { className: 'set-summary-title', text: setTitle(state) }),
      el('p', { className: 'set-summary-level', text: levelAndSeed(state) }),
      el('p', { className: 'set-summary-detail', text: summaryParts(state, { level: false, seed: false }).join(' | ') }),
    ]));
  }

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.set !== previous.set || state.setSeed !== previous.setSeed || state.calibration !== previous.calibration
      || state.calibrationFor !== previous.calibrationFor || state.levelId !== previous.levelId
      || state.setPosition !== previous.setPosition || state.setsByBoard !== previous.setsByBoard || state.board !== previous.board
      || shownLocale !== getLocale()) {
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
      host.replaceChildren();
    },
  };
}
