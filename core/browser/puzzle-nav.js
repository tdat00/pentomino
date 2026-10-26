// @ts-check
// Previous / next navigator of a list of puzzles, for the narrow layouts of both apps (the wide ones list cards). One
// puzzle shows at a time; the arrows step through the list and Remove and Remove all sit on a row of their own. The app
// owns the list and the selection: this only draws the position and reports the presses. Its texts carry `data-i18n`,
// so a language switch rewrites them. The keys are `puzzles.older`, `puzzles.newer`, `puzzles.position` ({n}, {total}),
// `puzzles.remove` and `puzzles.removeAll`.

import { el } from './dom.js';

/**
 * @typedef {object} PuzzleNavOptions
 * @property {(key: string, args?: Record<string, unknown>) => string} t The app's text lookup.
 * @property {() => void} onOlder
 * @property {() => void} onNewer
 * @property {() => void} onRemove Removes the puzzle that is shown.
 * @property {() => void} onRemoveAll
 */

/**
 * @param {PuzzleNavOptions} options
 */
export function createPuzzleNav({ t, onOlder, onNewer, onRemove, onRemoveAll }) {
  /**
   * @param {string} text
   * @param {string} key
   * @param {string} action
   * @param {() => void} run
   * @returns {HTMLButtonElement}
   */
  const arrow = (text, key, action, run) => /** @type {HTMLButtonElement} */ (el('button', {
    className: 'puzzle-nav__arrow',
    text,
    attrs: { type: 'button', 'aria-label': t(key), title: t(key), 'data-i18n-attr': `aria-label:${key},title:${key}` },
    dataset: { action },
    on: { click: () => run() },
  }));
  /**
   * @param {string} key
   * @param {string} action
   * @param {() => void} run
   * @returns {HTMLButtonElement}
   */
  const textButton = (key, action, run) => /** @type {HTMLButtonElement} */ (el('button', {
    className: 'puzzle-nav__action',
    text: t(key),
    attrs: { type: 'button' },
    dataset: { action, i18n: key },
    on: { click: () => run() },
  }));
  const older = arrow('◀', 'puzzles.older', 'older-puzzle', onOlder);
  const newer = arrow('▶', 'puzzles.newer', 'newer-puzzle', onNewer);
  const position = el('span', { className: 'puzzle-nav__position', attrs: { 'aria-live': 'polite' }, dataset: { role: 'puzzle-position' } });
  const remove = textButton('puzzles.remove', 'remove-puzzle', onRemove);
  const removeAll = textButton('puzzles.removeAll', 'remove-all-puzzles-nav', onRemoveAll);
  const element = el('div', { className: 'puzzle-nav', attrs: { hidden: '' }, dataset: { role: 'puzzle-nav' } },
    el('div', { className: 'puzzle-nav__row' }, older, position, newer),
    el('div', { className: 'puzzle-nav__actions' }, remove, removeAll));

  return {
    element,
    /**
     * @param {{ index: number, total: number, busy?: boolean }} view `index` counts from 0; no puzzle hides the navigator.
     */
    update({ index, total, busy = false }) {
      element.hidden = total <= 0;
      position.dataset.i18n = 'puzzles.position';
      position.dataset.i18nArgs = JSON.stringify({ n: index + 1, total });
      position.textContent = t('puzzles.position', { n: index + 1, total });
      older.disabled = busy || index <= 0;
      newer.disabled = busy || index >= total - 1;
      remove.disabled = busy;
      removeAll.disabled = busy;
    },
  };
}
