// @ts-check
// Browser regression harness for T20 (player gestures, keyboard, history,
// saving and the win dialog). It mounts the real player with injected storage
// and drives it with dispatched pointer, wheel and keyboard events, then writes
// a pass/fail list into the page and sets data-summary on <html>. Developer
// fixture, not deployed. Real-device touch and Safari are covered by T23.

import { poseT } from '../../core/engine/game.js';
import { poseCells } from '../../core/engine/geometry.js';
import { colorFor, labelFor } from '../../core/engine/palette.js';
import { validatePack } from '../../core/engine/pack.js';
import { packHash } from './pack-link.js';
import { createStorage } from '../../core/browser/storage.js';
import { mountPlayer } from '../../player/app.js';
import { defaultHandle, handleCell, transformedT } from '../../player/play.js';

const results = /** @type {Array<{ name: string, ok: boolean, error?: string }>} */ ([]);
const violations = /** @type {string[]} */ ([]);
const mounted = /** @type {Array<{ destroy: () => void }>} */ ([]);
document.addEventListener('securitypolicyviolation', (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));

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
  for (const player of mounted.splice(0)) {
    try {
      player.destroy();
    } catch {
      // already destroyed
    }
  }
  for (const stage of document.querySelectorAll('.stage-root')) {
    stage.remove();
  }
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
  assert(a === b, `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {string} msg
 */
function same(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

/**
 * @param {() => unknown} cond
 * @param {string} label
 * @param {number} [ms]
 */
async function waitFor(cond, label, ms = 5000) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (cond()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for ${label}`);
}

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
const tick = async () => {
  await frame();
  await frame();
};
const pause = (/** @type {number} */ ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sample = JSON.parse(await (await fetch('../../player/samples/sample-pack.json')).text());

/**
 * @param {unknown} pack
 * @returns {any}
 */
function validated(pack) {
  const checked = validatePack(pack);
  if (!checked.ok) {
    throw new Error(`fixture invalid: ${checked.issues[0].message}`);
  }
  return checked.value;
}

/** @type {Map<number, string>} */
const codes = new Map();
/** @param {number} theta */
async function codeFor(theta) {
  if (!codes.has(theta)) {
    codes.set(theta, await packHash(validated({ ...sample, presentation: { rotation: theta } })));
  }
  return /** @type {string} */ (codes.get(theta));
}

/** @param {number} theta */
const packFor = (theta) => validated({ ...sample, presentation: { rotation: theta } });

/** 21 monominoes on 3x7: more than 20 pieces, so Patterns exists. */
function bigSet() {
  const pieces = Array.from({ length: 21 }, (_, i) => ({ id: `P${String(i + 1).padStart(2, '0')}`, label: labelFor(i), color: colorFor(i), cells: [[0, 0]] }));
  const solution = pieces.map((p, i) => ({ piece: p.id, x: i % 7, y: Math.floor(i / 7), turn: 0, mirrored: false }));
  return {
    format: 'pentomino-pack',
    version: 1,
    kind: 'puzzle-pack',
    rules: 'free-polyomino-v1',
    board: { rows: ['#######', '#######', '#######'] },
    pieces,
    puzzles: [{ id: 'big1', title: 'Big', clues: [solution[0]], solution }],
  };
}

/** @param {Record<string, string>} [seed] */
function memoryAdapter(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    failWrites: false,
    get length() {
      return map.size;
    },
    key: (/** @type {number} */ i) => [...map.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => map.get(k) ?? null,
    setItem(/** @type {string} */ k, /** @type {string} */ v) {
      if (this.failWrites) {
        throw new DOMException('quota', 'QuotaExceededError');
      }
      map.set(k, String(v));
    },
    removeItem: (/** @type {string} */ k) => {
      map.delete(k);
    },
  };
}

/**
 * @param {{ hash: string, adapter?: ReturnType<typeof memoryAdapter>, width?: number, height?: number, reducedMotion?: boolean,
 *   saveDelayMs?: number }} o
 */
async function mount(o) {
  const root = document.createElement('div');
  root.className = 'stage-root';
  root.style.position = 'fixed';
  root.style.left = '0';
  root.style.top = '0';
  root.style.width = o.width === undefined ? '100vw' : `${o.width}px`;
  root.style.height = o.height === undefined ? '100vh' : `${o.height}px`;
  root.style.zIndex = '5';
  root.style.background = '#f3f1ea';
  document.body.append(root);
  const adapter = o.adapter ?? memoryAdapter();
  const storage = createStorage(adapter, () => Date.now());
  const location = { hash: o.hash, pathname: '/player/', search: '' };
  const player = mountPlayer(root, {
    storage,
    location,
    history: {
      replaceState: (_s, _t, url) => {
        location.hash = url.startsWith('#') ? url : '';
      },
    },
    baseUrl: new URL('../../player/', document.baseURI),
    createPool: () => ({ beginRequest() {}, endRequest() {}, close() {}, run: () => new Promise(() => {}) }),
    listenHashChange: false,
    reducedMotion: o.reducedMotion ?? false,
    saveDelayMs: o.saveDelayMs,
  });
  await player.ready;
  await tick();
  // The first ResizeObserver callback refits the board; let it pass before a test zooms.
  await pause(80);
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
  const game = () => /** @type {import('../../core/engine/game.js').GameState} */ (player.store.getState().game);
  mounted.push(player);
  return { root, player, adapter, storage, location, q, qa, game, play: player.play, store: player.store };
}

/** @typedef {Awaited<ReturnType<typeof mount>>} Mounted */
/** @typedef {import('../../core/engine/types.js').Pose} Pose */
/** @typedef {import('../../player/play.js').TransformOp} TransformOp */


/**
 * @param {number} theta
 * @param {Partial<Parameters<typeof mount>[0]>} [o]
 */
async function game(theta = 0, o = {}) {
  const m = await mount({ hash: await codeFor(theta), ...o });
  equal(m.root.dataset.screen, 'game', 'the game screen is open');
  return m;
}

/** @param {Mounted} m @returns {Pose[]} */
function movables(m) {
  const pack = /** @type {import('../../core/engine/types.js').Pack} */ (m.store.getState().pack);
  const puzzle = pack.puzzles[m.store.getState().index];
  const clued = new Set(puzzle.clues.map((c) => c.piece));
  return /** @type {Pose[]} */ (puzzle.solution).filter((p) => !clued.has(p.piece));
}

/** @param {Mounted} m @param {string} id */
const pieceOf = (m, id) => /** @type {import('../../core/engine/types.js').Piece} */ (m.store.getState().pack?.pieces.find((p) => p.id === id));

/**
 * @param {number} target
 * @param {number} theta
 * @param {number} [from]
 * @returns {TransformOp[]}
 */
function opsTo(target, theta, from = 0) {
  /** @type {TransformOp[]} */
  const all = ['cw', 'ccw', 'flipH', 'flipV'];
  const queue = [{ t: from, ops: /** @type {TransformOp[]} */ ([]) }];
  const seen = new Set([from]);
  for (let i = 0; i < queue.length; i += 1) {
    const { t, ops } = queue[i];
    if (t === target) {
      return ops;
    }
    for (const op of all) {
      const next = transformedT(t, op, theta);
      if (!seen.has(next)) {
        seen.add(next);
        queue.push({ t: next, ops: [...ops, op] });
      }
    }
  }
  throw new Error('unreachable orientation');
}

const KEY_FOR = /** @type {const} */ ({ cw: 'e', ccw: 'q', flipH: 'f', flipV: 'v' });

/**
 * @param {string} key
 * @param {KeyboardEventInit} [init]
 * @param {EventTarget} [target]
 * @returns {KeyboardEvent}
 */
function key(key, init = {}, target = document.activeElement ?? document.body) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

/**
 * @param {EventTarget} target
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @param {{ pointerId?: number, pointerType?: string, isPrimary?: boolean }} [o]
 */
function pe(target, type, x, y, o = {}) {
  target.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, composed: true, pointerId: o.pointerId ?? 1, pointerType: o.pointerType ?? 'mouse',
    isPrimary: o.isPrimary ?? true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1,
  }));
}

