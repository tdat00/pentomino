// @ts-check
// Browser regression harness for "Copy this puzzle link" in the Generator and the Player: the real controls, the real
// puzzle-code worker and the real shared preparation, a stubbed clipboard (success, refusal) and the real one where the
// platform allows it, the stale-result guards, the manual-copy field, themes, narrow and coarse-pointer layouts, and
// (with ?phase=keys) trusted keyboard input driven from the CDP runner. It never fabricates a clipboard result: the real
// clipboard case records what the browser did. Writes a pass/fail list into the page, data-summary, data-evidence and
// data-result on <html>. Developer fixture, not deployed.
//
// Phases: (none) all automated cases; ?phase=keys the keyboard cases (the runner presses the keys when it sees
// data-stage); ?phase=narrow the 390 px layout cases (the runner emulates a phone with a touch screen).

import { preparePlayerLink } from '../../core/browser/handoff.js';
import { createPuzzleCodeClient } from '../../core/browser/puzzle-code-client.js';
import { PUBLIC_PLAYER_URL, puzzleSnapshot } from '../../core/browser/puzzle-snapshot.js';
import { puzzleDisplayName } from '../../core/browser/puzzle-title.js';
import { createStorage } from '../../core/browser/storage.js';
import { boardFromRows } from '../../core/engine/board.js';
import { packBoard, validatePack } from '../../core/engine/pack.js';
import { catalogueStats } from '../../core/engine/puzzlecode-v1.js';
import { encodeShareCode } from '../../core/engine/sharecode.js';
import * as generatorI18n from '../../generator/i18n.js';
import { createGeneratorStore, detectHardware } from '../../generator/state.js';
import { mountPuzzlePanel } from '../../generator/ui/puzzle-panel.js';
import { mountPlayer } from '../../player/app.js';
import * as playerI18n from '../../player/i18n.js';

const phase = new URLSearchParams(location.search).get('phase') ?? 'main';
document.documentElement.dataset.result = 'running';
document.documentElement.dataset.phase = phase;

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
const uncaught = /** @type {string[]} */ ([]);
const evidence = /** @type {Record<string, any>} */ ({ phase, player: {}, generator: {} });
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
window.addEventListener('error', (e) => uncaught.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => uncaught.push(String(e.reason)));
const stage = /** @type {HTMLElement} */ (document.getElementById('stage'));
/** @type {Array<{ destroy: () => void }>} */
let toDestroy = [];

/**
 * @param {string} name
 * @param {() => void | Promise<void>} fn
 */
async function check(name, fn) {
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
  document.querySelectorAll('dialog.pm-print-dialog, dialog.pm-copy-dialog, .pm-print-root, .stage-root, .toast-host').forEach((node) => node.remove());
  document.documentElement.classList.remove('pm-printing');
  delete document.documentElement.dataset.theme;
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

const pause = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** @param {number} length */
const symbols = (length) => ALPHABET.repeat(Math.ceil(length / ALPHABET.length)).slice(0, length);

/** @param {string} text */
async function shortHash(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].slice(0, 6).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// ---- styles: the app under test brings its own sheet --------------------------------------------------------------------

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

// ---- clipboard ---------------------------------------------------------------------------------------------------------

/**
 * Replaces the page's clipboard for one case. `ok` takes the text; `deny` rejects it like a refused permission, and the
 * legacy `execCommand` path of the copy helper fails too.
 * @param {'ok' | 'deny'} mode
 */
function stubClipboard(mode) {
  /** @type {string[]} */
  const writes = [];
  const attempts = { count: 0 };
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (/** @type {string} */ text) => {
        attempts.count += 1;
        if (mode === 'deny') {
          throw new DOMException('Write permission denied.', 'NotAllowedError');
        }
        writes.push(text);
      },
    },
  });
  /** @type {any} */ (document).execCommand = () => false;
  return {
    writes,
    attempts,
    restore() {
      delete (/** @type {any} */ (navigator)).clipboard;
      delete (/** @type {any} */ (document)).execCommand;
    },
  };
}

/**
 * @template T
 * @param {'ok' | 'deny'} mode
 * @param {(clip: ReturnType<typeof stubClipboard>) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withClipboard(mode, fn) {
  const clip = stubClipboard(mode);
  try {
    return await fn(clip);
  } finally {
    clip.restore();
  }
}

// ---- fixtures ----------------------------------------------------------------------------------------------------------

const sample = JSON.parse(await (await fetch('../../player/samples/sample-pack.json')).text());
const sampleBoard = packBoard(sample);
const decoder = createPuzzleCodeClient();

/** @param {string} url @returns {Promise<{ pack: any, hasTail: boolean }>} What the link opens, decoded in the worker. */
async function decodeLink(url) {
  const decoded = await decoder.decode(url);
  assert(decoded.ok, `the link decodes: ${JSON.stringify(/** @type {any} */ (decoded).issues)}`);
  return /** @type {any} */ (decoded).value;
}

/** @param {Array<{ piece: string, x: number, y: number, turn: number, mirrored: boolean }>} poses */
const poseList = (poses) => poses.map((p) => [p.piece, p.x, p.y, p.turn, p.mirrored].join(',')).sort();

/** @param {string} url @returns {string} The code in a link. */
const codeOfLink = (url) => url.slice(url.indexOf('#p=') + 3);

/** Counts and steers the encodings of the clients that an app makes. */
function makeHooks() {
  return {
    /** @type {any[]} */
    encodes: [],
    cancels: 0,
    disposed: 0,
    /** @type {Array<ReturnType<typeof deferred>>} */
    gates: [],
    /** @type {null | ((data: any) => { C: string, T: string | null, F: string, version: 1 })} */
    override: null,
  };
}

/** @param {ReturnType<typeof makeHooks>} hooks */
function clientFactory(hooks) {
  return () => {
    const inner = createPuzzleCodeClient();
    return {
      /** @param {any} data */
      async encode(data) {
        hooks.encodes.push(data);
        const gate = hooks.gates.shift();
        if (gate !== undefined) {
          await gate.promise;
        }
        if (hooks.override !== null) {
          return { ok: /** @type {const} */ (true), value: hooks.override(data), warnings: [] };
        }
        return inner.encode(data);
      },
      decode: (/** @type {string} */ text) => inner.decode(text),
      repair: (/** @type {string} */ text) => inner.repair(text),
      cancel() {
        hooks.cancels += 1;
        inner.cancel();
      },
      dispose() {
        hooks.disposed += 1;
        inner.dispose();
      },
    };
  };
}

/** @param {number} cLength @param {number} [tLength] */
const fakeCode = (cLength, tLength = 0) => {
  const C = symbols(cLength);
  const T = tLength > 0 ? symbols(tLength) : null;
  return { C, T, F: T === null ? C : `${C}.${T}`, version: /** @type {const} */ (1) };
};

