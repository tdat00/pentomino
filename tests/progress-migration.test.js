// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createGame, isEarned, reduce, snapshot } from '../core/engine/game.js';
import { progressFingerprint } from '../core/engine/keys.js';
import { packBoard, parsePack } from '../core/engine/pack.js';
import { NAMESPACE, createStorage } from '../core/browser/storage.js';
import { createPlayerController, createPlayerStore } from '../player/state.js';
import { puzzleStatusLabel } from '../player/strings.js';

/** @typedef {import('../core/engine/types.js').Pose} Pose */

const FIXTURE_TEXT = readFileSync(new URL('./fixtures/hand-authored-pack.json', import.meta.url), 'utf8');
const parsed = parsePack(FIXTURE_TEXT);
assert.ok(parsed.ok);
const pack = parsed.value;
const FP = progressFingerprint(packBoard(pack), pack.pieces, pack.puzzles[0].clues);
const KEY = `${NAMESPACE}progress:${FP}`;
const SOLUTION = /** @type {Pose[]} */ (pack.puzzles[0].solution);
const CLUED = new Set(pack.puzzles[0].clues.map((c) => c.piece));
const MOVABLE = SOLUTION.filter((p) => !CLUED.has(p.piece));

/** @type {Pose[]} */
const PLACEMENTS = [
  { piece: 'E', x: 0, y: 2, turn: 0, mirrored: false },
  { piece: 'H', x: 6, y: 3, turn: 0, mirrored: false },
];

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

/** A record exactly as version 1 wrote it, with the `updatedAt` stamp that is no longer kept. */
const v1Record = () => ({
  v: 1, placements: PLACEMENTS, elapsedMs: 83000, moves: 5, solved: false, updatedAt: 1700000000000,
});

/**
 * @param {import('../core/browser/storage.js').Progress['placements']} placements
 * @param {Record<string, unknown>} [extra]
 */
const v2Record = (placements, extra = {}) => ({
  v: 2, placements, elapsedMs: 9000, moves: 12, solved: false, revealed: false, hintsUsed: 2, updatedAt: 1700000000000, ...extra,
});

/** @param {unknown} record */
function storageWith(record) {
  const adapter = memoryAdapter();
  adapter.map.set(KEY, JSON.stringify(record));
  return { adapter, storage: createStorage(adapter, () => 1800000000000) };
}

test('a stored version 1 record loads as version 2 with false and 0 and keeps its data', () => {
  const { adapter, storage } = storageWith(v1Record());
  assert.deepEqual(storage.loadProgress(FP), {
    v: 2,
    placements: PLACEMENTS,
    elapsedMs: 83000,
    moves: 5,
    solved: false,
    revealed: false,
    hintsUsed: 0,
  });
  assert.equal(JSON.parse(adapter.map.get(KEY)).v, 1, 'reading never rewrites the stored text');
  const record = /** @type {any} */ (storage.loadProgress(FP));
  assert.equal(storage.saveProgress(FP, record).ok, true);
  const written = JSON.parse(adapter.map.get(KEY));
  assert.deepEqual(Object.keys(written), ['v', 'placements', 'elapsedMs', 'moves', 'solved', 'revealed', 'hintsUsed'], 'updatedAt is dropped');
  assert.equal(written.v, 2);
  // The previous shape is still accepted for writing and migrates in the same way.
  assert.equal(storage.saveProgress('other', { v: 1, placements: [], elapsedMs: 1, moves: 0, solved: false }).ok, true);
  assert.deepEqual(JSON.parse(adapter.map.get(`${NAMESPACE}progress:other`)).hintsUsed, 0);
});

test('version 2 records are validated strictly and unknown versions are ignored', () => {
  const ok = storageWith(v2Record(PLACEMENTS, { revealed: true, solved: false }));
  assert.equal(ok.storage.loadProgress(FP)?.revealed, true);
  assert.equal(ok.storage.loadProgress(FP)?.hintsUsed, 2);
  for (const bad of [
    { ...v2Record(PLACEMENTS), revealed: 'yes' },
    { ...v2Record(PLACEMENTS), hintsUsed: -1 },
    { ...v2Record(PLACEMENTS), hintsUsed: 1.5 },
    { ...v2Record(PLACEMENTS), hintsUsed: undefined },
    { ...v2Record(PLACEMENTS), revealed: undefined },
    { ...v2Record(PLACEMENTS), v: 3 },
  ]) {
    const { storage } = storageWith(bad);
    assert.equal(storage.loadProgress(FP), null, JSON.stringify(bad));
  }
  assert.equal(ok.storage.saveProgress(FP, /** @type {any} */ ({ ...v2Record([]), hintsUsed: 'x' })).ok, false);
});

test('createGame migrates version 1 and restores version 2 exactly', () => {
  const old = createGame(pack, 0, v1Record());
  assert.equal(old.revealed, false);
  assert.equal(old.hintsUsed, 0);
  assert.deepEqual([...old.placed.keys()], ['E', 'H']);
  assert.equal(old.elapsedMs, 83000);
  assert.equal(old.moves, 5);
  assert.deepEqual(old.restoreWarnings, []);

  const fresh = createGame(pack, 0, v2Record(PLACEMENTS, { revealed: true }));
  assert.equal(fresh.revealed, true);
  assert.equal(fresh.hintsUsed, 2);
  const snap = snapshot(fresh);
  assert.equal(snap.v, 2);
  assert.equal(snap.revealed, true);
  assert.equal(snap.hintsUsed, 2);
  const again = createGame(pack, 0, JSON.parse(JSON.stringify(snap)));
  assert.equal(again.revealed, true);
  assert.equal(again.hintsUsed, 2);

  // Damaged counters fall back to the safe values instead of discarding the moves.
  const damaged = createGame(pack, 0, /** @type {any} */ ({ ...v2Record(PLACEMENTS), revealed: 'true', hintsUsed: -3 }));
  assert.equal(damaged.revealed, false);
  assert.equal(damaged.hintsUsed, 0);
  assert.equal(damaged.placed.size, 2);
  assert.equal(createGame(pack, 0, /** @type {any} */ ({ ...v2Record([]), v: 3 })).restoreWarnings[0].code, 'progress-invalid');
});

