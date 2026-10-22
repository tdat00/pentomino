// @ts-check
// Generator level panel (design §10.3): the level list with availability for the board, the
// piece-count line, advanced settings (seed, uniqueness, large boards, omit solutions) and
// the Generate Piece Set action. Ranges, sizes and shares come from the policy APIs through
// `describeBoard`; no generation rule is restated here.
import { el } from '../../core/browser/dom.js';
import { QUALIFICATION } from '../../core/engine/qualification.js';
import { randomSeedText } from '../../core/engine/rng.js';
import { GENERATION_PENDING, LEVEL_REASONS, SEED_PROBLEM } from '../strings.js';
import { beginSetRequest, describeBoard, isBusy, rollSeed, typeSeed, validSeed } from '../state.js';

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

  /** @type {Map<string, { input: HTMLInputElement, row: HTMLElement, reason: HTMLElement, name: HTMLElement }>} */
  const levelParts = new Map();
  const levelList = el('fieldset', { className: 'level-list', dataset: { role: 'levels' } },
    el('legend', { text: 'Level' }));
  for (const id of describeBoard(store.getState(), hardware).levels.map((entry) => entry.id)) {
    const input = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'radio', name: `${uid}-level`, value: id } }));
    const reason = el('small', { className: 'level-reason' });
    const name = el('span', { className: 'level-name' });
    const row = el('label', { className: 'level-option', dataset: { level: id } }, input, name, reason);
    levelParts.set(id, { input, row, reason, name });
    levelList.append(row);
  }
  const countLine = el('p', { className: 'count-line', dataset: { role: 'count' } });
  const levelNotes = el('ul', { className: 'notices', dataset: { role: 'level-notices' } });

  const seedInput = /** @type {HTMLInputElement} */ (el('input', {
    attrs: { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-describedby': `${uid}-seed-error`, 'data-field': 'seed' },
  }));
  const diceButton = /** @type {HTMLButtonElement} */ (el('button', {
    text: '🎲', attrs: { type: 'button', 'aria-label': 'New random seed', title: 'New random seed', 'data-action': 'roll-seed' },
  }));
  const keepInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'keep-seed' } }));
  const seedError = el('p', { className: 'field-error', attrs: { id: `${uid}-seed-error`, role: 'alert' }, dataset: { role: 'seed-error' } });
  const uniqueInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'require-unique' } }));
  const largeInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'large-boards' } }));
  const largeNote = el('small', { className: 'hint', dataset: { role: 'large-note' } });
  const omitInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'omit-solutions' } }));
  const generateButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'primary', text: 'Generate Piece Set', attrs: { type: 'button', 'data-action': 'generate-set' },
  }));

  const advanced = el('details', { className: 'advanced', dataset: { role: 'advanced' } },
    el('summary', { text: 'Advanced' }),
    el('div', { className: 'control-row' },
      el('label', { className: 'field grow' }, el('span', { text: 'Set seed' }), seedInput),
      diceButton,
      el('label', { className: 'pm-toggle' }, keepInput, el('span', { text: '🔒 Keep seed' }))),
    seedError,
    el('label', { className: 'pm-toggle' }, uniqueInput, el('span', { text: 'Require one solution' })),
    el('label', { className: 'pm-toggle' }, largeInput, el('span', { text: experimentalLarge ? 'Large boards (experimental)' : 'Large boards' })),
    largeNote,
    el('label', { className: 'pm-toggle' }, omitInput, el('span', { text: 'Omit solutions in exported files' })));

  const panel = el('div', { className: 'level-panel' }, levelList, countLine, levelNotes, advanced, generateButton);
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
    for (const entry of description.levels) {
      const parts = /** @type {NonNullable<ReturnType<typeof levelParts.get>>} */ (levelParts.get(entry.id));
      parts.input.checked = entry.id === state.levelId;
      parts.input.disabled = busy || !entry.offered;
      parts.row.dataset.offered = String(entry.offered);
      parts.name.textContent = entry.label;
      parts.reason.textContent = entry.reason === null ? '' : `(${LEVEL_REASONS[entry.reason]})`;
    }
    const count = description.count;
    countLine.textContent = count === null
      ? ''
      : `Uses ${count.kmin}–${count.kmax} pieces of ${count.sizeMin}–${count.sizeMax} squares · about ${count.share}% pre-placed`;
    levelNotes.replaceChildren(...[...description.notices.filter((n) => n.code === 'N-LEVELS'), ...description.levelNotices]
      .map((notice) => el('li', { className: `notice notice-${notice.kind}`, text: notice.text, dataset: { code: notice.code } })));

    if (seedInput.value !== state.seedText) {
      seedInput.value = state.seedText;
    }
    keepInput.checked = state.keepSeed;
    seedError.textContent = state.keepSeed && validSeed(state.seedText) === null ? SEED_PROBLEM : '';
    uniqueInput.checked = state.uniqueness === 'require';
    largeInput.checked = state.largeBoards && !hardware.phone;
    largeInput.disabled = busy || hardware.phone;
    largeNote.textContent = hardware.phone ? 'Large boards are available on desktop computers only.' : '';
    omitInput.checked = state.omitSolutions;
    for (const control of [seedInput, diceButton, keepInput, uniqueInput, omitInput]) {
      control.disabled = busy;
    }

    const handler = getHandlers().onGenerateSet;
    generateButton.disabled = busy || !description.valid || !description.levelOffered || typeof handler !== 'function';
    generateButton.title = typeof handler !== 'function'
      ? GENERATION_PENDING
      : !description.valid ? description.statusText : '';
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

  for (const [id, parts] of levelParts) {
    listen(parts.input, 'change', () => {
      if (parts.input.checked) {
        store.update({ levelId: id });
      }
    });
  }
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
