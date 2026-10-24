// @ts-check
// Three-step wizard: shows one `[data-step]` section at a time and opens a later step once the work it needs
// exists. It only changes what is visible, never the store or the panels.
import { t } from '../i18n.js';
import { describeBoard } from '../state.js';

/** @typedef {import('../state.js').GeneratorState} GeneratorState */
/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */

export const STEP_COUNT = 3;

/**
 * @param {GeneratorState} state
 * @param {{ phone: boolean }} hardware
 * @returns {1 | 2 | 3}
 */
export function reachableStep(state, hardware) {
  if (state.set !== null) {
    return 3;
  }
  return describeBoard(state, hardware).valid ? 2 : 1;
}

/**
 * @param {number} step
 * @param {ReturnType<typeof describeBoard>} description
 * @returns {string}
 */
function lockReason(step, description) {
  return step === 2 || !description.valid ? `${t('level.cannot')} ${description.statusText}` : t('wizard.locked.set');
}

/**
 * @param {GeneratorState} state
 * @returns {1 | 2 | 3}
 */
export function startStep(state) {
  if (state.set === null) {
    return 1;
  }
  return state.puzzles.length > 0 ? 3 : 2;
}

export const STEP_PARAM = 'step';

/**
 * @param {string} search
 * @returns {number | null}
 */
export function stepFromSearch(search) {
  const value = new URLSearchParams(search).get(STEP_PARAM);
  const step = value !== null && /^\d+$/.test(value) ? Number(value) : NaN;
  return step >= 1 && step <= STEP_COUNT ? step : null;
}

/**
 * @param {string} href
 * @param {number} step
 * @returns {string}
 */
export function withStep(href, step) {
  const url = new URL(href);
  url.searchParams.set(STEP_PARAM, String(step));
  return url.href;
}

/**
 * A page without step buttons (a test fixture) gets no wizard and keeps every panel visible. Moving to a step
 * pushes `?step=n` to the history, so the browser's Back and Forward walk through the steps.
 * @param {Document} doc
 * @param {{ store: GeneratorStore, hardware: { phone: boolean }, initial?: number }} options
 * @returns {null | { readonly step: number, go: (step: number, o?: { focus?: boolean }) => boolean, next: () => boolean,
 *   back: () => boolean, refresh: () => void, onChange: (fn: (step: number) => void) => () => void, destroy: () => void }}
 */
export function mountWizard(doc, options) {
  const { store, hardware } = options;
  const buttons = /** @type {HTMLButtonElement[]} */ ([...doc.querySelectorAll('[data-wizard-step]')]);
  if (buttons.length === 0) {
    return null;
  }
  const win = doc.defaultView;
  const sections = /** @type {HTMLElement[]} */ ([...doc.querySelectorAll('[data-step]')]);
  /** @type {Array<(step: number) => void>} */
  let listeners = [];
  let step = Math.min(STEP_COUNT, Math.max(1, options.initial ?? stepFromSearch(win?.location.search ?? '') ?? startStep(store.getState())));

  /** @param {number} number */
  const sectionOf = (number) => sections.find((section) => section.dataset.step === String(number));

  /** @param {'push' | 'replace'} mode */
  function writeAddress(mode) {
    if (win === null) {
      return;
    }
    try {
      const href = withStep(win.location.href, step);
      if (href !== win.location.href) {
        win.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', href);
      }
    } catch {
      // An address that cannot be changed (a sandboxed frame) only loses the reload position.
    }
  }

  function notify() {
    for (const listener of [...listeners]) {
      listener(step);
    }
  }

  function render() {
    const state = store.getState();
    const description = describeBoard(state, hardware);
    const reach = state.set !== null ? 3 : description.valid ? 2 : 1;
    const done = [step > 1 || state.set !== null, state.set !== null, state.puzzles.length > 0];
    if (step > reach) {
      step = reach;
      writeAddress('replace');
      notify();
    }
    for (const section of sections) {
      section.hidden = section.dataset.step !== String(step);
    }
    for (const body of doc.querySelectorAll('[data-step-body]')) {
      /** @type {HTMLElement} */ (body).hidden = /** @type {HTMLElement} */ (body).dataset.stepBody !== String(step);
    }
    for (const body of doc.querySelectorAll('[data-step-after]')) {
      const summary = /** @type {HTMLElement} */ (body);
      summary.hidden = step <= Number(summary.dataset.stepAfter);
      summary.title = `${t('wizard.stepLabel', { n: summary.dataset.stepAfter })} - ${t(`wizard.step${summary.dataset.stepAfter}.title`)}`;
    }
    for (const button of buttons) {
      const number = Number(button.dataset.wizardStep);
      button.disabled = number > reach;
      button.title = number > reach ? lockReason(number, description) : '';
      button.dataset.state = number === step ? 'current' : done[number - 1] ? 'done' : 'todo';
      if (number === step) {
        button.setAttribute('aria-current', 'step');
      } else {
        button.removeAttribute('aria-current');
      }
    }
  }

  /**
   * @param {number} target
   * @param {{ focus?: boolean }} [o]
   * @returns {boolean} Whether the step is now showing.
   */
  function go(target, o = {}) {
    const wanted = Math.round(target);
    if (!(wanted >= 1 && wanted <= STEP_COUNT) || wanted > reachableStep(store.getState(), hardware)) {
      return false;
    }
    const changed = wanted !== step;
    step = wanted;
    render();
    if (changed) {
      writeAddress('push');
      notify();
      if (o.focus === true) {
        const heading = sectionOf(step)?.querySelector('h2');
        if (heading instanceof HTMLElement) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: false });
        }
      }
    }
    return step === wanted;
  }

  /** @type {Array<[EventTarget, string, EventListener]>} */
  const handlers = [];
  for (const button of buttons) {
    const onClick = () => void go(Number(button.dataset.wizardStep), { focus: true });
    button.addEventListener('click', onClick);
    handlers.push([button, 'click', onClick]);
  }
  // The board preview and the piece set summary under a finished step work like that step's header.
  for (const summary of /** @type {HTMLElement[]} */ ([...doc.querySelectorAll('[data-step-after]')])) {
    summary.setAttribute('role', 'button');
    summary.tabIndex = 0;
    const open = () => void go(Number(summary.dataset.stepAfter), { focus: true });
    const onClick = () => open();
    /** @param {KeyboardEvent} event */
    const onKey = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    };
    summary.addEventListener('click', onClick);
    summary.addEventListener('keydown', onKey);
    handlers.push([summary, 'click', onClick], [summary, 'keydown', /** @type {EventListener} */ (onKey)]);
  }
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.set !== previous.set || state.board !== previous.board || state.puzzles !== previous.puzzles) {
      render();
    }
  });
  const onPopState = () => {
    const wanted = stepFromSearch(win?.location.search ?? '');
    if (wanted !== null && wanted !== step) {
      step = wanted;
      render();
      writeAddress('replace');
      notify();
    }
  };
  win?.addEventListener('popstate', onPopState);
  render();
  writeAddress('replace');

  return {
    get step() {
      return step;
    },
    go,
    next: () => go(step + 1, { focus: true }),
    back: () => go(step - 1, { focus: true }),
    refresh: render,
    onChange(fn) {
      listeners.push(fn);
      return () => {
        listeners = listeners.filter((other) => other !== fn);
      };
    },
    destroy() {
      unsubscribe();
      win?.removeEventListener('popstate', onPopState);
      for (const [target, type, fn] of handlers) {
        target.removeEventListener(type, fn);
      }
      listeners = [];
    },
  };
}
