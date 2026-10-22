// @ts-check
// Generator application shell: wires the store, persistence, the board, level, piece-set and puzzle
// panels, the job controller and the sticky action bar. `setHandlers` stays available so tests and
// other hosts can replace the job actions.
import storage, { SAVE_FAILED_MESSAGE } from '../core/browser/storage.js';
import { copyText, showToast } from '../core/browser/dom.js';
import { createGenerationClient } from '../core/browser/generation-client.js';
import { downloadPack, openInPlayer, preparePlayerLink } from '../core/browser/handoff.js';
import { createPool } from '../core/browser/worker-pool.js';
import { APP_VERSION } from '../core/engine/version.js';
import {
  createGeneratorStore, createPersistence, describeBoard, detectHardware, isBusy, loadGeneratorState,
} from './state.js';
import { createJobController } from './jobs.js';
import { mountBoardEditor } from './ui/board-editor.js';
import { mountLevelPanel } from './ui/level-panel.js';
import { mountPuzzlePanel } from './ui/puzzle-panel.js';
import { mountSetPanel } from './ui/set-panel.js';
import { GENERATION_PENDING } from './strings.js';

/** @typedef {import('./ui/level-panel.js').GenerateSetRequest} GenerateSetRequest */

/**
 * Actions the job code provides. Missing handlers keep their controls disabled.
 * @typedef {object} GeneratorHandlers
 * @property {(request: GenerateSetRequest) => void} [onGenerateSet] Generate Piece Set (the seed field is already updated).
 * @property {() => void} [onNewPuzzles]
 * @property {() => void} [onAddMore]
 * @property {() => void} [onCancel]
 */

/**
 * @param {Document} doc
 * @param {string} role
 * @returns {HTMLElement}
 */
function slot(doc, role) {
  const found = /** @type {HTMLElement | null} */ (doc.querySelector(`[data-slot="${role}"]`));
  if (found === null) {
    throw new Error(`generator page is missing the "${role}" region`);
  }
  return found;
}

/**
 * Runs one bounded worker task (an import check) on its own single-worker pool, so it never
 * interferes with the generation client's request numbering.
 * @param {() => import('../core/browser/worker-pool.js').WorkerLike} [workerFactory]
 * @returns {NonNullable<import('./jobs.js').JobControllerOptions['runWorkerTask']>}
 */
function dedicatedTaskRunner(workerFactory) {
  return async (kind, payload, { signal }) => {
    const pool = createPool({ size: 1, ...(workerFactory === undefined ? {} : { workerFactory }) });
    const abort = () => pool.cancelAll();
    pool.beginRequest({ requestId: 1, revision: 'import' });
    signal.addEventListener('abort', abort, { once: true });
    try {
      return await pool.run({ requestId: 1, revision: 'import', kind, payload, signal });
    } finally {
      signal.removeEventListener('abort', abort);
      pool.endRequest(1);
      pool.close();
    }
  };
}

/**
 * @param {Document} doc
 * @param {{ storage?: import('./state.js').StorageLike, env?: any, confirm?: (message: string) => boolean,
 *   random?: () => string, client?: import('../core/browser/generation-client.js').GenerationClient,
 *   pool?: import('../core/browser/worker-pool.js').Pool, workerFactory?: () => import('../core/browser/worker-pool.js').WorkerLike,
 *   workersAvailable?: boolean, handoff?: import('../core/browser/handoff.js').HandoffEnv,
 *   controller?: Partial<import('./jobs.js').JobControllerOptions> }} [options]
 */