const toasts = () => [...document.querySelectorAll('.toast-host .toast')].map((node) => node.textContent ?? '');
const copyDialog = () => /** @type {HTMLDialogElement | null} */ (document.querySelector('dialog.pm-copy-dialog'));
const dialogOpen = () => copyDialog()?.open === true;
const busy = (/** @type {HTMLElement} */ button) => button.getAttribute('aria-busy') === 'true';

/**
 * @param {Element} scope
 * @returns {HTMLButtonElement}
 */
function copyButtonOf(scope) {
  const found = scope.querySelectorAll('[data-action="copy-puzzle-link"]');
  assert(found.length === 1, `exactly one Copy this puzzle link control, found ${found.length}`);
  return /** @type {HTMLButtonElement} */ (found[0]);
}

/**
 * Presses a button and waits for the end of its copy: the busy state returns to false and a message or the field is there.
 * @param {HTMLButtonElement} button
 */
async function copyAndWait(button) {
  button.click();
  await waitFor(() => !busy(button) && (toasts().length > 0 || dialogOpen()), 'the copy to finish with feedback');
}

// ---- the Player --------------------------------------------------------------------------------------------------------

/**
 * @param {Record<string, unknown> | null} pack Null: no puzzle is open (the start screen).
 * @param {{ index?: number, hooks?: ReturnType<typeof makeHooks> }} [options]
 */
async function openPlayer(pack, { index = 0, hooks = makeHooks() } = {}) {
  await useStyles('player');
  let hash = '';
  if (pack !== null) {
    const checked = validatePack(pack);
    assert(checked.ok, 'fixture pack is valid');
    hash = `#pack=${await encodeShareCode(/** @type {any} */ (checked).value)}&i=${index}`;
  }
  const root = document.createElement('div');
  root.className = 'stage-root';
  stage.append(root);
  const map = new Map();
  const adapter = {
    get length() {
      return map.size;
    },
    key: (/** @type {number} */ i) => [...map.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => map.get(k) ?? null,
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => void map.set(k, String(v)),
    removeItem: (/** @type {string} */ k) => void map.delete(k),
  };
  const player = mountPlayer(root, {
    storage: createStorage(adapter, () => Date.now()),
    location: { hash, pathname: '/player/', search: '' },
    history: { replaceState: () => {} },
    baseUrl: new URL('../../player/', document.baseURI),
    createPool: () => ({ beginRequest() {}, endRequest() {}, close() {}, run: () => new Promise(() => {}) }),
    createPuzzleCodeClient: clientFactory(hooks),
    listenHashChange: false,
  });
  toDestroy.push(player);
  await player.ready;
  await pause(60);
  return { root, player, hooks, button: copyButtonOf(root) };
}

/** @param {Awaited<ReturnType<typeof openPlayer>>['player']} player The snapshot the Player's own job makes, computed independently. */
function playerSnapshot(player) {
  const s = /** @type {any} */ (player.store.getState());
  return puzzleSnapshot({
    rows: s.pack.board.rows,
    pieces: s.pack.pieces,
    puzzle: s.pack.puzzles[s.index],
    index: s.index,
    rotation: s.viewRotation ?? s.pack.presentation?.rotation ?? 0,
    untitled: (n) => playerI18n.t('ui.puzzleNumber', { n }),
  });
}

/**
 * Puts one movable piece on the board through the game's own taps.
 * @param {Awaited<ReturnType<typeof openPlayer>>['player']} player
 * @returns {string | null} The piece that was placed.
 */
function placeAnyPiece(player) {
  const before = /** @type {any} */ (player.store.getState().game);
  for (const id of [...before.tray.keys()]) {
    if (!player.play.select(id)) {
      continue;
    }
    for (let y = 0; y < sampleBoard.height; y += 1) {
      for (let x = 0; x < sampleBoard.width; x += 1) {
        if (sampleBoard.active[y * sampleBoard.width + x] !== 1) {
          continue;
        }
        player.play.tapCell([x, y]);
        player.play.tapCell([x, y]);
        if (/** @type {any} */ (player.store.getState().game).placed.size > before.placed.size) {
          return id;
        }
      }
    }
  }
  return null;
}

/**
 * What a printout of the open puzzle carries: the target the dialog shows and the code typed on the first sheet.
 * @param {HTMLElement} openButton The Print control of the app.
 * @param {{ useThisPage?: boolean }} [options]
 * @returns {Promise<{ target: string, code: string, url: string }>}
 */
async function printedLink(openButton, options = {}) {
  /** @type {Element[]} */
  let pages = [];
  const realPrint = window.print;
  window.print = () => {
    pages = [...document.querySelectorAll('.pm-print-root .pm-print-page')].map((page) => /** @type {Element} */ (page.cloneNode(true)));
  };
  try {
    openButton.click();
    const dialog = /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-print-dialog[open]'));
    assert(dialog !== null, 'the Print dialog opens');
    if (options.useThisPage === true) {
      const toggle = /** @type {HTMLInputElement} */ (dialog.querySelector('[data-field="print-use-this-page"]'));
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));
    }
    const stateOf = () => dialog.querySelector('[data-role="print-code"]')?.getAttribute('data-state');
    await pause(20);
    await waitFor(() => stateOf() === 'ready', 'the Print dialog to be ready');
    const target = /opens (.+)$/.exec(dialog.querySelector('[data-role="print-target"]')?.textContent ?? '')?.[1] ?? '';
    /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="print-confirm"]')).click();
    const code = pages.flatMap((page) => [...page.querySelectorAll('text.pm-print-code')]).map((node) => (node.textContent ?? '').replaceAll(' ', '')).join('');
    window.dispatchEvent(new Event('afterprint'));
    return { target, code, url: `${target}#p=${code}` };
  } finally {
    window.print = realPrint;
  }
}

// ---- the Generator -----------------------------------------------------------------------------------------------------

/** @param {{ hooks?: ReturnType<typeof makeHooks>, rotation?: number }} [options] */
async function mountGenerator({ hooks = makeHooks(), rotation = 90 } = {}) {
  await useStyles('generator');
  const puzzles = sample.puzzles.map((/** @type {any} */ p, /** @type {number} */ i) => ({ ...p, id: `g${i}` }));
  const store = createGeneratorStore({
    board: sampleBoard,
    set: /** @type {any} */ ({ board: sampleBoard, pieces: sample.pieces, witness: null, carving: 'flat', macroRegion: null }),
    puzzles,
    rotation,
    setSeed: 'ABCD-EFGH-JKLM',
    calibrationFor: { levelId: 'expert', uniqueness: 'any' },
    levelId: 'expert',
  });
  /** @type {string[]} */
  const played = [];
  const controller = /** @type {any} */ ({
    playPuzzle: async (/** @type {string} */ id) => void played.push(id),
    cancel() {},
    addMore: async () => {},
    removePuzzle() {},
    removeAllPuzzles() {},
    resetHistory() {},
  });
  const host = document.createElement('div');
  host.className = 'stage-root';
  stage.append(host);
  const panel = mountPuzzlePanel(host, {
    store, hardware: detectHardware({}), controller, onNewSet() {}, createPuzzleCodeClient: clientFactory(hooks),
  });
  toDestroy.push(panel);
  await pause(30);
  return { host, store, panel, hooks, played, button: copyButtonOf(host), print: /** @type {HTMLButtonElement} */ (host.querySelector('[data-action="print-puzzle"]')) };
}

