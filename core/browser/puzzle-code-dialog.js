// @ts-check
// Puzzle-code entry (the Player's, and the Generator's Import puzzle). `createCodeEntryMachine` is a DOM-free state
// machine whose UI revision moves on with every edit, submission, opening and closing, so a late reply can neither open
// a puzzle nor overwrite newer input. `createPuzzleCodeDialog` shows it in a native <dialog>. A correction or a damaged
// tail's core is only ever offered, and applied only by an explicit action checked against the current revision and
// text.

import { normalizePuzzleCodeInput } from '../engine/puzzlecode-input.js';
import { el } from './dom.js';

/** @typedef {import('./puzzle-code-client.js').CodeFailure} CodeFailure */
/** @typedef {import('./puzzle-code-client.js').PuzzleCodeCorrection} PuzzleCodeCorrection */
/** @typedef {import('./puzzle-code-client.js').CodeResult<unknown>} CodeOutcome */

/**
 * `closed`: not shown; `editing`: the text is being written; `submitting`: a request is in flight; `invalid`: it failed
 * and says why; `candidate`: it failed with a one-symbol correction on offer; `tail-recovery`: only the optional
 * solution part is damaged and the core can be opened without it.
 * @typedef {'closed' | 'editing' | 'submitting' | 'invalid' | 'candidate' | 'tail-recovery'} Phase
 */

/**
 * The problem on show: a canonical code (see `describeProblem`), its message values, and whether the typed text is at
 * fault (the field is then `aria-invalid`) rather than the browser or the service.
 * @typedef {{ code: string, params: Record<string, string | number>, input: boolean }} Problem
 */

/**
 * `candidate` is set only for a checksum failure of the same text; `canOpenCore` only for a damaged tail whose core
 * the worker has already validated.
 * @typedef {Readonly<{
 *   phase: Phase,
 *   text: string,
 *   revision: number,
 *   problem: Problem | null,
 *   candidate: PuzzleCodeCorrection | null,
 *   canOpenCore: boolean,
 * }>} EntryState
 */

const TAIL_CODES = new Set(['tail-check', 'tail-tag', 'tail-invalid']);

/** The component a checksum failure's correction must belong to. */
const CHECKSUM_COMPONENT = Object.freeze({ 'core-check': 'core', 'tail-check': 'tail' });

/** Failures caused by what was typed. The others (no workers, no DEFLATE, a failed or cancelled request) are not the text's fault. */
const INPUT_CODES = new Set(['empty', 'bad-char', 'dots', 'too-long', 'core-check', 'version', 'invalid', 'index', ...TAIL_CODES]);

/** Text key of every code the entry can show. */
const ERROR_KEYS = Object.freeze({
  empty: 'code.error.empty',
  'bad-char': 'code.error.char',
  dots: 'code.error.dots',
  'too-long': 'code.error.long',
  'core-check': 'code.error.check',
  version: 'code.error.version',
  'no-deflate': 'code.error.deflate',
  invalid: 'code.error.invalid',
  index: 'code.error.index',
  'tail-check': 'code.error.tail',
  'tail-tag': 'code.error.tailVersion',
  'tail-invalid': 'code.error.tailInvalid',
  'worker-unavailable': 'code.error.worker',
  'worker-error': 'code.error.service',
  cancelled: 'code.error.cancelled',
});

/** Host-loader names that mean one of the entry's codes (the entry's own path already uses the entry's names). */
const ALIASES = Object.freeze({
  'invalid-index': 'index',
  'invalid-hash': 'invalid',
  'invalid-code': 'invalid',
  'invalid-pack': 'invalid',
  'piece-set': 'invalid',
  'index-out-of-range': 'invalid',
});

/** Every code `describeProblem` has its own text for. */
export const ENTRY_ERROR_CODES = Object.freeze(Object.keys(ERROR_KEYS));

const GROUPING = /^[\s-]*$/;
const GROUPING_CHARS = new Set([' ', '\t', '\r', '\n', '-']);
const ACTIONABLE = new Set(['editing', 'invalid', 'candidate', 'tail-recovery']);

