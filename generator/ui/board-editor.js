// @ts-check
// Generator board panel (design §10.2): size, presets, view rotation, painting, status and notices.
// Rendering and hit-testing are the shared SVG board in edit mode; every board change goes through the
// store as a new immutable board (Ctrl+Z undoes the last one).
import { el, showToast } from '../../core/browser/dom.js';
import { mountBoard } from '../../core/browser/svg-board.js';
import { MAX_SIDE, preset } from '../../core/engine/board.js';
import { arrowToGrid, normalizeAngle } from '../../core/engine/view.js';
import { t } from '../i18n.js';
import {
  MIN_EDIT_SIDE, boardsEqual, createEditHistory, describeBoard, isBusy, resizeBoard, setCell, withBoard,
} from '../state.js';
import { loc, locAttrs } from './i18n-dom.js';

/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('../state.js').GeneratorState} GeneratorState */
/** @typedef {import('../../core/engine/types.js').Board} Board */
/** @typedef {import('../../core/engine/types.js').XY} XY */
/** @typedef {'rectangle' | 'heart' | 'diamond' | 'cross' | 'ring'} PresetId */

const PRESET_IDS = Object.freeze(['rectangle', 'heart', 'diamond', 'cross', 'ring']);
const PRESET_DEFAULT_N = Object.freeze({ heart: 10, diamond: 8, cross: 9, ring: 8 });
const ARROWS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const ZOOM_STEP = 1.25;
let editorCounter = 0;

