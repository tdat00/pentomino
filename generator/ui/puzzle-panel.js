// @ts-check
// Puzzles panel (design §10.5): quantity and level, New Puzzles / Add more, batch actions, notices and
// streaming puzzle cards. Cards are reconciled by puzzle id so thumbnails are not rebuilt when a
// certificate or link arrives. All text is set through textContent.
import { el } from '../../core/browser/dom.js';
import { mountBoard } from '../../core/browser/svg-board.js';
import { activeCount } from '../../core/engine/board.js';
import { has, t } from '../i18n.js';
import {
  MAX_QUANTITY, batchLevelOf, clampQuantity, describeLevels, generationBlock, isBusy, readyLevelId,
} from '../state.js';
import { levelLabel, linkWarning, puzzleTitle } from '../strings.js';
import { loc, locAttrs } from './i18n-dom.js';
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
 * @property {HTMLElement | null} [progressHost] Where the job progress goes; defaults to the top of this panel.
 * @property {HTMLElement | null} [noticeHost] Where the outcome notice goes; defaults to the top of this panel.
 * @property {HTMLElement | null} [cardsHost] Where the empty hint, the puzzle cards and earlier packs go; defaults to the bottom of this panel.
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
 * @param {string} key Translation key of the label.
 * @param {string} action
 * @param {string} [className]
 * @returns {HTMLButtonElement}
 */
function actionButton(icon, key, action, className = '') {
  return /** @type {HTMLButtonElement} */ (el('button', { className, attrs: { type: 'button', 'data-action': action } },
    ...(icon === '' ? [loc(key)] : [el('span', { attrs: { 'aria-hidden': 'true' }, text: icon }), ' ', loc(key)])));
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
    return t('card.noRating');
  }
  const score = Number.isFinite(rating.score) ? Math.round(rating.score) : 0;
  return `${t('card.rating', { level: levelLabel(rating.level), score: `${score}${rating.saturated === true ? '+' : ''}` })}${claimed ? t('cert.claimed') : ''}`;
}

/**
 * @param {Puzzle} puzzle
 * @param {{ claimed: boolean, checking: boolean }} o
 * @returns {{ status: string, text: string }}
 */