/** What a rejected or malformed reply counts as. */
const SERVICE_FAILURE = /** @type {CodeFailure} */ (Object.freeze({
  ok: false, issues: Object.freeze([{ code: 'worker-error', path: '$', message: 'Puzzle code processing failed.' }]),
}));

/**
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @param {string} text
 * @returns {string | null} The normalized code of the text (a link's `p` value included), or null when it has none yet.
 */
function normalizedOrNull(text) {
  try {
    return normalizePuzzleCodeInput(text);
  } catch {
    return null;
  }
}

/**
 * The core of a code that has a tail: the part the worker validated when only the tail was damaged.
 * @param {string} text
 * @returns {string | null}
 */
function coreOf(text) {
  const normalized = normalizedOrNull(text);
  const dot = normalized === null ? -1 : normalized.indexOf('.');
  return normalized !== null && dot > 0 ? normalized.slice(0, dot) : null;
}

/**
 * The count shown under the field: the symbols of the normalized code (a link counts its `p` value, not its prefix),
 * without grouping. Text that is not a code yet, however wrong, gets a neutral provisional count and no error.
 * @param {string} text
 * @returns {number}
 */
export function provisionalCount(text) {
  const normalized = normalizedOrNull(text);
  if (normalized !== null) {
    return normalized.length;
  }
  let body = text;
  const hash = text.indexOf('#');
  if (hash >= 0) {
    const part = text.slice(hash + 1).split('&').find((piece) => piece.startsWith('p='));
    body = part === undefined ? '' : part.slice(2);
  }
  let count = 0;
  for (const ch of body) {
    if (!GROUPING_CHARS.has(ch)) {
      count += 1;
    }
  }
  return count;
}

/**
 * A character as the message names it: invisible and space-like characters (a non-breaking space pasted from a web
 * page, a zero-width space) by their code point, since quoting them would show nothing.
 * @param {unknown} value
 * @returns {string}
 */
function displayChar(value) {
  const ch = typeof value === 'string' && value !== '' ? [...value][0] : '?';
  return /^[\p{C}\p{Z}]$/u.test(ch) ? `U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}` : ch;
}

/**
 * @param {unknown} code
 * @returns {string}
 */
function canonicalCode(code) {
  const name = typeof code === 'string' ? code : '';
  return Object.hasOwn(ALIASES, name) ? /** @type {Record<string, string>} */ (ALIASES)[name] : name;
}

/**
 * The text key and values of a problem. A code the entry does not know reads as a failed request, never as a
 * description of the typed text.
 * @param {Pick<Problem, 'code'> & Partial<Pick<Problem, 'params'>>} problem
 * @returns {{ key: string, params: Record<string, string | number> }}
 */
export function describeProblem({ code, params = {} }) {
  const key = Object.hasOwn(ERROR_KEYS, code) ? /** @type {Record<string, string>} */ (ERROR_KEYS)[code] : ERROR_KEYS['worker-error'];
  return { key, params: key === ERROR_KEYS['bad-char'] ? { char: displayChar(params.char) } : {} };
}

/**
 * @typedef {object} MachineOptions
 * @property {(text: string) => Promise<CodeOutcome>} submit Opens the typed text (the controller's code load).
 * @property {() => void} cancel Invalidates the load in flight, before a late reply could commit.
 * @property {(core: string) => Promise<CodeOutcome>} openRecovery Opens the core of a code whose tail is damaged.
 */

/**
 * @param {MachineOptions} options
 */
