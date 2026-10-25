// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { canPlace, createGame, poseT, reduce, snapshot } from '../core/engine/game.js';
import { poseCells } from '../core/engine/geometry.js';
import { progressFingerprint } from '../core/engine/keys.js';
import { packBoard, parsePack } from '../core/engine/pack.js';
import { arrowToGrid, screenFlip } from '../core/engine/view.js';
import { createStorage } from '../core/browser/storage.js';
import {
  KICKS, SAVE_DELAY_MS, createPlayController, defaultHandle, handleCell, keyStep, orientedHandle, poseWithHandle, rotatePlaced,
  transformedT,
} from '../player/play.js';
import { cardHeading, puzzleDisplayName } from '../player/puzzle-title.js';
import { createPlayerController, createPlayerStore } from '../player/state.js';
import { PLAY_TEXT } from '../player/strings.js';
import { createKeyboard } from '../player/ui/keyboard.js';

/** @typedef {[number, number]} XYLike */
/** @typedef {import('../player/play.js').TransformOp} TransformOp */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').Pack} Pack */

const parsed = parsePack(readFileSync(new URL('../player/samples/sample-pack.json', import.meta.url), 'utf8'));
assert.ok(parsed.ok);
const sample = parsed.value;

/** Deterministic timers and clock. */
function createClock() {
  let time = Date.parse('2026-01-01T00:00:00Z');
  let seq = 0;
  /** @type {Map<number, { fn: () => void, at: number, every: number | null }>} */
  const timers = new Map();
  return {
    now: () => time,
    setTimeout(/** @type {() => void} */ fn, /** @type {number} */ ms) {
      seq += 1;
      timers.set(seq, { fn, at: time + ms, every: null });
      return seq;
    },
    setInterval(/** @type {() => void} */ fn, /** @type {number} */ ms) {
      seq += 1;
      timers.set(seq, { fn, at: time + ms, every: ms });
      return seq;
    },
    clear(/** @type {unknown} */ id) {
      timers.delete(/** @type {number} */ (id));
    },
    advance(/** @type {number} */ ms) {
      const end = time + ms;
      for (;;) {
        /** @type {[number, { fn: () => void, at: number, every: number | null }] | null} */
        let next = null;
        for (const entry of timers) {
          if (entry[1].at <= end && (next === null || entry[1].at < next[1].at)) {
            next = entry;
          }
        }
        if (next === null) {
          break;
        }
        time = Math.max(time, next[1].at);
        if (next[1].every === null) {
          timers.delete(next[0]);
        } else {
          next[1].at += next[1].every;
        }
        next[1].fn();
      }
      time = end;
    },
    pending: () => timers.size,
  };
}

