// @ts-check
// Browser acceptance harness of the printed-puzzle reconstruction. It runs the whole journey on the real applications
// in one page: the real Generator (real engine in module workers) and the real Player, the real puzzle-code worker,
// the real Print dialog and sheets, the real Share dialog of the Player and the real code entry. What a printout
// carries (its code read back from the sheet in reading order, its QR rasterised) is used to open the puzzle in a fresh
// Player through the entry dialog, and the opened puzzle is compared value by value with the selected source: board,
// angle, ordered pieces, original clues, pieces to place, stored answer, claims, heading and progress fingerprint.
//
// What the page cannot do is done by the CDP runner: it decodes the rasterised QR codes with the test-only decoder
// (window.__acceptance.rasters), takes the screenshots this page asks for (?shots=1, data-stage="shot-<name>"), runs the
// phone phase (?phase=narrow, a 390 px touch viewport) and the keyboard phase (?phase=keys: it presses the trusted key
// that data-stage="key-<name>" asks for, then sets "key-<name>-done"). This page never claims a physical print or a
// phone scan.
//
// Writes a pass/fail list into the page, data-summary and data-result on <html>. Developer fixture, not deployed.

import { boardToRows, boardFromRows } from '../../core/engine/board.js';
import { normalizeCells, poseCells } from '../../core/engine/geometry.js';
import { progressFingerprint } from '../../core/engine/keys.js';
import { packBoard, parsePack, validatePack } from '../../core/engine/pack.js';
import { catalogueStats } from '../../core/engine/puzzlecode-v1.js';
import { puzzleCodesOf } from '../../core/browser/handoff.js';
import { createPuzzleCodeClient } from '../../core/browser/puzzle-code-client.js';
import { puzzleDisplayName } from '../../core/browser/puzzle-title.js';
import { createStorage } from '../../core/browser/storage.js';
import { createPool } from '../../core/browser/worker-pool.js';
import { createGeneratorApp } from '../../generator/app.js';
import * as generatorI18n from '../../generator/i18n.js';
import { mountPlayer } from '../../player/app.js';
import * as playerI18n from '../../player/i18n.js';

const params = new URLSearchParams(location.search);
const phase = params.get('phase') ?? 'main';
const shots = params.get('shots') === '1';
const only = params.get('only');
document.documentElement.dataset.result = 'running';
document.documentElement.dataset.phase = phase;

const NS = 'http://www.w3.org/2000/svg';
const MM = 25.4 / 96;
// Print and Share both point at the Player of the page the test runs on, also on a local page.
const OWN = new URL('../player/', document.baseURI).href;
const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
const uncaught = /** @type {string[]} */ ([]);
const network = /** @type {string[]} */ ([]);
const evidence = /** @type {Record<string, any>} */ ({ phase, journeys: [], rasters: [], notes: [] });
Object.assign(window, { __acceptance: evidence });
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
window.addEventListener('error', (e) => uncaught.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => uncaught.push(String(e.reason)));

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  network.push(String(input instanceof Request ? input.url : input));
  return nativeFetch(input, init);
};

const NativeWorker = globalThis.Worker;
const workers = { spawned: 0, terminated: 0 };
class CountingWorker extends NativeWorker {
  /** @param {ConstructorParameters<typeof Worker>} args */
  constructor(...args) {
    super(...args);
    workers.spawned += 1;
  }

  terminate() {
    workers.terminated += 1;
    super.terminate();
  }
}
globalThis.Worker = /** @type {any} */ (CountingWorker);

const stage = /** @type {HTMLElement} */ (document.getElementById('stage'));
/** @type {Array<{ destroy: () => void }>} */
let toDestroy = [];

const pause = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

/**
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
async function check(name, fn) {
  const own = /^(narrow|keys)\b/.exec(name)?.[1] ?? 'main';
  if (phase !== own && !name.startsWith('every worker')) {
    return;
  }
  if (only !== null && !only.split('|').some((part) => name.includes(part))) {
    return;
  }
  try {
    console.log(`CHECK-START ${name}`);
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: String(/** @type {Error} */ (error)?.stack ?? error) });
  }
  for (const item of toDestroy.splice(0)) {
    try {
      item.destroy();
    } catch {
      // already gone
    }
  }
  stage.replaceChildren();
  document.querySelectorAll('dialog.pm-print-dialog, dialog.pm-share-dialog, dialog.pm-code, .pm-print-root, .stage-root, .toast-host, .gen-root').forEach((node) => node.remove());
  document.documentElement.classList.remove('pm-printing');
  delete document.documentElement.dataset.theme;
  globalThis.Worker = /** @type {any} */ (CountingWorker);
  restoreClipboard();
  playerI18n.setLocale('en', document);
  generatorI18n.setLocale('en', document);
}

/**
 * @param {unknown} cond
 * @param {string} msg
 */
function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {string} msg
 */
function equal(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

/**
 * @param {() => unknown} fn
 * @param {string} msg
 * @param {number} [ms]
 */
async function waitFor(fn, msg, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) {
      return;
    }
    await pause(10);
  }
  throw new Error(`timed out: ${msg}`);
}

/** @template T */
function deferred() {
  /** @type {(value: T) => void} */
  let resolve = () => {};
  const promise = /** @type {Promise<T>} */ (new Promise((done) => {
    resolve = done;
  }));
  return { promise, resolve };
}

/**
 * Asks the runner for a screenshot (only when it started this page with ?shots=1) and waits until it was taken.
 * @param {string} name
 */
async function shot(name) {
  if (!shots) {
    return;
  }
  document.documentElement.dataset.stage = `shot-${name}`;
  await waitFor(() => document.documentElement.dataset.stage === `shot-${name}-done`, `screenshot ${name}`, 15000);
  delete document.documentElement.dataset.stage;
}

/** @param {string} text */
async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** @param {Uint8Array} bytes */
function base64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 4096) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 4096));
  }
  return btoa(binary);
}

// ---- styles: the app under test brings its own sheet ------------------------------------------------------------------------

const STYLES = { player: '../../player/player.css', generator: '../../generator/generator.css' };
/** @type {string | null} */
let currentStyles = null;

/** @param {'player' | 'generator'} name */
async function useStyles(name) {
  if (currentStyles === name) {
    return;
  }
  document.querySelectorAll('link[data-app-styles]').forEach((link) => link.remove());
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLES[name];
  link.dataset.appStyles = name;
  const loaded = new Promise((resolve) => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true });
  });
  document.head.append(link);
  await loaded;
  currentStyles = name;
}

// ---- clipboard ------------------------------------------------------------------------------------------------------------

/**
 * Replaces the page's clipboard for one case: `ok` takes the text, `deny` rejects it like a refused permission (and the
 * legacy path fails too). The result is only ever what this stub did; no real-user clipboard is claimed.
 * @param {'ok' | 'deny'} mode
 */
function stubClipboard(mode) {
  /** @type {string[]} */
  const writes = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (/** @type {string} */ text) => {
        if (mode === 'deny') {
          throw new DOMException('Write permission denied.', 'NotAllowedError');
        }
        writes.push(text);
      },
    },
  });
  /** @type {any} */ (document).execCommand = () => false;
  return writes;
}

function restoreClipboard() {
  delete (/** @type {any} */ (navigator)).clipboard;
  delete (/** @type {any} */ (document)).execCommand;
}

const toasts = () => [...document.querySelectorAll('.toast-host .toast')].map((node) => node.textContent ?? '');

// ---- fixtures -------------------------------------------------------------------------------------------------------------

const fixture = await (await fetch('../fixtures/puzzlecode-v1.json')).json();
const sample = /** @type {any} */ (/** @type {any} */ (parsePack(await (await fetch('../../player/samples/sample-pack.json')).text())).value);
const hand = JSON.parse(await (await fetch('../fixtures/hand-authored-pack.json')).text());
const recipes = (await (await fetch('../fixtures/ui-flow-recipes.json')).json()).recipes;
const matrixFixture = await (await fetch('../fixtures/puzzlecode-acceptance.json')).json();
const [G1, G2, G3] = fixture.goldens;
const qrHash = (/** @type {string} */ name) => fixture.qrMatrices.rows.find((/** @type {any} */ row) => row.name === name)?.sha256;
const sampleBoard = packBoard(sample);
evidence.fixtures = { goldens: fixture.goldens.length, scenarios: matrixFixture.scenarios.length };

// ---- the value oracle -----------------------------------------------------------------------------------------------------

/** @param {unknown} value @returns {unknown} */
function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(/** @type {any} */ (value)[key])]));
  }
  return value;
}
const canonical = (/** @type {unknown} */ value) => JSON.stringify(sortKeys(value ?? null));

/**
 * The claim fields the pack schema stores: `verified` on a certificate and the engine's other in-memory fields are not
 * part of a puzzle's claims (the pack writer drops them), so the source's claims are read through the same schema.
 * @param {any} rating
 * @param {any} certificate
 */
function claimsOf(rating, certificate) {
  /** @type {any} */
  let r = null;
  if (rating !== null && rating !== undefined) {
    r = { model: rating.model, score: rating.score, level: rating.level };
    if (rating.saturated !== undefined) {
      r.saturated = rating.saturated;
    }
    if (rating.censored !== undefined) {
      r.censored = rating.censored;
    }
    if (rating.metrics !== undefined && rating.metrics !== null) {
      const m = rating.metrics;
      r.metrics = rating.model === 'difficulty-v2' ? { U: m.U, B: m.B, branchTrials: m.branchTrials, rowTrials: m.rowTrials, stop: m.stop, R: m.R, H: m.H } : m;
    }
  }
  /** @type {any} */
  let c = null;
  if (certificate !== null && certificate !== undefined) {
    c = { status: certificate.status, model: certificate.model };
    if (certificate.rowLimit !== undefined) {
      c.rowLimit = certificate.rowLimit;
    }
  }
  return { rating: r, certificate: c };
}

/**
 * Everything the puzzle must keep, in a form that equal puzzles share (colour case, symmetric poses through occupied
 * cells and the order of the solution are the accepted normalisations).
 * @param {{ rows: string[], rotation: number, pieces: any[], clues: any[], solution: any[] | null, rating: unknown,
 *   certificate: unknown, heading: string }} p
 */
function viewOf(p) {
  const byId = new Map(p.pieces.map((piece) => [piece.id, piece]));
  const cellsOf = (/** @type {any} */ pose) => poseCells(byId.get(pose.piece), pose).map(([x, y]) => `${x},${y}`).join(' ');
  const clued = new Set(p.clues.map((c) => c.piece));
  const claims = claimsOf(p.rating, p.certificate);
  return {
    rows: [...p.rows],
    rotation: p.rotation,
    pieces: p.pieces.map((piece) => ({
      id: piece.id, label: piece.label, color: String(piece.color).toLowerCase(), shape: normalizeCells(piece.cells).map((c) => c.join(',')).join(' '),
    })),
    clues: p.clues.map((c) => [c.piece, cellsOf(c)]).sort(),
    toPlace: p.pieces.filter((piece) => !clued.has(piece.id)).map((piece) => piece.id),
    solution: p.solution === null ? null : p.solution.map((c) => [c.piece, cellsOf(c)]).sort(),
    rating: canonical(claims.rating),
    certificate: canonical(claims.certificate),
    heading: p.heading,
    fingerprint: progressFingerprint(boardFromRows(p.rows), p.pieces, p.clues),
  };
}

/** The title of a generated puzzle ("Normal #2"), which the list and the printed sheet show as "Puzzle #2". */
const GENERATED_TITLE = /^(?:Very easy|Easy|Normal|Hard|Expert|Master|Nightmare|Hell [1-9]\d*) #(\d+)$/;

/**
 * @param {string} heading The heading the puzzle's code carries.
 * @returns {string} The name printed on its sheet: a generated title shows as "Puzzle #n" / "Đề #n", any other as it is.
 */
function printedName(heading) {
  const generated = GENERATED_TITLE.exec(heading);
  return generated === null ? heading : playerI18n.t('card.heading', { n: Number(generated[1]) });
}

/**
 * The selected puzzle exactly as the source holds it.
 * @param {{ rows: string[], pieces: any[], puzzle: any, index: number, rotation: number, untitled?: (n: number) => string }} s
 */
function sourceView(s) {
  return viewOf({
    rows: s.rows,
    rotation: s.rotation,
    pieces: s.pieces,
    clues: s.puzzle.clues,
    solution: s.puzzle.solution ?? null,
    rating: s.puzzle.rating ?? null,
    certificate: s.puzzle.certificate ?? null,
    heading: puzzleDisplayName(s.puzzle.title, s.index, s.untitled ?? ((n) => `Puzzle #${n}`)),
  });
}

/**
 * What the Player shows now: its open puzzle and its visible heading.
 * @param {Stage} m
 */
function openedView(m) {
  const { pack, index, viewRotation } = /** @type {any} */ (m.player.store.getState());
  const puzzle = pack.puzzles[index];
  return viewOf({
    rows: pack.board.rows,
    rotation: viewRotation ?? pack.presentation?.rotation ?? 0,
    pieces: pack.pieces,
    clues: puzzle.clues,
    solution: puzzle.solution ?? null,
    rating: puzzle.rating ?? null,
    certificate: puzzle.certificate ?? null,
    heading: m.q('.puzzle-title').textContent ?? '',
  });
}

/**
 * @param {ReturnType<typeof viewOf>} actual
 * @param {ReturnType<typeof viewOf>} expected
 * @param {string} label
 */
function assertSameView(actual, expected, label) {
  for (const key of /** @type {const} */ (['rows', 'rotation', 'pieces', 'clues', 'toPlace', 'solution', 'rating', 'certificate', 'heading', 'fingerprint'])) {
    equal(actual[key], expected[key], `${label}: ${key}`);
  }
}

// ---- stages: the Player and its code entry ----------------------------------------------------------------------------------

/** @param {Record<string, string>} [seed] */
function memoryAdapter(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    get length() {
      return map.size;
    },
    key: (/** @type {number} */ i) => [...map.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => map.get(k) ?? null,
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => void map.set(k, String(v)),
    removeItem: (/** @type {string} */ k) => void map.delete(k),
  };
}

/** Verification pool that never answers: play must not wait for it, and no solver runs on this page. */
function stubPool() {
  const pool = { kinds: /** @type {string[]} */ ([]), beginRequest() {}, endRequest() {}, close() {}, run(/** @type {{ kind: string }} */ task) {
    pool.kinds.push(task.kind);
    return new Promise(() => {});
  } };
  return pool;
}

