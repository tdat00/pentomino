// @ts-check
// The Generation steps section of step 3 (owner decision P-OD14; design §6.12, §10.5, §11.11): under "Pieces to place",
// the replay of the puzzle on show as a status line, a view switch and a table of its steps, grouped by stage. A row
// opens to show a small board of the step and its score table. The section is not a dialog: no modal, no focus trap.
// All logic that has no DOM is in `replay-model.js`; this file only draws it.

import { el } from '../../core/browser/dom.js';
import { displayColor, pieceLabelText } from '../../core/browser/piece-look.js';
import { mountBoard, svgEl } from '../../core/browser/svg-board.js';
import { formatNumber } from '../i18n.js';
import {
  boardOf, createStepsController, failureText, renderDesc, rowLabel, scoreTable, stageGroups, statusText, stepPieces,
  stepScore, stepTechniques, stepText,
} from './replay-model.js';

/** @typedef {import('./replay-model.js').ReplaySource} ReplaySource */
/** @typedef {import('./replay-model.js').StepsState} StepsState */
/** @typedef {import('./replay-model.js').StageGroup} StageGroup */
/** @typedef {import('./replay-model.js').Desc} Desc */
/** @typedef {import('./replay-model.js').Line} Line */
/** @typedef {import('./replay-model.js').Row} Row */
/** @typedef {import('../../core/engine/replay.js').ReplayResult} ReplayResult */

const COLUMNS = ['replay.col.step', 'replay.col.what', 'replay.col.pieces', 'replay.col.techniques', 'replay.col.score'];

let sectionCount = 0;

/**
 * Generation steps of step 3 (owner decision P-OD14; design §6.12, §10.5, §11.11).
 * @param {HTMLElement} host The puzzle detail; the section is appended as its last child.
 * @param {{ t: (key: string, params?: Record<string, unknown>) => string,
 *   run: (source: ReplaySource, signal: AbortSignal) => Promise<ReplayResult>,
 *   cache?: Pick<import('./replay-cache.js').ReplayCache, 'load' | 'save'>,
 *   cellPxOf: (board: { width: number, height: number }) => number }} options
 * @returns {{ element: HTMLElement, show(source: ReplaySource | null, context: { rotation: number, busy: boolean }): void,
 *   refreshTexts(): void, dispose(): void }}
 */
