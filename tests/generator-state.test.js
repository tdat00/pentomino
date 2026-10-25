// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { activeCount, boardFromRows, boardKey, boardToRows, preset, rectangle } from '../core/engine/board.js';
import { packBoard, parsePack } from '../core/engine/pack.js';
import { LIMITS } from '../core/engine/policy.js';
import { formatNotice } from '../generator/strings.js';
import {
  HISTORY_LIMIT, LISTED_LEVEL_IDS, MAX_SAVED_BOARDS, MAX_SAVED_SETS, MAX_SETS, acceptSet, beginSetRequest,
  boardsEqual, capFor, createEditHistory, createGeneratorStore, createPersistence, defaultGeneratorState, describeBoard,
  describeCount, describeLevels, detectHardware, gotoSet, isPhone, loadGeneratorState, mergeSeenKeys, nextBatch, nearestOfferedLevel,
  readSavedSet, readyLevelId, removeAllSets, resizeBoard, restoreState, rollSeed, savedSetOf, serializeState, setCell, setNumber,
  setTimelineLength, setViewPosition, setsFull, typeSeed, validSeed, withBoard,
} from '../generator/state.js';

const parsed = parsePack(readFileSync(new URL('./fixtures/generated-sample-pack.json', import.meta.url), 'utf8'));
assert.ok(parsed.ok);
const samplePack = parsed.value;
/** @type {import('../core/engine/types.js').PieceSet} */
const sampleSet = { board: packBoard(samplePack), pieces: samplePack.pieces, witness: samplePack.witness ?? null, carving: 'flat', macroRegion: null };
const samplePuzzles = /** @type {any[]} */ (samplePack.puzzles);
const DESKTOP = { phone: false };
const PHONE = { phone: true };

/** @param {() => string[]} values */
const sequence = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

/**
 * @param {Record<string, unknown>} [stored]
 */
function fakeStorage(stored = {}) {
  /** @type {{ state: unknown[] }} */
  const writes = { state: [] };
  return {
    writes,
    failState: /** @type {(snapshot: any) => boolean} */ (() => false),
    getGeneratorState: () => stored.state ?? null,
    /** @param {unknown} snapshot */
    setGeneratorState(snapshot) {
      if (this.failState(snapshot)) {
        return { ok: false };
      }
      writes.state.push(JSON.parse(JSON.stringify(snapshot)));
      return { ok: true };
    },
  };
}

/** @returns {{ setTimer: (fn: () => void, ms: number) => number, clearTimer: (id: number) => void, run: () => void, pending: () => number, delays: number[] }} */
function fakeTimers() {
  /** @type {Map<number, () => void>} */
  const tasks = new Map();
  /** @type {number[]} */
  const delays = [];
  let next = 1;
  return {
    delays,
    setTimer(fn, ms) {
      delays.push(ms);
      tasks.set(next, fn);
      return next++;
    },
    clearTimer: (id) => void tasks.delete(id),
    run() {
      for (const [id, fn] of [...tasks]) {
        tasks.delete(id);
        fn();
      }
    },
    pending: () => tasks.size,
  };
}

test('the default board is 10 columns by 6 rows with 60 playable squares', () => {
  const state = defaultGeneratorState();
  assert.equal(state.board.width, 10);
  assert.equal(state.board.height, 6);
  assert.equal(activeCount(state.board), 60);
  assert.equal(state.keepSeed, false);
  assert.equal(state.uniqueness, 'any');
  const description = describeBoard(state, DESKTOP);
  assert.equal(description.statusText, '60 / 60 playable squares · connected');
  assert.equal(description.valid, true);
});