/** A factory for the Player's puzzle-code clients that counts what the Player made. */
function clientSpy(wrap = /** @type {(inner: ReturnType<typeof createPuzzleCodeClient>) => any} */ ((inner) => inner)) {
  const spy = {
    made: 0,
    disposed: 0,
    encodes: 0,
    decodes: 0,
    factory: () => {
      spy.made += 1;
      const inner = createPuzzleCodeClient();
      const wrapped = wrap(inner);
      return {
        encode: (/** @type {any} */ data) => (spy.encodes += 1, wrapped.encode(data)),
        decode: (/** @type {string} */ text) => (spy.decodes += 1, wrapped.decode(text)),
        repair: (/** @type {string} */ text) => wrapped.repair(text),
        cancel: () => wrapped.cancel(),
        dispose: () => (spy.disposed += 1, wrapped.dispose()),
      };
    },
  };
  return spy;
}

/**
 * @param {{ hash?: string, adapter?: ReturnType<typeof memoryAdapter>, factory?: () => any, width?: number, height?: number }} [o]
 */
async function mount(o = {}) {
  await useStyles('player');
  const root = document.createElement('div');
  root.className = 'stage-root';
  Object.assign(root.style, {
    position: 'fixed', left: '0', top: '0', width: o.width === undefined ? '100vw' : `${o.width}px`, height: o.height === undefined ? '100vh' : `${o.height}px`,
    zIndex: '5', overflow: 'auto', background: 'var(--gen-color-bg, #f3f1ea)',
  });
  document.body.append(root);
  const adapter = o.adapter ?? memoryAdapter();
  const location = { hash: o.hash ?? '', pathname: '/player/', search: '' };
  const urls = /** @type {string[]} */ ([]);
  const pool = stubPool();
  const player = mountPlayer(root, {
    storage: createStorage(adapter, () => Date.now()),
    location,
    history: {
      replaceState: (_s, _t, url) => {
        urls.push(url);
        location.hash = url.startsWith('#') ? url : '';
      },
    },
    baseUrl: new URL('../../player/', document.baseURI),
    createPool: () => /** @type {any} */ (pool),
    createPuzzleCodeClient: o.factory,
    listenHashChange: false,
    preferenceStorage: null,
  });
  toDestroy.push(player);
  await player.ready;
  await frame();
  /** @param {string} sel @returns {HTMLElement} */
  const q = (sel) => {
    const found = /** @type {HTMLElement | null} */ (root.querySelector(sel));
    if (!found) {
      throw new Error(`missing ${sel}`);
    }
    return found;
  };
  /** @param {string} sel @returns {HTMLElement[]} */
  const qa = (sel) => /** @type {HTMLElement[]} */ ([...root.querySelectorAll(sel)]);
  /** @param {string} sel */
  const visible = (sel) => {
    const node = root.querySelector(sel);
    return node !== null && !node.closest('[hidden]') && node.getClientRects().length > 0;
  };
  return { root, player, adapter, location, urls, pool, q, qa, visible };
}
/** @typedef {Awaited<ReturnType<typeof mount>>} Stage */

/**
 * The `#p=` address of a pack, as Play makes it: a code per puzzle, made by a client of its own.
 * @param {any} pack
 * @param {number} index
 * @param {(n: number) => string} [untitled] The sender's label of an untitled puzzle (English by default).
 */
async function packHash(pack, index, untitled) {
  const checked = validatePack(pack);
  assert(checked.ok, `fixture pack is valid: ${JSON.stringify(/** @type {any} */ (checked).issues?.slice(0, 2))}`);
  const client = createPuzzleCodeClient();
  try {
    const codes = await puzzleCodesOf(/** @type {any} */ (checked).value, { encodePuzzle: (data) => client.encode(data), ...(untitled === undefined ? {} : { untitled }) });
    assert(codes !== null, 'the codes of the pack could be made');
    return `#p=${/** @type {string[]} */ (codes).join(';')}${index === 0 ? '' : `&i=${index}`}`;
  } finally {
    client.dispose();
  }
}

const dialogOf = (/** @type {Stage} */ m) => /** @type {HTMLDialogElement | null} */ (m.root.querySelector('dialog.pm-code'));
const isOpen = (/** @type {Stage} */ m) => dialogOf(m)?.open === true;
const fieldOf = (/** @type {Stage} */ m) => /** @type {HTMLTextAreaElement} */ (m.q('dialog.pm-code textarea'));

/**
 * Opens the entry as a person does and enters the text through the dialog; waits until the dialog ends.
 * @param {Stage} m
 * @param {string} text
 * @param {{ wait?: boolean }} [o]
 */
async function enterCode(m, text, { wait = true } = {}) {
  if (!isOpen(m)) {
    // The page has no button for the entry: it opens as it does for a bad `#p=` address.
    m.player.codeDialog.open();
    await waitFor(() => isOpen(m), 'the entry to open');
  }
  const field = fieldOf(m);
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  m.q('dialog.pm-code [data-action="code-open"]').click();
  if (wait) {
    await waitFor(() => !isOpen(m) || (m.root.querySelector('dialog.pm-code .pm-code-busy')?.getClientRects().length === 0 && m.root.querySelector('.pm-code-problem')?.getClientRects().length !== 0), 'the entry to answer');
  }
}

/** What the entry dialog shows about a failure. @param {Stage} m */
function problemOf(m) {
  const box = m.root.querySelector('.pm-code-problem');
  if (box === null || /** @type {HTMLElement} */ (box).hidden) {
    return null;
  }
  const candidate = /** @type {HTMLElement} */ (box.querySelector('.pm-code-candidate'));
  return {
    error: box.querySelector('.pm-code-error')?.textContent ?? '',
    candidate: candidate.hidden ? null : candidate.textContent,
    useCorrection: m.root.querySelector('dialog.pm-code [data-action="use-correction"]')?.getClientRects().length !== 0,
    openCore: m.root.querySelector('dialog.pm-code [data-action="open-core"]')?.getClientRects().length !== 0,
  };
}

/** Places one free piece of the open sample puzzle through the game's own taps. @param {Stage} m */
function placeAnyPiece(m) {
  const before = /** @type {any} */ (m.player.store.getState().game);
  for (const id of [...before.tray.keys()]) {
    if (!m.player.play.select(id)) {
      continue;
    }
    for (let y = 0; y < sampleBoard.height; y += 1) {
      for (let x = 0; x < sampleBoard.width; x += 1) {
        m.player.play.tapCell([x, y]);
        m.player.play.tapCell([x, y]);
        if (/** @type {any} */ (m.player.store.getState().game).placed.size > before.placed.size) {
          m.player.controller.saveNow();
          return id;
        }
      }
    }
  }
  throw new Error('no piece could be placed');
}

/** The part of the open game that a failed load must leave alone. @param {Stage} m */
function gameSnapshot(m) {
  const { pack, index, game } = /** @type {any} */ (m.player.store.getState());
  return JSON.stringify({ pack, index, placed: [...(game?.placed.entries() ?? [])], moves: game?.moves, tray: [...(game?.tray.keys() ?? [])], urls: m.urls });
}

// ---- Share: the real dialog of the Player ------------------------------------------------------------------------------------

/**
 * Presses the Player's Share control from the focus, as a person does, and waits until the dialog has prepared the
 * link of the selected puzzle or failed to.
 * @param {Stage} m
 */
async function openShare(m) {
  const button = m.q('[data-action="share"]');
  button.focus();
  button.click();
  const dialog = /** @type {HTMLDialogElement} */ (m.q('dialog.pm-share-dialog'));
  assert(dialog.open, 'the Share dialog opens');
  const state = () => dialog.querySelector('[data-role="share-body"]')?.getAttribute('data-state');
  await waitFor(() => state() === 'ready' || state() === 'error', 'the Share dialog to prepare the link');
  const field = /** @type {HTMLTextAreaElement} */ (dialog.querySelector('textarea.pm-share-field'));
  const copyButton = /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="share-copy"]'));
  const outcome = () => dialog.querySelector('[data-role="share-notes"] [data-i18n="code.copied"], [data-role="share-notes"] [data-i18n="code.copyFailed"]')?.getAttribute('data-i18n') ?? null;
  return {
    dialog,
    button,
    field,
    copyButton,
    state,
    notes: () => [...dialog.querySelectorAll('[data-role="share-notes"] p')].map((node) => node.textContent ?? ''),
    qrCode: () => dialog.querySelector('.pm-share-qr-svg')?.getAttribute('data-qr-code') ?? null,
    /** Presses Copy link and waits until the dialog says how it went (a refusal also selects the field). */
    async copy() {
      copyButton.click();
      await waitFor(() => outcome() !== null, 'the dialog to say whether the link was copied');
      if (outcome() === 'code.copyFailed') {
        await waitFor(() => document.activeElement === field, 'the field to take the focus');
      }
      return outcome() === 'code.copied' ? 'copied' : 'failed';
    },
    /** Closes with its Close button and waits until the focus is back on Share. */
    async close() {
      /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="share-close"]')).click();
      await waitFor(() => !dialog.open && document.activeElement === button, 'the focus to return to Share');
    },
  };
}

// ---- Print: the real dialog, the real sheet ---------------------------------------------------------------------------------

/**
 * Presses a Print control, waits for the preparation and returns the dialog; `confirm` then prints (the page's own
 * `window.print` is replaced by a recorder) and reads the sheets back.
 * @param {HTMLElement} openButton
 * @param {{ before?: (dialog: HTMLDialogElement) => void | Promise<void> }} [o]
 */
async function openPrint(openButton, o = {}) {
  openButton.click();
  const dialog = /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-print-dialog[open]'));
  assert(dialog !== null, 'the Print dialog opens');
  const state = () => dialog.querySelector('[data-role="print-code"]')?.getAttribute('data-state');
  await o.before?.(dialog);
  await waitFor(() => state() === 'ready' || state() === 'error', 'the preparation to end');
  return {
    dialog,
    state,
    target: dialog.querySelector('[data-role="print-code"]')?.getAttribute('data-target') ?? '',
    notices: () => [...dialog.querySelectorAll('[data-role="print-notices"] li')].map((li) => li.getAttribute('data-notice') ?? ''),
    noticeTexts: () => [...dialog.querySelectorAll('[data-role="print-notices"] li')].map((li) => li.textContent ?? ''),
    confirm() {
      /** @type {Element[]} */
      let pages = [];
      let printed = 0;
      const realPrint = window.print;
      window.print = () => {
        printed += 1;
        pages = [...document.querySelectorAll('.pm-print-root .pm-print-page')].map((page) => /** @type {Element} */ (page.cloneNode(true)));
      };
      try {
        /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="print-confirm"]')).click();
      } finally {
        window.print = realPrint;
      }
      window.dispatchEvent(new Event('afterprint'));
      return { pages, printed };
    },
    cancel() {
      /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="print-cancel"]')).click();
    },
  };
}

/** @param {Element} page @param {string} selector */
const all = (page, selector) => [...page.querySelectorAll(selector)];

/**
 * The code the QR symbols of the sheets carry (the sheets print no code as text), in reading order.
 * @param {Element[]} pages
 */
const typedCode = (pages) => pages.flatMap((page) => all(page, 'g.pm-print-qr')).map((node) => node.getAttribute('data-qr-code') ?? '').join('');

/**
 * The first sheet's QR group, rasterised at four pixels per module with its quiet zone on a magenta ground (an
 * incomplete or transparent symbol shows magenta), compared with the matrix module by module and kept as grey pixels
 * for the runner's independent decoder.
 * @param {Element} group A `g.pm-print-qr`.
 * @param {ReadonlyArray<ArrayLike<number>>} rows
 */
async function rasterizeQr(group, rows) {
  const outer = Number(group.querySelector('rect')?.getAttribute('width'));
  const scale = 4;
  const side = outer * scale;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('xmlns', NS);
  svg.setAttribute('viewBox', `0 0 ${outer} ${outer}`);
  svg.setAttribute('width', String(side));
  svg.setAttribute('height', String(side));
  svg.append(...[...group.children].map((child) => child.cloneNode(true)));
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d', { willReadFrequently: true }));
  context.fillStyle = '#ff00ff';
  context.fillRect(0, 0, side, side);
  context.drawImage(image, 0, 0, side, side);
  const pixels = context.getImageData(0, 0, side, side).data;
  const gray = new Uint8Array(side * side);
  for (let i = 0; i < gray.length; i += 1) {
    const [r, g, b, a] = [pixels[4 * i], pixels[4 * i + 1], pixels[4 * i + 2], pixels[4 * i + 3]];
    gray[i] = a === 255 && Math.abs(r - g) < 8 && Math.abs(g - b) < 8 ? r : 128;
  }
  const quiet = 4;
  /** @type {string[]} */
  const read = [];
  let wrong = 0;
  for (let y = 0; y < outer; y += 1) {
    let line = '';
    for (let x = 0; x < outer; x += 1) {
      const value = gray[(y * scale + 2) * side + x * scale + 2];
      const inside = x >= quiet && y >= quiet && x < quiet + rows.length && y < quiet + rows.length;
      const expected = inside && rows[y - quiet][x - quiet] === 1 ? 0 : 255;
      if (Math.abs(value - expected) > 8) {
        wrong += 1;
      }
      if (inside) {
        line += value < 128 ? '1' : '0';
      }
    }
    if (line !== '') {
      read.push(line);
    }
  }
  return { side, gray: base64(gray), wrong, hash: await sha256(read.join('\n')) };
}

/**
 * Everything a printout shows of the code: the QR's code, its caption and the heading.
 * @param {Element[]} pages
 */
async function readSheets(pages) {
  const first = pages[0];
  const group = first.querySelector('g.pm-print-qr');
  return {
    F: typedCode(pages),
    heading: first.querySelector('text.pm-print-sheet-title')?.textContent ?? '',
    details: all(first, 'text.pm-print-detail').map((node) => node.textContent ?? ''),
    scan: first.querySelector('text.pm-print-qr-scan')?.textContent ?? null,
    noCode: first.querySelector('text.pm-print-no-code')?.textContent ?? null,
    qrVersion: group === null ? null : Number(group.getAttribute('data-qr-version')),
    qrEc: group?.getAttribute('data-qr-ec') ?? null,
    pageText: pages.map((page) => page.textContent ?? '').join(' '),
  };
}

// ---- the journey: print, read, scan, open in a fresh Player --------------------------------------------------------------------

/**
 * Prints the open puzzle of `m`, copies its link from the Share dialog and compares both with the selected source; then
 * enters the printed core, the printed full code and the copied link into fresh Players (new storage, no source data)
 * through the entry dialog and compares what opens with the source. The QR is kept as pixels for the runner, which
 * decodes it with the test-only decoder and compares its text with the link.
 * @param {string} name
 * @param {{ print: () => HTMLElement, share?: Stage, solutionOption?: boolean }} scope The app's Print control and the
 *   Player whose Share dialog copies the link (the Generator has none).
 * @param {ReturnType<typeof viewOf>} expected The selected puzzle as its source holds it.
 * @param {{ expectedCode?: string, expectedHash?: string, expectedVersion?: number }} [o]
 */