export function mountGenerationSteps(host, options) {
  const { t, run, cellPxOf, cache } = options;
  const doc = host.ownerDocument;
  sectionCount += 1;
  const uid = `generation-steps-${sectionCount}`;
  /** @param {number} n */
  const format = (n) => formatNumber(n, { maximumFractionDigits: 6 });
  /** @param {Desc} d */
  const write = (d) => renderDesc(d, t, format);
  /** @param {Line} line */
  const lineText = (line) => (typeof line === 'number' ? format(line) : Array.isArray(line) ? line.map(write).join(', ') : write(line));

  /** @type {[HTMLElement, string][]} */
  const fixedTexts = [];
  /**
   * @param {HTMLElement} node
   * @param {string} key
   * @returns {HTMLElement}
   */
  const fixed = (node, key) => {
    node.textContent = t(key);
    fixedTexts.push([node, key]);
    return node;
  };

  const title = fixed(el('h4', { className: 'steps-title', attrs: { id: `${uid}-title` } }), 'replay.title');
  const status = el('div', { className: 'steps-status', attrs: { role: 'status' }, dataset: { role: 'steps-status' } });
  const retry = /** @type {HTMLButtonElement} */ (fixed(el('button', {
    className: 'steps-retry', attrs: { type: 'button', hidden: '' }, dataset: { action: 'steps-retry' },
  }), 'replay.retry'));
  // Show generation steps / Hide generation steps, like Show solution; its text follows `expanded` (see `syncToggle`).
  const reveal = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'steps-reveal', attrs: { type: 'button', hidden: '', 'aria-expanded': 'false' }, dataset: { action: 'steps-reveal' },
  }));
  /**
   * @param {'compact' | 'all'} value
   * @param {string} key
   */
  const viewOption = (value, key) => {
    const radio = /** @type {HTMLInputElement} */ (el('input', {
      attrs: { type: 'radio', name: `${uid}-view`, value }, dataset: { field: `steps-view-${value}` },
    }));
    radio.checked = value === 'compact';
    radio.addEventListener('change', () => {
      if (radio.checked) {
        controller.setView(value);
      }
    });
    return { radio, label: el('label', { className: 'pm-toggle' }, radio, fixed(el('span'), key)) };
  };
  const compactOption = viewOption('compact', 'replay.view.compact');
  const allOption = viewOption('all', 'replay.view.all');
  const viewSet = el('fieldset', { className: 'steps-view', attrs: { hidden: '' } },
    fixed(el('legend'), 'replay.view.label'), compactOption.label, allOption.label);
  const table = /** @type {HTMLTableElement} */ (el('table', {
    className: 'steps-table', attrs: { role: 'table', 'aria-labelledby': `${uid}-title`, hidden: '' },
  }, el('thead', { attrs: { role: 'rowgroup' } }, el('tr', { attrs: { role: 'row' } },
    ...COLUMNS.map((key) => fixed(el('th', { attrs: { scope: 'col', role: 'columnheader' } }), key))))));
  const section = el('section', {
    className: 'generation-steps', dataset: { role: 'generation-steps', phase: 'idle', result: '' },
  }, el('div', { className: 'steps-head' }, title, reveal), status, retry, viewSet, table);
  host.append(section);

  const controller = createStepsController({ run, cache, onChange: (state) => draw(state) });
  /** @type {StepsState} */
  let current = controller.getState();
  let context = { rotation: 0, busy: false };
  // The steps are shown for the puzzle on show only after the player pressed the button; the player can hide them again.
  /** @type {ReplaySource | null} */
  let shownSource = null;
  let expanded = false;
  let drawCount = 0;
  let statusKey = '';
  /** @type {ReplayResult | null} */
  let drawnResult = null;
  /** @type {'compact' | 'all' | null} */
  let drawnView = null;
  /** @type {number | null} */
  let drawnExpanded = null;
  /** @type {{ index: number, row: HTMLElement, view: ReturnType<typeof mountBoard> } | null} */
  let openBoard = null;

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
   * @returns {HTMLElement}
   */
  function scoreElement(step, steps) {
    const scores = scoreTable(step, steps);
    if (scores.message !== null) {
      return el('p', { className: 'pm-replay-noscore', text: write(scores.message) });
    }
    return el('table', { className: 'pm-replay-table', dataset: { kind: scores.kind } },
      el('caption', { text: t('replay.table.caption') }),
      el('tbody', {}, ...scores.rows.map(rowElement)));
  }

  /**
   * @param {string} id
   * @param {ReplaySource} source
   * @returns {HTMLElement}
   */
  function chip(id, source) {
    const piece = source.set.pieces.find((candidate) => candidate.id === id);
    if (piece === undefined) {
      return el('span', { className: 'steps-piece', dataset: { pieceId: id }, text: id });
    }
    const swatch = svgEl('svg', { class: 'steps-swatch', viewBox: '0 0 10 10', 'aria-hidden': 'true', focusable: 'false' },
      svgEl('rect', { x: 0.5, y: 0.5, width: 9, height: 9, rx: 1.5, fill: displayColor(piece.color) }));
    return el('span', { className: 'steps-piece', dataset: { pieceId: id } }, swatch, el('span', { text: pieceLabelText(piece.label) }));
  }

  /**
   * @param {string} className
   * @param {string} labelKey
   * @param {...(Node | string)} content
   * @returns {HTMLElement}
   */
  function cell(className, labelKey, ...content) {
    const node = el('td', { className, attrs: { role: 'cell' }, dataset: { label: t(labelKey) } }, ...content);
    if (content.length === 0) {
      node.textContent = t('replay.cell.none');
    }
    return node;
  }

  /**
   * @param {string} className
   * @param {string} labelKey
   * @param {Line[]} lines
   * @returns {HTMLElement}
   */
  function linesCell(className, labelKey, lines) {
    return cell(className, labelKey, ...lines.map((line) => el('span', { className: 'steps-line', text: lineText(line) })));
  }

  /**
   * @param {number} index
   * @param {ReplayResult} result
   * @param {ReplaySource} source
   * @returns {HTMLElement}
   */
  function stepRow(index, result, source) {
    const step = result.steps[index];
    const toggle = el('button', {
      className: 'steps-toggle', attrs: { type: 'button', 'aria-expanded': 'false' }, dataset: { action: 'steps-toggle' },
    }, el('span', { className: 'steps-toggle-icon', attrs: { 'aria-hidden': 'true' }, text: '▸' }),
    el('span', { className: 'steps-toggle-label', text: write(rowLabel(index)) }));
    toggle.addEventListener('click', () => controller.toggle(index));
    const pieces = stepPieces(step, source.set);
    return el('tr', { className: 'steps-row', attrs: { role: 'row' }, dataset: { index: String(index), kind: step.kind } },
      el('th', { attrs: { scope: 'row', role: 'rowheader' } }, toggle),
      cell('steps-what', 'replay.col.what', write(stepText(step))),
      cell('steps-pieces', 'replay.col.pieces',
        ...(pieces.length === 0 ? [] : [el('span', { className: 'steps-chips' }, ...pieces.map((id) => chip(id, source)))])),
      linesCell('steps-techniques', 'replay.col.techniques', stepTechniques(step)),
      linesCell('steps-score', 'replay.col.score', stepScore(step)));
  }

  /**
   * @param {StageGroup} group
   * @param {ReplayResult} result
   * @param {ReplaySource} source
   * @returns {HTMLElement}
   */
  function groupBody(group, result, source) {
    return el('tbody', { className: 'steps-group', attrs: { role: 'rowgroup' }, dataset: { stage: String(group.stage) } },
      el('tr', { className: 'steps-stage', attrs: { role: 'row' }, dataset: { mark: group.mark ?? 'available' } },
        el('th', { attrs: { scope: 'rowgroup', colspan: '5', role: 'rowheader' } },
          el('span', { className: 'steps-stage-name', text: write(group.heading) }),
          group.markText === null ? null : el('span', { className: 'steps-stage-mark', text: write(group.markText) }))),
      ...group.indices.map((index) => stepRow(index, result, source)));
  }

  /**
   * @param {HTMLElement} row
   * @param {boolean} open
   * @param {string} controls
   */
  function setToggle(row, open, controls) {
    const button = row.querySelector('button.steps-toggle');
    if (button === null) {
      return;
    }
    button.setAttribute('aria-expanded', String(open));
    if (open) {
      button.setAttribute('aria-controls', controls);
    } else {
      button.removeAttribute('aria-controls');
    }
    const icon = button.querySelector('.steps-toggle-icon');
    if (icon !== null) {
      icon.textContent = open ? '▾' : '▸';
    }
  }

  /** @param {number} index @returns {HTMLElement | null} */
  function rowOf(index) {
    return table.querySelector(`tr.steps-row[data-index="${index}"]`);
  }

  function renderBoard() {
    const { source, result } = current;
    if (openBoard === null || source === null || result === null) {
      return;
    }
    const shown = boardOf(result.steps[openBoard.index]);
    openBoard.view.render({
      board: source.set.board, pieces: source.set.pieces, clues: shown.clues, placements: shown.placements,
      highlightedIds: shown.highlightedIds, showLabels: true, showPatterns: true,
    });
  }

  function closeBoard() {
    if (openBoard !== null) {
      openBoard.view.destroy();
      openBoard.row.remove();
      openBoard = null;
    }
  }

  /** @param {number} index The open step: its row gets a row under it with its small board and its score table. */
  function openStep(index) {
    const { source, result } = current;
    const row = rowOf(index);
    if (row === null || source === null || result === null) {
      return;
    }
    const id = `${uid}-detail-${index}`;
    setToggle(row, true, id);
    const boardHost = el('div', { className: 'steps-board' });
    const detail = el('tr', { className: 'steps-detail', attrs: { role: 'row', id }, dataset: { index: String(index) } },
      el('td', { attrs: { colspan: '5', role: 'cell' } },
        el('div', { className: 'steps-detail-body' }, boardHost,
          el('div', { className: 'steps-score-table' }, scoreElement(result.steps[index], result.steps)))));
    row.after(detail);
    openBoard = {
      index,
      row: detail,
      view: mountBoard(boardHost, {
        mode: 'thumbnail', cellPx: cellPxOf(source.set.board), rotation: context.rotation, label: t('replay.board'),
      }),
    };
    renderBoard();
  }

  /** @param {number} index */
  function closeStep(index) {
    closeBoard();
    const row = rowOf(index);
    if (row !== null) {
      setToggle(row, false, '');
    }
  }

  function clearBody() {
    closeBoard();
    for (const body of [...table.tBodies]) {
      body.remove();
    }
    drawnResult = null;
    drawnView = null;
    drawnExpanded = null;
  }

  /** @param {StepsState & { result: ReplayResult, source: ReplaySource }} state */
  function drawTable(state) {
    const active = doc.activeElement;
    const focused = active !== null && section.contains(active) && active.matches('button.steps-toggle')
      ? active.closest('tr')?.getAttribute('data-index') ?? null
      : null;
    clearBody();
    const groups = stageGroups(state.result, controller.visible());
    table.append(...groups.map((group) => groupBody(group, state.result, state.source)));
    drawnResult = state.result;
    drawnView = state.view;
    if (state.expanded !== null) {
      openStep(state.expanded);
      drawnExpanded = state.expanded;
    }
    if (focused !== null) {
      /** @type {HTMLElement | null} */
      const button = table.querySelector(`tr.steps-row[data-index="${focused}"] button.steps-toggle`);
      button?.focus({ preventScroll: true });
    }
  }

  /** @param {StepsState} state @returns {string[]} */
  function statusLines(state) {
    if (state.phase === 'loading') {
      return [t(context.busy ? 'replay.waiting' : 'replay.loading')];
    }
    if (state.phase === 'failed' && state.failure !== null) {
      return [write(failureText(state.failure))];
    }
    if (state.phase === 'ready' && state.result !== null) {
      return statusText(state.result).map(write);
    }
    return [];
  }

  /** @param {string[]} lines Written again only when the text changed, so that a redraw announces nothing. */
  function drawStatus(lines) {
    const key = lines.join('\n');
    if (key !== statusKey) {
      statusKey = key;
      status.replaceChildren(...lines.map((text) => el('p', { text })));
    }
  }

  /** @param {StepsState} state */
  function draw(state) {
    drawCount += 1;
    current = state;
    const result = state.phase === 'ready' ? state.result : null;
    const ready = result !== null && state.source !== null;
    section.dataset.phase = state.phase;
    section.dataset.result = result === null ? '' : result.status;
    drawStatus(statusLines(state));
    retry.hidden = state.phase !== 'failed';
    viewSet.hidden = !ready;
    table.hidden = !ready;
    compactOption.radio.checked = state.view === 'compact';
    allOption.radio.checked = state.view === 'all';
    if (!ready) {
      clearBody();
      return;
    }
    const shown = /** @type {StepsState & { result: ReplayResult, source: ReplaySource }} */ (state);
    if (drawnResult !== shown.result || drawnView !== shown.view) {
      drawTable(shown);
    } else if (drawnExpanded !== shown.expanded) {
      if (drawnExpanded !== null) {
        closeStep(drawnExpanded);
      }
      drawnExpanded = null;
      if (shown.expanded !== null) {
        openStep(shown.expanded);
        drawnExpanded = shown.expanded;
      }
    }
  }

  retry.addEventListener('click', () => controller.retry());
  reveal.addEventListener('click', () => {
    if (shownSource === null) {
      return;
    }
    expanded = !expanded;
    place(shownSource);
  });

  function syncToggle() {
    reveal.textContent = t(expanded ? 'replay.hide' : 'replay.reveal');
    reveal.setAttribute('aria-expanded', String(expanded));
  }

  /**
   * The steps are hidden for every puzzle until the player shows them (a saved replay then appears at once).
   * @param {ReplaySource | null} source
   */
  function place(source) {
    const changed = source === null || shownSource === null || shownSource.set !== source.set || shownSource.puzzle.id !== source.puzzle.id;
    if (changed) {
      expanded = false;
    }
    shownSource = source;
    reveal.hidden = source === null;
    syncToggle();
    controller.show(source !== null && expanded ? source : null);
  }

  return {
    element: section,
    /**
     * @param {ReplaySource | null} source
     * @param {{ rotation: number, busy: boolean }} next
     */
    show(source, next) {
      const busyChanged = next.busy !== context.busy;
      const rotationChanged = next.rotation !== context.rotation;
      context = { rotation: next.rotation, busy: next.busy };
      const before = drawCount;
      place(source);
      if (drawCount === before && busyChanged && current.phase === 'loading') {
        drawStatus(statusLines(current));
      }
      if (rotationChanged && openBoard !== null) {
        openBoard.view.setRotation(context.rotation);
        renderBoard();
      }
    },
    /** The language changed: the fixed texts are written again, then the status line and the table. */
    refreshTexts() {
      for (const [node, key] of fixedTexts) {
        node.textContent = t(key);
      }
      syncToggle();
      openBoard?.view.svg.setAttribute('aria-label', t('replay.board'));
      statusKey = '';
      drawnResult = null;
      draw(current);
    },
    dispose() {
      controller.dispose();
      closeBoard();
      section.remove();
    },
  };
}
