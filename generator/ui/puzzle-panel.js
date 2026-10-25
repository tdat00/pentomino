// @ts-check
// Step 3 puzzles panel. Cards are reconciled by puzzle id so thumbnails are not rebuilt when a certificate
// arrives. All text is set through textContent.
import { el } from '../../core/browser/dom.js';
import { createPrintDialog, puzzleDetails } from '../../core/browser/print-dialog.js';
import { mountBoard, mountPiecePreview, svgEl } from '../../core/browser/svg-board.js';
import { activeCount } from '../../core/engine/board.js';
import { normalizeAngle } from '../../core/engine/view.js';
import { has, t } from '../i18n.js';
import {
  MAX_SETS, batchLevelOf, describeLevels, generationBlock, isBusy, readyLevelId, setsFull,
} from '../state.js';
import { levelLabel } from '../strings.js';
import { loc, locAttrs } from './i18n-dom.js';
import { mountElapsed } from './elapsed.js';

const CARD_PREVIEW_PX = 116;
const DETAIL_BOARD_PX = 560;
const DETAIL_PIECE_SCALE = 0.6;
const ZOOM_STEP = 1.25;

/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('../state.js').GeneratorState} GeneratorState */
/** @typedef {ReturnType<typeof import('../jobs.js').createJobController>} JobController */
/** @typedef {import('../../core/engine/types.js').Puzzle} Puzzle */

/**
 * @typedef {object} PuzzlePanelOptions
 * @property {GeneratorStore} store
 * @property {{ phone: boolean }} hardware
 * @property {JobController} controller
 * @property {() => void} onNewSet Starts a new piece set with the current settings.
 * @property {() => number} [now]
 * @property {HTMLElement | null} [noticeHost] Defaults to the top of this panel.
 * @property {HTMLElement | null} [cardsHost] Empty hint and cards; defaults to the bottom of this panel.
 * @property {HTMLElement | null} [controlsHost] Level choice and generate button; defaults to the top of this panel.
 * @property {HTMLElement | null} [cardsActionsHost] Remove all button; defaults to above the cards.
 */

let panelCounter = 0;

/**
 * Cell size that fits a board of any rotation into a square of px CSS pixels.
 * @param {{ width: number, height: number }} board
 * @param {number} px
 * @returns {number}
 */
export function thumbnailCellPx(board, px) {
  const span = Math.max(board.width, board.height) * Math.SQRT2 + 1;
  return Math.max(3, Math.min(14, Math.floor(px / span)));
}

/**
 * @param {string} icon
 * @param {string} key
 * @param {string} action
 * @param {string} [className]
 * @returns {HTMLButtonElement}
 */
function actionButton(icon, key, action, className = '') {
  return /** @type {HTMLButtonElement} */ (el('button', { className, attrs: { type: 'button', 'data-action': action } },
    ...(icon === '' ? [loc(key)] : [el('span', { attrs: { 'aria-hidden': 'true' }, text: icon }), ' ', loc(key)])));
}

/**
 * @param {Puzzle} puzzle
 * @returns {string}
 */
export function describeRating(puzzle) {
  const rating = puzzle.rating;
  if (rating === null || rating === undefined) {
    return t('card.noRating');
  }
  const score = Number.isFinite(rating.score) ? Math.round(rating.score) : 0;
  return t('card.rating', { level: levelLabel(rating.level), score: `${score}${rating.saturated === true ? '+' : ''}` });
}

/**
 * @param {Puzzle} puzzle
 * @param {{ checking: boolean }} o
 * @returns {{ status: string, text: string }}
 */
export function describeCertificate(puzzle, o) {
  const cert = puzzle.certificate;
  if (cert === null || cert === undefined) {
    return o.checking ? { status: 'checking', text: t('cert.checking') } : { status: 'unchecked', text: t('cert.unchecked') };
  }
  return { status: cert.status, text: t(has(`cert.${cert.status}`) ? `cert.${cert.status}` : 'cert.unchecked') };
}

/**
 * @param {HTMLElement} host
 * @param {PuzzlePanelOptions} options
 */