async function printCopyOpen(name, scope, expected, o = {}) {
  const writes = stubClipboard('ok');
  const print = await openPrint(scope.print());
  assert(print.state() === 'ready', `${name}: the Print dialog is ready`);
  assert((print.dialog.querySelector('[data-field="print-solution"]') === null) === (scope.solutionOption !== true), `${name}: only the Generator offers a solution sheet`);
  equal(print.target, OWN, `${name}: the QR leads to this page's Player`);
  equal(print.notices(), [], `${name}: with no local-page notice`);
  const done = print.confirm();
  equal(done.printed, 1, `${name}: printed once`);
  const F = typedCode(done.pages);
  // The Share dialog of the Player: the same prepared address.
  let url = `${OWN}#p=${F}`;
  if (scope.share !== undefined) {
    const share = await openShare(scope.share);
    equal(share.state(), 'ready', `${name}: the Share dialog is ready`);
    equal([share.field.value, share.qrCode()], [`${OWN}#p=${F}`, F], `${name}: the Share dialog shows the printed code at this page's Player, and its QR carries that code`);
    equal(await share.copy(), 'copied', `${name}: Copy link says it copied`);
    equal(writes.length, 1, `${name}: Copy link wrote once`);
    url = writes[0];
    equal(url, `${OWN}#p=${F}`, `${name}: the copied link is the printed code at this page's Player`);
    const symbol = /** @type {Element} */ (share.dialog.querySelector('.pm-share-qr-svg'));
    const shown = await rasterizeQr(symbol, rowsOfPath(symbol));
    equal(shown.wrong, 0, `${name}: pixels of the Share dialog's QR differing from its matrix`);
    evidence.rasters.push({ name: `${name}, Share dialog`, url, side: shown.side, gray: shown.gray });
    await share.close();
  }
  if (o.expectedCode !== undefined) {
    equal(F, o.expectedCode, `${name}: the frozen code`);
  }
  const C = F.includes('.') ? F.slice(0, F.indexOf('.')) : F;
  const T = F.includes('.') ? F.slice(F.indexOf('.') + 1) : null;
  const sheets = await readSheets(done.pages);
  const group = /** @type {Element} */ (done.pages[0].querySelector('g.pm-print-qr'));
  assert(group !== null, `${name}: a QR code is on the first sheet`);
  const raster = await rasterizeQr(group, rowsOfPath(group));
  equal(raster.wrong, 0, `${name}: pixels differing from the drawn matrix, quiet zone and opacity included`);
  // The frozen matrices are those of the public Player's address; a page leads to its own Player, so there they are pinned by the Node test.
  if (o.expectedHash !== undefined && OWN === 'https://tdat00.github.io/pentomino/player/') {
    equal(raster.hash, o.expectedHash, `${name}: the printed symbol is the frozen matrix`);
  }
  if (o.expectedVersion !== undefined) {
    equal(sheets.qrVersion, o.expectedVersion, `${name}: QR version`);
  }
  equal([sheets.qrEc, sheets.scan], ['M', 'Play online'], `${name}: the QR level and its caption`);
  assert(!/Puzzle code|\+ solution|score \d+.*Set:/.test(sheets.pageText) && done.pages[0].querySelector('text.pm-print-code, text.pm-print-qr-host') === null,
    `${name}: neither the code nor the address is printed`);
  void T;
  assert(!/seed/i.test(sheets.pageText), `${name}: no puzzle seed on the sheets`);
  equal(sheets.heading, printedName(expected.heading), `${name}: the printed heading is the name of the puzzle in the list`);
  evidence.rasters.push({ name, url, side: raster.side, gray: raster.gray });
  // Fresh Players: new storage, nothing of the source, the entry dialog as the only way in.
  const core = await freshOpen(`${name} core (typed grouped, lower case)`, C.replace(/(.{4})/g, '$1 ').trim().toLowerCase(), { ...expected, solution: null });
  assert(core.m.pool.kinds.includes('verifyPack'), `${name}: a core is verified in the background, no answer was invented`);
  if (T !== null) {
    await freshOpen(`${name} full`, `${C}.${T}`, expected);
  }
  await freshOpen(`${name} copied link`, url, T === null ? { ...expected, solution: null } : expected);
  evidence.journeys.push({
    name, F, C, T, url, heading: expected.heading, fingerprint: expected.fingerprint, rotation: expected.rotation, pieces: expected.pieces.length,
    clues: expected.clues.length, qrHash: raster.hash, qrVersion: sheets.qrVersion,
  });
  return { F, C, T, url, sheets, raster, pages: done.pages };
}

/**
 * The matrix a sheet's QR path draws, read by an independent reader of the documented `M x y h w v1 h-w z` runs.
 * @param {Element} group
 */
function rowsOfPath(group) {
  const outer = Number(group.querySelector('rect')?.getAttribute('width'));
  const size = outer - 8;
  const path = group.querySelector('path')?.getAttribute('d') ?? '';
  const rows = Array.from({ length: size }, () => new Uint8Array(size));
  const run = /M(\d+) (\d+)h(\d+)v1h-(\d+)z/y;
  let at = 0;
  while (at < path.length) {
    run.lastIndex = at;
    const m = run.exec(path);
    assert(m !== null && m[3] === m[4], `a run of the QR path at ${at}`);
    const [x, y, w] = [Number(m[1]), Number(m[2]), Number(m[3])];
    assert(y < size && x + w <= size, 'a run inside the symbol');
    for (let i = x; i < x + w; i += 1) {
      assert(rows[y][i] === 0, 'no module is drawn twice');
      rows[y][i] = 1;
    }
    at += m[0].length;
  }
  return rows;
}

/**
 * Opens text in a fresh Player through the entry dialog and compares the opened puzzle with the source.
 * @param {string} label
 * @param {string} text
 * @param {ReturnType<typeof viewOf>} expected
 */
async function freshOpen(label, text, expected) {
  const m = await mount();
  equal([m.adapter.map.size, m.root.dataset.screen], [0, 'start'], `${label}: a fresh Player has no data and shows the start screen`);
  await enterCode(m, text);
  assert(!isOpen(m), `${label}: the entry accepted the text (${problemOf(m)?.error ?? ''})`);
  const { pack, screen, game } = /** @type {any} */ (m.player.store.getState());
  assert(screen === 'game' && game !== null, `${label}: a game is open`);
  equal(pack.puzzles.length, 1, `${label}: one puzzle only`);
  assert((pack.witness ?? null) === null && (pack.generation ?? null) === null, `${label}: no witness or generation record`);
  assertSameView(openedView(m), expected, label);
  equal(m.qa('.tray-piece').map((node) => node.dataset.pieceId).sort(), [...expected.toPlace].sort(), `${label}: the pieces to place are in the tray`);
  equal(m.qa('.puzzle-card').length <= 1, true, `${label}: no neighbour in a puzzle list`);
  const info = m.q('.puzzle-info').textContent ?? '';
  evidence.notes.push({ label, info });
  return { m, info };
}

// ---- measuring a printed first sheet ----------------------------------------------------------------------------------------

/**
 * @param {Element} node
 * @returns {{ x: number, y: number, w: number, h: number }} Where the node is on its page, in millimetres.
 */
function rectOf(node) {
  const svg = /** @type {SVGSVGElement} */ (node.closest('svg'));
  const origin = svg.getBoundingClientRect();
  const r = node.getBoundingClientRect();
  return { x: (r.x - origin.x) * MM, y: (r.y - origin.y) * MM, w: r.width * MM, h: r.height * MM };
}

/**
 * The ink of a text line: its width from the DOM, its height from the baseline, so that two lines a pitch apart do not
 * report an overlap that is only line spacing.
 * @param {Element} node
 */
function glyphBox(node) {
  const r = rectOf(node);
  const size = Number(node.getAttribute('font-size'));
  const baseline = Number(node.getAttribute('y'));
  return { x: r.x, w: r.w, y: baseline - 0.78 * size, h: size };
}

/** @param {Array<[string, { x: number, y: number, w: number, h: number }]>} boxes */
function assertSeparate(boxes) {
  const gap = 0.02;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const [an, a] = boxes[i];
      const [bn, b] = boxes[j];
      const apart = a.x + a.w <= b.x + gap || b.x + b.w <= a.x + gap || a.y + a.h <= b.y + gap || b.y + b.h <= a.y + gap;
      assert(apart, `${an} (${[a.x, a.y, a.w, a.h].map((n) => n.toFixed(1))}) overlaps ${bn} (${[b.x, b.y, b.w, b.h].map((n) => n.toFixed(1))})`);
    }
  }
}

/**
 * Everything on a first sheet that the printed code must respect, measured on the real sheet: A4, the 10 mm margins,
 * the QR box in the corner at its physical size, no overlap among the heading, the details, the code, the QR, its
 * captions and the preview, the preview's reserve of at least 120 mm, and the 50 mm scale bar.
 * @param {Element} page
 * @param {string} label
 * @param {{ qr: boolean }} expect
 */
function checkFirstSheet(page, label, expect) {
  stage.append(page);
  try {
    const svg = /** @type {SVGSVGElement} */ (page.querySelector('svg'));
    const sheet = svg.getBoundingClientRect();
    assert(Math.abs(sheet.width * MM - 210) < 0.25 && Math.abs(sheet.height * MM - 297) < 0.25, `${label}: A4, got ${(sheet.width * MM).toFixed(1)} x ${(sheet.height * MM).toFixed(1)} mm`);
    /** @type {Array<[string, { x: number, y: number, w: number, h: number }]>} */
    const boxes = [];
    for (const selector of ['text.pm-print-sheet-title', 'text.pm-print-detail', 'text.pm-print-no-code', 'text.pm-print-qr-scan']) {
      for (const node of all(page, selector)) {
        boxes.push([`${selector} "${(node.textContent ?? '').slice(0, 12)}"`, glyphBox(node)]);
      }
    }
    assert(page.querySelector('text.pm-print-code, text.pm-print-qr-host') === null, `${label}: neither the code nor the address is printed`);
    const group = page.querySelector('g.pm-print-qr');
    if (expect.qr) {
      assert(group !== null, `${label}: a QR code is on the first sheet`);
      const box = rectOf(/** @type {Element} */ (group));
      const outer = Number(group?.querySelector('rect')?.getAttribute('width'));
      const version = Number(group?.getAttribute('data-qr-version'));
      const side = Math.max(25, (17 + 4 * version + 8) * 0.5);
      assert(Math.abs(box.w - side) < 0.05 && Math.abs(box.h - side) < 0.05, `${label}: QR box ${box.w.toFixed(2)} mm, expected max(25, (N + 8) x 0.5) = ${side} mm for version ${version}`);
      assert(outer === 17 + 4 * version + 8, `${label}: the quiet zone is four modules (outer ${outer})`);
      assert(Math.abs(box.x - 10) < 0.05 && Math.abs(box.y - 10) < 0.05, `${label}: the QR sits in the top-left corner of the content area`);
      assert(box.w / outer >= 0.5 - 1e-3, `${label}: a module is at least 0.5 mm`);
      boxes.push(['QR box', box]);
      for (const [name, b] of boxes) {
        if (name !== 'QR box' && !name.includes('qr-') && b.y < 10 + side + 7 - 0.05) {
          assert(b.x >= 10 + side + 6 - 0.35, `${label}: ${name} starts at ${b.x.toFixed(1)} mm, clear of the QR column (${(10 + side + 6).toFixed(1)})`);
        }
      }
    }
    for (const [name, b] of boxes) {
      assert(b.x >= 10 - 0.3 && b.x + b.w <= 200 + 0.3 && b.y >= 10 - 2 && b.y + b.h <= 287 + 0.3, `${label}: ${name} lies inside the 10 mm margins`);
    }
    const board = rectOf(/** @type {Element} */ (page.querySelector('.pm-print-board')));
    boxes.push(['preview board', board]);
    assertSeparate(boxes);
    assert(273 - board.y >= 120 - 0.6, `${label}: the preview keeps 120 mm (${(273 - board.y).toFixed(1)})`);
    const bar = all(page, 'svg > path').find((node) => /h50/.test(node.getAttribute('d') ?? ''));
    assert(bar !== undefined && Math.abs(rectOf(bar).w - 50) < 0.6, `${label}: the 50 mm scale bar`);
  } finally {
    page.remove();
  }
}

/** The 'Cells: N mm' lines of every sheet, the number of sheets and their text without the first one. @param {Element[]} pages */
function layoutOf(pages) {
  return {
    count: pages.length,
    cells: pages.flatMap((page) => all(page, 'text').map((node) => node.textContent ?? '').filter((text) => /^Cells: /.test(text))),
    rest: pages.slice(1).map((page) => `${page.textContent} ${all(page, '.pm-print-piece').length}`),
  };
}

/** A factory of puzzle-code clients that give a fixed code (no worker). @param {number} c @param {number} t */
function fakeFactory(c, t) {
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const symbols = (/** @type {number} */ n) => ALPHABET.repeat(Math.ceil(n / ALPHABET.length)).slice(0, n);
  const C = symbols(c);
  const T = t > 0 ? symbols(t) : null;
  return () => {
    // Opening the address needs the real decoder; only the encoder is faked.
    const real = createPuzzleCodeClient();
    return {
      encode: async () => ({ ok: /** @type {const} */ (true), value: { C, T, F: T === null ? C : `${C}.${T}`, version: /** @type {const} */ (1) }, warnings: [] }),
      decode: (/** @type {string} */ text) => real.decode(text),
      repair: async () => ({ ok: /** @type {const} */ (false), issues: [{ code: 'worker-error', path: '$', message: 'not used' }] }),
      cancel() {
        real.cancel();
      },
      dispose() {
        real.dispose();
      },
    };
  };
}

// ---- the journeys -------------------------------------------------------------------------------------------------------------

const sampleRows = /** @type {string[]} */ (sample.board.rows);
const samplePieces = /** @type {any[]} */ (sample.pieces);

