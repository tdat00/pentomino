// @ts-check
// Browser acceptance harness of the printed-puzzle reconstruction. It runs the whole journey on the real applications
// in one page: the real Generator (real engine in module workers) and the real Player, the real puzzle-code worker,
// the real Print dialog and sheets, the real Copy this puzzle link controls and the real code entry. What a printout
// carries (its code read back from the sheet in reading order, its QR rasterised) is used to open the puzzle in a fresh
// Player through the entry dialog, and the opened puzzle is compared value by value with the selected source: board,
// angle, ordered pieces, original clues, pieces to place, stored answer, claims, heading and progress fingerprint.
//
// What the page cannot do is done by the CDP runner: it decodes the rasterised QR codes with the test-only decoder
// (window.__acceptance.rasters), takes the screenshots this page asks for (?shots=1), runs the phone phase
// (?phase=narrow, a 390 px touch viewport) and the real-page journeys in a fresh browser profile. This page never
// claims a physical print or a phone scan.
//
// Writes a pass/fail list into the page, data-summary and data-result on <html>. Developer fixture, not deployed.

import { boardToRows, boardFromRows } from '../../core/engine/board.js';
import { normalizeCells, poseCells } from '../../core/engine/geometry.js';
import { progressFingerprint } from '../../core/engine/keys.js';
import { packBoard, parsePack, validatePack } from '../../core/engine/pack.js';
import { catalogueStats } from '../../core/engine/puzzlecode-v1.js';
import { encodeShareCode } from '../../core/engine/sharecode.js';
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
const PUBLIC = 'https://tdat00.github.io/pentomino/player/';
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
  const isNarrow = name.startsWith('narrow ');
  if ((phase === 'narrow') !== isNarrow && !name.startsWith('every worker')) {
    return;
  }
  if (only !== null && !name.includes(only)) {
    return;
  }
  try {
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
  document.querySelectorAll('dialog.pm-print-dialog, dialog.pm-copy-dialog, dialog.pm-code, .pm-print-root, .stage-root, .toast-host, .gen-root').forEach((node) => node.remove());
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
  return { root, player, adapter, location, urls, pool, q, qa };
}
/** @typedef {Awaited<ReturnType<typeof mount>>} Stage */