test('a 60-cell board offers Very easy to Master and 360 offers Hard to Hell 2', () => {
  const offered = (/** @type {number} */ area) => describeLevels(area).filter((l) => l.offered).map((l) => l.id);
  assert.deepEqual(offered(60), ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master']);
  assert.deepEqual(offered(360), ['hard', 'expert', 'master', 'nightmare', 'hell-1', 'hell-2']);
  const at60 = describeLevels(60);
  assert.equal(at60.find((l) => l.id === 'nightmare')?.reason, 'larger');
  const at360 = describeLevels(360);
  assert.equal(at360.find((l) => l.id === 'normal')?.reason, 'smaller');
  assert.equal(at360.find((l) => l.id === 'hell-3')?.reason, 'larger');
  assert.equal(describeLevels(676).length, LISTED_LEVEL_IDS.length);
});

test('the piece-count line comes from the policy: 360 squares at Hard', () => {
  const count = describeCount('hard', 360);
  assert.deepEqual(count, { kmin: 16, kmax: 18, sizeMin: 12, sizeMax: 34, share: 38, placedMin: 6, placedMax: 7 });
  assert.equal(describeCount('nightmare', 60), null);
  assert.equal(describeCount('hard', 0), null);
});

test('the default board notes its piece count and that higher levels need a larger board', () => {
  assert.equal(formatNotice('N-COUNT', { kmin: 16, kmax: 18, level: 'Hard', share: 38 }), 'This board uses 16–18 pieces at Hard, about 38% pre-placed.');
  const board = describeBoard(defaultGeneratorState(), DESKTOP);
  assert.deepEqual(board.notices.map((n) => n.code), ['N-COUNT', 'N-LEVELS']);
  assert.equal(board.notices[1].text, 'Levels above Master need a larger board.');
});

test('Heart is 75 cells (73 rounded) at 45 degrees and validates', () => {
  const heart = preset('heart', { n: 10 });
  assert.equal(activeCount(heart.board), 75);
  assert.equal(heart.rotation, 45);
  assert.equal(activeCount(preset('heart', { n: 10, roundLobes: true }).board), 73);
  const state = withBoard(defaultGeneratorState(), heart.board, heart.rotation);
  const description = describeBoard(state, DESKTOP);
  assert.equal(description.area, 75);
  assert.equal(description.valid, true);
  assert.equal(state.rotation, 45);
});

test('masks below 30 squares or disconnected are reported with the exact texts and cells', () => {
  let state = withBoard(defaultGeneratorState(), rectangle(5, 5));
  let description = describeBoard(state, DESKTOP);
  assert.equal(description.valid, false);
  assert.equal(description.statusText, 'A board needs at least 30 playable squares to generate puzzles.');

  let board = rectangle(11, 3);
  for (let y = 0; y < 3; y += 1) {
    board = setCell(board, 5, y, 0);
  }
  state = withBoard(defaultGeneratorState(), board);
  description = describeBoard(state, DESKTOP);
  assert.equal(description.area, 30);
  assert.equal(description.valid, false);
  assert.match(description.statusText, /separate regions/);
  assert.equal(description.invalidCells.length, 15);
});

test('device classification: phone needs a coarse pointer and low or unknown memory', () => {
  assert.equal(isPhone({ coarsePointer: true, deviceMemory: undefined, hardwareConcurrency: 8 }), true);
  assert.equal(isPhone({ coarsePointer: true, deviceMemory: 4, hardwareConcurrency: 8 }), true);
  assert.equal(isPhone({ coarsePointer: true, deviceMemory: 8, hardwareConcurrency: 4 }), true);
  assert.equal(isPhone({ coarsePointer: true, deviceMemory: 8, hardwareConcurrency: 8 }), false);
  assert.equal(isPhone({ coarsePointer: false, deviceMemory: 2, hardwareConcurrency: 2 }), false);
  const win = { matchMedia: (/** @type {string} */ q) => ({ matches: q === '(pointer: coarse)' }), navigator: { hardwareConcurrency: 8 } };
  assert.equal(detectHardware(win).phone, true, 'unknown deviceMemory counts as a phone');
  assert.equal(detectHardware({}).phone, false);
  assert.equal(detectHardware({ matchMedia: () => { throw new Error('no'); } }).phone, false);
});

test('device caps: 484 squares on desktop, 360 on phones; above 360 a desktop board is marked large', () => {
  const base = defaultGeneratorState();
  assert.equal(capFor(DESKTOP), LIMITS.releaseMaxActive);
  assert.equal(capFor(PHONE), LIMITS.phoneMaxActive);

  const big = withBoard(base, rectangle(23, 22));
  assert.equal(activeCount(big.board), 506);
  const description = describeBoard(big, DESKTOP);
  assert.equal(description.valid, false);
  assert.equal(description.statusText, 'This board has 506 playable squares; the limit on this device is 484.');

  const phoneBoard = withBoard(base, rectangle(19, 19));
  assert.equal(describeBoard(phoneBoard, PHONE).statusText, 'This board has 361 playable squares; the limit on this device is 360.');
  const onDesktop = describeBoard(phoneBoard, DESKTOP);
  assert.equal(onDesktop.valid, true);
  assert.equal(onDesktop.notices[0].text, 'Large board: generation can take up to 2 minutes.');
});

test('Require one solution warns only on large Hell boards', () => {
  const big = withBoard(defaultGeneratorState({ uniqueness: 'require', levelId: 'hell-1' }), rectangle(20, 12));
  assert.deepEqual(describeBoard(big, DESKTOP).levelNotices.map((n) => n.code), ['N-UNIQUE-EXP']);
  assert.deepEqual(describeBoard({ ...big, levelId: 'master' }, DESKTOP).levelNotices, []);
  const small = withBoard(defaultGeneratorState({ uniqueness: 'require', levelId: 'hell-1' }), rectangle(15, 13));
  assert.deepEqual(describeBoard(small, DESKTOP).levelNotices, []);
});

test('the store replaces state without mutation and notifies only on change', () => {
  const store = createGeneratorStore();
  const seen = [];
  const off = store.subscribe((state, previous) => seen.push([state.levelId, previous.levelId]));
  const first = store.getState();
  store.update({ levelId: 'hard' });
  store.update({ levelId: 'hard' });
  store.update((s) => ({ ...s, levelId: 'easy' }));
  store.update((s) => s);
  assert.deepEqual(seen, [['hard', 'normal'], ['easy', 'hard']]);
  assert.equal(first.levelId, 'normal');
  off();
  store.update({ levelId: 'expert' });
  assert.equal(seen.length, 2);
  assert.throws(() => store.update(() => /** @type {any} */ (null)), TypeError);
  store.destroy();
  store.update({ levelId: 'master' });
  assert.equal(store.getState().levelId, 'expert');
});

test('painting returns new boards and keeps blocked cells reactivatable', () => {
  const board = rectangle(6, 6);
  const blocked = setCell(board, 2, 3, 0);
  assert.notEqual(blocked, board);
  assert.equal(board.active[3 * 6 + 2], 1, 'the input board is untouched');
  assert.equal(activeCount(blocked), 35);
  assert.equal(setCell(blocked, 2, 3, 0), blocked);
  assert.equal(activeCount(setCell(blocked, 2, 3, 1)), 36);
  assert.equal(setCell(board, 9, 0, 0), board);
});

test('resizing keeps cells that remain in bounds and activates new cells', () => {
  let board = setCell(rectangle(6, 5), 1, 1, 0);
  board = setCell(board, 5, 4, 0);
  const grown = resizeBoard(board, 8, 6);
  assert.deepEqual(boardToRows(grown), ['########', '#.######', '########', '########', '#####.##', '########']);
  const shrunk = resizeBoard(grown, 3, 3);
  assert.deepEqual(boardToRows(shrunk), ['###', '#.#', '###']);
  assert.throws(() => resizeBoard(board, 2, 6), RangeError);
  assert.throws(() => resizeBoard(board, 33, 6), RangeError);
  assert.equal(resizeBoard(board, 6, 5), board);
});

test('undo history keeps the last 50 steps', () => {
  const history = createEditHistory();
  assert.equal(HISTORY_LIMIT, 50);
  for (let i = 0; i < 60; i += 1) {
    history.record(rectangle(3 + (i % 10), 3));
  }
  assert.equal(history.size(), 50);
  let popped = 0;
  while (history.undo() !== null) {
    popped += 1;
  }
  assert.equal(popped, 50);
  assert.equal(history.canUndo(), false);
});

test('a level the new area does not offer moves to the nearest offered one', () => {
  assert.equal(nearestOfferedLevel('very-easy', 360), 'hard');
  assert.equal(nearestOfferedLevel('hell-3', 60), 'master');
  assert.equal(nearestOfferedLevel('hard', 10), null);
  const large = withBoard(defaultGeneratorState({ levelId: 'normal' }), rectangle(20, 18));
  assert.equal(large.levelId, 'hard', 'an unavailable level moves to the nearest offered one');
  const tiny = withBoard(defaultGeneratorState({ levelId: 'normal' }), rectangle(3, 3));
  assert.equal(tiny.levelId, 'normal', 'nothing is offered, so the choice stays');
});

test('a board edit moves the set on show out of sight and the board it was made for brings it back', () => {
  let state = acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: samplePuzzles[0], setSeed: 'alpha' });
  state = { ...state, puzzles: samplePuzzles };
  const edited = withBoard(state, setCell(state.board, 0, 0, 0));
  assert.equal(edited.set, null, 'there is no set for the board being edited');
  assert.deepEqual([edited.puzzles.length, edited.setSeed, setTimelineLength(edited)], [0, null, 0]);
  assert.equal(edited.setsByBoard[boardKey(sampleSet.board)].length, 1, 'the set is kept under the board it was made for');
  const reverted = withBoard(edited, sampleSet.board);
  assert.deepEqual([reverted.setSeed, reverted.puzzles.map((p) => p.id), reverted.set?.board], ['alpha', samplePuzzles.map((p) => p.id), sampleSet.board],
    'going back to the board brings its set and puzzles back');
  assert.deepEqual(reverted.setsByBoard, {}, 'a set on show is not also saved');
  const rotated = withBoard(state, state.board, 90);
  assert.equal(rotated.set, state.set, 'rotating the view never changes the set');
  assert.equal(rotated.puzzles, state.puzzles);
});