/**
 * @typedef {object} BoardEditorOptions
 * @property {GeneratorStore} store
 * @property {{ phone: boolean }} hardware
 * @property {HTMLElement | null} [controlsHost] Where Columns, Rows and Preset go; defaults to the top of the panel.
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
  const notify = options.notify ?? ((message) => void showToast(message, { kind: 'warning' }));
  const history = options.history ?? createEditHistory();
  const uid = `board-editor-${(editorCounter += 1)}`;

  const sideAttrs = { type: 'number', min: MIN_EDIT_SIDE, max: MAX_SIDE, step: 1, inputmode: 'numeric' };
  const colsInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { ...sideAttrs, 'data-field': 'columns' } }));
  const rowsInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { ...sideAttrs, 'data-field': 'rows' } }));
  const presetSelect = /** @type {HTMLSelectElement} */ (el('select', { attrs: { 'data-field': 'preset' } },
    ...PRESET_IDS.map((value) => loc(`board.preset.${value}`, { attrs: { value } }, 'option'))));
  const toolButton = (/** @type {string} */ text, /** @type {string} */ key, /** @type {string} */ action) => /** @type {HTMLButtonElement} */ (el('button', {
    className: 'rotate-btn', text, attrs: { type: 'button', ...locAttrs({ 'aria-label': key, title: key }), 'data-action': action },
  }));
  const viewLeft = toolButton('⟲', 'board.rotateLeft', 'view-left');
  const viewRight = toolButton('⟳', 'board.rotateRight', 'view-right');
  const zoomOutButton = toolButton('−', 'board.zoomOut', 'zoom-out');
  const zoomInButton = toolButton('+', 'board.zoomIn', 'zoom-in');
  const fitButton = toolButton('⤢', 'board.zoomFit', 'zoom-fit');
  const panButton = toolButton('✥', 'board.pan', 'pan-toggle');
  panButton.setAttribute('aria-pressed', 'false');
  const hint = loc('board.hint', { className: 'hint', attrs: { id: `${uid}-hint` } }, 'p');
  const boardHost = el('div', { className: 'board-host', dataset: { role: 'board-host' } });
  const status = el('p', { className: 'board-status', attrs: { role: 'status' }, dataset: { role: 'board-status' } });
  const noticeList = el('ul', { className: 'notices', dataset: { role: 'board-notices' } });

  const controls = el('div', { className: 'control-row' },
    el('label', { className: 'field field-wide' }, loc('board.preset'), presetSelect),
    el('label', { className: 'field' }, loc('board.rows'), rowsInput),
    el('label', { className: 'field' }, loc('board.columns'), colsInput));
  const controlsHost = options.controlsHost ?? null;
  const panel = el('div', { className: 'board-editor' },
    ...(controlsHost === null ? [controls] : []),
    hint,
    el('div', { className: 'board-frame' },
      boardHost,
      el('div', { className: 'board-tools' }, panButton, zoomOutButton, zoomInButton, fitButton, viewLeft, viewRight)),
    status,
    noticeList);
  host.append(panel);
  controlsHost?.append(controls);

  /** @type {XY | null} */
  let cursor = null;
  let cursorVisible = false;
  /** One painting gesture: the value painted by every cell of the drag. @type {null | { value: 0 | 1, start: Board }} */
  let gesture = null;
  /** @type {Board | null} */
  let renderedBoard = null;
  let activePreset = 'rectangle';
  let destroyed = false;

  const initial = store.getState();
  const view = mountBoard(boardHost, {
    mode: 'edit',
    rotation: initial.rotation,
    autoFit: true,
    label: t('board.label'),
    describedBy: hint.id,
    onCell: (cell, event) => paintFrom(cell, event),
  });
  const surface = view.surface;
  surface.tabIndex = 0;
  surface.setAttribute('role', 'group');
  surface.setAttribute('aria-label', t('board.label'));
  surface.setAttribute('aria-describedby', hint.id);

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
      notify(error instanceof RangeError ? t('board.error.size', { min: MIN_EDIT_SIDE, max: MAX_SIDE }) : t('board.error.invalid'));
      return false;
    }
    if (board === state.board) {
      return true;
    }
    commitBoard(board);
    return true;
  }

  /**
   * @param {PresetId} id
   * @param {{ n?: number, w?: number, h?: number }} [params]
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
        throw new RangeError(t('board.error.presetBounds', { min: MIN_EDIT_SIDE, max: MAX_SIDE }));
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : t('board.error.invalidPreset'));
      return false;
    }
    if (boardsEqual(made.board, state.board) && made.rotation === state.rotation) {
      return true;
    }
    commitBoard(made.board, made.rotation);
    return true;
  }

  /** @returns {boolean} */
  function applySelectedPreset() {
    const id = /** @type {PresetId} */ (presetSelect.value);
    return id === 'rectangle'
      ? applyPreset('rectangle', { w: Number(colsInput.value), h: Number(rowsInput.value) })
      : applyPreset(id, { n: PRESET_DEFAULT_N[/** @type {keyof typeof PRESET_DEFAULT_N} */ (id)] });
  }

  /** @returns {boolean} */
  function undo() {
    const state = store.getState();
    if (isBusy(state) || !history.canUndo()) {
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
      // The first cell decides the gesture's paint value: block or unblock.
      gesture = { value: state.board.active[cell[1] * state.board.width + cell[0]] === 1 ? 0 : 1, start: state.board };
    }
    if (gesture === null) {
      return;
    }
    const { value } = gesture;
    cursor = cell;
    store.update((s) => withBoard(s, setCell(s.board, cell[0], cell[1], value)));
  }

  function endGesture() {
    const done = gesture;
    gesture = null;
    if (done !== null && !boardsEqual(done.start, store.getState().board)) {
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
      const [dx, dy] = arrowToGrid(state.rotation, /** @type {'ArrowLeft'} */ (event.key));
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
      commitBoard(setCell(board, x, y, board.active[y * board.width + x] === 1 ? 0 : 1));
    }
  }

  /**
   * @param {GeneratorState} state
   * @returns {ReturnType<typeof describeBoard>}
   */
  function renderBoard(state) {
    const description = describeBoard(state, hardware);
    const theta = state.rotation;
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
      invalidCells: [],
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
    for (const control of [colsInput, rowsInput, presetSelect]) {
      control.disabled = busy;
    }
    boardHost.dataset.busy = String(busy);
  }

  /** @param {GeneratorState} state */
  function render(state) {
    if (destroyed) {
      return;
    }
    const description = renderBoard(state);
    syncControls(state);
    view.svg.setAttribute('aria-label', t('board.label'));
    surface.setAttribute('aria-label', t('board.label'));
    status.textContent = description.valid ? description.statusText : t('board.count', { area: description.area });
    noticeList.replaceChildren(
      ...(description.valid ? [] : [el('li', { className: 'notice notice-error', text: `${t('level.cannot')} ${description.statusText}`, dataset: { code: 'cannot-generate' } })]),
      ...description.notices
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
    if (applySelectedPreset()) {
      activePreset = id;
    } else {
      presetSelect.value = activePreset;
    }
    syncControls(store.getState());
  });
  listen(viewLeft, 'click', () => rotate(45));
  listen(viewRight, 'click', () => rotate(-45));
  listen(zoomOutButton, 'click', () => view.setZoom(view.getState().cellPx / ZOOM_STEP));
  listen(zoomInButton, 'click', () => view.setZoom(view.getState().cellPx * ZOOM_STEP));
  listen(fitButton, 'click', () => void view.fit());
  listen(panButton, 'click', () => {
    const on = panButton.getAttribute('aria-pressed') !== 'true';
    panButton.setAttribute('aria-pressed', String(on));
    view.setPanMode(on);
  });
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
      controls.remove();
    },
  };
}
