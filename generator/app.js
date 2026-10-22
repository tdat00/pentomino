// @ts-check
// Generator application shell: wires the store, persistence, the board and level panels and the
// sticky action bar. The piece-set and puzzle regions are empty containers that the job and
// result code attaches to through `regions` and `setHandlers`.
import storage, { SAVE_FAILED_MESSAGE } from '../core/browser/storage.js';
import { showToast } from '../core/browser/dom.js';
import { APP_VERSION } from '../core/engine/version.js';
import {
  createGeneratorStore, createPersistence, describeBoard, detectHardware, isBusy, loadGeneratorState,
} from './state.js';
import { mountBoardEditor } from './ui/board-editor.js';
import { mountLevelPanel } from './ui/level-panel.js';
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
 * @param {Document} doc
 * @param {{ storage?: import('./state.js').StorageLike, env?: any, confirm?: (message: string) => boolean,
 *   random?: () => string }} [options]
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
  const win = doc.defaultView;
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
    regions,
    /** Registers the job actions; controls that need them become enabled. @param {GeneratorHandlers} next */
    setHandlers(next) {
      Object.assign(handlers, next);
      level.refresh();
      syncSticky();
    },
    destroy() {
      unsubscribe();
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
