// @ts-check
// Job progress (design §10.5): current stage, accepted count, elapsed time and Cancel. The stage text
// is the only live region; the elapsed clock ticks silently so screen readers are not flooded.
import { el } from '../../core/browser/dom.js';
import { STAGE_TEXT } from '../strings.js';

/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('../state.js').JobInfo} JobInfo */

const TICK_MS = 500;

/**
 * @param {number} ms
 * @returns {string} `m:ss`
 */
export function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * @param {JobInfo} job
 * @returns {string}
 */
export function describeStage(job) {
  const stage = /** @type {Record<string, string>} */ (STAGE_TEXT)[job.stage] ?? STAGE_TEXT.memory;
  if (job.stage === 'cancelling' || job.stage === 'enumerate') {
    return stage;
  }
  if (job.kind === 'batch') {
    const quantity = job.quantity ?? 0;
    const slot = Math.min(quantity, job.slot ?? (job.accepted ?? 0) + 1);
    return quantity > 0 ? `Puzzle ${slot} of ${quantity} — ${STAGE_TEXT.candidate.toLowerCase()}` : stage;
  }
  if (job.kind === 'import') {
    return STAGE_TEXT.import;
  }
  return job.stage === 'starting' ? stage : STAGE_TEXT.carving;
}

/**
 * @param {HTMLElement} host
 * @param {{ store: GeneratorStore, onCancel: () => void, now?: () => number,
 *   setInterval?: (fn: () => void, ms: number) => unknown, clearInterval?: (handle: any) => void }} options
 */
export function mountProgress(host, options) {
  const { store } = options;
  const now = options.now ?? (() => Date.now());
  const setTick = options.setInterval ?? ((fn, ms) => globalThis.setInterval(fn, ms));
  const clearTick = options.clearInterval ?? ((handle) => globalThis.clearInterval(handle));

  const stageText = el('p', { className: 'progress-stage', attrs: { role: 'status', 'aria-live': 'polite' }, dataset: { role: 'stage' } });
  const meter = /** @type {HTMLProgressElement} */ (el('progress', { attrs: { max: 1, 'aria-label': 'Accepted puzzles' } }));
  const count = el('span', { className: 'progress-count', dataset: { role: 'count' } });
  const elapsed = el('span', { className: 'progress-elapsed', dataset: { role: 'elapsed' } });
  const cancel = /** @type {HTMLButtonElement} */ (el('button', { text: 'Cancel', attrs: { type: 'button', 'data-action': 'cancel' } }));
  const root = el('div', { className: 'job-progress', attrs: { hidden: '' }, dataset: { role: 'progress' } },
    stageText, el('div', { className: 'progress-row' }, meter, count, elapsed, cancel));
  host.append(root);

  /** @type {unknown} */
  let timer = null;
  /** @type {JobInfo | null} */
  let shown = null;

  function tick() {
    if (shown !== null) {
      elapsed.textContent = formatElapsed(now() - shown.startedAt);
    }
  }

  /** @param {JobInfo | null} job */
  function render(job) {
    shown = job;
    root.hidden = job === null;
    if (job === null) {
      if (timer !== null) {
        clearTick(timer);
        timer = null;
      }
      return;
    }
    const text = describeStage(job);
    if (stageText.textContent !== text) {
      stageText.textContent = text;
    }
    const quantity = job.quantity ?? 0;
    meter.hidden = quantity === 0;
    if (quantity > 0) {
      meter.max = quantity;
      meter.value = job.accepted ?? 0;
      count.textContent = `${job.accepted ?? 0} of ${quantity} accepted`;
    } else {
      count.textContent = '';
    }
    cancel.disabled = job.cancelling === true;
    tick();
    if (timer === null) {
      timer = setTick(tick, TICK_MS);
    }
  }

  const onCancel = () => options.onCancel();
  cancel.addEventListener('click', onCancel);
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.job !== previous.job) {
      render(state.job);
    }
  });
  render(store.getState().job);

  return {
    element: root,
    destroy() {
      unsubscribe();
      cancel.removeEventListener('click', onCancel);
      if (timer !== null) {
        clearTick(timer);
      }
      root.remove();
    },
  };
}
