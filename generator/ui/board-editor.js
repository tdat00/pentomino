// @ts-check
// Generator board panel (design §10.2): size, presets, view rotation, painting with undo,
// trim, status and notices. Rendering and hit-testing are the shared SVG board in edit mode;
// every board change goes through the store as a new immutable board.
import { el, showToast } from '../../core/browser/dom.js';
import { mountBoard } from '../../core/browser/svg-board.js';
import { MAX_SIDE, preset, rectangle, trimMargins } from '../../core/engine/board.js';
import { arrowToGrid, normalizeAngle } from '../../core/engine/view.js';
import { CONFIRM_RESET, CONFIRM_RESIZE, CONFIRM_STALE, PRESET_LABELS } from '../strings.js';
import {
  DEFAULT_COLS, DEFAULT_ROWS, MIN_EDIT_SIDE, boardsEqual, createEditHistory, describeBoard, hasBlockedCells, isBusy,
  needsStaleConfirm, resizeBoard, setCell, withBoard,
} from '../state.js';

/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('../state.js').GeneratorState} GeneratorState */
/** @typedef {import('../../core/engine/types.js').Board} Board */
/** @typedef {import('../../core/engine/types.js').XY} XY */
/** @typedef {'rectangle' | 'heart' | 'diamond' | 'cross' | 'ring'} PresetId */

const CONFIRM_PRESET = 'Applying a preset replaces the current board. Continue?';
const PRESET_DEFAULT_N = Object.freeze({ heart: 10, diamond: 8, cross: 9, ring: 8 });
const ARROWS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
let editorCounter = 0;

/**
 * @typedef {object} BoardEditorOptions
 * @property {GeneratorStore} store
 * @property {{ phone: boolean }} hardware
 * @property {(message: string) => boolean} [confirm] Defaults to `window.confirm`.
 * @property {ReturnType<typeof createEditHistory>} [history]
 * @property {(message: string) => void} [notify] Defaults to a toast.
 */

/**
 * @param {HTMLElement} host Element that receives the panel contents.
 * @param {BoardEditorOptions} options
 */