/**
 * @param {any} state A Generator state.
 * @param {number} index
 * @returns {ReturnType<typeof puzzleSnapshot>} The snapshot of a puzzle of its accepted set, computed independently.
 */
function generatorSnapshot(state, index) {
  return puzzleSnapshot({
    rows: [...sample.board.rows], pieces: sample.pieces, puzzle: state.puzzles[index], index, rotation: state.rotation, untitled: (n) => generatorI18n.t('card.heading', { n }),
  });
}

// ---- colours -----------------------------------------------------------------------------------------------------------

const colourContext = /** @type {CanvasRenderingContext2D} */ (document.createElement('canvas').getContext('2d', { willReadFrequently: true }));

/** @param {string} css @returns {[number, number, number, number]} */
function rgba(css) {
  colourContext.clearRect(0, 0, 1, 1);
  colourContext.fillStyle = '#000';
  colourContext.fillStyle = css;
  colourContext.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = colourContext.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a];
}

/** @param {[number, number, number, number]} c */
function luminance([r, g, b]) {
  const linear = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/**
 * @param {Element} node
 * @returns {number} The contrast ratio of its text colour against its own background.
 */
function contrastOf(node) {
  const style = getComputedStyle(node);
  const ink = rgba(style.color);
  const paper = rgba(style.backgroundColor);
  assert(paper[3] >= 250, `${node.tagName} has an opaque background (${style.backgroundColor})`);
  const [hi, lo] = [luminance(ink), luminance(paper)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

// =========================================================================================================================
// Cases
// =========================================================================================================================

if (phase === 'main') {
  await check('Player: Copy this puzzle link is a real, named, disabled-without-a-puzzle button in the game bar, in English and Vietnamese', async () => {
    const { root, button } = await openPlayer(sample);
    equal([button.tagName, button.type, button.disabled], ['BUTTON', 'button', false], 'a real enabled button');
    assert(button.closest('.game-bar .game-actions') !== null, 'in the game bar');
    equal([...root.querySelectorAll('.game-actions > button')].map((b) => /** @type {HTMLElement} */ (b).dataset.action).filter((a) => a !== 'straighten').slice(-2), ['print', 'copy-puzzle-link'], 'after Print');
    equal([button.getAttribute('aria-label'), button.title, button.getAttribute('aria-busy')], ['Copy this puzzle link', 'Copy this puzzle link', 'false'], 'English name');
    playerI18n.setLocale('vi', document);
    equal(button.getAttribute('aria-label'), 'Sao chép liên kết đề này', 'Vietnamese name');
    equal(button.title, 'Sao chép liên kết đề này', 'Vietnamese tooltip');
    playerI18n.setLocale('en', document);
    const start = await openPlayer(null);
    assert(start.root.querySelector('[data-screen="start"]') !== null || start.root.dataset.screen === 'start', 'the start screen');
    equal([start.button.disabled, start.button.getAttribute('aria-busy')], [true, 'false'], 'without an open puzzle the control is disabled');
  });

  await check('Player: Copy writes exactly the shared preparation (stored puzzle, answer, default target), the same address Print carries', async () => {
    await withClipboard('ok', async (clip) => {
      const before = JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]);
      const { root, player, button, hooks } = await openPlayer(sample);
      const snapshot = playerSnapshot(player);
      const expected = await decoder.encode(snapshot.data);
      assert(expected.ok, 'the independent encoding works');
      const expectedUrl = `${PUBLIC_PLAYER_URL}#p=${/** @type {any} */ (expected).value.F}`;
      const sideEffects = () => {
        const g = /** @type {any} */ (player.store.getState().game);
        return [g.selected, g.moves, g.placed.size, g.revealed, g.hintsUsed, player.store.getState().index, location.hash];
      };
      const effectsBefore = sideEffects();
      button.click();
      assert(busy(button), 'busy at once, exposed with aria-busy');
      await waitFor(() => clip.writes.length === 1 && !busy(button), 'the copy');
      equal(clip.writes, [expectedUrl], 'exactly the prepared address, once');
      equal(toasts(), ['Link copied'], 'announced after the write');
      const region = /** @type {HTMLElement} */ (document.querySelector('.toast-host'));
      equal([region.getAttribute('role'), region.getAttribute('aria-live')], ['status', 'polite'], 'a polite status region');
      equal(JSON.stringify(hooks.encodes[0]), snapshot.key, 'the encoder got the independently computed snapshot');
      assert(!dialogOpen(), 'no manual field when the clipboard works');
      const decoded = await decodeLink(clip.writes[0]);
      equal([decoded.pack.puzzles.length, decoded.hasTail], [1, true], 'one puzzle, with its stored answer');
      equal(poseList(decoded.pack.puzzles[0].clues), poseList(sample.puzzles[0].clues), 'the original clues');
      equal(poseList(decoded.pack.puzzles[0].solution), poseList(sample.puzzles[0].solution), 'and the stored answer');
      equal(puzzleDisplayName(decoded.pack.puzzles[0].title, 0), /** @type {HTMLElement} */ (root.querySelector('.puzzle-title')).textContent, 'the heading of the Player');
      assert(!clip.writes[0].includes('#lib') && !clip.writes[0].includes('#pack='), 'a portable one-puzzle link, never a library or pack link');
      const printed = await printedLink(/** @type {HTMLElement} */ (root.querySelector('[data-action="print"]')));
      equal(printed.url, clip.writes[0], 'Print and Copy give the same address for the same snapshot and default target');
      equal(JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]), before, 'nothing was stored');
      equal(sideEffects(), effectsBefore, 'Copy moved, selected, revealed and navigated nothing');
      evidence.player.default = {
        key: await shortHash(snapshot.key), heading: snapshot.heading, angle: snapshot.data.rotation, position: 1, target: PUBLIC_PLAYER_URL,
        carried: decoded.hasTail ? 'C.T' : 'C', F: codeOfLink(clip.writes[0]), written: clip.writes[0], printedEqual: printed.url === clip.writes[0],
      };
      // The announcement follows the language.
      document.querySelectorAll('.toast-host').forEach((node) => node.remove());
      clip.writes.length = 0;
      playerI18n.setLocale('vi', document);
      await copyAndWait(button);
      equal([toasts(), clip.writes.length], [['Đã sao chép liên kết'], 1], 'the Vietnamese announcement');
    });
  });

  await check('Player: a moved piece is not encoded, and a move while encoding is pending leaves the snapshot as it was', async () => {
    await withClipboard('ok', async (clip) => {
      const { player, button, hooks } = await openPlayer(sample);
      const original = playerSnapshot(player);
      const placed = placeAnyPiece(player);
      assert(placed !== null, 'a piece was placed');
      assert(/** @type {any} */ (player.store.getState().game).placed.has(placed), 'the board has a movable piece of the player');
      equal(playerSnapshot(player).key, original.key, 'the snapshot key ignores placed pieces');
      await copyAndWait(button);
      const decoded = await decodeLink(clip.writes[0]);
      equal(poseList(decoded.pack.puzzles[0].clues), poseList(sample.puzzles[0].clues), 'only the original clues, not the moved piece');
      // A move while the encoding is pending.
      clip.writes.length = 0;
      document.querySelectorAll('.toast-host').forEach((node) => node.remove());
      const gate = deferred();
      hooks.gates.push(gate);
      button.click();
      await waitFor(() => hooks.encodes.length === 2, 'the second encoding to start');
      const keyAtClick = JSON.stringify(hooks.encodes[1]);
      const more = placeAnyPiece(player);
      assert(more !== null || /** @type {any} */ (player.store.getState().game).tray.size === 0, 'a further move while pending');
      const g = /** @type {any} */ (player.store.getState().game);
      player.store.update({ game: { ...g, elapsedMs: g.elapsedMs + 4000, moves: g.moves + 2 } });
      gate.resolve(undefined);
      await waitFor(() => clip.writes.length === 1 && !busy(button), 'the pending copy to finish');
      equal(keyAtClick, original.key, 'the snapshot of the click is the original one');
      const again = await decodeLink(clip.writes[0]);
      equal(poseList(again.pack.puzzles[0].clues), poseList(sample.puzzles[0].clues), 'still only the original clues');
      evidence.player.pendingMove = { keyEqual: keyAtClick === original.key, written: clip.writes.length };
    });
  });

  await check('Player: the view angle on screen is the angle of the link', async () => {
    await withClipboard('ok', async (clip) => {
      const { player, button } = await openPlayer(sample);
      player.controller.rotateView(45);
      await pause(30);
      const snapshot = playerSnapshot(player);
      equal(snapshot.data.rotation, 45, 'the independent snapshot is at 45 degrees');
      await copyAndWait(button);
      const decoded = await decodeLink(clip.writes[0]);
      equal(decoded.pack.presentation.rotation, 45, 'the decoded angle');
      evidence.player.turned = { angle: decoded.pack.presentation.rotation, key: await shortHash(snapshot.key) };
    });
  });

  await check('Player: the local Print override changes the printout only; Copy keeps the public target', async () => {
    await withClipboard('ok', async (clip) => {
      const { root, button } = await openPlayer(sample);
      const own = new URL('../player/', document.baseURI).href;
      const overridden = await printedLink(/** @type {HTMLElement} */ (root.querySelector('[data-action="print"]')), { useThisPage: true });
      equal(overridden.target, own, "the printout uses this page's Player");
      await copyAndWait(button);
      assert(clip.writes[0].startsWith(PUBLIC_PLAYER_URL), `Copy uses the public Player (${clip.writes[0].slice(0, 70)})`);
      equal(codeOfLink(clip.writes[0]), overridden.code, 'the same code, another target');
      evidence.player.override = { printed: overridden.target, copied: PUBLIC_PLAYER_URL };
    });
  });

  await check('Player: a puzzle whose title has no ordinal keeps its heading at position 2 and 3 after opening the link', async () => {
    await withClipboard('ok', async (clip) => {
      const { root, player, button } = await openPlayer(sample);
      for (const [index, heading] of /** @type {const} */ ([[1, 'Normal #2'], [2, 'Hard #3']])) {
        clip.writes.length = 0;
        document.querySelectorAll('.toast-host').forEach((node) => node.remove());
        await player.controller.goToPuzzle(index);
        await pause(60);
        equal(/** @type {HTMLElement} */ (root.querySelector('.puzzle-title')).textContent, heading, 'the heading on screen');
        await copyAndWait(button);
        const decoded = await decodeLink(clip.writes[0]);
        equal(decoded.pack.puzzles[0].title, heading, 'the encoded title is the whole heading');
        equal(puzzleDisplayName(decoded.pack.puzzles[0].title, 0), heading, 'the re-created puzzle shows it at position 1');
        equal(poseList(decoded.pack.puzzles[0].clues), poseList(sample.puzzles[index].clues), 'the clues of this puzzle only');
        evidence.player[`position${index + 1}`] = { heading, position: index + 1 };
      }
    });
  });

  await check('Player: a refused clipboard opens a labelled, read-only, selected field with the exact link; nothing says "copied"', async () => {
    await withClipboard('deny', async (clip) => {
      const { root, player, button } = await openPlayer(sample);
      const snapshot = playerSnapshot(player);
      const expected = /** @type {any} */ (await decoder.encode(snapshot.data)).value.F;
      const url = `${PUBLIC_PLAYER_URL}#p=${expected}`;
      const movesBefore = /** @type {any} */ (player.store.getState().game).moves;
      const placedBefore = /** @type {any} */ (player.store.getState().game).placed.size;
      assert(root.querySelector('textarea') === null, 'no text field before a failure');
      button.click();
      await waitFor(() => dialogOpen(), 'the manual field');
      const dialog = /** @type {HTMLDialogElement} */ (copyDialog());
      const field = /** @type {HTMLTextAreaElement} */ (dialog.querySelector('textarea'));
      equal(field.value, url, 'the exact link');
      assert(field.readOnly, 'read-only');
      equal(dialog.querySelector(`label[for="${field.id}"]`)?.textContent, 'Puzzle link', 'labelled');
      equal(dialog.getAttribute('aria-labelledby'), dialog.querySelector('label')?.id, 'the dialog is named by the label');
      assert(dialog.matches(':modal'), 'modal: the game cannot be played behind it');
      equal([document.activeElement === field, field.selectionStart, field.selectionEnd], [true, 0, url.length], 'focused with the whole address selected');
      equal(dialog.querySelector('[data-role="copy-notes"]')?.textContent, 'Could not copy the link. Select and copy it manually.', 'the failure message');
      assert(!/Link copied/.test(document.body.textContent ?? ''), 'never claims "copied"');
      assert(/** @type {HTMLElement} */ (dialog.querySelector('[data-action="copy-close"]')).textContent === 'Close', 'the existing Close text');
      // Selecting inside the field is only text selection.
      field.setSelectionRange(3, 9);
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'click']) {
        field.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
      }
      equal([/** @type {any} */ (player.store.getState().game).moves, /** @type {any} */ (player.store.getState().game).placed.size], [movesBefore, placedBefore], 'no piece moved');
      assert(field.scrollWidth <= field.clientWidth + 1, 'a long address wraps inside the field');
      playerI18n.setLocale('vi', document);
      equal([dialog.querySelector('label')?.textContent, dialog.querySelector('[data-role="copy-notes"]')?.textContent, dialog.querySelector('[data-action="copy-close"]')?.textContent],
        ['Liên kết đề', 'Không sao chép được liên kết. Hãy chọn và sao chép thủ công.', 'Đóng'], 'Vietnamese texts');
      /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="copy-close"]')).click();
      await waitFor(() => !dialogOpen(), 'Close');
      await pause(30);
      assert(document.activeElement === button, 'the focus returns to the Copy button');
      equal([clip.attempts.count, clip.writes.length], [1, 0], 'one refused attempt');
      evidence.player.denied = { fieldEquals: field.value === url, focusRestored: true, attempts: clip.attempts.count };
      // The field belongs to the puzzle it was made for: another puzzle closes it.
      playerI18n.setLocale('en', document);
      button.click();
      await waitFor(() => dialogOpen(), 'the field again');
      await player.controller.goToPuzzle(1);
      await waitFor(() => !dialogOpen(), 'the field to close when another puzzle is open');
    });
  });

  await check('Player: a puzzle opened while encoding is pending is not copied; a newer click wins over an older answer', async () => {
    await withClipboard('ok', async (clip) => {
      const { root, player, button, hooks } = await openPlayer(sample);
      const gate = deferred();
      hooks.gates.push(gate);
      button.click();
      await waitFor(() => hooks.encodes.length === 1, 'the encoding to start');
      assert(busy(button), 'busy while pending');
      assert(!/** @type {HTMLButtonElement} */ (root.querySelector('[data-action="undo"]')).hasAttribute('aria-busy'), 'other controls are not marked busy');
      await player.controller.goToPuzzle(2);
      await pause(40);
      gate.resolve(undefined);
      await waitFor(() => !busy(button), 'the stale operation to end');
      await pause(60);
      equal([clip.writes, toasts(), dialogOpen()], [[], [], false], 'the old selection is not copied or announced');
      // Two clicks: the older answer arrives last.
      hooks.encodes.length = 0;
      const older = deferred();
      const newer = deferred();
      hooks.gates.push(older, newer);
      button.click();
      button.click();
      await waitFor(() => hooks.encodes.length === 2, 'both encodings to start');
      newer.resolve(undefined);
      await waitFor(() => clip.writes.length === 1, 'the newer click to write');
      older.resolve(undefined);
      await pause(150);
      equal(clip.writes.length, 1, 'only the current click wrote');
      await waitFor(() => !busy(button), 'the busy state to end');
      equal(toasts(), ['Link copied'], 'one announcement');
      evidence.player.stale = { staleWrites: 0, newerWrites: clip.writes.length };
    });
  });

  await check('Player: no fitting QR still copies the address with the advisory; a long address warns; an unusable one is called too large', async () => {
    await withClipboard('ok', async (clip) => {
      const { player, button, hooks } = await openPlayer(sample);
      const small = playerSnapshot(player);
      equal(small.heading, 'Easy #1', 'the snapshot');
      // Nothing fits one QR symbol: the address of the core is within the whole-URL budget.
      hooks.override = () => fakeCode(5000);
      await copyAndWait(button);
      equal(clip.writes, [`${PUBLIC_PLAYER_URL}#p=${symbols(5000)}`], 'the core address');
      equal(toasts(), [
        'Link copied; this puzzle is too large for a printable QR code.',
        'This link is 5045 characters long, and some chat apps cut long links.',
      ], 'the QR advisory and the long-link warning');
      assert(!toasts().join(' ').includes('QR code. Link copied'), 'no claim that the link is a QR');
      // The tail does not fit the symbol, the core does: the copied address is the core without the tail.
      clip.writes.length = 0;
      document.querySelectorAll('.toast-host').forEach((node) => node.remove());
      hooks.override = () => fakeCode(2600, 1200);
      await copyAndWait(button);
      equal(clip.writes, [`${PUBLIC_PLAYER_URL}#p=${symbols(2600)}`], 'the core only, no hidden richer code');
      assert(!clip.writes[0].includes('.'.concat(symbols(1200))), 'no tail');
      equal(toasts(), ['Link copied'], 'a plain success (the QR is there, below 4,000 characters)');
      // A whole address above 16,000 characters is not a working link.
      clip.writes.length = 0;
      document.querySelectorAll('.toast-host').forEach((node) => node.remove());
      hooks.override = () => fakeCode(16000);
      await copyAndWait(button);
      equal([clip.writes, clip.attempts.count, dialogOpen()], [[], 2, false], 'nothing is copied and no field is offered');
      equal(toasts(), ['This puzzle is too large to share as a link.'], 'the too-large message');
      evidence.player.noQr = { advisory: true, lib: false };
    });
  });

  await check('Player: the copied link opens exactly that puzzle in the local Player', async () => {
    await withClipboard('ok', async (clip) => {
      const { player, button } = await openPlayer(sample);
      await player.controller.goToPuzzle(1);
      await pause(60);
      await copyAndWait(button);
      const hash = clip.writes[0].slice(clip.writes[0].indexOf('#'));
      const frame = document.createElement('iframe');
      frame.setAttribute('width', '1200');
      frame.setAttribute('height', '800');
      frame.src = `../../player/index.html${hash}`;
      stage.append(frame);
      await waitFor(() => frame.contentDocument?.querySelector('#app[data-screen="game"]') !== null && frame.contentDocument?.querySelector('.puzzle-title')?.textContent !== '', 'the local Player to open the link', 30000);
      const doc = /** @type {Document} */ (frame.contentDocument);
      equal(doc.querySelector('.puzzle-title')?.textContent, 'Normal #2', 'the heading of the copied puzzle');
      equal(doc.querySelectorAll('.puzzle-card').length, 1, 'only that puzzle is in the list');
      equal(/** @type {Window} */ (frame.contentWindow).location.hash, hash, 'the address is kept');
      evidence.player.opened = { heading: doc.querySelector('.puzzle-title')?.textContent, cards: doc.querySelectorAll('.puzzle-card').length };
    });
  });

  await check('Generator: the action sits beside Play and Print with its whole visible name, in English and Vietnamese', async () => {
    const { host, button, print } = await mountGenerator();
    assert(button.closest('.detail-actions') !== null, 'beside Play and Print');
    equal([...host.querySelectorAll('.detail-actions > button')].map((b) => /** @type {HTMLElement} */ (b).dataset.action), ['play-puzzle', 'print-puzzle', 'copy-puzzle-link'], 'the buttons of the selected puzzle');
    equal([button.tagName, button.type, button.disabled, button.textContent?.trim()], ['BUTTON', 'button', false, 'Copy this puzzle link'], 'a real button with a visible name');
    assert(!button.hasAttribute('aria-label') && !button.title, 'the name is the visible text, not a tooltip');
    assert(print !== null && host.querySelectorAll('[data-action="copy-puzzle-link"]').length === 1, 'one per-puzzle Copy control');
    assert(host.querySelector('[data-action="copy-pack-link"]') === null, 'the whole-pack action is not repurposed');
    generatorI18n.setLocale('vi', document);
    equal(button.textContent?.trim(), 'Sao chép liên kết đề này', 'Vietnamese name');
    generatorI18n.setLocale('en', document);
  });

  await check('Generator: Copy writes the selected puzzle of its own set, not the editor board, equal to what Print carries', async () => {
    await withClipboard('ok', async (clip) => {
      const { host, store, button, print, hooks } = await mountGenerator();
      /** @type {HTMLButtonElement} */ (host.querySelector('li[data-puzzle-id="g1"] [data-action="select"]')).click();
      await pause(30);
      // The editor board changes after the set was made; the selected puzzle keeps the board of its own set.
      store.update({ board: boardFromRows(['#####', '#####', '#####', '#####', '#####', '#####']) });
      await pause(20);
      const stateNow = /** @type {any} */ (store.getState());
      const snapshot = generatorSnapshot(stateNow, 1);
      const expected = /** @type {any} */ (await decoder.encode(snapshot.data)).value.F;
      await copyAndWait(button);
      equal(clip.writes, [`${PUBLIC_PLAYER_URL}#p=${expected}`], 'the prepared address of the selected puzzle');
      equal(JSON.stringify(hooks.encodes[0]), snapshot.key, 'the encoder got the independently computed snapshot');
      const decoded = await decodeLink(clip.writes[0]);
      equal(decoded.pack.board.rows, sample.board.rows, 'the board of the accepted set');
      equal(decoded.pack.presentation.rotation, 90, 'at the angle of the view');
      equal(poseList(decoded.pack.puzzles[0].clues), poseList(sample.puzzles[1].clues), 'the clues of the selected puzzle only');
      equal(decoded.pack.puzzles.length, 1, 'no other puzzle');
      equal(puzzleDisplayName(decoded.pack.puzzles[0].title, 0), 'Normal #2', 'the displayed heading at position 2');
      equal(decoded.hasTail, true, 'the stored answer travels');
      const printed = await printedLink(print);
      equal(printed.url, clip.writes[0], 'Print and Copy give the same address');
      evidence.generator.default = {
        key: await shortHash(snapshot.key), heading: snapshot.heading, angle: 90, position: 2, target: PUBLIC_PLAYER_URL,
        carried: decoded.hasTail ? 'C.T' : 'C', F: codeOfLink(clip.writes[0]), written: clip.writes[0], printedEqual: printed.url === clip.writes[0],
      };
      document.querySelectorAll('.toast-host').forEach((node) => node.remove());
      clip.writes.length = 0;
      generatorI18n.setLocale('vi', document);
      await copyAndWait(button);
      equal([toasts(), clip.writes.length], [['Đã sao chép liên kết'], 1], 'the Vietnamese announcement');
    });
  });

  await check('Generator: the local Print override changes the printout only; Copy keeps its default target and the override resets', async () => {
    await withClipboard('ok', async (clip) => {
      const { button, print } = await mountGenerator();
      const own = new URL('../player/', document.baseURI).href;
      const overridden = await printedLink(print, { useThisPage: true });
      assert(overridden.target === own && overridden.url.startsWith(own), `the printout uses this page's Player (${overridden.target})`);
      await copyAndWait(button);
      assert(clip.writes[0].startsWith(PUBLIC_PLAYER_URL), `Copy uses the public Player (${clip.writes[0].slice(0, 70)})`);
      equal(codeOfLink(clip.writes[0]), overridden.code, 'the same code, another target');
      const normal = await printedLink(print);
      equal(normal.url, clip.writes[0], 'a normal printout equals Copy');
      print.click();
      const dialog = /** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-print-dialog[open]'));
      assert(!(/** @type {HTMLInputElement} */ (dialog.querySelector('[data-field="print-use-this-page"]'))).checked, 'the override is off again after closing Print');
      /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="print-cancel"]')).click();
      evidence.generator.override = { printed: overridden.target, copied: PUBLIC_PLAYER_URL, resets: true };
    });
  });

  await check('Generator: a refused clipboard shows the field; a selection change while encoding is pending suppresses the old result', async () => {
    await withClipboard('deny', async (clip) => {
      const { host, store, button, hooks } = await mountGenerator();
      const snapshot = generatorSnapshot(/** @type {any} */ (store.getState()), 2);
      const expectedUrl = `${PUBLIC_PLAYER_URL}#p=${/** @type {any} */ (await decoder.encode(snapshot.data)).value.F}`;
      button.click();
      await waitFor(() => dialogOpen(), 'the manual field');
      const dialog = /** @type {HTMLDialogElement} */ (copyDialog());
      const field = /** @type {HTMLTextAreaElement} */ (dialog.querySelector('textarea'));
      equal(field.value, expectedUrl, 'the exact link of the selected puzzle');
      assert(field.readOnly, 'in a read-only field');
      equal(dialog.querySelector('[data-action="copy-close"]')?.textContent, 'Close', 'a Close action');
      generatorI18n.setLocale('vi', document);
      equal(dialog.querySelector('[data-action="copy-close"]')?.textContent, 'Đóng', 'Vietnamese Close');
      generatorI18n.setLocale('en', document);
      /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="copy-close"]')).click();
      await pause(30);
      assert(document.activeElement === button, 'the focus returns to the Copy button');
      evidence.generator.denied = { fieldEquals: field.value === expectedUrl, focusRestored: true };
      // The field belongs to the puzzle it was made for: when that puzzle goes, the field goes.
      button.click();
      await waitFor(() => dialogOpen(), 'the field again');
      store.update({ puzzles: store.getState().puzzles.slice(0, 2) });
      await waitFor(() => !dialogOpen(), 'the field to close when the selected puzzle is gone');
      equal([clip.writes.length, hooks.encodes.length >= 2], [0, true], 'nothing was copied');
    });
    await withClipboard('ok', async (clip) => {
      const { host, button, hooks } = await mountGenerator();
      const gate = deferred();
      hooks.gates.push(gate);
      button.click();
      await waitFor(() => hooks.encodes.length === 1, 'the encoding to start');
      /** @type {HTMLButtonElement} */ (host.querySelector('li[data-puzzle-id="g0"] [data-action="select"]')).click();
      await pause(30);
      gate.resolve(undefined);
      await waitFor(() => !busy(button), 'the stale operation to end');
      await pause(60);
      equal([clip.writes, toasts(), dialogOpen()], [[], [], false], 'the puzzle selected at the click is not copied for the new selection');
      evidence.generator.stale = { staleWrites: clip.writes.length };
    });
  });

  await check('Generator: no fitting QR copies the address with the advisory and never a library link', async () => {
    await withClipboard('ok', async (clip) => {
      const { button, hooks } = await mountGenerator();
      hooks.override = () => fakeCode(5000);
      await copyAndWait(button);
      equal(clip.writes, [`${PUBLIC_PLAYER_URL}#p=${symbols(5000)}`], 'the core address');
      equal(toasts()[0], 'Link copied; this puzzle is too large for a printable QR code.', 'the advisory');
      assert(!clip.writes[0].includes('#lib'), 'no local-library link');
      evidence.generator.noQr = { advisory: toasts()[0], lib: false };
    });
  });

  await check('Generator: Play, Print, Show solution and the whole-pack link path still work; Copy stores nothing', async () => {
    await withClipboard('ok', async (clip) => {
      const before = JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]);
      const { host, button, print, played } = await mountGenerator();
      await copyAndWait(button);
      equal(JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]), before, 'no storage written');
      /** @type {HTMLButtonElement} */ (host.querySelector('[data-action="play-puzzle"]')).click();
      equal(played, ['g2'], 'Play still opens the selected puzzle');
      const solution = /** @type {HTMLButtonElement} */ (host.querySelector('[data-action="show-solution"]'));
      solution.click();
      equal(solution.getAttribute('aria-pressed'), 'true', 'Show solution still works');
      print.click();
      assert(/** @type {HTMLDialogElement} */ (document.querySelector('dialog.pm-print-dialog')).open, 'Print still opens');
      /** @type {HTMLButtonElement} */ (document.querySelector('dialog.pm-print-dialog [data-action="print-cancel"]')).click();
      const pack = await preparePlayerLink(/** @type {any} */ (validatePack(sample)).value, 0, { base: location.href });
      assert(pack.portable && /#pack=1[zj]\./.test(pack.href ?? ''), 'the whole-pack link is unchanged (#pack=)');
      equal(clip.writes.length, 1, 'only the one copy');
    });
  });

  await check('themes: the control, the field and its notes keep readable colours in light, dark and high contrast', async () => {
    for (const theme of ['light', 'dark', 'high-contrast']) {
      document.documentElement.dataset.theme = theme;
      await withClipboard('deny', async () => {
        const g = await mountGenerator();
        assert(contrastOf(g.button) >= 4.5, `Generator Copy button in ${theme}: ${contrastOf(g.button).toFixed(2)}`);
        g.button.click();
        await waitFor(() => dialogOpen(), 'the field');
        const dialog = /** @type {HTMLDialogElement} */ (copyDialog());
        for (const selector of ['textarea', '.pm-copy-dialog', '[data-action="copy-close"]']) {
          const node = selector === '.pm-copy-dialog' ? dialog : /** @type {Element} */ (dialog.querySelector(selector));
          assert(contrastOf(node) >= 4.5, `${selector} in ${theme}: ${contrastOf(node).toFixed(2)}`);
        }
        /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="copy-close"]')).click();
        await pause(20);
        g.panel.destroy();
        stage.replaceChildren();
        const p = await openPlayer(sample);
        assert(contrastOf(p.button) >= 4.5, `Player Copy button in ${theme}: ${contrastOf(p.button).toFixed(2)}`);
        p.button.click();
        await waitFor(() => dialogOpen(), 'the Player field');
        const pd = /** @type {HTMLDialogElement} */ (copyDialog());
        for (const selector of ['textarea', '[data-action="copy-close"]']) {
          assert(contrastOf(/** @type {Element} */ (pd.querySelector(selector))) >= 4.5, `Player ${selector} in ${theme}`);
        }
        assert(contrastOf(pd) >= 4.5, `Player dialog in ${theme}`);
        /** @type {HTMLButtonElement} */ (pd.querySelector('[data-action="copy-close"]')).click();
        await pause(20);
      });
      for (const item of toDestroy.splice(0)) {
        item.destroy();
      }
      stage.replaceChildren();
      document.querySelectorAll('dialog.pm-copy-dialog, .toast-host').forEach((node) => node.remove());
    }
  });

  await check('the real clipboard: the outcome the browser gave is the outcome shown (never claimed otherwise)', async () => {
    const { button, root } = await openPlayer(sample);
    const nativeWrite = navigator.clipboard?.writeText?.bind(navigator.clipboard);
    /** @type {string[]} */
    const accepted = [];
    let legacyCopies = 0;
    if (nativeWrite !== undefined) {
      Object.defineProperty(navigator.clipboard, 'writeText', {
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
      if (command === 'copy' && done) {
        legacyCopies += 1;
      }
      return done;
    };
    try {
      button.click();
      await waitFor(() => !busy(button) && (toasts().length > 0 || dialogOpen()), 'the real copy to finish');
    } finally {
      delete (/** @type {any} */ (document)).execCommand;
      if (navigator.clipboard !== undefined) {
        delete (/** @type {any} */ (navigator.clipboard)).writeText;
      }
    }
    const shown = dialogOpen() ? 'field' : toasts()[0];
    const took = accepted.length === 1 || legacyCopies > 0;
    let readBack = 'not-attempted';
    if (accepted.length === 1) {
      try {
        readBack = (await navigator.clipboard.readText()) === accepted[0] ? 'match' : 'mismatch';
      } catch {
        readBack = 'read-blocked';
      }
    }
    equal(shown, took ? 'Link copied' : 'field', 'the success message is shown exactly when the browser took the text; otherwise the manual field');
    assert(readBack !== 'mismatch', 'what the clipboard holds is the link');
    if (accepted.length === 1) {
      assert(accepted[0].startsWith(PUBLIC_PLAYER_URL), 'a portable link');
    }
    evidence.real = { nativeWrites: accepted.length, legacyCopies, shown, readBack, hasFocus: document.hasFocus(), userAgent: navigator.userAgent, connected: root.isConnected };
  });

  await check('no content-security-policy violations, uncaught errors or main-thread catalogue builds', async () => {
    equal(violations, [], 'security policy violations');
    equal(uncaught, [], 'uncaught errors');
    equal(catalogueStats.sizesBuilt, 0, 'catalogue sizes built on the page');
  });
}

if (phase === 'keys') {
  /** @param {string} name */
  async function press(name) {
    document.documentElement.dataset.stage = name;
    await waitFor(() => document.documentElement.dataset.stage === `${name}-done`, `the runner to press ${name}`, 15000);
  }

  await check('keyboard (trusted keys): Tab reaches Copy after Print, Enter copies, Escape closes the field and the focus returns', async () => {
    await withClipboard('deny', async (clip) => {
      const { root, button } = await openPlayer(sample);
      const printButton = /** @type {HTMLButtonElement} */ (root.querySelector('[data-action="print"]'));
      printButton.focus();
      await press('tab');
      assert(document.activeElement === button, `Tab from Print reaches Copy (focus is on ${document.activeElement?.tagName} ${/** @type {HTMLElement} */ (document.activeElement)?.dataset?.action})`);
      await press('enter');
      await waitFor(() => dialogOpen(), 'the field after Enter');
      const field = /** @type {HTMLTextAreaElement} */ (copyDialog()?.querySelector('textarea'));
      assert(document.activeElement === field, 'the field has the focus');
      equal(clip.attempts.count, 1, 'Enter pressed the button once');
      await press('escape');
      await waitFor(() => !dialogOpen(), 'Escape to close the field');
      await pause(60);
      assert(document.activeElement === button, `the focus returns to the Copy button (${document.activeElement?.tagName})`);
      evidence.player.keys = { tab: true, enter: true, escapeRestoresFocus: true };
    });
  });

  await check('keyboard (trusted keys): Space on the Generator control copies, Escape restores the focus', async () => {
    await withClipboard('deny', async () => {
      const { button } = await mountGenerator();
      button.focus();
      await press('space');
      await waitFor(() => dialogOpen(), 'the field after Space');
      await press('escape2');
      await waitFor(() => !dialogOpen(), 'Escape to close the field');
      await pause(60);
      assert(document.activeElement === button, 'the focus returns to the Copy button');
      evidence.generator.keys = { space: true, escapeRestoresFocus: true };
    });
  });

  await check('no content-security-policy violations or uncaught errors', async () => {
    equal(violations, [], 'security policy violations');
    equal(uncaught, [], 'uncaught errors');
  });
}

if (phase === 'narrow') {
  const coarse = matchMedia('(pointer: coarse)').matches;
  evidence.narrow = { coarse, width: innerWidth };

  /** @param {Element} node @param {string} what */
  function targetSize(node, what) {
    const r = node.getBoundingClientRect();
    assert(r.width >= 43.5 && r.height >= 43.5, `${what} is at least 44 x 44 CSS px (${Math.round(r.width)} x ${Math.round(r.height)})`);
    assert(r.left >= -0.5 && r.right <= innerWidth + 0.5, `${what} is inside the viewport (${Math.round(r.left)}..${Math.round(r.right)} of ${innerWidth})`);
  }
  const noSideScroll = (/** @type {string} */ what) => assert(document.documentElement.scrollWidth <= innerWidth + 1, `${what}: the page does not scroll sideways (${document.documentElement.scrollWidth} > ${innerWidth})`);

  await check('narrow: the phone is emulated with a coarse pointer and a 390 px viewport', async () => {
    assert(coarse, 'the primary pointer is coarse');
    assert(innerWidth <= 400, `the viewport is narrow (${innerWidth})`);
  });

  await check('narrow Generator: the whole label fits, targets are 44 px, the field wraps a long link inside itself', async () => {
    await withClipboard('deny', async () => {
      const { host, button, hooks } = await mountGenerator();
      targetSize(button, 'Generator Copy button');
      assert(button.scrollWidth <= button.clientWidth + 1, 'the whole name is inside the button');
      const head = /** @type {HTMLElement} */ (host.querySelector('.detail-head'));
      assert(head.scrollWidth <= head.clientWidth + 1, 'the detail header does not overflow');
      for (const action of ['play-puzzle', 'print-puzzle']) {
        targetSize(/** @type {Element} */ (host.querySelector(`[data-action="${action}"]`)), action);
      }
      generatorI18n.setLocale('vi', document);
      assert(button.scrollWidth <= button.clientWidth + 1 && head.scrollWidth <= head.clientWidth + 1, 'the Vietnamese name fits too');
      generatorI18n.setLocale('en', document);
      noSideScroll('Generator');
      hooks.override = () => fakeCode(3500);
      button.click();
      await waitFor(() => dialogOpen(), 'the field');
      const dialog = /** @type {HTMLDialogElement} */ (copyDialog());
      const field = /** @type {HTMLTextAreaElement} */ (dialog.querySelector('textarea'));
      equal(field.value.length, 45 + 3500, 'a 3,545-character link');
      const box = dialog.getBoundingClientRect();
      assert(box.left >= -0.5 && box.right <= innerWidth + 0.5, 'the dialog fits the viewport');
      assert(field.scrollWidth <= field.clientWidth + 1, 'the long link wraps inside the field');
      targetSize(/** @type {Element} */ (dialog.querySelector('[data-action="copy-close"]')), 'Close');
      noSideScroll('Generator with the field open');
      /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="copy-close"]')).click();
    });
  });

  await check('narrow Player: the game bar keeps a 44 px Copy button inside the viewport; the field wraps a long link', async () => {
    await withClipboard('deny', async () => {
      const { root, button, hooks } = await openPlayer(sample);
      targetSize(button, 'Player Copy button');
      const bar = /** @type {HTMLElement} */ (root.querySelector('.game-bar'));
      assert(bar.scrollWidth <= bar.clientWidth + 1, 'the game bar does not overflow');
      noSideScroll('Player');
      hooks.override = () => fakeCode(3500);
      button.click();
      await waitFor(() => dialogOpen(), 'the field');
      const dialog = /** @type {HTMLDialogElement} */ (copyDialog());
      const field = /** @type {HTMLTextAreaElement} */ (dialog.querySelector('textarea'));
      const box = dialog.getBoundingClientRect();
      assert(box.left >= -0.5 && box.right <= innerWidth + 0.5, 'the dialog fits the viewport');
      assert(field.scrollWidth <= field.clientWidth + 1, 'the long link wraps inside the field');
      targetSize(/** @type {Element} */ (dialog.querySelector('[data-action="copy-close"]')), 'Close');
      noSideScroll('Player with the field open');
      /** @type {HTMLButtonElement} */ (dialog.querySelector('[data-action="copy-close"]')).click();
    });
  });

  await check('no content-security-policy violations or uncaught errors', async () => {
    equal(violations, [], 'security policy violations');
    equal(uncaught, [], 'uncaught errors');
  });
}