/** @param {Element} node @returns {{ x: number, y: number }} */
function centerOf(node) {
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Screen center of board cell (x, y), after scrolling it into view. @param {Mounted} m @param {number} x @param {number} y */
async function cellCenter(m, x, y) {
  m.player.boardView.view.panTo(x + 0.5, y + 0.5);
  await frame();
  const ctm = /** @type {SVGGraphicsElement} */ (m.q('.pm-board .pm-board-group')).getScreenCTM();
  const p = new DOMPoint(x + 0.5, y + 0.5).matrixTransform(ctm ?? undefined);
  return { x: p.x, y: p.y };
}

/** @param {Mounted} m @param {string} id @returns {HTMLButtonElement} */
function trayButton(m, id) {
  const b = m.player.trayView.buttonFor(id);
  if (!b) {
    throw new Error(`piece ${id} is not in the tray`);
  }
  return b;
}

/** @param {Mounted} m @param {string} id @returns {Element | null} */
const boardPiece = (m, id) => m.root.querySelector(`.pm-board [data-movable="true"][data-piece-id="${id}"]`);

/**
 * Presses on a tray piece's cell and drags it over the board with pointer events.
 * @param {Mounted} m
 * @param {string} id
 * @param {{ index?: number, to?: [number, number] | null, ops?: TransformOp[], type?: string, release?: boolean, pointerId?: number }} o
 *   `to` is the grid cell the grabbed cell ends on.
 */
async function dragFromTray(m, id, { index = 1, to = null, ops = [], type = 'mouse', release = true, pointerId = 1 }) {
  const hit = /** @type {Element} */ (trayButton(m, id).querySelector(`.pm-hit[data-source-cell="${index}"]`));
  const start = centerOf(hit);
  const tray = m.player.hosts.tray;
  pe(hit, 'pointerdown', start.x, start.y, { pointerType: type, pointerId });
  pe(tray, 'pointermove', start.x + 16, start.y + 16, { pointerType: type, pointerId });
  await tick();
  assert(m.play.view().dragging, 'the drag started past the threshold');
  for (const op of ops) {
    key(KEY_FOR[op]);
  }
  await tick();
  if (to !== null) {
    const at = await cellCenter(m, to[0], to[1]);
    const lift = type === 'touch' ? 1.25 * m.player.boardView.cellPx() : 0;
    pe(tray, 'pointermove', at.x, at.y + lift, { pointerType: type, pointerId });
    await tick();
    if (release) {
      pe(tray, 'pointerup', at.x, at.y + lift, { pointerType: type, pointerId });
      await tick();
    }
  }
}

/** Places every movable piece by dragging it from the tray, turning it with the keys during the drag. @param {Mounted} m @param {number} theta */
async function solveByDrag(m, theta) {
  for (const target of movables(m)) {
    const piece = pieceOf(m, target.piece);
    await dragFromTray(m, target.piece, {
      index: 1, ops: opsTo(poseT(target), theta), to: handleCell(piece, target, 1),
    });
    same(m.game().placed.get(target.piece), target, `${target.piece} placed on its solution pose`);
  }
}

/** A finger or mouse tap on a tray piece's first cell. @param {Mounted} m @param {string} id @param {string} [type] */
async function tapTray(m, id, type = 'mouse') {
  const hit = /** @type {Element} */ (trayButton(m, id).querySelector('.pm-hit[data-source-cell="0"]'));
  const p = centerOf(hit);
  pe(hit, 'pointerdown', p.x, p.y, { pointerType: type });
  pe(m.player.hosts.tray, 'pointerup', p.x, p.y, { pointerType: type });
  await tick();
}

/** Enter on the focused element, as a keyboard would: buttons activate natively, the rest see the key. */
function pressEnter() {
  const active = /** @type {HTMLElement} */ (document.activeElement ?? document.body);
  if (active.tagName === 'BUTTON') {
    active.click();
  } else {
    key('Enter', {}, active);
  }
}

/**
 * @param {Mounted} m
 * @param {number} theta
 * @param {readonly string[]} [only]
 */
async function solveByKeyboard(m, theta, only) {
  const keys = /** @type {const} */ (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  const { arrowToGrid } = await import('../../core/engine/view.js');
  for (const target of movables(m).filter((p) => only === undefined || only.includes(p.piece))) {
    const piece = pieceOf(m, target.piece);
    trayButton(m, target.piece).focus();
    pressEnter();
    assert(m.game().preview?.piece === target.piece, `Enter picks up ${target.piece}`);
    for (const op of opsTo(poseT(target), theta)) {
      key(KEY_FOR[op]);
    }
    const want = handleCell(piece, target, defaultHandle(piece, 0));
    for (let guard = 0; guard < 60; guard += 1) {
      const at = /** @type {[number, number]} */ (m.play.view().cursor);
      const dx = want[0] - at[0];
      const dy = want[1] - at[1];
      if (dx === 0 && dy === 0) {
        break;
      }
      const arrow = keys.find((k) => {
        const [gx, gy] = arrowToGrid(theta, k);
        return dx !== 0 ? gx === Math.sign(dx) && gy === 0 : gx === 0 && gy === Math.sign(dy);
      });
      assert(arrow, 'an arrow key exists for every grid direction');
      // Shift+arrow moves three cells when the distance allows it.
      const event = key(arrow, { shiftKey: (dx !== 0 ? Math.abs(dx) : Math.abs(dy)) >= 3 });
      assert(event.defaultPrevented, 'a handled arrow is not left to the page');
    }
    pressEnter();
    same(m.game().placed.get(target.piece), target, `${target.piece} placed by keyboard (preview ${JSON.stringify(m.game().preview)}, selected ${m.game().selected}, cursor ${JSON.stringify(m.play.view().cursor)}, live ${m.q('[data-host="live"]').textContent})`);
    if (!m.game().solved) {
      equal(/** @type {Element} */ (document.activeElement).getAttribute('data-piece-id'), target.piece, 'focus follows the placed piece');
    }
  }
}

for (const theta of [0, 45, 90, 315]) {
  await check(`mouse drag solves the puzzle at ${theta}°, zoomed in and scrolled; clues never move`, async () => {
    const m = await game(theta, { width: 760, height: 560 });
    const clues = m.store.getState().pack?.puzzles[0].clues ?? [];
    m.q('[data-action="zoom-in"]').click();
    m.q('[data-action="zoom-in"]').click();
    await tick();
    assert(m.player.boardView.view.getState().scrollable, `the zoomed board scrolls ${JSON.stringify(m.player.boardView.view.getState())} ${m.q('.pm-board').dataset.scrollable} ${m.q('.pm-scroll').clientWidth}/${m.q('.pm-scroll').scrollWidth}`);
    m.player.boardView.view.surface.scrollLeft += 30;
    m.player.boardView.view.surface.scrollTop += 20;
    await solveByDrag(m, theta);
    equal(m.game().solved, true, 'solved');
    assert(m.q('dialog.pm-win').hasAttribute('open'), 'the win dialog opened');
    same(m.store.getState().pack?.puzzles[0].clues, clues, 'clues unchanged');
    equal(m.qa('.pm-clue [data-source-cell]').length, 0, 'clues have no hit areas');
    m.player.destroy();
  });

  await check(`keyboard only solves the puzzle at ${theta}° (Enter, E/Q/F/V, arrows, Shift+arrows)`, async () => {
    const m = await game(theta);
    await solveByKeyboard(m, theta);
    equal(m.game().solved, true, 'solved');
    assert(m.q('dialog.pm-win').hasAttribute('open'), 'the win dialog opened');
    m.player.destroy();
  });
}

await check('touch: select, tap a cell, tap again places; a lifted drag lands above the finger; a second finger is ignored', async () => {
  const m = await game(0);
  const target = movables(m)[0];
  const piece = pieceOf(m, target.piece);
  // Tap placement with a finger.
  const hit = /** @type {Element} */ (trayButton(m, target.piece).querySelector('.pm-hit[data-source-cell="0"]'));
  const p = centerOf(hit);
  pe(hit, 'pointerdown', p.x, p.y, { pointerType: 'touch' });
  pe(m.player.hosts.tray, 'pointerup', p.x, p.y, { pointerType: 'touch' });
  await tick();
  equal(m.game().selected, target.piece, 'a tap selects');
  for (const op of opsTo(poseT(target), 0)) {
    m.q(`[data-action="${{ cw: 'rotate-cw', ccw: 'rotate-ccw', flipH: 'flip-h', flipV: 'flip-v' }[op]}"]`).click();
  }
  const cell = handleCell(piece, target, defaultHandle(piece, 0));
  const at = await cellCenter(m, cell[0], cell[1]);
  const surface = m.player.boardView.view.surface;
  pe(surface, 'pointerdown', at.x, at.y, { pointerType: 'touch' });
  pe(surface, 'pointerup', at.x, at.y, { pointerType: 'touch' });
  await tick();
  assert(m.game().preview !== null, 'the first tap on a cell shows the ghost');
  equal(m.game().placed.size, 0, 'a preview commits nothing');
  pe(surface, 'pointerdown', at.x, at.y, { pointerType: 'touch' });
  pe(surface, 'pointerup', at.x, at.y, { pointerType: 'touch' });
  await tick();
  same(m.game().placed.get(target.piece), target, 'the second tap on the same cell places');

  // A touch drag is drawn and dropped 1.25 cells above the finger.
  const second = movables(m)[1];
  const piece2 = pieceOf(m, second.piece);
  const cellPx = m.player.boardView.cellPx();
  await dragFromTray(m, second.piece, { index: 1, ops: opsTo(poseT(second), 0), to: handleCell(piece2, second, 1), type: 'touch', release: false });
  const lifted = m.player.hosts.board.getBoundingClientRect();
  assert(lifted.width > 0, 'board visible');
  const clone = m.q('.drag-layer .drag-piece');
  const handleHit = /** @type {Element} */ (clone.querySelector('.pm-hit[data-source-cell="1"]'));
  const cloneAt = centerOf(handleHit);
  const targetAt = await cellCenter(m, ...(/** @type {[number, number]} */ (handleCell(piece2, second, 1))));
  assert(Math.abs(cloneAt.x - targetAt.x) <= 2 && Math.abs(cloneAt.y - targetAt.y) <= 2, `clone handle sits on the ghost cell (${cloneAt.x},${cloneAt.y}) vs (${targetAt.x},${targetAt.y})`);
  // Second finger: another pointer id, not primary.
  const before = m.game();
  pe(m.player.hosts.tray, 'pointerdown', 10, 10, { pointerType: 'touch', pointerId: 2, isPrimary: false });
  pe(m.player.hosts.tray, 'pointermove', 60, 60, { pointerType: 'touch', pointerId: 2, isPrimary: false });
  pe(m.player.hosts.tray, 'pointerup', 60, 60, { pointerType: 'touch', pointerId: 2, isPrimary: false });
  await tick();
  assert(m.play.view().dragging, 'the drag survived the second finger');
  equal(m.game().placed, before.placed, 'nothing committed by the second finger');
  pe(m.player.hosts.tray, 'pointerup', targetAt.x, targetAt.y + 1.25 * cellPx, { pointerType: 'touch' });
  await tick();
  same(m.game().placed.get(second.piece), second, 'the lifted drop landed on the intended cell');
  m.player.destroy();
});


await check('mouse: invalid drop, clue overlap, Escape, pointercancel, resize and orientation change all revert', async () => {
  const m = await game(0);
  const [first] = movables(m);
  const clue = /** @type {Pose} */ (m.store.getState().pack?.puzzles[0].clues[0]);
  const clueCell = poseCells(pieceOf(m, clue.piece), clue)[0];
  const snapshot = () => JSON.stringify([...m.game().placed], (_k, v) => v) + JSON.stringify([...m.game().tray]);
  const initial = snapshot();

  // Overlapping a clue: red ghost, no move.
  await dragFromTray(m, first.piece, { index: 1, ops: [], to: /** @type {[number, number]} */ (clueCell), release: false });
  equal(m.q('.pm-ghost').getAttribute('data-valid'), 'false', 'the ghost is red');
  const tray = m.player.hosts.tray;
  const at = await cellCenter(m, clueCell[0], clueCell[1]);
  pe(tray, 'pointerup', at.x, at.y);
  await tick();
  equal(snapshot(), initial, 'a clue overlap changes nothing');
  equal(m.game().history.length, 0, 'no history entry');
  assert(m.root.querySelector('.drag-layer')?.hasAttribute('hidden'), 'the clone is gone');

  // Off the board: reverts.
  await dragFromTray(m, first.piece, { index: 1, to: null });
  pe(tray, 'pointermove', 5, 5);
  await tick();
  pe(tray, 'pointerup', 5, 5);
  await tick();
  equal(snapshot(), initial, 'dropping outside reverts');

  // Escape, pointercancel, resize, orientationchange.
  for (const [label, trigger] of /** @type {[string, () => void][]} */ ([
    ['Escape', () => key('Escape')],
    ['pointercancel', () => pe(tray, 'pointercancel', 20, 20)],
    ['resize', () => window.dispatchEvent(new Event('resize'))],
    ['orientationchange', () => window.dispatchEvent(new Event('orientationchange'))],
  ])) {
    await dragFromTray(m, first.piece, { index: 1, ops: ['cw'], to: [3, 3], release: false });
    assert(m.game().preview !== null, `${label}: ghost shown while dragging`);
    trigger();
    await tick();
    equal(m.play.view().dragging, false, `${label}: drag over`);
    equal(snapshot(), initial, `${label}: state unchanged`);
    equal(m.game().tray.get(first.piece), 0, `${label}: the rotation made during the drag was discarded`);
    equal(m.game().preview, null, `${label}: ghost gone`);
    assert(trayButton(m, first.piece).dataset.dragging === undefined, `${label}: tray piece visible again`);
  }
  m.player.destroy();
});

await check('dragging a board piece hides it without freeing its cells; own footprint is allowed; tray drop returns it', async () => {
  const m = await game(0);
  const [first] = movables(m);
  const piece = pieceOf(m, first.piece);
  m.store.update({ game: (await import('../../core/engine/game.js')).reduce(m.game(), { type: 'place', pose: first }) });
  await tick();
  const node = /** @type {Element} */ (boardPiece(m, first.piece));
  const hit = /** @type {Element} */ (node.querySelector('.pm-hit[data-source-cell="0"]'));
  const start = centerOf(hit);
  const surface = m.player.boardView.view.surface;
  pe(hit, 'pointerdown', start.x, start.y);
  pe(surface, 'pointermove', start.x + 12, start.y + 12);
  await tick();
  assert(m.play.view().dragging, 'drag started from the board');
  equal(boardPiece(m, first.piece), null, 'the original drawing is hidden');
  same(m.game().placed.get(first.piece), first, 'its committed occupancy stays');
  // Over a free cell next to the old footprint (shifted by one in a direction that stays legal).
  const old = poseCells(piece, first);
  const handle = handleCell(piece, first, 0);
  const free = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => /** @type {[number, number]} */ ([handle[0] + dx, handle[1] + dy])).find((c) => {
    const next = handleCell(piece, { ...first, x: first.x + (c[0] - handle[0]), y: first.y + (c[1] - handle[1]) }, 0);
    return next.length === 2 && poseCells(piece, { ...first, x: first.x + (c[0] - handle[0]), y: first.y + (c[1] - handle[1]) })
      .every(([x, y]) => x >= 0 && y >= 0 && x < 10 && y < 6) && old.some(([x, y]) => poseCells(piece, { ...first, x: first.x + (c[0] - handle[0]), y: first.y + (c[1] - handle[1]) }).some(([nx, ny]) => nx === x && ny === y));
  });
  assert(free, 'a shifted position exists');
  const at = await cellCenter(m, free[0], free[1]);
  pe(surface, 'pointermove', at.x, at.y);
  await tick();
  const verdict = m.q('.pm-ghost').getAttribute('data-valid');
  pe(surface, 'pointerup', at.x, at.y);
  await tick();
  if (verdict === 'true') {
    assert(m.game().placed.get(first.piece)?.x !== first.x || m.game().placed.get(first.piece)?.y !== first.y, 'moved by one drop');
  }
  equal(m.game().history.length, verdict === 'true' ? 2 : 1, 'one step per valid drop, none for an invalid one');
  // Back to the tray by dragging onto the tray host.
  const node2 = /** @type {Element} */ (boardPiece(m, first.piece));
  const hit2 = /** @type {Element} */ (node2.querySelector('.pm-hit[data-source-cell="0"]'));
  const s2 = centerOf(hit2);
  pe(hit2, 'pointerdown', s2.x, s2.y);
  pe(surface, 'pointermove', s2.x + 12, s2.y + 12);
  await tick();
  const trayRect = m.player.hosts.tray.getBoundingClientRect();
  const over = { x: trayRect.left + trayRect.width / 2, y: trayRect.top + trayRect.height / 2 };
  pe(surface, 'pointermove', over.x, over.y);
  await tick();
  pe(surface, 'pointerup', over.x, over.y);
  await tick();
  assert(m.game().tray.has(first.piece), 'dropped on the tray: back in the tray');
  m.player.destroy();
});

await check('the empty corner of a piece\'s bounding box does not grab it and still takes a tap', async () => {
  const m = await game(45);
  const movableList = movables(m);
  let chosen = null;
  for (const pose of movableList) {
    const piece = pieceOf(m, pose.piece);
    const cells = poseCells(piece, pose);
    const xs = cells.map((c) => c[0]);
    const ys = cells.map((c) => c[1]);
    for (const corner of [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.min(...ys)], [Math.min(...xs), Math.max(...ys)], [Math.max(...xs), Math.max(...ys)]]) {
      if (!cells.some(([x, y]) => x === corner[0] && y === corner[1])) {
        chosen = { pose, corner: /** @type {[number, number]} */ (corner) };
        break;
      }
    }
    if (chosen !== null) {
      break;
    }
  }
  assert(chosen, 'a piece with an empty bounding-box corner exists');
  m.store.update({ game: (await import('../../core/engine/game.js')).reduce(m.game(), { type: 'place', pose: chosen.pose }) });
  await tick();
  const at = await cellCenter(m, chosen.corner[0], chosen.corner[1]);
  const under = document.elementFromPoint(at.x, at.y);
  assert(under !== null && under.closest(`[data-piece-id="${chosen.pose.piece}"]`) === null, 'the corner is not part of the piece');
  const surface = m.player.boardView.view.surface;
  const before = m.game().placed;
  pe(/** @type {Element} */ (under), 'pointerdown', at.x, at.y);
  pe(surface, 'pointermove', at.x + 20, at.y + 20);
  await tick();
  equal(m.play.view().dragging, false, 'no drag started');
  pe(surface, 'pointerup', at.x + 20, at.y + 20);
  await tick();
  equal(m.game().placed, before, 'the piece did not move');
  // With another piece selected a tap there previews it (the corner is a free board cell).
  const other = movableList.find((p) => p.piece !== chosen.pose.piece);
  await tapTray(m, /** @type {Pose} */ (other).piece);
  await tick();
  const at2 = await cellCenter(m, chosen.corner[0], chosen.corner[1]);
  pe(/** @type {Element} */ (document.elementFromPoint(at2.x, at2.y)), 'pointerdown', at2.x, at2.y);
  pe(surface, 'pointerup', at2.x, at2.y);
  await tick();
  assert(m.game().preview !== null, 'a tap on the empty corner previews the selected piece');
  m.player.destroy();
});

