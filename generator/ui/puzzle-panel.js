// @ts-check
// Puzzles panel (design §10.5): quantity and level, New Puzzles / Add more, batch actions, notices and
// streaming puzzle cards. Cards are reconciled by puzzle id so thumbnails are not rebuilt when a
// certificate or link arrives. All text is set through textContent.
import { el } from '../../core/browser/dom.js';
import { mountBoard } from '../../core/browser/svg-board.js';
import { activeCount } from '../../core/engine/board.js';
import { level } from '../../core/engine/levels.js';
import {
  MAX_QUANTITY, batchLevelOf, clampQuantity, describeLevels, generationBlock, isBusy, readyLevelId,
} from '../state.js';
import { CERTIFICATE_TEXT, VERIFY_TEXT, formatNotice } from '../strings.js';
import { mountProgress } from './progress.js';

/** @typedef {import('../state.js').GeneratorStore} GeneratorStore */
/** @typedef {import('../state.js').GeneratorState} GeneratorState */
/** @typedef {ReturnType<typeof import('../jobs.js').createJobController>} JobController */
/** @typedef {import('../../core/engine/types.js').Puzzle} Puzzle */

/**
 * @typedef {object} PuzzlePanelOptions
 * @property {GeneratorStore} store
 * @property {{ phone: boolean }} hardware
 * @property {JobController} controller
 * @property {() => void} onNewSet Starts Generate Piece Set with the current settings.
 * @property {() => number} [now]
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
 * @param {string} id
 * @returns {string}
 */
function labelOf(id) {
  try {
    return level(id).label;
  } catch {
    return id;
  }
}

/**
 * @param {string} icon
 * @param {string} label
 * @param {string} action
 * @param {string} [className]
 * @returns {HTMLButtonElement}
 */
function actionButton(icon, label, action, className = '') {
  return /** @type {HTMLButtonElement} */ (el('button', { className, attrs: { type: 'button', 'data-action': action } },
    el('span', { attrs: { 'aria-hidden': 'true' }, text: icon }), icon === '' ? label : ` ${label}`));
}

/**
 * Text of the estimated difficulty, as a claim when it came from a file or storage.
 * @param {Puzzle} puzzle
 * @param {boolean} claimed
 * @returns {string}
 */
export function describeRating(puzzle, claimed) {
  const rating = puzzle.rating;
  if (rating === null || rating === undefined) {
    return 'No rating';
  }
  const score = Number.isFinite(rating.score) ? Math.round(rating.score) : 0;
  return `${labelOf(rating.level)} · est. score ${score}${rating.saturated === true ? '+' : ''}${claimed ? CERTIFICATE_TEXT.claimed : ''}`;
}

/**
 * @param {Puzzle} puzzle
 * @param {{ claimed: boolean, checking: boolean }} o
 * @returns {{ status: string, text: string }}
 */
export function describeCertificate(puzzle, o) {
  const cert = puzzle.certificate;
  if (cert === null || cert === undefined) {
    return o.checking ? { status: 'checking', text: CERTIFICATE_TEXT.checking } : { status: 'unchecked', text: CERTIFICATE_TEXT.unchecked };
  }
  const text = /** @type {Record<string, string>} */ (CERTIFICATE_TEXT)[cert.status] ?? CERTIFICATE_TEXT.unchecked;
  return { status: cert.status, text: o.claimed && cert.verified !== true ? `${text}${CERTIFICATE_TEXT.claimed}` : text };
}

/**
 * @param {HTMLElement} host
 * @param {PuzzlePanelOptions} options
 */