await check('BA01 BA02 BA03 BA04 BA17 BA22 BA24 BA25: puzzle 2 of 3 — Print, read the code in order, rasterise the QR, Copy the link, open it in fresh Players', async () => {
  const spy = clientSpy();
  const m = await mount({ hash: await packHash(sample, 1), factory: spy.factory });
  equal(m.root.dataset.screen, 'game', 'the source Player shows a puzzle');
  equal(/** @type {any} */ (m.player.store.getState().pack).puzzles.length, 3, 'its pack holds three puzzles');
  const expected = sourceView({ rows: sampleRows, pieces: samplePieces, puzzle: sample.puzzles[1], index: 1, rotation: 0 });
  equal(expected.heading, 'Normal #2', 'the heading of the selected puzzle');
  assertSameView(openedView(m), expected, 'the source Player');
  const out = await printCopyOpen('sample 2 of 3', { print: () => m.q('[data-action="print"]'), share: m }, expected, {
    expectedCode: G2.code, expectedHash: qrHash(G2.name), expectedVersion: 5,
  });
  assert(out.T !== null, 'the stored answer is carried with the core');
  assert(out.F.length < 60, `a code is a puzzle, not a pack (${out.F.length})`);
  assert(!out.F.includes(G1.code.slice(0, 20)) && !out.F.includes(G3.code.slice(0, 20)), 'neither neighbour is in the code');
  assert(spy.encodes >= 2, 'Print and Share each asked the worker');
  equal(out.sheets.details.length, 1, 'one detail line: the rating (no set line)');
  assert(/^Normal: score \d+/.test(out.sheets.details[0]), `the level and score stay (${out.sheets.details[0]})`);
  await showSheet('player-sheet-source', out.pages[0]);
});

await check('BA09: the view rotated to 45 degrees is the angle that is printed, encoded and re-created', async () => {
  const m = await mount({ hash: await packHash(sample, 0) });
  m.player.controller.rotateView(45);
  await waitFor(() => /** @type {any} */ (m.player.store.getState()).viewRotation === 45, 'the view to turn');
  const expected = sourceView({ rows: sampleRows, pieces: samplePieces, puzzle: sample.puzzles[0], index: 0, rotation: 45 });
  equal(expected.rotation, 45, 'the expected angle is the current view');
  const out = await printCopyOpen('sample 1 of 3 at 45 degrees', { print: () => m.q('[data-action="print"]'), share: m }, expected);
  assert(out.F !== G1.code, 'the angle is part of the code');
  const straight = await mount({ hash: await packHash(sample, 0) });
  const plain = await openPrint(straight.q('[data-action="print"]'));
  assert(plain.state() === 'ready', 'ready');
  equal(typedCode(plain.confirm().pages), G1.code, 'the same puzzle at its own angle is the frozen code');
});

await check('BA05 BA01: the 243-character oracle opened by its code prints that very code, and its 61-module QR is the frozen symbol', async () => {
  const oracle = fixture.large;
  const m = await mount({ hash: `#p=${oracle.code}` });
  equal(m.root.dataset.screen, 'game', 'the Player opened the oracle by its address');
  const { pack } = /** @type {any} */ (m.player.store.getState());
  const labels = Array.from({ length: oracle.pieceCount }, (_, i) => (i < 26 ? String.fromCharCode(65 + i) : `A${String.fromCharCode(65 + i - 26)}`));
  equal(pack.pieces.map((/** @type {any} */ p) => [p.id, p.label, p.color.toLowerCase()]), labels.map((id, i) => [id, id, fixture.colors[i]]), 'identities beyond Z, labels and the frozen RGB defaults, in order');
  equal(pack.pieces.map((/** @type {any} */ p) => p.cells.length), oracle.pieceSizes, 'sizes in source order');
  equal([pack.board.rows.length, pack.board.rows[0].length, pack.puzzles[0].clues.length], [oracle.height, oracle.width, oracle.clueCount], 'a 24 x 24 board with four clues');
  const expected = openedView(m);
  equal(expected.fingerprint, oracle.progressFingerprint, 'the independent progress fingerprint');
  equal(expected.rating, canonical(oracle.rating), 'the complete rating claim');
  equal(m.qa('.tray-piece').length, oracle.pieceCount - oracle.clueCount, 'the pieces still to place');
  const out = await printCopyOpen('24 x 24, 40 pieces, answer', { print: () => m.q('[data-action="print"]'), share: m }, expected, {
    expectedCode: oracle.code, expectedHash: qrHash(oracle.name), expectedVersion: 11,
  });
  // The link is the oracle's code at this page's Player (288 characters at the public Player).
  equal([out.C.length, out.F.length, out.url.length], [oracle.coreLength, oracle.fullLength, `${OWN}#p=`.length + oracle.fullLength], 'core, full code and link lengths');
  await showSheet('oracle-sheet', out.pages[0]);
});

/** The custom pack of the Node acceptance test: holes, a padded border, custom identities and an angle. */
function customPack() {
  const base = structuredClone(hand);
  const piece = base.pieces.find((/** @type {any} */ p) => p.id === 'D');
  const pose = base.puzzles[0].solution.find((/** @type {any} */ p) => p.piece === 'D');
  const holes = new Set(poseCells(piece, pose).map(([x, y]) => `${x},${y}`));
  const open = base.board.rows.map((/** @type {string} */ row, /** @type {number} */ y) => [...row].map((c, x) => (holes.has(`${x},${y}`) ? '.' : c)).join(''));
  const [left, right, top, bottom] = [2, 3, 1, 2];
  const width = open[0].length + left + right;
  const rows = [
    ...Array(top).fill('.'.repeat(width)),
    ...open.map((/** @type {string} */ row) => `${'.'.repeat(left)}${row}${'.'.repeat(right)}`),
    ...Array(bottom).fill('.'.repeat(width)),
  ];
  const identity = /** @type {Record<string, [string, string, string]>} */ ({
    A: ['a-1', 'Đ', '#FF00AA'], B: ['B_2', '🙂', '#00AAFF'], C: ['x3', 'ƒ', '#12AB34'], E: ['E', '', '#FFFFFF'],
    F: ['f-6', '日本', '#000001'], G: ['G7', 'G', '#C0FFEE'], H: ['h8', 'Ω', '#BADA55'], I: ['I9', 'é', '#010203'], J: ['J_10', '⑩', '#FEDCBA'],
  });
  const shift = (/** @type {any} */ p) => ({ ...p, piece: identity[p.piece][0], x: p.x + left, y: p.y + top });
  const solution = base.puzzles[0].solution.filter((/** @type {any} */ p) => p.piece !== 'D').map(shift);
  const clues = base.puzzles[0].clues.map(shift);
  // A list may not repeat a puzzle (the same clues), so the second puzzle has one clue more.
  const moreClues = [...clues, solution.find((/** @type {any} */ p) => !clues.some((/** @type {any} */ c) => c.piece === p.piece))];
  const claims = {
    rating: { model: 'difficulty-v2', score: 51, level: 'hard-2', saturated: false, metrics: { U: 11, B: 120, branchTrials: 30, rowTrials: 900, stop: 'solution', R: 140, H: 6.25 } },
    certificate: { status: 'unique', model: 'dlx-v1', rowLimit: 123456789 },
  };
  const checked = validatePack({
    ...base,
    board: { rows },
    presentation: { rotation: 135 },
    pieces: base.pieces.filter((/** @type {any} */ p) => p.id !== 'D').map((/** @type {any} */ p) => ({ id: identity[p.id][0], label: identity[p.id][1], color: identity[p.id][2], cells: p.cells })),
    puzzles: [
      { id: 'c-1', title: 'Ünïcødé 🧩 Rätsel', clues, solution, ...claims },
      { id: 'c-2', clues: moreClues, solution },
    ],
  });
  assert(checked.ok, `the custom pack is valid: ${JSON.stringify(/** @type {any} */ (checked).issues?.slice(0, 2))}`);
  return JSON.parse(JSON.stringify(/** @type {any} */ (checked).value));
}

await check('BA06 BA07 BA08 BA09: custom ids, Unicode labels and RGB, a padded border, irregular holes and a turned view are re-created exactly', async () => {
  const pack = customPack();
  const m = await mount({ hash: await packHash(pack, 0) });
  equal(m.root.dataset.screen, 'game', 'the source Player shows the custom puzzle');
  const expected = sourceView({ rows: pack.board.rows, pieces: pack.pieces, puzzle: pack.puzzles[0], index: 0, rotation: 135 });
  equal(expected.heading, 'Ünïcødé 🧩 Rätsel #1', 'a Unicode title keeps its text and takes the position');
  assertSameView(openedView(m), expected, 'the source Player');
  const out = await printCopyOpen('custom pack', { print: () => m.q('[data-action="print"]'), share: m }, expected);
  const fresh = await freshOpen('custom pack, again', out.F, expected);
  const opened = /** @type {any} */ (fresh.m.player.store.getState().pack);
  equal(opened.pieces.map((/** @type {any} */ p) => [p.id, p.label]), pack.pieces.map((/** @type {any} */ p) => [p.id, p.label]), 'no generated-default relabelling');
  assert(opened.board.rows[0].startsWith('..') && opened.board.rows[0].endsWith('...'), 'the blocked border keeps its widths');
  equal(opened.board.rows.join('\n'), pack.board.rows.join('\n'), 'frame, holes and shifted coordinates');
});

await check('BA16: size, piece, board and two-sided choices lay the same code out again — no new encoding, no change of the code', async () => {
  const spy = clientSpy();
  const m = await mount({ hash: await packHash(sample, 1), factory: spy.factory });
  const print = await openPrint(m.q('[data-action="print"]'));
  assert(print.state() === 'ready', 'ready');
  const encodes = spy.encodes;
  const sizes = print.dialog.querySelectorAll('[data-field="print-size"]');
  equal(sizes.length, 4, 'four sizes');
  const counts = [];
  for (const [size, duplex, board] of /** @type {const} */ ([['small', false, true], ['large', true, true], ['fit_page', true, false], ['medium', false, true]])) {
    /** @type {HTMLInputElement} */ (print.dialog.querySelector(`[data-field="print-size"][value="${size}"]`)).click();
    for (const [field, value] of [['print-duplex', duplex], ['print-board', board]]) {
      const input = /** @type {HTMLInputElement} */ (print.dialog.querySelector(`[data-field="${field}"]`));
      if (input.checked !== value) {
        input.click();
      }
    }
    await pause(30);
    equal(print.state(), 'ready', `${size}: still ready, not preparing again`);
    counts.push(print.dialog.querySelector('[data-role="print-summary"]')?.textContent ?? '');
  }
  equal(spy.encodes, encodes, 'no option change encoded again');
  const done = print.confirm();
  equal(typedCode(done.pages), G2.code, 'the printed code is still the frozen code');
  assert(done.pages.length >= 1, 'pages');
  evidence.optionSummaries = counts;
});

// @@APPEND@@

/**
 * One printout of the open puzzle with the given choices of the Print dialog (null: the dialog does not offer to print).
 * @param {Stage} m
 * @param {{ size: string, pieces: boolean, board: boolean, duplex: boolean }} choices
 */
async function printWith(m, { size, pieces, board, duplex }) {
  const print = await openPrint(m.q('[data-action="print"]'));
  assert(print.state() === 'ready', 'the dialog is ready');
  for (const [field, value] of /** @type {Array<[string, boolean]>} */ ([['print-pieces', pieces], ['print-board', board], ['print-duplex', duplex]])) {
    const input = /** @type {HTMLInputElement} */ (print.dialog.querySelector(`[data-field="${field}"]`));
    if (input.checked !== value) {
      input.click();
    }
  }
  /** @type {HTMLInputElement} */ (print.dialog.querySelector(`[data-field="print-size"][value="${size}"]`)).click();
  if (/** @type {HTMLButtonElement} */ (print.dialog.querySelector('[data-action="print-confirm"]')).disabled) {
    print.cancel();
    return null;
  }
  return print.confirm();
}

await check('BA16: every size, piece, board and two-sided choice of the 40-piece oracle keeps its first sheet clear and the cut-outs at their scale, with one QR and the code intact', async () => {
  const oracle = fixture.large;
  const opened = await mount({ hash: `#p=${oracle.code}` });
  const pack = /** @type {any} */ (opened.player.store.getState().pack);
  const hash = await packHash(pack, 0);
  const withCode = await mount({ hash });
  const without = await mount({ hash, factory: fakeFactory(4300, 0) });
  let cases = 0;
  for (const size of ['small', 'medium', 'large', 'fit_page']) {
    for (const [pieces, board, duplex] of [[true, true, false], [true, false, true], [false, true, true], [false, false, false]]) {
      const label = `${size}, pieces ${pieces}, board ${board}, two sides ${duplex}`;
      const a = await printWith(withCode, { size, pieces, board, duplex });
      const b = await printWith(without, { size, pieces, board, duplex });
      assert(a !== null && b !== null, `${label}: the dialog offers to print`);
      checkFirstSheet(a.pages[0], label, { qr: true });
      equal(typedCode(a.pages), oracle.code, `${label}: the printed code reads back as the oracle`);
      equal(a.pages.filter((page) => page.querySelector('g.pm-print-qr') !== null).length, 1, `${label}: one QR in the whole printout`);
      assert(a.pages[0].querySelector('g.pm-print-qr') !== null, `${label}: and it is on the first sheet`);
      for (const page of a.pages.slice(1)) {
        assert(page.querySelector('text.pm-print-code, g.pm-print-qr') === null, `${label}: no code on the cut-out, solution and mirrored back sheets`);
      }
      checkFirstSheet(b.pages[0], `${label}, without a code`, { qr: false });
      assert(b.pages[0].querySelector('text.pm-print-no-code') !== null && b.pages[0].querySelector('text.pm-print-code, g.pm-print-qr') === null, `${label}: the sheet without a code says so`);
      const [la, lb] = [layoutOf(a.pages), layoutOf(b.pages)];
      equal(la.count, lb.count, `${label}: the same number of sheets with and without a code`);
      equal(la.cells, lb.cells, `${label}: the cell size is the one without a code`);
      equal(la.rest, lb.rest, `${label}: cut-outs, boards and backs are untouched by the code`);
      cases += 1;
    }
  }
  equal(cases, 16, 'all combinations ran');
});

/** The notices texts of the dialog and the sheet in English. */
const NOTICE = {
  noTail: 'The code is too long for one QR code; the optional solution part is left out.',
  lowEc: 'The QR code uses low error correction because the code is long.',
  none: 'This puzzle is too large for a puzzle code and a QR code; it will be printed without them.',
  shareNoTail: 'The stored solutions are left out of the link so that it fits a QR code.',
  shareLowEc: 'The QR code uses low error correction because the link is long.',
  shareNone: 'The link is too long for a QR code; copy it instead.',
  shareLong: (/** @type {number} */ count) => `This link is ${count} characters long; some chat apps cut long links.`,
  shareTooLarge: 'This puzzle is too large to share as a link.',
};