export function mountBoardEditor(host, options) {
  const { store, hardware } = options;
  const doc = host.ownerDocument;
  const confirmFn = options.confirm ?? ((message) => globalThis.confirm(message));
  const notify = options.notify ?? ((message) => void showToast(message, { kind: 'warning' }));
  const history = options.history ?? createEditHistory();
  const uid = `board-editor-${(editorCounter += 1)}`;

  const sideAttrs = { type: 'number', min: MIN_EDIT_SIDE, max: MAX_SIDE, step: 1, inputmode: 'numeric' };
  const colsInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { ...sideAttrs, 'data-field': 'columns' } }));
  const rowsInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { ...sideAttrs, 'data-field': 'rows' } }));
  const presetSelect = /** @type {HTMLSelectElement} */ (el('select', { attrs: { 'data-field': 'preset' } },
    ...Object.entries(PRESET_LABELS).map(([value, label]) => el('option', { text: label, attrs: { value } }))));
  const sizeInput = /** @type {HTMLInputElement} */ (el('input', {
    attrs: { ...sideAttrs, min: 4, value: PRESET_DEFAULT_N.heart, 'data-field': 'preset-size' },
  }));
  const lobesInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'round-lobes' } }));
  const sizeLabel = el('label', { className: 'field', dataset: { role: 'preset-size' } }, el('span', { text: 'Size N' }), sizeInput);
  const lobesLabel = el('label', { className: 'pm-toggle', dataset: { role: 'round-lobes' } }, lobesInput, el('span', { text: 'Round lobes' }));
  const viewLeft = /** @type {HTMLButtonElement} */ (el('button', {
    text: '⟲ 45°', attrs: { type: 'button', 'aria-label': 'Rotate view left 45 degrees', 'data-action': 'view-left' },
  }));
  const viewRight = /** @type {HTMLButtonElement} */ (el('button', {
    text: '⟳ 45°', attrs: { type: 'button', 'aria-label': 'Rotate view right 45 degrees', 'data-action': 'view-right' },
  }));
  const viewAngle = el('span', { className: 'view-angle', dataset: { role: 'view-angle' } });
  const unrotatedInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'edit-unrotated' } }));
  const trimButton = /** @type {HTMLButtonElement} */ (el('button', { text: 'Trim margins', attrs: { type: 'button', 'data-action': 'trim' } }));
  const undoButton = /** @type {HTMLButtonElement} */ (el('button', { text: 'Undo', attrs: { type: 'button', 'data-action': 'undo' } }));
  const resetButton = /** @type {HTMLButtonElement} */ (el('button', { text: 'Reset', attrs: { type: 'button', 'data-action': 'reset' } }));
  const hint = el('p', {
    className: 'hint',
    text: 'Click or drag to block or unblock squares. With the keyboard, use the arrow keys to move and Space to toggle.',
    attrs: { id: `${uid}-hint` },
  });
  const boardHost = el('div', { className: 'board-host', dataset: { role: 'board-host' } });
  const status = el('p', { className: 'board-status', attrs: { role: 'status' }, dataset: { role: 'board-status' } });
  const noticeList = el('ul', { className: 'notices', dataset: { role: 'board-notices' } });

  const panel = el('div', { className: 'board-editor' },
    el('div', { className: 'control-row' },
      el('label', { className: 'field' }, el('span', { text: 'Columns' }), colsInput),
      el('label', { className: 'field' }, el('span', { text: 'Rows' }), rowsInput),
      el('label', { className: 'field' }, el('span', { text: 'Preset' }), presetSelect),
      sizeLabel,
      lobesLabel),
    el('div', { className: 'control-row' },
      el('span', { className: 'control-label', text: 'View' }), viewLeft, viewRight, viewAngle,
      el('label', { className: 'pm-toggle' }, unrotatedInput, el('span', { text: 'Edit unrotated' }))),
    el('div', { className: 'control-row' }, trimButton, undoButton, resetButton),
    hint,
    boardHost,
    status,
    noticeList);
  host.append(panel);

  /** @type {XY | null} */
  let cursor = null;
  let cursorVisible = false;
  /** One painting gesture: the value painted by every cell of the drag. @type {null | { value: 0 | 1, start: Board, declined: boolean }} */
  let gesture = null;
  /** @type {Board | null} */
  let renderedBoard = null;
  let activePreset = 'rectangle';
  let destroyed = false;

  const initial = store.getState();
  const view = mountBoard(boardHost, {
    mode: 'edit',
    rotation: initial.editUnrotated ? 0 : initial.rotation,
    autoFit: true,
    label: 'Board editor',
    describedBy: hint.id,
    onCell: (cell, event) => paintFrom(cell, event),
  });
  const surface = view.surface;
  surface.tabIndex = 0;
  surface.setAttribute('role', 'group');
  surface.setAttribute('aria-label', 'Board editor');
  surface.setAttribute('aria-describedby', hint.id);

  /**
   * One prompt for everything an edit puts at risk.
   * @param {{ resizing?: boolean, replacing?: string }} [risk]
   * @returns {boolean} Whether the edit may go ahead.
   */
  function confirmEdit(risk = {}) {
    const state = store.getState();
    const messages = [];
    if (needsStaleConfirm(state)) {
      messages.push(CONFIRM_STALE);
    }
    if (risk.resizing && hasBlockedCells(state.board)) {
      messages.push(CONFIRM_RESIZE);
    }
    if (risk.replacing && hasBlockedCells(state.board)) {
      messages.push(risk.replacing);
    }
    return messages.length === 0 || confirmFn(messages.join('\n\n'));
  }

  /**
   * Commits one structural edit as one undo step.
   * @param {Board} board
   * @param {number} [rotation]
   */
  function commitBoard(board, rotation) {
    const before = store.getState().board;
    store.update((state) => withBoard(state, board, rotation ?? state.rotation));
    if (!boardsEqual(before, board)) {
      history.record(before);
    }
    syncControls(store.getState());
  }

  /**
   * @param {number} cols
   * @param {number} rows
   * @returns {boolean} Whether the board now has that size.
   */
  function resize(cols, rows) {
    const state = store.getState();
    if (isBusy(state)) {
      return false;
    }
    let board;
    try {
      board = resizeBoard(state.board, cols, rows);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Invalid board size');
      return false;
    }
    if (board === state.board) {
      return true;
    }
    if (!confirmEdit({ resizing: true })) {
      return false;
    }
    commitBoard(board);
    return true;
  }

  /**
   * @param {PresetId} id
   * @param {{ n?: number, w?: number, h?: number, roundLobes?: boolean }} [params]
   * @returns {boolean}
   */
  function applyPreset(id, params = {}) {
    const state = store.getState();
    if (isBusy(state)) {
      return false;
    }
    let made;
    try {
      made = preset(id, params);
      const { width, height } = made.board;
      if (width < MIN_EDIT_SIDE || height < MIN_EDIT_SIDE || width > MAX_SIDE || height > MAX_SIDE) {
        throw new RangeError(`The board must be ${MIN_EDIT_SIDE}–${MAX_SIDE} squares wide and tall`);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Invalid preset');
      return false;
    }
    if (boardsEqual(made.board, state.board) && made.rotation === state.rotation) {
      return true;
    }
    if (!confirmEdit({ replacing: CONFIRM_PRESET })) {
      return false;
    }
    commitBoard(made.board, made.rotation);
    return true;
  }

  /** @returns {boolean} */
  function applySelectedPreset() {
    const id = /** @type {PresetId} */ (presetSelect.value);
    return id === 'rectangle'
      ? applyPreset('rectangle', { w: Number(colsInput.value), h: Number(rowsInput.value) })
      : applyPreset(id, { n: Number(sizeInput.value), roundLobes: id === 'heart' && lobesInput.checked });
  }

  /** @returns {boolean} */
  function reset() {
    const state = store.getState();
    if (isBusy(state)) {
      return false;
    }
    const board = rectangle(DEFAULT_COLS, DEFAULT_ROWS);
    if (boardsEqual(board, state.board) && state.rotation === 0) {
      return true;
    }
    if (!confirmEdit({ replacing: CONFIRM_RESET })) {
      return false;
    }
    activePreset = 'rectangle';
    presetSelect.value = activePreset;
    commitBoard(board, 0);
    return true;
  }

  /** @returns {boolean} */
  function trim() {
    const state = store.getState();
    if (isBusy(state)) {
      return false;
    }
    const board = trimMargins(state.board);
    if (boardsEqual(board, state.board)) {
      return true;
    }
    if (!confirmEdit()) {
      return false;
    }
    commitBoard(board);
    return true;
  }

  /** @returns {boolean} */
  function undo() {
    const state = store.getState();
    if (isBusy(state) || !history.canUndo() || !confirmEdit()) {
      return false;
    }
    const board = /** @type {Board} */ (history.undo());
    store.update((s) => withBoard(s, board));
    syncControls(store.getState());
    return true;
  }

  /** @param {number} delta Degrees counter-clockwise; ⟲ is +45 and ⟳ is −45. */
  function rotate(delta) {
    store.update((state) => ({ ...state, rotation: normalizeAngle(state.rotation + delta) }));
  }

  /**
   * @param {XY} cell
   * @param {PointerEvent} event
   */
  function paintFrom(cell, event) {
    const state = store.getState();
    if (isBusy(state)) {
      return;
    }
    if (event.type === 'pointerdown') {
      endGesture();
      if (!confirmEdit()) {
        gesture = { value: 0, start: state.board, declined: true };
        return;
      }
      // The first cell decides the gesture's paint value: block or unblock.
      gesture = { value: state.board.active[cell[1] * state.board.width + cell[0]] === 1 ? 0 : 1, start: state.board, declined: false };
    }
    if (gesture === null || gesture.declined) {
      return;
    }
    const { value } = gesture;
    cursor = cell;
    store.update((s) => withBoard(s, setCell(s.board, cell[0], cell[1], value)));
  }

  function endGesture() {
    const done = gesture;
    gesture = null;
    if (done !== null && !done.declined && !boardsEqual(done.start, store.getState().board)) {
      history.record(done.start);
      syncControls(store.getState());
    }
  }

  /** @param {KeyboardEvent} event */
  function onKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && (event.key === 'z' || event.key === 'Z')) {
      event.preventDefault();
      undo();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const state = store.getState();
    const board = state.board;
    const [x, y] = cursor ?? [0, 0];
    if (ARROWS.has(event.key)) {
      event.preventDefault();
      const [dx, dy] = arrowToGrid(state.editUnrotated ? 0 : state.rotation, /** @type {'ArrowLeft'} */ (event.key));
      cursor = [Math.min(board.width - 1, Math.max(0, x + dx)), Math.min(board.height - 1, Math.max(0, y + dy))];
      cursorVisible = true;
      renderBoard(state);
    } else if (event.key === ' ') {
      event.preventDefault();
      if (isBusy(state)) {
        return;
      }
      cursor = [x, y];
      cursorVisible = true;
      if (confirmEdit()) {
        commitBoard(setCell(board, x, y, board.active[y * board.width + x] === 1 ? 0 : 1));
      }
    }
  }

  /**
   * @param {GeneratorState} state
   * @returns {ReturnType<typeof describeBoard>}
   */
  function renderBoard(state) {
    const description = describeBoard(state, hardware);
    const theta = state.editUnrotated ? 0 : state.rotation;
    let refit = false;
    if (view.getState().rotation !== theta) {
      view.setRotation(theta);
      refit = true;
    }
    if (renderedBoard !== null && (renderedBoard.width !== state.board.width || renderedBoard.height !== state.board.height)) {
      refit = true;
    }
    renderedBoard = state.board;
    if (cursor !== null) {
      cursor = [Math.min(cursor[0], state.board.width - 1), Math.min(cursor[1], state.board.height - 1)];
    }
    view.render({
      board: state.board,
      pieces: [],
      clues: [],
      placements: [],
      showLabels: false,
      showPatterns: false,
      invalidCells: description.invalidCells,
      cursor: cursorVisible ? cursor : null,
    });
    if (refit) {
      view.fit();
    }
    return description;
  }

  /** @param {GeneratorState} state */
  function syncControls(state) {
    if (destroyed) {
      return;
    }
    const busy = isBusy(state);
    for (const [input, value] of /** @type {const} */ ([[colsInput, state.board.width], [rowsInput, state.board.height]])) {
      if (doc.activeElement !== input) {
        input.value = String(value);
      }
    }
    sizeLabel.hidden = presetSelect.value === 'rectangle';
    lobesLabel.hidden = presetSelect.value !== 'heart';
    for (const control of [colsInput, rowsInput, presetSelect, sizeInput, lobesInput, resetButton]) {
      control.disabled = busy;
    }
    trimButton.disabled = busy || boardsEqual(trimMargins(state.board), state.board);
    undoButton.disabled = busy || !history.canUndo();
    unrotatedInput.checked = state.editUnrotated;
    viewAngle.textContent = `${state.rotation}°`;
    boardHost.dataset.busy = String(busy);
  }

  /** @param {GeneratorState} state */
  function render(state) {
    if (destroyed) {
      return;
    }
    const description = renderBoard(state);
    syncControls(state);
    status.textContent = description.statusText;
    status.dataset.valid = String(description.valid);
    noticeList.replaceChildren(...description.notices
      .filter((notice) => notice.code !== 'N-LEVELS')
      .map((notice) => el('li', { className: `notice notice-${notice.kind}`, text: notice.text, dataset: { code: notice.code } })));
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

  /** @param {HTMLInputElement} input */
  const commitSize = (input) => {
    if (!resize(Number(colsInput.value), Number(rowsInput.value))) {
      const { board } = store.getState();
      colsInput.value = String(board.width);
      rowsInput.value = String(board.height);
      input.focus();
    }
  };
  listen(colsInput, 'change', () => commitSize(colsInput));
  listen(rowsInput, 'change', () => commitSize(rowsInput));
  listen(presetSelect, 'change', () => {
    const id = presetSelect.value;
    if (id !== 'rectangle') {
      sizeInput.value = String(PRESET_DEFAULT_N[/** @type {keyof typeof PRESET_DEFAULT_N} */ (id)]);
    }
    if (applySelectedPreset()) {
      activePreset = id;
    } else {
      presetSelect.value = activePreset;
    }
    syncControls(store.getState());
  });
  listen(sizeInput, 'change', applySelectedPreset);
  listen(lobesInput, 'change', applySelectedPreset);
  listen(viewLeft, 'click', () => rotate(45));
  listen(viewRight, 'click', () => rotate(-45));
  listen(unrotatedInput, 'change', () => store.update({ editUnrotated: unrotatedInput.checked }));
  listen(trimButton, 'click', trim);
  listen(undoButton, 'click', undo);
  listen(resetButton, 'click', reset);
  listen(surface, 'keydown', onKeyDown);
  listen(surface, 'pointerup', endGesture);
  listen(surface, 'pointercancel', endGesture);
  listen(surface, 'lostpointercapture', endGesture);
  listen(surface, 'focus', () => {
    cursorVisible = true;
    cursor ??= [0, 0];
    renderBoard(store.getState());
  });
  listen(surface, 'blur', () => {
    cursorVisible = false;
    renderBoard(store.getState());
  });

  const unsubscribe = store.subscribe((state) => render(state));
  render(store.getState());

  return {
    element: panel,
    view,
    history,
    resize,
    applyPreset,
    reset,
    trim,
    undo,
    rotate,
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
      view.destroy();
      panel.remove();
    },
  };
}