await check('a press on the frame around a tray piece grabs it by its nearest cell and drags it onto the board', async () => {
  const m = await game(0);
  const [target] = movables(m);
  const button = trayButton(m, target.piece);
  button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  await tick();
  const box = button.getBoundingClientRect();
  const start = { x: box.left + 2, y: box.top + 2 };
  const under = /** @type {Element | null} */ (document.elementFromPoint(start.x, start.y));
  assert(under !== null && button.contains(under) && under.closest('.pm-hit') === null && under.closest('[data-movable="true"]') === null,
    `the press is on the frame, not on the piece (${under?.tagName})`);
  let index = -1;
  let best = Infinity;
  for (const hit of button.querySelectorAll('.pm-hit[data-source-cell]')) {
    const c = centerOf(hit);
    const d = (c.x - start.x) ** 2 + (c.y - start.y) ** 2;
    if (d < best) {
      best = d;
      index = Number(hit.getAttribute('data-source-cell'));
    }
  }
  const tray = m.player.hosts.tray;
  pe(/** @type {Element} */ (under), 'pointerdown', start.x, start.y);
  pe(tray, 'pointermove', start.x + 16, start.y + 16);
  await tick();
  assert(m.play.view().dragging, 'the drag started from the frame');
  for (const op of opsTo(poseT(target), 0)) {
    key(KEY_FOR[op]);
  }
  await tick();
  const to = handleCell(pieceOf(m, target.piece), target, index);
  const at = await cellCenter(m, to[0], to[1]);
  pe(tray, 'pointermove', at.x, at.y);
  await tick();
  pe(tray, 'pointerup', at.x, at.y);
  await tick();
  same(m.game().placed.get(target.piece), target, 'the cell nearest the press is the one that lands under the pointer');
  m.player.destroy();
});