await check('BA20 BA21: the capacity ladder reaches the dialog before printing, the sheet after and the Share dialog — tail first, then error correction L, then no code and no QR', async () => {
  const hash = await packHash(sample, 0);
  /** @param {number} c @param {number} t @param {boolean} [duplex] */
  const run = async (c, t, duplex = false) => {
    const m = await mount({ hash, factory: fakeFactory(c, t) });
    const print = await openPrint(m.q('[data-action="print"]'));
    assert(print.state() === 'ready', `(${c}, ${t}): ready`);
    const before = { notices: print.notices(), texts: print.noticeTexts() };
    if (duplex) {
      /** @type {HTMLInputElement} */ (print.dialog.querySelector('[data-field="print-duplex"]')).click();
    }
    const done = print.confirm();
    return { before, done, sheets: await readSheets(done.pages) };
  };
  const fits = await run(200, 40);
  equal(fits.before.notices, [], 'a code that fits has no notice');
  equal([fits.sheets.qrEc, fits.sheets.F.includes('.')], ['M', true], 'and carries its answer at level M');

  // 3,501 symbols would fit at level L, but the tail is dropped first and M is kept.
  const noTail = await run(3000, 500);
  equal(noTail.before.notices, ['noTail'], 'the notice comes before printing');
  equal(noTail.before.texts[0], NOTICE.noTail, 'in words');
  equal([noTail.sheets.qrEc, noTail.sheets.F.includes('.')], ['M', false], 'the tail left the QR, level M kept');
  assert(noTail.sheets.F.length === 3000, 'the whole core is in the QR');
  checkFirstSheet(noTail.done.pages[0], 'tail dropped', { qr: true });

  const low = await run(3400, 500);
  equal(low.before.notices, ['noTail', 'lowEc'], 'then level L for the core');
  equal([low.sheets.qrEc, low.sheets.F.length], ['L', 3400], 'the core only, at level L');
  assert(low.sheets.qrVersion !== null && low.sheets.qrVersion <= 40, 'a symbol of version 40 at most');

  const none = await run(4300, 0);
  equal(none.before.notices, ['none'], 'no symbol fits: the notice is shown before printing');
  equal(none.before.texts[0], NOTICE.none, 'in words');
  equal([none.sheets.qrVersion, none.sheets.F, none.sheets.noCode], [null, '', 'This puzzle is too large for a puzzle code.'], 'no QR on the sheet, which says so');
  checkFirstSheet(none.done.pages[0], 'no code', { qr: false });
  assert(none.done.pages[0].querySelector('g.pm-print-qr, text.pm-print-qr-scan') === null, 'and no scan caption either');

  // A core that fits the QR but not the first sheet needs no extra sheet: the QR carries it; the backs of a two-sided printout stay blank.
  for (const duplex of [false, true]) {
    const long = await run(3300, 0, duplex);
    equal(long.sheets.F.length, 3300, `${duplex ? 'two sides' : 'one side'}: every symbol is in the QR, in order`);
    assert(long.done.pages.every((page) => page.querySelector('text.pm-print-code, text.pm-print-code-title') === null), 'no page carries typed code');
    equal(long.done.pages.filter((page) => page.querySelector('g.pm-print-qr') !== null).length, 1, 'the QR is on the first sheet only');
    checkFirstSheet(long.done.pages[0], `long core, ${duplex ? 'two sides' : 'one side'}`, { qr: true });
    if (duplex) {
      equal(long.done.pages.length % 2, 0, 'whole leaves');
      for (const [i, page] of long.done.pages.entries()) {
        if (i % 2 === 1 && page.querySelector('g.pm-print-qr') !== null) {
          throw new Error(`the back at ${i} carries a QR`);
        }
      }
    }
  }

  // The Share dialog follows the same ladder: a link too long for any QR is still offered, one over 16,000 characters is not.
  const prefix = `${OWN}#p=`;
  /** @param {number} c @param {number} t */
  const share = async (c, t) => {
    const writes = stubClipboard('ok');
    const dialog = await openShare(await mount({ hash, factory: fakeFactory(c, t) }));
    return { dialog, writes, url: dialog.field.value, notes: dialog.notes(), qr: dialog.qrCode() };
  };
  const shareNoTail = await share(3000, 500);
  equal([shareNoTail.url.length, shareNoTail.url.includes('.', prefix.length), shareNoTail.qr === shareNoTail.url.slice(prefix.length)], [prefix.length + 3000, false, true], 'Share: the core only, in the field and in the QR');
  equal(shareNoTail.notes, [NOTICE.shareNoTail], 'Share: the stored solution is left out, in words');
  const shareLow = await share(3400, 500);
  equal([shareLow.url.length, shareLow.notes], [prefix.length + 3400, [NOTICE.shareNoTail, NOTICE.shareLowEc]], 'Share: then level L');
  const shareNone = await share(4300, 0);
  equal([shareNone.url.length, shareNone.qr, shareNone.notes], [prefix.length + 4300, null, [NOTICE.shareNone, NOTICE.shareLong(prefix.length + 4300)]], 'Share: no QR and a long link, said in words');
  equal(shareNone.dialog.dialog.querySelector('.pm-share-qr-empty')?.textContent, 'No QR code: the link is too long for one.', 'Share: the QR card says why it is empty');
  equal(await shareNone.dialog.copy(), 'copied', 'Share: the link without a QR is still copied');
  equal(shareNone.writes, [shareNone.url], 'Share: exactly the link in the field');
  const shareTooLarge = await share(16000, 0);
  equal([shareTooLarge.url, shareTooLarge.qr, shareTooLarge.notes, shareTooLarge.dialog.copyButton.disabled], ['', null, [NOTICE.shareTooLarge], true], 'Share: a link over 16,000 characters is not offered');
});

await check('BA17 BA18: the Print dialog and the Share dialog both use this page\'s Player; there is no override and nothing is stored; the copied link opens that puzzle in the real Player page', async () => {
  const writes = stubClipboard('ok');
  const m = await mount({ hash: await packHash(sample, 2) });
  const storage = () => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]);
  const before = storage();
  const first = await openPrint(m.q('[data-action="print"]'));
  assert(first.dialog.querySelector('[data-field="print-use-this-page"]') === null, 'the dialog has no override');
  equal(first.target, OWN, "the QR leads to this page's Player");
  equal(first.noticeTexts(), [], 'with no local-page notice');
  const done = first.confirm();
  assert(done.pages[0].querySelector('text.pm-print-qr-host') === null, 'the sheet does not print the address');
  equal(typedCode(done.pages), G3.code, 'the printed code is the puzzle\'s code');
  const share = await openShare(m);
  equal(share.notes(), [], 'the Share dialog has no local-page notice');
  equal(await share.copy(), 'copied', 'Copy link copies');
  equal(writes, [`${OWN}#p=${G3.code}`], 'the Share dialog uses this page too');
  await share.close();
  const second = await openPrint(m.q('[data-action="print"]'));
  equal(second.target, OWN, 'a new dialog uses the same target');
  second.cancel();
  equal(storage(), before, 'nothing was stored by the dialogs');
  // The real Player page (this page's Player address is not a page of the test site) opens the copied address.
  const hash = writes[0].slice(writes[0].indexOf('#'));
  const frame = /** @type {HTMLIFrameElement} */ (h('iframe', { width: '1200', height: '800', src: `../../player/index.html${hash}` }));
  stage.append(frame);
  const title = () => frame.contentDocument?.querySelector('#app[data-screen="game"] .puzzle-title')?.textContent ?? '';
  await waitFor(() => title() !== '', 'the real Player page to open the copied link', 30000);
  equal([title(), frame.contentDocument?.querySelectorAll('.puzzle-card').length, frame.contentWindow?.location.hash], ['Hard #3', 1, hash], 'only that puzzle opens, and the address is kept');
});

// ---- the real Generator --------------------------------------------------------------------------------------------------------

/** @param {string} tag @param {Record<string, string>} [attrs] @param {...(Node | string)} children @returns {HTMLElement} */
function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [attr, value] of Object.entries(attrs)) {
    node.setAttribute(attr, value);
  }
  node.append(...children);
  return node;
}

/** The real Generator app in its slots, with its real engine workers; Play is not needed here. @param {string} batchSeed */
function mountGenerator(batchSeed) {
  const root = h('div', { class: 'gen-root' },
    h('main', { class: 'layout' },
      h('section', { class: 'panel panel-board' }, h('div', { 'data-slot': 'board' })),
      h('section', { class: 'panel panel-level' }, h('div', { 'data-slot': 'level' })),
      h('section', { class: 'panel panel-set' }, h('div', { 'data-slot': 'set' })),
      h('section', { class: 'panel panel-puzzles' }, h('div', { 'data-slot': 'puzzles' }))),
    h('div', { class: 'main-actions' }, h('button', { type: 'button', 'data-slot': 'main-action' }, 'New piece set')));
  stage.append(root);
  /** @type {unknown} */
  let saved = null;
  let counter = 0;
  // The Generator app does not close the pool it makes when it is destroyed (it lives as long as its page), so this
  // harness owns the pool and ends its workers itself; the page-wide check that every worker ended stays exact.
  const pool = createPool();
  const app = createGeneratorApp(document, {
    pool,
    storage: /** @type {any} */ ({ getGeneratorState: () => saved, setGeneratorState: (/** @type {unknown} */ snapshot) => {
      saved = JSON.parse(JSON.stringify(snapshot));
      return { ok: true };
    } }),
    random: () => `ACC-${String((counter += 1)).padStart(4, '0')}-SEED`,
    randomNumber: () => batchSeed,
    controller: { openPlayer: async () => {} },
  });
  app.store.update({ quantity: 5 });
  toDestroy.push({ destroy() {
    app.destroy();
    pool.close();
    root.remove();
  } });
  const q = (/** @type {string} */ selector) => {
    const found = /** @type {HTMLElement | null} */ (root.querySelector(selector));
    if (found === null) {
      throw new Error(`missing ${selector}`);
    }
    return found;
  };
  return { root, app, q, state: () => /** @type {any} */ (app.store.getState()) };
}

await check('BA01 BA02 BA03 BA04 BA22 BA23 BA24: the real Generator — one puzzle of five is printed with its solution sheet, copied, refused by the clipboard, and re-created in fresh Players', async () => {
  await useStyles('generator');
  const recipe = recipes[0];
  const g = mountGenerator(`${recipe.seedText}#1`);
  assert(g.app.editor.resize(10, 6), 'the board is 10 x 6');
  const radio = /** @type {HTMLInputElement} */ (g.q('[data-field="level"] input[value="normal"]'));
  radio.click();
  const seed = /** @type {HTMLInputElement} */ (g.q('[data-field="seed"]'));
  seed.value = recipe.seedText;
  seed.dispatchEvent(new Event('input', { bubbles: true }));
  seed.dispatchEvent(new Event('change', { bubbles: true }));
  g.q('[data-action="generate-set"]').click();
  await waitFor(() => g.state().set !== null && g.state().job === null, 'the piece set', 120000);
  g.q('[data-action="new-puzzles"]').click();
  await waitFor(() => g.state().puzzles.length > 0 || g.state().job === null, 'the first puzzle', 120000);
  await waitFor(() => g.state().job === null, 'the batch', 120000);
  await waitFor(() => g.state().checking.length === 0, 'the certificates', 120000);
  const state = g.state();
  equal(state.puzzles.length, 5, 'five puzzles in the set');
  const puzzle = state.puzzles[2];
  g.q(`li[data-puzzle-id="${puzzle.id}"] [data-action="select"]`).click();
  await pause(60);
  const untitled = (/** @type {number} */ n) => generatorI18n.t('card.heading', { n });
  const expected = sourceView({ rows: boardToRows(state.set.board), pieces: state.set.pieces, puzzle, index: 2, rotation: state.rotation, untitled });
  assert(expected.solution !== null, 'the generated puzzle stores its answer');
  evidence.generator = { scores: state.puzzles.map((/** @type {any} */ p) => Math.round(p.rating?.score ?? -1)), heading: expected.heading, setSeed: state.setSeed };

  // Print with the solution sheet: the code stays on the first sheet, the solution keeps its own header.
  stubClipboard('ok');
  const print = await openPrint(g.q('[data-action="print-puzzle"]'));
  assert(print.state() === 'ready', 'the Generator dialog is ready');
  const solution = /** @type {HTMLInputElement | null} */ (print.dialog.querySelector('[data-field="print-solution"]'));
  assert(solution !== null && !solution.disabled, 'the Generator offers the solution sheet');
  solution.click();
  const done = print.confirm();
  const sheets = await readSheets(done.pages);
  equal(sheets.heading, untitled(3), 'the printed heading is the name of the card of the selected puzzle');
  assert(sheets.heading !== expected.heading, 'not the title that the code carries');
  equal(sheets.details.length, 1, 'the level and score only');
  assert(/: score \d+/.test(sheets.details[0]), `the level and score stay (${sheets.details[0]})`);
  assert(!sheets.pageText.includes(state.setSeed), 'the set seed is not printed');
  const seeds = state.puzzles.map((/** @type {any} */ p) => String(p.seed ?? '')).filter((/** @type {string} */ s) => s.length >= 4);
  assert(!seeds.some((/** @type {string} */ s) => sheets.pageText.includes(s)), 'no puzzle seed is printed');
  const F = sheets.F;
  assert(F.includes('.'), 'the stored answer is in the code');
  const solutionPage = done.pages.find((page) => /Solution/.test(page.textContent ?? ''));
  assert(solutionPage !== undefined, 'a solution sheet was printed');
  stage.append(/** @type {Element} */ (solutionPage));
  assert(rectOf(/** @type {Element} */ (solutionPage.querySelector('.pm-print-board'))).y <= 40.6, 'the solution sheet keeps its own 40 mm top');
  assert(solutionPage.querySelector('g.pm-print-qr') === null, 'and no QR');
  solutionPage.remove();
  equal(done.pages.filter((page) => page.querySelector('g.pm-print-qr') !== null).length, 1, 'the QR is on one sheet');
  checkFirstSheet(done.pages[0], 'Generator first sheet', { qr: true });
  await showSheet('generator-first-sheet', done.pages[0]);

  assert(g.root.querySelector('[data-action="share"], dialog.pm-share-dialog') === null, 'the Generator has no Share control');

  // The printed code reaches fresh Players: the same address as the QR, and they re-create the puzzle.
  const out = await printCopyOpen('Generator puzzle 3 of 5', { print: () => g.q('[data-action="print-puzzle"]'), solutionOption: true }, expected);
  equal(out.F, F, 'the same code whether or not the solution sheet was chosen');
  const opened = await freshOpen('Generator puzzle 3 of 5, core only', out.C, { ...expected, solution: null });
  const neighbours = state.puzzles.filter((/** @type {any} */ p) => p.id !== puzzle.id).map((/** @type {any} */ p) => sourceView({ rows: boardToRows(state.set.board), pieces: state.set.pieces, puzzle: p, index: 0, rotation: state.rotation }).clues);
  assert(!neighbours.some((clues) => JSON.stringify(clues) === JSON.stringify(openedView(opened.m).clues)), 'no neighbour has the opened clues');
});