/** @param {any} pack @param {number} index */
async function packHash(pack, index) {
  const checked = validatePack(pack);
  assert(checked.ok, `fixture pack is valid: ${JSON.stringify(/** @type {any} */ (checked).issues?.slice(0, 2))}`);
  return `#pack=${await encodeShareCode(/** @type {any} */ (checked).value)}&i=${index}`;
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
    const start = m.root.querySelector('.start-actions [data-action="enter-code"]');
    const button = start !== null && start.getClientRects().length > 0 ? start : m.q('.app-header [data-action="enter-code"]');
    /** @type {HTMLElement} */ (button).click();
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
    target: /opens (.+)$/.exec(dialog.querySelector('[data-role="print-target"]')?.textContent ?? '')?.[1] ?? '',
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
 * What a reader copies from the sheets, in reading order, without the printed spacing.
 * @param {Element[]} pages
 */
const typedCode = (pages) => pages.flatMap((page) => all(page, 'text.pm-print-code')).map((node) => (node.textContent ?? '').replaceAll(' ', '')).join('');

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
 * Everything a printout shows of the code: the text in reading order, the labels and the heading.
 * @param {Element[]} pages
 */
async function readSheets(pages) {
  const first = pages[0];
  const group = first.querySelector('g.pm-print-qr');
  return {
    F: typedCode(pages),
    heading: first.querySelector('text.pm-print-sheet-title')?.textContent ?? '',
    details: all(first, 'text.pm-print-detail').map((node) => node.textContent ?? ''),
    label: first.querySelector('text.pm-print-code-label')?.textContent ?? null,
    tailLabel: first.querySelector('text.pm-print-code-tail-label')?.textContent ?? null,
    scan: first.querySelector('text.pm-print-qr-scan')?.textContent ?? null,
    host: first.querySelector('text.pm-print-qr-host')?.textContent ?? null,
    noCode: first.querySelector('text.pm-print-no-code')?.textContent ?? null,
    qrVersion: group === null ? null : Number(group.getAttribute('data-qr-version')),
    qrEc: group?.getAttribute('data-qr-ec') ?? null,
    pageText: pages.map((page) => page.textContent ?? '').join(' '),
  };
}

// ---- the journey: print, read, scan, open in a fresh Player --------------------------------------------------------------------

/**
 * Prints the open puzzle of `m`, copies its link and compares both with the selected source; then enters the printed
 * core, the printed full code and the copied link into fresh Players (new storage, no source data) through the entry
 * dialog and compares what opens with the source. The QR is kept as pixels for the runner, which decodes it with the
 * test-only decoder and opens its URL in another browser profile.
 * @param {string} name
 * @param {{ print: () => HTMLElement, copy: () => HTMLElement, solutionOption?: boolean }} scope The app's Print and Copy controls.
 * @param {ReturnType<typeof viewOf>} expected The selected puzzle as its source holds it.
 * @param {{ expectedCode?: string, expectedHash?: string, expectedVersion?: number }} [o]
 */
async function printCopyOpen(name, scope, expected, o = {}) {
  const writes = stubClipboard('ok');
  const print = await openPrint(scope.print());
  assert(print.state() === 'ready', `${name}: the Print dialog is ready`);
  assert((print.dialog.querySelector('[data-field="print-solution"]') === null) === (scope.solutionOption !== true), `${name}: only the Generator offers a solution sheet`);
  equal(print.target, PUBLIC, `${name}: a local page prints the public Player's address`);
  equal(print.notices(), ['localTarget'], `${name}: and says so`);
  const done = print.confirm();
  equal(done.printed, 1, `${name}: printed once`);
  const F = typedCode(done.pages);
  // Copy this puzzle link beside it: the same prepared address.
  scope.copy().click();
  await waitFor(() => writes.length === 1, `${name}: Copy link to write`, 20000);
  const url = writes[0];
  equal(url, `${PUBLIC}#p=${F}`, `${name}: the copied link is the printed code at the public Player`);
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
  if (o.expectedHash !== undefined) {
    equal(raster.hash, o.expectedHash, `${name}: the printed symbol is the frozen matrix`);
  }
  if (o.expectedVersion !== undefined) {
    equal(sheets.qrVersion, o.expectedVersion, `${name}: QR version`);
  }
  equal([sheets.qrEc, sheets.scan, sheets.host], ['M', 'Scan to open', 'tdat00.github.io'], `${name}: captions`);
  equal(sheets.label, `Puzzle code (${C.length} characters)`, `${name}: the label counts the core`);
  equal(sheets.tailLabel, T === null ? null : '+ solution, optional', `${name}: the optional tail is labelled`);
  assert(!/seed/i.test(sheets.pageText), `${name}: no puzzle seed on the sheets`);
  equal(sheets.heading, expected.heading, `${name}: the printed heading is the displayed one`);
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
    for (const selector of ['text.pm-print-sheet-title', 'text.pm-print-detail', 'text.pm-print-code-label', 'text.pm-print-code', 'text.pm-print-code-tail-label', 'text.pm-print-code-more', 'text.pm-print-no-code', 'text.pm-print-qr-scan', 'text.pm-print-qr-host']) {
      for (const node of all(page, selector)) {
        boxes.push([`${selector} "${(node.textContent ?? '').slice(0, 12)}"`, glyphBox(node)]);
      }
    }
    const group = page.querySelector('g.pm-print-qr');
    if (expect.qr) {
      assert(group !== null, `${label}: a QR code is on the first sheet`);
      const box = rectOf(/** @type {Element} */ (group));
      const outer = Number(group?.querySelector('rect')?.getAttribute('width'));
      const version = Number(group?.getAttribute('data-qr-version'));
      const side = Math.max(25, (17 + 4 * version + 8) * 0.5);
      assert(Math.abs(box.w - side) < 0.05 && Math.abs(box.h - side) < 0.05, `${label}: QR box ${box.w.toFixed(2)} mm, expected max(25, (N + 8) x 0.5) = ${side} mm for version ${version}`);
      assert(outer === 17 + 4 * version + 8, `${label}: the quiet zone is four modules (outer ${outer})`);
      assert(Math.abs(box.x + box.w - 200) < 0.05 && Math.abs(box.y - 10) < 0.05, `${label}: the QR sits in the corner of the content area`);
      assert(box.w / outer >= 0.5 - 1e-3, `${label}: a module is at least 0.5 mm`);
      boxes.push(['QR box', box]);
      for (const [name, b] of boxes) {
        if (name !== 'QR box' && !name.includes('qr-') && b.y < 10 + side + 10 - 0.05) {
          assert(b.x + b.w <= 200 - side - 6 + 0.35, `${label}: ${name} ends at ${(b.x + b.w).toFixed(1)} mm, inside the QR column (${(200 - side - 6).toFixed(1)})`);
        }
      }
    }
    for (const node of all(page, 'text.pm-print-code')) {
      const length = /** @type {SVGTextContentElement} */ (/** @type {unknown} */ (node)).getComputedTextLength();
      assert(Math.abs(length - Number(node.getAttribute('textLength'))) < 0.35, `${label}: a code line has its fixed width`);
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
  return () => ({
    encode: async () => ({ ok: /** @type {const} */ (true), value: { C, T, F: T === null ? C : `${C}.${T}`, version: /** @type {const} */ (1) }, warnings: [] }),
    decode: async () => ({ ok: /** @type {const} */ (false), issues: [{ code: 'worker-error', path: '$', message: 'not used' }] }),
    repair: async () => ({ ok: /** @type {const} */ (false), issues: [{ code: 'worker-error', path: '$', message: 'not used' }] }),
    cancel() {},
    dispose() {},
  });
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
  const out = await printCopyOpen('sample 2 of 3', { print: () => m.q('[data-action="print"]'), copy: () => m.q('[data-action="copy-puzzle-link"]') }, expected, {
    expectedCode: G2.code, expectedHash: qrHash(G2.name), expectedVersion: 5,
  });
  assert(out.T !== null, 'the stored answer is carried with the core');
  assert(out.F.length < 60, `a code is a puzzle, not a pack (${out.F.length})`);
  assert(!out.F.includes(G1.code.slice(0, 20)) && !out.F.includes(G3.code.slice(0, 20)), 'neither neighbour is in the code');
  assert(spy.encodes >= 2, 'Print and Copy each asked the worker');
  equal(out.sheets.details.length, 2, 'two detail lines: the rating and the set line of the pack');
  assert(/^Normal: score \d+/.test(out.sheets.details[0]), `the level and score stay (${out.sheets.details[0]})`);
  assert(/^Set: /.test(out.sheets.details[1]), `the known set line stays (${out.sheets.details[1]})`);
  await showSheet('player-sheet-source', out.pages[0]);
});

await check('BA09: the view rotated to 45 degrees is the angle that is printed, encoded and re-created', async () => {
  const m = await mount({ hash: await packHash(sample, 0) });
  m.player.controller.rotateView(45);
  await waitFor(() => /** @type {any} */ (m.player.store.getState()).viewRotation === 45, 'the view to turn');
  const expected = sourceView({ rows: sampleRows, pieces: samplePieces, puzzle: sample.puzzles[0], index: 0, rotation: 45 });
  equal(expected.rotation, 45, 'the expected angle is the current view');
  const out = await printCopyOpen('sample 1 of 3 at 45 degrees', { print: () => m.q('[data-action="print"]'), copy: () => m.q('[data-action="copy-puzzle-link"]') }, expected);
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
  const out = await printCopyOpen('24 x 24, 40 pieces, answer', { print: () => m.q('[data-action="print"]'), copy: () => m.q('[data-action="copy-puzzle-link"]') }, expected, {
    expectedCode: oracle.code, expectedHash: qrHash(oracle.name), expectedVersion: 11,
  });
  equal([out.C.length, out.F.length, out.url.length], [oracle.coreLength, oracle.fullLength, 288], 'core, full code and link lengths');
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
      { id: 'c-2', clues, solution },
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
  const out = await printCopyOpen('custom pack', { print: () => m.q('[data-action="print"]'), copy: () => m.q('[data-action="copy-puzzle-link"]') }, expected);
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
  localTarget: 'This page is local; the QR code uses the public Player.',
  devTarget: 'The QR code opens a local address that other devices may not reach.',
  noTail: 'The code is too long for one QR code; the optional solution part is left out.',
  lowEc: 'The QR code uses low error correction because the code is long.',
  none: 'This puzzle is too large for a puzzle code and a QR code; it will be printed without them.',
};

await check('BA20 BA21: the capacity ladder reaches the dialog before printing and the sheet after — tail first, then error correction L, then no code and no QR', async () => {
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
  equal(fits.before.notices, ['localTarget'], 'a code that fits has only the target notice');
  equal([fits.sheets.qrEc, fits.sheets.tailLabel], ['M', '+ solution, optional'], 'and carries its answer at level M');

  // 3,501 symbols would fit at level L, but the tail is dropped first and M is kept.
  const noTail = await run(3000, 500);
  equal(noTail.before.notices, ['noTail', 'localTarget'], 'the notice comes before printing');
  equal(noTail.before.texts[0], NOTICE.noTail, 'in words');
  equal([noTail.sheets.qrEc, noTail.sheets.tailLabel, noTail.sheets.F.includes('.')], ['M', null, false], 'the tail left text and QR, level M kept');
  assert(noTail.sheets.F.length === 3000, 'the whole core is printed');
  checkFirstSheet(noTail.done.pages[0], 'tail dropped', { qr: true });

  const low = await run(3400, 500);
  equal(low.before.notices, ['noTail', 'lowEc', 'localTarget'], 'then level L for the core');
  equal([low.sheets.qrEc, low.sheets.tailLabel, low.sheets.F.length], ['L', null, 3400], 'the core only, at level L');
  assert(low.sheets.qrVersion !== null && low.sheets.qrVersion <= 40, 'a symbol of version 40 at most');

  const none = await run(4300, 0);
  equal(none.before.notices, ['none', 'localTarget'], 'no symbol fits: the notice is shown before printing');
  equal(none.before.texts[0], NOTICE.none, 'in words');
  equal([none.sheets.qrVersion, none.sheets.F, none.sheets.noCode], [null, '', 'This puzzle is too large for a puzzle code.'], 'neither code nor QR on the sheet, which says so');
  checkFirstSheet(none.done.pages[0], 'no code', { qr: false });
  assert(none.done.pages[0].querySelector('text.pm-print-code, text.pm-print-code-label, text.pm-print-qr-scan') === null, 'no code label and no scan caption either');

  // A core that fits the QR but not the first sheet continues on numbered sheets; the backs of a two-sided printout stay blank.
  for (const duplex of [false, true]) {
    const long = await run(3300, 0, duplex);
    equal(long.sheets.F.length, 3300, `${duplex ? 'two sides' : 'one side'}: every symbol is printed, in order`);
    const continued = long.done.pages.filter((page) => page.querySelector('text.pm-print-code-title') !== null);
    assert(continued.length >= 1, 'continuation sheets exist');
    equal(continued.map((page) => page.querySelector('text.pm-print-code-title')?.textContent), continued.map(() => 'Puzzle code (continued)'), 'with their heading');
    equal(long.done.pages.filter((page) => page.querySelector('g.pm-print-qr') !== null).length, 1, 'the QR stays on the first sheet');
    checkFirstSheet(long.done.pages[0], `long core, ${duplex ? 'two sides' : 'one side'}`, { qr: true });
    if (duplex) {
      equal(long.done.pages.length % 2, 0, 'whole leaves');
      for (const [i, page] of long.done.pages.entries()) {
        if (i % 2 === 1 && page.querySelector('text.pm-print-code, g.pm-print-qr') !== null) {
          throw new Error(`the back at ${i} carries code`);
        }
      }
    }
  }
});

await check('BA17 BA18: a local page offers the override, default off, per open dialog and never stored; Copy keeps the public target', async () => {
  const writes = stubClipboard('ok');
  const m = await mount({ hash: await packHash(sample, 2) });
  const storage = () => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]);
  const before = storage();
  const first = await openPrint(m.q('[data-action="print"]'));
  const toggle = /** @type {HTMLInputElement} */ (first.dialog.querySelector('[data-field="print-use-this-page"]'));
  assert(!(/** @type {HTMLElement} */ (toggle.closest('label'))).hidden, 'the override is offered on a local page');
  assert(!toggle.checked, 'and starts off');
  equal(first.target, PUBLIC, 'default: the configured public Player');
  equal(first.noticeTexts(), [NOTICE.localTarget], 'with its warning');
  toggle.click();
  const own = new URL('../player/', document.baseURI).href;
  await waitFor(() => /opens (.+)$/.exec(first.dialog.querySelector('[data-role="print-target"]')?.textContent ?? '')?.[1] === own && first.state() === 'ready', 'the dialog to use this page', 10000);
  equal(first.notices(), ['devTarget'], 'the override says it is a local address');
  equal(first.noticeTexts(), [NOTICE.devTarget], 'in words');
  const done = first.confirm();
  assert(/127\.0\.0\.1/.test(/** @type {string} */ (done.pages[0].querySelector('text.pm-print-qr-host')?.textContent)), 'the sheet names the local host');
  equal(typedCode(done.pages), G3.code, 'the code is the same, only the target changed');
  m.q('[data-action="copy-puzzle-link"]').click();
  await waitFor(() => writes.length === 1, 'Copy link');
  equal(writes[0], `${PUBLIC}#p=${G3.code}`, 'Copy link never uses the dialog-only override');
  const second = await openPrint(m.q('[data-action="print"]'));
  assert(!(/** @type {HTMLInputElement} */ (second.dialog.querySelector('[data-field="print-use-this-page"]'))).checked, 'a new dialog starts with the override off');
  equal(second.target, PUBLIC, 'and the public target');
  second.cancel();
  equal(storage(), before, 'nothing was stored by the dialogs');
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
  equal(sheets.heading, expected.heading, 'the printed heading is the displayed title of the selected puzzle');
  assert(!/^Puzzle #/.test(sheets.heading) || /^Puzzle #/.test(expected.heading), 'not the card heading');
  equal(sheets.details.length, 2, 'level and score, and the set line');
  assert(/: score \d+/.test(sheets.details[0]), `the level and score stay (${sheets.details[0]})`);
  assert(sheets.details[1].startsWith('Set: ') && sheets.details[1].endsWith(state.setSeed), `the set line stays (${sheets.details[1]})`);
  const seeds = state.puzzles.map((/** @type {any} */ p) => String(p.seed ?? '')).filter((/** @type {string} */ s) => s.length >= 4);
  assert(!seeds.some((/** @type {string} */ s) => sheets.pageText.includes(s)), 'no puzzle seed is printed');
  const F = sheets.F;
  assert(F.includes('.'), 'the stored answer is in the code');
  const solutionPage = done.pages.find((page) => /Solution/.test(page.textContent ?? ''));
  assert(solutionPage !== undefined, 'a solution sheet was printed');
  stage.append(/** @type {Element} */ (solutionPage));
  assert(rectOf(/** @type {Element} */ (solutionPage.querySelector('.pm-print-board'))).y <= 40.6, 'the solution sheet keeps its own 40 mm top');
  assert(solutionPage.querySelector('g.pm-print-qr, text.pm-print-code') === null, 'and no phantom code band');
  solutionPage.remove();
  equal(done.pages.filter((page) => page.querySelector('text.pm-print-code') !== null).length, 1, 'the code is on one sheet');
  checkFirstSheet(done.pages[0], 'Generator first sheet', { qr: true });
  await showSheet('generator-first-sheet', done.pages[0]);

  // A refused clipboard: a read-only, selected field with the exact link, and no "copied".
  restoreClipboard();
  stubClipboard('deny');
  const copy = g.q('[data-action="copy-puzzle-link"]');
  copy.focus();
  copy.click();
  await waitFor(() => document.querySelector('dialog.pm-copy-dialog[open]') !== null && copy.getAttribute('aria-busy') === 'false', 'the manual-copy field');
  const field = /** @type {HTMLTextAreaElement} */ (document.querySelector('dialog.pm-copy-dialog[open] textarea.pm-copy-field'));
  equal(field.value, `${PUBLIC}#p=${F}`, 'the field holds the exact link');
  assert(field.readOnly && field.selectionStart === 0 && field.selectionEnd === field.value.length, 'read-only and selected');
  assert(!toasts().some((text) => /copied/i.test(text)) && !/copied/i.test(document.querySelector('dialog.pm-copy-dialog[open]')?.textContent ?? ''), 'it never says the link was copied');
  /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-copy-dialog[open]')).close();
  restoreClipboard();

  // The clipboard works: the same address as the QR, and fresh Players re-create the puzzle.
  const out = await printCopyOpen('Generator puzzle 3 of 5', { print: () => g.q('[data-action="print-puzzle"]'), copy: () => g.q('[data-action="copy-puzzle-link"]'), solutionOption: true }, expected);
  equal(out.F, F, 'the same code whether or not the solution sheet was chosen');
  const opened = await freshOpen('Generator puzzle 3 of 5, core only', out.C, { ...expected, solution: null });
  const neighbours = state.puzzles.filter((/** @type {any} */ p) => p.id !== puzzle.id).map((/** @type {any} */ p) => sourceView({ rows: boardToRows(state.set.board), pieces: state.set.pieces, puzzle: p, index: 0, rotation: state.rotation }).clues);
  assert(!neighbours.some((clues) => JSON.stringify(clues) === JSON.stringify(openedView(opened.m).clues)), 'no neighbour has the opened clues');
});

// ---- progress, Replay and failed loads on one browser profile's storage ------------------------------------------------------------

await check('BA10 BA11 BA12 BA13 BA14: a printed core restores saved moves with a notice, Replay restarts as printed, nothing in F, and every failed entry leaves the game as it was', async () => {
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
  const notice = b.q('.status-notice');
  equal([notice.hidden || notice.getClientRects().length === 0, notice.getAttribute('role'), b.q('.status-notice .status-text').textContent], [false, 'status', 'Saved moves restored; Replay starts as printed.'], 'the restoration is said, as a status');
  await waitFor(() => b.q('[data-host="live"]').textContent === 'Saved moves restored; Replay starts as printed.', 'the live region');
  equal(b.qa('.tray-piece').length, samplePieces.length - sample.puzzles[0].clues.length - 1, 'the saved move came back');
  equal(b.qa('.tray-piece').some((node) => node.dataset.pieceId === first), false, 'the piece that was placed is not in the tray');
  b.player.destroy();

  const c = await mount({ adapter });
  await enterCode(c, G1.code);
  assert(!isOpen(c), 'the full code was accepted');
  assertSameView(openedView(c), expected, 'the full code opens the same puzzle with its answer');
  equal(JSON.parse(/** @type {string} */ (adapter.map.get(key))).placed ?? stored.placed, stored.placed ?? JSON.parse(/** @type {string} */ (adapter.map.get(key))).placed, 'the same saved progress record');
  equal(c.q('.status-notice .status-text').textContent, 'Saved moves restored; Replay starts as printed.', 'the full code restores it too');
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
  equal((await refused(`${url}&i=1`)).error, 'A puzzle code opens one puzzle; remove "&i=…" from the link.', 'a puzzle number is refused');
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
  const log = { encodes: /** @type {Array<ReturnType<typeof deferred>>} */ ([]), decodes: /** @type {Array<{ text: string, gate: ReturnType<typeof deferred> }>} */ ([]), cancels: 0, disposed: 0 };
  return {
    log,
    factory: () => {
      const inner = createPuzzleCodeClient();
      return {
        encode(/** @type {any} */ data) {
          const gate = deferred();
          log.encodes.push(gate);
          return gate.promise.then(() => inner.encode(data));
        },
        decode(/** @type {string} */ text) {
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
  const m = await mount({ hash: await packHash(sample, 0), factory });
  // Print: A is being prepared when B is selected.
  m.q('[data-action="print"]').click();
  const dialog = /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-print-dialog[open]'));
  const state = () => dialog.querySelector('[data-role="print-code"]')?.getAttribute('data-state');
  const confirm = /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="print-confirm"]'));
  await waitFor(() => log.encodes.length === 1, 'the preparation of puzzle A');
  equal([state(), confirm.disabled], ['preparing', true], 'A is being prepared; Print waits');
  m.player.controller.goToPuzzle(1);
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
  equal(done.pages[0].querySelector('text.pm-print-sheet-title')?.textContent, 'Normal #2', "with B's heading");

  // Copy: B is being prepared when A is selected again.
  const writes = stubClipboard('ok');
  const copy = m.q('[data-action="copy-puzzle-link"]');
  copy.click();
  await waitFor(() => log.encodes.length === 3, 'the copy of puzzle B');
  m.player.controller.goToPuzzle(0);
  log.encodes[2].resolve(undefined);
  await pause(500);
  equal([writes, toasts(), copy.getAttribute('aria-busy')], [[], [], 'false'], "B's late link was neither written nor announced");
  copy.click();
  await waitFor(() => log.encodes.length === 4, 'the copy of puzzle A');
  log.encodes[3].resolve(undefined);
  await waitFor(() => writes.length === 1, 'the link of A');
  equal(writes, [`${PUBLIC}#p=${G1.code}`], "only the link of the selected puzzle A was written");

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

await check('BA23: a refused clipboard in the Player shows the exact link in a read-only, selected field, restores focus, and never says copied — English and Vietnamese', async () => {
  stubClipboard('deny');
  const m = await mount({ hash: await packHash(sample, 1) });
  const button = m.q('[data-action="copy-puzzle-link"]');
  button.focus();
  button.click();
  await waitFor(() => document.querySelector('dialog.pm-copy-dialog[open]') !== null && button.getAttribute('aria-busy') === 'false', 'the manual-copy field');
  const dialog = /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-copy-dialog[open]'));
  const field = /** @type {HTMLTextAreaElement} */ (dialog.querySelector('textarea.pm-copy-field'));
  equal(field.value, `${PUBLIC}#p=${G2.code}`, 'the exact link of the selected puzzle');
  assert(field.readOnly && field.selectionStart === 0 && field.selectionEnd === field.value.length && document.activeElement === field, 'read-only, selected and focused');
  equal(dialog.querySelector('label')?.textContent, 'Puzzle link', 'with its label');
  equal(dialog.querySelector('[data-role="copy-notes"]')?.textContent, 'Could not copy the link. Select and copy it manually.', 'the failure is said');
  assert(!/copied/i.test(`${dialog.textContent} ${toasts().join(' ')}`.replace('Could not copy', '')), 'and never "copied"');
  dialog.requestClose();
  await waitFor(() => !dialog.open && document.activeElement === button, 'the focus to return to the Copy control');
  playerI18n.setLocale('vi', document);
  button.click();
  await waitFor(() => document.querySelector('dialog.pm-copy-dialog[open]') !== null && button.getAttribute('aria-busy') === 'false', 'the Vietnamese field');
  const vi = /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-copy-dialog[open]'));
  equal(vi.querySelector('label')?.textContent, 'Liên kết đề', 'Vietnamese label');
  equal(vi.querySelector('[data-role="copy-notes"]')?.textContent, 'Không sao chép được liên kết. Hãy chọn và sao chép thủ công.', 'Vietnamese failure text');
  equal(/** @type {HTMLTextAreaElement} */ (vi.querySelector('textarea')).value, `${PUBLIC}#p=${G2.code}`, 'the same link');
});

await check('BA26: an untitled puzzle at a later position keeps "Puzzle #n" / "Đề #n" on paper, in the code and in the re-created puzzle', async () => {
  const bare = { ...sample, puzzles: sample.puzzles.map((/** @type {any} */ p) => {
    const { title: _title, ...rest } = p;
    return rest;
  }) };
  for (const [lang, heading, label] of /** @type {const} */ ([['en', 'Puzzle #3', 'Puzzle code'], ['vi', 'Đề #3', 'Mã đề']])) {
    playerI18n.setLocale(lang, document);
    const m = await mount({ hash: await packHash(bare, 2) });
    equal(m.q('.puzzle-title').textContent, heading, `${lang}: the heading in the Player`);
    const print = await openPrint(m.q('[data-action="print"]'));
    assert(print.state() === 'ready', 'ready');
    const done = print.confirm();
    const sheets = await readSheets(done.pages);
    equal(sheets.heading, heading, `${lang}: the printed heading`);
    assert((sheets.label ?? '').startsWith(label), `${lang}: the label is in the language (${sheets.label})`);
    const expected = sourceView({ rows: sampleRows, pieces: samplePieces, puzzle: bare.puzzles[2], index: 2, rotation: 0, untitled: (n) => (lang === 'vi' ? `Đề #${n}` : `Puzzle #${n}`) });
    equal(expected.heading, heading, `${lang}: the expected heading`);
    const fresh = await freshOpen(`${lang} untitled puzzle 3 of 3`, sheets.F, expected);
    equal(fresh.m.q('.puzzle-title').textContent, heading, `${lang}: the re-created puzzle shows the printed heading`);
  }
});

await check('BA28: #pack, #lib and the sample open as before and never create a puzzle-code client', async () => {
  const spy = clientSpy();
  const a = await mount({ hash: await packHash(sample, 2), factory: spy.factory });
  equal([a.q('.puzzle-title').textContent, a.qa('.puzzle-card').length, a.root.dataset.screen], ['Hard #3', 3, 'game'], '#pack: the whole pack at the asked puzzle');
  const adapter = memoryAdapter();
  const saved = createStorage(adapter, () => Date.now()).saveLibraryPack(hand);
  assert(saved.ok, 'a library pack');
  const b = await mount({ adapter, hash: `#lib=${/** @type {any} */ (saved).packId}&i=0`, factory: spy.factory });
  equal([b.q('.puzzle-title').textContent, b.root.dataset.screen], ['Example #1', 'game'], '#lib: the saved pack');
  const c = await mount({ factory: spy.factory });
  c.q('.start-actions [data-action="sample"]').click();
  await waitFor(() => c.root.dataset.screen === 'game', 'the sample to open');
  equal(c.qa('.puzzle-card').length, 3, 'the sample: its three puzzles');
  equal([spy.made, spy.encodes, spy.decodes], [0, 0, 0], 'no puzzle-code client was made or used');
  const bad = await mount({ hash: '#pack=2z.abc', factory: spy.factory });
  assert(bad.root.dataset.screen !== 'game', 'a broken #pack still fails as before');
  equal(spy.made, 0, 'and still without the puzzle-code service');
});

await check('BA29: without module workers the Player says so honestly — nothing is decoded, printed or copied on the main thread', async () => {
  const sizes = catalogueStats.sizesBuilt;
  const spawned = workers.spawned;
  const writes = stubClipboard('ok');
  const m = await mount({ hash: await packHash(sample, 0) });
  globalThis.Worker = /** @type {any} */ (undefined);
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
  m.q('[data-action="copy-puzzle-link"]').click();
  await waitFor(() => toasts().length > 0, 'the Copy failure');
  equal([toasts(), writes], [['The puzzle code could not be prepared.'], []], 'Copy link says so and copies nothing');
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
    target: (/** @type {string} */ url) => `The QR code opens ${url}`,
    localTarget: NOTICE.localTarget,
    label: (/** @type {number} */ n) => `Puzzle code (${n} characters)`,
    tail: '+ solution, optional',
    scan: 'Scan to open',
    entry: 'Enter puzzle code',
    check: 'The code has a typing error. Check it against the printout.',
    candidate: (/** @type {number} */ g, /** @type {number} */ p, /** @type {string} */ e, /** @type {string} */ t) => `Possible correction: in group ${g}, character ${p} may be "${e}" instead of "${t}". Compare with the printout.`,
    copyField: 'Puzzle link',
    copyFailed: 'Could not copy the link. Select and copy it manually.',
  },
  vi: {
    target: (/** @type {string} */ url) => `Mã QR mở ${url}`,
    localTarget: 'Trang này đang chạy cục bộ; mã QR dùng trình chơi công khai.',
    label: (/** @type {number} */ n) => `Mã đề (${n} ký tự)`,
    tail: '+ lời giải, không bắt buộc',
    scan: 'Quét để mở',
    entry: 'Nhập mã đề',
    check: 'Mã có lỗi nhập. Hãy đối chiếu với bản in.',
    candidate: (/** @type {number} */ g, /** @type {number} */ p, /** @type {string} */ e, /** @type {string} */ t) => `Có thể sửa: ở nhóm ${g}, ký tự ${p} có thể là "${e}" thay vì "${t}". Hãy so với bản in.`,
    copyField: 'Liên kết đề',
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
    const group = /** @type {Element} */ (page.querySelector('g.pm-print-qr'));
    equal(getComputedStyle(/** @type {Element} */ (group.querySelector('rect'))).fill, 'rgb(255, 255, 255)', `${label}: the QR box is opaque white`);
    equal(getComputedStyle(/** @type {Element} */ (group.querySelector('path'))).fill, 'rgb(0, 0, 0)', `${label}: its modules are black`);
    for (let node = /** @type {Element | null} */ (group); node !== null; node = node.parentElement) {
      const style = getComputedStyle(node);
      assert(style.opacity === '1' && (style.filter === 'none') && style.mixBlendMode === 'normal', `${label}: ${node.tagName.toLowerCase()}.${node.getAttribute('class') ?? ''} fades, filters or blends the QR (${style.opacity}, ${style.filter}, ${style.mixBlendMode})`);
    }
  } finally {
    page.remove();
  }
}

for (const lang of /** @type {const} */ (['en', 'vi'])) {
  for (const theme of ['light', 'dark', 'high-contrast']) {
    await check(`matrix ${lang} ${theme}: the Print dialog and sheet, the code entry and the manual copy field — their texts with values, 4.5:1 contrast, focus, alerts and a black-on-white QR`, async () => {
      const T = TEXTS[lang];
      document.documentElement.setAttribute('data-theme', theme);
      playerI18n.setLocale(lang, document);
      const m = await mount({ hash: await packHash(sample, 1) });
      equal(document.documentElement.getAttribute('lang'), lang, 'the page language');
      const printButton = m.q('[data-action="print"]');
      const print = await openPrint(printButton);
      equal(print.state(), 'ready', 'the Print dialog is ready');
      equal(print.dialog.querySelector('[data-role="print-target"]')?.textContent, T.target(PUBLIC), 'the target text with its address');
      equal(print.noticeTexts(), [T.localTarget], 'the local-page notice');
      assertNoLeaks(print.dialog, 'Print dialog');
      const dialogContrast = contrastOf(print.dialog);
      equal(dialogContrast.low, [], 'low contrast in the Print dialog');
      assert(dialogContrast.measured >= 15, `measured ${dialogContrast.measured} texts in the Print dialog`);
      assert(print.dialog.querySelector('[data-role="print-code"] [role="status"]') !== null, 'the code status is a live status region');
      await showCode(print.dialog);
      await shot(`print-${lang}-${theme}`);
      const done = print.confirm();
      const sheets = await readSheets(done.pages);
      equal(sheets.F, G2.code, 'the code on the sheet');
      const core = G2.code.slice(0, G2.code.indexOf('.'));
      equal([sheets.label, sheets.tailLabel, sheets.scan, sheets.host], [T.label(core.length), T.tail, T.scan, 'tdat00.github.io'], 'the sheet texts with their values');
      equal(sheets.heading, 'Normal #2', 'the heading');
      assert(/: (score|điểm) \d+$/.test(sheets.details[0]), `the rating line is in the language (${sheets.details[0]})`);
      if (lang === 'vi') {
        assert(!sheets.details[0].includes('score'), 'the rating line has no English word');
      }
      assertQrSurface(done.pages[0], `${lang} ${theme}`);
      await showSheet(`sheet-${lang}-${theme}`, done.pages[0]);

      // The code entry with a typo: an alert with the candidate and an explicit action.
      const headerButton = m.q('.app-header [data-action="enter-code"]');
      headerButton.focus();
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
      equal([headerButton.textContent?.trim(), entry.getAttribute('aria-labelledby') === null ? null : document.getElementById(/** @type {string} */ (entry.getAttribute('aria-labelledby')))?.textContent], [T.entry, T.entry], 'the header action and the dialog are named in the language');
      const nameOf = (/** @type {Element} */ node) => (node.getAttribute('aria-label') ?? node.textContent ?? '').trim();
      equal([nameOf(m.q('[data-action="copy-puzzle-link"]')), nameOf(m.q('[data-action="code-open"]'))], lang === 'en' ? ['Copy this puzzle link', 'Open puzzle'] : ['Sao chép liên kết đề này', 'Mở đề'], 'the Copy and Open controls are named in the language');
      assertNoLeaks(entry, 'entry dialog');
      equal(contrastOf(entry).low, [], 'low contrast in the entry');
      await shot(`entry-${lang}-${theme}`);
      entry.requestClose();
      await waitFor(() => !entry.open, 'the entry to close');
      assert(document.activeElement === headerButton, 'the focus returns to the header action that opened the entry');

      // A refused clipboard: the field, its label and the failure in the language.
      stubClipboard('deny');
      const copy = m.q('[data-action="copy-puzzle-link"]');
      copy.focus();
      copy.click();
      await waitFor(() => document.querySelector('dialog.pm-copy-dialog[open]') !== null && copy.getAttribute('aria-busy') === 'false', 'the manual-copy field');
      const manual = /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-copy-dialog[open]'));
      equal([manual.querySelector('label')?.textContent, manual.querySelector('[data-role="copy-notes"]')?.textContent], [T.copyField, T.copyFailed], 'the manual-copy texts');
      equal(manual.querySelector('[data-role="copy-notes"]')?.getAttribute('role'), 'status', 'the failure is a status');
      equal(contrastOf(manual).low, [], 'low contrast in the manual-copy dialog');
      await shot(`copy-${lang}-${theme}`);
      manual.requestClose();
      await waitFor(() => !manual.open && document.activeElement === copy, 'the focus to return to the Copy control');
    });
  }
}

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
  const own = spilled.filter((node) => node.closest('.pm-print-code-box, .pm-code, .pm-copy-dialog') !== null);
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
    const startAction = start.q('.start-actions [data-action="enter-code"]');
    assert(startAction.getBoundingClientRect().height >= 44 && startAction.getBoundingClientRect().width >= 44, 'the start action is a 44 px target');
    assert(start.root.scrollWidth <= start.root.clientWidth, `the start screen does not scroll sideways (${start.root.scrollWidth} > ${start.root.clientWidth})`);
    await shot(`narrow-start-${lang}`);
    start.player.destroy();
    start.root.remove();

    const m = await mount({ hash: await packHash(sample, 1) });
    const root = m.root;
    assert(root.scrollWidth <= root.clientWidth, `the game screen does not scroll sideways (${root.scrollWidth} > ${root.clientWidth})`);
    const header = m.q('.app-header');
    const help = header.querySelector('.header-help:not(.header-code)');
    const helpBox = help?.getBoundingClientRect();
    evidence.notes.push({ label: `narrow ${lang}: pre-existing Help control`, size: helpBox === undefined ? null : `${Math.round(helpBox.width)}x${Math.round(helpBox.height)}` });
    const newControls = ['.app-header [data-action="enter-code"]', '[data-action="copy-puzzle-link"]', '[data-action="print"]'].map((selector) => m.q(selector));
    equal(smallTargets(m.q('.game-actions')).filter((entry) => /copy-puzzle-link|print/.test(entry)), [], 'Print and Copy this puzzle link are 44 px targets');
    equal(smallTargets(header).filter((entry) => /enter-code/.test(entry)), [], 'the header action is a 44 px target');
    assert(newControls.every((node) => node.getBoundingClientRect().right <= innerWidth + 0.5), 'every control is inside the viewport');
    evidence.notes.push({ label: `narrow ${lang}: every control under 44 px on the game screen`, controls: [...smallTargets(m.root)] });

    const print = await openPrint(m.q('[data-action="print"]'));
    equal(print.state(), 'ready', 'the Print dialog is ready');
    assertFits(print.dialog, 'Print dialog');
    equal(smallTargets(print.dialog), [], 'targets under 44 px in the Print dialog');
    equal(print.dialog.querySelector('[data-role="print-target"]')?.textContent, T.target(PUBLIC), 'the target is readable in full');
    const target = /** @type {HTMLElement} */ (print.dialog.querySelector('[data-role="print-target"]'));
    assert(target.scrollWidth <= target.clientWidth + 1, 'the target address wraps instead of overflowing');
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
    const copy = m.q('[data-action="copy-puzzle-link"]');
    copy.click();
    await waitFor(() => document.querySelector('dialog.pm-copy-dialog[open]') !== null && copy.getAttribute('aria-busy') === 'false', 'the manual-copy field');
    const manual = /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-copy-dialog[open]'));
    assertFits(manual, 'manual-copy dialog');
    equal(smallTargets(manual), [], 'targets under 44 px in the manual-copy dialog');
    const copyFont = Number.parseFloat(getComputedStyle(/** @type {Element} */ (manual.querySelector('textarea'))).fontSize);
    evidence.notes.push({ label: `narrow ${lang}: manual-copy field font size (iOS Safari zooms a focused field under 16 px; to confirm on an iPhone)`, px: copyFont });
    await shot(`narrow-copy-${lang}`);
    manual.requestClose();
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
