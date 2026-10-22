// @ts-check
// Player: builds the screen, wires the store to the views, and attaches the
// gestures, keyboard, selection toolbar, timer, saving and the win dialog. All
// user data is rendered with `textContent`; engine work never runs on this
// thread except the pure game model.

import { APP_VERSION } from '../core/engine/version.js';
import { el } from '../core/browser/dom.js';
import { browserStorage } from '../core/browser/storage.js';
import { shouldOfferStraighten } from '../core/browser/svg-board.js';
import { createPlayController } from './play.js';
import { createPlayerController, createPlayerStore, effectiveRotation } from './state.js';
import {
  LABELS, certificateLabel, formatElapsed, ratingLabel, verificationLabel,
} from './strings.js';
import { createBoardView } from './ui/board-view.js';
import { createConfirmDialog, createHelpDialog } from './ui/dialogs.js';
import { createDragLayer } from './ui/drag-layer.js';
import { bindGestures } from './ui/gestures.js';
import { createImportView } from './ui/import-view.js';
import { SHORTCUTS, createKeyboard } from './ui/keyboard.js';
import { createPackMenu } from './ui/pack-menu.js';
import { createToolbar } from './ui/toolbar.js';
import { createTrayView } from './ui/tray-view.js';
import { createWinDialog } from './ui/win-dialog.js';

/** @typedef {import('./state.js').PlayerState} PlayerState */

const MIN_ZOOM_PX = 14;
const MAX_ZOOM_PX = 64;
const ZOOM_STEP = 1.25;

let instances = 0;

/**
 * Injection points; everything defaults to the browser.
 * @typedef {object} PlayerEnv
 * @property {ReturnType<typeof browserStorage>} [storage]
 * @property {{ hash: string, pathname: string, search: string }} [location]
 * @property {{ replaceState: (state: unknown, title: string, url: string) => void }} [history]
 * @property {(url: string) => Promise<string>} [fetchText]
 * @property {string | URL} [baseUrl]
 * @property {() => import('./state.js').PoolLike} [createPool]
 * @property {(pack: import('../core/engine/types.js').Pack, name: string) => void} [download]
 * @property {boolean} [coarsePointer]
 * @property {boolean} [reducedMotion] Overrides `prefers-reduced-motion`.
 * @property {() => number} [now] Millisecond clock of the timer and the save stamp.
 * @property {number} [saveDelayMs] Debounce of progress saving (250 by default).
 * @property {boolean} [listenHashChange] Default true: react to the address bar.
 */

/**
 * @param {HTMLElement} root
 * @param {PlayerEnv} [env]
 */
