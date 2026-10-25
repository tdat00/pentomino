// @ts-check
// Puzzle list (left panel): one card per puzzle of the open pack, in the generator's card layout: the name, the
// level and score, the pieces to place, the progress and a preview of the board with its locked pieces. A card
// opens its puzzle; the open one is marked. A pack can hold 100 puzzles on a large board, so a preview is drawn
// only once its card comes near the window, and again when the view angle changes while it is near.

import { el } from '../../core/browser/dom.js';
import { packBoard } from '../../core/engine/pack.js';
import { mountBoard } from '../../core/browser/svg-board.js';
import { getLocale, t } from '../i18n.js';
import { cardHeading } from '../puzzle-title.js';
import { effectiveRotation, knownSolvable } from '../state.js';
import { LABELS, certificateLabel, certificateStatus, puzzleStatusLabel } from '../strings.js';
import { loc, locAttrs } from './i18n-dom.js';
import { setRating } from './rating-dom.js';

/** @typedef {import('../state.js').PlayerState} PlayerState */

const CARD_PREVIEW_PX = 116;
/** A preview is drawn when its card is this close to the window. */
const NEAR_PX = 300;

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
 * @typedef {object} Card
 * @property {HTMLLIElement} item
 * @property {ReturnType<typeof mountBoard>} view
 * @property {HTMLElement} heading
 * @property {HTMLElement} rating
 * @property {HTMLElement} toPlace
 * @property {HTMLElement} cert
 * @property {HTMLElement} status
 * @property {HTMLButtonElement} select
 * @property {HTMLButtonElement} remove
 * @property {number} index
 * @property {boolean} near The card is close to the window (always true without IntersectionObserver).
 * @property {string} previewKey Key of the drawn preview; empty before the first drawing.
 */

/**
 * @typedef {object} Preview
 * @property {string} key
 * @property {number} angle
 * @property {import('../../core/engine/types.js').Pack} pack
 * @property {import('../../core/engine/types.js').Board} board
 */

/**
 * The newest puzzle (the last of the pack) is on top, as in the generator.
 * @param {HTMLElement} host
 * @param {{ onSelect: (index: number) => void, onRemove: (index: number) => void }} handlers
 */