export function createCodeEntryMachine({ submit, cancel, openRecovery }) {
  /** @type {EntryState} */
  let state = { phase: 'closed', text: '', revision: 0, problem: null, candidate: null, canOpenCore: false };
  /** The core that "Open without the solution part" submits; set only together with `canOpenCore`. */
  let core = /** @type {string | null} */ (null);
  let disposed = false;
  /** @type {Set<(state: EntryState) => void>} */
  const listeners = new Set();

  /** @param {Partial<EntryState>} patch */
  function set(patch) {
    state = Object.freeze({ ...state, ...patch });
    for (const listener of [...listeners]) {
      listener(state);
    }
  }

  function stopRequest() {
    try {
      cancel();
    } catch {
      // The load is invalidated by the revision change either way.
    }
  }

  /**
   * Shows the failure of `text` and works out which of its offers are safe: a correction only for a checksum failure of
   * this very text, the core only for a damaged tail whose core the worker validated.
   * @param {unknown} failure
   * @param {string} text
   */
  function present(failure, text) {
    const issue = isRecord(failure) && Array.isArray(failure.issues) ? failure.issues[0] : undefined;
    const code = canonicalCode(isRecord(issue) ? issue.code : undefined) || 'worker-error';
    // A failure of one code of a list names its place (`$.p[1]`): the message says which puzzle it is.
    const place = isRecord(issue) && typeof issue.path === 'string' ? /^\$\.p\[(\d+)\]$/.exec(issue.path) : null;
    /** @type {Problem} */
    const problem = {
      code,
      params: { ...(isRecord(issue) && isRecord(issue.params) ? issue.params : {}), ...(place === null ? {} : { puzzle: Number(place[1]) + 1 }) },
      input: INPUT_CODES.has(code),
    };
    const normalized = normalizedOrNull(text);
    const raw = isRecord(failure) ? failure.candidate : undefined;
    const candidate = isRecord(raw) && normalized !== null && raw.normalizedCode === normalized
      && Object.hasOwn(CHECKSUM_COMPONENT, code) && raw.component === /** @type {Record<string, string>} */ (CHECKSUM_COMPONENT)[code]
      && typeof raw.correctedCode === 'string' && raw.correctedCode !== '' && raw.correctedCode !== normalized
      && Number.isSafeInteger(raw.group) && Number.isSafeInteger(raw.position)
      && typeof raw.expected === 'string' && typeof raw.typed === 'string'
      ? /** @type {PuzzleCodeCorrection} */ (raw)
      : null;
    const recovery = isRecord(failure) && isRecord(failure.recovery) ? failure.recovery : undefined;
    core = recovery?.kind === 'core-only' && isRecord(recovery.pack) && TAIL_CODES.has(code) ? coreOf(text) : null;
    set({
      phase: candidate !== null ? 'candidate' : core !== null ? 'tail-recovery' : 'invalid',
      text,
      problem,
      candidate,
      canOpenCore: core !== null,
    });
  }

  /**
   * @param {string} text What the field shows meanwhile and after a failure.
   * @param {() => Promise<CodeOutcome>} invoke
   */
  function run(text, invoke) {
    const mine = state.revision + 1;
    core = null;
    set({ phase: 'submitting', text, revision: mine, problem: null, candidate: null, canOpenCore: false });
    /** @type {Promise<unknown>} */
    let pending;
    try {
      pending = Promise.resolve(invoke());
    } catch (error) {
      pending = Promise.reject(error);
    }
    /** @param {unknown} result */
    const settle = (result) => {
      if (disposed || state.revision !== mine || state.phase !== 'submitting') {
        return;
      }
      if (isRecord(result) && result.ok === true) {
        set({ phase: 'closed', text: '', revision: mine + 1, problem: null, candidate: null, canOpenCore: false });
      } else {
        present(isRecord(result) && result.ok === false ? result : SERVICE_FAILURE, text);
      }
    };
    pending.then(settle, () => settle(SERVICE_FAILURE));
  }

  return {
    getState: () => state,
    /**
     * @param {(state: EntryState) => void} listener
     * @returns {() => void}
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /**
     * Shows the entry. It starts from a clean state (no stale error, candidate or core offer), keeps the text the
     * instance already holds unless `text` is given, and presents `failure` for that text when there is one.
     * @param {{ text?: string, failure?: CodeFailure }} [options]
     */
    open({ text, failure } = {}) {
      if (disposed) {
        return;
      }
      if (state.phase === 'submitting') {
        stopRequest();
      }
      core = null;
      const shown = typeof text === 'string' ? text : state.text;
      set({ phase: 'editing', text: shown, revision: state.revision + 1, problem: null, candidate: null, canOpenCore: false });
      if (failure !== undefined) {
        present(failure, shown);
      }
    },
    /**
     * The user changed the text: whatever was in flight or on offer no longer belongs to it.
     * @param {string} text
     */
    edit(text) {
      if (disposed || state.phase === 'closed') {
        return;
      }
      if (state.phase === 'submitting') {
        stopRequest();
      }
      core = null;
      set({ phase: 'editing', text, revision: state.revision + 1, problem: null, candidate: null, canOpenCore: false });
    },
    /** Open puzzle. Blank text is answered here and never reaches the controller. */
    submit() {
      if (disposed || !ACTIONABLE.has(state.phase)) {
        return false;
      }
      const { text } = state;
      if (GROUPING.test(text)) {
        core = null;
        set({ revision: state.revision + 1 });
        present({ ok: false, issues: [{ code: 'empty', path: '$', message: '' }] }, text);
        return false;
      }
      run(text, () => submit(text));
      return true;
    },
    /**
     * Use this correction. It applies only to the candidate that was on show (`shownRevision`) and only while the
     * normalized text is still the one the candidate was found for; the corrected text then goes through the
     * controller like any typed code, and is decoded again.
     * @param {number} [shownRevision]
     * @returns {boolean}
     */
    useCorrection(shownRevision = state.revision) {
      const { candidate } = state;
      if (disposed || candidate === null || state.phase === 'submitting' || shownRevision !== state.revision) {
        return false;
      }
      if (normalizedOrNull(state.text) !== candidate.normalizedCode) {
        set({ candidate: null, phase: core !== null ? 'tail-recovery' : 'invalid' });
        return false;
      }
      const corrected = candidate.correctedCode;
      run(corrected, () => submit(corrected));
      return true;
    },
    /**
     * Open without the solution part: submits only the core that came back validated. The field keeps the full input.
     * @param {number} [shownRevision]
     * @returns {boolean}
     */
    openCore(shownRevision = state.revision) {
      if (disposed || !state.canOpenCore || core === null || state.phase === 'submitting' || shownRevision !== state.revision) {
        return false;
      }
      const code = core;
      run(state.text, () => openRecovery(code));
      return true;
    },
    /** Closing (Cancel or Escape) keeps the text, shows no failure and invalidates a request in flight. */
    close() {
      if (disposed || state.phase === 'closed') {
        return;
      }
      if (state.phase === 'submitting') {
        stopRequest();
      }
      core = null;
      set({ phase: 'closed', revision: state.revision + 1, problem: null, candidate: null, canOpenCore: false });
    },
    dispose() {
      if (disposed) {
        return;
      }
      if (state.phase === 'submitting') {
        stopRequest();
      }
      disposed = true;
      core = null;
      listeners.clear();
    },
  };
}