test('the seed field: a typed or rolled seed is used by Generate; otherwise each Generate draws a fresh seed', () => {
  let state = defaultGeneratorState();
  assert.equal(state.keepSeed, false);
  state = typeSeed(state, 'hello');
  assert.equal(state.keepSeed, true);
  assert.equal(typeSeed(state, '  ').keepSeed, false);
  const random = sequence(['AAAA-AAAA-AAAA', 'BBBB-BBBB-BBBB', 'CCCC-CCCC-CCCC']);
  assert.equal(rollSeed(state, random).seedText, 'AAAA-AAAA-AAAA');
  assert.equal(rollSeed(state, random).keepSeed, true);
  assert.equal(rollSeed(defaultGeneratorState(), () => 'ZZZZ-ZZZZ-ZZZZ').keepSeed, true, 'a rolled seed is kept even from the random default');
  const reused = beginSetRequest({ ...state, seedText: '  Cafe\u0301  ' }, random);
  assert.ok(reused.ok);
  assert.equal(reused.seed, 'Caf\u00e9');
  assert.equal(reused.state.seedText, 'Caf\u00e9');

  const drawn = beginSetRequest({ ...state, keepSeed: false }, random);
  assert.ok(drawn.ok);
  assert.equal(drawn.seed, 'CCCC-CCCC-CCCC');
  assert.equal(drawn.state.seedText, 'CCCC-CCCC-CCCC');
  assert.equal(drawn.state.keepSeed, false);

  const empty = beginSetRequest({ ...state, seedText: '   ', keepSeed: true }, random);
  assert.deepEqual(empty, { ok: false, reason: 'invalid-seed' });
  assert.equal(validSeed('x'.repeat(65)), null);
  assert.equal(validSeed('🎲'.repeat(64)), '🎲'.repeat(64));
});