export function mountPlayer(root, env = {}) {
  const doc = root.ownerDocument;
  const win = /** @type {Window & typeof globalThis} */ (doc.defaultView ?? globalThis);
  instances += 1;
  const helpId = `board-help-${instances}`;
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

  // Top bar: ☰ Pack ▾ │ title · rating │ timer │ moves │ Undo │ Redo │ Reset │ Straighten │ Import
  const menuHost = el('div', { className: 'pack-menu' });
  const title = el('span', { className: 'top-title' });
  const timer = el('span', { className: 'top-timer', attrs: { role: 'timer', 'aria-label': 'Elapsed time' } });
  const moves = el('span', { className: 'top-moves' });
  /**
   * @param {string} action
   * @param {string} text
   * @returns {HTMLButtonElement}
   */
  const barButton = (action, text) => /** @type {HTMLButtonElement} */ (el('button', {
    className: 'pm-btn', text, attrs: { type: 'button' }, dataset: { action },
  }));
  const undo = barButton('undo', LABELS.undo);
  const redo = barButton('redo', LABELS.redo);
  const reset = barButton('reset', LABELS.reset);
  for (const button of [undo, redo, reset]) {
    button.disabled = true;
  }
  const straighten = barButton('straighten', LABELS.straighten);
  straighten.hidden = true;
  straighten.addEventListener('click', () => controller.setPref('straighten', !store.getState().prefs.straighten));
  const importButton = barButton('import', LABELS.import);
  importButton.addEventListener('click', () => controller.showImport());
  const topbar = el('header', { className: 'topbar' }, menuHost, title, timer, moves, undo, redo, reset, straighten, importButton);

  // Status line: restoration notice, Continue / Restart, errors and trust badges.
  /**
   * @param {string} action
   * @param {string} text
   * @param {() => void} run
   */
  const statusButton = (action, text, run) => el('button', {
    className: 'pm-btn', text, attrs: { type: 'button' }, dataset: { action }, on: { click: () => run() },
  });
  const errorText = el('span', { className: 'status-text' });
  const errorBox = el('div', { className: 'status-error', attrs: { role: 'alert', hidden: '' } }, errorText,
    statusButton('dismiss-error', 'Dismiss', () => controller.dismissError()));
  const noticeText = el('span', { className: 'status-text' });
  const noticeBox = el('div', { className: 'status-notice', attrs: { role: 'status', hidden: '' } }, noticeText,
    statusButton('dismiss-notice', 'Dismiss', () => controller.dismissNotice()));
  const resumeText = el('span', { className: 'status-text' });
  const resumeBox = el('div', { className: 'status-resume', attrs: { role: 'group', 'aria-label': 'Saved progress', hidden: '' } }, resumeText,
    statusButton('continue', LABELS.continue, () => controller.resume('continue')),
    statusButton('restart', LABELS.restart, () => controller.resume('restart')));
  const badgeVerification = el('span', { className: 'badge badge-verification', dataset: { badge: 'verification' } });
  const badgeCertificate = el('span', { className: 'badge badge-certificate', dataset: { badge: 'certificate' } });
  const badgeLocal = el('span', { className: 'badge badge-local', dataset: { badge: 'local' } });
  const badgeStorage = el('span', { className: 'badge badge-storage', dataset: { badge: 'storage' }, attrs: { role: 'status' } });
  const badges = el('div', { className: 'status-badges' }, badgeVerification, badgeCertificate, badgeLocal, badgeStorage);
  const statusHost = el('div', { className: 'status-host', dataset: { host: 'status' } }, errorBox, noticeBox, resumeBox, badges);

  // Board and tray.
  const boardHost = el('div', { className: 'board-host', dataset: { host: 'board' } });
  const boardHelp = el('p', { className: 'sr-only', text: LABELS.boardHelp, attrs: { id: helpId } });
  /**
   * @param {string} action
   * @param {string} text
   * @param {string} label
   */
  const zoomButton = (action, text, label) => el('button', { className: 'pm-btn', text, attrs: { type: 'button', 'aria-label': label }, dataset: { action } });
  const zoomOut = zoomButton('zoom-out', '−', LABELS.zoomOut);
  const zoomIn = zoomButton('zoom-in', '+', LABELS.zoomIn);
  const zoomFit = zoomButton('zoom-fit', '⤢', LABELS.zoomFit);
  const zoom = el('div', { className: 'board-zoom', attrs: { role: 'group', 'aria-label': 'Zoom' } }, zoomOut, zoomIn, zoomFit);
  const boardWrap = el('div', { className: 'board-wrap' }, boardHost, boardHelp, zoom);
  const trayHost = el('div', { className: 'tray-host', dataset: { host: 'tray' }, attrs: { role: 'group', 'aria-label': LABELS.trayLabel } });
  const toolbarHost = el('div', { className: 'toolbar-host', dataset: { host: 'toolbar' } });
  const winHost = el('div', { className: 'win-host', dataset: { host: 'win' } });
  const live = el('div', { className: 'sr-only live-region', attrs: { 'aria-live': 'polite', 'aria-atomic': 'true' }, dataset: { host: 'live' } });

  const gameScreen = el('div', { className: 'game', attrs: { hidden: '' } },
    el('h1', { className: 'sr-only', text: LABELS.appName }), topbar, statusHost, trayHost, boardWrap, toolbarHost, winHost);
  const importHost = el('div', { className: 'import-host', dataset: { host: 'import' } });
  const version = el('p', { className: 'version' }, 'Version ', el('span', { text: APP_VERSION, attrs: { 'data-app-version': '' } }));
  root.replaceChildren(gameScreen, importHost, version, live);
  root.classList.add('player');

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
        level: puzzle ? ratingLabel(puzzle.rating) : '',
        hasNext: state.pack !== null && state.index + 1 < state.pack.puzzles.length,
      });
      flash(gameScreen, 'is-celebrating', 1600);
    },
    focus: (pieceId, where) => {
      // A dialog, menu or text field that holds the focus keeps it.
      if (doc.activeElement?.closest('dialog, .menu-panel, input, textarea, select') != null) {
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
  const gestures = bindGestures({ win, play, store, boardView, trayHost, dragLayer });
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
      case 'place':
        play.commitPreview();
        break;
      case 'to-tray':
        play.returnToTray();
        break;
      case 'help':
        helpDialog.open();
        break;
      default:
        showResults();
    }
  });
  const helpDialog = createHelpDialog(winHost, SHORTCUTS);
  const resetDialog = createConfirmDialog(winHost, {
    title: LABELS.resetTitle,
    message: LABELS.resetBody,
    confirmText: LABELS.resetConfirm,
    onConfirm: () => {
      play.reset();
    },
  });
  const winDialog = createWinDialog(winHost, {
    onNext: () => {
      controller.nextPuzzle();
    },
    onReplay: () => {
      controller.replay();
      play.clearInteraction();
    },
  });
  const keyboard = createKeyboard({ target: doc, play, showHelp: () => helpDialog.open() });
  undo.addEventListener('click', () => play.undo());
  redo.addEventListener('click', () => play.redo());
  reset.addEventListener('click', () => resetDialog.open());

  function showResults() {
    const g = store.getState().game;
    if (g?.solved) {
      const state = store.getState();
      const puzzle = state.pack?.puzzles[state.index];
      winDialog.show({
        elapsedMs: g.elapsedMs,
        moves: g.moves,
        level: puzzle ? ratingLabel(puzzle.rating) : '',
        hasNext: state.pack !== null && state.index + 1 < state.pack.puzzles.length,
      });
    }
  }
  const menu = createPackMenu(menuHost, {
    onSelect: (index) => controller.goToPuzzle(index),
    onPrevious: () => controller.previousPuzzle(),
    onNext: () => controller.nextPuzzle(),
    onPref: (name, value) => controller.setPref(name, value),
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

  // The zoom the player chose survives viewport changes; a new puzzle or Fit starts from the fitted size again.
  let userZoomed = false;
  /** @param {number} factor */
  const zoomBy = (factor) => {
    userZoomed = true;
    const next = Math.round(boardView.cellPx() * factor);
    boardView.zoom(Math.max(MIN_ZOOM_PX, Math.min(MAX_ZOOM_PX, next)));
  };
  zoomOut.addEventListener('click', () => zoomBy(1 / ZOOM_STEP));
  zoomIn.addEventListener('click', () => zoomBy(ZOOM_STEP));
  zoomFit.addEventListener('click', () => {
    userZoomed = false;
    boardView.refit();
  });

  /** @param {PlayerState} state */
  function renderTopbar(state) {
    const { pack, game: g } = state;
    const puzzle = pack?.puzzles[state.index];
    const rating = puzzle ? ratingLabel(puzzle.rating) : '';
    const name = puzzle?.title !== undefined && puzzle.title !== '' ? `${puzzle.title} #${state.index + 1}` : LABELS.puzzleNumber(state.index + 1);
    title.textContent = puzzle ? [name, rating].filter((part) => part !== '').join(' · ') : '';
    title.title = title.textContent;
    timer.textContent = g ? formatElapsed(g.elapsedMs) : '';
    timer.hidden = !state.prefs.timer;
    moves.textContent = g ? LABELS.moves(g.moves) : '';
    const busy = play.view().dragging;
    undo.disabled = !g || g.history.length === 0 || busy;
    redo.disabled = !g || g.future.length === 0 || busy;
    reset.disabled = !g || busy || (g.placed.size === 0 && [...g.tray.values()].every((t) => t === 0));
  }

  /** @param {PlayerState} state */
  function renderStatus(state) {
    const { error, notice, resume } = state;
    errorText.textContent = error?.message ?? '';
    errorBox.hidden = error === null;
    noticeText.textContent = notice?.text ?? '';
    noticeBox.hidden = notice === null;
    resumeText.textContent = resume === null ? '' : LABELS.resumeQuestion(resume.placed, resume.solved);
    resumeBox.hidden = resume === null;
    const puzzle = state.pack?.puzzles[state.index];
    const verification = state.verificationByPuzzle[state.index];
    badgeVerification.textContent = verificationLabel(verification);
    badgeVerification.hidden = badgeVerification.textContent === '';
    badgeVerification.dataset.status = verification?.status ?? '';
    badgeCertificate.textContent = puzzle ? certificateLabel(puzzle.certificate) : '';
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
      || play.version() !== drawnUiVersion;
  }

  let drawnUiVersion = -1;
  /** Redraws the board and the tray with the controller's cursor, hints and hidden piece. */
  function renderSurface() {
    const state = store.getState();
    if (state.screen !== 'game' || state.game === null) {
      return;
    }
    const angle = effectiveRotation(state);
    const { cursor, hints, hiddenPieceId, hiddenTrayId } = play.view();
    drawnUiVersion = play.version();
    boardView.render(state, angle, { cursor, hints, hiddenPieceId });
    trayView.render(state, angle);
    trayView.setHidden(hiddenTrayId);
  }

  function renderStraighten() {
    const state = store.getState();
    const rotation = state.pack?.presentation?.rotation ?? 0;
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
    version.hidden = showGame;
    root.dataset.screen = showGame ? 'game' : 'import';
    root.setAttribute('aria-busy', String(state.loading));
    importView.render(state);
    menu.render(state);
    play.onState(state, previous);
    if (!showGame) {
      return;
    }
    if (winDialog.isOpen() && (!state.game?.solved || previous?.index !== state.index || previous.pack !== state.pack)) {
      winDialog.hide();
    }
    renderTopbar(state);
    renderStatus(state);
    renderToolbar(state);
    if (surfaceChanged(state, previous)) {
      renderSurface();
      if (previous === null || previous.screen !== 'game') {
        boardView.refit();
      }
      renderStraighten();
    }
    if (previous === null || previous.game === null || previous.pack !== state.pack || previous.index !== state.index) {
      userZoomed = false;
      announce(`${LABELS.puzzleNumber(state.index + 1)} opened. ${LABELS.piecesLeft(state.game?.tray.size ?? 0)}.`);
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
    renderTopbar(store.getState());
    renderToolbar(store.getState());
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
    toolbar,
    winDialog,
    helpDialog,
    resetDialog,
    gestures,
    announce,
    renderStraighten,
    destroy() {
      play.flush();
      unsubscribe();
      stopPlay();
      gestures.destroy();
      keyboard.destroy();
      play.destroy();
      dragLayer.destroy();
      doc.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      win.cancelAnimationFrame(frame);
      win.removeEventListener('hashchange', onHashChange);
      win.removeEventListener('pagehide', onPageHide);
      controller.destroy();
      boardView.destroy();
      trayView.destroy();
      menu.destroy();
      importView.destroy();
      store.destroy();
      root.replaceChildren();
    },
  };
}

const autoRoot = document.querySelector('[data-player-root]');
if (autoRoot instanceof HTMLElement) {
  mountPlayer(autoRoot);
}
