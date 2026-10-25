// @ts-check
// Generator page shell: wires the store, persistence, panels, job controller and step navigation.
import storage from '../core/browser/storage.js';
import { showToast } from '../core/browser/dom.js';
import { svgEl } from '../core/browser/svg-board.js';
import { createGenerationClient } from '../core/browser/generation-client.js';
import { openInPlayerTab } from '../core/browser/handoff.js';
import { createPool } from '../core/browser/worker-pool.js';
import { applyTo, choose, getLocale, normalize, onChange, setLocale, t } from './i18n.js';
import { LANGUAGE_KEY } from '../core/browser/i18n.js';
import { THEME_KEY, applyTheme, effectiveTheme, normalizeTheme } from '../core/browser/theme.js';
import {
  createGeneratorStore, createPersistence, describeBoard, detectHardware, loadGeneratorState, setNumber,
} from './state.js';
import { createJobController } from './jobs.js';
import { mountBoardEditor } from './ui/board-editor.js';
import { mountBoardSummary } from './ui/board-summary.js';
import { mountLevelPanel } from './ui/level-panel.js';
import { mountPuzzlePanel } from './ui/puzzle-panel.js';
import { mountSetPanel } from './ui/set-panel.js';
import { mountSetSummary } from './ui/set-summary.js';
import { mountWizard, reachableStep, stepFromSearch } from './ui/wizard.js';
import { addressParams, applyAddress, withAddress } from './address.js';

export { LANGUAGE_KEY };

/** One puzzle per Generate press; the controller itself can make more at once. */
const PUZZLES_PER_PRESS = 1;
/** Debounces address updates so painting a board does not rewrite it on every square. */
const ADDRESS_DELAY_MS = 300;

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
 * `?lang=`, then the saved choice, then the browser languages, then English.
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
 *   preferenceStorage?: Pick<Storage, 'setItem'> | null,
 *   controller?: Partial<import('./jobs.js').JobControllerOptions> }} [options]
 */
export function createGeneratorApp(doc, options = {}) {
  const io = options.storage ?? storage;
  // Settings in the address (shared link, reload) win over the saved work. Only the real page (with the wizard)
  // reads and writes the address; test fixture pages must not.
  const addressed = options.address ?? doc.querySelector('[data-wizard-step]') !== null;
  const search = addressed ? doc.defaultView?.location.search ?? '' : '';
  const fromAddress = applyAddress(loadGeneratorState(io), search);
  // Read before the wizard mounts: it clamps the step to the work that exists and rewrites the address.
  const requestedStep = stepFromSearch(search);
  const store = createGeneratorStore({ ...fromAddress.state, quantity: PUZZLES_PER_PRESS });
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
    ...(options.now === undefined ? {} : { now: options.now }),
    ...options.controller,
  });
  const setPanel = mountSetPanel(regions.set, { store, controller });
  const setSummaryHost = optionalSlot(doc, 'set-summary');
  const setSummary = setSummaryHost === null ? null : mountSetSummary(setSummaryHost, { store });
  const puzzleControlsHost = optionalSlot(doc, 'puzzle-controls');
  const puzzlePanel = mountPuzzlePanel(regions.puzzles, {
    store, hardware, controller, onNewSet: () => void level.generate(), now: options.now,
    noticeHost: optionalSlot(doc, 'notice'), cardsHost: optionalSlot(doc, 'cards'),
    controlsHost: puzzleControlsHost, cardsActionsHost: optionalSlot(doc, 'cards-actions'),
  });
  const wizard = mountWizard(doc, { store, hardware });
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

  /** @type {ReturnType<typeof setTimeout> | null} */
  let addressTimer = null;
  function syncAddress() {
    addressTimer = null;
    if (!addressed || win === null) {
      return;
    }
    try {
      const href = withAddress(win.location.href, addressParams(store.getState()));
      if (href !== win.location.href) {
        win.history.replaceState(null, '', href);
      }
    } catch {
      // An address that cannot be changed (a sandboxed frame) only loses the link.
    }
  }
  const unsubscribeAddress = addressed
    ? store.subscribe((state, previous) => {
      if (state.board !== previous.board || state.rotation !== previous.rotation || state.presetId !== previous.presetId
        || state.levelId !== previous.levelId || state.uniqueness !== previous.uniqueness || state.seedText !== previous.seedText
        || state.keepSeed !== previous.keepSeed || state.setSeed !== previous.setSeed || state.set !== previous.set) {
        if (addressTimer !== null) {
          clearTimeout(addressTimer);
        }
        addressTimer = setTimeout(syncAddress, ADDRESS_DELAY_MS);
      }
    })
    : () => {};
  syncAddress();

  // A link that names a seed shows its set: the one saved here, or one made again from the board, level and seed.
  if (addressed && fromAddress.seed !== null && store.getState().setSeed !== fromAddress.seed && (requestedStep ?? 1) >= 2 && level.generate()) {
    const target = requestedStep ?? 2;
    const stop = store.subscribe((state) => {
      if (state.job === null) {
        stop();
        if (state.set !== null) {
          wizard?.go(target);
        }
      }
    });
  }

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
    /** Lets tests and other hosts replace the job actions. @param {GeneratorHandlers} next */
    setHandlers(next) {
      Object.assign(handlers, next);
      level.refresh();
      syncActions();
    },
    destroy() {
      unsubscribe();
      unsubscribeWizard?.();
      unsubscribeAddress();
      if (addressTimer !== null) {
        clearTimeout(addressTimer);
      }
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
