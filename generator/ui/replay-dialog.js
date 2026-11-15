// @ts-check
// The Generation Steps dialog of the Generator ("How it was made", design §6.12 and §11.11; RES-29 to RES-31): a native
// modal dialog built like the Share dialog. It plays the steps of one puzzle's replay on a board, each with its
// sentence and score table, says which stages have no steps and how the replay ended, and closing it cancels only the
// replay. All logic that has no DOM is in `replay-model.js`.

import { el } from '../../core/browser/dom.js';
import { mountBoard, svgEl } from '../../core/browser/svg-board.js';
import { formatNumber } from '../i18n.js';
import {
  boardOf, createReplayController, failureText, renderDesc, scoreTable, stageList, statusText, stepText,
} from './replay-model.js';

/** @typedef {import('./replay-model.js').ReplaySource} ReplaySource */
/** @typedef {import('./replay-model.js').ReplayViewState} ReplayViewState */
/** @typedef {import('./replay-model.js').Desc} Desc */
/** @typedef {import('./replay-model.js').Row} Row */
/** @typedef {import('../../core/engine/replay.js').ReplayResult} ReplayResult */

const BOARD_PX = 420;
const MIN_CELL_PX = 8;
const MAX_CELL_PX = 40;

let dialogCount = 0;

/** @returns {SVGElement} Three lines: the steps. */
function stepsIcon() {
  return svgEl('svg', { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    svgEl('path', { d: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01' }));
}

/** @returns {SVGElement} A cross. */
function crossIcon() {
  return svgEl('svg', { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    svgEl('path', { d: 'M6 6l12 12M18 6L6 18' }));
}

/** @returns {SVGElement} A triangle: play. */
function playIcon() {
  return svgEl('svg', { class: 'pm-replay-icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    svgEl('path', { d: 'M8 5l11 7-11 7z' }));
}

/** @returns {SVGElement} Two bars: pause. */
function pauseIcon() {
  return svgEl('svg', { class: 'pm-replay-icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    svgEl('path', { d: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' }));
}

/**
 * @param {{ width: number, height: number }} board
 * @returns {number} The cell size that fits the board into the dialog.
 */
function cellPxOf(board) {
  return Math.max(MIN_CELL_PX, Math.min(MAX_CELL_PX, Math.floor(BOARD_PX / (Math.max(board.width, board.height) + 1))));
}

/**
 * Fixed texts carry `data-i18n` (and are written again by `refreshTexts()`); the texts that depend on the step are
 * drawn again on every change.
 * @param {{ host: HTMLElement, t: (key: string, params?: Record<string, unknown>) => string,
 *   run: (source: ReplaySource, signal: AbortSignal) => Promise<ReplayResult>, closeKey: string }} options `run` is
 *   `(source, signal) => client.replayPuzzle(source, { signal })`; `closeKey` is the app's text key for "Close".
 * @returns {{ element: HTMLDialogElement, open(source: ReplaySource, from?: Element | null): void, close(): void,
 *   isOpen(): boolean, refreshTexts(): void, dispose(): void }}
 */
export function createReplayDialog(options) {
  const { host, t, run, closeKey } = options;
  const doc = host.ownerDocument;
  dialogCount += 1;
  const titleId = `pm-replay-title-${dialogCount}`;
  const sliderId = `pm-replay-slider-${dialogCount}`;
  const viewName = `pm-replay-view-${dialogCount}`;
  /** @param {number} n */
  const format = (n) => formatNumber(n, { maximumFractionDigits: 6 });
  /** @param {Desc} d */
  const write = (d) => renderDesc(d, t, format);

  /** @type {Element | null} */
  let opener = null;
  /** @type {ReturnType<typeof mountBoard> | null} */
  let boardView = null;
  /** @type {ReplaySource | null} */
  let source = null;
  let statusKey = '';

  /** @type {[HTMLElement, string][]} */
  const fixedTexts = [];
  /** @type {[HTMLElement, string, string][]} */
  const fixedAttrs = [];
  /**
   * @param {HTMLElement} node
   * @param {string} key
   * @returns {HTMLElement}
   */
  const fixed = (node, key) => {
    node.dataset.i18n = key;
    node.textContent = t(key);
    fixedTexts.push([node, key]);
    return node;
  };
  /**
   * @param {HTMLElement} node
   * @param {string} name
   * @param {string} key
   */
  const fixedAttr = (node, name, key) => {
    node.setAttribute(name, t(key));
    node.dataset.i18nAttr = `${node.dataset.i18nAttr === undefined ? '' : `${node.dataset.i18nAttr},`}${name}:${key}`;
    fixedAttrs.push([node, name, key]);
  };

  const closeX = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-head-x', attrs: { type: 'button' }, dataset: { action: 'replay-x' },
  }, crossIcon()));
  fixedAttr(closeX, 'aria-label', closeKey);
  fixedAttr(closeX, 'title', closeKey);
  const head = el('header', { className: 'pm-head' },
    el('span', { className: 'pm-head-badge', attrs: { 'aria-hidden': 'true' } }, stepsIcon()),
    el('div', { className: 'pm-head-titles' }, fixed(el('h2', { className: 'pm-head-title', attrs: { id: titleId } }), 'replay.title')),
    closeX);

  const status = el('div', { className: 'pm-replay-status', attrs: { role: 'status' }, dataset: { role: 'replay-status' } });
  const stages = el('ol', { className: 'pm-replay-stage-list', dataset: { role: 'replay-stages' } });
  const stagesBox = el('section', { className: 'pm-replay-stages' },
    fixed(el('h3', { className: 'pm-replay-heading' }), 'replay.stages'), stages);
  const score = el('div', { className: 'pm-replay-score', dataset: { role: 'replay-score' } });

  const boardHost = el('div', { className: 'pm-replay-board', dataset: { role: 'replay-board' } });
  const now = el('p', { className: 'pm-replay-sentence', attrs: { 'aria-hidden': 'true' }, dataset: { role: 'replay-now' } });
  // The live region is written on manual steps and on pause, never on a playback tick (RES-31).
  const live = el('p', { className: 'sr-only', attrs: { role: 'status' }, dataset: { role: 'replay-sentence' } });
  const prevButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', attrs: { type: 'button' }, dataset: { action: 'replay-prev' },
  }));
  fixed(prevButton, 'replay.prev');
  const playButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn pm-replay-play', attrs: { type: 'button', 'aria-pressed': 'false' }, dataset: { action: 'replay-play' },
  }));
  const nextButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', attrs: { type: 'button' }, dataset: { action: 'replay-next' },
  }));
  fixed(nextButton, 'replay.next');
  const sliderLabel = el('label', { className: 'pm-replay-slider-label', attrs: { for: sliderId } });
  const slider = /** @type {HTMLInputElement} */ (el('input', {
    className: 'pm-replay-slider', attrs: { id: sliderId, type: 'range', min: 0, max: 0, step: 1, value: 0 }, dataset: { field: 'replay-slider' },
  }));
  /** @param {'compact' | 'all'} value @param {string} key */
  const viewOption = (value, key) => {
    const radio = /** @type {HTMLInputElement} */ (el('input', {
      attrs: { type: 'radio', name: viewName, value }, dataset: { field: `replay-view-${value}` },
    }));
    radio.checked = value === 'compact';
    return { radio, label: el('label', { className: 'pm-toggle' }, radio, fixed(el('span'), key)) };
  };
  const compactOption = viewOption('compact', 'replay.view.compact');
  const allOption = viewOption('all', 'replay.view.all');
  const viewSet = el('fieldset', { className: 'pm-replay-view' },
    fixed(el('legend'), 'replay.view.label'), compactOption.label, allOption.label);
  const controls = el('div', { className: 'pm-replay-controls' },
    el('div', { className: 'pm-replay-buttons' }, prevButton, playButton, nextButton),
    el('div', { className: 'pm-replay-slider-row' }, sliderLabel, slider),
    viewSet);
  const visual = el('div', { className: 'pm-replay-visual' }, boardHost, now, live, controls);
  const main = el('div', { className: 'pm-replay-main', attrs: { hidden: '' } }, visual, el('div', { className: 'pm-replay-side' }, stagesBox, score));
  const closeButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', attrs: { type: 'button' }, dataset: { action: 'replay-close' },
  }));
  fixed(closeButton, closeKey);
  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', {
    className: 'pm-replay-dialog pm-pop', attrs: { 'aria-labelledby': titleId }, dataset: { role: 'replay-dialog', state: 'closed' },
  }, head, status, main, el('div', { className: 'pm-replay-actions' }, closeButton)));
  host.append(dialog);

  const controller = createReplayController({
    run,
    schedule: (fn, ms) => globalThis.setTimeout(fn, ms),
    unschedule: (handle) => globalThis.clearTimeout(/** @type {any} */ (handle)),
    onChange: (state) => draw(state),
  });

  /** @param {string[]} lines */
  function drawStatus(lines) {
    const key = lines.join('\n');
    if (key !== statusKey) {
      statusKey = key;
      status.replaceChildren(...lines.map((text) => el('p', { text })));
    }
  }

  /** @param {ReplayViewState} state */
  function drawStages(state) {
    const current = state.phase === 'ready' && state.result !== null ? state.result.steps[state.index].stage : 0;
    stages.replaceChildren(...stageList(state.result).map((entry) => {
      const item = el('li', {
        className: 'pm-replay-stage', dataset: { stage: String(entry.stage), mark: entry.mark ?? 'available' },
      }, el('span', { className: 'pm-replay-stage-name', text: write(entry.name) }),
      entry.markText === null ? null : el('span', { className: 'pm-replay-stage-mark', text: write(entry.markText) }));
      if (entry.stage === current) {
        item.setAttribute('aria-current', 'step');
      }
      return item;
    }));
  }

  /** @param {Row} row @returns {HTMLElement} */
  function rowElement(row) {
    const head = el('th', { className: 'pm-replay-row-head', attrs: { scope: 'row' } },
      el('span', { className: 'pm-replay-name', text: write(row.head) }),
      row.detail === null ? null : el('span', { className: 'pm-replay-detail', text: write(row.detail) }));
    const value = row.value;
    if (value === null) {
      head.setAttribute('colspan', '2');
    }
    return el('tr', { dataset: { row: row.id, ...(row.counted === undefined ? {} : { counted: String(row.counted) }) } },
      head,
      value === null ? null : el('td', { className: 'pm-replay-value', text: typeof value === 'number' ? format(value) : write(value) }));
  }

  /**
   * @param {import('../../core/engine/replay.js').Step} step
   * @param {readonly import('../../core/engine/replay.js').Step[]} steps
   */
  function drawScore(step, steps) {
    const table = scoreTable(step, steps);
    if (table.message !== null) {
      score.replaceChildren(el('p', { className: 'pm-replay-noscore', text: write(table.message) }));
      return;
    }
    score.replaceChildren(el('table', { className: 'pm-replay-table', dataset: { kind: table.kind } },
      el('caption', { text: t('replay.table.caption') }),
      el('tbody', {}, ...table.rows.map(rowElement))));
  }

  /** @param {ReplayViewState} state */
  function drawBoard(state) {
    if (boardView === null || source === null || state.result === null) {
      return;
    }
    const shown = boardOf(state.result.steps[state.index]);
    boardView.render({
      board: source.set.board, pieces: source.set.pieces, clues: shown.clues, placements: shown.placements,
      highlightedIds: shown.highlightedIds, showLabels: true, showPatterns: true,
    });
  }

  /** @param {ReplayViewState} state */
  function draw(state) {
    dialog.dataset.state = state.phase;
    const result = state.phase === 'ready' ? state.result : null;
    dialog.dataset.result = result === null ? '' : result.status;
    /** @type {string[]} */
    let lines = [];
    if (state.phase === 'loading') {
      lines = [t('replay.loading')];
    } else if (state.phase === 'failed' && state.failure !== null) {
      lines = [write(failureText(state.failure))];
    } else if (result !== null) {
      lines = statusText(result).map(write);
    }
    drawStatus(lines);
    main.hidden = state.phase !== 'loading' && result === null;
    visual.hidden = result === null;
    score.hidden = result === null;
    drawStages(state);
    if (result === null) {
      return;
    }
    const step = result.steps[state.index];
    const visible = controller.visible();
    const position = Math.max(0, visible.indexOf(state.index));
    const sentence = write(stepText(step));
    drawBoard(state);
    now.textContent = sentence;
    if (!state.playing && live.textContent !== sentence) {
      live.textContent = sentence;
    }
    playButton.setAttribute('aria-pressed', String(state.playing));
    playButton.dataset.playing = String(state.playing);
    playButton.replaceChildren(state.playing ? pauseIcon() : playIcon(), el('span', { text: t(state.playing ? 'replay.pause' : 'replay.play') }));
    slider.max = String(Math.max(0, visible.length - 1));
    slider.value = String(position);
    slider.setAttribute('aria-valuetext', sentence);
    sliderLabel.textContent = write({ key: 'replay.slider', params: { n: position + 1, total: visible.length } });
    compactOption.radio.checked = state.view === 'compact';
    allOption.radio.checked = state.view === 'all';
    drawScore(step, result.steps);
  }

  prevButton.addEventListener('click', () => controller.prev());
  nextButton.addEventListener('click', () => controller.next());
  playButton.addEventListener('click', () => {
    if (controller.getState().playing) {
      controller.pause();
    } else {
      controller.play();
    }
  });
  slider.addEventListener('input', () => {
    const at = controller.visible()[Number(slider.value)];
    if (at !== undefined) {
      controller.seek(at);
    }
  });
  for (const option of [compactOption, allOption]) {
    option.radio.addEventListener('change', () => {
      if (option.radio.checked) {
        controller.setView(/** @type {'compact' | 'all'} */ (option.radio.value));
      }
    });
  }
  closeX.addEventListener('click', () => dialog.close());
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    // A close event queued by an earlier closing can arrive after the dialog was opened again.
    if (dialog.open) {
      return;
    }
    controller.close();
    if (opener instanceof HTMLElement && opener.isConnected) {
      opener.focus();
    }
    opener = null;
  });

  return {
    element: dialog,
    /**
     * @param {ReplaySource} replaySource
     * @param {Element | null} [from] The control to give the focus back to (the focused element by default).
     */
    open(replaySource, from) {
      source = replaySource;
      opener = from ?? doc.activeElement;
      boardView?.destroy();
      boardHost.replaceChildren();
      boardView = mountBoard(boardHost, {
        mode: 'thumbnail', cellPx: cellPxOf(replaySource.set.board), label: t('replay.board'),
      });
      statusKey = '';
      live.textContent = '';
      controller.open(replaySource);
      if (!dialog.open) {
        dialog.showModal();
      }
      closeButton.focus();
    },
    close() {
      if (dialog.open) {
        dialog.close();
      }
    },
    isOpen: () => dialog.open,
    /** The language changed: the fixed texts are written again, then everything that depends on the step. */
    refreshTexts() {
      for (const [node, key] of fixedTexts) {
        node.textContent = t(key);
      }
      for (const [node, name, key] of fixedAttrs) {
        node.setAttribute(name, t(key));
      }
      boardView?.svg.setAttribute('aria-label', t('replay.board'));
      statusKey = '';
      const state = controller.getState();
      if (state.phase !== 'closed') {
        live.textContent = '';
        draw(state);
      }
    },
    dispose() {
      controller.dispose();
      boardView?.destroy();
      boardView = null;
      source = null;
      opener = null;
      if (dialog.open) {
        dialog.close();
      }
      dialog.remove();
    },
  };
}
