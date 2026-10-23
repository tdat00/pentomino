// @ts-check
// Generator level panel (design §10.3): the level list with availability for the board, the
// piece-count line, advanced settings (seed, uniqueness, large boards, omit solutions) and
// the Generate Piece Set action. Ranges, sizes and shares come from the policy APIs through
// `describeBoard`; no generation rule is restated here.
import { el } from '../../core/browser/dom.js';
import { QUALIFICATION } from '../../core/engine/qualification.js';
import { randomSeedText } from '../../core/engine/rng.js';
import { getLocale, t } from '../i18n.js';
import { beginSetRequest, describeBoard, isBusy, rollSeed, typeSeed, validSeed } from '../state.js';
import { loc, locAttrs } from './i18n-dom.js';

/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('../state.js').GeneratorState} GeneratorState */

/**
 * @typedef {object} GenerateSetRequest
 * @property {string} seed Set seed to use (already normalized).
 * @property {GeneratorState} state State with the seed field already updated.
 */

/**
 * @typedef {object} LevelPanelOptions
 * @property {GeneratorStore} store
 * @property {{ phone: boolean }} hardware
 * @property {() => { onGenerateSet?: (request: GenerateSetRequest) => void }} [getHandlers]
 * @property {() => string} [random] Source of fresh seeds.
 */

let panelCounter = 0;

/**
 * @param {HTMLElement} host
 * @param {LevelPanelOptions} options
 */