export function createGeneratorApp(doc, options = {}) {
  const io = options.storage ?? storage;
  const store = createGeneratorStore(loadGeneratorState(io));
  const hardware = detectHardware(options.env ?? doc.defaultView ?? globalThis);
  /** @type {GeneratorHandlers} */
  const handlers = {};
  let failureShown = false;
  const persistence = createPersistence(store, io, {
    onFailure: () => {
      if (!failureShown) {
        failureShown = true;
        showToast(SAVE_FAILED_MESSAGE, { kind: 'warning' });
      }
    },
  });

  const editor = mountBoardEditor(slot(doc, 'board'), { store, hardware, confirm: options.confirm });
  const level = mountLevelPanel(slot(doc, 'level'), { store, hardware, getHandlers: () => handlers, random: options.random });
  const regions = { set: slot(doc, 'set'), puzzles: slot(doc, 'puzzles') };

  const win = doc.defaultView;
  const pool = options.client === undefined ? options.pool ?? createPool(options.workerFactory === undefined ? {} : { workerFactory: options.workerFactory }) : null;
  const client = options.client ?? createGenerationClient(/** @type {import('../core/browser/worker-pool.js').Pool} */ (pool));
  const handoffEnv = options.handoff ?? {};
  const controller = createJobController({
    store,
    hardware,
    client,
    workersAvailable: options.workersAvailable ?? (options.workerFactory !== undefined || typeof /** @type {any} */ (win ?? globalThis).Worker === 'function'),
    cancelPending: () => pool?.cancelAll(),
    runWorkerTask: dedicatedTaskRunner(options.workerFactory),
    prepareLink: (pack, index) => preparePlayerLink(pack, index, handoffEnv),
    openPlayer: (pack, index) => openInPlayer(pack, index, handoffEnv),
    download: (pack, name, o) => downloadPack(pack, name, o),
    copy: copyText,
    notify: (message, kind) => void showToast(message, { kind }),
    saveLibrary: (pack) => void (handoffEnv.storage ?? storage).saveLibraryPack(pack),
    beforeNavigate: () => persistence.saveNow(),
    ...options.controller,
  });
  const setPanel = mountSetPanel(regions.set, { store, controller });
  const puzzlePanel = mountPuzzlePanel(regions.puzzles, { store, hardware, controller, onNewSet: () => void level.generate() });
  const unsubscribeBoard = store.subscribe((state, previous) => {
    if (state.board !== previous.board && state.set !== previous.set) {
      editor.history.clear();
    }
  });
  handlers.onGenerateSet = (request) => void controller.generateSet(request);
  handlers.onNewPuzzles = () => void controller.newPuzzles();
  handlers.onAddMore = () => void controller.addMore();
  handlers.onCancel = () => controller.cancel();
  level.refresh();

  const stickyStatus = slot(doc, 'sticky-status');
  const stickyAction = /** @type {HTMLButtonElement} */ (slot(doc, 'sticky-action'));
  /** @type {() => void} */
  let stickyRun = () => {};

  function syncSticky() {
    const state = store.getState();
    const description = describeBoard(state, hardware);
    stickyStatus.textContent = description.statusText;
    if (isBusy(state)) {
      stickyAction.textContent = 'Cancel';
      stickyAction.disabled = typeof handlers.onCancel !== 'function';
      stickyRun = () => handlers.onCancel?.();
    } else if (state.set !== null && !state.stale) {
      stickyAction.textContent = 'New Puzzles';
      stickyAction.disabled = typeof handlers.onNewPuzzles !== 'function';
      stickyRun = () => handlers.onNewPuzzles?.();
    } else {
      stickyAction.textContent = 'Generate Piece Set';
      stickyAction.disabled = typeof handlers.onGenerateSet !== 'function' || !description.valid || !description.levelOffered;
      stickyRun = () => void level.generate();
    }
    stickyAction.title = stickyAction.disabled && typeof handlers.onGenerateSet !== 'function' ? GENERATION_PENDING : '';
  }

  const onStickyClick = () => stickyRun();
  stickyAction.addEventListener('click', onStickyClick);
  const unsubscribe = store.subscribe(syncSticky);
  syncSticky();

  const onHide = () => persistence.flush();
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') {
      persistence.flush();
    }
  };
  win?.addEventListener('pagehide', onHide);
  doc.addEventListener('visibilitychange', onVisibility);

  const versionLabel = doc.querySelector('[data-app-version]');
  if (versionLabel) {
    versionLabel.textContent = APP_VERSION;
  }

  return {
    store,
    hardware,
    editor,
    level,
    controller,
    setPanel,
    puzzlePanel,
    regions,
    /** Registers the job actions; controls that need them become enabled. @param {GeneratorHandlers} next */
    setHandlers(next) {
      Object.assign(handlers, next);
      level.refresh();
      syncSticky();
    },
    destroy() {
      unsubscribe();
      unsubscribeBoard();
      controller.destroy();
      setPanel.destroy();
      puzzlePanel.destroy();
      stickyAction.removeEventListener('click', onStickyClick);
      win?.removeEventListener('pagehide', onHide);
      doc.removeEventListener('visibilitychange', onVisibility);
      persistence.destroy();
      editor.destroy();
      level.destroy();
      store.destroy();
    },
  };
}

if (typeof document !== 'undefined' && document.body?.dataset.app === 'generator') {
  createGeneratorApp(document);
  document.documentElement.dataset.ready = 'true';
}
