// @ts-check
// Generator application shell: wires the store, persistence, the board, level, piece-set and puzzle
// panels, the job controller and the Back / main-action buttons. `setHandlers` stays available so tests and
// other hosts can replace the job actions.
import storage from '../core/browser/storage.js';
import { copyText, showToast } from '../core/browser/dom.js';
import { createGenerationClient } from '../core/browser/generation-client.js';
import { downloadPack, openInPlayer, preparePlayerLink } from '../core/browser/handoff.js';
import { createPool } from '../core/browser/worker-pool.js';
import { applyTo, detect, getLocale, normalize, onChange, setLocale, t } from './i18n.js';
import { THEME_KEY, applyTheme, effectiveTheme, normalizeTheme } from './ui/theme.js';
import {
  createGeneratorStore, createPersistence, describeBoard, detectHardware, isBusy, loadGeneratorState,
} from './state.js';
import { createJobController } from './jobs.js';
import { mountBoardEditor } from './ui/board-editor.js';
import { mountBoardSummary } from './ui/board-summary.js';
import { mountLevelPanel } from './ui/level-panel.js';
import { mountPuzzlePanel } from './ui/puzzle-panel.js';
import { mountSetPanel } from './ui/set-panel.js';
import { mountWizard } from './ui/wizard.js';

/** Where the chosen interface language is remembered (shared by the pages of this site). */
export const LANGUAGE_KEY = 'pentomino:v1:lang';

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
  const found = optionalSlot(doc, role);
  if (found === null) {
    throw new Error(`generator page is missing the "${role}" region`);
  }
  return found;
}

/**
 * @param {Document} doc
 * @param {string} role
 * @returns {HTMLElement | null}
 */
function optionalSlot(doc, role) {
  return /** @type {HTMLElement | null} */ (doc.querySelector(`[data-slot="${role}"]`));
}

/** @returns {Pick<Storage, 'getItem' | 'setItem'> | null} The browser's local storage, or null when it is blocked. */
function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Language for a page load: `?lang=`, then the saved choice, then the browser languages, then English.
 * @param {{ search?: string, languageStorage?: Pick<Storage, 'getItem'> | null, navigator?: { language?: string, languages?: readonly string[] } }} [sources]
 * @returns {string}
 */