test('revealed is sticky across undo, redo and reset; the engine still checks geometry only', () => {
  const layout = SOLUTION;
  const start = createGame(pack, 0);
  const shown = reduce(start, { type: 'reveal', layout });
  assert.equal(shown.revealed, true);
  assert.equal(shown.solved, true);
  assert.equal(isEarned(shown), false);
  assert.equal(shown.history.length, 1);
  assert.equal(shown.moves, 1);
  for (const clue of pack.puzzles[0].clues) {
    assert.equal(shown.placed.has(clue.piece), false, 'clues stay locked clues');
  }
  const undone = reduce(shown, { type: 'undo' });
  assert.equal(undone.placed.size, 0);
  assert.equal(undone.revealed, true);
  assert.equal(reduce(undone, { type: 'redo' }).solved, true);
  assert.equal(reduce(shown, { type: 'reset' }).revealed, true);

  // By hand it is an earned solve.
  const manual = MOVABLE.reduce((game, pose) => reduce(game, { type: 'place', pose }), start);
  assert.equal(manual.solved, true);
  assert.equal(isEarned(manual), true);

  // The reveal action only accepts a complete cover that keeps the clues.
  assert.equal(reduce(start, { type: 'reveal', layout: SOLUTION.slice(1) }), start);
  assert.equal(reduce(start, { type: 'reveal', layout: SOLUTION.map((p) => (p.piece === 'B' ? { ...p, x: 0 } : p)) }), start);
  assert.equal(reduce(start, { type: 'reveal', layout: SOLUTION.map((p) => (p.piece === 'A' ? { ...p, x: 1 } : p)) }), start);
  assert.equal(reduce(start, { type: 'reveal', layout: /** @type {any} */ (null) }), start);
  const counted = reduce(start, { type: 'hint' });
  assert.equal(counted.hintsUsed, 1);
  assert.equal(counted.moves, 0);
  assert.equal(counted.history.length, 0);
});

/**
 * @param {unknown} record Raw record to put in storage before the puzzle opens.
 */
async function opened(record) {
  const adapter = memoryAdapter();
  if (record !== null) {
    adapter.map.set(KEY, JSON.stringify(record));
  }
  const storage = createStorage(adapter, () => 1800000000000);
  const store = createPlayerStore({});
  const hash = '';
  const controller = createPlayerController({
    store,
    storage,
    location: { hash, pathname: '/', search: '' },
    history: { replaceState() {} },
    baseUrl: 'http://localhost/player/',
    fetchText: async () => JSON.stringify(pack),
    createPool: () => ({ beginRequest() {}, endRequest() {}, close() {}, run: () => new Promise(() => {}) }),
  });
  const result = await controller.openSample();
  assert.equal(result.ok, true);
  return { adapter, storage, store, controller, game: () => /** @type {import('../core/engine/game.js').GameState} */ (store.getState().game) };
}

test('BAC-4: an existing saved game resumes without losing placements or time', async () => {
  const h = await opened(v1Record());
  assert.deepEqual([...h.game().placed.keys()], ['E', 'H']);
  assert.equal(h.game().elapsedMs, 83000);
  assert.equal(h.game().moves, 5);
  assert.equal(h.game().revealed, false);
  assert.equal(h.game().hintsUsed, 0);
  assert.deepEqual(h.store.getState().statuses, ['in-progress']);
  assert.equal(h.controller.saveNow(), true);
  const saved = JSON.parse(h.adapter.map.get(KEY));
  assert.equal(saved.v, 2);
  assert.deepEqual(saved.placements.map((/** @type {Pose} */ p) => p.piece), ['E', 'H']);
  assert.equal(saved.elapsedMs, 83000);
  assert.equal(saved.moves, 5);
  assert.equal(saved.revealed, false);
  assert.equal(saved.hintsUsed, 0);
});

test('a restored revealed game stays revealed; Replay starts a fresh unassisted session', async () => {
  const h = await opened(v2Record(MOVABLE, { solved: true, revealed: true, hintsUsed: 4, moves: 9 }));
  assert.equal(h.game().revealed, true);
  assert.equal(h.game().solved, true);
  assert.equal(isEarned(h.game()), false);
  assert.equal(h.game().hintsUsed, 4);
  assert.deepEqual(h.store.getState().statuses, ['revealed']);
  assert.equal(puzzleStatusLabel('revealed'), 'Revealed');

  h.controller.replay();
  assert.equal(h.game().revealed, false);
  assert.equal(h.game().hintsUsed, 0);
  assert.equal(h.game().placed.size, 0);
  assert.deepEqual(h.store.getState().statuses, ['new']);
  assert.equal(h.adapter.map.has(KEY), false, 'the saved record is removed, not replaced by an empty one');
  assert.equal(h.storage.loadProgress(FP), null);
});

test('an earned solved game is still reported as solved, not revealed', async () => {
  const h = await opened(v2Record(MOVABLE, { solved: true, hintsUsed: 1 }));
  assert.deepEqual(h.store.getState().statuses, ['solved']);
  assert.equal(h.game().revealed, false);
  assert.equal(isEarned(h.game()), true);
});