export function mountPuzzlePanel(host, options) {
  const { store, hardware, controller } = options;
  const uid = `puzzle-panel-${(panelCounter += 1)}`;

  const quantityInput = /** @type {HTMLInputElement} */ (el('input', {
    attrs: { type: 'number', min: 1, max: MAX_QUANTITY, step: 1, inputmode: 'numeric', 'data-field': 'quantity' },
  }));
  const levelSelect = /** @type {HTMLSelectElement} */ (el('select', { attrs: { 'data-field': 'puzzle-level' } }));
  const newButton = actionButton('', 'New Puzzles', 'new-puzzles', 'primary');
  const addButton = actionButton('', 'Add more', 'add-more');
  const playAllButton = actionButton('▶', 'Play all', 'play-all');
  const exportButton = actionButton('⬇', 'Export pack', 'export-pack');
  const copyButton = actionButton('🔗', 'Copy pack link', 'copy-pack-link');
  const controls = el('div', { className: 'control-row puzzle-controls' },
    el('label', { className: 'field' }, el('span', { text: 'Quantity' }), quantityInput),
    el('label', { className: 'field' }, el('span', { text: 'Level' }), levelSelect),
    newButton, addButton, playAllButton, exportButton, copyButton);
  const blockText = el('p', { className: 'hint', dataset: { role: 'block' } });
  const progressHost = el('div', { dataset: { role: 'progress-host' } });
  const noticeBox = el('div', { className: 'result-notice', attrs: { role: 'status' }, dataset: { role: 'notice' } });
  const cardList = el('ol', { className: 'puzzle-cards', attrs: { 'aria-label': 'Puzzles', id: `${uid}-cards` }, dataset: { role: 'cards' } });
  const parkedBox = el('div', { className: 'parked-packs', dataset: { role: 'parked' } });
  const emptyText = el('p', { className: 'hint', dataset: { role: 'empty' } });
  host.append(el('div', { className: 'puzzle-panel' }, controls, blockText, progressHost, noticeBox, emptyText, cardList, parkedBox));

  const progress = mountProgress(progressHost, { store, onCancel: () => controller.cancel(), now: options.now });

  /**
   * @typedef {object} Card
   * @property {HTMLLIElement} item
   * @property {ReturnType<typeof mountBoard>} view
   * @property {HTMLElement} title
   * @property {HTMLElement} rating
   * @property {HTMLElement} clues
   * @property {HTMLElement} cert
   * @property {HTMLElement} verify
   * @property {HTMLElement} note
   * @property {HTMLAnchorElement} play
   * @property {HTMLButtonElement} copy
   * @property {HTMLButtonElement} exportBtn
   * @property {HTMLButtonElement} remove
   * @property {string} id
   */
  /** @type {Map<string, Card>} */
  const cards = new Map();
  /** @type {object | null} */
  let cardSet = null;
  let destroyed = false;

  /**
   * @param {string} id
   * @param {number} cellPx
   * @returns {Card}
   */
  function createCard(id, cellPx) {
    const thumb = el('div', { className: 'card-thumb' });
    const title = el('h3', { className: 'card-title' });
    const rating = el('p', { className: 'card-rating' });
    const clues = el('p', { className: 'card-clues' });
    const cert = el('p', { className: 'badge card-cert' });
    const verify = el('p', { className: 'badge card-verify' });
    const note = el('small', { className: 'card-note' });
    const play = /** @type {HTMLAnchorElement} */ (el('a', { className: 'pm-btn card-play', attrs: { 'data-action': 'play' }, text: '▶ Play' }));
    const copy = actionButton('🔗', 'Copy', 'copy-link');
    const exportBtn = actionButton('⬇', 'Export', 'export-puzzle');
    const remove = actionButton('🗑', 'Remove', 'remove');
    const item = /** @type {HTMLLIElement} */ (el('li', { className: 'puzzle-card', dataset: { puzzleId: id } },
      thumb, el('div', { className: 'card-body' }, title, rating, clues, cert, verify, note,
        el('div', { className: 'card-actions' }, play, copy, exportBtn, remove))));
    const view = mountBoard(thumb, { mode: 'thumbnail', cellPx, label: 'Puzzle preview' });

    play.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const state = store.getState();
      const links = state.links;
      const index = links.ids.indexOf(id);
      const href = play.getAttribute('href');
      if (href === null || index < 0 || links.pack === null) {
        event.preventDefault();
        void controller.playPuzzle(id);
        return;
      }
      controller.prepareNavigation();
    });
    play.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && play.getAttribute('href') === null) {
        event.preventDefault();
        void controller.playPuzzle(id);
      }
    });
    copy.addEventListener('click', () => void controller.copyPuzzleLink(id));
    exportBtn.addEventListener('click', () => controller.exportPuzzle(id));
    remove.addEventListener('click', () => controller.removePuzzle(id));
    return { item, view, title, rating, clues, cert, verify, note, play, copy, exportBtn, remove, id };
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
    const busy = isBusy(state);
    const wanted = set === null ? [] : state.puzzles;
    const keep = new Set(wanted.map((p) => p.id));
    for (const [id, card] of cards) {
      if (!keep.has(id)) {
        card.view.destroy();
        card.item.remove();
        cards.delete(id);
      }
    }
    const claimed = new Set(state.claimedIds);
    const streaming = state.job?.kind === 'batch';
    const acceptedNow = state.job?.accepted ?? 0;
    const checking = new Set(state.checking);
    const links = state.links;
    /** @type {HTMLElement[]} */
    const ordered = [];
    wanted.forEach((puzzle, index) => {
      let card = cards.get(puzzle.id);
      if (card === undefined) {
        card = createCard(puzzle.id, thumbnailCellPx(/** @type {NonNullable<typeof set>} */ (set).board, 200));
        cards.set(puzzle.id, card);
      }
      const current = /** @type {NonNullable<typeof set>} */ (set);
      const pieces = current.pieces.length;
      const fresh = streaming && index >= wanted.length - acceptedNow;
      card.title.textContent = puzzle.title ?? `Puzzle ${index + 1}`;
      card.rating.textContent = describeRating(puzzle, claimed.has(puzzle.id));
      const percent = pieces === 0 ? 0 : Math.round((puzzle.clues.length / pieces) * 100);
      card.clues.textContent = `${puzzle.clues.length} pre-placed · ${percent} %`;
      const certificate = describeCertificate(puzzle, { claimed: claimed.has(puzzle.id), checking: checking.has(puzzle.id) || fresh });
      card.cert.textContent = certificate.text;
      card.cert.dataset.status = certificate.status;
      const verification = state.verification[puzzle.id];
      card.verify.textContent = verification === undefined ? '' : /** @type {Record<string, string>} */ (VERIFY_TEXT)[verification] ?? '';
      card.verify.hidden = verification === undefined;
      if (card.view.getState().rotation !== state.rotation) {
        card.view.setRotation(state.rotation);
      }
      card.view.render({
        board: current.board, pieces: current.pieces, clues: puzzle.clues, placements: [],
        showLabels: state.prefs.labels, showPatterns: state.prefs.patterns,
      });
      const linkIndex = links.ids.indexOf(puzzle.id);
      const link = linkIndex >= 0 ? links.items[linkIndex] : undefined;
      const aria = `Play ${card.title.textContent}`;
      card.play.setAttribute('aria-label', aria);
      if (link !== undefined && link.href !== null) {
        card.play.setAttribute('href', link.href);
        card.play.removeAttribute('role');
        card.play.removeAttribute('aria-disabled');
        card.play.removeAttribute('tabindex');
      } else {
        card.play.removeAttribute('href');
        card.play.setAttribute('role', 'link');
        card.play.setAttribute('tabindex', '0');
        card.play.setAttribute('aria-disabled', link === undefined ? 'false' : 'true');
      }
      card.note.textContent = link === undefined || link.warning === undefined ? '' : link.portable ? formatNotice('N-LONGLINK') : link.warning;
      card.copy.setAttribute('aria-label', `Copy link to ${card.title.textContent}`);
      card.exportBtn.setAttribute('aria-label', `Export ${card.title.textContent}`);
      card.remove.setAttribute('aria-label', `Remove ${card.title.textContent}`);
      card.remove.disabled = busy;
      ordered.push(card.item);
    });
    cardList.replaceChildren(...ordered);
    cardList.dataset.stale = String(state.stale);
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
      actions.append(el('button', { text: 'Generate new piece set', attrs: { type: 'button', 'data-action': 'new-set' }, on: { click: () => options.onNewSet() } }));
    }
    if (notice.actions.includes('reset-history')) {
      actions.append(el('button', { text: 'Reset history', attrs: { type: 'button', 'data-action': 'reset-history' }, on: { click: () => controller.resetHistory() } }));
    }
    if (notice.actions.includes('smaller-quantity') && notice.room !== undefined) {
      const room = notice.room;
      actions.append(el('button', { text: `Ask for ${room}`, attrs: { type: 'button', 'data-action': 'smaller-quantity' }, on: { click: () => controller.requestFewer(room) } }));
    }
    if (actions.children.length > 0) {
      nodes.push(actions);
    }
    noticeBox.replaceChildren(...nodes);
  }

  /** @param {GeneratorState} state */
  function renderParked(state) {
    parkedBox.replaceChildren(...state.parked.map((group, index) => el('div', { className: 'parked-pack control-row', dataset: { parked: String(index) } },
      el('span', { text: `Earlier pack · ${group.length} puzzles` }),
      el('button', { text: '⬇ Export earlier pack', attrs: { type: 'button', 'data-action': 'export-parked' }, on: { click: () => controller.exportParked(index) } }))));
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
    quantityInput.disabled = busy || set === null;
    levelSelect.disabled = busy || set === null;
    const wantedQuantity = String(clampQuantity(state.quantity));
    if (quantityInput.value !== wantedQuantity && host.ownerDocument.activeElement !== quantityInput) {
      quantityInput.value = wantedQuantity;
    }
    const chosen = set === null ? state.levelId : batchLevelOf(state);
    const entries = set === null ? [] : describeLevels(activeCount(set.board)).filter((entry) => entry.offered || entry.id === chosen);
    levelSelect.replaceChildren(...entries.map((entry) => {
      const option = /** @type {HTMLOptionElement} */ (el('option', { text: entry.label, attrs: { value: entry.id } }));
      option.selected = entry.id === chosen;
      return option;
    }));
    newButton.disabled = busy || set === null || state.stale || block !== null;
    addButton.disabled = busy || !hasPuzzles || state.stale || block !== null;
    newButton.title = block ?? '';
    addButton.title = block ?? '';
    playAllButton.disabled = !hasPuzzles;
    exportButton.disabled = !hasPuzzles;
    copyButton.disabled = !hasPuzzles;
    blockText.textContent = set !== null && !state.stale && block !== null ? block : '';
    emptyText.textContent = set === null ? 'Generate or import a piece set, then choose New Puzzles.' : !hasPuzzles && !busy ? 'No puzzles yet. Choose New Puzzles.' : '';
    renderNotice(state);
    renderCards(state);
    renderParked(state);
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
  listen(quantityInput, 'input', () => {
    if (quantityInput.value !== '') {
      store.update({ quantity: clampQuantity(quantityInput.value) });
    }
  });
  listen(quantityInput, 'change', () => {
    store.update({ quantity: clampQuantity(quantityInput.value) });
    quantityInput.value = String(clampQuantity(quantityInput.value));
  });
  listen(levelSelect, 'change', () => {
    const state = store.getState();
    store.update({ batchLevelId: levelSelect.value === readyLevelId(state) ? null : levelSelect.value });
  });
  listen(newButton, 'click', () => void controller.newPuzzles());
  listen(addButton, 'click', () => void controller.addMore());
  listen(playAllButton, 'click', () => void controller.playAll());
  listen(exportButton, 'click', () => controller.exportPack());
  listen(copyButton, 'click', () => void controller.copyPackLink());

  const unsubscribe = store.subscribe((state) => render(state));
  render(store.getState());

  return {
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
      progress.destroy();
      for (const card of cards.values()) {
        card.view.destroy();
      }
      cards.clear();
      host.replaceChildren();
    },
  };
}