decoder.dispose();

/**
 * Asks the runner for a screenshot of what is on the stage now (a no-op without a runner).
 * @param {string} name
 */
async function shot(name) {
  document.documentElement.dataset.stage = `shot-${name}`;
  try {
    await waitFor(() => document.documentElement.dataset.stage === `shot-${name}-done`, `the runner to take shot ${name}`, 4000);
  } catch {
    // opened by hand: there is no runner
  }
}

if (phase !== 'keys') {
  // What the controls look like: left on the stage for the screenshots, after the checks.
  const clip = stubClipboard('deny');
  try {
    const g = await mountGenerator();
    await shot('generator');
    g.button.click();
    await waitFor(() => dialogOpen(), 'the field');
    await shot('generator-field');
    /** @type {HTMLButtonElement} */ (copyDialog()?.querySelector('[data-action="copy-close"]')).click();
    g.panel.destroy();
    stage.replaceChildren();
    const p = await openPlayer(sample);
    await shot('player');
    document.documentElement.dataset.theme = 'dark';
    p.button.click();
    await waitFor(() => dialogOpen(), 'the field');
    await shot('player-field-dark');
  } catch (error) {
    results.push({ name: 'gallery', ok: false, error: String(/** @type {Error} */ (error)?.stack ?? error) });
  } finally {
    clip.restore();
  }
}

const failed = results.filter((r) => !r.ok);
const list = document.getElementById('results');
for (const r of results) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.error ? ` — ${r.error}` : ''}`;
  list?.append(li);
}
const summary = document.getElementById('summary');
if (summary) {
  summary.textContent = `${results.length - failed.length}/${results.length} passed`;
}
document.documentElement.dataset.evidence = JSON.stringify(evidence);
document.documentElement.dataset.summary = JSON.stringify({ phase, total: results.length, failed: failed.map((r) => `${r.name}: ${r.error}`.slice(0, 900)) });
document.documentElement.dataset.result = failed.length === 0 && results.length > 0 ? 'pass' : 'fail';