export function chooseLanguage(sources = {}) {
  let stored = null;
  try {
    stored = (sources.languageStorage === undefined ? browserStorage() : sources.languageStorage)?.getItem(LANGUAGE_KEY) ?? null;
  } catch {
    stored = null;
  }
  return detect({
    urlLang: new URLSearchParams(sources.search ?? '').get('lang'),
    stored,
    navigator: sources.navigator ?? globalThis.navigator,
  });
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
 * @param {{ storage?: import('./state.js').StorageLike, env?: any,
 *   random?: () => string, client?: import('../core/browser/generation-client.js').GenerationClient,
 *   pool?: import('../core/browser/worker-pool.js').Pool, workerFactory?: () => import('../core/browser/worker-pool.js').WorkerLike,
 *   workersAvailable?: boolean, handoff?: import('../core/browser/handoff.js').HandoffEnv,
 *   preferenceStorage?: Pick<Storage, 'setItem'> | null,
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
        showToast(t('toast.saveFailed'), { kind: 'warning' });
      }
    },
  });

  const editor = mountBoardEditor(slot(doc, 'board'), { store, hardware, controlsHost: optionalSlot(doc, 'board-controls') });
  const summaryHost = optionalSlot(doc, 'board-summary');
  const boardSummary = summaryHost === null ? null : mountBoardSummary(summaryHost, { store });
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
  const puzzlePanel = mountPuzzlePanel(regions.puzzles, {
    store, hardware, controller, onNewSet: () => void level.generate(),
    progressHost: optionalSlot(doc, 'progress'), noticeHost: optionalSlot(doc, 'notice'), cardsHost: optionalSlot(doc, 'cards'),
  });
  const wizard = mountWizard(doc, { store, hardware });
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

  const mainAction = /** @type {HTMLButtonElement} */ (slot(doc, 'main-action'));
  const mainBack = /** @type {HTMLButtonElement | null} */ (optionalSlot(doc, 'main-back'));
  /** @type {() => void} */
  let mainRun = () => {};

  /**
   * Sets the label of the main action and the language key that keeps it translated.
   * @param {string} key
   */
  function setActionLabel(key) {
    mainAction.textContent = t(key);
    mainAction.dataset.i18n = key;
  }

  /** Brings the Back and main-action buttons (top right of the main screen) in line with the step and the state. */
  function syncActions() {
    const state = store.getState();
    const description = describeBoard(state, hardware);
    const step = wizard?.step ?? null;
    const generateSet = () => {
      setActionLabel('level.generate');
      mainAction.disabled = typeof handlers.onGenerateSet !== 'function' || !description.valid || !description.levelOffered;
      mainRun = () => void level.generate();
    };
    if (isBusy(state)) {
      setActionLabel('progress.cancel');
      mainAction.disabled = typeof handlers.onCancel !== 'function';
      mainRun = () => handlers.onCancel?.();
    } else if (step === 1) {
      setActionLabel('wizard.next.step2');
      mainAction.disabled = !description.valid;
      mainRun = () => void wizard?.next();
    } else if (step === 2 && state.set !== null && !state.stale) {
      setActionLabel('wizard.next.step3');
      mainAction.disabled = false;
      mainRun = () => void wizard?.next();
    } else if (state.set !== null && !state.stale) {
      setActionLabel('puzzles.new');
      mainAction.disabled = typeof handlers.onNewPuzzles !== 'function';
      mainRun = () => handlers.onNewPuzzles?.();
    } else {
      generateSet();
    }
    mainAction.title = mainAction.disabled && typeof handlers.onGenerateSet !== 'function'
      ? t('level.pending')
      : mainAction.disabled && step === 1 ? `${t('level.cannot')} ${description.statusText}` : '';
    if (mainBack !== null) {
      mainBack.hidden = step === null || step === 1;
      mainBack.disabled = step === null || step === 1;
    }
  }

  const onActionClick = () => mainRun();
  const onBackClick = () => void wizard?.back();
  mainAction.addEventListener('click', onActionClick);
  mainBack?.addEventListener('click', onBackClick);
  /** Keeps the one Back / main-action group in the header of the step that is showing, top right of its panel. */
  function placeActions() {
    const group = doc.querySelector('.main-actions');
    const target = wizard === null ? null : doc.querySelector(`[data-step="${wizard.step}"] .step-actions`);
    if (group !== null && target !== null && group.parentElement !== target) {
      target.append(group);
    }
  }

  const unsubscribe = store.subscribe(syncActions);
  const unsubscribeWizard = wizard?.onChange(() => {
    placeActions();
    syncActions();
  });
  placeActions();
  syncActions();

  const onHide = () => persistence.flush();
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') {
      persistence.flush();
    }
  };
  win?.addEventListener('pagehide', onHide);
  doc.addEventListener('visibilitychange', onVisibility);

  // Language: the switch buttons choose it; every panel then draws its texts again.
  const languageButtons = /** @type {HTMLButtonElement[]} */ ([...doc.querySelectorAll('[data-lang]')]);
  const preferences = options.preferenceStorage === undefined ? browserStorage() : options.preferenceStorage;

  function syncLanguageButtons() {
    for (const button of languageButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.lang === getLocale()));
    }
  }

  const unsubscribeLanguage = onChange(() => {
    store.update((s) => (s.notice?.retext === undefined ? s : { ...s, notice: { ...s.notice, text: s.notice.retext() } }));
    editor.refresh();
    boardSummary?.refresh();
    level.refresh();
    setPanel.refresh();
    puzzlePanel.refresh();
    wizard?.refresh();
    syncActions();
    syncLanguageButtons();
    editor.view.fit();
  });

  /** @type {Array<[HTMLButtonElement, () => void]>} */
  const languageHandlers = languageButtons.map((button) => {
    const handler = () => {
      const code = normalize(button.dataset.lang);
      if (code === null) {
        return;
      }
      try {
        preferences?.setItem(LANGUAGE_KEY, code);
      } catch {
        // A blocked storage only means the choice is not remembered.
      }
      setLocale(code, doc);
    };
    button.addEventListener('click', handler);
    return [button, handler];
  });
  syncLanguageButtons();

  // Theme: the buttons choose it and the choice is remembered; without one the system preference applies.
  const themeButtons = /** @type {HTMLButtonElement[]} */ ([...doc.querySelectorAll('[data-theme-value]')]);

  function syncThemeButtons() {
    const prefersDark = win?.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
    const shown = effectiveTheme(doc.documentElement.getAttribute('data-theme'), prefersDark);
    for (const button of themeButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.themeValue === shown));
    }
  }

  /** @type {Array<[HTMLButtonElement, () => void]>} */
  const themeHandlers = themeButtons.map((button) => {
    const handler = () => {
      const theme = normalizeTheme(button.dataset.themeValue);
      if (theme === null) {
        return;
      }
      applyTheme(doc, theme);
      try {
        preferences?.setItem(THEME_KEY, theme);
      } catch {
        // A blocked storage only means the choice is not remembered.
      }
      syncThemeButtons();
    };
    button.addEventListener('click', handler);
    return [button, handler];
  });
  syncThemeButtons();

  wizard?.onChange(() => editor.view.fit());

  return {
    store,
    hardware,
    editor,
    level,
    controller,
    setPanel,
    puzzlePanel,
    wizard,
    regions,
    /** Registers the job actions; controls that need them become enabled. @param {GeneratorHandlers} next */
    setHandlers(next) {
      Object.assign(handlers, next);
      level.refresh();
      syncActions();
    },
    destroy() {
      unsubscribe();
      unsubscribeWizard?.();
      unsubscribeLanguage();
      unsubscribeBoard();
      for (const [button, handler] of languageHandlers) {
        button.removeEventListener('click', handler);
      }
      for (const [button, handler] of themeHandlers) {
        button.removeEventListener('click', handler);
      }
      wizard?.destroy();
      controller.destroy();
      setPanel.destroy();
      puzzlePanel.destroy();
      mainAction.removeEventListener('click', onActionClick);
      mainBack?.removeEventListener('click', onBackClick);
      win?.removeEventListener('pagehide', onHide);
      doc.removeEventListener('visibilitychange', onVisibility);
      persistence.destroy();
      editor.destroy();
      boardSummary?.destroy();
      level.destroy();
      store.destroy();
    },
  };
}

if (typeof document !== 'undefined' && document.body?.dataset.app === 'generator') {
  setLocale(chooseLanguage({ search: globalThis.location?.search }), document);
  createGeneratorApp(document);
  document.documentElement.dataset.ready = 'true';
}