/**
 * @typedef {object} CodeDialogOptions
 * @property {HTMLElement} host Where the <dialog> is created (outside any hidden screen).
 * @property {(key: string, params?: object) => string} t
 * @property {(text: string) => Promise<CodeOutcome>} submit
 * @property {() => void} cancel
 * @property {(core: string) => Promise<CodeOutcome>} openRecovery
 * @property {() => HTMLElement | null} [fallbackFocus] Where the focus goes when the opener is gone or hidden.
 * @property {Partial<typeof DEFAULT_KEYS>} [keys] Text keys of the title, the field label, the hint and the submit
 *   button, for an app that uses the entry for another purpose (the Generator's Import puzzle).
 */

/** The text keys the dialog writes by itself; the rest (count, offers, messages) are shared. */
const DEFAULT_KEYS = Object.freeze({ title: 'code.enter', field: 'code.field', hint: 'code.hint', open: 'code.open' });

/**
 * @typedef {object} CodeDialog
 * @property {(options?: { text?: string, failure?: CodeFailure, opener?: HTMLElement | null }) => void} open
 * @property {() => void} close
 * @property {() => void} refresh Writes the texts again, after a language switch.
 * @property {() => boolean} isOpen
 * @property {() => HTMLDialogElement | null} element
 * @property {() => void} dispose
 */

let dialogCount = 0;

/**
 * The entry dialog. Its elements are created on the first `open`, so a page that never opens it has no code field.
 * @param {CodeDialogOptions} options
 * @returns {CodeDialog}
 */