test('each request counts up the batch index with the seed it is given; a new set starts again from 0', () => {
  let state = acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: null, setSeed: 'demo' });
  assert.equal(state.batchIndex, 0);
  for (const [i, seed] of ['1001', '1002'].entries()) {
    const batch = nextBatch(state, seed);
    assert.ok(batch);
    assert.deepEqual([batch.batchIndex, batch.batchSeed], [i + 1, seed]);
    state = { ...batch.state, puzzles: samplePuzzles, seenLayouts: mergeSeenKeys(state.seenLayouts, [`l${i}`]), seenClues: mergeSeenKeys(state.seenClues, [`c${i}`]) };
  }
  assert.equal(state.batchIndex, 2);
  assert.deepEqual([state.seenLayouts, state.seenClues], [['l0', 'l1'], ['c0', 'c1']]);

  const again = acceptSet(state, { set: sampleSet, calibration: null, setSeed: 'demo' });
  assert.deepEqual([again.batchIndex, again.seenLayouts, again.seenClues, again.puzzles], [0, [], [], []], 'even with the same seed');
  assert.equal(again.setsByBoard[boardKey(sampleSet.board)][0].batchIndex, 2, 'the replaced set is saved with its count');
  assert.equal(nextBatch(defaultGeneratorState(), '1'), null);
});

