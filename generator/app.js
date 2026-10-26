// @ts-check
// Generator page shell: wires the store, persistence, panels, job controller and step navigation.
import storage from '../core/browser/storage.js';
import { showToast } from '../core/browser/dom.js';
import { svgEl } from '../core/browser/svg-board.js';
import { createGenerationClient } from '../core/browser/generation-client.js';
import { openInPlayerTab } from '../core/browser/handoff.js';
import { createPuzzleCodeDialog } from '../core/browser/puzzle-code-dialog.js';
import { createSettingsDialog } from '../core/browser/settings-dialog.js';
import { createPool } from '../core/browser/worker-pool.js';
import { applyTo, choose, getLocale, normalize, onChange, setLocale, t } from './i18n.js';
import { LANGUAGE_KEY } from '../core/browser/i18n.js';
import { THEME_KEY, applyTheme, effectiveTheme, normalizeTheme } from '../core/browser/theme.js';
import {
  MAX_SETS, createGeneratorStore, createPersistence, describeBoard, detectHardware, loadGeneratorState, setNumber,
} from './state.js';
import { createJobController } from './jobs.js';
import { mountBoardEditor } from './ui/board-editor.js';
import { mountBoardSummary } from './ui/board-summary.js';
import { mountLevelPanel } from './ui/level-panel.js';
import { mountPuzzlePanel } from './ui/puzzle-panel.js';
import { mountSetPanel } from './ui/set-panel.js';
import { mountSetSummary } from './ui/set-summary.js';
import { mountWizard, reachableStep } from './ui/wizard.js';
import { isPuzzleHash } from '../core/engine/sharecode.js';

export { LANGUAGE_KEY };

/** One puzzle per Generate press; the controller itself can make more at once. */
const PUZZLES_PER_PRESS = 1;

/** @typedef {import('./ui/level-panel.js').GenerateSetRequest} GenerateSetRequest */

/**
 * A missing handler keeps its control disabled.
 * @typedef {object} GeneratorHandlers
 * @property {(request: GenerateSetRequest) => void} [onGenerateSet]
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

/** @returns {Pick<Storage, 'getItem' | 'setItem'> | null} */
function browserStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {{ search?: string, languageStorage?: Pick<Storage, 'getItem'> | null, navigator?: { language?: string, languages?: readonly string[] } }} [sources]
 * @returns {string}
 */
export function chooseLanguage(sources = {}) {
  return choose(sources);
}

/**
 * @param {Document} doc
 * @param {{ storage?: import('./state.js').StorageLike, env?: any,
 *   random?: () => string, randomNumber?: () => string, now?: () => number, address?: boolean,
 *   client?: import('../core/browser/generation-client.js').GenerationClient,
 *   pool?: import('../core/browser/worker-pool.js').Pool, workerFactory?: () => import('../core/browser/worker-pool.js').WorkerLike,
 *   workersAvailable?: boolean, handoff?: import('../core/browser/handoff.js').HandoffEnv,
 *   createPuzzleCodeClient?: () => import('../core/browser/puzzle-code-client.js').PuzzleCodeClient,
 *   preferenceStorage?: Pick<Storage, 'setItem'> | null,
 *   controller?: Partial<import('./jobs.js').JobControllerOptions> }} [options]
 */