export function createPuzzleList(host, { onSelect, onRemove }) {
  const win = /** @type {Window & typeof globalThis} */ (host.ownerDocument.defaultView);
  const empty = loc('puzzles.empty', { className: 'hint', dataset: { role: 'empty' } }, 'p');
  const list = el('ol', { className: 'puzzle-cards', attrs: locAttrs({ 'aria-label': 'puzzles.list' }), dataset: { role: 'cards' } });
  host.append(empty, list);

  /** @type {Card[]} */
  let cards = [];
  /** @type {Preview | null} */
  let preview = null;
  /**
   * What the cards drew last; a store update that changes none of it (a timer tick) costs nothing.
   * @type {{ pack: object | null, statuses: object, verification: object, index: number, screen: string, prefs: object, viewRotation: number | null, locale: string } | null}
   */
  let drawn = null;
  let drawnIndex = -1;

  /** @type {WeakMap<Element, Card>} */
  const byItem = new WeakMap();
  const observer = typeof win.IntersectionObserver === 'function'
    ? new win.IntersectionObserver((entries) => {
      for (const entry of entries) {
        const card = byItem.get(entry.target);
        if (card !== undefined) {
          card.near = entry.isIntersecting;
          drawPreview(card);
        }
      }
    }, { rootMargin: `${NEAR_PX}px` })
    : null;

  /** Draws the preview of a card that is near, when its key changed. @param {Card} card */
  function drawPreview(card) {
    if (!card.near || preview === null || card.previewKey === preview.key) {
      return;
    }
    card.previewKey = preview.key;
    if (card.view.getState().rotation !== preview.angle) {
      card.view.setRotation(preview.angle);
    }
    card.view.render({
      board: preview.board,
      pieces: preview.pack.pieces,
      clues: preview.pack.puzzles[card.index].clues,
      placements: [],
      showLabels: true,
      showPatterns: true,
    });
  }

  /** @param {Card} card */
  function destroyCard(card) {
    observer?.unobserve(card.item);
    card.view.destroy();
    card.item.remove();
  }

  /**
   * @param {number} index
   * @param {number} cellPx
   * @returns {Card}
   */
  function createCard(index, cellPx) {
    const thumb = el('div', { className: 'card-thumb' });
    const heading = el('span', { className: 'card-heading' });
    const rating = el('p', { className: 'card-rating' });
    const toPlace = el('p', { className: 'card-clues' });
    const cert = el('p', { className: 'badge card-cert' });
    const status = el('span', { className: 'badge card-status' });
    const select = /** @type {HTMLButtonElement} */ (el('button', {
      className: 'card-select', attrs: { type: 'button' }, dataset: { action: 'select', index: String(index) },
      on: { click: () => onSelect(index) },
    }, el('div', { className: 'card-body' }, el('p', { className: 'card-title' }, status, heading), rating, toPlace, cert), thumb));
    const remove = /** @type {HTMLButtonElement} */ (el('button', {
      className: 'card-remove ghost-small', text: '✕', attrs: { type: 'button' }, dataset: { action: 'remove', index: String(index) },
      on: {
        click: () => {
          const at = [...list.querySelectorAll('.card-remove')].indexOf(remove);
          onRemove(index);
          // Keep the keyboard where it was: the card that took the place, else the one before it.
          const left = /** @type {HTMLElement[]} */ ([...list.querySelectorAll('.card-remove')]);
          left[Math.min(at, left.length - 1)]?.focus();
        },
      },
    }));
    const item = /** @type {HTMLLIElement} */ (el('li', { className: 'puzzle-card', dataset: { puzzleIndex: String(index) } }, select, remove));
    const view = mountBoard(thumb, { mode: 'thumbnail', cellPx, label: t('card.preview') });
    /** @type {Card} */
    const card = { item, view, heading, rating, toPlace, cert, status, select, remove, index, near: observer === null, previewKey: '' };
    byItem.set(item, card);
    return card;
  }

  /**
   * Scrolls the panel that holds the list, not the page, so that the open card shows.
   * @param {HTMLElement} item
   */
  function reveal(item) {
    const panel = /** @type {HTMLElement | null} */ (host.closest('.app-history'));
    if (panel === null || panel.scrollHeight <= panel.clientHeight) {
      return;
    }
    const box = panel.getBoundingClientRect();
    const at = item.getBoundingClientRect();
    if (at.top < box.top) {
      panel.scrollTop -= box.top - at.top + 8;
    } else if (at.bottom > box.bottom) {
      panel.scrollTop += at.bottom - box.bottom + 8;
    }
  }

  /** @param {PlayerState} state */
  function render(state) {
    const { pack } = state;
    const locale = getLocale();
    if (drawn !== null && drawn.pack === pack && drawn.statuses === state.statuses && drawn.verification === state.verificationByPuzzle
      && drawn.index === state.index && drawn.screen === state.screen && drawn.prefs === state.prefs && drawn.viewRotation === state.viewRotation
      && drawn.locale === locale) {
      return;
    }
    const packChanged = drawn === null || drawn.pack !== pack;
    drawn = {
      pack, statuses: state.statuses, verification: state.verificationByPuzzle, index: state.index, screen: state.screen, prefs: state.prefs,
      viewRotation: state.viewRotation, locale,
    };
    if (packChanged) {
      for (const card of cards) {
        destroyCard(card);
      }
      cards = [];
      preview = null;
      drawnIndex = -1;
      if (pack !== null) {
        const board = packBoard(pack);
        const cellPx = thumbnailCellPx(board, CARD_PREVIEW_PX);
        cards = pack.puzzles.map((_, index) => createCard(index, cellPx));
        list.replaceChildren(...cards.map((card) => card.item).reverse());
        preview = { key: '', angle: 0, pack, board };
        for (const card of cards) {
          observer?.observe(card.item);
        }
      }
    }
    empty.hidden = pack !== null;
    list.hidden = pack === null;
    if (pack === null || preview === null) {
      return;
    }
    const angle = effectiveRotation(state);
    preview = { ...preview, key: String(angle), angle };
    cards.forEach((card, index) => {
      const puzzle = pack.puzzles[index];
      const status = state.statuses[index] ?? 'new';
      const current = index === state.index && state.screen === 'game';
      card.heading.textContent = cardHeading(puzzle.title, index);
      const removeLabel = t('card.remove.aria', { title: card.heading.textContent });
      card.remove.setAttribute('aria-label', removeLabel);
      card.remove.title = removeLabel;
      const rating = setRating(card.rating, puzzle.rating);
      card.rating.hidden = !rating;
      card.toPlace.textContent = LABELS.toPlace(Math.max(0, pack.pieces.length - puzzle.clues.length));
      const solvable = knownSolvable(puzzle, state.verificationByPuzzle[index]);
      card.cert.textContent = certificateLabel(puzzle.certificate, solvable);
      card.cert.dataset.status = certificateStatus(puzzle.certificate, solvable);
      card.cert.hidden = card.cert.textContent === '';
      card.status.textContent = puzzleStatusLabel(status);
      card.status.dataset.status = status;
      card.item.dataset.selected = String(current);
      card.item.dataset.status = status;
      card.select.setAttribute('aria-pressed', String(current));
      card.view.svg.setAttribute('aria-label', t('card.preview'));
      if (current) {
        card.select.setAttribute('aria-current', 'true');
      } else {
        card.select.removeAttribute('aria-current');
      }
      drawPreview(card);
    });
    if (state.index !== drawnIndex && state.screen === 'game') {
      drawnIndex = state.index;
      const open = cards[state.index];
      if (open !== undefined) {
        reveal(open.item);
      }
    }
  }

  return {
    render,
    destroy() {
      observer?.disconnect();
      for (const card of cards) {
        destroyCard(card);
      }
      cards = [];
      empty.remove();
      list.remove();
    },
  };
}
