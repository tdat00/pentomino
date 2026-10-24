// @ts-check
// "Elapsed: 0:07" under a Generate button while its job runs. A silent clock: it is not a live region, so screen
// readers are not flooded; the button itself carries aria-busy.
import { el } from '../../core/browser/dom.js';
import { t } from '../i18n.js';

/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('../state.js').JobInfo} JobInfo */

const TICK_MS = 500;
/** A job that has run this long can be cancelled from its own button. */
export const CANCEL_AFTER_MS = 30000;

/**
 * @param {number} ms
 * @returns {string} `m:ss`
 */
export function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * @param {GeneratorStore} store
 * @param {readonly string[]} kinds Kinds of job the clock runs for; it is hidden for any other job.
 * @param {{ now?: () => number, setInterval?: (fn: () => void, ms: number) => unknown, clearInterval?: (handle: any) => void,
 *   onOverLimit?: () => void }} [options] `onOverLimit` is called once the job has run CANCEL_AFTER_MS.
 * @returns {{ element: HTMLElement, isOver: () => boolean, refresh: () => void, destroy: () => void }}
 */
export function mountElapsed(store, kinds, options = {}) {
  const now = options.now ?? (() => Date.now());
  const setTick = options.setInterval ?? ((fn, ms) => globalThis.setInterval(fn, ms));
  const clearTick = options.clearInterval ?? ((handle) => globalThis.clearInterval(handle));
  const element = el('p', { className: 'job-elapsed', attrs: { hidden: '' }, dataset: { role: 'elapsed' } });
  /** @type {unknown} */
  let timer = null;
  /** @type {JobInfo | null} */
  let shown = null;
  let over = false;

  /** @returns {boolean} Whether the job on show has run long enough to be cancelled from its button. */
  const isOver = () => shown !== null && now() - shown.startedAt >= CANCEL_AFTER_MS;

  function tick() {
    if (shown !== null) {
      element.textContent = t('job.elapsed', { time: formatElapsed(now() - shown.startedAt) });
      const nowOver = isOver();
      if (nowOver !== over) {
        over = nowOver;
        options.onOverLimit?.();
      }
    }
  }

  /** @param {JobInfo | null} job */
  function render(job) {
    shown = job !== null && kinds.includes(job.kind ?? 'set') ? job : null;
    element.hidden = shown === null;
    if (shown === null) {
      over = false;
      if (timer !== null) {
        clearTick(timer);
        timer = null;
      }
      return;
    }
    tick();
    if (timer === null) {
      timer = setTick(tick, TICK_MS);
    }
  }

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.job !== previous.job) {
      render(state.job);
    }
  });
  render(store.getState().job);

  return {
    element,
    isOver,
    refresh: () => render(store.getState().job),
    destroy() {
      unsubscribe();
      if (timer !== null) {
        clearTick(timer);
      }
      element.remove();
    },
  };
}
