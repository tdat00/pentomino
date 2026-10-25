// @ts-check
// Start screen, shown while no puzzle is open: puzzles arrive by link (from the Generator's Play, or a shared or
// bookmarked address), and the sample is one press away. It also shows why a link could not be opened.

import { el } from '../../core/browser/dom.js';
import { loc } from './i18n-dom.js';

/** @typedef {import('../state.js').PlayerState} PlayerState */

/**
 * @param {HTMLElement} host
 * @param {{ onSample: () => void }} handlers
 */
export function createStartView(host, { onSample }) {
  const sample = /** @type {HTMLButtonElement} */ (loc('ui.sample', {
    className: 'pm-btn', attrs: { type: 'button' }, dataset: { action: 'sample' }, on: { click: () => onSample() },
  }, 'button'));
  const generator = loc('ui.generator', { className: 'pm-btn', attrs: { href: '../generator/' } }, 'a');
  const error = el('p', { className: 'start-error', attrs: { role: 'alert', hidden: '' } });
  const busy = loc('ui.loading', { className: 'start-busy', attrs: { role: 'status', hidden: '' } }, 'p');
  const section = el('section', { className: 'start', attrs: { 'aria-labelledby': 'start-title' } },
    loc('start.title', { attrs: { id: 'start-title' } }, 'h2'),
    loc('start.intro', {}, 'p'),
    error,
    busy,
    el('div', { className: 'start-actions' }, sample, generator),
    loc('start.keep', { className: 'start-keep' }, 'p'));
  host.append(section);

  return {
    /** @param {PlayerState} state */
    render(state) {
      const message = state.error?.message ?? '';
      error.textContent = message;
      error.hidden = message === '';
      busy.hidden = !state.loading;
      section.setAttribute('aria-busy', String(state.loading));
      sample.disabled = state.loading;
    },
    destroy() {
      section.remove();
    },
  };
}