export function createGeneratorApp(doc, options = {}) {
  const io = options.storage ?? storage;
  // The address holds the step (`?step=`) and the language, and puzzle codes in the hash (`#p=<code>;<code>…`), which
  // are imported below. Only the real page (with the wizard) reads and writes the address; test fixture pages must not.
  const addressed = options.address ?? doc.querySelector('[data-wizard-step]') !== null;
  const store = createGeneratorStore({ ...loadGeneratorState(io), quantity: PUZZLES_PER_PRESS });
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
  const level = mountLevelPanel(slot(doc, 'level'), {
    store, hardware, getHandlers: () => handlers, random: options.random, now: options.now, controlsHost: optionalSlot(doc, 'set-controls'),
  });
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
    openPlayer: (pack, index) => openInPlayerTab(pack, index, handoffEnv),
    beforeNavigate: () => persistence.saveNow(),
    randomNumber: options.randomNumber,
    ...(options.createPuzzleCodeClient === undefined ? {} : { createPuzzleCodeClient: options.createPuzzleCodeClient }),
    ...(options.now === undefined ? {} : { now: options.now }),
    ...options.controller,
  });
  const setPanel = mountSetPanel(regions.set, { store, controller, onSelect: () => void wizard?.go(3, { focus: true }) });
  const setSummaryHost = optionalSlot(doc, 'set-summary');
  const setSummary = setSummaryHost === null ? null : mountSetSummary(setSummaryHost, { store });
  const puzzleControlsHost = optionalSlot(doc, 'puzzle-controls');
  const puzzlePanel = mountPuzzlePanel(regions.puzzles, {
    store, hardware, controller, onNewSet: () => void level.generate(), now: options.now,
    noticeHost: optionalSlot(doc, 'notice'), cardsHost: optionalSlot(doc, 'cards'),
    controlsHost: puzzleControlsHost, cardsActionsHost: optionalSlot(doc, 'cards-actions'),
  });
  const wizard = mountWizard(doc, { store, hardware });

  const importButton = /** @type {HTMLButtonElement | null} */ (doc.querySelector('[data-action="import-puzzle"]'));
  /**
   * @param {string} text
   * @returns {ReturnType<typeof controller.importPuzzleCode>}
   */
  async function importCode(text) {
    const result = await controller.importPuzzleCode(text);
    if (result.ok) {
      const { status } = result.value;
      const refused = status === 'sets-full' || status === 'pack-full' || status === 'busy';
      showToast(t(`import.done.${status}`, { max: MAX_SETS }), { kind: refused ? 'warning' : 'info' });
      if (status === 'new-set' || status === 'added') {
        void wizard?.go(3, { focus: true });
      }
    }
    return result;
  }
  const importDialog = importButton === null ? null : createPuzzleCodeDialog({
    host: doc.body,
    t,
    submit: importCode,
    cancel: () => controller.cancelImport(),
    openRecovery: importCode,
    fallbackFocus: () => importButton,
    keys: { title: 'import.title', field: 'import.field', hint: 'import.hint', open: 'import.open' },
  });
  const onImportClick = () => importDialog?.open({ opener: importButton });
  importButton?.addEventListener('click', onImportClick);
  // The narrow header has no room for the language and theme switches: its Settings button opens them in a dialog.
  const settingsButton = doc.querySelector('[data-action="settings"]');
  const settingsDialog = settingsButton === null ? null : createSettingsDialog({ host: doc.body, t });
  const onSettingsClick = () => settingsDialog?.open(settingsButton);
  settingsButton?.addEventListener('click', onSettingsClick);
  const unsubscribeBoard = store.subscribe((state, previous) => {
    if (state.board !== previous.board && state.set !== previous.set) {
      editor.history.clear();
    }
  });
  handlers.onGenerateSet = (request) => void controller.generateSet(request);
  handlers.onCancel = () => controller.cancel();
  level.refresh();

  const mainAction = /** @type {HTMLButtonElement} */ (slot(doc, 'main-action'));
  const mainBack = /** @type {HTMLButtonElement | null} */ (optionalSlot(doc, 'main-back'));

  /** @param {number} n @returns {string} */
  const stepName = (n) => `${t('wizard.stepLabel', { n })} - ${t(`wizard.step${n}.title`)}`;

  /**
   * @param {'left' | 'right'} side
   * @returns {SVGElement}
   */
  const chevron = (side) => svgEl('svg', { class: 'nav-icon', viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    svgEl('path', {
      d: side === 'left' ? 'M10.5 3 5.5 8l5 5' : 'M5.5 3l5 5-5 5',
      fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }));

  function syncActions() {
    const state = store.getState();
    const step = wizard?.step ?? null;
    const hasNext = step !== null && step < 3;
    const hasBack = step !== null && step > 1;
    mainAction.hidden = !hasNext;
    if (hasNext) {
      mainAction.replaceChildren(stepName(step + 1), chevron('right'));
      mainAction.disabled = step + 1 > reachableStep(state, hardware);
      mainAction.title = !mainAction.disabled ? ''
        : step === 1 ? `${t('level.cannot')} ${describeBoard(state, hardware).statusText}` : t('wizard.locked.set');
    }
    if (mainBack !== null) {
      mainBack.hidden = !hasBack;
      mainBack.disabled = !hasBack;
      if (hasBack) {
        mainBack.replaceChildren(chevron('left'), stepName(step - 1));
      }
    }
  }

  const onActionClick = () => void wizard?.next();
  const onBackClick = () => void wizard?.back();
  mainAction.addEventListener('click', onActionClick);
  mainBack?.addEventListener('click', onBackClick);
  /** The page has one Back / next group; it moves into the header of the step that is showing. */
  function placeActions() {
    const group = doc.querySelector('.main-actions');
    const target = wizard === null ? null : doc.querySelector(`[data-step="${wizard.step}"] .step-actions`);
    if (group !== null && target !== null && group.parentElement !== target) {
      target.append(group);
    }
  }

  const historyTitle = doc.getElementById('heading-history');
  function syncHistoryTitle() {
    if (historyTitle !== null) {
      const { n, total } = setNumber(store.getState());
      historyTitle.textContent = n === null ? t('puzzles.list') : t('puzzles.setHeading', { n, total });
    }
  }

  const unsubscribe = store.subscribe(() => {
    syncActions();
    syncHistoryTitle();
  });
  const unsubscribeWizard = wizard?.onChange(() => {
    placeActions();
    syncActions();
  });
  placeActions();
  syncActions();
  syncHistoryTitle();

  /**
   * Imports the puzzle codes of a `#p=` address as Import puzzle does. The hash is cleared first so that a reload does
   * not bring back a puzzle that was removed; an unreadable link opens the import dialog with the reason.
   * @returns {Promise<void>}
   */
  async function importFromAddress() {
    if (!addressed || win === null || !isPuzzleHash(win.location.hash)) {
      return;
    }
    const text = win.location.hash;
    try {
      const url = new URL(win.location.href);
      url.hash = '';
      win.history.replaceState(null, '', url.href);
    } catch {
      // An address that cannot be changed only keeps its hash.
    }
    const result = await importCode(text);
    if (!result.ok && result.issues[0]?.code !== 'cancelled') {
      importDialog?.open({ text, failure: /** @type {any} */ (result) });
    }
  }
  const onHashChange = () => void importFromAddress();
  win?.addEventListener('hashchange', onHashChange);
  void importFromAddress();

  const onHide = () => persistence.flush();
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') {
      persistence.flush();
    }
  };
  win?.addEventListener('pagehide', onHide);
  doc.addEventListener('visibilitychange', onVisibility);

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
    setSummary?.refresh();
    puzzlePanel.refresh();
    importDialog?.refresh();
    wizard?.refresh();
    syncActions();
    syncHistoryTitle();
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

  // Without a stored theme the system preference applies.
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

  // The controls of the current step are a bar fixed to the bottom of a narrow screen: the page leaves room for it (see
  // generator.css).
  const bars = /** @type {HTMLElement[]} */ ([...doc.querySelectorAll('[data-step-body]')]);
  const syncBarSpace = () => {
    const height = Math.max(0, ...bars.filter((bar) => !bar.hidden).map((bar) => bar.offsetHeight));
    doc.body.style.setProperty('--gen-bar-space', `${height}px`);
  };
  const barObserver = bars.length > 0 && typeof win?.ResizeObserver === 'function' ? new win.ResizeObserver(syncBarSpace) : null;
  for (const bar of bars) {
    barObserver?.observe(bar);
  }
  syncBarSpace();

  return {
    store,
    hardware,
    editor,
    level,
    controller,
    setPanel,
    puzzlePanel,
    importDialog,
    wizard,
    regions,
    /** Lets tests and other hosts replace the job actions. @param {GeneratorHandlers} next */
    setHandlers(next) {
      Object.assign(handlers, next);
      level.refresh();
      syncActions();
    },
    destroy() {
      unsubscribe();
      unsubscribeWizard?.();
      barObserver?.disconnect();
      win?.removeEventListener('hashchange', onHashChange);
      unsubscribeLanguage();
      unsubscribeBoard();
      for (const [button, handler] of languageHandlers) {
        button.removeEventListener('click', handler);
      }
      for (const [button, handler] of themeHandlers) {
        button.removeEventListener('click', handler);
      }
      wizard?.destroy();
      importButton?.removeEventListener('click', onImportClick);
      settingsButton?.removeEventListener('click', onSettingsClick);
      settingsDialog?.dispose();
      importDialog?.dispose();
      controller.destroy();
      setPanel.destroy();
      setSummary?.destroy();
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