// ---- progress, Replay and failed loads on one browser profile's storage ------------------------------------------------------------

await check('BA10 BA11 BA12 BA13 BA14: a printed core restores saved moves silently, Replay restarts as printed, nothing in F, and every failed entry leaves the game as it was', async () => {
  const adapter = memoryAdapter();
  const core = G1.code.slice(0, G1.code.indexOf('.'));
  const expected = sourceView({ rows: sampleRows, pieces: samplePieces, puzzle: sample.puzzles[0], index: 0, rotation: 0 });
  const coreOnly = { ...expected, solution: null };
  const key = `pentomino:v1:progress:${expected.fingerprint}`;

  const a = await mount({ adapter, hash: `#p=${core}` });
  assertSameView(openedView(a), coreOnly, 'opened by the address of the printed core');
  assert(!adapter.map.has(key), 'nothing is saved before a move');
  const first = placeAnyPiece(a);
  assert(adapter.map.has(key), 'the move is saved under the progress fingerprint of the printed puzzle');
  const stored = JSON.parse(/** @type {string} */ (adapter.map.get(key)));
  const g0 = /** @type {any} */ (a.player.store.getState().game);
  a.player.store.update({ game: { ...g0, elapsedMs: g0.elapsedMs + 61000 } });
  const printed = await openPrint(a.q('[data-action="print"]'));
  assert(printed.state() === 'ready', 'ready');
  equal(typedCode(printed.confirm().pages), core, 'a move and the elapsed time are not in the code: F is the printed core');
  a.player.destroy();

  const b = await mount({ adapter });
  await enterCode(b, core);
  assert(!isOpen(b), 'the core was accepted');
  assertSameView(openedView(b), coreOnly, 'the core opens the same puzzle');
  assert(!b.visible('.status-notice'), 'the restoration is silent');
  equal(b.q('[data-host="live"]').textContent, '', 'and nothing is announced');
  equal(b.qa('.tray-piece').length, samplePieces.length - sample.puzzles[0].clues.length - 1, 'the saved move came back');
  equal(b.qa('.tray-piece').some((node) => node.dataset.pieceId === first), false, 'the piece that was placed is not in the tray');
  b.player.destroy();

  const c = await mount({ adapter });
  await enterCode(c, G1.code);
  assert(!isOpen(c), 'the full code was accepted');
  assertSameView(openedView(c), expected, 'the full code opens the same puzzle with its answer');
  equal(JSON.parse(/** @type {string} */ (adapter.map.get(key))).placed ?? stored.placed, stored.placed ?? JSON.parse(/** @type {string} */ (adapter.map.get(key))).placed, 'the same saved progress record');
  assert(!c.visible('.status-notice'), 'the full code restores it silently too');
  equal(openedView(c).fingerprint, expected.fingerprint, 'the same progress fingerprint from the full code');

  // Failed entries change nothing.
  const frozen = gameSnapshot(c);
  const urlsBefore = [...c.urls];
  equal(urlsBefore, [`#p=${G1.code}`], 'the successful entry committed its address');
  /** @param {string} text */
  const refused = async (text) => {
    await enterCode(c, text);
    assert(isOpen(c), `the entry stays open for ${text.slice(0, 30)}…`);
    const problem = problemOf(c);
    assert(problem !== null, 'a problem is shown');
    equal(gameSnapshot(c), frozen, `the game is untouched by ${text.slice(0, 30)}…`);
    equal(fieldOf(c).value, text, 'the typed text is kept');
    return /** @type {NonNullable<ReturnType<typeof problemOf>>} */ (problem);
  };
  const typo = G1.code.slice(0, 5) + (G1.code[5] === '0' ? '1' : '0') + G1.code.slice(6);
  const one = await refused(typo);
  equal(one.error, 'The code has a typing error. Check it against the printout.', 'one wrong symbol is a typing error');
  equal(one.candidate, `Possible correction: in group 2, character 2 may be "${G1.code[5]}" instead of "${typo[5]}". Compare with the printout.`, 'with a candidate by group and position');
  assert(one.useCorrection && !one.openCore, 'one explicit action');
  equal(problemOf(c)?.error === one.error, true, 'still there');
  const two = await refused(typo.slice(0, 9) + (typo[9] === '0' ? '1' : '0') + typo.slice(10));
  equal([two.candidate, two.useCorrection], [null, false], 'two wrong symbols offer no guess');
  const url = `https://example.test/pentomino/player/#p=${G1.code}`;
  equal((await refused(`${url}&i=1`)).error, 'The puzzle number "&i=…" in the link does not name one of its puzzles; fix or remove it.', 'a puzzle number is refused');
  equal((await refused(`${url}&p=${core}`)).error, 'This code does not describe a valid puzzle.', 'a repeated key is refused');
  equal((await refused(`${url}&lib=0123456789abcdef`)).error, 'This code does not describe a valid puzzle.', 'a mixed link is refused');
  const damaged = G1.code.slice(0, -1) + (G1.code.at(-1) === '0' ? '1' : '0');
  const tail = await refused(damaged);
  equal(tail.error, 'The optional solution part has a typing error.', 'a damaged tail is named');
  assert(tail.openCore, 'and the core is offered, not opened');
  equal(c.urls, urlsBefore, 'no address was committed by any failure');
  // Confirming the candidate is the only way a typo opens, and it opens the right puzzle.
  fieldOf(c).value = typo;
  fieldOf(c).dispatchEvent(new Event('input', { bubbles: true }));
  c.q('dialog.pm-code [data-action="code-open"]').click();
  await waitFor(() => problemOf(c)?.useCorrection === true, 'the candidate');
  c.q('dialog.pm-code [data-action="use-correction"]').click();
  await waitFor(() => !isOpen(c), 'the confirmed correction to open');
  assertSameView(openedView(c), expected, 'the confirmed candidate is the printed puzzle');
  equal(c.urls, [`#p=${G1.code}`], 'only now the address is committed');

  // Replay starts as printed and forgets the saved moves.
  c.q('[data-action="replay"]').click();
  await waitFor(() => c.root.querySelector('.pm-replay[open]') !== null, 'the Replay confirmation');
  c.q('.pm-replay [data-action="confirm-ok"]').click();
  await waitFor(() => c.qa('.tray-piece').length === samplePieces.length - sample.puzzles[0].clues.length, 'the tray to be full again');
  assertSameView(openedView(c), expected, 'Replay shows the printed clues, not a substituted seed');
  assert(c.q('.status-notice').hidden || c.q('.status-notice').getClientRects().length === 0, 'the notice is gone');
  assert(!adapter.map.has(key), 'the saved progress of the puzzle is erased');
});

// ---- cancellation and stale answers ------------------------------------------------------------------------------------------

/** A factory of puzzle-code clients whose answers the test releases by hand (the real worker answers afterwards). */
function gatedFactory() {
  const log = { armed: true, encodes: /** @type {Array<ReturnType<typeof deferred>>} */ ([]), decodes: /** @type {Array<{ text: string, gate: ReturnType<typeof deferred> }>} */ ([]), cancels: 0, disposed: 0 };
  return {
    log,
    factory: () => {
      const inner = createPuzzleCodeClient();
      return {
        encode(/** @type {any} */ data) {
          if (!log.armed) {
            return inner.encode(data);
          }
          const gate = deferred();
          log.encodes.push(gate);
          return gate.promise.then(() => inner.encode(data));
        },
        decode(/** @type {string} */ text) {
          if (!log.armed) {
            return inner.decode(text);
          }
          const gate = deferred();
          log.decodes.push({ text, gate });
          return gate.promise.then(() => inner.decode(text));
        },
        repair: (/** @type {string} */ text) => inner.repair(text),
        cancel() {
          log.cancels += 1;
          inner.cancel();
        },
        dispose() {
          log.disposed += 1;
          inner.dispose();
        },
      };
    },
  };
}

await check('BA15: a delayed answer for puzzle A cannot print, copy or open anything once puzzle B is selected or the entry was cancelled', async () => {
  const { log, factory } = gatedFactory();
  log.armed = false;
  const m = await mount({ hash: await packHash(sample, 0), factory });
  log.armed = true;
  // Print: A is being prepared when B is chosen instead in the dialog's list of puzzles.
  m.q('[data-action="print"]').click();
  const dialog = /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-print-dialog[open]'));
  const state = () => dialog.querySelector('[data-role="print-code"]')?.getAttribute('data-state');
  const confirm = /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="print-confirm"]'));
  await waitFor(() => log.encodes.length === 1, 'the preparation of puzzle A');
  equal([state(), confirm.disabled], ['preparing', true], 'A is being prepared; Print waits');
  const choice = (/** @type {string} */ id) => /** @type {HTMLInputElement} */ (dialog.querySelector(`li[data-puzzle="${id}"] input`));
  choice('0').click();
  choice('1').click();
  await waitFor(() => log.encodes.length === 2, 'a new preparation for puzzle B');
  log.encodes[0].resolve(undefined);
  await pause(400);
  equal([state(), confirm.disabled], ['preparing', true], "A's late answer was ignored: still preparing B");
  log.encodes[1].resolve(undefined);
  await waitFor(() => state() === 'ready', 'B to be ready');
  const done = Object.assign({}, await (async () => {
    /** @type {Element[]} */
    let pages = [];
    const real = window.print;
    window.print = () => {
      pages = [...document.querySelectorAll('.pm-print-root .pm-print-page')].map((page) => /** @type {Element} */ (page.cloneNode(true)));
    };
    confirm.click();
    window.print = real;
    window.dispatchEvent(new Event('afterprint'));
    return { pages };
  })());
  equal(typedCode(done.pages), G2.code, "only B's code was printed");
  equal(done.pages[0].querySelector('text.pm-print-sheet-title')?.textContent, printedName('Normal #2'), "with B's heading");

  // Share: the link of B is being prepared when A is selected again.
  await m.player.controller.goToPuzzle(1);
  const writes = stubClipboard('ok');
  const shareButton = m.q('[data-action="share"]');
  shareButton.focus();
  shareButton.click();
  const share = /** @type {HTMLDialogElement} */ (m.q('dialog.pm-share-dialog'));
  const shareState = () => share.querySelector('[data-role="share-body"]')?.getAttribute('data-state');
  const field = /** @type {HTMLTextAreaElement} */ (share.querySelector('textarea.pm-share-field'));
  const copy = /** @type {HTMLButtonElement} */ (share.querySelector('[data-action="share-copy"]'));
  await waitFor(() => log.encodes.length === 3, 'the link of puzzle B');
  m.player.controller.goToPuzzle(0);
  await waitFor(() => log.encodes.length === 4, 'a new link for puzzle A');
  log.encodes[2].resolve(undefined);
  await pause(500);
  equal([shareState(), field.value, copy.disabled, writes], ['preparing', '', true, []], "B's late link was neither shown nor offered to copy");
  log.encodes[3].resolve(undefined);
  await waitFor(() => shareState() === 'ready', 'the link of A');
  equal(field.value, `${OWN}#p=${G1.code}`, 'the dialog shows the link of the selected puzzle A');
  copy.click();
  await waitFor(() => writes.length === 1, 'the copy');
  equal(writes, [`${OWN}#p=${G1.code}`], 'only the link of the selected puzzle A was written');
  share.close();

  // Entry: cancelled while the worker is still decoding.
  const gated = gatedFactory();
  const e = await mount({ factory: gated.factory });
  await enterCode(e, G3.code, { wait: false });
  await waitFor(() => gated.log.decodes.length === 1, 'the decoding to start');
  e.q('dialog.pm-code [data-action="code-cancel"]').click();
  await waitFor(() => !isOpen(e), 'the entry to close');
  gated.log.decodes[0].gate.resolve(undefined);
  await pause(500);
  equal([e.root.dataset.screen, e.urls, isOpen(e), e.q('.puzzle-title').textContent ?? ''], ['start', [], false, ''], 'the late decoding opened nothing, wrote no address and reopened nothing');
  assert(gated.log.cancels >= 1, 'the cancelled request was cancelled in the worker client');
});

// ---- the clipboard, headings, regression and capability --------------------------------------------------------------------------

await check('BA23: a refused clipboard in the Player\'s Share dialog shows the exact link in a read-only, selected field, restores focus, and never says copied — English and Vietnamese', async () => {
  const writes = stubClipboard('deny');
  const m = await mount({ hash: await packHash(sample, 1) });
  const share = await openShare(m);
  assert(document.activeElement === share.copyButton, 'the dialog opens on Copy link');
  equal(await share.copy(), 'failed', 'the copy failed');
  const { dialog, field } = share;
  equal([dialog.open, writes], [true, []], 'the dialog stays open and nothing was copied');
  equal(field.value, `${OWN}#p=${G2.code}`, 'the exact link of the selected puzzle');
  assert(field.readOnly && field.selectionStart === 0 && field.selectionEnd === field.value.length && document.activeElement === field, 'read-only, selected and focused');
  equal(dialog.querySelector(`label[for="${field.id}"]`)?.textContent, 'Link', 'with its label');
  equal(share.notes(), ['Could not copy the link. Select and copy it manually.'], 'the failure is said');
  assert(!/copied/i.test(`${dialog.textContent} ${toasts().join(' ')}`.replace('Could not copy', '')) && share.copyButton.dataset.copied === 'false', 'and never "copied"');
  await share.close();
  playerI18n.setLocale('vi', document);
  const vi = await openShare(m);
  equal(await vi.copy(), 'failed', 'the Vietnamese copy failed');
  equal(vi.dialog.querySelector(`label[for="${vi.field.id}"]`)?.textContent, 'Liên kết', 'Vietnamese label');
  equal(vi.notes(), ['Không sao chép được liên kết. Hãy chọn và sao chép thủ công.'], 'Vietnamese failure text');
  equal(vi.field.value, `${OWN}#p=${G2.code}`, 'the same link');
});

