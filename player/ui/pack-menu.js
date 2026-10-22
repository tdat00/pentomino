// @ts-check
// "☰ Pack ▾" menu: the pack's puzzles with level, score and progress, previous
// and next, and the View switches (Labels, Patterns, Timer). Patterns appears
// only when the set has more than 20 pieces.

import { el } from '../../core/browser/dom.js';
import { LABELS, puzzleStatusLabel, ratingLabel } from '../strings.js';

/** @typedef {import('../state.js').PlayerState} PlayerState */
/** @typedef {import('../../core/browser/storage.js').Prefs} Prefs */

/**
 * @typedef {object} PackMenuHandlers
 * @property {(index: number) => void} onSelect
 * @property {() => void} onPrevious
 * @property {() => void} onNext
 * @property {(name: 'labels' | 'patterns' | 'timer', value: boolean) => void} onPref
 */

/**
 * @param {HTMLElement} host
 * @param {PackMenuHandlers} handlers
 */
export function createPackMenu(host, handlers) {
  const doc = host.ownerDocument;
  const panelId = 'pack-menu-panel';
  const button = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn menu-button',
    text: LABELS.menu,
    attrs: { type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': panelId },
    dataset: { action: 'menu' },
  }));
  const previous = /** @type {HTMLButtonElement} */ (el('button', { className: 'pm-btn', text: '◀', attrs: { type: 'button', 'aria-label': LABELS.previous }, dataset: { action: 'previous' }, on: { click: () => handlers.onPrevious() } }));
  const next = /** @type {HTMLButtonElement} */ (el('button', { className: 'pm-btn', text: '▶', attrs: { type: 'button', 'aria-label': LABELS.next }, dataset: { action: 'next' }, on: { click: () => handlers.onNext() } }));
  const position = el('span', { className: 'menu-position', attrs: { 'aria-live': 'polite' } });
  const puzzles = el('ol', { className: 'menu-puzzles', attrs: { 'aria-label': LABELS.menuTitle } });

  /**
   * @param {'labels' | 'patterns' | 'timer'} name
   * @param {string} text
   */
  const toggle = (name, text) => {
    const input = /** @type {HTMLInputElement} */ (el('input', {
      attrs: { type: 'checkbox' },
      dataset: { pref: name },
      on: { change: () => handlers.onPref(name, input.checked) },
    }));
    const label = el('label', { className: 'pm-toggle' }, input, text);
    return { input, label };
  };
  const labels = toggle('labels', LABELS.labels);
  const patterns = toggle('patterns', LABELS.patterns);
  const timer = toggle('timer', LABELS.timer);
  const view = el('fieldset', { className: 'menu-view' }, el('legend', { text: LABELS.view }), labels.label, patterns.label, timer.label);

  const panel = el('div', { className: 'menu-panel', attrs: { id: panelId, role: 'group', 'aria-label': LABELS.menuTitle, hidden: '' } },
    el('div', { className: 'menu-nav' }, previous, position, next), puzzles, view);
  host.append(button, panel);

  let open = false;
  /** @type {[object | null, object | null, number]} Pack, statuses and index of the drawn list. */
  let drawn = [null, null, -1];

  /** @param {boolean} value @param {boolean} [restoreFocus] */
  function setOpen(value, restoreFocus = false) {
    open = value;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (!open && restoreFocus) {
      button.focus();
    }
  }

  button.addEventListener('click', () => setOpen(!open));
  host.addEventListener('keydown', (event) => {
    if (open && /** @type {KeyboardEvent} */ (event).key === 'Escape') {
      event.stopPropagation();
      setOpen(false, true);
    }
  });
  /** @param {Event} event */
  const onOutside = (event) => {
    if (open && !host.contains(/** @type {Node} */ (event.target))) {
      setOpen(false);
    }
  };
  doc.addEventListener('pointerdown', onOutside);

  /** @param {PlayerState} state */
  function renderPuzzles(state) {
    const { pack } = state;
    const rows = (pack?.puzzles ?? []).map((puzzle, index) => {
      const status = state.statuses[index] ?? 'new';
      const rating = ratingLabel(puzzle.rating);
      const text = [`#${index + 1}`, puzzle.title ?? '', rating, puzzleStatusLabel(status)].filter((part) => part !== '').join(' · ');
      const current = index === state.index;
      const item = el('button', {
        className: 'pm-btn menu-puzzle',
        text,
        attrs: { type: 'button', ...(current ? { 'aria-current': 'true' } : {}) },
        dataset: { index: String(index), status },
        on: {
          click: () => {
            setOpen(false, true);
            handlers.onSelect(index);
          },
        },
      });
      return el('li', {}, item);
    });
    puzzles.replaceChildren(...rows);
  }

  /** @param {PlayerState} state */
  function render(state) {
    const total = state.pack?.puzzles.length ?? 0;
    if (drawn[0] !== state.pack || drawn[1] !== state.statuses || drawn[2] !== state.index) {
      drawn = [state.pack, state.statuses, state.index];
      renderPuzzles(state);
    }
    position.textContent = total === 0 ? '' : `${state.index + 1} / ${total}`;
    previous.disabled = total === 0 || state.index <= 0;
    next.disabled = total === 0 || state.index >= total - 1;
    labels.input.checked = state.prefs.labels;
    patterns.input.checked = state.prefs.patterns;
    timer.input.checked = state.prefs.timer;
    patterns.label.hidden = (state.pack?.pieces.length ?? 0) <= 20;
    button.disabled = state.pack === null;
  }

  return {
    render,
    close: () => setOpen(false),
    isOpen: () => open,
    destroy() {
      doc.removeEventListener('pointerdown', onOutside);
      button.remove();
      panel.remove();
    },
  };
}
