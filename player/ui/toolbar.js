// @ts-check
// Selection toolbar: the selected piece, rotate / mirror / place / return
// buttons that duplicate every keyboard action, the hint buttons and the help.

import { el } from '../../core/browser/dom.js';
import { LABELS } from '../strings.js';
import { loc, locAttrs } from './i18n-dom.js';

/** @typedef {import('../state.js').PlayerState} PlayerState */
/** @typedef {'rotate-ccw' | 'rotate-cw' | 'flip-h' | 'flip-v' | 'place' | 'to-tray' | 'help' | 'results' | 'hint' | 'reveal'} ToolbarAction */

/**
 * Action, glyph (an icon button) or null, text key (a text button) or null, label key.
 * @type {readonly (readonly [ToolbarAction, string | null, string | null, string])[]}
 */
const BUTTONS = Object.freeze([
  ['rotate-ccw', '⟲', null, 'ui.rotateCcw'],
  ['rotate-cw', '⟳', null, 'ui.rotateCw'],
  ['flip-h', '⇋', null, 'ui.flipH'],
  ['flip-v', '⇵', null, 'ui.flipV'],
  ['place', null, 'ui.place', 'ui.place'],
  ['to-tray', null, 'ui.toTray', 'ui.toTrayLabel'],
]);

/**
 * @param {HTMLElement} host
 * @param {(action: ToolbarAction) => void} onAction
 */
export function createToolbar(host, onAction) {
  const info = el('span', { className: 'selection-info' });
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
  const help = make('help', '?', null, 'ui.help');
  const assist = el('div', { className: 'assist-actions', attrs: { role: 'group', ...locAttrs({ 'aria-label': 'ui.hintsGroup' }) } },
    make('hint', null, 'ui.hint', 'ui.hintLabel'), make('reveal', null, 'ui.reveal', 'ui.revealLabel'));
  host.replaceChildren(info, group, assist, results, help);

  return {
    /** @param {PlayerState} state */
    render(state) {
      const g = state.game;
      const pack = state.pack;
      if (g === null || pack === null) {
        return;
      }
      const piece = g.selected === null ? undefined : pack.pieces.find((p) => p.id === g.selected);
      const solved = g.solved;
      info.textContent = g.revealed && solved ? LABELS.revealedInfo : solved ? LABELS.solvedInfo : piece ? LABELS.selected(piece.label) : LABELS.selectedNone;
      const placed = piece !== undefined && g.placed.has(piece.id);
      const active = piece !== undefined && !solved;
      for (const [action, button] of buttons) {
        switch (action) {
          case 'place':
            button.disabled = !(active && g.preview !== null);
            break;
          case 'to-tray':
            button.disabled = !(active && (placed || g.preview !== null));
            break;
          case 'results':
            button.hidden = !(solved && !g.revealed);
            break;
          case 'hint':
          case 'reveal':
            button.disabled = solved;
            break;
          case 'help':
            break;
          default:
            button.disabled = !active;
        }
      }
    },
    /** @param {ToolbarAction} action @returns {HTMLButtonElement | undefined} */
    button: (action) => buttons.get(action),
  };
}