test('a board keeps at most 50 sets (49 saved and the one on show); sets are kept for the 10 most recent boards', () => {
  let many = defaultGeneratorState();
  for (let i = 0; i < MAX_SETS + 5; i += 1) {
    many = acceptSet(many, { set: sampleSet, calibration: null, setSeed: `s${i}` });
  }
  const key = boardKey(sampleSet.board);
  assert.equal(many.setsByBoard[key].length, MAX_SAVED_SETS);
  assert.equal(setTimelineLength(many), MAX_SETS);
  assert.equal(setsFull(many), true);
  assert.equal(setsFull({ ...many, setsByBoard: { [key]: many.setsByBoard[key].slice(1) } }), false);

  let boards = defaultGeneratorState();
  for (let i = 0; i <= MAX_SAVED_BOARDS + 1; i += 1) {
    boards = acceptSet(boards, { set: { ...sampleSet, board: rectangle(5 + i, 5) }, calibration: null, setSeed: `b${i}` });
  }
  const kept = Object.keys(boards.setsByBoard);
  assert.equal(kept.length, MAX_SAVED_BOARDS);
  assert.equal(kept.includes(boardKey(rectangle(5, 5))), false, 'the board used least recently goes');
});

test('the level a set was made for outlives the session; the calibration puzzle does not', () => {
  const state = acceptSet(defaultGeneratorState({ levelId: 'hard' }), { set: sampleSet, calibration: samplePuzzles[0], setSeed: 's' });
  assert.equal(readyLevelId({ ...state, levelId: 'easy' }), 'hard', 'changing the level keeps the set and its level');
  const restored = restoreState(JSON.parse(JSON.stringify(serializeState(state))));
  assert.deepEqual([restored.calibration, restored.calibrationTrusted, readyLevelId({ ...restored, levelId: 'easy' })], [null, false, 'hard']);
});

test('serialization round-trips and never stores timers, jobs or the calibration puzzle', () => {
  let state = acceptSet(
    defaultGeneratorState({ levelId: 'hard', seedText: 'demo', keepSeed: true, uniqueness: 'require', rotation: 90 }),
    { set: sampleSet, calibration: samplePuzzles[0], setSeed: 'demo' },
  );
  state = { ...state, batchIndex: 2, puzzles: samplePuzzles, seenLayouts: ['L1'], seenClues: ['C1'] };
  state = { ...state, job: { requestId: 1, revision: 'r', startedAt: 1 } };
  const dto = serializeState(state);
  assert.equal(dto.v, 1);
  assert.deepEqual(Object.keys(dto).sort(), [
    'batchIndex', 'boardRows', 'calibrationFor', 'history', 'keepSeed', 'levelId', 'presetId', 'puzzles',
    'rotation', 'seedText', 'setPack', 'setSeed', 'setsByBoard', 'uniqueness', 'v',
  ]);
  assert.deepEqual(Object.keys(serializeState(defaultGeneratorState())).sort(), [
    'boardRows', 'keepSeed', 'levelId', 'presetId', 'rotation', 'seedText', 'setsByBoard', 'uniqueness', 'v',
  ], 'without a set, no set fields');
  const restored = restoreState(JSON.parse(JSON.stringify(dto)));
  assert.equal(restored.levelId, 'hard');
  assert.equal(restored.uniqueness, 'require');
  assert.equal(restored.keepSeed, true);
  assert.equal(restored.rotation, 90);
  assert.equal(restored.setSeed, 'demo');
  assert.equal(restored.batchIndex, 2);
  assert.equal(restored.job, null);
  assert.equal(restored.puzzles.length, 3);
  assert.equal(restored.calibration, null);
  assert.deepEqual(restored.calibrationFor, { levelId: 'hard', uniqueness: 'require' });
  assert.deepEqual(restored.seenLayouts, ['L1']);
  assert.equal(restored.set?.carving, 'flat');
  assert.ok(boardsEqual(restored.set?.board ?? rectangle(1, 1), sampleSet.board));
});

test('older storage with the puzzles and the calibration in full packs is read and saved in the current shape', () => {
  const state = {
    ...acceptSet(defaultGeneratorState({ levelId: 'hard' }), { set: sampleSet, calibration: samplePuzzles[0], setSeed: 'old' }),
    puzzles: samplePuzzles,
  };
  const { puzzles: _puzzles, ...current } = /** @type {Record<string, any>} */ (JSON.parse(JSON.stringify(serializeState(state))));
  const setPack = /** @type {any} */ (current.setPack);
  const fullPack = (/** @type {any[]} */ puzzles) => ({ ...setPack, kind: 'puzzle-pack', puzzles });
  const savedPuzzles = /** @type {any} */ (savedSetOf(state)).puzzles;
  const old = { ...current, batchPack: fullPack(savedPuzzles), calibrationPack: fullPack(savedPuzzles.slice(0, 1)) };
  const legacy = { ...old, setSeed: 'older' };
  const restored = restoreState({ ...old, setsByBoard: { [boardKey(sampleSet.board)]: [legacy] } });
  assert.deepEqual([restored.setSeed, restored.puzzles.length], ['old', 3]);
  const again = /** @type {any} */ (serializeState(restored));
  const saved = again.setsByBoard[boardKey(sampleSet.board)][0];
  assert.deepEqual([saved.setSeed, saved.puzzles.length, 'batchPack' in saved, 'calibrationPack' in saved], ['older', 3, false, false]);
});