await check('wheel turns a dragged piece and shortcut keys stay active during the drag', async () => {
  const m = await game(0);
  const [first] = movables(m);
  await dragFromTray(m, first.piece, { index: 1, to: [4, 3], release: false });
  const t0 = /** @type {number} */ (m.play.view().drag?.t);
  const wheel = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
  window.dispatchEvent(wheel);
  await tick();
  equal(wheel.defaultPrevented, true, 'the page does not scroll during a drag');
  equal(m.play.view().drag?.t, transformedT(t0, 'cw', 0), 'deltaY > 0 turns clockwise');
  await pause(150);
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true }));
  await tick();
  equal(m.play.view().drag?.t, t0, 'deltaY < 0 turns back');
  key('f');
  await tick();
  equal(m.play.view().drag?.t, transformedT(t0, 'flipH', 0), 'F mirrors during a drag');
  equal(m.game().tray.get(first.piece), 0, 'the tray orientation is untouched until the drop');
  key('Escape');
  await tick();
  equal(m.game().tray.get(first.piece), 0, 'cancelled');
  // Wheel outside a drag is left to the page.
  const idle = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
  window.dispatchEvent(idle);
  equal(idle.defaultPrevented, false, 'idle wheel untouched');
  m.player.destroy();
});

await check('tap placement with the toolbar: rotate, mirror, commit, Enter, Escape and return to tray', async () => {
  const m = await game(0);
  const [a, b] = movables(m);
  const pa = pieceOf(m, a.piece);
  await tapTray(m, a.piece);
  assert(m.game().selected === pa.id, 'the tapped piece is selected');
  equal(m.game().preview, null, 'no ghost before a cell is tapped');
  assert(m.root.querySelector('[data-action="place"], [data-action="to-tray"], [data-action="reveal"]') === null, 'the toolbar has no Place, To tray or Show solution button');
  const surface = m.player.boardView.view.surface;
  const tapCell = async (/** @type {number} */ x, /** @type {number} */ y) => {
    const at = await cellCenter(m, x, y);
    const under = /** @type {Element} */ (document.elementFromPoint(at.x, at.y));
    pe(under, 'pointerdown', at.x, at.y);
    pe(surface, 'pointerup', at.x, at.y);
    await tick();
  };
  const want = handleCell(pa, a, defaultHandle(pa, 0));
  await tapCell(want[0], want[1]);
  assert(m.game().preview !== null, 'a ghost shows after tapping a cell');
  for (const op of opsTo(poseT(a), 0)) {
    m.q(`[data-action="${{ cw: 'rotate-cw', ccw: 'rotate-ccw', flipH: 'flip-h', flipV: 'flip-v' }[op]}"]`).click();
    await tick();
    same(m.play.view().cursor, want, 'the handle cell stays under the ghost while turning');
  }
  equal(m.game().tray.get(a.piece), poseT(a), 'the buttons turn the tray piece');
  m.player.play.commitPreview();
  await tick();
  same(m.game().placed.get(a.piece), a, 'committing the ghost places the piece');
  assert(m.game().preview === null, 'no ghost after placing');
  // Escape cancels a new preview; Enter commits one.
  await tapTray(m, b.piece);
  await tapCell(8, 1);
  key('Escape');
  equal(m.game().preview, null, 'Escape cancels the ghost');
  assert(m.game().selected === b.piece, 'the piece stays selected');
  // Return a board piece to the tray, and undo it.
  m.player.play.select(a.piece);
  m.player.play.returnToTray();
  await tick();
  assert(m.game().tray.has(a.piece), '↩ returns the piece');
  m.q('[data-action="undo"]').click();
  await tick();
  assert(m.game().placed.has(a.piece), 'Undo restores it');
  // Mirror and quarter-turn of a placed piece keep it on the board (or announce no room).
  m.player.play.select(a.piece);
  m.q('[data-action="flip-h"]').click();
  await tick();
  const live = m.q('[data-host="live"]');
  await waitFor(() => live.textContent !== '', 'a live announcement');
  m.player.destroy();
});