export function createPuzzleCodeDialog({ host, t, submit, cancel, openRecovery, fallbackFocus, keys }) {
  const labels = { ...DEFAULT_KEYS, ...keys };
  dialogCount += 1;
  const id = `pm-code-${dialogCount}`;
  const doc = host.ownerDocument;
  const machine = createCodeEntryMachine({ submit, cancel, openRecovery });
  /** @type {ReturnType<typeof build> | null} */
  let ui = null;
  /** @type {HTMLElement | null} */
  let opener = null;
  let disposed = false;
  /** Revision of the offers on screen: an offer clicked after the text moved on does nothing. */
  let shownRevision = 0;

  /** A small stroked icon: two links of a chain, drawn with the SVG namespace (no markup is parsed). */
  function linkIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = doc.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    for (const [x, w] of [[2.5, 11], [10.5, 11]]) {
      const rect = doc.createElementNS(ns, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', '8.5');
      rect.setAttribute('width', String(w));
      rect.setAttribute('height', '7');
      rect.setAttribute('rx', '3.5');
      svg.append(rect);
    }
    return svg;
  }

  function build() {
    const title = el('h2', { className: 'pm-dialog-title pm-head-title', attrs: { id: `${id}-title` } });
    const head = el('header', { className: 'pm-head' },
      el('span', { className: 'pm-head-badge', attrs: { 'aria-hidden': 'true' } }, linkIcon()),
      el('div', { className: 'pm-head-titles' }, title));
    const label = el('label', { className: 'pm-code-label', attrs: { for: `${id}-field` } });
    const field = /** @type {HTMLTextAreaElement} */ (el('textarea', {
      className: 'pm-code-field',
      attrs: {
        id: `${id}-field`, rows: 4, spellcheck: 'false', autocapitalize: 'off', autocorrect: 'off', autocomplete: 'off',
      },
      on: { input: () => machine.edit(field.value) },
    }));
    const hint = el('p', { className: 'pm-code-note', attrs: { id: `${id}-hint` } });
    const count = el('p', { className: 'pm-code-note pm-code-count', attrs: { id: `${id}-count` } });
    const errorText = el('p', { className: 'pm-code-error' });
    const candidateText = el('p', { className: 'pm-code-candidate' });
    const problem = el('div', { className: 'pm-code-problem', attrs: { id: `${id}-problem`, role: 'alert', hidden: '' } }, errorText, candidateText);
    const useButton = /** @type {HTMLButtonElement} */ (el('button', {
      className: 'pm-btn', attrs: { type: 'button', hidden: '' }, dataset: { action: 'use-correction' },
      on: { click: () => machine.useCorrection(shownRevision) },
    }));
    const coreButton = /** @type {HTMLButtonElement} */ (el('button', {
      className: 'pm-btn', attrs: { type: 'button', hidden: '' }, dataset: { action: 'open-core' },
      on: { click: () => machine.openCore(shownRevision) },
    }));
    const offers = el('div', { className: 'pm-code-offers', attrs: { hidden: '' } }, useButton, coreButton);
    const busy = el('p', { className: 'pm-code-busy', attrs: { role: 'status', hidden: '' } });
    const openButton = /** @type {HTMLButtonElement} */ (el('button', {
      className: 'pm-btn primary', attrs: { type: 'button' }, dataset: { action: 'code-open' },
      on: { click: () => machine.submit() },
    }));
    const cancelButton = /** @type {HTMLButtonElement} */ (el('button', {
      className: 'pm-btn', attrs: { type: 'button' }, dataset: { action: 'code-cancel' },
      on: { click: () => machine.close() },
    }));
    const dialog = /** @type {HTMLDialogElement} */ (el('dialog', {
      className: 'pm-dialog pm-code pm-pop', attrs: { 'aria-labelledby': `${id}-title` }, dataset: { component: 'puzzle-code' },
    }, head, el('div', { className: 'pm-dialog-body' }, label, field, hint, count, problem, offers, busy),
    el('div', { className: 'pm-dialog-actions' }, openButton, cancelButton)));
    host.append(dialog);
    // Escape and every other way the platform closes the dialog end the entry too. The event arrives in a later task:
    // one that belongs to an earlier closing, after the entry was opened again, is not a closing of this one.
    dialog.addEventListener('close', () => {
      if (dialog.open) {
        return;
      }
      machine.close();
      if (!disposed) {
        restoreFocus();
      }
    });
    return { dialog, title, label, field, hint, count, problem, errorText, candidateText, offers, useButton, coreButton, busy, openButton, cancelButton };
  }

  /**
   * Writes a text only when it changed, so that typing does not replace the nodes assistive technology is reading.
   * @param {HTMLElement} node
   * @param {string} text
   */
  function setText(node, text) {
    if (node.textContent !== text) {
      node.textContent = text;
    }
  }

  /** @param {EntryState} state */
  function render(state) {
    if (ui === null) {
      return;
    }
    const { dialog, field } = ui;
    shownRevision = state.revision;
    setText(ui.title, t(labels.title));
    setText(ui.label, t(labels.field));
    setText(ui.hint, t(labels.hint));
    if (field.value !== state.text) {
      field.value = state.text;
    }
    setText(ui.count, t('code.count', { count: provisionalCount(state.text) }));
    const shown = state.problem === null ? null : describeProblem(state.problem);
    const puzzle = state.problem?.params.puzzle;
    setText(ui.errorText, shown === null ? '' : `${puzzle === undefined ? '' : `${t('code.error.puzzle', { n: puzzle })} `}${t(shown.key, shown.params)}`);
    const { candidate } = state;
    setText(ui.candidateText, candidate === null ? '' : t('code.error.candidate', {
      group: candidate.group, position: candidate.position, expected: candidate.expected, typed: candidate.typed,
    }));
    ui.candidateText.hidden = candidate === null;
    ui.problem.hidden = shown === null;
    setText(ui.useButton, t('code.correction.use'));
    ui.useButton.hidden = candidate === null;
    setText(ui.coreButton, t('code.recovery.open'));
    ui.coreButton.hidden = !state.canOpenCore;
    ui.offers.hidden = candidate === null && !state.canOpenCore;
    const waiting = state.phase === 'submitting';
    setText(ui.busy, waiting ? t('ui.loading') : '');
    ui.busy.hidden = !waiting;
    setText(ui.openButton, t(labels.open));
    ui.openButton.disabled = waiting || GROUPING.test(state.text);
    setText(ui.cancelButton, t('ui.cancel'));
    if (state.problem?.input === true) {
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.removeAttribute('aria-invalid');
    }
    field.setAttribute('aria-describedby', shown === null ? `${id}-hint ${id}-count` : `${id}-hint ${id}-count ${id}-problem`);
    if (state.phase === 'closed') {
      if (dialog.open) {
        dialog.close();
      }
    } else if (dialog.open) {
      keepFocusInside();
    }
  }

  /** A button that was just disabled or hidden must not take the keyboard focus with it. */
  function keepFocusInside() {
    if (ui === null) {
      return;
    }
    const active = /** @type {HTMLElement | null} */ (doc.activeElement);
    if (active === null || active === doc.body || !ui.dialog.contains(active) || active.closest('[hidden]') !== null
      || /** @type {HTMLButtonElement} */ (active).disabled === true) {
      ui.field.focus();
    }
  }

  function restoreFocus() {
    const target = opener;
    opener = null;
    if (target?.isConnected === true) {
      target.focus();
      if (doc.activeElement === target) {
        return;
      }
    }
    fallbackFocus?.()?.focus();
  }

  machine.subscribe(render);

  return {
    open({ text, failure, opener: from } = {}) {
      if (disposed) {
        return;
      }
      ui ??= build();
      const { dialog, field } = ui;
      if (!dialog.open) {
        const active = /** @type {HTMLElement | null} */ (doc.activeElement);
        opener = from ?? (active !== null && active !== doc.body ? active : null);
      }
      machine.open({ text, failure });
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }
      field.focus();
    },
    close() {
      machine.close();
    },
    refresh() {
      render(machine.getState());
    },
    isOpen: () => ui?.dialog.open === true,
    element: () => ui?.dialog ?? null,
    dispose() {
      if (disposed) {
        return;
      }
      machine.dispose();
      disposed = true;
      opener = null;
      if (ui !== null) {
        if (ui.dialog.open) {
          ui.dialog.close();
        }
        ui.dialog.remove();
        ui = null;
      }
    },
  };
}