test('puzzle seeds are stored in their puzzles, restored from them, and kept with each saved set', () => {
  let state = acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: null, setSeed: 'demo' });
  const [first, second] = samplePuzzles;
  state = { ...state, batchIndex: 2, puzzles: [first, second] };
  state = { ...state, puzzleSeeds: { [first.id]: 'demo#1', [second.id]: 'demo#2', gone: 'demo#7', bad: /** @type {any} */ (5) } };
  const dto = /** @type {any} */ (serializeState(state));
  assert.equal('puzzleSeeds' in dto, false, 'no separate map: the seeds are not stored twice');
  assert.deepEqual(dto.puzzles.map((/** @type {any} */ p) => p.seed), ['demo#1', 'demo#2'], 'each puzzle carries its seed');
  const restored = restoreState(JSON.parse(JSON.stringify(dto)));
  assert.deepEqual(restored.puzzleSeeds, { [first.id]: 'demo#1', [second.id]: 'demo#2' });

  // Older storage: puzzles without seeds and the seeds in a separate map.
  const unseeded = dto.puzzles.map((/** @type {any} */ { seed: _seed, ...p }) => p);
  const legacy = { ...JSON.parse(JSON.stringify(dto)), puzzles: unseeded, puzzleSeeds: { [first.id]: 'demo#1', [second.id]: 'demo#2', gone: 'x' } };
  assert.deepEqual(restoreState(legacy).puzzleSeeds, { [first.id]: 'demo#1', [second.id]: 'demo#2' }, 'an older map still gives the seeds');
  const damaged = restoreState({ ...legacy, puzzleSeeds: { [first.id]: '', [second.id]: 'x'.repeat(300) } });
  assert.deepEqual(damaged.puzzleSeeds, {}, 'empty or oversized seeds are dropped');
  assert.deepEqual(restoreState({ ...legacy, puzzleSeeds: ['demo#1'] }).puzzleSeeds, {});

  // A set that moves into the history keeps its seeds, and a new set starts without any.
  const next = acceptSet(state, { set: sampleSet, calibration: null, setSeed: 'other' });
  assert.deepEqual(next.puzzleSeeds, {});
  const savedNext = /** @type {any} */ (next.setsByBoard[boardKey(sampleSet.board)][0]);
  assert.deepEqual([savedNext.puzzles.map((/** @type {any} */ p) => p.seed), 'puzzleSeeds' in savedNext], [['demo#1', 'demo#2'], false]);
  const back = gotoSet(next, 1);
  assert.deepEqual(back?.puzzleSeeds, { [first.id]: 'demo#1', [second.id]: 'demo#2' });
});

test('restoring validates every part and falls back individually', () => {
  const state = acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: samplePuzzles[0], setSeed: 'demo' });
  const dto = JSON.parse(JSON.stringify(serializeState({ ...state, puzzles: samplePuzzles })));

  const damaged = restoreState({ ...dto, setPack: { format: 'nope' }, rotation: 50, levelId: 'hell-9', boardRows: ['##', '#x'] });
  assert.equal(damaged.set, null);
  assert.equal(damaged.rotation, 0);
  assert.equal(damaged.levelId, 'normal');
  assert.equal(activeCount(damaged.board), 60);

  const wrongBatch = restoreState({ ...dto, puzzles: [{ ...dto.puzzles[0], clues: [{ piece: 'nope', x: 0, y: 0, turn: 0, mirrored: false }] }] });
  assert.ok(wrongBatch.set);
  assert.deepEqual(wrongBatch.puzzles, [], 'puzzles that do not fit the set are dropped');

  const noSeed = restoreState({ ...dto, setSeed: '' });
  assert.equal(noSeed.set, null);

  const huge = restoreState({ ...dto, boardRows: Array.from({ length: 40 }, () => '#'.repeat(40)) });
  assert.equal(huge.board.width, 10, 'a board beyond 32 squares is not restored');

  assert.equal(restoreState(null).set, null);
  assert.equal(restoreState({ v: 2 }).set, null);
  assert.equal(restoreState('x').set, null);
  assert.equal(restoreState({ ...dto, history: { layouts: [1], clues: ['ok'] } }).seenLayouts.length, 0);

  const withHistory = restoreState({ ...dto, setsByBoard: { whatever: [dto, { bad: true }, dto] } });
  assert.deepEqual(Object.keys(withHistory.setsByBoard), [boardKey(sampleSet.board)], 'sets are filed by their own board, not by the stored key');
  assert.equal(withHistory.setsByBoard[boardKey(sampleSet.board)].length, 2, 'a damaged set is left out');
  const older = restoreState({ ...dto, setHistory: [dto, { bad: true }, dto] });
  assert.equal(Object.values(older.setsByBoard).flat().length, 2, 'the older single list of saved sets is still read, and sorted by board');
});

