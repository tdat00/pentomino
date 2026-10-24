// @ts-check
// Step 2 level table plus the set seed and Generate button (in `controlsHost` when given).
// Ranges come from the policy APIs through `describeBoard`; no generation rule is restated here.
// A seed the user types or rolls is reused; otherwise every Generate draws a fresh one.
import { el } from '../../core/browser/dom.js';
import { randomSeedText } from '../../core/engine/rng.js';
import { getLocale, t } from '../i18n.js';
import { MAX_SETS, beginSetRequest, describeBoard, describeCount, isBusy, rollSeed, setsFull, typeSeed, validSeed } from '../state.js';
import { loc, locAttrs } from './i18n-dom.js';
import { levelHelp, range } from './level-help.js';
import { mountElapsed } from './elapsed.js';

/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('../state.js').GeneratorState} GeneratorState */

/**
 * @typedef {object} GenerateSetRequest
 * @property {string} seed Already normalized.
 * @property {GeneratorState} state With the seed field already updated.
 */

/**
 * @typedef {object} LevelPanelOptions
 * @property {GeneratorStore} store
 * @property {{ phone: boolean }} hardware
 * @property {() => { onGenerateSet?: (request: GenerateSetRequest) => void, onCancel?: () => void }} [getHandlers]
 * @property {() => string} [random]
 * @property {() => number} [now]
 * @property {HTMLElement | null} [controlsHost] Defaults to the panel itself.
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

  const levelBody = el('tbody');
  const columns = ['level.col.level', 'level.col.pieces', 'level.col.size', 'level.col.share'];
  const levelTable = el('table', { className: 'level-table', attrs: { 'data-field': 'level' } },
    loc('level.legend', {}, 'caption'),
    el('thead', {}, el('tr', {}, ...columns.map((key) => loc(key, { attrs: { scope: 'col' } }, 'th')))),
    levelBody);
  const levelField = el('div', { className: 'level-field' }, levelTable);
  let tableSignature = '';
  const levelNotes = el('ul', { className: 'notices', dataset: { role: 'level-notices' } });
  const cannotBox = el('p', { className: 'notice notice-error', attrs: { role: 'alert', hidden: '' }, dataset: { role: 'cannot-generate' } });

  const seedInput = /** @type {HTMLInputElement} */ (el('input', {
    attrs: {
      type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-describedby': `${uid}-seed-error`, 'data-field': 'seed',
      ...locAttrs({ placeholder: 'level.seed.placeholder' }),
    },
  }));
  const diceButton = /** @type {HTMLButtonElement} */ (el('button', {
    text: '🎲', attrs: { type: 'button', ...locAttrs({ 'aria-label': 'level.seed.roll', title: 'level.seed.roll' }), 'data-action': 'roll-seed' },
  }));
  const clearSeedButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'clear-button',
    text: '✕', attrs: { type: 'button', ...locAttrs({ 'aria-label': 'level.seed.clear', title: 'level.seed.clear' }), 'data-action': 'clear-seed' },
  }));
  const seedError = el('p', { className: 'field-error', attrs: { id: `${uid}-seed-error`, role: 'alert' }, dataset: { role: 'seed-error' } });
  const buttonSpinner = el('span', { className: 'spinner', attrs: { 'aria-hidden': 'true', hidden: '' } });
  const generateLabel = loc('level.generate');
  const cancelLabel = loc('progress.cancel');
  cancelLabel.hidden = true;
  const generateButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'primary', attrs: { type: 'button', 'data-action': 'generate-set' },
  }, buttonSpinner, generateLabel, cancelLabel));
  let cancelMode = false;

  const seedField = el('div', { className: 'seed-field', dataset: { role: 'seed' } },
    el('div', { className: 'control-row' },
      el('label', { className: 'field grow' }, loc('level.seed'),
        el('span', { className: 'input-clear' }, seedInput, clearSeedButton)),
      diceButton),
    seedError);

  // One shared tooltip, outside the scrolling table so it is never clipped.
  const tip = el('div', { className: 'help-tip', attrs: { role: 'tooltip', id: `${uid}-tip`, hidden: '' }, dataset: { role: 'level-help' } });
  /** @type {HTMLElement | null} */
  let tipFor = null;

  const controlsHost = options.controlsHost ?? null;
  const fullNote = el('p', { className: 'notice notice-warning', attrs: { role: 'status', hidden: '' }, dataset: { role: 'sets-full' } });
  const elapsed = mountElapsed(store, ['set'], { now: options.now, onOverLimit: () => render(store.getState()) });
  const sideControls = el('div', { className: 'set-controls' }, seedField, fullNote, generateButton, elapsed.element);
  const panel = el('div', { className: 'level-panel' }, levelField, levelNotes, cannotBox,
    ...(controlsHost === null ? [sideControls] : []), tip);
  host.append(panel);
  controlsHost?.append(sideControls);

  let destroyed = false;

  /**
   * @param {GeneratorState} state
   * @returns {boolean}
   */
  function canGenerate(state) {
    const description = describeBoard(state, hardware);
    return !isBusy(state) && !setsFull(state) && description.valid && description.levelOffered
      && typeof getHandlers().onGenerateSet === 'function';
  }

  /** @returns {boolean} Whether a generation request was started. */
  function generate() {
    const state = store.getState();
    const onGenerateSet = getHandlers().onGenerateSet;
    if (!canGenerate(state) || typeof onGenerateSet !== 'function') {
      return false;
    }
    const begun = beginSetRequest(state, random);
    if (!begun.ok) {
      seedInput.focus();
      return false;
    }
    store.update(() => begun.state);
    onGenerateSet({ seed: begun.seed, state: store.getState() });
    return true;
  }

  /**
   * @param {import('../state.js').LevelEntry} entry
   * @param {number} area
   * @param {string} selectedId
   * @param {boolean} busy
   * @returns {HTMLElement}
   */
  function levelRow(entry, area, selectedId, busy) {
    const radio = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'radio', name: `${uid}-level`, value: entry.id } }));
    radio.checked = entry.id === selectedId;
    radio.disabled = busy || !entry.offered;
    const count = entry.offered ? describeCount(entry.id, area) : null;
    const cells = !entry.offered
      ? [el('td', { className: 'level-reason', text: t(`level.reason.${entry.reason}`), attrs: { colspan: 3 } })]
      : count === null
        ? [el('td', { text: '—' }), el('td', { text: '—' }), el('td', { text: '—' })]
        : [
          numberCell(range(count.kmin, count.kmax), 'pieces'),
          numberCell(range(count.sizeMin, count.sizeMax), 'size'),
          numberCell(range(count.placedMin, count.placedMax), 'placed'),
        ];
    const classes = ['level-row', entry.offered ? '' : 'is-unavailable', radio.checked ? 'is-selected' : ''].filter(Boolean).join(' ');
    return el('tr', { className: classes, dataset: { level: entry.id } },
      el('th', { attrs: { scope: 'row' } }, el('label', { className: 'level-choice' }, radio, entry.label)),
      ...cells);
  }

  /**
   * @param {string} text
   * @param {import('./level-help.js').HelpKind} kind
   * @returns {HTMLElement}
   */
  function numberCell(text, kind) {
    return el('td', {},
      el('span', { className: 'level-num' },
        el('span', { className: 'level-value', text }),
        el('button', {
          className: 'help-icon', text: '?',
          attrs: { type: 'button', ...locAttrs({ 'aria-label': 'level.help.label' }), 'data-help': kind },
        })));
  }

  /** @param {HTMLElement} button */
  function showTip(button) {
    const row = button.closest('tr');
    const kind = /** @type {import('./level-help.js').HelpKind} */ (button.dataset.help);
    const help = row?.dataset.level === undefined ? null : levelHelp(kind, row.dataset.level, describeBoard(store.getState(), hardware).area);
    if (help === null) {
      hideTip();
      return;
    }
    tip.replaceChildren(
      el('strong', { className: 'help-title', text: help.title }),
      el('ul', {}, ...help.lines.map((line) => el('li', {},
        line.text,
        line.value === undefined ? null : ` = ${line.value}`,
        line.result === undefined ? null : line.value === undefined ? ' = ' : ' → ',
        line.result === undefined ? null : el('strong', { text: line.result })))),
      el('p', { className: 'help-note', text: help.note }));
    tipFor?.removeAttribute('aria-describedby');
    tipFor = button;
    button.setAttribute('aria-describedby', tip.id);
    tip.hidden = false;
    const view = host.ownerDocument.defaultView;
    const box = button.getBoundingClientRect();
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    const viewWidth = host.ownerDocument.documentElement.clientWidth;
    const viewHeight = view?.innerHeight ?? Infinity;
    const left = Math.max(8, Math.min(box.left + box.width / 2 - width / 2, viewWidth - width - 8));
    const below = box.bottom + 6;
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(below + height > viewHeight - 8 ? Math.max(8, box.top - height - 6) : below)}px`;
  }

  function hideTip() {
    tipFor?.removeAttribute('aria-describedby');
    tipFor = null;
    tip.hidden = true;
  }

  /** @param {GeneratorState} state */
  function render(state) {
    if (destroyed) {
      return;
    }
    const description = describeBoard(state, hardware);
    const busy = isBusy(state);
    const signature = `${getLocale()}|${state.levelId}|${description.area}|${busy}`;
    if (signature !== tableSignature) {
      tableSignature = signature;
      levelBody.replaceChildren(...description.levels.map((entry) => levelRow(entry, description.area, state.levelId, busy)));
      hideTip();
    }
    cannotBox.hidden = description.valid;
    cannotBox.textContent = description.valid ? '' : `${t('level.cannot')} ${description.statusText}`;

    levelNotes.replaceChildren(...description.levelNotices
      .map((notice) => el('li', { className: `notice notice-${notice.kind}`, text: notice.text, dataset: { code: notice.code } })));

    if (seedInput.value !== state.seedText) {
      seedInput.value = state.seedText;
    }
    seedError.textContent = state.keepSeed && validSeed(state.seedText) === null ? t('level.seed.problem') : '';
    for (const control of [seedInput, diceButton]) {
      control.disabled = busy;
    }
    clearSeedButton.hidden = state.seedText === '';
    clearSeedButton.disabled = busy;

    const handler = getHandlers().onGenerateSet;
    const full = setsFull(state);
    // After 30 s the button turns into Cancel for the job it started.
    cancelMode = state.job !== null && (state.job.kind ?? 'set') !== 'batch' && elapsed.isOver();
    generateLabel.hidden = cancelMode;
    cancelLabel.hidden = !cancelMode;
    generateButton.disabled = cancelMode
      ? state.job?.cancelling === true || typeof getHandlers().onCancel !== 'function'
      : busy || full || !description.valid || !description.levelOffered || typeof handler !== 'function';
    buttonSpinner.hidden = state.job?.kind !== 'set';
    generateButton.setAttribute('aria-busy', String(!buttonSpinner.hidden));
    generateButton.title = cancelMode ? '' : typeof handler !== 'function'
      ? t('level.pending')
      : full ? t('set.full', { max: MAX_SETS }) : !description.valid ? t('level.cannot') : '';
    fullNote.hidden = !full;
    fullNote.textContent = full ? t('set.full', { max: MAX_SETS }) : '';
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

  listen(levelTable, 'change', (event) => {
    const target = /** @type {HTMLInputElement} */ (event.target);
    if (target.type === 'radio' && target.checked) {
      store.update({ levelId: target.value });
    }
  });
  // A click anywhere on an available row chooses its level; help icons only explain.
  listen(levelBody, 'click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const help = /** @type {HTMLElement | null} */ (target.closest('.help-icon'));
    if (help !== null) {
      showTip(help);
      return;
    }
    const row = target.closest('tr');
    const radio = /** @type {HTMLInputElement | null} */ (row?.querySelector('input[type="radio"]') ?? null);
    if (radio !== null && !radio.disabled && !radio.checked && target.closest('label') === null) {
      radio.click();
    }
  });
  /** @param {Event} event */
  const helpOf = (event) => /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (event.target).closest?.('.help-icon') ?? null);
  listen(levelBody, 'mouseover', (event) => {
    const help = helpOf(event);
    if (help !== null && help !== tipFor) {
      showTip(help);
    }
  });
  listen(levelBody, 'mouseout', (event) => {
    const help = helpOf(event);
    if (help !== null && help === tipFor && host.ownerDocument.activeElement !== help) {
      hideTip();
    }
  });
  listen(levelBody, 'focusin', (event) => {
    const help = helpOf(event);
    if (help !== null) {
      showTip(help);
    }
  });
  listen(levelBody, 'focusout', (event) => {
    if (helpOf(event) !== null) {
      hideTip();
    }
  });
  listen(panel, 'keydown', (event) => {
    if (event.key === 'Escape' && tipFor !== null) {
      hideTip();
    }
  });
  listen(levelField, 'scroll', hideTip);
  const view = host.ownerDocument.defaultView;
  if (view !== null) {
    listen(view, 'scroll', hideTip);
    listen(view, 'resize', hideTip);
  }
  listen(seedInput, 'input', () => store.update((state) => typeSeed(state, seedInput.value)));
  listen(diceButton, 'click', () => store.update((state) => rollSeed(state, random)));
  listen(clearSeedButton, 'click', () => {
    store.update((state) => typeSeed(state, ''));
    seedInput.focus();
  });
  listen(generateButton, 'click', () => {
    if (cancelMode) {
      getHandlers().onCancel?.();
    } else {
      generate();
    }
  });

  const unsubscribe = store.subscribe((state) => render(state));
  render(store.getState());

  return {
    element: panel,
    generate,
    refresh: () => {
      elapsed.refresh();
      render(store.getState());
    },
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      unsubscribe();
      elapsed.destroy();
      for (const [target, type, fn] of listeners) {
        target.removeEventListener(type, fn);
      }
      listeners.length = 0;
      panel.remove();
      sideControls.remove();
    },
  };
}
