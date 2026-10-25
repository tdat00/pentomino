// @ts-check
// Player: builds the screen (header, puzzle list, game, pieces to place), wires the store to the views, and
// attaches the gestures, keyboard, selection toolbar, piece menu, timer, saving and the win dialog. All user data is
// rendered with `textContent`; engine work never runs on this thread except the pure game model.

import { APP_VERSION } from '../core/engine/version.js';
import { el } from '../core/browser/dom.js';
import { browserStorage } from '../core/browser/storage.js';
import { shouldOfferStraighten, svgEl } from '../core/browser/svg-board.js';
import { createPlayController } from './play.js';
import { createHintController } from './hints.js';
import { choose, onChange, setLocale, t } from './i18n.js';
import { puzzleDisplayName } from './puzzle-title.js';
import { createPlayerController, createPlayerStore, effectiveRotation } from './state.js';
import {
  HINT_TEXT, LABELS, certificateLabel, formatElapsed, verificationLabel,
} from './strings.js';
import { createBoardView } from './ui/board-view.js';
import { createContextMenu } from './ui/context-menu.js';
import { createConfirmDialog, createHelpDialog } from './ui/dialogs.js';
import { createDragLayer } from './ui/drag-layer.js';
import { bindGestures } from './ui/gestures.js';
import { mountHeader } from './ui/header.js';
import { createHintPanel } from './ui/hint-panel.js';
import { loc, locAttrs } from './ui/i18n-dom.js';
import { createImportView } from './ui/import-view.js';
import { createKeyboard } from './ui/keyboard.js';
import { createPuzzleList } from './ui/puzzle-list.js';
import { setRating } from './ui/rating-dom.js';
import { createToolbar } from './ui/toolbar.js';
import { createTrayView } from './ui/tray-view.js';
import { createWinDialog } from './ui/win-dialog.js';

/** @typedef {import('./state.js').PlayerState} PlayerState */
/** @typedef {import('./play.js').TransformOp} TransformOp */

/** The icon of Replay, on its button and in the board menu. */
const REPLAY_GLYPH = '↻';
const MIN_ZOOM_PX = 14;
const MAX_ZOOM_PX = 64;
const ZOOM_STEP = 1.25;

let instances = 0;

/**
 * Injection points; everything defaults to the browser.
 * @typedef {object} PlayerEnv
 * @property {ReturnType<typeof browserStorage>} [storage]
 * @property {Pick<Storage, 'setItem'> | null} [preferenceStorage] Keeps the language and theme choices (localStorage by default).
 * @property {{ hash: string, pathname: string, search: string }} [location]
 * @property {{ replaceState: (state: unknown, title: string, url: string) => void }} [history]
 * @property {(url: string) => Promise<string>} [fetchText]
 * @property {string | URL} [baseUrl]
 * @property {() => import('./state.js').PoolLike} [createPool]
 * @property {() => import('./hints.js').PoolLike} [createHintPool] Pool of the hint and reveal searches (default: one module worker).
 * @property {(pack: import('../core/engine/types.js').Pack, name: string) => void} [download]
 * @property {boolean} [coarsePointer]
 * @property {boolean} [reducedMotion] Overrides `prefers-reduced-motion`.
 * @property {() => number} [now] Millisecond clock of the timer and the save stamp.
 * @property {number} [saveDelayMs] Debounce of progress saving (250 by default).
 * @property {boolean} [listenHashChange] Default true: react to the address bar.
 */

/** @returns {Pick<Storage, 'setItem'> | null} */
function browserPreferences() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {HTMLElement} root
 * @param {PlayerEnv} [env]
 */