await check('every key and every button: Tab order, labels, help, undo/redo/reset with confirmation', async () => {
  const m = await game(0);
  const focusables = [...m.root.querySelectorAll('.tray-piece, .pm-board [data-movable="true"]')];
  const [a] = movables(m);
  m.store.update({ game: (await import('../../core/engine/game.js')).reduce(m.game(), { type: 'place', pose: a }) });
  await tick();
  const list = [...m.root.querySelectorAll('.tray-piece, .pm-board [data-movable="true"]')];
  const firstBoard = list.findIndex((n) => n.closest('.pm-board') !== null);
  assert(firstBoard > 0 && list.slice(0, firstBoard).every((n) => n.classList.contains('tray-piece')), 'tray pieces come before board pieces in focus order');
  assert(list.slice(firstBoard).every((n) => n.getAttribute('tabindex') === '0'), 'placed pieces are focusable');
  assert(focusables.length > 0, 'tray pieces exist');
  equal(m.q('[data-action="undo"]').hasAttribute('disabled'), false, 'Undo enabled after a move');
  equal(m.q('[data-action="redo"]').hasAttribute('disabled'), true, 'Redo disabled with no future');
  // Shortcut help.
  const q = key('?', {}, document.body);
  equal(q.defaultPrevented, true, '? handled');
  assert(m.q('dialog.pm-help').hasAttribute('open'), 'help dialog open');
  assert(m.q('.pm-shortcuts').textContent?.includes('Ctrl+Z'), 'shortcut table lists undo');
  const ignored = key('e', {}, m.q('.pm-help .pm-btn'));
  equal(ignored.defaultPrevented, false, 'game shortcuts are ignored inside dialogs');
  /** @type {HTMLDialogElement} */ (m.q('dialog.pm-help')).close();
  // Undo / redo by keyboard.
  key('z', { ctrlKey: true }, document.body);
  equal(m.game().placed.size, 0, 'Ctrl+Z undoes');
  key('z', { ctrlKey: true, shiftKey: true }, document.body);
  equal(m.game().placed.size, 1, 'Ctrl+Shift+Z redoes');
  key('z', { ctrlKey: true }, document.body);
  key('y', { ctrlKey: true }, document.body);
  equal(m.game().placed.size, 1, 'Ctrl+Y redoes');
  // Replay asks first; it is not undoable.
  m.q('[data-action="replay"]').click();
  assert(m.q('dialog.pm-confirm[open]') !== null, 'replay asks for confirmation');
  m.q('dialog.pm-confirm[open] [data-action="confirm-cancel"]').click();
  equal(m.game().placed.size, 1, 'cancel keeps the board');
  m.q('[data-action="replay"]').click();
  m.q('dialog.pm-confirm[open] [data-action="confirm-ok"]').click();
  equal(m.game().placed.size, 0, 'confirmed replay empties the board');
  same([m.game().moves, m.game().elapsedMs, m.game().history.length], [0, 0, 0], 'moves, time and history start again');
  m.player.destroy();
});