export function mountPuzzlePanel(host, options) {
  const { store, hardware, controller } = options;
  const uid = `puzzle-panel-${(panelCounter += 1)}`;

  const levelSelect = /** @type {HTMLSelectElement} */ (el('select', { attrs: { 'data-field': 'puzzle-level' } }));
  const uniqueInput = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', 'data-field': 'require-unique' } }));
  const newSpinner = el('span', { className: 'spinner', attrs: { 'aria-hidden': 'true', hidden: '' } });
  const newButton = actionButton('', 'puzzles.new', 'new-puzzles', 'primary');
  const newLabel = /** @type {HTMLElement} */ (newButton.firstElementChild);
  const cancelLabel = loc('progress.cancel');
  cancelLabel.hidden = true;
  newButton.prepend(newSpinner);
  newButton.append(cancelLabel);
  let cancelMode = false;
  const elapsed = mountElapsed(store, ['batch'], { now: options.now, onOverLimit: () => render(store.getState()) });
  const controls = el('div', { className: 'puzzle-controls' },
    el('label', { className: 'field' }, loc('puzzles.level'), levelSelect),
    el('label', { className: 'pm-toggle unique-toggle' }, uniqueInput, loc('level.unique')),
    newButton, elapsed.element);
  const blockText = el('p', { className: 'hint', dataset: { role: 'block' } });
  const detailTitle = el('h3', { className: 'detail-title' });
  const detailSeed = el('span', { className: 'detail-seed' });
  const playButton = /** @type {HTMLButtonElement} */ (loc('detail.play', { className: 'primary', attrs: { type: 'button', 'data-action': 'play-puzzle' } }, 'button'));
  // Shows the stored solution on the board; it goes back off when another puzzle is shown.
  const solutionButton = /** @type {HTMLButtonElement} */ (loc('detail.showSolution', { className: 'solution-toggle', attrs: { type: 'button', 'data-action': 'show-solution', 'aria-pressed': 'false' } }, 'button'));
  let solutionShown = false;
  /** @type {string | null} */
  let solutionPuzzleId = null;
  // Icon only: the name is in aria-label and the tooltip.
  const printButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'icon-btn',
    attrs: { type: 'button', 'data-action': 'print-puzzle', 'aria-haspopup': 'dialog', ...locAttrs({ 'aria-label': 'print.button.title', title: 'print.button.title' }) },
  }, svgEl('svg', { class: 'icon', 'aria-hidden': 'true', focusable: 'false' }, svgEl('use', { href: '#ic-print' }))));
  const detailHead = el('div', { className: 'detail-head' }, el('div', { className: 'detail-name' }, detailTitle, detailSeed),
    el('div', { className: 'detail-actions' }, playButton, printButton));
  const detailBoard = el('div', { className: 'detail-board' });
  /**
   * @param {string} text
   * @param {string} key
   * @param {string} action
   * @returns {HTMLButtonElement}
   */
  const toolButton = (text, key, action) => /** @type {HTMLButtonElement} */ (el('button', {
    className: 'rotate-btn', text, attrs: { type: 'button', ...locAttrs({ 'aria-label': key, title: key }), 'data-action': action },
  }));
  const detailZoomOut = toolButton('−', 'board.zoomOut', 'detail-zoom-out');
  const detailZoomIn = toolButton('+', 'board.zoomIn', 'detail-zoom-in');
  const detailFit = toolButton('⤢', 'board.zoomFit', 'detail-zoom-fit');
  const detailViewLeft = toolButton('⟲', 'board.rotateLeft', 'detail-view-left');
  const detailViewRight = toolButton('⟳', 'board.rotateRight', 'detail-view-right');
  const detailFrame = el('div', { className: 'board-frame' }, detailBoard,
    el('div', { className: 'board-tools' }, detailZoomOut, detailZoomIn, detailFit, detailViewLeft, detailViewRight));
  const detailTrayTitle = loc('detail.toPlace', { className: 'detail-tray-title' }, 'h4');
  const detailPieces = el('ul', { className: 'detail-pieces', attrs: { ...locAttrs({ 'aria-label': 'detail.toPlace' }) }, dataset: { role: 'detail-pieces' } });
  const detail = el('section', { className: 'puzzle-detail', attrs: { hidden: '' }, dataset: { role: 'puzzle-detail' } },
    detailHead, detailFrame, el('div', { className: 'detail-solution' }, solutionButton), detailTrayTitle, detailPieces);
  const noticeBox = options.noticeHost ?? el('div', { className: 'result-notice', attrs: { role: 'status' }, dataset: { role: 'notice' } });
  const cardList = el('ol', { className: 'puzzle-cards', attrs: { ...locAttrs({ 'aria-label': 'puzzles.list' }), id: `${uid}-cards` }, dataset: { role: 'cards' } });
  const emptyText = el('p', { className: 'hint', dataset: { role: 'empty' } });
  const removeAllButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'ghost-small',
    attrs: { type: 'button', 'data-action': 'remove-all-puzzles', ...locAttrs({ title: 'puzzles.removeAll.title' }) },
  }, loc('puzzles.removeAll')));
  const cardsHost = options.cardsHost ?? null;
  const cardsActionsHost = options.cardsActionsHost ?? null;
  const controlsHost = options.controlsHost ?? null;
  const inlineRemoveAll = cardsActionsHost === null;
  host.append(el('div', { className: 'puzzle-panel' }, ...(controlsHost === null ? [controls] : []), blockText,
    ...(options.noticeHost ? [] : [noticeBox]), detail,
    ...(cardsHost === null ? [...(inlineRemoveAll ? [removeAllButton] : []), emptyText, cardList] : [])));
  cardsHost?.append(...(inlineRemoveAll ? [removeAllButton] : []), emptyText, cardList);
  cardsActionsHost?.append(removeAllButton);
  controlsHost?.append(controls);

  /** @returns {import('../../core/browser/print-dialog.js').PrintJob | null} The puzzle shown in the main panel. */
  function printJob() {
    const state = store.getState();
    const at = state.set === null || selectedId === null ? -1 : state.puzzles.findIndex((p) => p.id === selectedId);
    if (state.set === null || at === -1) {
      return null;
    }
    const puzzle = state.puzzles[at];
    const seed = state.puzzleSeeds[puzzle.id];
    const rating = puzzle.rating;
    const setLevel = state.calibrationFor?.levelId ?? null;
    return {
      board: state.set.board,
      pieces: state.set.pieces,
      clues: puzzle.clues,
      rotation: state.rotation,
      title: t('card.heading', { n: at + 1 }),
      details: puzzleDetails(t,
        rating === null || rating === undefined ? null : { level: levelLabel(rating.level), score: rating.score, saturated: rating.saturated },
        seed,
        state.setSeed === null ? null : { level: setLevel === null ? null : levelLabel(setLevel), seed: state.setSeed }),
      solution: puzzle.solution ?? null,
    };
  }
  const printDialog = createPrintDialog({ host: host.ownerDocument.body, t, getJob: printJob, solutionOption: true });
  /**
   * @typedef {object} Card
   * @property {HTMLLIElement} item
   * @property {ReturnType<typeof mountBoard>} view
   * @property {HTMLElement} heading
   * @property {HTMLElement} rating
   * @property {HTMLElement} toPlace
   * @property {HTMLElement} cert
   * @property {HTMLButtonElement} select
   * @property {HTMLButtonElement} remove
   * @property {string} id
   */
  /** @type {Map<string, Card>} */
  const cards = new Map();
  /** @type {object | null} */
  let cardSet = null;
  let destroyed = false;
  /** @type {string | null} */
  let selectedId = null;
  let userChose = false;
  /** @type {ReturnType<typeof mountBoard> | null} */
  let detailView = null;
  /** @type {object | null} */
  let detailSet = null;
  let detailSignature = '';
  /** @type {Array<ReturnType<typeof mountPiecePreview>>} */
  let detailPreviews = [];

  /**
   * @param {string} id
   * @param {number} cellPx
   * @returns {Card}
   */
  function createCard(id, cellPx) {
    const thumb = el('div', { className: 'card-thumb' });
    const heading = el('p', { className: 'card-heading' });
    const rating = el('p', { className: 'card-rating' });
    const toPlace = el('p', { className: 'card-clues' });
    const cert = el('p', { className: 'badge card-cert' });
    const remove = /** @type {HTMLButtonElement} */ (el('button', { className: 'card-remove ghost-small', text: '✕', attrs: { type: 'button', 'data-action': 'remove' } }));
    // The whole card body is one button that shows this puzzle in the main panel.
    const select = /** @type {HTMLButtonElement} */ (el('button', { className: 'card-select', attrs: { type: 'button', 'data-action': 'select', 'aria-pressed': 'false' } },
      el('div', { className: 'card-body' }, heading, rating, toPlace, cert), thumb));
    const item = /** @type {HTMLLIElement} */ (el('li', { className: 'puzzle-card', dataset: { puzzleId: id } }, select, remove));
    const view = mountBoard(thumb, { mode: 'thumbnail', cellPx, label: t('card.preview') });
    select.addEventListener('click', () => {
      selectedId = id;
      userChose = true;
      render(store.getState());
    });
    remove.addEventListener('click', () => {
      const buttons = [...cardList.querySelectorAll('.card-remove')];
      const at = buttons.indexOf(remove);
      controller.removePuzzle(id);
      // Keep the keyboard where it was: the next item, else the previous one, else the generate button.
      const left = /** @type {HTMLButtonElement[]} */ ([...cardList.querySelectorAll('.card-remove')]);
      (left[Math.min(at, left.length - 1)] ?? newButton).focus();
    });
    return { item, view, heading, rating, toPlace, cert, select, remove, id };
  }

  /** @param {GeneratorState} state */
  function renderCards(state) {
    const set = state.set;
    if (cardSet !== set) {
      for (const card of cards.values()) {
        card.view.destroy();
      }
      cards.clear();
      cardSet = set;
    }
    const wanted = set === null ? [] : state.puzzles;
    const busy = isBusy(state);
    const keep = new Set(wanted.map((p) => p.id));
    for (const [id, card] of cards) {
      if (!keep.has(id)) {
        card.view.destroy();
        card.item.remove();
        cards.delete(id);
      }
    }
    /** @type {HTMLElement[]} */
    const ordered = [];
    const streaming = state.job?.kind === 'batch';
    const acceptedNow = state.job?.accepted ?? 0;
    const checking = new Set(state.checking);
    wanted.forEach((puzzle, index) => {
      let card = cards.get(puzzle.id);
      if (card === undefined) {
        card = createCard(puzzle.id, thumbnailCellPx(/** @type {NonNullable<typeof set>} */ (set).board, CARD_PREVIEW_PX));
        cards.set(puzzle.id, card);
      }
      const current = /** @type {NonNullable<typeof set>} */ (set);
      const fresh = streaming && index >= wanted.length - acceptedNow;
      card.view.svg.setAttribute('aria-label', t('card.preview'));
      card.heading.textContent = t('card.heading', { n: index + 1 });
      card.item.dataset.selected = String(puzzle.id === selectedId);
      card.select.setAttribute('aria-pressed', String(puzzle.id === selectedId));
      const removeLabel = t('card.remove.aria', { title: card.heading.textContent });
      card.remove.setAttribute('aria-label', removeLabel);
      card.remove.title = removeLabel;
      card.remove.disabled = busy;
      const ratingText = describeRating(puzzle);
      const levelText = puzzle.rating === null || puzzle.rating === undefined ? '' : levelLabel(puzzle.rating.level);
      card.rating.replaceChildren(...(levelText !== '' && ratingText.startsWith(levelText)
        ? [el('strong', { text: levelText }), ratingText.slice(levelText.length)]
        : [ratingText]));
      card.toPlace.textContent = t('card.toPlace', { count: Math.max(0, current.pieces.length - puzzle.clues.length) });
      const certificate = describeCertificate(puzzle, { checking: checking.has(puzzle.id) || fresh });
      card.cert.textContent = certificate.text;
      card.cert.dataset.status = certificate.status;
      if (card.view.getState().rotation !== state.rotation) {
        card.view.setRotation(state.rotation);
      }
      card.view.render({
        board: current.board, pieces: current.pieces, clues: puzzle.clues, placements: [], showLabels: true, showPatterns: true,
      });
      ordered.push(card.item);
    });
    // Newest on top; the numbers still count in creation order.
    cardList.replaceChildren(...ordered.reverse());
  }

  function detailCellPx(/** @type {{ width: number, height: number }} */ board) {
    const span = Math.max(board.width, board.height) * Math.SQRT2 + 1;
    return Math.max(14, Math.min(40, Math.floor(DETAIL_BOARD_PX / span)));
  }

  function clearDetailPieces() {
    for (const preview of detailPreviews) {
      preview.destroy();
    }
    detailPreviews = [];
    detailPieces.replaceChildren();
    detailSignature = '';
  }

  /** @param {GeneratorState} state */
  function renderDetail(state) {
    const set = state.set;
    const at = set === null || selectedId === null ? -1 : state.puzzles.findIndex((p) => p.id === selectedId);
    if (set === null || at === -1) {
      detail.hidden = true;
      detailView?.destroy();
      detailView = null;
      detailSet = null;
      clearDetailPieces();
      return;
    }
    const puzzle = state.puzzles[at];
    detail.hidden = false;
    if (detailSet !== set) {
      detailView?.destroy();
      detailView = null;
      clearDetailPieces();
    }
    if (detailView === null) {
      detailView = mountBoard(detailBoard, { mode: 'thumbnail', cellPx: detailCellPx(set.board), rotation: state.rotation, label: t('detail.board') });
      detailSet = set;
    }
    detailTitle.textContent = t('card.heading', { n: at + 1 });
    const detailSeedValue = state.puzzleSeeds[puzzle.id];
    detailSeed.textContent = detailSeedValue === undefined ? '' : t('card.seed', { seed: detailSeedValue });
    detailSeed.hidden = detailSeedValue === undefined;
    playButton.disabled = isBusy(state);
    if (solutionPuzzleId !== puzzle.id) {
      solutionPuzzleId = puzzle.id;
      solutionShown = false;
    }
    const solution = puzzle.solution ?? null;
    if (solution === null) {
      solutionShown = false;
    }
    const solutionKey = solutionShown ? 'detail.hideSolution' : 'detail.showSolution';
    solutionButton.dataset.i18n = solutionKey;
    solutionButton.textContent = t(solutionKey);
    solutionButton.setAttribute('aria-pressed', String(solutionShown));
    solutionButton.disabled = solution === null;
    solutionButton.title = solution === null ? t('detail.noSolution') : '';
    detailView.svg.setAttribute('aria-label', t('detail.board'));
    if (detailView.getState().rotation !== state.rotation) {
      detailView.setRotation(state.rotation);
    }
    const clueIds = new Set(puzzle.clues.map((pose) => pose.piece));
    detailView.render({
      board: set.board, pieces: set.pieces, clues: puzzle.clues,
      placements: solutionShown && solution !== null ? solution.filter((pose) => !clueIds.has(pose.piece)) : [],
      showLabels: true, showPatterns: true,
    });
    const signature = `${puzzle.id}|${state.rotation}`;
    if (signature === detailSignature) {
      return;
    }
    clearDetailPieces();
    detailSignature = signature;
    const placed = new Set(puzzle.clues.map((pose) => pose.piece));
    set.pieces.forEach((piece, index) => {
      if (placed.has(piece.id)) {
        return;
      }
      const item = el('li', { className: 'detail-piece', dataset: { pieceId: piece.id } });
      const preview = mountPiecePreview(item, piece, { cellPx: Math.round(detailCellPx(set.board) * DETAIL_PIECE_SCALE), index, count: set.pieces.length, interactive: false });
      preview.render({ t: 0, rotation: state.rotation, showLabels: true, showPatterns: true });
      detailPreviews.push(preview);
      detailPieces.append(item);
    });
    detailTrayTitle.hidden = detailPieces.children.length === 0;
  }

  /** @param {GeneratorState} state */
  function renderNotice(state) {
    const notice = state.notice;
    if (notice === null) {
      noticeBox.replaceChildren();
      return;
    }
    const nodes = [el('p', { className: `notice notice-${notice.kind}`, text: notice.text, dataset: { code: notice.code } })];
    const actions = el('div', { className: 'control-row notice-actions' });
    if (notice.actions.includes('new-set')) {
      const newSet = /** @type {HTMLButtonElement} */ (loc('notice.action.newSet', { attrs: { type: 'button', 'data-action': 'new-set' }, on: { click: () => options.onNewSet() } }, 'button'));
      newSet.disabled = setsFull(state);
      newSet.title = newSet.disabled ? t('set.full', { max: MAX_SETS }) : '';
      actions.append(newSet);
    }
    if (notice.actions.includes('reset-history')) {
      actions.append(loc('notice.action.resetHistory', { attrs: { type: 'button', 'data-action': 'reset-history' }, on: { click: () => controller.resetHistory() } }, 'button'));
    }
    if (actions.children.length > 0) {
      nodes.push(actions);
    }
    noticeBox.replaceChildren(...nodes);
  }

  /** @param {GeneratorState} state */
  function render(state) {
    if (destroyed) {
      return;
    }
    const set = state.set;
    const busy = isBusy(state);
    const hasPuzzles = state.puzzles.length > 0 && set !== null;
    const block = set === null ? null : generationBlock(state, hardware);
    levelSelect.disabled = busy || set === null;
    uniqueInput.checked = state.uniqueness === 'require';
    uniqueInput.disabled = busy || set === null;
    const chosen = set === null ? state.levelId : batchLevelOf(state);
    const entries = set === null ? [] : describeLevels(activeCount(set.board)).filter((entry) => entry.offered || entry.id === chosen);
    levelSelect.replaceChildren(...entries.map((entry) => {
      const option = /** @type {HTMLOptionElement} */ (el('option', { text: entry.label, attrs: { value: entry.id } }));
      option.selected = entry.id === chosen;
      return option;
    }));
    // After 30 s the button turns into Cancel for the job it started.
    cancelMode = state.job?.kind === 'batch' && elapsed.isOver();
    newLabel.hidden = cancelMode;
    cancelLabel.hidden = !cancelMode;
    newButton.disabled = cancelMode
      ? state.job?.cancelling === true
      : busy || set === null || block !== null;
    newSpinner.hidden = state.job?.kind !== 'batch';
    newButton.setAttribute('aria-busy', String(!newSpinner.hidden));
    newButton.title = cancelMode ? '' : block ?? '';
    removeAllButton.disabled = busy || state.puzzles.length === 0 || set === null;
    blockText.textContent = set !== null && block !== null ? block : '';
    emptyText.textContent = set === null ? t('puzzles.empty.noSet') : !hasPuzzles && !busy ? t('puzzles.empty.none') : '';
    renderNotice(state);
    // Until a card is clicked, the main panel follows the newest puzzle.
    if (state.set === null || userChose === false || !state.puzzles.some((p) => p.id === selectedId)) {
      userChose = false;
      selectedId = state.set === null ? null : state.puzzles.at(-1)?.id ?? null;
    }
    renderCards(state);
    renderDetail(state);
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
  listen(levelSelect, 'change', () => {
    const state = store.getState();
    store.update({ batchLevelId: levelSelect.value === readyLevelId(state) ? null : levelSelect.value });
  });
  listen(newButton, 'click', () => void (cancelMode ? controller.cancel() : controller.addMore()));
  listen(uniqueInput, 'change', () => store.update({ uniqueness: uniqueInput.checked ? 'require' : 'any' }));
  listen(playButton, 'click', () => {
    if (selectedId !== null) {
      void controller.playPuzzle(selectedId);
    }
  });
  listen(printButton, 'click', () => printDialog.open());
  listen(solutionButton, 'click', () => {
    solutionShown = !solutionShown;
    render(store.getState());
  });
  // Zoom keeps to the view; Fit goes back to the default size; the arrows turn the board like step 1 does.
  listen(detailZoomOut, 'click', () => detailView?.setZoom(detailView.getState().cellPx / ZOOM_STEP));
  listen(detailZoomIn, 'click', () => detailView?.setZoom(detailView.getState().cellPx * ZOOM_STEP));
  listen(detailFit, 'click', () => {
    const set = store.getState().set;
    if (set !== null) {
      detailView?.setZoom(detailCellPx(set.board));
    }
  });
  listen(detailViewLeft, 'click', () => store.update((s) => ({ ...s, rotation: normalizeAngle(s.rotation + 45) })));
  listen(detailViewRight, 'click', () => store.update((s) => ({ ...s, rotation: normalizeAngle(s.rotation - 45) })));
  listen(removeAllButton, 'click', () => {
    controller.removeAllPuzzles();
    newButton.focus();
  });

  const unsubscribe = store.subscribe((state) => render(state));
  render(store.getState());

  return {
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
      for (const [target, type, fn] of listeners) {
        target.removeEventListener(type, fn);
      }
      listeners.length = 0;
      elapsed.destroy();
      printDialog.destroy();
      for (const card of cards.values()) {
        card.view.destroy();
      }
      cards.clear();
      detailView?.destroy();
      clearDetailPieces();
      host.replaceChildren();
      cardsHost?.replaceChildren();
    },
  };
}