export function mountLevelPanel(host, options) {
  const { store, hardware } = options;
  const getHandlers = options.getHandlers ?? (() => ({}));
  const random = options.random ?? randomSeedText;
  const uid = `level-panel-${(panelCounter += 1)}`;
  const experimentalLarge = QUALIFICATION.bq2.status !== 'pass';

  const levelSelect = /** @type {HTMLSelectElement} */ (el('select', { attrs: { 'data-field': 'level' } }));
  const levelField = el('label', { className: 'field level-field' }, loc('level.legend'), levelSelect);
  let optionSignature = '';
  const countLine = el('p', { className: 'count-line', dataset: { role: 'count' } });
  const levelNotes = el('ul', { className: 'notices', dataset: { role: 'level-notices' } });
  const cannotBox = el('p', { className: 'notice notice-error', attrs: { role: 'alert', hidden: '' }, dataset: { role: 'cannot-generate' } });

  const seedInput = /** @type {HTMLInputElement} */ (el('input', {
    attrs: { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-describedby': `${uid}-seed-error`, 'data-field': 'seed' },
  }));
  const diceButton = /** @type {HTMLButtonElement} */ (el('button', {
    text: '🎲', attrs: { type: 'button', ...locAttrs({ 'aria-label': 'level.seed.roll', title: 'level.seed.roll' }), 'data-action': 'roll-seed' },
  }));
  const keepInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'keep-seed' } }));
  const seedError = el('p', { className: 'field-error', attrs: { id: `${uid}-seed-error`, role: 'alert' }, dataset: { role: 'seed-error' } });
  const uniqueInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'require-unique' } }));
  const largeInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'large-boards' } }));
  const largeNote = el('small', { className: 'hint', dataset: { role: 'large-note' } });
  const omitInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'omit-solutions' } }));
  const buttonSpinner = el('span', { className: 'spinner', attrs: { 'aria-hidden': 'true', hidden: '' } });
  const generateButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'primary', attrs: { type: 'button', 'data-action': 'generate-set' },
  }, buttonSpinner, loc('level.generate')));
  const largeText = loc(experimentalLarge ? 'level.large.experimental' : 'level.large');

  const advanced = el('details', { className: 'advanced', dataset: { role: 'advanced' } },
    loc('level.advanced', {}, 'summary'),
    el('div', { className: 'control-row' },
      el('label', { className: 'field grow' }, loc('level.seed'), seedInput),
      diceButton,
      el('label', { className: 'pm-toggle' }, keepInput, loc('level.keepSeed'))),
    seedError,
    el('label', { className: 'pm-toggle' }, uniqueInput, loc('level.unique')),
    el('label', { className: 'pm-toggle' }, largeInput, largeText),
    largeNote,
    el('label', { className: 'pm-toggle' }, omitInput, loc('level.omitSolutions')));

  const panel = el('div', { className: 'level-panel' }, levelField, countLine, levelNotes, advanced, cannotBox, generateButton);
  host.append(panel);

  let destroyed = false;

  /** @returns {boolean} Whether a generation request was started. */
  function generate() {
    const state = store.getState();
    const description = describeBoard(state, hardware);
    const onGenerateSet = getHandlers().onGenerateSet;
    if (isBusy(state) || !description.valid || !description.levelOffered || typeof onGenerateSet !== 'function') {
      return false;
    }
    const begun = beginSetRequest(state, random);
    if (!begun.ok) {
      advanced.open = true;
      seedInput.focus();
      return false;
    }
    store.update(() => begun.state);
    onGenerateSet({ seed: begun.seed, state: store.getState() });
    return true;
  }

  /** @param {GeneratorState} state */
  function render(state) {
    if (destroyed) {
      return;
    }
    const description = describeBoard(state, hardware);
    const busy = isBusy(state);
    const shown = description.levels.filter((entry) => entry.offered || entry.id === state.levelId);
    const signature = `${getLocale()}|${state.levelId}|${shown.map((entry) => `${entry.id}:${entry.reason}`).join(',')}`;
    if (signature !== optionSignature) {
      optionSignature = signature;
      levelSelect.replaceChildren(...shown.map((entry) => {
        const label = entry.reason === null ? entry.label : `${entry.label} (${t(`level.reason.${entry.reason}`)})`;
        const option = /** @type {HTMLOptionElement} */ (el('option', { text: label, attrs: { value: entry.id } }));
        option.selected = entry.id === state.levelId;
        return option;
      }));
    }
    levelSelect.disabled = busy;
    const count = description.count;
    countLine.textContent = count === null ? '' : t('level.count', count);
    cannotBox.hidden = description.valid;
    cannotBox.textContent = description.valid ? '' : `${t('level.cannot')} ${description.statusText}`;

    levelNotes.replaceChildren(...[...description.notices.filter((n) => n.code === 'N-LEVELS'), ...description.levelNotices]
      .map((notice) => el('li', { className: `notice notice-${notice.kind}`, text: notice.text, dataset: { code: notice.code } })));

    if (seedInput.value !== state.seedText) {
      seedInput.value = state.seedText;
    }
    keepInput.checked = state.keepSeed;
    seedError.textContent = state.keepSeed && validSeed(state.seedText) === null ? t('level.seed.problem') : '';
    uniqueInput.checked = state.uniqueness === 'require';
    largeInput.checked = state.largeBoards && !hardware.phone;
    largeInput.disabled = busy || hardware.phone;
    largeNote.textContent = hardware.phone ? t('level.large.phoneNote') : '';
    omitInput.checked = state.omitSolutions;
    for (const control of [seedInput, diceButton, keepInput, uniqueInput, omitInput]) {
      control.disabled = busy;
    }

    const handler = getHandlers().onGenerateSet;
    generateButton.disabled = busy || !description.valid || !description.levelOffered || typeof handler !== 'function';
    buttonSpinner.hidden = state.job?.kind !== 'set';
    generateButton.setAttribute('aria-busy', String(!buttonSpinner.hidden));
    generateButton.title = typeof handler !== 'function'
      ? t('level.pending')
      : !description.valid ? t('level.cannot') : '';
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

  listen(levelSelect, 'change', () => store.update({ levelId: levelSelect.value }));
  listen(seedInput, 'input', () => store.update((state) => typeSeed(state, seedInput.value)));
  listen(diceButton, 'click', () => store.update((state) => rollSeed(state, random)));
  listen(keepInput, 'change', () => store.update({ keepSeed: keepInput.checked }));
  listen(uniqueInput, 'change', () => store.update({ uniqueness: uniqueInput.checked ? 'require' : 'any' }));
  listen(largeInput, 'change', () => store.update({ largeBoards: largeInput.checked }));
  listen(omitInput, 'change', () => store.update({ omitSolutions: omitInput.checked }));
  listen(generateButton, 'click', generate);

  const unsubscribe = store.subscribe((state) => render(state));
  render(store.getState());

  return {
    element: panel,
    generate,
    refresh: () => render(store.getState()),
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      unsubscribe();
      for (const [target, type, fn] of listeners) {
        target.removeEventListener(type, fn);
      }
      listeners.length = 0;
      panel.remove();
    },
  };
}