export function describeCertificate(puzzle, o) {
  const cert = puzzle.certificate;
  if (cert === null || cert === undefined) {
    return o.checking ? { status: 'checking', text: t('cert.checking') } : { status: 'unchecked', text: t('cert.unchecked') };
  }
  const text = t(has(`cert.${cert.status}`) ? `cert.${cert.status}` : 'cert.unchecked');
  return { status: cert.status, text: o.claimed && cert.verified !== true ? `${text}${t('cert.claimed')}` : text };
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
  const newButton = actionButton('', 'puzzles.new', 'new-puzzles', 'primary');
  const addButton = actionButton('', 'puzzles.add', 'add-more');
  const playAllButton = actionButton('▶', 'puzzles.playAll', 'play-all');
  const exportButton = actionButton('⬇', 'puzzles.exportPack', 'export-pack');
  const copyButton = actionButton('🔗', 'puzzles.copyPackLink', 'copy-pack-link');
  const controls = el('div', { className: 'control-row puzzle-controls' },
    el('label', { className: 'field' }, loc('puzzles.quantity'), quantityInput),
    el('label', { className: 'field' }, loc('puzzles.level'), levelSelect),
    newButton, addButton, playAllButton, exportButton, copyButton);
  const blockText = el('p', { className: 'hint', dataset: { role: 'block' } });
  const progressHost = options.progressHost ?? el('div', { dataset: { role: 'progress-host' } });
  const noticeBox = options.noticeHost ?? el('div', { className: 'result-notice', attrs: { role: 'status' }, dataset: { role: 'notice' } });
  const cardList = el('ol', { className: 'puzzle-cards', attrs: { ...locAttrs({ 'aria-label': 'puzzles.list' }), id: `${uid}-cards` }, dataset: { role: 'cards' } });
  const parkedBox = el('div', { className: 'parked-packs', dataset: { role: 'parked' } });
  const emptyText = el('p', { className: 'hint', dataset: { role: 'empty' } });
  const cardsHost = options.cardsHost ?? null;
  host.append(el('div', { className: 'puzzle-panel' }, controls, blockText,
    ...(options.progressHost ? [] : [progressHost]), ...(options.noticeHost ? [] : [noticeBox]),
    ...(cardsHost === null ? [emptyText, cardList, parkedBox] : [])));
  cardsHost?.append(emptyText, cardList, parkedBox);

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
    const play = /** @type {HTMLAnchorElement} */ (el('a', { className: 'pm-btn card-play', attrs: { 'data-action': 'play' } },
      el('span', { attrs: { 'aria-hidden': 'true' }, text: '▶' }), ' ', loc('card.play')));
    const copy = actionButton('🔗', 'card.copy', 'copy-link');
    const exportBtn = actionButton('⬇', 'card.export', 'export-puzzle');
    const remove = actionButton('🗑', 'card.remove', 'remove');
    const item = /** @type {HTMLLIElement} */ (el('li', { className: 'puzzle-card', dataset: { puzzleId: id } },
      thumb, el('div', { className: 'card-body' }, title, rating, clues, cert, verify, note,
        el('div', { className: 'card-actions' }, play, copy, exportBtn, remove))));
    const view = mountBoard(thumb, { mode: 'thumbnail', cellPx, label: t('card.preview') });

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
      card.title.textContent = puzzleTitle(puzzle.title, index);
      card.view.svg.setAttribute('aria-label', t('card.preview'));
      card.rating.textContent = describeRating(puzzle, claimed.has(puzzle.id));
      const percent = pieces === 0 ? 0 : Math.round((puzzle.clues.length / pieces) * 100);
      card.clues.textContent = t('card.preplaced', { count: puzzle.clues.length, percent });
      const certificate = describeCertificate(puzzle, { claimed: claimed.has(puzzle.id), checking: checking.has(puzzle.id) || fresh });
      card.cert.textContent = certificate.text;
      card.cert.dataset.status = certificate.status;
      const verification = state.verification[puzzle.id];
      card.verify.textContent = verification === undefined || !has(`verify.${verification}`) ? '' : t(`verify.${verification}`);
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
      const aria = t('card.play.aria', { title: card.title.textContent });
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
      card.note.textContent = link === undefined ? '' : linkWarning(link) ?? '';
      card.copy.setAttribute('aria-label', t('card.copy.aria', { title: card.title.textContent }));
      card.exportBtn.setAttribute('aria-label', t('card.export.aria', { title: card.title.textContent }));
      card.remove.setAttribute('aria-label', t('card.remove.aria', { title: card.title.textContent }));
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
      actions.append(loc('notice.action.newSet', { attrs: { type: 'button', 'data-action': 'new-set' }, on: { click: () => options.onNewSet() } }, 'button'));
    }
    if (notice.actions.includes('reset-history')) {
      actions.append(loc('notice.action.resetHistory', { attrs: { type: 'button', 'data-action': 'reset-history' }, on: { click: () => controller.resetHistory() } }, 'button'));
    }
    if (notice.actions.includes('smaller-quantity') && notice.room !== undefined) {
      const room = notice.room;
      actions.append(el('button', { text: t('notice.action.askFor', { room }), attrs: { type: 'button', 'data-action': 'smaller-quantity' }, on: { click: () => controller.requestFewer(room) } }));
    }
    if (actions.children.length > 0) {
      nodes.push(actions);
    }
    noticeBox.replaceChildren(...nodes);
  }

  /** @param {GeneratorState} state */
  function renderParked(state) {
    parkedBox.replaceChildren(...state.parked.map((group, index) => el('div', { className: 'parked-pack control-row', dataset: { parked: String(index) } },
      el('span', { text: t('puzzles.parked', { count: group.length }) }),
      loc('puzzles.exportParked', { attrs: { type: 'button', 'data-action': 'export-parked' }, on: { click: () => controller.exportParked(index) } }, 'button'))));
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
    emptyText.textContent = set === null ? t('puzzles.empty.noSet') : !hasPuzzles && !busy ? t('puzzles.empty.none') : '';
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
    refresh: () => {
      progress.refresh();
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
      progress.destroy();
      for (const card of cards.values()) {
        card.view.destroy();
      }
      cards.clear();
      host.replaceChildren();
      cardsHost?.replaceChildren();
    },
  };
}
