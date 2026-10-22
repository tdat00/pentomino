// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { activeCount, boardToRows, preset, rectangle } from '../core/engine/board.js';
import { packBoard, parsePack } from '../core/engine/pack.js';
import { LIMITS } from '../core/engine/policy.js';
import { batchSeedFor } from '../core/engine/rng.js';
import { formatNotice } from '../generator/strings.js';
import {
  HISTORY_LIMIT, LISTED_LEVEL_IDS, MAX_SAVED_SETS, acceptSet, beginSetRequest, boardsEqual, calibrationCurrent, capFor,
  createEditHistory, createGeneratorStore, createPersistence, defaultGeneratorState, describeBoard, describeCount,
  describeLevels, detectHardware, isPhone, loadGeneratorState, needsStaleConfirm, nextBatch, nearestOfferedLevel,
  recordBatch, resizeBoard, restoreState, rollSeed, savedSetOf, serializeState, setCell, trimBoard, typeSeed, useSavedSet,
  validSeed, withBoard,
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
 * @param {Record<string, boolean>} [prefs]
 */
function fakeStorage(stored = {}, prefs = {}) {
  /** @type {{ state: unknown[], prefs: unknown[] }} */
  const writes = { state: [], prefs: [] };
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
    getPrefs: () => prefs,
    /** @param {Record<string, boolean>} partial */
    setPrefs(partial) {
      writes.prefs.push(partial);
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
  assert.equal(description.statusText, '60 / 484 playable squares · connected');
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
  assert.deepEqual(count, { kmin: 16, kmax: 18, sizeMin: 12, sizeMax: 34, share: 38 });
  assert.equal(describeCount('nightmare', 60), null);
  assert.equal(describeCount('hard', 0), null);
});

test('notices carry the exact wording and reject missing parameters', () => {
  assert.equal(formatNotice('N-SMALL'), 'A board needs at least 30 playable squares to generate puzzles.');
  assert.equal(formatNotice('N-STALE'), 'Board changed — generate a new piece set.');
  assert.equal(formatNotice('N-COUNT', { kmin: 16, kmax: 18, level: 'Hard', share: 38 }), 'This board uses 16–18 pieces at Hard, about 38 % pre-placed.');
  assert.equal(formatNotice('N-LEVELS', { highest: 'Master' }, 'above'), 'Levels above Master need a larger board.');
  assert.throws(() => formatNotice('N-CAP', { area: 500 }), RangeError);
  assert.throws(() => formatNotice('N-NOPE'), RangeError);
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

test('device caps: 484 desktop, 360 phone, 676 only for desktop Large boards', () => {
  const base = defaultGeneratorState();
  assert.equal(capFor(base, DESKTOP), LIMITS.releaseMaxActive);
  assert.equal(capFor(base, PHONE), LIMITS.phoneMaxActive);
  assert.equal(capFor({ ...base, largeBoards: true }, DESKTOP), 676);
  assert.equal(capFor({ ...base, largeBoards: true }, PHONE), LIMITS.phoneMaxActive, 'a persisted desktop opt-in is ignored on phones');

  const big = withBoard(base, rectangle(23, 22));
  assert.equal(activeCount(big.board), 506);
  let description = describeBoard(big, DESKTOP);
  assert.equal(description.valid, false);
  assert.equal(description.statusText, 'This board has 506 playable squares; the limit on this device is 484.');
  description = describeBoard({ ...big, largeBoards: true }, DESKTOP);
  assert.equal(description.valid, true);
  const codes = description.notices.map((n) => n.code);
  assert.ok(codes.includes('N-LARGE') && codes.includes('N-EXPERIMENTAL'));
  assert.equal(description.notices.find((n) => n.code === 'N-EXPERIMENTAL')?.text, 'Experimental: boards above 484 squares may not finish all 5 puzzles within 2 minutes.');

  const phoneBoard = withBoard(base, rectangle(19, 19));
  assert.equal(describeBoard(phoneBoard, PHONE).statusText, 'This board has 361 playable squares; the limit on this device is 360.');
  assert.equal(describeBoard(phoneBoard, DESKTOP).valid, true);
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

test('trim removes blocked margins as an explicit edit and a level follows the area', () => {
  let board = rectangle(12, 8);
  for (let x = 0; x < 12; x += 1) {
    board = setCell(setCell(board, x, 0, 0), x, 7, 0);
  }
  const state = withBoard(defaultGeneratorState(), board);
  const trimmed = trimBoard(state);
  assert.equal(trimmed.board.height, 6);
  assert.equal(activeCount(trimmed.board), 72);
  assert.equal(nearestOfferedLevel('very-easy', 360), 'hard');
  assert.equal(nearestOfferedLevel('hell-3', 60), 'master');
  assert.equal(nearestOfferedLevel('hard', 10), null);
  const large = withBoard(defaultGeneratorState({ levelId: 'normal' }), rectangle(20, 18));
  assert.equal(large.levelId, 'hard', 'an unavailable level moves to the nearest offered one');
  const tiny = withBoard(defaultGeneratorState({ levelId: 'normal' }), rectangle(3, 3));
  assert.equal(tiny.levelId, 'normal', 'nothing is offered, so the choice stays');
});

test('a board edit after a set exists marks it stale while the set keeps its board', () => {
  let state = acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: samplePuzzles[0], setSeed: 'alpha' });
  assert.equal(state.stale, false);
  assert.equal(needsStaleConfirm(state), true);
  const originalBoard = state.set?.board;
  state = { ...state, puzzles: samplePuzzles };
  const edited = withBoard(state, setCell(state.board, 0, 0, 0));
  assert.equal(edited.stale, true);
  assert.equal(needsStaleConfirm(edited), false);
  assert.equal(edited.set?.board, originalBoard, 'the set keeps its own board');
  assert.equal(activeCount(edited.set?.board ?? rectangle(1, 1)), 60);
  assert.equal(edited.puzzles.length, 3);
  assert.equal(describeBoard(edited, DESKTOP).notices[0].text, 'Board changed — generate a new piece set.');
  const reverted = withBoard(edited, sampleSet.board);
  assert.equal(reverted.stale, false, 'restoring the board clears stale');
  assert.equal(withBoard(edited, edited.board, 90).stale, true);
  const rotated = withBoard(state, state.board, 90);
  assert.equal(rotated.stale, false, 'rotating the view never invalidates');
  assert.equal(rotated.set, state.set);
  assert.equal(rotated.puzzles, state.puzzles);
});

test('Keep seed rules: typing turns it on, the dice keeps it, Generate draws or reuses', () => {
  let state = defaultGeneratorState();
  assert.equal(state.keepSeed, false);
  state = typeSeed(state, 'hello');
  assert.equal(state.keepSeed, true);
  assert.equal(typeSeed(state, '  ').keepSeed, false);
  const random = sequence(['AAAA-AAAA-AAAA', 'BBBB-BBBB-BBBB', 'CCCC-CCCC-CCCC']);
  assert.equal(rollSeed(state, random).seedText, 'AAAA-AAAA-AAAA');
  assert.equal(rollSeed(state, random).keepSeed, true);

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

test('batch seeds increment per request and a regenerated set restarts the sequence', () => {
  let state = acceptSet(defaultGeneratorState({ keepSeed: true, seedText: 'demo' }), { set: sampleSet, calibration: null, setSeed: 'demo' });
  assert.equal(state.batchIndex, 0);
  const seeds = [];
  for (let i = 0; i < 2; i += 1) {
    const batch = nextBatch(state);
    assert.ok(batch);
    state = batch.state;
    seeds.push(batch.batchSeed);
    state = recordBatch(state, { puzzles: samplePuzzles, seenLayouts: [`l${i}`], seenClues: [`c${i}`], append: i > 0 });
  }
  assert.deepEqual(seeds, ['demo#1', 'demo#2']);
  assert.equal(seeds[0], batchSeedFor('demo', 1));
  assert.equal(state.batchIndex, 2);
  assert.deepEqual(state.seenLayouts, ['l0', 'l1']);
  assert.equal(state.puzzles.length, 6, 'Add more appends');

  const failed = nextBatch(state);
  assert.ok(failed);
  assert.equal(failed.batchSeed, 'demo#3', 'a failed or cancelled request never rolls the index back');

  const again = acceptSet(state, { set: sampleSet, calibration: null, setSeed: 'demo' });
  assert.equal(again.batchIndex, 0);
  assert.deepEqual(again.seenLayouts, []);
  assert.deepEqual(again.seenClues, []);
  assert.deepEqual(again.puzzles, []);
  assert.equal(nextBatch(again)?.batchSeed, 'demo#1', 'the same sequence is reproduced from fresh history');
  assert.equal(again.setHistory.length, 1);
  assert.equal(again.setHistory[0].batchIndex, 2);
  assert.equal(nextBatch(defaultGeneratorState()), null);

  let many = again;
  for (let i = 0; i < 8; i += 1) {
    many = acceptSet(many, { set: sampleSet, calibration: null, setSeed: `s${i}` });
  }
  assert.equal(many.setHistory.length, MAX_SAVED_SETS);
});

test('changing the level keeps the set; the calibration is current only for its own settings', () => {
  let state = acceptSet(defaultGeneratorState({ levelId: 'hard' }), { set: sampleSet, calibration: samplePuzzles[0], setSeed: 's' });
  assert.equal(calibrationCurrent(state), true);
  state = { ...state, levelId: 'easy' };
  assert.equal(calibrationCurrent(state), false);
  assert.equal(state.set, sampleSet);
  state = { ...state, levelId: 'hard', uniqueness: 'require' };
  assert.equal(calibrationCurrent(state), false);
});

test('serialization round-trips and never stores timers, jobs or large boards', () => {
  let state = acceptSet(
    defaultGeneratorState({ levelId: 'hard', seedText: 'demo', keepSeed: true, uniqueness: 'require', omitSolutions: true, rotation: 90, largeBoards: true }),
    { set: sampleSet, calibration: samplePuzzles[0], setSeed: 'demo' },
  );
  state = recordBatch({ ...state, batchIndex: 2 }, { puzzles: samplePuzzles, seenLayouts: ['L1'], seenClues: ['C1'], append: false });
  state = { ...state, job: { requestId: 1, revision: 'r', stage: 'x', startedAt: 1 } };
  const dto = serializeState(state);
  assert.equal(dto.v, 1);
  assert.equal('largeBoards' in dto, false);
  assert.equal('job' in dto, false);
  assert.deepEqual(Object.keys(dto).sort(), [
    'batchIndex', 'batchPack', 'boardRows', 'calibrationFor', 'calibrationPack', 'history', 'keepSeed', 'levelId', 'omitSolutions',
    'rotation', 'seedText', 'setHistory', 'setPack', 'setSeed', 'uniqueness', 'v',
  ]);
  const restored = restoreState(JSON.parse(JSON.stringify(dto)));
  assert.equal(restored.levelId, 'hard');
  assert.equal(restored.uniqueness, 'require');
  assert.equal(restored.keepSeed, true);
  assert.equal(restored.omitSolutions, true);
  assert.equal(restored.rotation, 90);
  assert.equal(restored.setSeed, 'demo');
  assert.equal(restored.batchIndex, 2);
  assert.equal(restored.job, null);
  assert.equal(restored.stale, false);
  assert.equal(restored.puzzles.length, 3);
  assert.equal(restored.calibration?.id, samplePuzzles[0].id);
  assert.deepEqual(restored.calibrationFor, { levelId: 'hard', uniqueness: 'require' });
  assert.deepEqual(restored.seenLayouts, ['L1']);
  assert.equal(restored.set?.carving, 'flat');
  assert.ok(boardsEqual(restored.set?.board ?? rectangle(1, 1), sampleSet.board));
  assert.equal(restored.largeBoards, false);
});

test('restoring validates every part and falls back individually', () => {
  const state = acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: samplePuzzles[0], setSeed: 'demo' });
  const dto = JSON.parse(JSON.stringify(serializeState({ ...state, puzzles: samplePuzzles })));

  const damaged = restoreState({ ...dto, setPack: { format: 'nope' }, rotation: 50, levelId: 'hell-9', boardRows: ['##', '#x'] });
  assert.equal(damaged.set, null);
  assert.equal(damaged.rotation, 0);
  assert.equal(damaged.levelId, 'normal');
  assert.equal(activeCount(damaged.board), 60);

  const wrongBatch = restoreState({ ...dto, batchPack: { ...dto.batchPack, board: { rows: ['###'] } } });
  assert.ok(wrongBatch.set);
  assert.deepEqual(wrongBatch.puzzles, [], 'a batch for another board is dropped');

  const noSeed = restoreState({ ...dto, setSeed: '' });
  assert.equal(noSeed.set, null);

  const huge = restoreState({ ...dto, boardRows: Array.from({ length: 40 }, () => '#'.repeat(40)) });
  assert.equal(huge.board.width, 10, 'a board beyond 32 squares is not restored');

  assert.equal(restoreState(null).set, null);
  assert.equal(restoreState({ v: 2 }).set, null);
  assert.equal(restoreState('x').set, null);
  assert.equal(restoreState({ ...dto, history: { layouts: [1], clues: ['ok'] } }).seenLayouts.length, 0);

  const withHistory = restoreState({ ...dto, setHistory: [dto, { bad: true }, dto] });
  assert.equal(withHistory.setHistory.length, 2);
});

test('a restored set is stale when the stored board no longer matches', () => {
  const state = acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: null, setSeed: 'demo' });
  const dto = JSON.parse(JSON.stringify(serializeState(state)));
  dto.boardRows = boardToRows(rectangle(8, 8));
  const restored = restoreState(dto);
  assert.equal(restored.stale, true);
  assert.ok(restored.set);
  assert.equal(activeCount(restored.set.board), 60);
});

test('saved sets can become current again', () => {
  const first = acceptSet(defaultGeneratorState(), { set: sampleSet, calibration: samplePuzzles[0], setSeed: 'one' });
  const second = acceptSet(first, { set: sampleSet, calibration: null, setSeed: 'two' });
  const saved = second.setHistory[0];
  assert.equal(saved.setSeed, 'one');
  assert.ok(savedSetOf(first));
  const back = useSavedSet(second, saved);
  assert.ok(back);
  assert.equal(back.setSeed, 'one');
  assert.equal(back.calibration?.id, samplePuzzles[0].id);
  assert.equal(useSavedSet(second, /** @type {any} */ ({ setSeed: 'x' })), null);
});

test('loading starts from stored preferences; a legacy largeBoards copy in gen:state is ignored', () => {
  const dto = { ...serializeState(defaultGeneratorState({ levelId: 'easy' })), largeBoards: true };
  const loaded = loadGeneratorState(fakeStorage({ state: dto }, { largeBoards: false, labels: false }));
  assert.equal(loaded.largeBoards, false);
  assert.equal(loaded.levelId, 'easy');
  assert.equal(loaded.prefs.labels, false);
  assert.equal(loaded.prefs.timer, true);
  assert.equal(loadGeneratorState(fakeStorage({}, { largeBoards: true })).largeBoards, true);
  const broken = loadGeneratorState({
    getGeneratorState: () => { throw new Error('denied'); },
    setGeneratorState: () => ({ ok: false }),
    getPrefs: () => { throw new Error('denied'); },
    setPrefs: () => ({ ok: false }),
  });
  assert.equal(activeCount(broken.board), 60);
  assert.equal(capFor(loaded, DESKTOP), 484);
  assert.equal(capFor(loadGeneratorState(fakeStorage({}, { largeBoards: true })), PHONE), LIMITS.phoneMaxActive);
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
  assert.equal(io.writes.prefs.length, 0);

  store.update({ job: { requestId: 1, revision: 'r', stage: 'carving', startedAt: 5 }, editUnrotated: true });
  assert.equal(timers.pending(), 0, 'jobs and view toggles are not persisted');
  store.update({ largeBoards: true });
  timers.run();
  assert.deepEqual(io.writes.prefs, [{ labels: true, patterns: true, timer: true, straighten: false, largeBoards: true }]);
  assert.equal(io.writes.state.length, 1, 'Large boards never touches gen:state');

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
  io.failState = (snapshot) => snapshot.setHistory.length > 0;
  createPersistence(store, io, { ...timers, onFailure: (f) => failures.push(f) });
  store.update((s) => acceptSet({ ...s, puzzles: samplePuzzles }, { set: sampleSet, calibration: null, setSeed: 'b' }));
  timers.run();
  assert.equal(failures.length, 1, 'only the full snapshot was refused');
  assert.equal(io.writes.state.length, 1);
  assert.deepEqual(/** @type {any} */ (io.writes.state[0]).setHistory, []);

  io.failState = () => true;
  store.update({ levelId: 'easy' });
  assert.doesNotThrow(() => timers.run());
  assert.equal(failures.length, 4);

  const throwing = createGeneratorStore();
  const failing = { ...fakeStorage(), setGeneratorState: () => { throw new Error('denied'); } };
  const t2 = fakeTimers();
  createPersistence(throwing, failing, t2);
  throwing.update({ levelId: 'easy' });
  assert.doesNotThrow(() => t2.run());
});