await check('BA22: the real clipboard — the Share dialog says copied exactly when the browser took the link, and otherwise selects the link for a manual copy', async () => {
  const m = await mount({ hash: await packHash(sample, 1) });
  const clipboard = navigator.clipboard;
  const nativeWrite = clipboard?.writeText?.bind(clipboard);
  /** @type {string[]} */
  const accepted = [];
  let legacyCopies = 0;
  if (nativeWrite !== undefined) {
    Object.defineProperty(clipboard, 'writeText', {
      configurable: true,
      value: async (/** @type {string} */ text) => {
        await nativeWrite(text);
        accepted.push(text);
      },
    });
  }
  const nativeExec = document.execCommand.bind(document);
  /** @type {any} */ (document).execCommand = (/** @type {string} */ command, /** @type {boolean | undefined} */ ui, /** @type {string | undefined} */ value) => {
    const done = nativeExec(command, ui, value);
    legacyCopies += command === 'copy' && done ? 1 : 0;
    return done;
  };
  try {
    const share = await openShare(m);
    const outcome = await share.copy();
    const took = accepted.length === 1 || legacyCopies > 0;
    equal(outcome, took ? 'copied' : 'failed', 'the dialog says what the browser did');
    assert(accepted.every((text) => text === `${OWN}#p=${G2.code}`), 'what the browser took is the link');
    if (!took) {
      assert(document.activeElement === share.field && share.field.selectionEnd - share.field.selectionStart === share.field.value.length, 'the link is selected for a manual copy');
    }
    evidence.realClipboard = { outcome, nativeWrites: accepted.length, legacyCopies, hasFocus: document.hasFocus() };
  } finally {
    delete (/** @type {any} */ (document)).execCommand;
    if (nativeWrite !== undefined) {
      delete (/** @type {any} */ (clipboard)).writeText;
    }
  }
});

await check('BA26: an untitled puzzle at a later position keeps "Puzzle #n" / "Đề #n" on paper, in the code and in the re-created puzzle', async () => {
  const bare = { ...sample, puzzles: sample.puzzles.map((/** @type {any} */ p) => {
    const { title: _title, ...rest } = p;
    return rest;
  }) };
  for (const [lang, heading] of /** @type {const} */ ([['en', 'Puzzle #3'], ['vi', 'Đề #3']])) {
    playerI18n.setLocale(lang, document);
    const untitled = (/** @type {number} */ n) => (lang === 'vi' ? `Đề #${n}` : `Puzzle #${n}`);
    // The list address is made in the reader's language, as the Player's Share makes it.
    const m = await mount({ hash: await packHash(bare, 2, untitled) });
    equal(m.q('.puzzle-title').textContent, heading, `${lang}: the heading in the Player`);
    const print = await openPrint(m.q('[data-action="print"]'));
    assert(print.state() === 'ready', 'ready');
    const done = print.confirm();
    const sheets = await readSheets(done.pages);
    equal(sheets.heading, heading, `${lang}: the printed heading`);
    const expected = sourceView({ rows: sampleRows, pieces: samplePieces, puzzle: bare.puzzles[2], index: 2, rotation: 0, untitled });
    equal(expected.heading, heading, `${lang}: the expected heading`);
    const fresh = await freshOpen(`${lang} untitled puzzle 3 of 3`, sheets.F, expected);
    equal(fresh.m.q('.puzzle-title').textContent, heading, `${lang}: the re-created puzzle shows the printed heading`);
  }
  // A code carries the heading of a later puzzle as it was when the code was made; the first puzzle carries no title.
  const english = await mount({ hash: await packHash(bare, 2) });
  equal(english.q('.puzzle-title').textContent, 'Puzzle #3', 'a link made in English keeps its heading in Vietnamese');
  english.player.controller.goToPuzzle(0);
  await waitFor(() => english.q('.puzzle-title').textContent === 'Đề #1', 'the untitled first puzzle to take the reader\'s label');
});

await check('BA28: #pack and #lib are not addresses any more, and the sample opens without the puzzle-code service', async () => {
  const spy = clientSpy();
  for (const hash of ['#pack=2z.abc', '#lib=0123456789abcdef&i=0']) {
    const old = await mount({ hash, factory: spy.factory });
    assert(old.root.dataset.screen === 'start', `${hash} opens nothing`);
  }
  const c = await mount({ factory: spy.factory });
  equal([/** @type {HTMLButtonElement} */ (c.q('[data-action="share"]')).disabled, /** @type {HTMLButtonElement} */ (c.q('[data-action="print"]')).disabled], [true, true], 'with no puzzle open, Share and Print are disabled');
  c.q('.start-actions [data-action="sample"]').click();
  await waitFor(() => c.root.dataset.screen === 'game', 'the sample to open');
  equal(c.qa('.puzzle-card').length, 3, 'the sample: its three puzzles');
  equal([spy.decodes], [0], 'no code was decoded for the old addresses or the file');
});

await check('BA29: without module workers the Player says so honestly — nothing is decoded, printed or shared on the main thread', async () => {
  const sizes = catalogueStats.sizesBuilt;
  const writes = stubClipboard('ok');
  // The sample opens with no puzzle code, so no worker was needed before the browser loses them.
  const m = await mount();
  m.q('.start-actions [data-action="sample"]').click();
  await waitFor(() => m.root.dataset.screen === 'game', 'the sample to open');
  globalThis.Worker = /** @type {any} */ (undefined);
  const spawned = workers.spawned;
  await enterCode(m, G2.code);
  assert(isOpen(m), 'the entry stays open');
  equal(problemOf(m)?.error, 'This browser cannot open puzzle codes because module workers are unavailable. Use a current browser.', 'the capability failure is named');
  equal(m.q('.puzzle-title').textContent, 'Easy #1', 'the open game is untouched');
  m.q('dialog.pm-code [data-action="code-cancel"]').click();
  let printed = 0;
  const real = window.print;
  window.print = () => {
    printed += 1;
  };
  const print = await openPrint(m.q('[data-action="print"]'));
  equal(print.state(), 'error', 'the Print dialog reports a failed preparation');
  equal(print.dialog.querySelector('[data-role="print-code-status"]')?.textContent, 'The puzzle code could not be prepared.', 'in words');
  assert(/** @type {HTMLButtonElement} */ (print.dialog.querySelector('[data-action="print-confirm"]')).disabled, 'Print is not offered without a code');
  assert(print.dialog.querySelector('[data-action="print-retry"]')?.getClientRects().length !== 0, 'Try again is offered');
  /** @type {HTMLButtonElement} */ (print.dialog.querySelector('[data-action="print-confirm"]')).click();
  window.print = real;
  equal(printed, 0, 'nothing was printed');
  print.cancel();
  const share = await openShare(m);
  equal([share.state(), share.notes(), share.field.value, share.copyButton.disabled], ['error', ['The link could not be prepared.'], '', true], 'the Share dialog says so and offers nothing to copy');
  assert(share.dialog.querySelector('[data-action="share-retry"]')?.getClientRects().length !== 0, 'Try again is offered');
  share.copyButton.click();
  await pause(100);
  equal(writes, [], 'nothing was copied');
  await share.close();
  equal([catalogueStats.sizesBuilt, workers.spawned], [sizes, spawned], 'no catalogue on the page and no worker started');
});

// ---- themes, languages, phone width ---------------------------------------------------------------------------------------------