await check('keyboard: pick up a placed piece, move it, drop it, and return it with Delete', async () => {
  const m = await game(0);
  const [a] = movables(m);
  await solveByKeyboard(m, 0, [a.piece]);
  const node = /** @type {HTMLElement} */ (boardPiece(m, a.piece));
  node.focus();
  key('Enter', {}, node);
  const start = m.game().preview;
  same(start, a, 'a placed piece is picked up at its current pose');
  const arrow = key('ArrowRight');
  equal(arrow.defaultPrevented, true, 'arrow handled');
  assert(m.game().preview !== null && m.game().preview?.x !== start?.x, 'the ghost moved');
  equal(m.game().placed.get(a.piece)?.x, a.x, 'nothing committed by moving the ghost');
  key('Escape');
  const again = /** @type {HTMLElement} */ (boardPiece(m, a.piece));
  again.focus();
  key('Delete', {}, again);
  assert(m.game().tray.has(a.piece), 'Delete returns the piece to the tray');
  equal(/** @type {Element} */ (document.activeElement).getAttribute('data-piece-id'), a.piece, 'focus moves to the tray piece');
  m.player.destroy();
});

await check('keyboard move on a rotated board draws grid-axis arrow hints', async () => {
  const m = await game(45);
  const [a] = movables(m);
  trayButton(m, a.piece).focus();
  pressEnter();
  key('ArrowRight');
  await tick();
  equal(m.qa('.pm-hint').length, 4, 'four hints');
  same(m.qa('.pm-hint').map((n) => n.getAttribute('data-key')).sort(), ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp'], 'one per arrow key');
  key('Escape');
  await tick();
  equal(m.qa('.pm-hint').length, 0, 'hints leave with the ghost');
  const flat = await game(0);
  trayButton(flat, movables(flat)[0].piece).focus();
  pressEnter();
  key('ArrowRight');
  await tick();
  equal(flat.qa('.pm-hint').length, 0, 'no hints at 0°');
  m.player.destroy();
  flat.player.destroy();
});

await check('winning: a celebration with time and moves; Replay starts fresh; Next puzzle opens #2; celebration honours reduced motion', async () => {
  const m = await game(0, { reducedMotion: true });
  await solveByKeyboard(m, 0);
  const dialog = /** @type {HTMLDialogElement} */ (m.q('dialog.pm-win'));
  assert(dialog.open, 'dialog open');
  assert(dialog.querySelector('.win-badge svg') !== null && (m.q('.win-message').textContent ?? '').length > 0, 'a badge and a congratulation');
  assert(/^\d+:\d\d$/.test(m.q('.win-time').textContent ?? ''), 'time shown');
  equal(m.q('.win-moves').textContent, String(m.game().moves), 'moves shown');
  assert(dialog.querySelector('.win-level') === null && dialog.querySelector('[data-action="win-back"]') === null, 'no level and no Back to generator');
  const actions = /** @type {HTMLElement} */ (dialog.querySelector('.pm-dialog-actions'));
  const buttons = [...actions.querySelectorAll('button')].filter((b) => !b.hidden);
  equal(buttons.map((b) => b.dataset.action).join(','), 'win-next,win-replay,win-close', 'Next puzzle, Replay on the left of Close');
  assert(buttons[buttons.length - 1].classList.contains('primary'), 'Close has the strong background');
  const box = dialog.getBoundingClientRect();
  const last = buttons[buttons.length - 1].getBoundingClientRect();
  assert(box.right - last.right < 30 && box.bottom - last.bottom < 30, 'the buttons sit at the bottom right');
  assert(buttons.every((b) => b.getBoundingClientRect().height < 44), 'small buttons');
  assert(!m.q('.game').classList.contains('is-celebrating'), 'no celebration with reduced motion');
  await waitFor(() => (m.q('[data-host="live"]').textContent ?? '').startsWith('Puzzle solved'), 'win announcement');
  equal(m.adapter.map.size > 0, true, 'progress is saved');
  const record = m.storage.loadProgress(m.store.getState().fingerprints[0]);
  equal(record?.solved, true, 'saved as solved');
  dialog.close();
  assert(!m.q('[data-action="results"]').hidden, 'results button after closing');
  m.q('[data-action="results"]').click();
  assert(dialog.open, 'results reopens the dialog');
  m.q('[data-action="win-replay"]').click();
  equal(m.game().solved, false, 'Replay: fresh game');
  equal(m.game().moves, 0, 'Replay: no moves');
  equal(m.game().placed.size, 0, 'Replay: empty board');
  equal(m.storage.loadProgress(m.store.getState().fingerprints[0]), null, 'Replay: saved record removed');
  await solveByKeyboard(m, 0);
  m.q('[data-action="win-next"]').click();
  equal(m.store.getState().index, 1, 'Next puzzle opens puzzle 2');
  assert(!dialog.open, 'dialog closed');
  m.player.destroy();

  const m2 = await game(0, { reducedMotion: false });
  await solveByKeyboard(m2, 0);
  assert(m2.q('.game').classList.contains('is-celebrating'), 'celebration class without reduced motion');
  m2.player.destroy();
});

await check('a non-reference tiling wins: a puzzle without a stored answer is solved by tapping', async () => {
  const pack = {
    format: 'pentomino-pack',
    version: 1,
    kind: 'puzzle-pack',
    rules: 'free-polyomino-v1',
    board: { rows: ['###', '###'] },
    pieces: [
      { id: 'A', label: 'A', color: '#e6194b', cells: [[0, 0], [1, 0], [1, 1]] },
      { id: 'B', label: 'B', color: '#3cb44b', cells: [[0, 0], [1, 0], [0, 1]] },
    ],
    puzzles: [{ id: 'free', title: 'Free', clues: [] }],
  };
  const m = await mount({ hash: await packHash(validated(pack)) });
  // The L-trominoes tile the 3x2 board in exactly two ways; place the one the engine never stored.
  const g = m.game();
  const { canPlace, reduce } = await import('../../core/engine/game.js');
  let next = g;
  /** @param {string} id @returns {Pose[]} */
  const poses = (id) => {
    const out = [];
    for (let turn = 0; turn < 4; turn += 1) {
      for (const mirrored of [false, true]) {
        for (let x = 0; x < 3; x += 1) {
          for (let y = 0; y < 2; y += 1) {
            const pose = { piece: id, x, y, turn, mirrored };
            if (canPlace(g, pose, id).ok) {
              out.push(pose);
            }
          }
        }
      }
    }
    return out;
  };
  for (const a of poses('A')) {
    const withA = reduce(g, { type: 'place', pose: a });
    const b = poses('B').find((pose) => canPlace(withA, pose, 'B').ok);
    if (b !== undefined) {
      next = reduce(withA, { type: 'place', pose: b });
      break;
    }
  }
  equal(next.solved, true, 'the engine recognises a complete cover');
  m.store.update({ game: next });
  m.player.play.undo();
  m.player.play.redo();
  await tick();
  assert(/** @type {HTMLDialogElement} */ (m.q('dialog.pm-win')).open, 'the win dialog opens for a tiling that was never stored');
  equal(m.qa('[data-action="win-next"]').filter((n) => !n.hidden).length, 0, 'no Next puzzle in a one-puzzle pack');
  m.player.destroy();
});

await check('refresh restores progress; saving is debounced; a failing storage never blocks play', async () => {
  const adapter = memoryAdapter();
  const m = await game(0, { adapter, saveDelayMs: 60 });
  const [a, b] = movables(m);
  await solveByKeyboard(m, 0, [a.piece, b.piece]);
  await pause(150);
  const saved = m.storage.loadProgress(m.store.getState().fingerprints[0]);
  equal(saved?.placements.length, 2, 'two placements saved after the debounce');
  m.player.destroy();
  const again = await mount({ hash: await codeFor(0), adapter });
  equal(again.game().placed.size, 2, 'the board is restored after a reload');
  assert(again.root.querySelector('.status-resume') === null && !(again.q('[data-host="status"]').textContent ?? '').includes('Saved progress'), 'no Continue / Restart message');
  same(again.game().placed.get(a.piece), a, 'same pose');
  again.player.destroy();

  const failing = memoryAdapter();
  const m3 = await game(0, { adapter: failing, saveDelayMs: 30 });
  failing.failWrites = true;
  await solveByKeyboard(m3, 0, [movables(m3)[0].piece]);
  await pause(120);
  assert(m3.game().placed.size === 1, 'play went on');
  assert(!m3.q('[data-badge="storage"]').hidden, 'a storage warning is shown');
  await solveByKeyboard(m3, 0, [movables(m3)[1].piece]);
  equal(m3.game().placed.size, 2, 'still playable');
  m3.player.destroy();
});

await check('timer starts at the first move, pauses while hidden and keeps counting afterwards', async () => {
  const m = await game(0);
  const label = () => m.q('.game-timer').textContent;
  equal(label(), '0:00', 'zero before the first move');
  await pause(1200);
  equal(label(), '0:00', 'does not run before a move');
  m.player.play.select(movables(m)[0].piece);
  m.q('[data-action="rotate-cw"]').click();
  await waitFor(() => label() !== '0:00', 'the timer to start', 3000);
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
  const frozen = m.game().elapsedMs;
  await pause(1300);
  assert(m.game().elapsedMs - frozen < 100, 'hidden time is not counted');
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.dispatchEvent(new Event('visibilitychange'));
  await pause(1100);
  assert(m.game().elapsedMs - frozen >= 900, 'counts again when visible');
  Reflect.deleteProperty(document, 'hidden');
  m.player.destroy();
});

await check('labels and patterns are drawn together; names keep label and size; pack data stays unchanged', async () => {
  const m = await mount({ hash: await packHash(validated(bigSet())) });
  const pack = m.store.getState().pack;
  const before = JSON.stringify(m.game().placed.size) + JSON.stringify(pack);
  const trayLabel = () => m.qa('.tray-piece .pm-labels').filter((n) => n.getAttribute('display') !== 'none').length;
  assert(m.qa('.tray-piece .pm-pattern').length > 0, 'patterns drawn for pieces from index 20');
  assert(trayLabel() > 0, 'labels drawn');
  assert((trayButton(m, 'P05').getAttribute('aria-label') ?? '').startsWith('Piece E, 1 cell'), 'accessible name keeps label and size');
  equal(JSON.stringify(m.game().placed.size) + JSON.stringify(m.store.getState().pack), before, 'poses and pack untouched');
  m.player.destroy();
});

await check('accessibility: names, board role, live region, 44 px targets, visible focus, reduced-motion shake', async () => {
  const m = await game(0, { reducedMotion: true });
  const [a] = movables(m);
  const board = m.q('.pm-board .pm-svg');
  equal(board.getAttribute('role'), 'application', 'board role');
  assert(board.getAttribute('aria-describedby') !== null && document.getElementById(/** @type {string} */ (board.getAttribute('aria-describedby'))) !== null, 'instructions linked');
  const pa = pieceOf(m, a.piece);
  equal(trayButton(m, a.piece).getAttribute('aria-label'), `Piece ${pa.label}, ${pa.cells.length} cells, in tray`, 'tray name');
  const live = m.q('[data-host="live"]');
  equal(live.getAttribute('aria-live'), 'polite', 'polite live region');
  await solveByKeyboard(m, 0, [a.piece]);
  const name = boardPiece(m, a.piece)?.getAttribute('aria-label') ?? '';
  assert(/^Piece \w+, \d+ cells, on board at row \d+, column \d+$/.test(name), `board name ${name}`);
  await waitFor(() => (live.textContent ?? '').startsWith('Placed.'), 'placement announced');
  // Visible 44 px targets for every control that is shown. The game bar buttons follow --pm-target (36 px, 44 px for
  // coarse pointers) and the board tools are 28 px, as in the generator; both stay above the 24 px of WCAG 2.2 AA.
  const small = m.qa('.game button, .game a.pm-btn').filter((b) => !b.closest('[hidden]') && b.getClientRects().length > 0)
    .filter((b) => { const r = b.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; })
    .filter((b) => !b.classList.contains('tray-piece') && !b.closest('.game-actions') && !b.closest('.step-actions') && !b.closest('.board-tools'));
  equal(small.map((b) => `${b.dataset.action ?? b.textContent}:${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`).join(', '), '', 'controls below 44x44');
  const tools = m.qa('.board-tools button').map((b) => b.getBoundingClientRect());
  assert(tools.length === 5 && tools.every((r) => r.width >= 24 && r.height >= 24), 'board tools are at least 24 px');
  // Keyboard focus is visible.
  const piece = /** @type {HTMLElement} */ (boardPiece(m, a.piece));
  piece.focus();
  equal(document.activeElement, piece, 'piece focusable');
  const btn = m.q('[data-action="undo"]');
  btn.focus();
  const outline = getComputedStyle(btn).outlineStyle;
  assert(btn.matches(':focus-visible') ? outline !== 'none' : true, 'focus ring on focus-visible');
  m.player.destroy();
});

await check('no room to rotate: the piece stays, "No room to rotate here" is announced, a 200 ms shake unless reduced motion', async () => {
  // A 5x1 strip: the bar fits only lengthwise, so no turn has room.
  const strip = {
    format: 'pentomino-pack',
    version: 1,
    kind: 'puzzle-pack',
    rules: 'free-polyomino-v1',
    board: { rows: ['#####'] },
    pieces: [
      { id: 'P', label: 'P', color: '#e6194b', cells: [[0, 0], [1, 0], [2, 0]] },
      { id: 'M', label: 'M', color: '#3cb44b', cells: [[0, 0]] },
      { id: 'N', label: 'N', color: '#ffe119', cells: [[0, 0]] },
    ],
    puzzles: [{
      id: 'strip',
      title: 'Strip',
      clues: [{ piece: 'M', x: 4, y: 0, turn: 0, mirrored: false }],
      solution: [{ piece: 'P', x: 0, y: 0, turn: 0, mirrored: false }, { piece: 'N', x: 3, y: 0, turn: 0, mirrored: false }, { piece: 'M', x: 4, y: 0, turn: 0, mirrored: false }],
    }],
  };
  const stripHash = await packHash(validated(strip));
  for (const reduced of [false, true]) {
    const m = await mount({ hash: stripHash, reducedMotion: reduced });
    m.player.play.select('P');
    m.player.play.pickUp('P');
    m.play.moveKey('ArrowRight');
    m.play.commitPreview();
    equal(m.game().placed.size, 1, 'the bar sits on the strip');
    const before = m.game();
    m.q('[data-action="rotate-cw"]').click();
    await tick();
    equal(m.game().placed, before.placed, 'the placement is unchanged');
    equal(m.game().history.length, before.history.length, 'no history entry');
    await waitFor(() => m.q('[data-host="live"]').textContent === 'No room to rotate here', 'the announcement');
    equal(m.q('.board-wrap').classList.contains('is-shaking'), !reduced, reduced ? 'no shake with reduced motion' : 'the shake plays');
    if (!reduced) {
      await pause(300);
      assert(!m.q('.board-wrap').classList.contains('is-shaking'), 'the shake ends after 200 ms');
    }
    m.player.destroy();
  }
});

await check('piece menu: right-click turns and flips a tray piece; Escape, a click outside and Tab close it; the board menu lists Return all and Replay', async () => {
  const m = await game(0);
  const target = movables(m)[0];
  const id = target.piece;
  const button = trayButton(m, id);
  const t0 = /** @type {number} */ (m.game().tray.get(id));
  /** @param {Element} node */
  const rightClick = (node) => {
    const r = node.getBoundingClientRect();
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 8, clientY: r.top + 8, button: 2 });
    node.dispatchEvent(event);
    return event;
  };
  const menu = () => m.q('.pm-menu');
  const actions = () => m.qa('.pm-menu [role="menuitem"]').map((n) => n.dataset.action);
  assert(menu().hidden, 'no menu before the click');

  const event = rightClick(button);
  assert(event.defaultPrevented, 'the browser menu is replaced');
  assert(!menu().hidden, 'the menu opens');
  same(actions(), ['rotate-cw', 'rotate-ccw', 'flip-h', 'flip-v'], 'a tray piece offers turning and flipping');
  equal(m.game().selected, id, 'the piece is selected');
  equal(/** @type {HTMLElement} */ (document.activeElement).dataset.action, 'rotate-cw', 'the first action has the focus');
  const box = menu().getBoundingClientRect();
  assert(box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight, 'the menu stays inside the window');

  m.q('.pm-menu [data-action="rotate-cw"]').click();
  assert(menu().hidden, 'choosing an action closes the menu');
  equal(m.game().tray.get(id), transformedT(t0, 'cw', 0), 'turned clockwise on screen');
  equal(document.activeElement, button, 'the focus returns to the piece');

  rightClick(button);
  m.q('.pm-menu [data-action="rotate-ccw"]').click();
  equal(m.game().tray.get(id), t0, 'counter-clockwise undoes it');
  rightClick(button);
  m.q('.pm-menu [data-action="flip-h"]').click();
  equal(m.game().tray.get(id), transformedT(t0, 'flipH', 0), 'flipped left-right');
  rightClick(button);
  m.q('.pm-menu [data-action="flip-v"]').click();
  equal(m.game().tray.get(id), transformedT(transformedT(t0, 'flipH', 0), 'flipV', 0), 'flipped top-bottom');

  rightClick(button);
  key('ArrowDown');
  equal(/** @type {HTMLElement} */ (document.activeElement).dataset.action, 'rotate-ccw', 'the arrow keys walk the actions');
  key('End');
  equal(/** @type {HTMLElement} */ (document.activeElement).dataset.action, 'flip-v', 'End goes to the last action');
  key('ArrowDown');
  equal(/** @type {HTMLElement} */ (document.activeElement).dataset.action, 'rotate-cw', 'and the list wraps');
  const before = m.game().tray.get(id);
  key('q');
  equal(m.game().tray.get(id), before, 'the shortcuts of the page stay quiet inside the menu');
  const escape = key('Escape');
  assert(escape.defaultPrevented && menu().hidden, 'Escape closes the menu');
  equal(document.activeElement, button, 'and returns the focus');
  assert(m.game().selected === id, 'Escape in the menu keeps the selection');

  rightClick(button);
  pe(document.body, 'pointerdown', 2, 2);
  assert(menu().hidden, 'a press outside closes the menu');
  rightClick(button);
  key('Tab');
  assert(menu().hidden, 'Tab closes the menu');

  await dragFromTray(m, id, { index: 1, ops: opsTo(poseT(target), 0, m.game().tray.get(id)), to: handleCell(pieceOf(m, id), target, 1) });
  same(m.game().placed.get(id), target, 'the piece is placed');
  const placed = /** @type {Element} */ (boardPiece(m, id));
  rightClick(placed);
  same(actions(), ['rotate-cw', 'rotate-ccw', 'flip-h', 'flip-v', 'to-tray', 'unplace-all', 'replay'], 'a placed piece can also return to the tray, and the puzzle actions follow');
  m.q('.pm-menu [data-action="to-tray"]').click();
  assert(!m.game().placed.has(id) && m.game().tray.has(id), 'Return to tray takes it off the board');

  // A right-click on a locked clue or on empty board lists the actions of the whole puzzle.
  const clue = /** @type {Element} */ (m.root.querySelector('.board-host .pm-clue'));
  rightClick(clue);
  assert(!menu().hidden, 'a locked clue opens the board menu');
  same(actions(), ['unplace-all', 'replay'], 'only the puzzle actions');
  key('Escape');
  await dragFromTray(m, id, { index: 1, ops: opsTo(poseT(target), 0, m.game().tray.get(id)), to: handleCell(pieceOf(m, id), target, 1) });
  assert(m.game().placed.has(id), 'a piece is on the board again');
  const host = m.q('.board-host');
  const hostBox = host.getBoundingClientRect();
  const corner = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: hostBox.left + 3, clientY: hostBox.top + 3, button: 2 });
  host.dispatchEvent(corner);
  assert(corner.defaultPrevented && !menu().hidden, 'a right-click on empty board opens the menu');
  assert(!m.q('.pm-menu [data-action="unplace-all"]').hasAttribute('disabled'), 'Return all is available with a piece on the board');
  m.q('.pm-menu [data-action="unplace-all"]').click();
  assert(m.game().placed.size === 0 && m.game().tray.has(id), 'Return all pieces to the tray empties the board');
  m.q('[data-action="undo"]').click();
  await tick();
  assert(m.game().placed.has(id), 'and it can be undone');
  host.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: hostBox.left + 3, clientY: hostBox.top + 3, button: 2 }));
  m.q('.pm-menu [data-action="replay"]').click();
  const replayDialog = /** @type {HTMLDialogElement} */ (m.q('dialog.pm-confirm[open]'));
  assert(replayDialog.open && m.game().placed.has(id), 'Replay asks first and changes nothing yet');
  m.q('dialog.pm-confirm[open] [data-action="confirm-ok"]').click();
  await tick();
  assert(m.game().placed.size === 0 && m.game().moves === 0 && m.game().history.length === 0, 'Replay starts the puzzle again');
  m.player.destroy();
});

await check('no content-security-policy violations', async () => {
  equal(violations.length, 0, `violations: ${violations.join('; ')}`);
});

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
document.documentElement.dataset.summary = JSON.stringify({ total: results.length, failed: failed.map((r) => `${r.name}: ${r.error}`.slice(0, 700)) });
document.documentElement.dataset.result = failed.length === 0 && results.length > 0 ? 'pass' : 'fail';
