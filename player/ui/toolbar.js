// @ts-check
// Selection toolbar at the top of the pieces panel.

import { el } from '../../core/browser/dom.js';
import { loc, locAttrs } from './i18n-dom.js';

/** @typedef {import('../state.js').PlayerState} PlayerState */
/** @typedef {'rotate-ccw' | 'rotate-cw' | 'flip-h' | 'flip-v' | 'results'} ToolbarAction */

/**
 * Action, glyph (an icon button) or null, text key (a text button) or null, label key.
 * @type {readonly (readonly [ToolbarAction, string | null, string | null, string])[]}
 */
const BUTTONS = Object.freeze([
  ['rotate-ccw', '⟲', null, 'ui.rotateCcw'],
  ['rotate-cw', '⟳', null, 'ui.rotateCw'],
  ['flip-h', '⇋', null, 'ui.flipH'],
  ['flip-v', '⇵', null, 'ui.flipV'],
]);

/**
 * @param {HTMLElement} host
 * @param {(action: ToolbarAction) => void} onAction
 */
export function createToolbar(host, onAction) {
  /** @type {Map<ToolbarAction, HTMLButtonElement>} */
  const buttons = new Map();
  /**
   * @param {ToolbarAction} action
   * @param {string | null} glyph
   * @param {string | null} textKey
   * @param {string} labelKey
   * @returns {HTMLButtonElement}
   */
  const make = (action, glyph, textKey, labelKey) => {
    const props = {
      className: 'pm-btn tool-btn',
      attrs: { type: 'button', ...locAttrs({ 'aria-label': labelKey, title: labelKey }) },
      dataset: { action },
      on: { click: () => onAction(action) },
    };
    const button = /** @type {HTMLButtonElement} */ (textKey === null ? el('button', { ...props, text: glyph ?? '' }) : loc(textKey, props, 'button'));
    buttons.set(action, button);
    return button;
  };
  const group = el('div', { className: 'selection-actions', attrs: { role: 'group', ...locAttrs({ 'aria-label': 'ui.selectedGroup' }) } },
    ...BUTTONS.map(([action, glyph, textKey, labelKey]) => make(action, glyph, textKey, labelKey)));
  const results = make('results', null, 'ui.results', 'ui.results');
  host.replaceChildren(group, results);

  return {
    /** @param {PlayerState} state */
    render(state) {
      const g = state.game;
      const pack = state.pack;
      if (g === null || pack === null) {
        return;
      }
      const piece = g.selected === null ? undefined : pack.pieces.find((p) => p.id === g.selected);
      const active = piece !== undefined && !g.solved;
      for (const [action, button] of buttons) {
        if (action === 'results') {
          button.hidden = !(g.solved && !g.revealed);
        } else {
          button.disabled = !active;
        }
      }
    },
  };
}