function memoryAdapter() {
  const map = new Map();
  return {
    map,
    get length() {
      return map.size;
    },
    key: (/** @type {number} */ i) => [...map.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => map.get(k) ?? null,
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => {
      map.set(k, String(v));
    },
    removeItem: (/** @type {string} */ k) => {
      map.delete(k);
    },
  };
}

/**
 * Opens `pack[index]` in a store with a real controller, storage and play controller.
 * @param {Pack} pack
 * @param {{ index?: number, saveFails?: boolean }} [o]
 */
function harness(pack, o = {}) {
  const clock = createClock();
  const storage = createStorage(memoryAdapter(), clock.now);
  const saves = /** @type {unknown[]} */ ([]);
  const realSave = storage.saveProgress;
  storage.saveProgress = (fp, value) => {
    saves.push({ fp, value });
    return o.saveFails ? { ok: false, code: 'quota' } : realSave(fp, value);
  };
  const store = createPlayerStore({ prefs: storage.getPrefs() });
  const controller = createPlayerController({
    store,
    storage,
    location: { hash: '', pathname: '/player/', search: '' },
    history: { replaceState() {} },
    createPool: () => ({ beginRequest() {}, endRequest() {}, close() {}, run: () => new Promise(() => {}) }),
  });
  const board = packBoard(pack);
  const fingerprints = pack.puzzles.map((p) => progressFingerprint(board, pack.pieces, p.clues));
  const index = o.index ?? 0;
  store.update({
    screen: 'game', pack, index, game: createGame(pack, index), fingerprints, statuses: pack.puzzles.map(() => 'new'),
  });
  const log = /** @type {string[]} */ ([]);
  const events = { solved: /** @type {{ elapsedMs: number, moves: number }[]} */ ([]), noRoom: 0, focus: /** @type {string[]} */ ([]) };
  const play = createPlayController({
    store,
    controller,
    now: clock.now,
    setTimeout: (fn, ms) => clock.setTimeout(fn, ms),
    clearTimeout: (id) => clock.clear(id),
    setInterval: (fn, ms) => clock.setInterval(fn, ms),
    clearInterval: (id) => clock.clear(id),
    announce: (message) => log.push(message),
    onNoRoom: () => {
      events.noRoom += 1;
    },
    onSolved: (result) => events.solved.push(result),
    focus: (id, where) => events.focus.push(`${where}:${id}`),
  });
  store.subscribe((state, previous) => play.onState(state, previous));
  play.onState(store.getState(), null);
  const game = () => /** @type {import('../core/engine/game.js').GameState} */ (store.getState().game);
  const piece = (/** @type {string} */ id) => /** @type {import('../core/engine/types.js').Piece} */ (pack.pieces.find((p) => p.id === id));
  return { clock, storage, saves, store, controller, play, log, events, game, piece, fingerprints };
}

/** @param {number} theta */
const rotated = (theta) => ({ ...sample, presentation: { rotation: theta } });

/**
 * Movable solution poses of a puzzle.
 * @param {Pack} pack
 * @param {number} [i]
 * @returns {Pose[]}
 */
function movables(pack, i = 0) {
  const clued = new Set(pack.puzzles[i].clues.map((c) => c.piece));
  return /** @type {Pose[]} */ (pack.puzzles[i].solution).filter((p) => !clued.has(p.piece));
}

/**
 * Shortest list of screen operations from orientation `from` to `target` at display angle `theta`.
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

/** Minimal key event for the keyboard layer. @param {{ key: string } & Record<string, unknown>} e */
function keyEvent(e) {
  return /** @type {any} */ ({
    shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, defaultPrevented: false, isComposing: false,
    target: { closest: () => null, getAttribute: () => null },
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...e,
  });
}

const noTarget = { addEventListener() {}, removeEventListener() {} };

/**
 * Presses arrow keys until the preview's handle cell is on `want`.
 * @param {ReturnType<typeof harness>} h
 * @param {ReturnType<typeof createKeyboard>} kb
 * @param {number} theta
 * @param {XYLike} want
 */
function keyboardMoveTo(h, kb, theta, want) {
  const keys = /** @type {const} */ (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  for (let guard = 0; guard < 80; guard += 1) {
    const at = /** @type {XYLike} */ (h.play.view().cursor);
    const dx = want[0] - at[0];
    const dy = want[1] - at[1];
    if (dx === 0 && dy === 0) {
      return;
    }
    const key = keys.find((k) => {
      const [gx, gy] = arrowToGrid(theta, k);
      return dx !== 0 ? gx === Math.sign(dx) && gy === 0 : gx === 0 && gy === Math.sign(dy);
    });
    assert.ok(key, 'an arrow key reaches every grid direction');
    assert.equal(kb.handle(keyEvent({ key })), true);
  }
  assert.fail('keyboard cursor did not arrive');
}

test('handle helpers keep the grabbed cell for every orientation, piece and handle', () => {
  for (const piece of sample.pieces) {
    for (let t = 0; t < 8; t += 1) {
      for (let i = 0; i < piece.cells.length; i += 1) {
        const pose = poseWithHandle(piece, t, i, [7, 4]);
        assert.deepEqual(handleCell(piece, pose, i), [7, 4]);
        assert.ok(poseCells(piece, pose).some(([x, y]) => x === 7 && y === 4));
        assert.equal(poseT(pose), t);
      }
    }
  }
  const bar = { id: 'I', label: 'I', color: '#000000', cells: /** @type {XYLike[]} */ ([[0, 0], [1, 0], [2, 0]]) };
  assert.equal(defaultHandle(bar, 0), 1);
  assert.deepEqual(orientedHandle(bar, 1, 1), [0, 1]);
  assert.deepEqual(keyStep(90, 'ArrowRight'), arrowToGrid(90, 'ArrowRight'));
  assert.deepEqual(keyStep(0, 'ArrowDown', true), [0, 3]);
  assert.deepEqual(keyStep(45, 'ArrowRight'), keyStep(0, 'ArrowRight'));
});

/** A 5x5 board with a tromino bar and monomino blockers, to exercise every kick. */
function kickPack() {
  const mono = (/** @type {string} */ id) => ({ id, label: id, color: '#3cb44b', cells: [[0, 0]] });
  return /** @type {Pack} */ (/** @type {unknown} */ ({
    board: { rows: ['#####', '#####', '#####', '#####', '#####'] },
    pieces: [{ id: 'P', label: 'P', color: '#e6194b', cells: [[0, 0], [1, 0], [2, 0]] }, mono('a'), mono('b'), mono('c'), mono('d')],
    puzzles: [{ id: 'k', clues: [] }],
  }));
}

const BLOCKERS = /** @type {Record<string, XYLike>} */ ({ a: [2, 1], b: [1, 1], c: [3, 1], d: [2, 4] });

/** @param {import('../core/engine/game.js').GameState} game @param {string[]} blockers @returns {import('../core/engine/game.js').GameState} */
function withBar(game, blockers) {
  let next = game;
  for (const id of blockers) {
    next = reduce(next, { type: 'place', pose: { piece: id, x: BLOCKERS[id][0], y: BLOCKERS[id][1], turn: 0, mirrored: false } });
  }
  return reduce(next, { type: 'place', pose: { piece: 'P', x: 1, y: 2, turn: 0, mirrored: false } });
}

test('placed rotation keeps the handle, then tries the kicks in order and stops at no room', () => {
  assert.deepEqual(KICKS, [[0, -1], [-1, 0], [1, 0], [0, 1]]);
  const cases = /** @type {[string[], XYLike | null][]} */ ([
    [[], [2, 1]],
    [['d'], [2, 1]],
    [['a'], [1, 1]],
    [['a', 'b'], [3, 1]],
    [['a', 'b', 'c'], [2, 2]],
    [['a', 'b', 'c', 'd'], null],
  ]);
  for (const [blockers, expected] of cases) {
    const game = withBar(createGame(kickPack(), 0), blockers);
    const pose = /** @type {Pose} */ (game.placed.get('P'));
    const turned = rotatePlaced(game, pose, 1, 1);
    if (expected === null) {
      assert.equal(turned, null, blockers.join());
      continue;
    }
    assert.ok(turned, blockers.join());
    assert.deepEqual([turned.x, turned.y], expected, `origin with blockers ${blockers.join()}`);
    assert.equal(canPlace(game, turned, 'P').ok, true);
  }
  // Natural pose first: the handle stays on its old cell (2,2) and nothing is kicked.
  const free = withBar(createGame(kickPack(), 0), []);
  const natural = /** @type {Pose} */ (rotatePlaced(free, /** @type {Pose} */ (free.placed.get('P')), 1, 1));
  assert.deepEqual(handleCell(free.pack.pieces[0], natural, 1), [2, 2]);
});

test('no-room rotation keeps the state, announces it and asks for a shake', () => {
  const h = harness(kickPack());
  h.store.update({ game: withBar(h.game(), ['a', 'b', 'c', 'd']) });
  h.play.select('P');
  const before = h.game();
  h.log.length = 0;
  assert.equal(h.play.transform('cw'), true);
  assert.equal(h.game(), before, 'not even a new state object');
  assert.deepEqual(h.log, [PLAY_TEXT.noRoom]);
  assert.equal(h.events.noRoom, 1);
  h.store.update({ game: reduce(h.game(), { type: 'remove', piece: 'd' }) });
  assert.equal(h.play.transform('cw'), true, 'with room the same turn succeeds as one step');
  assert.equal(h.game().history.length, 7);
  assert.equal(poseT(/** @type {Pose} */ (h.game().placed.get('P'))), 1);
});

test('tap placement: select, preview, same-cell tap commits once; another cell only moves the ghost', () => {
  const h = harness(sample);
  const target = movables(sample)[0];
  const piece = h.piece(target.piece);
  h.play.tapPiece(target.piece, 'tray');
  assert.equal(h.game().selected, target.piece);
  for (const op of opsTo(poseT(target), 0)) {
    h.play.transform(op);
  }
  assert.equal(h.game().tray.get(target.piece), poseT(target));
  const cell = handleCell(piece, target, defaultHandle(piece, 0));
  h.play.tapCell([cell[0] === 0 ? 1 : 0, cell[1]]);
  assert.ok(h.game().preview);
  assert.equal(h.game().placed.has(target.piece), false, 'a preview never mutates the state');
  const historyBefore = h.game().history.length;
  h.play.tapCell(cell);
  assert.equal(h.game().placed.size, 0, 'the first tap on a new cell only previews');
  h.play.tapCell(cell);
  assert.deepEqual(h.game().placed.get(target.piece), target);
  assert.equal(h.game().history.length, historyBefore + 1);
  assert.equal(h.game().preview, null);
  assert.match(h.log.at(-1) ?? '', /^Placed\. Piece \w+, \d+ cells, on board at row \d+, column \d+$/);
});

test('tapping the selected tray piece again turns it clockwise', () => {
  const h = harness(sample);
  const id = movables(sample)[0].piece;
  h.play.tapPiece(id, 'tray');
  assert.equal(h.game().tray.get(id), 0);
  h.play.tapPiece(id, 'tray');
  assert.equal(h.game().tray.get(id), 1);
  h.play.tapPiece(id, 'board');
  assert.equal(h.game().tray.get(id), 1, 'a board tap only selects');
});

test('drag: valid drop is one step; invalid, tray and cancelled drags leave the old placements', () => {
  const h = harness(sample);
  const [first, second] = movables(sample);
  const piece = h.piece(first.piece);
  /**
   * Starts a drag by cell 0, turns the piece to the pose's orientation and returns the pointer position that puts it there.
   * @param {Pose} pose
   * @returns {XYLike}
   */
  const grab = (pose) => {
    assert.equal(h.play.beginDrag({ pieceId: pose.piece, sourceCell: 0 }), true);
    for (const op of opsTo(poseT(pose), 0, /** @type {number} */ (h.play.view().drag?.t))) {
      h.play.transform(op);
    }
    const at = handleCell(h.piece(pose.piece), pose, 0);
    return [at[0] + 0.5, at[1] + 0.5];
  };

  // Cancel after rotating: nothing changes, not even the tray orientation.
  const before = h.game();
  grab(first);
  assert.equal(h.play.view().hiddenTrayId, first.piece);
  h.play.dragTo([3.5, 3.5]);
  assert.ok(h.game().preview);
  h.play.cancelDrag();
  assert.equal(h.game().placed, before.placed);
  assert.equal(h.game().tray, before.tray);
  assert.equal(h.game().history.length, 0);
  assert.equal(h.game().preview, null);
  assert.equal(h.play.view().dragging, false);

  // A clue overlap is rejected and reverts without a move.
  const clue = sample.puzzles[0].clues[0];
  const clueCell = poseCells(h.piece(clue.piece), clue)[0];
  grab(first);
  h.play.dragTo([clueCell[0] + 0.5, clueCell[1] + 0.5]);
  assert.equal(canPlace(h.game(), /** @type {Pose} */ (h.game().preview), first.piece).ok, false);
  const kept = h.game().placed;
  assert.equal(h.play.endDrag(), 'reverted');
  assert.equal(h.game().placed, kept);
  assert.equal(h.game().history.length, 0);
  assert.match(h.log.at(-1) ?? '', /^Cannot place here/);

  // Dropping a tray piece on the tray changes nothing.
  grab(first);
  h.play.dragTo(null, true);
  assert.equal(h.play.endDrag(), 'reverted');

  // A valid drop places once.
  h.play.dragTo(grab(first));
  assert.equal(h.play.endDrag(), 'placed');
  assert.deepEqual(h.game().placed.get(first.piece), first);
  assert.equal(h.game().history.length, 1);
  assert.equal(h.game().moves, 1);

  // The placed piece can be dragged onto part of its own old footprint.
  const own = poseCells(piece, first);
  const handle = handleCell(piece, first, 0);
  const shifted = (/** @type {XYLike} */ c) => poseWithHandle(piece, poseT(first), 0, c);
  const free = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => /** @type {XYLike} */ ([handle[0] + dx, handle[1] + dy]))
    .find((c) => canPlace(h.game(), shifted(c), first.piece).ok && poseCells(piece, shifted(c)).some(([x, y]) => own.some(([ox, oy]) => ox === x && oy === y)));
  assert.ok(free, 'a one-cell shift onto the old footprint is free');
  grab(first);
  h.play.dragTo([free[0] + 0.5, free[1] + 0.5]);
  assert.deepEqual(h.game().placed.get(first.piece), first, 'the old placement stays committed during the drag');
  assert.equal(h.play.view().hiddenPieceId, first.piece);
  assert.equal(h.play.endDrag(), 'moved');
  assert.equal(h.game().history.length, 2);

  // Dragging a placed piece onto the tray removes it as one step.
  grab(/** @type {Pose} */ (h.game().placed.get(first.piece)));
  h.play.dragTo(null, true);
  assert.equal(h.play.endDrag(), 'returned');
  assert.equal(h.game().placed.has(first.piece), false);
  assert.equal(h.game().tray.has(first.piece), true);
  assert.equal(h.game().history.length, 3);

  // While rotating, the grabbed cell stays on the cell under the pointer.
  assert.equal(h.play.beginDrag({ pieceId: second.piece, sourceCell: 2 }), true);
  h.play.dragTo([4.2, 3.7]);
  for (const op of /** @type {TransformOp[]} */ (['cw', 'flipH', 'ccw', 'flipV'])) {
    h.play.transform(op);
    const drag = /** @type {NonNullable<ReturnType<typeof h.play.view>['drag']>} */ (h.play.view().drag);
    assert.deepEqual(handleCell(h.piece(second.piece), /** @type {Pose} */ (h.game().preview), drag.index), [4, 3]);
  }
  h.play.cancelDrag();
});

test('only one piece is manipulated at a time', () => {
  const h = harness(sample);
  const [a, b] = movables(sample);
  assert.equal(h.play.beginDrag({ pieceId: a.piece, sourceCell: 0 }), true);
  assert.equal(h.play.beginDrag({ pieceId: b.piece, sourceCell: 0 }), false);
  assert.equal(h.play.view().drag?.pieceId, a.piece);
  assert.equal(h.play.tapPiece(b.piece, 'tray'), false);
  assert.equal(h.play.undo(), false);
  h.play.cancelDrag();
});

for (const theta of [0, 45, 90, 315]) {
  test(`keyboard only completes the puzzle at ${theta} degrees, focusing each placed piece`, () => {
    const pack = rotated(theta);
    const h = harness(pack);
    const kb = createKeyboard({ target: noTarget, play: h.play, showHelp() {} });
    for (const target of movables(pack)) {
      const piece = h.piece(target.piece);
      h.play.select(target.piece);
      assert.equal(kb.handle(keyEvent({ key: 'Enter' })), true);
      assert.equal(h.game().preview?.piece, target.piece, 'Enter picks up the selected piece');
      // The handle is retained from the first selection, whatever the orientation becomes.
      const handleIndex = defaultHandle(piece, 0);
      assert.deepEqual(h.play.view().cursor, handleCell(piece, /** @type {Pose} */ (h.game().preview), handleIndex));
      for (const op of opsTo(poseT(target), theta)) {
        assert.equal(kb.handle(keyEvent({ key: { cw: 'e', ccw: 'q', flipH: 'f', flipV: 'v' }[op] })), true);
      }
      assert.equal(h.game().tray.get(target.piece), poseT(target));
      keyboardMoveTo(h, kb, theta, handleCell(piece, target, handleIndex));
      assert.equal(h.game().placed.has(target.piece), false);
      assert.equal(kb.handle(keyEvent({ key: 'Enter' })), true);
      assert.deepEqual(h.game().placed.get(target.piece), target);
    }
    assert.equal(h.game().solved, true);
    assert.equal(h.events.solved.length, 1);
    assert.deepEqual(h.events.focus, movables(pack).map((p) => `board:${p.piece}`));
  });

  test(`dragging completes the puzzle at ${theta} degrees with the same result`, () => {
    const pack = rotated(theta);
    const h = harness(pack);
    for (const target of movables(pack)) {
      h.play.beginDrag({ pieceId: target.piece, sourceCell: 1 });
      for (const op of opsTo(poseT(target), theta)) {
        h.play.transform(op);
      }
      const at = handleCell(h.piece(target.piece), target, 1);
      h.play.dragTo([at[0] + 0.3, at[1] + 0.8]);
      assert.equal(h.play.endDrag(), 'placed');
    }
    assert.equal(h.game().solved, true);
    assert.deepEqual(snapshot(h.game()).placements.map((p) => [p.piece, p.x, p.y, p.turn, p.mirrored]),
      movables(sample).map((p) => [p.piece, p.x, p.y, p.turn, p.mirrored]));
  });
}

test('keyboard shortcuts: help, ignore rules, preventDefault only when handled', () => {
  const h = harness(sample);
  let help = 0;
  const kb = createKeyboard({ target: noTarget, play: h.play, showHelp: () => { help += 1; } });
  const id = movables(sample)[0].piece;
  const matching = (/** @type {string} */ word, /** @type {Record<string, unknown>} */ found) => ({
    closest: (/** @type {string} */ sel) => (sel.includes(word) ? found : null),
    getAttribute: () => null,
  });
  assert.equal(kb.handle(keyEvent({ key: 'e', target: matching('input', {}) })), false, 'text fields keep their keys');
  assert.equal(kb.handle(keyEvent({ key: 'e', target: matching('dialog', {}) })), false, 'dialogs keep their keys');
  const noSelection = keyEvent({ key: 'ArrowRight' });
  assert.equal(kb.handle(noSelection), false);
  assert.equal(noSelection.defaultPrevented, false, 'nothing selected: the arrow still scrolls');
  assert.equal(kb.handle(keyEvent({ key: 'Enter', target: matching('button', {}) })), false, 'Enter on a button stays native');
  const pressed = keyEvent({ key: '?' });
  assert.equal(kb.handle(pressed), true);
  assert.equal(help, 1);
  assert.equal(pressed.defaultPrevented, true);
  assert.equal(kb.handle(keyEvent({ key: 'e', altKey: true })), false);

  // A focused tray piece becomes the selection before the key acts on it.
  const focused = matching('tray-piece', { getAttribute: () => id });
  assert.equal(kb.handle(keyEvent({ key: 'e', target: focused })), true);
  assert.equal(h.game().selected, id);
  assert.equal(h.game().tray.get(id), 1);

  // Undo / redo: Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y and Cmd+Z.
  assert.equal(kb.handle(keyEvent({ key: 'z', ctrlKey: true })), true);
  assert.equal(h.game().tray.get(id), 0);
  assert.equal(kb.handle(keyEvent({ key: 'Z', ctrlKey: true, shiftKey: true })), true);
  assert.equal(h.game().tray.get(id), 1);
  kb.handle(keyEvent({ key: 'z', metaKey: true }));
  assert.equal(h.game().tray.get(id), 0);
  kb.handle(keyEvent({ key: 'y', ctrlKey: true }));
  assert.equal(h.game().tray.get(id), 1);

  // Shift+arrow moves three cells by the screen-aware mapping; a rotated board shows grid-axis hints.
  const turned = harness(rotated(90));
  const kb2 = createKeyboard({ target: noTarget, play: turned.play, showHelp() {} });
  turned.play.select(id);
  turned.play.pickUp(id);
  const start = /** @type {XYLike} */ (turned.play.view().cursor);
  kb2.handle(keyEvent({ key: 'ArrowRight', shiftKey: true }));
  const [gx, gy] = arrowToGrid(90, 'ArrowRight');
  assert.deepEqual(turned.play.view().cursor, [Math.min(9, Math.max(0, start[0] + 3 * gx)), Math.min(5, Math.max(0, start[1] + 3 * gy))]);
  assert.ok(turned.play.view().hints, 'grid-axis hints are drawn on a rotated board');
  assert.equal(h.play.view().hints, null);
  kb2.handle(keyEvent({ key: 'Escape' }));
  assert.equal(turned.game().preview, null);
  assert.equal(turned.play.view().hints, null);
  kb.destroy();
  kb2.destroy();
});

test('delete returns a placed piece, undo brings it back and reset is one undoable step', () => {
  const h = harness(sample);
  const targets = movables(sample);
  for (const target of targets.slice(0, 2)) {
    h.store.update({ game: reduce(h.game(), { type: 'place', pose: target }) });
  }
  h.play.select(targets[0].piece);
  assert.equal(h.play.returnToTray(), true);
  assert.equal(h.game().placed.has(targets[0].piece), false);
  assert.equal(h.game().tray.get(targets[0].piece), poseT(targets[0]), 'the tray keeps the orientation');
  assert.equal(h.play.undo(), true);
  assert.deepEqual(h.game().placed.get(targets[0].piece), targets[0]);
  const before = h.game().placed.size;
  assert.equal(h.play.reset(), true);
  assert.equal(h.game().placed.size, 0);
  assert.equal(h.play.undo(), true);
  assert.equal(h.game().placed.size, before);
  assert.equal(h.play.redo(), true);
  assert.equal(h.game().placed.size, 0);
  assert.equal(h.play.redo(), false);
  assert.equal(h.log.at(-1), PLAY_TEXT.nothingToRedo);
});

test('a valid tiling that is not the stored solution wins', () => {
  // 2x2 board, two dominoes: the stored answer is horizontal, the player builds vertical.
  const domino = (/** @type {string} */ id) => ({ id, label: id, color: '#e6194b', cells: [[0, 0], [1, 0]] });
  const pack = /** @type {Pack} */ (/** @type {unknown} */ ({
    board: { rows: ['##', '##'] },
    pieces: [domino('D1'), domino('D2')],
    puzzles: [{
      id: 'two',
      clues: [],
      solution: [{ piece: 'D1', x: 0, y: 0, turn: 0, mirrored: false }, { piece: 'D2', x: 0, y: 1, turn: 0, mirrored: false }],
    }],
  }));
  const h = harness(pack);
  for (const [id, column] of /** @type {[string, number][]} */ ([['D1', 0], ['D2', 1]])) {
    h.play.tapPiece(id, 'tray');
    h.play.transform('cw');
    const [gx, gy] = orientedHandle(h.piece(id), h.game().tray.get(id) ?? 0, defaultHandle(h.piece(id), 0));
    h.play.tapCell([column + gx, gy]);
    h.play.tapCell([column + gx, gy]);
  }
  assert.equal(h.game().solved, true, 'both vertical dominoes tile the board');
  assert.equal(h.events.solved.length, 1);
  assert.notDeepEqual(snapshot(h.game()).placements.map((p) => [p.piece, p.x, p.y, p.turn]),
    /** @type {Pose[]} */ (pack.puzzles[0].solution).map((p) => [p.piece, p.x, p.y, p.turn]));
  assert.equal(h.clock.pending(), 0, 'the clock and the debounce are stopped at the win');
  const saved = h.storage.loadProgress(h.fingerprints[0]);
  assert.equal(saved?.solved, true, 'the win is saved at once');
  assert.equal(saved?.placements.length, 2);
});

test('saving: one write per 250 ms burst; failures never block play', () => {
  const h = harness(sample);
  const [a, b] = movables(sample);
  /** @param {Pose} pose */
  const place = (pose) => {
    h.play.select(pose.piece);
    h.play.pickUp(pose.piece);
    for (const op of opsTo(poseT(pose), 0)) {
      h.play.transform(op);
    }
    const cell = handleCell(h.piece(pose.piece), pose, defaultHandle(h.piece(pose.piece), 0));
    h.play.tapCell(cell);
    if (!h.game().placed.has(pose.piece)) {
      h.play.tapCell(cell);
    }
    assert.ok(h.game().placed.has(pose.piece));
  };
  place(a);
  h.clock.advance(SAVE_DELAY_MS - 1);
  place(b);
  assert.equal(h.saves.length, 0, 'still debouncing');
  h.clock.advance(SAVE_DELAY_MS);
  assert.equal(h.saves.length, 1, 'bursts coalesce');
  const record = h.storage.loadProgress(h.fingerprints[0]);
  assert.equal(record?.placements.length, 2);

  const failing = harness(sample, { saveFails: true });
  failing.play.select(a.piece);
  failing.play.transform('cw');
  failing.clock.advance(SAVE_DELAY_MS);
  assert.ok(failing.store.getState().storageWarning, 'a failed save warns');
  failing.play.transform('cw');
  assert.equal(failing.game().tray.get(a.piece), 2, 'play continues');
});

test('rapid puzzle switching: the old puzzle is saved, the new one stays clean', () => {
  const h = harness(sample);
  const target = movables(sample)[0];
  h.play.select(target.piece);
  h.play.transform('cw');
  assert.ok(h.clock.pending() > 0);
  h.controller.goToPuzzle(1);
  assert.equal(h.store.getState().index, 1);
  assert.ok(h.storage.loadProgress(h.fingerprints[0]), 'the old puzzle was saved before the switch');
  h.clock.advance(SAVE_DELAY_MS * 4);
  assert.equal(h.storage.loadProgress(h.fingerprints[1]), null, 'the untouched puzzle is not written');
  h.controller.goToPuzzle(0);
  h.controller.goToPuzzle(2);
  h.clock.advance(SAVE_DELAY_MS * 4);
  assert.equal(h.storage.loadProgress(h.fingerprints[2]), null);
  assert.equal(h.play.view().dragging, false);
  assert.equal(h.game().selected, null, 'selection does not leak into the next puzzle');
});

test('the timer starts at the first committed move, pauses while hidden and stops when solved', () => {
  const h = harness(sample);
  assert.equal(h.play.clockRunning(), false, 'not started before a move');
  h.clock.advance(5000);
  assert.equal(h.game().elapsedMs, 0);
  const targets = movables(sample);
  h.play.select(targets[0].piece);
  h.play.transform('cw');
  assert.equal(h.play.clockRunning(), true);
  h.clock.advance(3000);
  assert.equal(h.game().elapsedMs, 3000);
  h.play.setVisible(false);
  assert.equal(h.play.clockRunning(), false);
  h.clock.advance(60000);
  assert.equal(h.game().elapsedMs, 3000, 'hidden time does not count');
  assert.ok(h.saves.length >= 1, 'hiding the page saves');
  h.play.setVisible(true);
  h.clock.advance(2000);
  assert.equal(h.game().elapsedMs, 5000);
  for (const target of targets) {
    h.store.update({ game: reduce(h.game(), { type: 'place', pose: target }) });
  }
  h.play.undo();
  h.play.redo();
  assert.equal(h.game().solved, true);
  const done = h.game().elapsedMs;
  h.clock.advance(10000);
  assert.equal(h.game().elapsedMs, done);
  assert.equal(h.play.clockRunning(), false);
});

test('Straighten changes the effective angle only, never poses or fingerprints', () => {
  const pack = rotated(45);
  const h = harness(pack);
  const id = movables(pack)[0].piece;
  h.play.select(id);
  h.play.transform('flipH');
  const fp = h.store.getState().fingerprints.slice();
  const placed = snapshot(h.game()).placements;
  assert.equal(h.game().tray.get(id), screenFlip(0, 45, 'horizontal'));
  h.controller.setPref('straighten', true);
  assert.deepEqual(snapshot(h.game()).placements, placed);
  h.play.transform('flipH');
  assert.equal(h.game().tray.get(id), screenFlip(screenFlip(0, 45, 'horizontal'), 0, 'horizontal'));
  assert.deepEqual(h.store.getState().fingerprints, fp);
  assert.equal(h.store.getState().pack?.presentation?.rotation, 45, 'the pack is untouched');
});

test('escape cancels the preview, then the selection; clues are never selectable or draggable', () => {
  const h = harness(sample);
  const id = movables(sample)[0].piece;
  const clue = sample.puzzles[0].clues[0].piece;
  assert.equal(h.play.select(clue), false);
  assert.equal(h.play.tapPiece(clue, 'board'), false);
  assert.equal(h.play.beginDrag({ pieceId: clue, sourceCell: 0 }), false);
  assert.equal(h.play.activate(clue), false);
  assert.equal(h.game().selected, null);
  h.play.select(id);
  h.play.pickUp(id);
  assert.ok(h.game().preview);
  assert.equal(h.play.cancel(), true);
  assert.equal(h.game().preview, null);
  assert.equal(h.game().selected, id);
  assert.equal(h.play.cancel(), true);
  assert.equal(h.game().selected, null);
  assert.equal(h.play.cancel(), false);
});

test('the game heading does not number a title that already ends in its number', () => {
  assert.equal(puzzleDisplayName('Normal #1', 0), 'Normal #1');
  assert.equal(puzzleDisplayName('Hard #4', 0), 'Hard #4');
  assert.equal(puzzleDisplayName('Warm-up', 2), 'Warm-up #3');
  assert.equal(puzzleDisplayName('', 1), 'Puzzle #2');
  assert.equal(puzzleDisplayName(undefined, 0), 'Puzzle #1');
  assert.equal(puzzleDisplayName('x'.repeat(76), 3), 'x'.repeat(76), 'a title of more than 75 code points is never numbered');
});

test('card headings follow the generator: generated titles become "Puzzle #n", written titles stay', () => {
  assert.equal(cardHeading('Expert #2', 1), 'Puzzle #2');
  assert.equal(cardHeading('Hell 3 #1', 0), 'Puzzle #1');
  assert.equal(cardHeading('Easy', 4), 'Puzzle #5');
  assert.equal(cardHeading(undefined, 2), 'Puzzle #3');
  assert.equal(cardHeading('Warm-up', 2), 'Warm-up #3');
});