test('boardKey: "<width>x<height>:<bits>", one bit per cell in base64url', () => {
  assert.equal(boardKey(rectangle(3, 3)), '3x3:_4', '9 cells: 111111 111000');
  assert.equal(boardKey(rectangle(2, 2)), '2x2:8', '4 cells then zero padding: 111100');
  assert.equal(boardKey(setCell(rectangle(3, 3), 0, 0, 0)), '3x3:f4', 'the first cell is the highest bit: 011111 111000');
  assert.notEqual(boardKey(rectangle(10, 6)), boardKey(rectangle(6, 10)), 'the size is part of the key');
  assert.equal(boardKey(rectangle(20, 20)).length, '20x20:'.length + 67, 'a 20x20 board takes 67 characters');
  assert.equal(boardKey(rectangle(5, 4)), boardKey(boardFromRows(boardToRows(rectangle(5, 4)))));
});

test('the sets are kept by board: only the sets of the board in step 1 are listed', () => {
  const small = rectangle(5, 4);
  const first = acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: null, setSeed: 'a' });
  const second = acceptSet(first, { set: sampleSet, calibration: null, setSeed: 'b' });
  assert.deepEqual(Object.keys(second.setsByBoard), [boardKey(sampleSet.board)]);
  assert.deepEqual([setTimelineLength(second), setViewPosition(second)], [2, { index: 0, total: 2 }]);
  // Editing the board shows the sets of the new board: none here, so the list is empty and the set goes under its own board.
  const edited = withBoard(second, small);
  assert.deepEqual([edited.set, setTimelineLength(edited), setViewPosition(edited)], [null, 0, { index: -1, total: 0 }]);
  assert.deepEqual(setNumber(edited), { n: null, total: 0 });
  assert.equal(edited.setsByBoard[boardKey(sampleSet.board)].length, 2, 'both sets are kept for their board');
  // Back to the old board, its list is there again, newest first.
  const back = withBoard(edited, sampleSet.board);
  assert.deepEqual([back.setSeed, setViewPosition(back), setNumber(back)], ['b', { index: 0, total: 2 }, { n: 2, total: 2 }]);
  // A set for the new board is listed alone; the first board keeps its own list.
  const other = acceptSet(edited, { set: { ...sampleSet, board: small }, calibration: null, setSeed: 'c' });
  assert.deepEqual(Object.keys(other.setsByBoard), [boardKey(sampleSet.board)], 'the set on show is not in the dictionary');
  assert.equal(setTimelineLength(other), 1);
  const again = acceptSet(withBoard(other, sampleSet.board), { set: sampleSet, calibration: null, setSeed: 'd' });
  assert.deepEqual(Object.keys(again.setsByBoard).sort(), [boardKey(small), boardKey(sampleSet.board)].sort());
  assert.equal(again.setsByBoard[boardKey(small)].length, 1);
  assert.equal(again.setsByBoard[boardKey(sampleSet.board)].length, 2);
  // Remove all sets clears the board in step 1 only.
  const cleared = removeAllSets(again);
  assert.deepEqual(Object.keys(cleared.setsByBoard), [boardKey(small)], 'the other board keeps its sets');
  assert.equal(cleared.set, null);
});

test('a restored set that does not belong to the stored board is kept for its own board, not shown', () => {
  const state = acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: null, setSeed: 'demo' });
  const dto = JSON.parse(JSON.stringify(serializeState(state)));
  dto.boardRows = boardToRows(rectangle(8, 8));
  const restored = restoreState(dto);
  assert.equal(restored.set, null);
  assert.equal(restored.setsByBoard[boardKey(sampleSet.board)].length, 1);
});

