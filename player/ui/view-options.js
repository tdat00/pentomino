// @ts-check
// "View" switches under the pieces: Labels, Patterns (only with more than 20 pieces) and Timer. They are
// stored with the other preferences by the controller; this module only reports a change.

import { el } from '../../core/browser/dom.js';
import { loc } from './i18n-dom.js';

/** @typedef {import('../state.js').PlayerState} PlayerState */
/** @typedef {'labels' | 'patterns' | 'timer'} ViewPref */

/**
 * @param {HTMLElement} host
 * @param {{ onPref: (name: ViewPref, value: boolean) => void }} handlers
 */
export function createViewOptions(host, { onPref }) {
  /**
   * @param {ViewPref} name
   * @param {string} key
   */
  const toggle = (name, key) => {
    const input = /** @type {HTMLInputElement} */ (el('input', {
      attrs: { type: 'checkbox' },
      dataset: { pref: name },
      on: { change: () => onPref(name, input.checked) },
    }));
    const label = el('label', { className: 'pm-toggle' }, input, loc(key));
    return { input, label };
  };
  const labels = toggle('labels', 'ui.labels');
  const patterns = toggle('patterns', 'ui.patterns');
  const timer = toggle('timer', 'ui.timer');
  const fieldset = el('fieldset', { className: 'view-options' }, loc('ui.view', {}, 'legend'), labels.label, patterns.label, timer.label);
  host.append(fieldset);

  return {
    /** @param {PlayerState} state */
    render(state) {
      labels.input.checked = state.prefs.labels;
      patterns.input.checked = state.prefs.patterns;
      timer.input.checked = state.prefs.timer;
      patterns.label.hidden = (state.pack?.pieces.length ?? 0) <= 20;
      for (const { input } of [labels, patterns, timer]) {
        input.disabled = state.pack === null;
      }
    },
    destroy() {
      fieldset.remove();
    },
  };
}