/** @param {string} css @returns {[number, number, number, number]} */
function parseColor(css) {
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(css);
  if (srgb !== null) {
    return [Number.parseFloat(srgb[1]) * 255, Number.parseFloat(srgb[2]) * 255, Number.parseFloat(srgb[3]) * 255, srgb[4] === undefined ? 1 : Number.parseFloat(srgb[4])];
  }
  const nums = css.match(/-?[\d.]+%?/g) ?? [];
  if (!/^rgba?\(/.test(css) || nums.length < 3) {
    throw new Error(`unreadable colour ${css}`);
  }
  const alpha = nums[3] === undefined ? 1 : nums[3].endsWith('%') ? Number.parseFloat(nums[3]) / 100 : Number.parseFloat(nums[3]);
  return [Number.parseFloat(nums[0]), Number.parseFloat(nums[1]), Number.parseFloat(nums[2]), alpha];
}

/** @param {Element} node @returns {[number, number, number]} The colour behind a node. */
function backdropOf(node) {
  /** @type {Array<[number, number, number, number]>} */
  const layers = [];
  for (let at = /** @type {Element | null} */ (node); at !== null; at = at.parentElement) {
    const color = parseColor(getComputedStyle(at).backgroundColor);
    if (color[3] > 0) {
      layers.push(color);
    }
    if (color[3] === 1) {
      break;
    }
  }
  let [r, g, b] = [255, 255, 255];
  for (const [lr, lg, lb, la] of layers.reverse()) {
    [r, g, b] = [lr * la + r * (1 - la), lg * la + g * (1 - la), lb * la + b * (1 - la)];
  }
  return [r, g, b];
}

/** @param {number[]} rgb */
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Text nodes of a dialog that read below 4.5:1 against what is behind them.
 * @param {Element} dialog
 * @returns {{ low: string[], measured: number }}
 */
function contrastOf(dialog) {
  /** @type {string[]} */
  const low = [];
  let measured = 0;
  for (const node of dialog.querySelectorAll('h2, label, p, small, strong, span, li, td, th, legend, textarea, button')) {
    if (node.closest('[hidden]') !== null || node.getClientRects().length === 0 || (node.textContent ?? '').trim() === '' && node.tagName !== 'TEXTAREA') {
      continue;
    }
    if (node.tagName === 'SPAN' && node.children.length > 0) {
      continue;
    }
    const text = parseColor(getComputedStyle(node).color);
    const back = backdropOf(node);
    const [hi, lo] = [luminance([text[0], text[1], text[2]]), luminance(back)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    measured += 1;
    if (ratio < 4.5 && !(node instanceof HTMLButtonElement && node.disabled)) {
      low.push(`${node.tagName.toLowerCase()}.${String(node.className).split(' ')[0]} "${(node.textContent ?? '').trim().slice(0, 20)}" ${ratio.toFixed(2)}`);
    }
  }
  return { low, measured };
}

/** The texts the user reads, with their values, in each language (the normative wording of the design, not the locale files). */
const TEXTS = {
  en: {
    card: (/** @type {number} */ n) => `Puzzle #${n}`,
    scan: 'Play online',
    entry: 'Enter puzzle code',
    check: 'The code has a typing error. Check it against the printout.',
    candidate: (/** @type {number} */ g, /** @type {number} */ p, /** @type {string} */ e, /** @type {string} */ t) => `Possible correction: in group ${g}, character ${p} may be "${e}" instead of "${t}". Compare with the printout.`,
    share: 'Share',
    shareField: 'Link',
    copyFailed: 'Could not copy the link. Select and copy it manually.',
  },
  vi: {
    card: (/** @type {number} */ n) => `Đề #${n}`,
    scan: 'Chơi trực tuyến',
    entry: 'Nhập mã đề',
    check: 'Mã có lỗi nhập. Hãy đối chiếu với bản in.',
    candidate: (/** @type {number} */ g, /** @type {number} */ p, /** @type {string} */ e, /** @type {string} */ t) => `Có thể sửa: ở nhóm ${g}, ký tự ${p} có thể là "${e}" thay vì "${t}". Hãy so với bản in.`,
    share: 'Chia sẻ',
    shareField: 'Liên kết',
    copyFailed: 'Không sao chép được liên kết. Hãy chọn và sao chép thủ công.',
  },
};

/** No placeholder and no raw text key may reach the user. @param {Element} scope @param {string} label */
function assertNoLeaks(scope, label) {
  const text = scope.textContent ?? '';
  assert(!/\{[a-zA-Z]+\}/.test(text), `${label}: an unfilled placeholder in "${text.slice(0, 120)}"`);
  assert(!/(?:^|\s)(?:print|code|ui)\.[a-zA-Z]/.test(text), `${label}: a raw text key in "${text.slice(0, 120)}"`);
}

/** Scrolls the code section of a Print dialog into the middle of it for a screenshot. @param {HTMLElement} dialog */
async function showCode(dialog) {
  /** @type {HTMLElement} */ (dialog.querySelector('[data-role="print-code"]')).scrollIntoView({ block: 'center' });
  await frame();
}

/** Shows a printed sheet on a grey board for a screenshot and returns it to the stage afterwards. @param {string} name @param {Element} page */
async function showSheet(name, page) {
  if (!shots) {
    return;
  }
  const board = h('div', { class: 'stage-root' });
  Object.assign(board.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', zIndex: '50', background: '#808080', overflow: 'auto' });
  const copy = /** @type {Element} */ (page.cloneNode(true));
  board.append(copy);
  document.body.append(board);
  await shot(name);
  board.remove();
}

/**
 * The QR of a staged sheet is black modules on an opaque white box whatever the surrounding theme does: its computed
 * fills, and nothing from the page's style sheets that inverts, fades or blends it or its sheet.
 * @param {Element} page
 * @param {string} label
 */
function assertQrSurface(page, label) {
  stage.append(page);
  try {
    assertQrInk(/** @type {Element} */ (page.querySelector('g.pm-print-qr')), label);
  } finally {
    page.remove();
  }
}

/**
 * The modules of a QR symbol are black on its opaque white box, and nothing around it fades, filters or blends it.
 * @param {Element} group The element that holds the box (`rect`) and the modules (`path`).
 * @param {string} label
 */
function assertQrInk(group, label) {
  equal(getComputedStyle(/** @type {Element} */ (group.querySelector('rect'))).fill, 'rgb(255, 255, 255)', `${label}: the QR box is opaque white`);
  equal(getComputedStyle(/** @type {Element} */ (group.querySelector('path'))).fill, 'rgb(0, 0, 0)', `${label}: its modules are black`);
  for (let node = /** @type {Element | null} */ (group); node !== null; node = node.parentElement) {
    const style = getComputedStyle(node);
    assert(style.opacity === '1' && (style.filter === 'none') && style.mixBlendMode === 'normal', `${label}: ${node.tagName.toLowerCase()}.${node.getAttribute('class') ?? ''} fades, filters or blends the QR (${style.opacity}, ${style.filter}, ${style.mixBlendMode})`);
  }
}

for (const lang of /** @type {const} */ (['en', 'vi'])) {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    await check(`matrix ${lang} ${theme}: the Print dialog and sheet, the code entry and the Share dialog — their texts with values, 4.5:1 contrast, focus, alerts and a black-on-white QR`, async () => {
      const T = TEXTS[lang];
      document.documentElement.setAttribute('data-theme', theme);
      playerI18n.setLocale(lang, document);
      const m = await mount({ hash: await packHash(sample, 1) });
      equal(document.documentElement.getAttribute('lang'), lang, 'the page language');
      const printButton = m.q('[data-action="print"]');
      const print = await openPrint(printButton);
      equal(print.state(), 'ready', 'the Print dialog is ready');
      assert(print.dialog.querySelector('[data-role="print-target"]') === null && !/localhost|127\.0\.0\.1|github\.io/.test(print.dialog.textContent ?? ''), 'the dialog does not show the address');
      equal(print.target, OWN, 'the QR still leads to this page\'s Player');
      equal(print.noticeTexts(), [], 'no local-page notice');
      assertNoLeaks(print.dialog, 'Print dialog');
      const dialogContrast = contrastOf(print.dialog);
      equal(dialogContrast.low, [], 'low contrast in the Print dialog');
      assert(dialogContrast.measured >= 15, `measured ${dialogContrast.measured} texts in the Print dialog`);
      assert(print.dialog.querySelector('[data-role="print-code"] [role="status"]') !== null, 'the code status is a live status region');
      await showCode(print.dialog);
      await shot(`print-${lang}-${theme}`);
      const done = print.confirm();
      const sheets = await readSheets(done.pages);
      equal(sheets.F, G2.code, 'the code in the QR of the sheet');
      equal(sheets.scan, T.scan, 'the QR caption in the language');
      equal(sheets.heading, T.card(2), 'the heading is the name of the puzzle in the list');
      assert(/: (score|điểm) \d+$/.test(sheets.details[0]), `the rating line is in the language (${sheets.details[0]})`);
      if (lang === 'vi') {
        assert(!sheets.details[0].includes('score'), 'the rating line has no English word');
      }
      assertQrSurface(done.pages[0], `${lang} ${theme}`);
      await showSheet(`sheet-${lang}-${theme}`, done.pages[0]);

      // The code entry with a typo: an alert with the candidate and an explicit action.
      assert(m.root.querySelector('[data-action="enter-code"]') === null, 'the page has no Enter puzzle code button');
      const typo = G2.code.slice(0, 5) + '0' + G2.code.slice(6);
      await enterCode(m, typo);
      const entry = /** @type {HTMLDialogElement} */ (dialogOf(m));
      equal(entry.querySelector('h2')?.textContent, T.entry, 'the entry title');
      const problem = problemOf(m);
      equal([problem?.error, problem?.candidate], [T.check, T.candidate(2, 2, 'H', '0')], 'the typing error and its candidate with their values');
      equal(m.q('.pm-code-problem').getAttribute('role'), 'alert', 'announced as an alert');
      const field = fieldOf(m);
      equal(field.getAttribute('aria-invalid'), 'true', 'the field is marked invalid, not by colour alone');
      assert((field.getAttribute('aria-describedby') ?? '').split(' ').includes(m.q('.pm-code-problem').id), 'the alert describes the field');
      equal(entry.querySelector(`label[for="${field.id}"]`)?.textContent, lang === 'en' ? 'Puzzle code' : 'Mã đề', 'the field has its visible label');
      equal(entry.getAttribute('aria-labelledby') === null ? null : document.getElementById(/** @type {string} */ (entry.getAttribute('aria-labelledby')))?.textContent, T.entry, 'the dialog is named in the language');
      const nameOf = (/** @type {Element} */ node) => (node.getAttribute('aria-label') ?? node.textContent ?? '').trim();
      equal([nameOf(m.q('[data-action="share"]')), nameOf(m.q('[data-action="code-open"]'))], lang === 'en' ? ['Share', 'Open puzzle'] : ['Chia sẻ', 'Mở đề'], 'the Share and Open controls are named in the language');
      assertNoLeaks(entry, 'entry dialog');
      equal(contrastOf(entry).low, [], 'low contrast in the entry');
      await shot(`entry-${lang}-${theme}`);
      entry.requestClose();
      await waitFor(() => !entry.open, 'the entry to close');
      // The opener (the Print dialog's control, gone with it) cannot take the focus back.
      await waitFor(() => document.activeElement === m.q('.puzzle-title'), 'the focus to return to the puzzle title, the fallback of a dialog with no opener', 2000);

      // A refused clipboard in the Share dialog: the field, its label and the failure in the language.
      stubClipboard('deny');
      const share = await openShare(m);
      equal(share.dialog.querySelector('h2')?.textContent, T.share, 'the Share dialog title');
      equal(await share.copy(), 'failed', 'the copy failed');
      equal([share.dialog.querySelector(`label[for="${share.field.id}"]`)?.textContent, share.notes()], [T.shareField, [T.copyFailed]], 'the Share texts');
      equal(share.dialog.querySelector('[data-role="share-notes"]')?.getAttribute('role'), 'status', 'the failure is a status');
      assertNoLeaks(share.dialog, 'Share dialog');
      equal(contrastOf(share.dialog).low, [], 'low contrast in the Share dialog');
      assertQrInk(/** @type {Element} */ (share.dialog.querySelector('.pm-share-qr-svg')), `${lang} ${theme} Share dialog`);
      await shot(`share-${lang}-${theme}`);
      await share.close();
    });
  }
}

// ---- trusted keys (run with ?phase=keys: the runner presses the keys) ----------------------------------------------------------

/** Asks the runner to press a trusted key (a CDP key name, "Shift+" for a shifted one) and waits until it has. @param {string} key */
async function press(key) {
  document.documentElement.dataset.stage = `key-${key}`;
  await waitFor(() => document.documentElement.dataset.stage === `key-${key}-done`, `the runner to press ${key}`, 15000);
  delete document.documentElement.dataset.stage;
}

await check('keys: Tab goes from Share to Print, Enter opens the Share dialog on Copy link, Enter copies (refused: the link is selected), Escape closes it and the focus returns to Share', async () => {
  const writes = stubClipboard('deny');
  const m = await mount({ hash: await packHash(sample, 1) });
  const shareButton = m.q('[data-action="share"]');
  const focused = () => `${document.activeElement?.tagName} ${/** @type {HTMLElement | null} */ (document.activeElement)?.dataset?.action ?? ''}`;
  shareButton.focus();
  await press('Tab');
  assert(document.activeElement === m.q('[data-action="print"]'), `Tab from Share reaches Print (${focused()})`);
  await press('Shift+Tab');
  assert(document.activeElement === shareButton, `Shift+Tab goes back to Share (${focused()})`);
  await press('Enter');
  const dialog = /** @type {HTMLDialogElement} */ (m.q('dialog.pm-share-dialog'));
  const copy = /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="share-copy"]'));
  const field = /** @type {HTMLTextAreaElement} */ (dialog.querySelector('textarea.pm-share-field'));
  await waitFor(() => dialog.open && !copy.disabled, 'Enter to open the Share dialog with its link');
  assert(document.activeElement === copy, `the dialog opens on Copy link (${focused()})`);
  await press('Enter');
  await waitFor(() => document.activeElement === field, 'the refused copy to select the link');
  equal([field.value, field.selectionStart, field.selectionEnd, writes], [`${OWN}#p=${G2.code}`, 0, field.value.length, []], 'the whole link is selected and nothing was copied');
  await press('Escape');
  await waitFor(() => !dialog.open, 'Escape to close the dialog');
  await waitFor(() => document.activeElement === shareButton, 'the focus to return to Share');
});

// ---- the phone width (run with ?phase=narrow in a 390 px touch viewport) ------------------------------------------------------

/**
 * Interactive controls of a scope that are smaller than 44 px in either direction.
 * @param {Element} scope
 */
function smallTargets(scope) {
  /** @type {string[]} */
  const small = [];
  for (const node of scope.querySelectorAll('button, a[href], input[type="checkbox"], input[type="radio"]')) {
    if (node.closest('[hidden]') !== null || node.getClientRects().length === 0) {
      continue;
    }
    const target = node instanceof HTMLInputElement ? (node.closest('label') ?? node) : node;
    const r = target.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) {
      small.push(`${node.tagName.toLowerCase()}[${node.getAttribute('data-action') ?? node.getAttribute('data-field') ?? node.className}] ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }
  return small;
}

/**
 * The dialog sits inside the viewport and nothing in it spills sideways. The size table of the Print dialog (from the
 * earlier print feature, unchanged by the puzzle code) is wider than a phone dialog; it is recorded as a note instead.
 * @param {HTMLElement} dialog
 * @param {string} label
 */
function assertFits(dialog, label) {
  const r = dialog.getBoundingClientRect();
  assert(r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight + 0.5, `${label}: the dialog is inside the viewport (${JSON.stringify([r.left, r.top, r.right, r.bottom].map(Math.round))} in ${innerWidth} x ${innerHeight})`);
  const edge = r.left + dialog.clientLeft + dialog.clientWidth;
  const spilled = [...dialog.querySelectorAll('*')].filter((node) => node.getClientRects().length > 0 && node.getBoundingClientRect().right > edge + 1);
  const own = spilled.filter((node) => node.closest('.pm-print-code-box, .pm-code, .pm-share-dialog') !== null);
  equal(own.slice(0, 6).map((node) => `${node.tagName.toLowerCase()}.${String(node.getAttribute('class') ?? '').split(' ')[0]} right ${Math.round(node.getBoundingClientRect().right)} > ${Math.round(edge)}`), [], `${label}: nothing of the puzzle-code section spills out of the dialog`);
  if (spilled.length > 0) {
    evidence.notes.push({ label: `${label}: pre-existing — the size table (nowrap columns, unchanged by the puzzle code) is wider than the dialog`, dialogClientWidth: dialog.clientWidth, dialogScrollWidth: dialog.scrollWidth, spilled: spilled.slice(0, 8).map((node) => `${node.tagName.toLowerCase()}.${node.getAttribute('class') ?? ''}`) });
  }
}

for (const lang of /** @type {const} */ (['en', 'vi'])) {
  await check(`narrow ${lang}: at 390 px with a coarse pointer the new controls and dialogs fit, with 44 px targets and no sideways scrolling`, async () => {
    const T = TEXTS[lang];
    assert(matchMedia('(pointer: coarse)').matches, 'the phase runs with a coarse pointer');
    assert(innerWidth <= 420, `a phone width (${innerWidth})`);
    playerI18n.setLocale(lang, document);
    const start = await mount();
    assert(start.root.querySelector('[data-action="enter-code"]') === null, 'the start screen has no Enter puzzle code button');
    assert(start.root.scrollWidth <= start.root.clientWidth, `the start screen does not scroll sideways (${start.root.scrollWidth} > ${start.root.clientWidth})`);
    await shot(`narrow-start-${lang}`);
    start.player.destroy();
    start.root.remove();

    const m = await mount({ hash: await packHash(sample, 1) });
    const root = m.root;
    assert(root.scrollWidth <= root.clientWidth, `the game screen does not scroll sideways (${root.scrollWidth} > ${root.clientWidth})`);
    const header = m.q('.app-header');
    const help = header.querySelector('.header-help');
    const helpBox = help?.getBoundingClientRect();
    evidence.notes.push({ label: `narrow ${lang}: pre-existing Help control`, size: helpBox === undefined ? null : `${Math.round(helpBox.width)}x${Math.round(helpBox.height)}` });
    const newControls = ['[data-action="share"]', '[data-action="print"]'].map((selector) => m.q(selector));
    equal(smallTargets(m.q('.step-actions')).filter((entry) => /share|print/.test(entry)), [], 'Share and Print are 44 px targets');
    assert(newControls.every((node) => node.getBoundingClientRect().right <= innerWidth + 0.5), 'every control is inside the viewport');
    evidence.notes.push({ label: `narrow ${lang}: every control under 44 px on the game screen`, controls: [...smallTargets(m.root)] });

    const print = await openPrint(m.q('[data-action="print"]'));
    equal(print.state(), 'ready', 'the Print dialog is ready');
    assertFits(print.dialog, 'Print dialog');
    equal(smallTargets(print.dialog), [], 'targets under 44 px in the Print dialog');
    assert(print.dialog.querySelector('[data-role="print-target"]') === null, 'the dialog shows no address');
    await showCode(print.dialog);
    await shot(`narrow-print-${lang}`);
    print.cancel();

    const typo = G2.code.slice(0, 5) + '0' + G2.code.slice(6);
    await enterCode(m, typo);
    const entry = /** @type {HTMLDialogElement} */ (dialogOf(m));
    assertFits(entry, 'entry dialog');
    equal(smallTargets(entry), [], 'targets under 44 px in the entry');
    assert(Number.parseFloat(getComputedStyle(fieldOf(m)).fontSize) >= 16, 'a 16 px field, so touch browsers do not zoom');
    equal(problemOf(m)?.candidate, T.candidate(2, 2, 'H', '0'), 'the candidate is complete');
    await shot(`narrow-entry-${lang}`);
    entry.requestClose();
    await waitFor(() => !entry.open, 'the entry to close');

    stubClipboard('deny');
    const share = await openShare(m);
    equal(await share.copy(), 'failed', 'the copy failed');
    assertFits(share.dialog, 'Share dialog');
    equal(smallTargets(share.dialog), [], 'targets under 44 px in the Share dialog');
    assert(share.field.scrollWidth <= share.field.clientWidth + 1, 'the link wraps inside its field');
    const shareFont = Number.parseFloat(getComputedStyle(share.field).fontSize);
    evidence.notes.push({ label: `narrow ${lang}: Share field font size (iOS Safari zooms a focused field under 16 px; to confirm on an iPhone)`, px: shareFont });
    await shot(`narrow-share-${lang}`);
    await share.close();
    assert(root.scrollWidth <= root.clientWidth, 'no sideways scrolling after the dialogs');
  });
}

await check('every worker this page started has ended, the page built no catalogue, no CSP violation, no uncaught error, only local requests', async () => {
  assert(catalogueStats.sizesBuilt === 0, 'the page built the catalogue');
  await pause(300);
  equal(workers.spawned - workers.terminated, 0, `workers: spawned ${workers.spawned}, terminated ${workers.terminated}`);
  assert(workers.spawned > 0, 'the real workers were used');
  equal(violations, [], 'security policy violations');
  equal(uncaught, [], 'uncaught errors');
  const foreign = network.filter((url) => new URL(url, document.baseURI).origin !== location.origin);
  equal(foreign, [], 'requests to other origins');
  evidence.workers = { ...workers };
  evidence.requests = network.length;
});

const failed = results.filter((r) => !r.ok);
const list = /** @type {HTMLElement} */ (document.getElementById('results'));
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.ok ? '' : ` - ${r.error}`}`;
  list.append(li);
}
const summary = document.getElementById('summary');
if (summary) {
  summary.textContent = `${results.length - failed.length}/${results.length} passed; workers spawned ${workers.spawned}, terminated ${workers.terminated}`;
}
evidence.results = results.map((r) => ({ name: r.name, ok: r.ok }));
document.documentElement.dataset.summary = JSON.stringify({
  total: results.length,
  spawned: workers.spawned,
  terminated: workers.terminated,
  failed: failed.map((r) => `${r.name}: ${r.error}`.slice(0, 1500)),
});
document.documentElement.dataset.result = failed.length === 0 && results.length > 0 ? 'pass' : 'fail';
