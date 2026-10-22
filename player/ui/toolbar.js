// @ts-check
// Selection toolbar: the selected piece, rotate / mirror / place / return
// buttons that duplicate every keyboard action, and the pieces-left counter.

import { el } from '../../core/browser/dom.js';
import { LABELS } from '../strings.js';

/** @typedef {import('../state.js').PlayerState} PlayerState */
/** @typedef {'rotate-ccw' | 'rotate-cw' | 'flip-h' | 'flip-v' | 'place' | 'to-tray' | 'help' | 'results'} ToolbarAction */

/** @type {readonly (readonly [ToolbarAction, string, string])[]} */
const BUTTONS = Object.freeze([
  ['rotate-ccw', '⟲', LABELS.rotateCcw],
  ['rotate-cw', '⟳', LABELS.rotateCw],
  ['flip-h', '⇋', LABELS.flipH],
  ['flip-v', '⇵', LABELS.flipV],
  ['place', LABELS.place, LABELS.place],
  ['to-tray', LABELS.toTray, LABELS.toTrayLabel],
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
   * @param {string} text
   * @param {string} label
   * @returns {HTMLButtonElement}
   */
  const make = (action, text, label) => {
    const button = /** @type {HTMLButtonElement} */ (el('button', {
      className: 'pm-btn tool-btn', text, attrs: { type: 'button', 'aria-label': label, title: label }, dataset: { action },
      on: { click: () => onAction(action) },
    }));
    buttons.set(action, button);
    return button;
  };
  const group = el('div', { className: 'selection-actions', attrs: { role: 'group', 'aria-label': 'Selected piece' } },
    ...BUTTONS.map(([action, text, label]) => make(action, text, label)));
  const results = make('results', LABELS.results, LABELS.results);
  const help = make('help', '?', LABELS.help);
  const left = el('span', { className: 'pieces-left' });
  host.replaceChildren(info, group, results, help, left);

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
      info.textContent = solved ? LABELS.solvedInfo : piece ? LABELS.selected(piece.label) : LABELS.selectedNone;
      left.textContent = LABELS.piecesLeft(g.tray.size);
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
            button.hidden = !solved;
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