test('saved sets can become current again', () => {
  const first = acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: samplePuzzles[0], setSeed: 'one' });
  const second = acceptSet(first, { set: sampleSet, calibration: null, setSeed: 'two' });
  const saved = second.setsByBoard[boardKey(sampleSet.board)][0];
  assert.equal(saved.setSeed, 'one');
  assert.ok(savedSetOf(first));
  const back = gotoSet(second, 1);
  assert.ok(back);
  assert.equal(back.setSeed, 'one');
  assert.equal(back.calibration, null, 'the calibration puzzle is not saved');
  assert.deepEqual(back.calibrationFor, first.calibrationFor);
  assert.equal(readSavedSet(/** @type {any} */ ({ setSeed: 'x' })), null);
});

test('loading reads the saved state; unknown stored fields are ignored', () => {
  const dto = { ...serializeState(defaultGeneratorState({ levelId: 'easy' })), largeBoards: true };
  const loaded = loadGeneratorState(fakeStorage({ state: dto }));
  assert.equal(loaded.levelId, 'easy');
  assert.equal('largeBoards' in loaded, false);
  const broken = loadGeneratorState({
    getGeneratorState: () => { throw new Error('denied'); },
    setGeneratorState: () => ({ ok: false }),
  });
  assert.equal(activeCount(broken.board), 60);
});

test('persistence debounces by 300 ms and writes only committed state', () => {
  const store = createGeneratorStore();
  const io = fakeStorage();
  const timers = fakeTimers();
  const persistence = createPersistence(store, io, timers);
  store.update({ levelId: 'hard' });
  store.update({ seedText: 'a' });
  assert.equal(timers.pending(), 1, 'one pending write');
  assert.deepEqual(timers.delays, [300, 300]);
  assert.equal(io.writes.state.length, 0);
  timers.run();
  assert.equal(io.writes.state.length, 1);
  assert.equal(/** @type {any} */ (io.writes.state[0]).levelId, 'hard');

  store.update({ job: { requestId: 1, revision: 'r', startedAt: 5 } });
  assert.equal(timers.pending(), 0, 'a job is not part of the generator state');

  store.update({ keepSeed: true });
  persistence.flush();
  assert.equal(io.writes.state.length, 2);
  store.update({ seedText: 'last' });
  persistence.destroy();
  assert.equal(io.writes.state.length, 3, 'destroy flushes a pending write');
});

test('storage failures never throw: a full storage retries smaller and reports', () => {
  const store = createGeneratorStore(acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: samplePuzzles[0], setSeed: 'a' }));
  const io = fakeStorage();
  const timers = fakeTimers();
  const failures = [];
  io.failState = (snapshot) => Object.keys(snapshot.setsByBoard).length > 0;
  createPersistence(store, io, { ...timers, onFailure: (f) => failures.push(f) });
  store.update((s) => acceptSet({ ...s, puzzles: samplePuzzles }, { set: sampleSet, calibration: null, setSeed: 'b' }));
  timers.run();
  assert.equal(failures.length, 1, 'only the full snapshot was refused');
  assert.equal(io.writes.state.length, 1);
  assert.deepEqual(/** @type {any} */ (io.writes.state[0]).setsByBoard, {});

  io.failState = () => true;
  store.update({ levelId: 'easy' });
  assert.doesNotThrow(() => timers.run());
  assert.equal(failures.length, 4);

  const many = createGeneratorStore();
  let state = many.getState();
  for (let i = 0; i < 9; i += 1) {
    state = acceptSet(state, { set: sampleSet, calibration: null, setSeed: `m${i}` });
  }
  many.update(() => state);
  const io2 = fakeStorage();
  const t3 = fakeTimers();
  io2.failState = (snapshot) => Math.max(0, ...Object.values(snapshot.setsByBoard).map((list) => list.length)) > 2;
  createPersistence(many, io2, t3);
  many.update({ levelId: 'easy' });
  t3.run();
  assert.equal(Object.values(/** @type {any} */ (io2.writes.state[0]).setsByBoard)[0].length, 2, 'older sets are dropped a few at a time, newest kept');

  const throwing = createGeneratorStore();
  const failing = { ...fakeStorage(), setGeneratorState: () => { throw new Error('denied'); } };
  const t2 = fakeTimers();
  createPersistence(throwing, failing, t2);
  throwing.update({ levelId: 'easy' });
  assert.doesNotThrow(() => t2.run());
});