export function mountPlayer(root, env = {}) {
  const doc = root.ownerDocument;
  const win = /** @type {Window & typeof globalThis} */ (doc.defaultView ?? globalThis);
  instances += 1;
  const helpId = `board-help-${instances}`;
  const historyId = `heading-history-${instances}`;
  const titleId = `heading-puzzle-${instances}`;
  const piecesId = `heading-pieces-${instances}`;
  const storage = env.storage ?? browserStorage();
  const store = createPlayerStore({ prefs: storage.getPrefs() });
  const controller = createPlayerController({
    store,
    storage,
    location: env.location,
    history: env.history,
    fetchText: env.fetchText,
    baseUrl: env.baseUrl,
    createPool: env.createPool,
    download: env.download,
  });

  root.replaceChildren();
  root.classList.add('player');
  const header = mountHeader(root, {
    win,
    preferences: env.preferenceStorage === undefined ? browserPreferences() : env.preferenceStorage,
    onHelp: () => helpDialog.open(),
  });

  // Left panel: the puzzles of the open pack, and Remove all.
  const removeAllButton = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'ghost-small',
    attrs: { type: 'button', ...locAttrs({ title: 'puzzles.removeAll.title' }) },
    dataset: { action: 'remove-all-puzzles' },
    on: { click: () => controller.removeAllPuzzles() },
  }, loc('puzzles.removeAll')));
  const cardsHost = el('div', { dataset: { slot: 'cards' } });
  const historyPanel = el('aside', { className: 'app-history panel', attrs: { 'aria-labelledby': historyId } },
    el('div', { className: 'panel-header' }, loc('puzzles.list', { attrs: { id: historyId } }, 'h2'), removeAllButton),
    cardsHost);

  // Main panel, game: puzzle name, trust badges and notices, timer and history buttons, board, selection toolbar.
  const title = el('h2', { className: 'puzzle-title', attrs: { id: titleId } });
  const stepHead = el('div', { className: 'step-head' }, title);
  const info = el('p', { className: 'step-hint puzzle-info' });

  /**
   * @param {import('../core/engine/game.js').GameState} g
   * @returns {boolean} Nothing was done in this game yet: no move, no time, no piece placed or turned.
   */
  const untouched = (g) => g.moves === 0 && g.placed.size === 0 && g.elapsedMs === 0 && [...g.tray.values()].every((t) => t === 0);
  const timer = el('span', { className: 'game-timer', attrs: { role: 'timer', ...locAttrs({ 'aria-label': 'ui.elapsed' }) } });
  const moves = el('span', { className: 'game-moves' });
  /**
   * @param {string} action
   * @param {string} key
   * @returns {HTMLButtonElement}
   */
  const barButton = (action, key) => /** @type {HTMLButtonElement} */ (loc(key, {
    className: 'pm-btn', attrs: { type: 'button' }, dataset: { action },
  }, 'button'));
  const undo = barButton('undo', 'ui.undo');
  const redo = barButton('redo', 'ui.redo');
  for (const button of [undo, redo]) {
    button.disabled = true;
  }
  /**
   * An icon-only button; its name is in `aria-label` and the tooltip.
   * @param {string} action
   * @param {string} icon Id of a symbol of the sprite, or a glyph when it is not an id (`ic-…`).
   * @param {string} labelKey
   * @param {() => void} run
   * @returns {HTMLButtonElement}
   */
  const iconButton = (action, icon, labelKey, run) => /** @type {HTMLButtonElement} */ (el('button', {
    className: icon.startsWith('ic-') ? 'pm-btn icon-btn' : 'pm-btn icon-btn icon-btn--glyph',
    attrs: { type: 'button', ...locAttrs({ 'aria-label': labelKey, title: labelKey }) },
    dataset: { action },
    on: { click: () => run() },
  }, icon.startsWith('ic-')
    ? svgEl('svg', { class: 'icon', 'aria-hidden': 'true', focusable: 'false' }, svgEl('use', { href: `#${icon}` }))
    : icon));
  const hintButton = iconButton('hint', 'ic-hint', 'ui.hintLabel', () => void hints.requestHint());
  // Replay: a brand-new game of the open puzzle (every piece unplaced, timer and moves at zero); it is asked first.
  // Its glyph is the one of the board menu's "Replay the puzzle".
  const replayButton = iconButton('replay', REPLAY_GLYPH, 'ui.replayPuzzle', () => replayDialog.open());
  hintButton.disabled = true;
  replayButton.disabled = true;
  const straighten = /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', text: LABELS.straighten, attrs: { type: 'button', hidden: '' }, dataset: { action: 'straighten' },
    on: { click: () => controller.setPref('straighten', !store.getState().prefs.straighten) },
  }));
  const gameBar = el('div', { className: 'game-bar' },
    el('div', { className: 'game-stats' }, timer, moves),
    el('div', { className: 'game-actions' }, undo, redo, hintButton, replayButton, straighten));

  // Status: restoration notice, errors, hints and trust badges.
  /**
   * @param {string} action
   * @param {string} key
   * @param {() => void} run
   */
  const statusButton = (action, key, run) => loc(key, {
    className: 'pm-btn', attrs: { type: 'button' }, dataset: { action }, on: { click: () => run() },
  }, 'button');
  const errorText = el('span', { className: 'status-text' });
  const errorBox = el('div', { className: 'status-error', attrs: { role: 'alert', hidden: '' } }, errorText,
    statusButton('dismiss-error', 'ui.dismiss', () => controller.dismissError()));
  const noticeText = el('span', { className: 'status-text' });
  const noticeBox = el('div', { className: 'status-notice', attrs: { role: 'status', hidden: '' } }, noticeText,
    statusButton('dismiss-notice', 'ui.dismiss', () => controller.dismissNotice()));
  const badgeVerification = el('span', { className: 'badge badge-verification', dataset: { badge: 'verification' } });
  const badgeCertificate = el('span', { className: 'badge badge-certificate', dataset: { badge: 'certificate' } });
  const badgeLocal = el('span', { className: 'badge badge-local', dataset: { badge: 'local' } });
  const badgeStorage = el('span', { className: 'badge badge-storage', dataset: { badge: 'storage' }, attrs: { role: 'status' } });
  const badges = el('div', { className: 'status-badges' }, badgeVerification, badgeCertificate, badgeLocal, badgeStorage);
  const hintHost = el('div', { className: 'status-hint-host' });
  const statusHost = el('div', { className: 'status-host', dataset: { host: 'status' } }, errorBox, noticeBox, badges);

  // Board and selection toolbar.
  const boardHost = el('div', { className: 'board-host', dataset: { host: 'board' } });
  const boardHelp = loc('ui.boardHelp', { className: 'sr-only', attrs: { id: helpId } }, 'p');
  // Board tools, as in the generator's board editor: zoom out / in, fit, and the view turned by 45°.
  /**
   * @param {string} action
   * @param {string} text
   * @param {string} key
   * @param {() => void} run
   */
  const toolButton = (action, text, key, run) => el('button', {
    className: 'view-btn', text, attrs: { type: 'button', ...locAttrs({ 'aria-label': key, title: key }) }, dataset: { action },
    on: { click: () => run() },
  });
  const zoomOut = toolButton('zoom-out', '−', 'ui.zoomOut', () => zoomBy(1 / ZOOM_STEP));
  const zoomIn = toolButton('zoom-in', '+', 'ui.zoomIn', () => zoomBy(ZOOM_STEP));
  const zoomFit = toolButton('zoom-fit', '⤢', 'ui.zoomFit', () => {
    userZoomed = false;
    boardView.refit();
  });
  const viewLeft = toolButton('view-left', '⟲', 'ui.viewLeft', () => rotateView(45));
  const viewRight = toolButton('view-right', '⟳', 'ui.viewRight', () => rotateView(-45));
  const boardTools = el('div', { className: 'board-tools', attrs: { role: 'group', ...locAttrs({ 'aria-label': 'ui.zoom' }) } },
    zoomOut, zoomIn, zoomFit, viewLeft, viewRight);
  const boardWrap = el('div', { className: 'board-wrap' }, boardHost, boardHelp, boardTools);
  const toolbarHost = el('div', { className: 'toolbar-host', dataset: { host: 'toolbar' } });
  const winHost = el('div', { className: 'win-host', dataset: { host: 'win' } });
  const gameScreen = el('section', { className: 'panel game', attrs: { hidden: '', 'aria-labelledby': titleId } },
    stepHead, info, statusHost, gameBar, hintHost, boardWrap, winHost);

  // Main panel, import: opens a puzzle from a link, a file, pasted text, the library or the sample.
  const importHost = el('section', { className: 'panel import-host', dataset: { host: 'import' } });
  const version = el('p', { className: 'version' }, loc('shell.version'), ' ', el('span', { text: APP_VERSION, attrs: { 'data-app-version': '' } }));

  // Right panel: the pieces still to place.
  const piecesLeft = el('span', { className: 'pieces-left' });
  const trayEmpty = el('p', { className: 'hint tray-empty' });
  const trayHost = el('div', { className: 'tray-host', dataset: { host: 'tray' }, attrs: { role: 'group', ...locAttrs({ 'aria-label': 'ui.trayLabel' }) } });
  const sidePanel = el('aside', { className: 'app-side panel', attrs: { 'aria-labelledby': piecesId } },
    el('div', { className: 'panel-header' }, loc('pieces.title', { attrs: { id: piecesId } }, 'h2'), piecesLeft),
    toolbarHost, trayEmpty, trayHost);

  const live = el('div', { className: 'sr-only live-region', attrs: { 'aria-live': 'polite', 'aria-atomic': 'true' }, dataset: { host: 'live' } });
  // The page order is the focus order: the pieces to place, then the game, then the puzzles. The grid places them.
  root.append(
    el('div', { className: 'app-layout' }, sidePanel, el('main', { className: 'app-main' }, gameScreen, importHost), historyPanel),
    el('footer', { className: 'app-footer' }, el('p', { className: 'app-footer__inner' },
      loc('shell.footer.copyright', { className: 'app-footer__copy' }),
      loc('shell.footer.repo', {
        className: 'app-footer__link',
        attrs: { href: 'https://github.com/tdat00/pentomino/tree/main/player', target: '_blank', rel: 'noopener noreferrer', ...locAttrs({ title: 'shell.footer.repo.title' }) },
      }, 'a'))),
    live);

  /** @param {string} message */
  function announce(message) {
    live.textContent = '';
    // A changed node is re-read even when the text repeats.
    win.setTimeout(() => {
      live.textContent = message;
    }, 30);
  }

  const reducedMotion = () => env.reducedMotion ?? win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  /**
   * Restarts a one-shot CSS animation class unless motion is reduced.
   * @param {HTMLElement} node
   * @param {string} className
   * @param {number} ms
   */
  const flash = (node, className, ms) => {
    if (reducedMotion()) {
      return;
    }
    node.classList.remove(className);
    void node.offsetWidth;
    node.classList.add(className);
    win.setTimeout(() => node.classList.remove(className), ms);
  };

  const play = createPlayController({
    store,
    controller,
    now: env.now,
    saveDelayMs: env.saveDelayMs,
    announce,
    onNoRoom: () => flash(boardWrap, 'is-shaking', 200),
    onSolved: ({ elapsedMs, moves: moveCount }) => {
      const state = store.getState();
      const puzzle = state.pack?.puzzles[state.index];
      winDialog.show({
        elapsedMs,
        moves: moveCount,
        rating: puzzle?.rating,
        hasNext: state.pack !== null && state.index + 1 < state.pack.puzzles.length,
        hints: state.game?.hintsUsed ?? 0,
      });
      flash(gameScreen, 'is-celebrating', 1600);
    },
    focus: (pieceId, where) => {
      // A dialog, menu or text field that holds the focus keeps it.
      if (doc.activeElement?.closest('dialog, [role="menu"], input, textarea, select') != null) {
        return;
      }
      const node = where === 'board'
        ? boardView.view.svg.querySelector(`[data-movable="true"][data-piece-id="${CSS.escape(pieceId)}"]`)
        : trayView.buttonFor(pieceId);
      /** @type {HTMLElement | SVGElement | null} */ (node)?.focus({ preventScroll: true });
    },
  });

  const boardView = createBoardView(boardHost, {
    describedBy: helpId,
    label: LABELS.boardLabel,
    // Pointer taps on pieces belong to the gesture tracker; only Enter and Space arrive here.
    onPiece: (id, event) => {
      if (event.type === 'keydown') {
        play.activate(id);
      }
    },
    onCell: (cell) => {
      play.tapCell(cell);
    },
  });
  const trayView = createTrayView(trayHost, {
    onSelect: (id, event) => {
      if (/** @type {MouseEvent} */ (event).detail === 0) {
        play.activate(id);
      } else if (!gestures.recentlyHandled()) {
        play.tapPiece(id, 'tray');
      }
    },
  });
  const dragLayer = createDragLayer(root);
  // A piece let go anywhere over the pieces panel goes back to the tray.
  const gestures = bindGestures({ win, play, store, boardView, trayHost, dropHost: sidePanel, dragLayer });
  const hints = createHintController({
    store,
    play,
    announce,
    reducedMotion,
    createPool: env.createHintPool,
  });
  const toolbar = createToolbar(toolbarHost, (action) => {
    switch (action) {
      case 'rotate-ccw':
        play.transform('ccw');
        break;
      case 'rotate-cw':
        play.transform('cw');
        break;
      case 'flip-h':
        play.transform('flipH');
        break;
      case 'flip-v':
        play.transform('flipV');
        break;
      default:
        showResults();
    }
  });
  const helpDialog = createHelpDialog(winHost);
  const replayDialog = createConfirmDialog(winHost, {
    titleKey: 'ui.replayTitle',
    messageKey: 'ui.replayBody',
    confirmKey: 'ui.replay',
    onConfirm: () => {
      controller.replay();
      play.clearInteraction();
      announce(HINT_TEXT.replayed);
    },
  });
  replayDialog.dialog.classList.add('pm-replay');
  const winDialog = createWinDialog(winHost, {
    onNext: () => {
      controller.nextPuzzle();
    },
    onReplay: () => {
      controller.replay();
      play.clearInteraction();
    },
  });
  // Created after the replay and victory dialogs so that those keep their place in the page.
  const hintPanel = createHintPanel(hintHost, {
    hints,
    dialogHost: winHost,
    hintButton: () => hintButton,
    onReplay: () => {
      controller.replay();
      play.clearInteraction();
      announce(HINT_TEXT.replayed);
    },
  });
  const keyboard = createKeyboard({ target: doc, play, showHelp: () => helpDialog.open() });
  undo.addEventListener('click', () => play.undo());
  redo.addEventListener('click', () => play.redo());

  function showResults() {
    const g = store.getState().game;
    if (g?.solved && !g.revealed) {
      const state = store.getState();
      const puzzle = state.pack?.puzzles[state.index];
      winDialog.show({
        elapsedMs: g.elapsedMs,
        moves: g.moves,
        rating: puzzle?.rating,
        hasNext: state.pack !== null && state.index + 1 < state.pack.puzzles.length,
        hints: g?.hintsUsed ?? 0,
      });
    }
  }

  const puzzleList = createPuzzleList(cardsHost, {
    onSelect: (index) => {
      const state = store.getState();
      if (index === state.index && state.game !== null) {
        // The puzzle that is open already: no reload, only back from the import screen.
        controller.closeImport();
      } else {
        controller.goToPuzzle(index);
      }
    },
    onRemove: (index) => controller.removePuzzle(index),
  });
  const importView = createImportView(importHost, {
    onFile: (file) => void controller.importFile(file),
    onText: (text) => void controller.importText(text),
    onSample: () => void controller.openSample(),
    onOpen: (id) => void controller.openLibraryPack(id),
    onExport: (id) => {
      const result = controller.exportLibraryPack(id);
      if (!result.ok) {
        announce(result.message ?? LABELS.exportFailed);
      }
    },
    onDelete: (id) => {
      controller.removeLibraryPack(id);
      announce(LABELS.deleted);
    },
    onBack: () => controller.closeImport(),
  });
  importHost.append(version);

  // Piece menu: right-click (or the Menu key, or a long press) on a piece of the tray or a movable one on the board.
  // A right-click anywhere on the board also lists the actions of the whole puzzle.
  const pieceMenu = createContextMenu(root);
  /**
   * @param {string} id
   * @param {TransformOp} op
   */
  const turn = (id, op) => {
    play.select(id);
    play.transform(op);
  };
  /** @returns {import('./ui/context-menu.js').MenuEntry[]} Actions of the whole puzzle. */
  function puzzleEntries() {
    const g = store.getState().game;
    return [
      {
        id: 'unplace-all', icon: '↩', label: LABELS.unplaceAll, danger: true, disabled: g === null || g.placed.size === 0 && [...g.tray.values()].every((t) => t === 0),
        run: () => {
          play.reset();
        },
      },
      { id: 'replay', icon: REPLAY_GLYPH, label: LABELS.replayPuzzle, danger: true, disabled: g === null || untouched(g), run: () => replayDialog.open() },
    ];
  }
  /**
   * @param {MouseEvent} event
   * @param {string} id
   * @param {'tray' | 'board'} from
   * @param {Element} target
   */
  function openPieceMenu(event, id, from, target) {
    event.preventDefault();
    if (store.getState().screen !== 'game' || store.getState().game === null || gestures.isDragging() || !play.select(id)) {
      return;
    }
    const box = target.getBoundingClientRect();
    // A key-triggered menu has no pointer position: it opens under the piece.
    const fromKey = event.clientX === 0 && event.clientY === 0;
    /** @type {import('./ui/context-menu.js').MenuEntry[]} */
    const entries = [
      { id: 'rotate-cw', icon: '⟳', label: LABELS.rotateCw, shortcut: 'E', run: () => turn(id, 'cw') },
      { id: 'rotate-ccw', icon: '⟲', label: LABELS.rotateCcw, shortcut: 'Q', run: () => turn(id, 'ccw') },
      { id: 'flip-h', icon: '⇋', label: LABELS.flipH, shortcut: 'F', run: () => turn(id, 'flipH') },
      { id: 'flip-v', icon: '⇵', label: LABELS.flipV, shortcut: 'V', run: () => turn(id, 'flipV') },
      ...(from === 'board' ? [{
        id: 'to-tray', icon: '↩', label: LABELS.toTrayLabel, shortcut: 'Del', run: () => {
          play.select(id);
          play.returnToTray();
        },
      }, ...puzzleEntries()] : []),
    ];
    pieceMenu.open({
      x: fromKey ? box.left : event.clientX,
      y: fromKey ? box.bottom : event.clientY,
      entries,
      opener: target,
    });
  }
  /** @param {MouseEvent} event Right-click on the board away from a movable piece. */
  function openBoardMenu(event) {
    event.preventDefault();
    if (store.getState().screen !== 'game' || store.getState().game === null || gestures.isDragging()) {
      return;
    }
    pieceMenu.open({ x: event.clientX, y: event.clientY, entries: puzzleEntries(), opener: null });
  }
  /** @param {Event} event */
  const onTrayMenu = (event) => {
    const target = /** @type {Element | null} */ (/** @type {Element} */ (event.target).closest('.tray-piece'));
    if (target !== null) {
      openPieceMenu(/** @type {MouseEvent} */ (event), target.getAttribute('data-piece-id') ?? '', 'tray', target);
    }
  };
  /** @param {Event} event */
  const onBoardMenu = (event) => {
    const target = /** @type {Element | null} */ (/** @type {Element} */ (event.target).closest('[data-movable="true"]'));
    if (target !== null) {
      openPieceMenu(/** @type {MouseEvent} */ (event), target.getAttribute('data-piece-id') ?? '', 'board', target);
    } else {
      openBoardMenu(/** @type {MouseEvent} */ (event));
    }
  };
  trayHost.addEventListener('contextmenu', onTrayMenu);
  boardHost.addEventListener('contextmenu', onBoardMenu);

  // The zoom the player chose survives viewport changes; a new puzzle, a turn of the view or Fit starts from the
  // fitted size again.
  let userZoomed = false;
  /** @param {number} factor */
  function zoomBy(factor) {
    userZoomed = true;
    const next = Math.round(boardView.cellPx() * factor);
    boardView.zoom(Math.max(MIN_ZOOM_PX, Math.min(MAX_ZOOM_PX, next)));
  }
  /** @param {number} delta Counter-clockwise degrees. */
  function rotateView(delta) {
    userZoomed = false;
    controller.rotateView(delta);
  }

  /** @param {PlayerState} state */
  function renderHeadline(state) {
    const { pack, game: g } = state;
    const puzzle = pack?.puzzles[state.index];
    title.textContent = puzzle ? puzzleDisplayName(puzzle.title, state.index) : '';
    const toPlace = puzzle && pack ? LABELS.toPlace(Math.max(0, pack.pieces.length - puzzle.clues.length)) : '';
    setRating(info, puzzle?.rating, toPlace);
    timer.textContent = g ? formatElapsed(g.elapsedMs) : '';
    timer.hidden = !state.prefs.timer;
    moves.textContent = g ? LABELS.moves(g.moves) : '';
    const busy = play.view().dragging;
    undo.disabled = !g || g.history.length === 0 || busy;
    redo.disabled = !g || g.future.length === 0 || busy;
    replayButton.disabled = !g || busy || untouched(g);
    hintButton.disabled = !g || g.solved;
  }

  /** @param {PlayerState} state */
  function renderStatus(state) {
    const { error, notice } = state;
    errorText.textContent = error?.message ?? '';
    errorBox.hidden = error === null;
    noticeText.textContent = notice?.text ?? '';
    noticeBox.hidden = notice === null;
    const puzzle = state.pack?.puzzles[state.index];
    const verification = state.verificationByPuzzle[state.index];
    badgeVerification.textContent = verificationLabel(verification);
    badgeVerification.hidden = badgeVerification.textContent === '';
    badgeVerification.dataset.status = verification?.status ?? '';
    badgeCertificate.textContent = puzzle ? certificateLabel(puzzle.certificate) : '';
    badgeCertificate.dataset.status = puzzle?.certificate?.status ?? 'unchecked';
    badgeCertificate.hidden = puzzle === undefined;
    badgeLocal.textContent = state.local ? LABELS.localLink : '';
    badgeLocal.hidden = !state.local;
    badgeStorage.textContent = state.storageWarning ?? '';
    badgeStorage.hidden = state.storageWarning === null;
  }

  /** @param {PlayerState} state */
  function renderToolbar(state) {
    toolbar.render(state);
  }

  /** @param {PlayerState} state */
  function renderPieces(state) {
    const showGame = state.screen === 'game' && state.game !== null;
    const left = state.game?.tray.size ?? 0;
    piecesLeft.textContent = showGame ? LABELS.piecesLeft(left) : '';
    trayHost.hidden = !showGame;
    toolbarHost.hidden = !showGame;
    trayEmpty.hidden = showGame && left > 0;
    trayEmpty.textContent = showGame ? t('pieces.allPlaced') : t('pieces.empty');
  }

  /**
   * @param {PlayerState} state
   * @param {PlayerState | null} previous
   * @returns {boolean} Whether anything the board or the tray draws has changed.
   */
  function surfaceChanged(state, previous) {
    const a = previous?.game;
    const b = state.game;
    return previous === null || a === null || a === undefined || b === null
      || a.placed !== b.placed || a.tray !== b.tray || a.selected !== b.selected || a.preview !== b.preview
      || a.solved !== b.solved || a.pack !== b.pack || a.index !== b.index
      || previous.prefs !== state.prefs || previous.screen !== state.screen || previous.pack !== state.pack
      || previous.viewRotation !== state.viewRotation
      || hints.getState().version !== drawnHintVersion
      || play.version() !== drawnUiVersion;
  }

  let drawnUiVersion = -1;
  let drawnHintVersion = -1;
  /** Redraws the board and the tray with the controller's cursor, hints and hidden piece. */
  function renderSurface() {
    const state = store.getState();
    if (state.screen !== 'game' || state.game === null) {
      return;
    }
    const angle = effectiveRotation(state);
    const { cursor, hints: axisHints, hiddenPieceId, hiddenTrayId } = play.view();
    drawnUiVersion = play.version();
    const hintState = hints.getState();
    drawnHintVersion = hintState.version;
    boardView.render(state, angle, { cursor, hints: axisHints, hiddenPieceId, hintMarks: hintState.marks });
    trayView.render(state, angle);
    trayView.setHidden(hiddenTrayId);
  }

  function renderStraighten() {
    const state = store.getState();
    const rotation = state.viewRotation ?? state.pack?.presentation?.rotation ?? 0;
    const coarse = env.coarsePointer ?? win.matchMedia?.('(pointer: coarse)')?.matches === true;
    const offered = state.game !== null
      && (shouldOfferStraighten({ cellPx: boardView.cellPx(), rotation, coarsePointer: coarse })
        || (state.prefs.straighten && rotation % 90 !== 0));
    straighten.hidden = !offered;
    straighten.setAttribute('aria-pressed', String(state.prefs.straighten));
    straighten.textContent = state.prefs.straighten ? LABELS.straightenOn : LABELS.straighten;
  }

  /**
   * @param {PlayerState} state
   * @param {PlayerState | null} previous
   */
  function render(state, previous) {
    const showGame = state.screen === 'game' && state.game !== null;
    gameScreen.hidden = !showGame;
    importHost.hidden = showGame;
    root.dataset.screen = showGame ? 'game' : 'import';
    root.setAttribute('aria-busy', String(state.loading));
    importView.render(state);
    puzzleList.render(state);
    removeAllButton.disabled = state.pack === null;
    renderPieces(state);
    play.onState(state, previous);
    if (!showGame) {
      pieceMenu.close(false);
      return;
    }
    if (winDialog.isOpen() && (!state.game?.solved || previous?.index !== state.index || previous.pack !== state.pack)) {
      winDialog.hide();
    }
    renderHeadline(state);
    renderStatus(state);
    renderToolbar(state);
    hintPanel.render(state);
    if (surfaceChanged(state, previous)) {
      renderSurface();
      if (previous === null || previous.screen !== 'game') {
        boardView.refit();
      }
      renderStraighten();
    }
    if (previous === null || previous.game === null || previous.pack !== state.pack || previous.index !== state.index) {
      userZoomed = false;
      announce(t('live.opened', { puzzle: LABELS.puzzleNumber(state.index + 1), left: LABELS.piecesLeft(state.game?.tray.size ?? 0) }));
    }
    if (state.error !== null && previous?.error !== state.error) {
      announce(state.error.message);
    }
    if (state.notice !== null && previous?.notice !== state.notice) {
      announce(state.notice.text);
    }
  }

  const unsubscribe = store.subscribe((state, previous) => render(state, previous));
  // Ui-only changes (a drag in progress, a keyboard cursor) redraw without a store update.
  const stopPlay = play.subscribe(() => {
    renderSurface();
    renderHeadline(store.getState());
    renderToolbar(store.getState());
  });
  // Hint results redraw the board marks and the status box without a store update.
  const stopHints = hints.subscribe(() => {
    renderSurface();
    hintPanel.render(store.getState());
  });
  // A language switch: texts that the page built itself are written again (the fixed ones follow their key).
  const stopLanguage = onChange(() => {
    const state = store.getState();
    boardView.view.svg.setAttribute('aria-label', LABELS.boardLabel);
    importView.refresh();
    puzzleList.render(state);
    renderPieces(state);
    renderStraighten();
    if (state.screen === 'game' && state.game !== null) {
      renderHeadline(state);
      renderStatus(state);
      renderToolbar(state);
      hintPanel.render(state);
    }
  });
  render(store.getState(), null);

  // Viewport changes refit the board; labels and the Straighten offer follow the new cell size.
  /** @type {ResizeObserver | null} */
  let observer = null;
  let frame = 0;
  if (typeof win.ResizeObserver === 'function') {
    observer = new win.ResizeObserver(() => {
      win.cancelAnimationFrame(frame);
      frame = win.requestAnimationFrame(() => {
        if (store.getState().screen === 'game') {
          if (!userZoomed) {
            boardView.refit();
          }
          trayView.refresh();
          renderStraighten();
        }
      });
    });
    observer.observe(boardHost);
  }

  root.addEventListener('dragover', (event) => {
    if (Array.from(/** @type {DragEvent} */ (event).dataTransfer?.types ?? []).includes('Files')) {
      event.preventDefault();
    }
  });
  root.addEventListener('drop', (event) => {
    const file = /** @type {DragEvent} */ (event).dataTransfer?.files?.[0];
    if (file) {
      event.preventDefault();
      void controller.importFile(file);
    }
  });

  const onHashChange = () => {
    void controller.openHash(String((env.location ?? win.location).hash));
  };
  if (env.listenHashChange !== false) {
    win.addEventListener('hashchange', onHashChange);
  }
  const onPageHide = () => play.flush();
  win.addEventListener('pagehide', onPageHide);
  const onVisibility = () => play.setVisible(!doc.hidden);
  doc.addEventListener('visibilitychange', onVisibility);
  onVisibility();

  const ready = controller.start();

  return {
    store,
    controller,
    ready,
    /** Containers of the screen: the board and tray hold the gestures, the toolbar its buttons, `win` the dialogs. */
    hosts: { board: boardHost, tray: trayHost, toolbar: toolbarHost, win: winHost, status: statusHost, live },
    boardView,
    trayView,
    play,
    hints,
    hintPanel,
    toolbar,
    winDialog,
    helpDialog,
    replayDialog,
    gestures,
    puzzleList,
    pieceMenu,
    announce,
    renderStraighten,
    destroy() {
      play.flush();
      unsubscribe();
      stopPlay();
      stopHints();
      stopLanguage();
      hints.destroy();
      gestures.destroy();
      keyboard.destroy();
      play.destroy();
      dragLayer.destroy();
      pieceMenu.destroy();
      doc.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      win.cancelAnimationFrame(frame);
      win.removeEventListener('hashchange', onHashChange);
      win.removeEventListener('pagehide', onPageHide);
      controller.destroy();
      boardView.destroy();
      trayView.destroy();
      puzzleList.destroy();
      importView.destroy();
      header.destroy();
      store.destroy();
      root.replaceChildren();
    },
  };
}

const autoRoot = document.querySelector('[data-player-root]');
if (autoRoot instanceof HTMLElement) {
  setLocale(choose({ search: globalThis.location?.search }), document);
  mountPlayer(autoRoot);
}
