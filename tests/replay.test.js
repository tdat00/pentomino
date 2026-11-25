// @ts-check
// Replay runs (MP15a1, design §6.12): `runReplay` on the replay fixture of tests/fixtures/replay-case-v4.json (hard,
// 10 x 6, `require`, the set seed replay-case-0: two batch packs of the same set, the first puzzle of pack 0 being
// the set's reused calibration puzzle). The fixture has no skip of any kind, so the skip cases (17) are made by the
// real engine and never written by hand. MP15a2 adds `replayPuzzle` and its steps at the end of the file.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { activeCount, boardFromRows } from '../core/engine/board.js';
import { breakdownV3 } from '../core/engine/difficulty.js';
import { provenanceVersions, puzzleCandidate, setAttempt } from '../core/engine/generate.js';
import { poseCells } from '../core/engine/geometry.js';
import { level } from '../core/engine/levels.js';
import { parsePack, serializePack, validatePack } from '../core/engine/pack.js';
import { BUDGETS, pieceCountRange, REPLAY } from '../core/engine/policy.js';
import { finalStep, ReplayCancelledError, replayPuzzle, runReplay, sameVersions, utf8Length } from '../core/engine/replay.js';
import { normalizeSeedText } from '../core/engine/rng.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';

/** @typedef {import('../core/engine/types.js').PieceSet} PieceSet */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/replay.js').ReplayRun} ReplayRun */
/** @typedef {import('../core/engine/replay.js').ReplayResult} ReplayResult */
/** @typedef {{ name: string, set: PieceSet, puzzle: any, generation: any }} ReplayInput */

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/replay-case-v4.json', import.meta.url), 'utf8'));
const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const scratch = createWorkspace(SCRATCH_WORKSPACE_BYTES);
const workspaces = { ws, scratch };
const execution = { main: ws, scratch };

/**
 * The set of a pack as the Generator's `setFromPack` builds it (board, pieces, witness, carving, macro region).
 * @param {any} pack
 * @returns {PieceSet}
 */
function setOfPack(pack) {
  return {
    board: boardFromRows(pack.board.rows),
    pieces: pack.pieces,
    witness: pack.witness ?? null,
    carving: pack.generation.carving,
    macroRegion: pack.generation.macroRegion,
  };
}

/**
 * Every puzzle of both fixture packs, with its pack's set and whole `generation` object.
 * @returns {ReplayInput[]}
 */
function fixtureInputs() {
  return FIXTURE.packs.flatMap((/** @type {unknown} */ raw, /** @type {number} */ packIndex) => {
    const read = validatePack(raw);
    assert.ok(read.ok, 'the fixture pack is valid');
    const pack = /** @type {any} */ (read.value);
    const set = setOfPack(pack);
    return pack.puzzles.map((/** @type {any} */ puzzle, /** @type {number} */ index) => ({
      name: `pack ${packIndex} puzzle ${index}`, set, puzzle, generation: pack.generation,
    }));
  });
}

const INPUTS = fixtureInputs();
/** @param {ReplayInput} input */
const madeOf = (input) => input.generation.made[input.puzzle.id];
const CALIBRATION = INPUTS.filter((i) => madeOf(i).kind === 'calibration');
const CANDIDATES = INPUTS.filter((i) => madeOf(i).kind === 'candidate');
/** A candidate puzzle that is cheap to replay and won without a repair or a restart. */
const PLAIN = /** @type {ReplayInput} */ (INPUTS.find((i) => i.name === 'pack 1 puzzle 0'));

/** @type {Map<string, ReplayRun>} */
const FULL = new Map();
/**
 * The run of a fixture input with the default bounds, made once per puzzle.
 * @param {ReplayInput} input
 * @returns {ReplayRun}
 */
function fullRun(input) {
  const known = FULL.get(input.puzzle.id);
  if (known !== undefined) {
    return known;
  }
  const run = runReplay(input, workspaces, REPLAY);
  FULL.set(input.puzzle.id, run);
  return run;
}

/** @param {ReplayRun} run */
const kindsOf = (run) => run.events.map((e) => `${e.stage}/${e.kind}`);
/** @param {ReplayRun} run @returns {Omit<ReplayRun, 'set' | 'events'>} */
const outcomeOf = ({ set: _set, events: _events, ...rest }) => rest;

/**
 * A copy of the input whose generation is edited by `edit`.
 * @param {ReplayInput} input
 * @param {(generation: any) => void} edit
 * @returns {ReplayInput}
 */
function edited(input, edit) {
  const generation = structuredClone(input.generation);
  edit(generation);
  return { ...input, generation };
}

/** Throws when called: a replay that must decide before any metered unit never reaches it. */
const neverCancelled = () => {
  throw new Error('isCancelled was reached');
};

/**
 * @param {unknown} value
 * @param {string} path
 */
function assertPlain(value, path) {
  assert.notEqual(value, undefined, `${path} is undefined`);
  assert.notEqual(typeof value, 'function', `${path} is a function`);
  assert.ok(!ArrayBuffer.isView(value), `${path} is a typed array`);
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `${path} is not finite`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => assertPlain(v, `${path}[${i}]`));
  } else if (typeof value === 'object' && value !== null) {
    assert.equal(Object.getPrototypeOf(value), Object.prototype, `${path} is not a plain object`);
    for (const [k, v] of Object.entries(value)) {
      assertPlain(v, `${path}.${k}`);
    }
  }
}

const ALL_FIELDS = ['board', 'pieces', 'witness', 'clues', 'rating', 'solution'];

// ---------------------------------------------------------------------------------------------------------------
// 1. Every fixture puzzle replays and matches.

test('every puzzle of both fixture packs replays: matched, every field compared, the calibration puzzle as such', () => {
  assert.equal(INPUTS.length, 8);
  assert.equal(CALIBRATION.length, 1);
  for (const input of INPUTS) {
    const run = fullRun(input);
    const name = input.name;
    assert.equal(run.status, 'matched', name);
    assert.equal(run.reason, null, name);
    assert.equal(run.stages.set, 'replayed', name);
    assert.equal(run.stages.final, 'compared', name);
    assert.equal(run.stages.candidate, madeOf(input).kind === 'calibration' ? 'calibration' : 'replayed', name);
    assert.deepEqual(run.compared, ALL_FIELDS, name);
    assert.ok(run.work > 0, name);
    assert.ok(run.set !== null, name);
    assert.ok(run.events.length > 0, name);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 2. Event order.

test('events are in chronological order: count, carves, pieces, the walk and the clue stages; the calibration puzzle has none of the walk', () => {
  for (const input of INPUTS) {
    const run = fullRun(input);
    const name = input.name;
    const calibration = madeOf(input).kind === 'calibration';
    const K = input.set.pieces.length;
    const kinds = kindsOf(run);
    const head = ['set/count', ...kinds.filter((k) => k === 'set/carve'), ...Array(K).fill('set/piece')];
    assert.deepEqual(kinds.slice(0, head.length), head, `${name}: count, one or more carve, then exactly K piece`);
    assert.ok(kinds.filter((k) => k === 'set/carve').length >= 1, name);
    const rest = run.events.slice(head.length);
    assert.ok(rest.every((e) => e.stage === 'clues' || e.stage === 'unique' || e.stage === 'layout'), name);
    if (calibration) {
      assert.ok(!kinds.some((k) => k.startsWith('layout/')), `${name}: no start and no retile`);
      assert.ok(rest.every((e) => 'source' in e && e.source === 'calibration'), `${name}: the clue events are the calibration's`);
    } else {
      assert.equal(rest[0].kind, 'start', name);
      assert.equal(/** @type {any} */ (rest[0]).start, madeOf(input).start, name);
      assert.deepEqual(rest.slice(1, 1 + BUDGETS.lnsSteps).map((e) => `${e.kind}:${/** @type {any} */ (e).step}`),
        Array.from({ length: BUDGETS.lnsSteps }, (_, i) => `retile:${i}`), `${name}: one retile per walk step`);
      const clueEvents = rest.slice(1 + BUDGETS.lnsSteps);
      assert.ok(clueEvents.every((e) => e.stage === 'clues' || e.stage === 'unique'), `${name}: then the clue events`);
      assert.ok(run.events.every((e) => !('source' in e) || e.source !== 'calibration'), `${name}: no calibration event`);
    }
    const selected = kinds.filter((k) => k === 'clues/selected');
    assert.equal(selected.length, 1, name);
    assert.equal(kinds[kinds.length - 1], 'clues/selected', `${name}: ends with selected`);
    assert.ok(run.events.every((e, i) => e.kind !== 'start' || i === head.length), `${name}: one start`);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 3. The preflight.

test('a version mismatch makes the stage unavailable; with both records changed nothing runs at all', () => {
  const candidate = PLAIN;
  const id = candidate.puzzle.id;
  const setChanged = runReplay(edited(candidate, (g) => { g.setOrigin.versions.algo = 'gen-v4-proto:other'; }), workspaces);
  assert.equal(setChanged.status, 'unavailable');
  assert.equal(setChanged.reason, 'set-versions');
  assert.equal(setChanged.stages.set, 'unavailable');
  assert.equal(setChanged.stages.candidate, 'replayed', 'the candidate stage still runs from the stored set');
  assert.deepEqual(setChanged.compared, ['clues', 'rating', 'solution']);

  const both = edited(candidate, (g) => {
    g.setOrigin.versions.algo = 'gen-v4-proto:other';
    g.made[id].versions.policy = 'mixed-v0';
  });
  const none = runReplay(both, workspaces, REPLAY, neverCancelled);
  assert.equal(none.status, 'unavailable');
  assert.equal(none.reason, 'set-versions');
  assert.deepEqual(none.stages, { set: 'unavailable', candidate: 'unavailable', final: 'not-compared' });
  assert.deepEqual([none.events.length, none.work, none.compared.length, none.set], [0, 0, 0, null]);

  const recordOnly = runReplay(edited(candidate, (g) => { g.made[id].versions.policy = 'mixed-v0'; }), workspaces);
  assert.equal(recordOnly.status, 'unavailable');
  assert.equal(recordOnly.reason, 'record-versions');
  assert.equal(recordOnly.stages.set, 'replayed', 'the set stage runs and is compared');
  assert.equal(recordOnly.stages.candidate, 'unavailable');
  assert.deepEqual(recordOnly.compared, ['board', 'pieces', 'witness']);

  const overflow = runReplay(edited(candidate, (g) => { g.made[id].skips = 'overflow'; }), workspaces);
  assert.equal(overflow.status, 'unavailable');
  assert.equal(overflow.reason, 'overflow');

  const calibration = edited(CALIBRATION[0], (g) => { g.setOrigin.versions.rng = 'xoshiro-v0'; });
  const hidden = runReplay(calibration, workspaces, REPLAY, neverCancelled);
  assert.equal(hidden.status, 'unavailable');
  assert.equal(hidden.reason, 'set-versions');
  assert.deepEqual(hidden.stages, { set: 'unavailable', candidate: 'unavailable', final: 'not-compared' });

  // Every one of the seven ids counts, in the origin and in the record.
  for (const name of ['algo', 'policy', 'rng', 'seedScheme', 'ratingModel', 'priorTable', 'screenTable']) {
    const origin = runReplay(edited(candidate, (g) => {
      g.setOrigin.versions[name] = name === 'algo' ? 'gen-v4-proto:other' : 'other';
      g.made[id].versions[name] = name === 'algo' ? 'gen-v4-proto:other' : 'other';
    }), workspaces, REPLAY, neverCancelled);
    assert.equal(origin.reason, 'set-versions', name);
    assert.equal(origin.stages.candidate, 'unavailable', name);
    const record = runReplay(edited(candidate, (g) => {
      delete g.setOrigin;
      g.made[id].versions[name] = name === 'algo' ? 'gen-v4-proto:other' : 'other';
    }), workspaces, REPLAY, neverCancelled);
    assert.equal(record.reason, 'no-set-origin', name);
    assert.deepEqual(record.stages, { set: 'unavailable', candidate: 'unavailable', final: 'not-compared' }, name);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 4-6. The exact comparison.

/**
 * @param {PieceSet} set
 * @param {Pose} pose
 * @returns {string}
 */
function cellsOfPose(set, pose) {
  const piece = /** @type {any} */ (set.pieces.find((p) => p.id === pose.piece));
  return poseCells(piece, pose).map(([x, y]) => `${x},${y}`).sort().join(';');
}

/**
 * The stored puzzle with one clue moved to the pose its piece has in another puzzle's solution.
 * @param {ReplayInput} input
 * @param {ReplayInput} donor
 * @returns {any}
 */
function withMovedClue(input, donor) {
  for (let i = 0; i < input.puzzle.clues.length; i += 1) {
    const clue = input.puzzle.clues[i];
    const other = donor.puzzle.solution.find((/** @type {Pose} */ p) => p.piece === clue.piece);
    if (cellsOfPose(input.set, other) !== cellsOfPose(input.set, clue)) {
      const clues = input.puzzle.clues.slice();
      clues[i] = other;
      return { ...input.puzzle, clues };
    }
  }
  throw new Error('no clue can be moved');
}

test('a rating claim off by one is a mismatch of the rating; a moved clue a mismatch of the clues', () => {
  const input = INPUTS[1];
  const rating = { ...input.puzzle.rating, score: input.puzzle.rating.score + 1 };
  const byRating = runReplay({ ...input, puzzle: { ...input.puzzle, rating } }, workspaces);
  assert.equal(byRating.status, 'mismatch');
  assert.equal(byRating.reason, 'rating');
  assert.deepEqual(byRating.compared, ['board', 'pieces', 'witness', 'clues', 'solution']);
  assert.equal(byRating.stages.final, 'compared');

  const donor = INPUTS[2];
  const byClues = runReplay({ ...input, puzzle: withMovedClue(input, donor) }, workspaces);
  assert.equal(byClues.status, 'mismatch');
  assert.equal(byClues.reason, 'clues');
  assert.deepEqual(byClues.compared, ['board', 'pieces', 'witness', 'rating', 'solution']);

  const censored = runReplay({ ...input, puzzle: { ...input.puzzle, rating: { ...input.puzzle.rating, censored: true } } },
    workspaces);
  assert.equal(censored.reason, 'rating', 'censored present against absent is a difference');
  const metrics = structuredClone(input.puzzle.rating);
  metrics.metrics.G += 1;
  assert.equal(runReplay({ ...input, puzzle: { ...input.puzzle, rating: metrics } }, workspaces).reason, 'rating');
});

test('a stored solution that is another valid layout of the set is a mismatch of the solution', () => {
  const input = INPUTS[1];
  const other = INPUTS[2];
  /** @param {ReplayInput} i */
  const layoutOf = (i) => i.puzzle.solution.map((/** @type {Pose} */ p) => cellsOfPose(i.set, p)).sort().join('|');
  assert.notEqual(layoutOf(input), layoutOf(other), 'two puzzles of the pack have different layouts');
  const run = runReplay({ ...input, puzzle: { ...input.puzzle, solution: other.puzzle.solution } }, workspaces);
  assert.equal(run.status, 'mismatch');
  assert.equal(run.reason, 'solution');
  assert.deepEqual(run.compared, ['board', 'pieces', 'witness', 'clues', 'rating']);
});

test('a pack without solutions still matches on the fields it has', () => {
  const read = parsePack(serializePack(/** @type {any} */ (validatePack(FIXTURE.packs[1]).value), { omitSolutions: true }));
  assert.ok(read.ok);
  const pack = /** @type {any} */ (read.value);
  assert.equal(pack.witness ?? null, null);
  const set = setOfPack(pack);
  const puzzle = pack.puzzles[0];
  assert.ok(puzzle.solution === undefined || puzzle.solution === null);
  const run = runReplay({ set, puzzle, generation: pack.generation }, workspaces);
  assert.equal(run.status, 'matched');
  assert.deepEqual(run.compared, ['board', 'pieces', 'clues', 'rating']);
  assert.equal(run.stages.candidate, 'replayed');

  // A puzzle that stores no rating claim has nothing to compare there: it is not listed, and the rest still matches.
  const unrated = runReplay({ ...PLAIN, puzzle: { ...PLAIN.puzzle, rating: null } }, workspaces);
  assert.equal(unrated.status, 'matched');
  assert.deepEqual(unrated.compared, ['board', 'pieces', 'witness', 'clues', 'solution']);
});

test('a set attempt that fails is a mismatch of the set; another that makes another set, of the pieces', () => {
  const origin = PLAIN.generation.setOrigin;
  /** @param {number} attempt */
  const direct = (attempt) => setAttempt({
    board: PLAIN.set.board, rotation: 0, levelId: origin.level, seedText: origin.seed, uniqueness: origin.uniqueness,
    execution,
  }, attempt);
  // Attempt 12 of the fixture's set request fails to find a calibration (attempt 1 makes a different set).
  assert.equal(direct(12).ok, false);
  const failing = runReplay(edited(PLAIN, (g) => { g.setOrigin.attempt = 12; }), workspaces);
  assert.equal(failing.status, 'mismatch');
  assert.equal(failing.reason, 'set');
  assert.deepEqual(failing.stages, { set: 'mismatch', candidate: 'replayed', final: 'compared' });
  assert.equal(failing.set, null);
  assert.deepEqual(failing.compared, ['clues', 'rating', 'solution'], 'the candidate is replayed from the stored set');

  assert.equal(direct(1).ok, true);
  const other = runReplay(edited(PLAIN, (g) => { g.setOrigin.attempt = 1; }), workspaces);
  assert.equal(other.status, 'mismatch');
  assert.equal(other.reason, 'pieces');
  assert.deepEqual(other.stages, { set: 'replayed', candidate: 'replayed', final: 'compared' });
  assert.ok(other.compared.includes('board') && !other.compared.includes('pieces') && !other.compared.includes('witness'));
});

// ---------------------------------------------------------------------------------------------------------------
// 7-8. The meter and the bounds.

test('the work bound: stops early, is exact at the boundary, counts the hidden calibration and every unit', () => {
  const full = fullRun(PLAIN);
  const small = runReplay(PLAIN, workspaces, { ...REPLAY, work: 1000 });
  assert.equal(small.status, 'incomplete');
  assert.equal(small.reason, 'work');
  assert.ok(small.events.length < full.events.length);
  assert.equal(small.stages.final, 'not-compared');
  assert.deepEqual(small.compared, []);
  assert.ok(small.work > 1000);

  const stoppedCalibration = runReplay(CALIBRATION[0], workspaces, { ...REPLAY, work: 1000 });
  assert.equal(stoppedCalibration.status, 'incomplete');
  assert.deepEqual(stoppedCalibration.stages, { set: 'stopped', candidate: 'stopped', final: 'not-compared' });

  const exact = runReplay(PLAIN, workspaces, { ...REPLAY, work: full.work });
  assert.equal(exact.status, 'matched');
  assert.equal(exact.work, full.work);
  const under = runReplay(PLAIN, workspaces, { ...REPLAY, work: full.work - 1 });
  assert.equal(under.status, 'incomplete');
  assert.equal(under.reason, 'work');
  assert.ok(under.work >= full.work);

  // The first calibration rating crosses the bound although none of the calibration's events is kept.
  const W = kindsOf(full).filter((k) => k.startsWith('set/')).length;
  const hidden = runReplay(PLAIN, workspaces, { ...REPLAY, work: W });
  assert.equal(hidden.status, 'incomplete');
  assert.equal(hidden.reason, 'work');
  assert.equal(hidden.stages.set, 'stopped');
  assert.equal(hidden.stages.candidate, 'stopped');
  assert.equal(hidden.events.length, W);
  assert.ok(hidden.events.every((e) => e.stage === 'set'));
  assert.ok(hidden.work > W);
  assert.equal(hidden.set, null);

  // The total: every event, the dropped calibration events included, and every charged unit.
  const { setOrigin: origin, made: map } = PLAIN.generation;
  const made = map[PLAIN.puzzle.id];
  let events = 0;
  let units = 0;
  const observe = { record: () => { events += 1; }, charge: (/** @type {number} */ n) => { units += n; } };
  const attempt = setAttempt({
    board: PLAIN.set.board, rotation: 0, levelId: origin.level, seedText: origin.seed, uniqueness: origin.uniqueness,
    execution,
  }, origin.attempt, observe);
  assert.ok(attempt.ok);
  puzzleCandidate({
    set: attempt.set, targetLevelId: made.targetLevel, quantity: 1, batchSeed: made.batchSeed,
    uniqueness: made.uniqueness, seenLayouts: new Set(), seenClues: new Set(), execution,
  }, made.slot, made.attempt, { ...observe, replaySkips: made.skips });
  assert.ok(units > 0);
  assert.ok(events > full.events.length, 'the calibration events are metered and dropped');
  assert.equal(full.work, events + units);
});

test('the step, byte and cancellation bounds', () => {
  const full = fullRun(PLAIN);
  const ten = runReplay(PLAIN, workspaces, { ...REPLAY, maxSteps: 10 });
  assert.equal(ten.status, 'incomplete');
  assert.equal(ten.reason, 'steps');
  assert.equal(ten.events.length, 9, 'one step stays for the final one');
  assert.deepEqual(ten.events, full.events.slice(0, 9));
  const one = runReplay(PLAIN, workspaces, { ...REPLAY, maxSteps: 1 });
  assert.equal(one.status, 'incomplete');
  assert.equal(one.reason, 'steps');
  assert.equal(one.events.length, 0);
  assert.deepEqual(one.stages, { set: 'stopped', candidate: 'stopped', final: 'not-compared' });

  // Stopping at every kind of event is a stop, never a throw and never a match.
  /** @type {Set<string>} */
  const seen = new Set();
  full.events.forEach((event, index) => {
    const kind = `${event.stage}/${event.kind}`;
    if (seen.has(kind)) {
      return;
    }
    seen.add(kind);
    const cut = runReplay(PLAIN, workspaces, { ...REPLAY, maxSteps: index + 1 });
    assert.equal(cut.status, 'incomplete', kind);
    assert.equal(cut.reason, 'steps', kind);
    assert.equal(cut.events.length, index, kind);
    assert.deepEqual(cut.compared, [], kind);
    assert.equal(cut.stages.final, 'not-compared', kind);
    assert.equal(cut.stages.set, event.stage === 'set' ? 'stopped' : 'replayed', kind);
    assert.equal(cut.stages.candidate, 'stopped', kind);
  });
  assert.ok(seen.has('layout/retile') && seen.has('clues/rated') && seen.has('clues/selected'));

  const bytes = runReplay(PLAIN, workspaces, { ...REPLAY, maxBytes: 4000 });
  assert.equal(bytes.status, 'incomplete');
  assert.equal(bytes.reason, 'bytes');
  const used = utf8Length(JSON.stringify(bytes.events));
  assert.ok(used <= 4000);
  assert.ok(utf8Length(JSON.stringify(full.events.slice(0, bytes.events.length + 1))) > 4000, 'the next event did not fit');
  const reserved = runReplay(PLAIN, workspaces, { ...REPLAY, maxBytes: 4000 }, () => false, 3000);
  assert.equal(reserved.reason, 'bytes');
  const kept = utf8Length(JSON.stringify(reserved.events));
  assert.ok(kept <= 1000, `${kept} bytes kept`);
  assert.ok(utf8Length(JSON.stringify(full.events.slice(0, reserved.events.length + 1))) > 1000);

  // Exact fit: the events as one JSON array (brackets once, a comma between events) plus the reserve.
  const fit = utf8Length(JSON.stringify(full.events.slice(0, 12)));
  for (const [maxBytes, reserve, expected] of [[fit, 0, 12], [fit - 1, 0, 11], [fit + 700, 700, 12], [fit + 699, 700, 11]]) {
    const cut = runReplay(PLAIN, workspaces, { ...REPLAY, maxBytes }, () => false, reserve);
    assert.equal(cut.reason, 'bytes', `${maxBytes} / ${reserve}`);
    assert.equal(cut.events.length, expected, `${maxBytes} / ${reserve}`);
  }

  let calls = 0;
  assert.throws(() => runReplay(PLAIN, workspaces, REPLAY, () => {
    calls += 1;
    return calls >= 5;
  }), (e) => e instanceof ReplayCancelledError && e.code === 'cancelled');
  assert.equal(calls, 5, 'cancelled at the first call that says so');
  // Cancellation is honoured at the very last metered unit too.
  let total = 0;
  runReplay(PLAIN, workspaces, REPLAY, () => {
    total += 1;
    return false;
  });
  let late = 0;
  assert.throws(() => runReplay(PLAIN, workspaces, REPLAY, () => {
    late += 1;
    return late >= total;
  }), ReplayCancelledError);
  assert.equal(late, total);
});

// ---------------------------------------------------------------------------------------------------------------
// 9-11. Malformed and missing records.

test('a malformed record is unavailable; a valid skip that the run never reaches is a mismatch of the skips', () => {
  const id = PLAIN.puzzle.id;
  const unsorted = runReplay(edited(PLAIN, (g) => { g.made[id].skips = { subsets: [5, 3], repairs: [] }; }), workspaces);
  assert.equal(unsorted.status, 'unavailable');
  assert.equal(unsorted.reason, 'record-invalid');
  assert.equal(unsorted.stages.candidate, 'unavailable');

  const unused = runReplay(edited(PLAIN, (g) => { g.made[id].skips = { subsets: [2127], repairs: [] }; }), workspaces);
  assert.equal(unused.status, 'mismatch');
  assert.equal(unused.reason, 'skips');
  assert.equal(unused.stages.candidate, 'mismatch');
  assert.equal(unused.stages.set, 'replayed');
  assert.ok(unused.events.length > 0);
  assert.equal(unused.stages.final, 'compared');
  assert.deepEqual(unused.compared, ['board', 'pieces', 'witness']);
});

test('a completion record has no candidate stage; a pack without a set origin still replays the candidate', () => {
  const id = PLAIN.puzzle.id;
  const completion = runReplay(edited(PLAIN, (g) => { g.made[id] = { schema: 1, kind: 'completion' }; }), workspaces);
  assert.equal(completion.status, 'unavailable');
  assert.equal(completion.reason, 'completion');
  assert.deepEqual(completion.stages, { set: 'replayed', candidate: 'unavailable', final: 'compared' });
  assert.deepEqual(completion.compared, ['board', 'pieces', 'witness']);
  assert.ok(completion.events.length > 0 && completion.events.every((e) => e.stage === 'set'));

  const noOrigin = runReplay(edited(PLAIN, (g) => { delete g.setOrigin; }), workspaces);
  assert.equal(noOrigin.status, 'unavailable');
  assert.equal(noOrigin.reason, 'no-set-origin');
  assert.deepEqual(noOrigin.stages, { set: 'unavailable', candidate: 'replayed', final: 'compared' });
  assert.deepEqual(noOrigin.compared, ['clues', 'rating', 'solution']);
  assert.ok(noOrigin.events.every((e) => e.stage !== 'set'), 'stages 4-6 only');
  assert.equal(noOrigin.set, null);

  const calibration = runReplay(edited(CALIBRATION[0], (g) => { delete g.setOrigin; }), workspaces, REPLAY, neverCancelled);
  assert.equal(calibration.status, 'unavailable');
  assert.equal(calibration.reason, 'no-set-origin');
  assert.deepEqual(calibration.stages, { set: 'unavailable', candidate: 'unavailable', final: 'not-compared' });

  // A level that the stored board does not offer cannot have made the set: unavailable, and `setAttempt` is not called.
  for (const level of ['nightmare', 'hell-1']) {
    assert.equal(pieceCountRange(level, activeCount(PLAIN.set.board)), null, `${level} is not offered on 60 cells`);
    const offered = runReplay(edited(PLAIN, (g) => { g.setOrigin.level = level; }), workspaces);
    assert.equal(offered.status, 'unavailable', level);
    assert.equal(offered.reason, 'no-set-origin', level);
    assert.deepEqual(offered.stages, { set: 'unavailable', candidate: 'replayed', final: 'compared' }, level);
    assert.deepEqual(offered.compared, ['clues', 'rating', 'solution'], level);
    assert.ok(offered.events.every((e) => e.stage !== 'set'), `${level}: no count, carve or piece event`);
    assert.equal(offered.set, null, level);
    const calibrationLevel = runReplay(edited(CALIBRATION[0], (g) => { g.setOrigin.level = level; }), workspaces,
      REPLAY, neverCancelled);
    assert.equal(calibrationLevel.status, 'unavailable', level);
    assert.equal(calibrationLevel.reason, 'no-set-origin', level);
    assert.deepEqual(calibrationLevel.stages, { set: 'unavailable', candidate: 'unavailable', final: 'not-compared' }, level);
    assert.equal(calibrationLevel.events.length, 0, level);
  }
});

test("the puzzle's own record is read: the whole generation and the one-entry form give the same run", () => {
  for (const input of INPUTS) {
    const { setOrigin, made } = input.generation;
    const id = input.puzzle.id;
    const own = runReplay({ ...input, generation: { setOrigin, made: { [id]: made[id] } } }, workspaces);
    assert.deepEqual(own, fullRun(input), input.name);
  }
  const id = PLAIN.puzzle.id;
  const other = Object.keys(PLAIN.generation.made).find((k) => k !== id);
  const foreign = runReplay(edited(PLAIN, (g) => { g.made[/** @type {string} */ (other)] = { schema: 2 }; }), workspaces);
  assert.deepEqual(foreign, fullRun(PLAIN), "another puzzle's invalid record does not matter");

  const array = runReplay(edited(PLAIN, (g) => { g.made = []; }), workspaces);
  assert.equal(array.status, 'unavailable');
  assert.equal(array.reason, 'record-invalid');
  const absent = runReplay(edited(PLAIN, (g) => { g.made = { [`${id}x`]: g.made[id] }; }), workspaces);
  assert.equal(absent.status, 'unavailable');
  assert.equal(absent.reason, 'no-record');
  const none = runReplay(edited(PLAIN, (g) => { delete g.made; }), workspaces);
  assert.equal(none.reason, 'no-record');

  // A long id is shortened in the reader's problem path; the record is still this puzzle's.
  const longId = `p${'x'.repeat(60)}`;
  const long = runReplay({
    ...PLAIN, puzzle: { ...PLAIN.puzzle, id: longId }, generation: { setOrigin: PLAIN.generation.setOrigin, made: { [longId]: { schema: 2 } } },
  }, workspaces);
  assert.equal(long.reason, 'record-invalid');
});

// ---------------------------------------------------------------------------------------------------------------
// 12-14. Limits and input.

test('malformed limits throw a RangeError before any stage runs', () => {
  const ok = { maxSteps: 4, maxBytes: 100, work: 5 };
  const cases = /** @type {[string, any, number | undefined][]} */ ([
    ['maxSteps 0', { ...ok, maxSteps: 0 }, undefined],
    ['maxBytes 1.5', { ...ok, maxBytes: 1.5 }, undefined],
    ['maxBytes 0', { ...ok, maxBytes: 0 }, undefined],
    ['work -1', { ...ok, work: -1 }, undefined],
    ['work NaN', { ...ok, work: NaN }, undefined],
    ['work Infinity', { ...ok, work: Infinity }, undefined],
    ['a missing field', { maxSteps: 4, maxBytes: 100 }, undefined],
    ['null', null, undefined],
    ['reserveBytes above maxBytes', ok, 101],
    ['negative reserveBytes', ok, -1],
    ['fractional reserveBytes', ok, 0.5],
  ]);
  for (const [name, limits, reserve] of cases) {
    assert.throws(() => runReplay(PLAIN, workspaces, limits, neverCancelled, reserve), /invalid replay limits/, name);
  }
  assert.throws(() => runReplay(PLAIN, workspaces, ok, neverCancelled, 101), RangeError);
});

test('input that is not a set, a puzzle and a generation object throws a RangeError', () => {
  const { set, puzzle, generation } = PLAIN;
  /** @type {[string, any][]} */
  const bad = [
    ['no puzzle', { set, generation }],
    ['a puzzle without clues', { set, generation, puzzle: { id: puzzle.id } }],
    ['a set without pieces', { set: { ...set, pieces: [] }, puzzle, generation }],
    ['a set without a board', { set: { pieces: set.pieces }, puzzle, generation }],
    ['no generation', { set, puzzle }],
    ['a generation that is a list', { set, puzzle, generation: [] }],
    ['null', null],
  ];
  for (const [name, input] of bad) {
    assert.throws(() => runReplay(input, workspaces, REPLAY, neverCancelled), /invalid replay input/, name);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 13, 15. Plain JSON and determinism.

test('a run is plain JSON except its set, survives structuredClone and is deterministic', () => {
  const touched = (/** @type {ReplayInput} */ i) => JSON.stringify([i.set, i.puzzle, i.generation]);
  const before = touched(INPUTS[3]);
  runReplay(INPUTS[3], workspaces, REPLAY);
  assert.equal(touched(INPUTS[3]), before, 'the input is not modified');
  for (const input of [INPUTS[0], INPUTS[3], INPUTS[6]]) {
    const run = fullRun(input);
    const { set, ...rest } = run;
    assert.deepEqual(JSON.parse(JSON.stringify(rest)), rest, input.name);
    assertPlain(rest, input.name);
    assert.ok(set !== null && set.board.active instanceof Uint8Array, input.name);
    assert.deepEqual(structuredClone(run), run, input.name);
    assert.deepEqual(runReplay(input, workspaces, REPLAY), run, `${input.name}: the same run again`);
  }
  const stopped = runReplay(PLAIN, workspaces, { ...REPLAY, maxSteps: 12 });
  assertPlain(outcomeOf(stopped), 'stopped');
  assert.deepEqual(stopped.stages, { set: 'replayed', candidate: 'stopped', final: 'not-compared' });
  assert.ok(stopped.set !== null, 'the replayed set is kept when stage 3 ended');
  assert.equal(runReplay(PLAIN, workspaces, { ...REPLAY, maxSteps: 12 }).work, stopped.work);
});

// ---------------------------------------------------------------------------------------------------------------
// 17. A real skip, end to end.

/**
 * @param {ReplayInput} input
 * @param {Record<string, any>} over
 * @returns {import('../core/engine/types.js').BatchContext}
 */
function candidateContext(input, over = {}) {
  const made = madeOf(input);
  return {
    set: /** @type {PieceSet} */ (fullRun(input).set),
    targetLevelId: made.targetLevel,
    quantity: 1,
    batchSeed: made.batchSeed,
    uniqueness: made.uniqueness,
    seenLayouts: new Set(),
    seenClues: new Set(),
    execution,
    ...over,
  };
}

/** @type {{ subset: any, repair: any } | null} */
let skipCache = null;

/**
 * Inputs whose record holds a real skip, made by the engine: the candidate is made again with the clue key of the
 * stored puzzle excluded, so its record names the skips that the exclusion caused. The stored puzzle becomes that
 * second candidate. `subset`: the first candidate won without a repair whose second candidate skipped subsets only;
 * `repair`: the first repaired winner whose second candidate skipped a repair. Each is `{ input, skips, original }`
 * or null when the fixture has no puzzle of that kind (MP15a2 uses them too).
 * @returns {{ subset: { input: ReplayInput, skips: { subsets: number[], repairs: number[] }, original: ReplayInput } | null,
 *   repair: { input: ReplayInput, skips: { subsets: number[], repairs: number[] }, original: ReplayInput } | null }}
 */
function skipInputs() {
  if (skipCache !== null) {
    return skipCache;
  }
  /**
   * @param {ReplayInput} original
   * @param {(skips: { subsets: number[], repairs: number[] }) => boolean} wanted
   * @returns {{ input: ReplayInput, skips: { subsets: number[], repairs: number[] }, original: ReplayInput } | null}
   */
  const remake = (original, wanted) => {
    const made = madeOf(original);
    const first = /** @type {any} */ (puzzleCandidate(candidateContext(original), made.slot, made.attempt));
    assert.ok(!('fail' in first), `${original.name}: the stage 4-6 context reproduces the puzzle`);
    assert.deepEqual(first.clues, original.puzzle.clues, original.name);
    assert.equal(first.rating.score, original.puzzle.rating.score, original.name);
    const second = /** @type {any} */ (puzzleCandidate(
      candidateContext(original, { seenClues: new Set([first.clueKey]) }), made.slot, made.attempt));
    if ('fail' in second || second.made.skips === 'overflow' || !wanted(second.made.skips) || second.clueKey === first.clueKey) {
      return null;
    }
    const puzzle = {
      id: original.puzzle.id,
      clues: second.clues,
      solution: second.layout,
      rating: JSON.parse(JSON.stringify(second.rating)),
    };
    const generation = { setOrigin: original.generation.setOrigin, made: { [puzzle.id]: second.made } };
    return { input: { name: `${original.name} (skips)`, set: original.set, puzzle, generation }, skips: second.made.skips, original };
  };
  /**
   * @param {boolean} repaired
   * @param {(skips: { subsets: number[], repairs: number[] }) => boolean} wanted
   */
  const search = (repaired, wanted) => {
    for (const original of CANDIDATES) {
      const selected = /** @type {any} */ (fullRun(original).events.find((e) => e.kind === 'selected'));
      if ((selected.repairSequence !== null) !== repaired) {
        continue;
      }
      const found = remake(original, wanted);
      if (found !== null) {
        return found;
      }
    }
    return null;
  };
  skipCache = {
    subset: search(false, (s) => s.subsets.length > 0 && s.repairs.length === 0),
    repair: search(true, (s) => s.repairs.length > 0),
  };
  return skipCache;
}

/**
 * @param {ReplayInput} input
 * @param {ReplayRun} run
 */
function assertMatchedWithSkips(input, run) {
  assert.equal(run.status, 'matched', input.name);
  assert.equal(run.reason, null, input.name);
  assert.deepEqual(run.compared, ALL_FIELDS, input.name);
  assert.deepEqual(run.stages, { set: 'replayed', candidate: 'replayed', final: 'compared' }, input.name);
}

test('a recorded subset skip is replayed: matched with one skip event per ordinal, a mismatch of the clues without it', (t) => {
  const found = skipInputs().subset;
  if (found === null) {
    t.diagnostic('the fixture has no candidate whose own clue key causes a subset skip alone');
    assert.ok(skipInputs().repair !== null, 'at least one kind of skip');
    return;
  }
  const { input, skips, original } = found;
  t.diagnostic(`subset skip: ${original.name} excluded, skips ${JSON.stringify(skips)}`);
  const run = runReplay(input, workspaces, REPLAY);
  assertMatchedWithSkips(input, run);
  const events = run.events.filter((e) => e.kind === 'skip');
  assert.deepEqual(events.map((e) => /** @type {any} */ (e).sequence), skips.subsets, 'one skip event per ordinal, in order');
  assert.ok(events.every((e) => e.stage === 'clues' && /** @type {any} */ (e).source === 'candidate'));
  assert.notDeepEqual(input.puzzle.clues, original.puzzle.clues, 'the second candidate is another puzzle');

  const emptied = edited(input, (g) => { g.made[input.puzzle.id].skips = { subsets: [], repairs: [] }; });
  const without = runReplay(emptied, workspaces, REPLAY);
  assert.equal(without.status, 'mismatch');
  assert.equal(without.reason, 'clues', 'the recorded skip is what makes the replay match');
  assert.equal(without.stages.candidate, 'replayed');
  assert.ok(!without.events.some((e) => e.kind === 'skip'));
});

test('a recorded repair skip is replayed: the excluded finish ends with a repair event, a mismatch without it', (t) => {
  const found = skipInputs().repair;
  if (found === null) {
    t.diagnostic('the fixture has no repaired winner whose own clue key causes a repair skip');
    assert.ok(skipInputs().subset !== null, 'at least one kind of skip');
    return;
  }
  const { input, skips, original } = found;
  assert.ok(skips.repairs.length > 0);
  t.diagnostic(`repair skip: ${original.name} excluded, skips ${JSON.stringify(skips)}`);
  const run = runReplay(input, workspaces, REPLAY);
  assertMatchedWithSkips(input, run);
  const finish = run.events.filter((e) => e.kind === 'repair' && /** @type {any} */ (e).repairSequence === skips.repairs[0]);
  assert.ok(finish.length > 0, 'the excluded finish has repair events');
  const last = /** @type {any} */ (finish[finish.length - 1]);
  assert.equal(last.reason, 'excluded');
  assert.equal(last.accepted, false);

  const emptied = edited(input, (g) => { g.made[input.puzzle.id].skips = { subsets: [], repairs: [] }; });
  const without = runReplay(emptied, workspaces, REPLAY);
  assert.equal(without.status, 'mismatch');
  assert.ok(without.reason === 'clues' || without.reason === 'rating' || without.reason === 'solution', String(without.reason));
  assert.ok(!without.events.some((e) => e.kind === 'repair' && /** @type {any} */ (e).reason === 'excluded'));
});

// ---------------------------------------------------------------------------------------------------------------
// MP15a2. `replayPuzzle`: the steps (design §6.12).

/** @type {Map<string, ReplayResult>} */
const RESULTS = new Map();
/** @type {Map<string, ReplayRun>} */
const RUNS = new Map();

/**
 * The run of an input with the default bounds (`fullRun` keys by puzzle id, which a skip input shares with its
 * original).
 * @param {ReplayInput} input
 * @returns {ReplayRun}
 */
function runOf(input) {
  if (INPUTS.includes(input)) {
    return fullRun(input);
  }
  let run = RUNS.get(input.name);
  if (run === undefined) {
    run = runReplay(input, workspaces, REPLAY);
    RUNS.set(input.name, run);
  }
  return run;
}

/**
 * @param {ReplayInput} input
 * @returns {ReplayResult} The steps of the input with the default bounds, made once per input.
 */
function resultOf(input) {
  let result = RESULTS.get(input.name);
  if (result === undefined) {
    result = replayPuzzle(input, workspaces, REPLAY);
    RESULTS.set(input.name, result);
  }
  return result;
}

const STEP_KEYS = ['stage', 'kind', 'board', 'rating', 'breakdown', 'detail', 'band', 'note', 'args'];

/** @param {number[][]} cells */
const regionKey = (cells) => cells.map(([x, y]) => `${x},${y}`).sort().join(';');

/**
 * The items of a board: id, cells and a copy of the pose.
 * @param {PieceSet} set
 * @param {Pose[]} poses
 */
function itemsOf(set, poses) {
  return poses.map((pose) => ({
    id: pose.piece,
    cells: poseCells(/** @type {any} */ (set.pieces.find((p) => p.id === pose.piece)), pose),
    pose: { piece: pose.piece, x: pose.x, y: pose.y, turn: pose.turn, mirrored: pose.mirrored },
  }));
}

/** @param {any} rating */
const termsOf = (rating) => (rating === null ? null : breakdownV3(rating.metrics));

/** @param {any} claim */
function bandOfClaim(claim) {
  if (claim === null || claim === undefined) {
    return null;
  }
  const { min, max } = level(claim.level);
  return { min, max };
}

/**
 * The index of the event whose detail measured the final puzzle of a matched run: the `rated` event of the selected
 * subset, or the last `repair` event of the selected repair.
 * @param {ReplayRun} run
 * @returns {number}
 */
function measuringIndex(run) {
  const events = /** @type {any[]} */ (run.events);
  const selected = events[events.length - 1];
  assert.equal(selected.kind, 'selected');
  return selected.repairSequence === null
    ? events.findIndex((e) => e.kind === 'rated' && e.source === selected.source && e.sequence === selected.sequence)
    : events.findLastIndex((e) => e.kind === 'repair' && e.repairSequence === selected.repairSequence);
}

/**
 * Every step of a matched run against its event, field by field, and the final step against the stored puzzle.
 * @param {ReplayInput} input
 * @param {ReplayRun} run
 * @param {ReplayResult} res
 */
function assertStepTable(input, run, res) {
  const name = input.name;
  assert.equal(run.status, 'matched', name);
  assert.deepEqual(Object.keys(res), ['status', 'reason', 'stages', 'compared', 'work', 'steps'], name);
  assert.deepEqual({ status: res.status, reason: res.reason, stages: res.stages, compared: res.compared, work: res.work },
    { status: run.status, reason: run.reason, stages: run.stages, compared: run.compared, work: run.work }, name);
  assert.equal(res.steps.length, run.events.length + 1, `${name}: one step for each event, then the final step`);
  const set = /** @type {PieceSet} */ (run.set);
  const witness = itemsOf(set, /** @type {Pose[]} */ (set.witness));
  const stored = input.puzzle.clues.map((/** @type {Pose} */ p) => p.piece).sort();
  /** @type {any[]} */
  let regions = [];
  /** @type {any[]} */
  let layout = [];
  /** @type {Map<string, string[]>} */
  const rated = new Map();
  /** @type {Map<number, string[]>} */
  const repaired = new Map();
  run.events.forEach((event, i) => {
    const e = /** @type {any} */ (event);
    const step = res.steps[i];
    const at = `${name} step ${i} ${e.stage}/${e.kind}`;
    const base = { stage: 0, placed: [], lifted: [], clues: [], rating: null, breakdown: null, detail: null, band: null };
    const drawn = e.source === 'calibration' ? witness : layout;
    /** @type {typeof base & { args: Record<string, unknown> }} */
    let want;
    switch (e.kind) {
      case 'count':
        want = { ...base, stage: 1, args: { k: e.k, min: Math.min(...e.range), max: Math.max(...e.range) } };
        break;
      case 'carve':
        want = { ...base, stage: 2, args: { mode: e.mode, parts: e.parts === null ? 0 : e.parts.length } };
        break;
      case 'piece': {
        const owner = witness.find((w) => regionKey(w.cells) === regionKey(e.cells));
        assert.ok(owner, `${at}: a piece of the replayed set covers the region`);
        regions = [...regions, { id: owner.id, cells: e.cells, pose: owner.pose }];
        want = { ...base, stage: 3, placed: regions, args: { n: regions.length } };
        break;
      }
      case 'start':
        layout = itemsOf(set, e.layout);
        want = { ...base, stage: 4, placed: layout, args: { start: e.start } };
        break;
      case 'retile':
        layout = itemsOf(set, e.layout);
        want = {
          ...base, stage: 4, placed: layout, lifted: e.liftedIds,
          args: { step: e.step, lifted: e.liftedIds.length, changed: e.changed },
        };
        break;
      case 'rated':
        rated.set(`${e.source}|${e.sequence}`, e.clueIds);
        want = {
          ...base, stage: 5, placed: drawn, clues: e.clueIds, rating: e.rating, breakdown: termsOf(e.rating),
          detail: e.detail, band: e.band, args: { sequence: e.sequence, phase: e.phase, source: e.source },
        };
        break;
      case 'skip':
        want = { ...base, stage: 5, placed: drawn, args: { sequence: e.sequence, source: e.source } };
        break;
      case 'unrateable':
        want = {
          ...base, stage: 5, placed: drawn, clues: e.clueIds, band: e.band,
          args: { sequence: e.sequence, phase: e.phase, source: e.source, reason: e.reason },
        };
        break;
      case 'rejected':
        want = {
          ...base, stage: 5, placed: drawn, clues: e.clueIds, rating: e.rating, breakdown: termsOf(e.rating),
          detail: e.detail, band: e.band,
          args: { sequence: e.sequence, phase: e.phase, source: e.source, reason: e.reason },
        };
        break;
      case 'repair': {
        const ids = e.clues.map((/** @type {Pose} */ p) => p.piece);
        repaired.set(e.repairSequence, ids);
        want = {
          ...base, stage: 6, placed: drawn, clues: ids, rating: e.rating, breakdown: termsOf(e.rating), detail: e.detail,
          args: { repairSequence: e.repairSequence, added: e.addedId, accepted: e.accepted, reason: e.reason ?? null },
        };
        break;
      }
      case 'selected': {
        const clues = e.repairSequence === null ? rated.get(`${e.source}|${e.sequence}`) : repaired.get(e.repairSequence);
        assert.ok(clues !== undefined, `${at}: the selected clues were seen`);
        assert.deepEqual([...clues].sort(), stored, `${at}: the selected clues are the stored puzzle's`);
        want = {
          ...base, stage: 5, placed: drawn, clues,
          args: { sequence: e.sequence, repairSequence: e.repairSequence, source: e.source },
        };
        break;
      }
      default:
        assert.fail(`${at}: unknown kind`);
    }
    assert.deepEqual(Object.keys(step), STEP_KEYS, at);
    assert.deepEqual(Object.keys(step.board), ['placed', 'lifted', 'clues'], at);
    assert.equal(step.stage, want.stage, at);
    assert.equal(step.kind, e.kind, at);
    assert.equal(step.note, `replay.step.${e.kind}`, at);
    assert.deepEqual(step.board, { placed: want.placed, lifted: want.lifted, clues: want.clues }, at);
    assert.deepEqual([step.rating, step.breakdown, step.detail, step.band],
      [want.rating, want.breakdown, want.detail, want.band], at);
    assert.deepEqual(step.args, want.args, at);
  });

  const last = res.steps[res.steps.length - 1];
  const claim = input.puzzle.rating ?? null;
  assert.deepEqual(Object.keys(last), STEP_KEYS, name);
  assert.equal(last.stage, 7, name);
  assert.equal(last.kind, 'final', name);
  assert.equal(last.note, 'replay.step.final', name);
  assert.deepEqual(last.board.lifted, [], name);
  assert.deepEqual(last.board.clues, input.puzzle.clues.map((/** @type {Pose} */ p) => p.piece), name);
  assert.deepEqual(last.board.placed, itemsOf(input.set, input.puzzle.solution ?? input.puzzle.clues), name);
  assert.deepEqual(last.rating, claim, name);
  assert.deepEqual(last.breakdown, termsOf(claim), name);
  assert.equal(last.detail, null, name);
  assert.deepEqual(last.band, bandOfClaim(claim), name);
  assert.deepEqual(last.args, { status: 'matched', detailStep: claim === null ? null : measuringIndex(run) }, name);
}

// ---------------------------------------------------------------------------------------------------------------
// 1. The step table.

test('replayPuzzle: one step per event as the table says, then the final step, for every puzzle and the real skips', () => {
  const inputs = [...INPUTS];
  const { subset, repair } = skipInputs();
  for (const found of [subset, repair]) {
    if (found !== null) {
      inputs.push(found.input);
    }
  }
  assert.ok(inputs.length >= 9, 'the fixture and at least one real skip');
  const kinds = new Set();
  for (const input of inputs) {
    const run = runOf(input);
    const res = resultOf(input);
    assertStepTable(input, run, res);
    for (const step of res.steps) {
      kinds.add(step.kind);
    }
    const first = res.steps[0];
    assert.equal(first.kind, 'count', input.name);
    assert.equal(res.steps[res.steps.length - 2].kind, 'selected', `${input.name}: the step before the final one`);
    for (const step of res.steps) {
      if (step.kind === 'rated' && step.rating !== null && 'metrics' in step.rating) {
        assert.equal(step.breakdown?.score, step.rating.score, `${input.name}: a breakdown of the rating's score`);
      }
    }
  }
  for (const kind of ['count', 'carve', 'piece', 'start', 'retile', 'rated', 'rejected', 'repair', 'selected', 'final']) {
    assert.ok(kinds.has(kind), `a ${kind} step is checked`);
  }

  // Real skips: a skip step at the index of its event, with the recorded ordinal.
  if (subset !== null) {
    const run = runOf(subset.input);
    const res = resultOf(subset.input);
    const at = run.events.flatMap((e, i) => (e.kind === 'skip' ? [i] : []));
    assert.ok(at.length > 0);
    assert.deepEqual(at.map((i) => /** @type {any} */ (res.steps[i]).args.sequence), subset.skips.subsets);
    for (const i of at) {
      const step = res.steps[i];
      assert.equal(step.kind, 'skip');
      assert.equal(step.stage, 5);
      assert.equal(step.note, 'replay.step.skip');
      assert.deepEqual(step.args, { sequence: /** @type {any} */ (run.events[i]).sequence, source: 'candidate' });
      assert.deepEqual([step.rating, step.breakdown, step.detail, step.band], [null, null, null, null]);
      assert.deepEqual(step.board.clues, []);
      assert.ok(step.board.placed.length > 0, 'the candidate layout is drawn');
    }
  }
  if (repair !== null) {
    const res = resultOf(repair.input);
    const finish = res.steps.filter((s) => s.kind === 'repair' && s.args.repairSequence === repair.skips.repairs[0]);
    assert.ok(finish.length > 0);
    assert.equal(finish[finish.length - 1].args.reason, 'excluded');
    assert.equal(finish[finish.length - 1].args.accepted, false);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 2. Order.

test('the steps keep the order of the events: 1-4 for a candidate, 1-3 for the calibration puzzle, then 5 and 6, then 7', (t) => {
  /** @param {import('../core/engine/replay.js').Step} s */
  const stageClass = (s) => (s.stage === 6 ? 5 : s.stage);
  let interleaved = 0;
  for (const input of INPUTS) {
    const res = resultOf(input);
    const run = runOf(input);
    const classes = res.steps.map(stageClass);
    assert.deepEqual(classes, [...classes].sort((a, b) => a - b), `${input.name}: the stages never decrease`);
    const calibration = madeOf(input).kind === 'calibration';
    assert.equal(classes.includes(4), !calibration, `${input.name}: stage 4 only for a candidate puzzle`);
    assert.equal(classes[classes.length - 1], 7, input.name);
    assert.equal(classes.filter((c) => c === 7).length, 1, input.name);
    // Never sorted: the stage of step i is the stage of event i.
    const eventStage = run.events.map((e) => ({ count: 1, carve: 2, piece: 3, start: 4, retile: 4, repair: 6 })[
      /** @type {'count'} */ (e.kind)] ?? 5);
    assert.deepEqual(res.steps.slice(0, -1).map((s) => s.stage), eventStage, input.name);
    for (let i = 1; i < res.steps.length - 1; i += 1) {
      if (res.steps[i - 1].stage === 6 && res.steps[i].stage === 5) {
        interleaved += 1;
        assert.equal(eventStage[i - 1], 6, `${input.name}: the same order as the events`);
        assert.equal(eventStage[i], 5, input.name);
      }
    }
  }
  t.diagnostic(`a stage-6 step followed by a stage-5 step: ${interleaved} time(s) in the fixture (uniqueness require)`);
});

// ---------------------------------------------------------------------------------------------------------------
// 3. The final step.

test('the final step shows the stored solution, or exactly the stored clues, and names the measuring step', (t) => {
  const plain = [];
  const repaired = [];
  for (const input of INPUTS) {
    const run = runOf(input);
    const res = resultOf(input);
    const last = res.steps[res.steps.length - 1];
    assert.deepEqual(last.board.placed.map((p) => p.id), input.puzzle.solution.map((/** @type {Pose} */ p) => p.piece),
      input.name);
    assert.deepEqual(last.board.placed.map((p) => p.pose), input.puzzle.solution, `${input.name}: the poses`);
    assert.equal(last.board.placed.length, input.set.pieces.length, `${input.name}: every piece of the solution`);
    const index = /** @type {number} */ (last.args.detailStep);
    assert.equal(index, measuringIndex(run), input.name);
    const measuring = res.steps[index];
    assert.ok(measuring.kind === 'rated' || measuring.kind === 'repair', `${input.name}: ${measuring.kind}`);
    assert.notEqual(measuring.detail, null, input.name);
    assert.deepEqual(measuring.rating, input.puzzle.rating, `${input.name}: the measurement is the claim`);
    assert.ok(last.rating !== input.puzzle.rating, 'the claim is copied');
    (measuring.kind === 'repair' ? repaired : plain).push(input.name);
  }
  t.diagnostic(`won without a repair: ${plain.join(', ')}`);
  t.diagnostic(repaired.length > 0 ? `won with a repair: ${repaired.join(', ')}` : 'the fixture has no repaired winner');
  assert.ok(plain.length > 0, 'a winner without a repair');

  // A pack written without solutions: the stored clues and nothing else.
  const read = parsePack(serializePack(/** @type {any} */ (validatePack(FIXTURE.packs[1]).value), { omitSolutions: true }));
  assert.ok(read.ok);
  const pack = /** @type {any} */ (read.value);
  const bare = { name: 'pack 1 puzzle 0 (omitSolutions)', set: setOfPack(pack), puzzle: pack.puzzles[0], generation: pack.generation };
  const omitted = replayPuzzle(bare, workspaces, REPLAY);
  assert.equal(omitted.status, 'matched');
  const last = omitted.steps[omitted.steps.length - 1];
  assert.ok(bare.puzzle.solution === undefined || bare.puzzle.solution === null);
  assert.equal(last.board.placed.length, bare.puzzle.clues.length, 'exactly one item per stored clue');
  assert.deepEqual(last.board.placed, itemsOf(bare.set, bare.puzzle.clues));
  assert.deepEqual(last.board.clues, bare.puzzle.clues.map((/** @type {Pose} */ p) => p.piece));
  assert.notEqual(last.args.detailStep, null, 'a full claim still names its measurement');

  // No measuring step unless the result is matched with a full claim.
  const moved = replayPuzzle({ ...PLAIN, puzzle: { ...PLAIN.puzzle, rating: { ...PLAIN.puzzle.rating, score: 99 } } },
    workspaces, REPLAY);
  assert.equal(moved.status, 'mismatch');
  assert.deepEqual(moved.steps[moved.steps.length - 1].args, { status: 'mismatch', detailStep: null });
  assert.equal(moved.steps[moved.steps.length - 1].rating?.score, 99, 'the stored claim is still shown');
  const { metrics: _metrics, ...summaryClaim } = PLAIN.puzzle.rating;
  const summary = replayPuzzle({ ...PLAIN, puzzle: { ...PLAIN.puzzle, rating: summaryClaim } }, workspaces, REPLAY);
  assert.equal(summary.status, 'matched', 'a summary claim is compared on model, score and level');
  const summaryFinal = summary.steps[summary.steps.length - 1];
  assert.deepEqual(summaryFinal.args, { status: 'matched', detailStep: null });
  assert.equal(summaryFinal.breakdown, null);
  assert.deepEqual(summaryFinal.rating, summaryClaim);
  assert.deepEqual(summaryFinal.band, bandOfClaim(summaryClaim));
  const incomplete = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxSteps: 10 });
  assert.deepEqual(incomplete.steps[incomplete.steps.length - 1].args, { status: 'incomplete', detailStep: null });
});

// ---------------------------------------------------------------------------------------------------------------
// 4. Breakdowns.

/**
 * The final step of a replay of PLAIN whose stored claim is replaced; the run is a mismatch of the rating.
 * @param {any} rating
 * @returns {import('../core/engine/replay.js').Step}
 */
function finalOfClaim(rating) {
  const res = replayPuzzle({ ...PLAIN, puzzle: { ...PLAIN.puzzle, rating } }, workspaces, REPLAY);
  assert.equal(res.status, 'mismatch');
  assert.equal(res.reason, 'rating');
  assert.deepEqual(JSON.parse(JSON.stringify(res)), res, 'plain JSON, no NaN and no Infinity');
  assertPlain(res, 'result');
  const last = res.steps[res.steps.length - 1];
  assert.deepEqual(last.rating, rating, 'the claim is shown as it is stored');
  assert.deepEqual(last.args, { status: 'mismatch', detailStep: null });
  return last;
}

test('breakdowns: the v3 terms, valid v2 terms, and "not available" (null) for everything else', () => {
  const v3 = PLAIN.puzzle.rating;
  const v2 = (/** @type {any} */ metrics) => ({ model: 'difficulty-v2', score: 12, level: 'normal', saturated: false, metrics });
  const normal = bandOfClaim({ level: 'normal' });

  const own = finalOfClaim({ ...v3, score: v3.score + 1 });
  assert.deepEqual(own.breakdown, breakdownV3(v3.metrics), 'the terms come from the metrics, not from the score');
  assert.equal(own.breakdown?.score, v3.score);
  assert.deepEqual(own.band, bandOfClaim(v3));

  for (const metrics of [{ U: 5, B: 3 }, { U: 5, B: 3, extra: 1 }, { U: 0, B: 0 }]) {
    const last = finalOfClaim(v2(metrics));
    assert.deepEqual(last.breakdown, { model: 'difficulty-v2', u: 2 * metrics.U, b: 8 * Math.log10(1 + metrics.B), score: 12 },
      JSON.stringify(metrics));
    assert.deepEqual(last.band, normal);
  }
  assert.deepEqual(finalOfClaim(v2({ U: 5, B: 3 })).breakdown, { model: 'difficulty-v2', u: 10, b: 8 * Math.log10(4), score: 12 });

  /** @type {[string, any][]} */
  const unavailable = [
    ['opaque v2 metrics', v2({ oldCounter: 7 })],
    ['a text U', v2({ U: 'x', B: 3 })],
    ['a numeric text U', v2({ U: '5', B: 3 })],
    ['a numeric text B', v2({ U: 5, B: '3' })],
    ['a negative B', v2({ U: 5, B: -2 })],
    ['a negative B above -1', v2({ U: 5, B: -0.5 })],
    ['a negative U', v2({ U: -1, B: 2 })],
    ['a missing B', v2({ U: 5 })],
    ['a U whose term overflows', v2({ U: Number.MAX_VALUE, B: 0 })],
    ['v2 metrics that are not an object', v2(5)],
    ['v2 metrics that are a list', v2([5, 3])],
    ['v2 metrics that are null', v2(null)],
    ['a v2 claim without metrics', { model: 'difficulty-v2', score: 12, level: 'normal', saturated: false }],
    ['a v3 summary claim', { model: 'difficulty-v3', score: v3.score, level: v3.level, saturated: false, censored: true }],
    ['a v1 claim', { model: 'difficulty-v1', score: 12, level: 'normal', metrics: { U: 5, B: 3 } }],
    ['another model', { model: 'difficulty-v9', score: 12, level: 'normal', metrics: { U: 5, B: 3 } }],
    ['v3 metrics the score rejects', { ...v3, metrics: { ...v3.metrics, U: 1.5 } }],
    ['v3 metrics whose terms overflow', { ...v3, metrics: { ...v3.metrics, G: 1e308 } }],
    ['v3 metrics that are a list', { ...v3, metrics: [] }],
  ];
  for (const [name, claim] of unavailable) {
    const last = finalOfClaim(claim);
    assert.equal(last.breakdown, null, name);
  }
  // Metrics that are an object but not a plain one (direct input only; JSON cannot make them) are not read either.
  const exotic = replayPuzzle({ ...PLAIN, puzzle: { ...PLAIN.puzzle, rating: v2(Object.assign(Object.create({}), { U: 5, B: 3 })) } },
    workspaces, REPLAY);
  assert.equal(exotic.steps[exotic.steps.length - 1].breakdown, null);
  assertPlain(exotic, 'exotic');
  assert.ok(!Number.isFinite(breakdownV3({ ...v3.metrics, G: 1e308 }).unrounded), 'the overflow case overflows');

  // A level the engine does not know has no band; the claim is still shown.
  const unknown = finalOfClaim({ ...v3, level: 'unknown-level' });
  assert.equal(unknown.band, null);
  assert.deepEqual(unknown.breakdown, breakdownV3(v3.metrics));
  // The last level whose lower edge is finite has no upper edge: `max` is null, never Infinity.
  const top = finalOfClaim({ ...v3, level: 'hell-1899' });
  assert.equal(level('hell-1899').max, Infinity);
  assert.deepEqual(top.band, { min: level('hell-1899').min, max: null });
});

// ---------------------------------------------------------------------------------------------------------------
// 5. The byte bound.

/**
 * 2 plus the larger final form: the status `unavailable` with no measuring step, or with the largest index.
 * @param {ReplayInput} input
 * @param {number} maxSteps
 * @returns {number}
 */
function reserveOf(input, maxSteps) {
  return 2 + Math.max(
    utf8Length(JSON.stringify(finalStep(input, 'unavailable', null))),
    maxSteps >= 2 ? utf8Length(JSON.stringify(finalStep(input, 'unavailable', maxSteps - 2))) : 0,
  );
}

/** @param {ReplayResult} res */
const bytesOf = (res) => utf8Length(JSON.stringify(res.steps));

test('the byte bound: the reserve is checked first, and the steps never exceed maxBytes', () => {
  // maxSteps 1: only the final step.
  const F = utf8Length(JSON.stringify(finalStep(PLAIN, 'unavailable', null)));
  assert.equal(reserveOf(PLAIN, 1), F + 2);
  const one = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxSteps: 1, maxBytes: F + 2 });
  assert.equal(one.steps.length, 1);
  assert.equal(one.steps[0].kind, 'final');
  assert.equal(one.status, 'incomplete');
  assert.equal(one.reason, 'steps');
  assert.ok(bytesOf(one) <= F + 2);
  assert.throws(() => replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxSteps: 1, maxBytes: F + 1 }, neverCancelled),
    (e) => e instanceof RangeError && /maxBytes cannot hold the final step/.test(e.message));

  // An unavailable result: nothing runs, its single final step fits exactly.
  const bare = edited(PLAIN, (g) => {
    delete g.setOrigin;
    delete g.made;
  });
  const exact = reserveOf(bare, REPLAY.maxSteps);
  assert.equal(exact, 2 + F, 'the longest status and a four-byte detailStep either way');
  const none = replayPuzzle(bare, workspaces, { ...REPLAY, maxBytes: exact }, neverCancelled);
  assert.equal(none.status, 'unavailable');
  assert.deepEqual(none.stages, { set: 'unavailable', candidate: 'unavailable', final: 'not-compared' });
  assert.equal(none.steps.length, 1);
  assert.equal(bytesOf(none), exact, 'an exact fit');
  assert.throws(() => replayPuzzle(bare, workspaces, { ...REPLAY, maxBytes: exact - 1 }, neverCancelled), RangeError);

  // A larger index has more digits: the larger of the two final forms is the reserve (the index 99,999 has five).
  assert.ok(reserveOf(PLAIN, 100001) > reserveOf(PLAIN, 12));
  assert.equal(reserveOf(PLAIN, 100002), reserveOf(PLAIN, 100001) + 1, 'the index 100,000 has six digits');
  for (const maxSteps of [100001, 100002]) {
    const wide = { ...REPLAY, maxSteps };
    assert.throws(() => replayPuzzle(PLAIN, workspaces, { ...wide, maxBytes: reserveOf(PLAIN, maxSteps) - 1 }, neverCancelled),
      RangeError, String(maxSteps));
    assert.equal(replayPuzzle(PLAIN, workspaces, { ...wide, maxBytes: reserveOf(PLAIN, maxSteps) }).steps.length, 1, String(maxSteps));
  }

  // maxBytes 4,000: the steps that fit are the first ones, in order.
  const small = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxBytes: 4000 });
  assert.equal(small.status, 'incomplete');
  assert.equal(small.reason, 'bytes');
  assert.ok(bytesOf(small) <= 4000);
  assert.ok(small.steps.length >= 2, 'some steps and the final one');
  assert.equal(small.steps[small.steps.length - 1].kind, 'final');
  assert.equal(small.steps.filter((s) => s.kind === 'final').length, 1);
  assert.deepEqual(small.steps.slice(0, -1).map((s) => s.kind), resultOf(PLAIN).steps.slice(0, small.steps.length - 1).map((s) => s.kind));
  assert.deepEqual(small.compared, []);
  assert.equal(small.stages.final, 'not-compared');

  // The smallest accepted bound with the default maxSteps: the final step alone.
  const reserve = reserveOf(PLAIN, REPLAY.maxSteps);
  const least = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxBytes: reserve }, () => false);
  assert.equal(least.status, 'incomplete');
  assert.equal(least.reason, 'bytes');
  assert.equal(least.steps.length, 1);
  assert.equal(least.steps[0].kind, 'final');
  assert.ok(bytesOf(least) <= reserve);
  assert.deepEqual(least.stages, { set: 'stopped', candidate: 'stopped', final: 'not-compared' });
  const stopped = runReplay(PLAIN, workspaces, { ...REPLAY, maxBytes: reserve }, () => false, reserve);
  assert.equal(stopped.status, 'incomplete');
  assert.equal(stopped.reason, 'bytes');
  assert.deepEqual(stopped.events, [], 'the run stops at its first event');
  assert.throws(() => replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxBytes: reserve - 1 }, neverCancelled), RangeError);
  // The run alone, with a limit it can hold, keeps its two-byte brackets out of the first event only.
  assert.equal(utf8Length(JSON.stringify(stopped.events)), 2, 'the run counts the retained events, the text of [] is 2 bytes');
});

/**
 * `need`: the bytes at which every step fits: the reserve, then each step and its comma.
 * @param {ReplayInput} input
 * @param {{ maxSteps: number, maxBytes: number, work: number }} limits
 */
function exactFit(input, limits) {
  const full = replayPuzzle(input, workspaces, limits);
  const reserve = reserveOf(input, limits.maxSteps);
  const need = reserve + full.steps.slice(0, -1).reduce((sum, s) => sum + utf8Length(JSON.stringify(s)) + 1, 0);
  // The run's own byte rule must not cut first: steps are larger than their events.
  const run = runReplay(input, workspaces, limits, () => false, reserve);
  assert.ok(utf8Length(JSON.stringify(run.events)) + reserve < need, 'the steps are larger than the events');
  return { full, need };
}

test('the byte bound on a trace: an exact fit keeps every step, one byte less drops the last one and is incomplete', () => {
  const { full, need } = exactFit(PLAIN, REPLAY);
  assert.equal(full.status, 'matched');
  const fits = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxBytes: need });
  assert.deepEqual(fits, full, 'every step and the status of the full result');
  assert.ok(bytesOf(fits) <= need);

  const less = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxBytes: need - 1 });
  assert.equal(less.status, 'incomplete');
  assert.equal(less.reason, 'bytes');
  assert.deepEqual(less.compared, []);
  assert.deepEqual(less.stages, { set: 'replayed', candidate: 'replayed', final: 'not-compared' });
  assert.equal(less.work, full.work);
  assert.equal(less.steps.length, full.steps.length - 1, 'the last non-final step is dropped');
  assert.deepEqual(less.steps.slice(0, -1), full.steps.slice(0, -2));
  const lastLess = less.steps[less.steps.length - 1];
  assert.equal(lastLess.kind, 'final');
  assert.deepEqual(lastLess.args, { status: 'incomplete', detailStep: null }, 'a cut trace names no measurement');
  assert.ok(bytesOf(less) <= need - 1);

  // The first step that does not fit ends the list, even when a later, smaller step would fit.
  const sizes = full.steps.slice(0, -1).map((s) => utf8Length(JSON.stringify(s)) + 1);
  const k = sizes.findLastIndex((size, i) => sizes.slice(i + 1).some((later) => later < size - 1));
  assert.ok(k > 0, 'a later step is smaller than an earlier one');
  const room = reserveOf(PLAIN, REPLAY.maxSteps) + sizes.slice(0, k).reduce((sum, size) => sum + size, 0) + sizes[k] - 1;
  assert.ok(utf8Length(JSON.stringify(runOf(PLAIN).events)) + reserveOf(PLAIN, REPLAY.maxSteps) < room);
  const ended = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxBytes: room });
  assert.equal(ended.status, 'incomplete');
  assert.deepEqual(ended.steps.slice(0, -1), full.steps.slice(0, k), `the first ${k} steps, none after step ${k}`);
  assert.ok(bytesOf(ended) <= room);

  // A mismatch is turned into incomplete as well, with nothing compared.
  const off = { ...PLAIN, puzzle: { ...PLAIN.puzzle, rating: { ...PLAIN.puzzle.rating, score: PLAIN.puzzle.rating.score + 1 } } };
  const mismatch = exactFit(off, REPLAY);
  assert.equal(mismatch.full.status, 'mismatch');
  assert.ok(mismatch.full.compared.length > 0);
  const cut = replayPuzzle(off, workspaces, { ...REPLAY, maxBytes: mismatch.need - 1 });
  assert.equal(cut.status, 'incomplete');
  assert.equal(cut.reason, 'bytes');
  assert.deepEqual(cut.compared, []);
  assert.equal(cut.stages.final, 'not-compared');
  assert.equal(cut.stages.set, 'replayed');
  assert.deepEqual(replayPuzzle(off, workspaces, { ...REPLAY, maxBytes: mismatch.need }), mismatch.full);

  // A run that is already incomplete keeps its reason.
  const limits = { ...REPLAY, work: Math.floor(runOf(PLAIN).work / 2) };
  const early = exactFit(PLAIN, limits);
  assert.equal(early.full.status, 'incomplete');
  assert.equal(early.full.reason, 'work');
  const keep = replayPuzzle(PLAIN, workspaces, { ...limits, maxBytes: early.need - 1 });
  assert.equal(keep.status, 'incomplete');
  assert.equal(keep.reason, 'work', 'the first bound that stopped the replay');
  assert.equal(keep.steps.length, early.full.steps.length - 1);
  assert.deepEqual(replayPuzzle(PLAIN, workspaces, { ...limits, maxBytes: early.need }), early.full);
});

// ---------------------------------------------------------------------------------------------------------------
// 6. The step-count bound.

test('the step bound: maxSteps counts the final step', () => {
  const ten = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxSteps: 10 });
  assert.equal(ten.steps.length, 10);
  assert.equal(ten.steps[9].kind, 'final');
  assert.equal(ten.status, 'incomplete');
  assert.equal(ten.reason, 'steps');
  const head = resultOf(PLAIN).steps.slice(0, 9);
  assert.deepEqual(ten.steps.slice(0, 9).map((s) => [s.stage, s.kind, s.args]), head.map((s) => [s.stage, s.kind, s.args]));
  const one = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxSteps: 1 });
  assert.equal(one.steps.length, 1);
  assert.equal(one.steps[0].kind, 'final');
  assert.equal(one.status, 'incomplete');
  assert.equal(one.reason, 'steps');
  const full = resultOf(PLAIN);
  const exact = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxSteps: full.steps.length });
  assert.deepEqual(exact, full, 'exactly as many steps as the trace has');
  const under = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxSteps: full.steps.length - 1 });
  assert.equal(under.status, 'incomplete');
  assert.equal(under.steps.length, full.steps.length - 1);
});

// ---------------------------------------------------------------------------------------------------------------
// The ids of the carved pieces.

test('the carved pieces carry the id and pose of the replayed set, and null where the set is not known', () => {
  const full = resultOf(PLAIN);
  const pieces = full.steps.filter((s) => s.kind === 'piece');
  assert.equal(pieces.length, PLAIN.set.pieces.length);
  assert.deepEqual(pieces.map((s) => s.args.n), pieces.map((_, i) => i + 1));
  assert.deepEqual(pieces.map((s) => s.board.placed.length), pieces.map((_, i) => i + 1), 'the regions so far');
  const lastPlaced = pieces[pieces.length - 1].board.placed;
  assert.deepEqual(lastPlaced.map((p) => p.id).sort(), PLAIN.set.pieces.map((p) => p.id).sort());
  for (const item of lastPlaced) {
    assert.equal(item.pose?.piece, item.id);
    assert.equal(regionKey(item.cells), regionKey(poseCells(/** @type {any} */ (PLAIN.set.pieces.find((p) => p.id === item.id)), /** @type {any} */ (item.pose))));
  }
  // An earlier step keeps the region as it was.
  assert.deepEqual(pieces[0].board.placed, lastPlaced.slice(0, 1));

  // The set attempt of the record fails: the regions are drawn, no piece is known.
  const failing = replayPuzzle(edited(PLAIN, (g) => { g.setOrigin.attempt = 12; }), workspaces, REPLAY);
  assert.equal(failing.status, 'mismatch');
  const carved = failing.steps.filter((s) => s.kind === 'piece');
  assert.ok(carved.length > 0, 'the failed attempt carved pieces');
  for (const step of carved) {
    assert.ok(step.board.placed.every((p) => p.id === null && p.pose === null && p.cells.length > 0));
  }

  // Stopped inside the set stage: no replayed set yet.
  const events = runOf(PLAIN).events;
  const third = events.findIndex((e, i) => e.kind === 'piece' && events.slice(0, i).filter((x) => x.kind === 'piece').length === 2);
  const inside = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxSteps: third + 1 });
  assert.deepEqual(inside.stages, { set: 'stopped', candidate: 'stopped', final: 'not-compared' });
  const insidePieces = inside.steps.filter((s) => s.kind === 'piece');
  assert.equal(insidePieces.length, 2);
  assert.ok(insidePieces.every((s) => s.board.placed.every((p) => p.id === null && p.pose === null)));

  // Stopped after the set stage: the ids are known.
  const after = replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxSteps: 12 });
  assert.deepEqual(after.stages, { set: 'replayed', candidate: 'stopped', final: 'not-compared' });
  assert.deepEqual(after.steps.slice(0, 11), full.steps.slice(0, 11));
});

// ---------------------------------------------------------------------------------------------------------------
// Inputs made by the engine for the cases the fixture does not have.

/**
 * A candidate of the fixture's set whose selected repair added several clues (found by a search over slots and
 * attempts of the fixture's batch seed: `expert`, slot 1, attempt 10), made again by the engine and stored as a puzzle.
 * @returns {ReplayInput}
 */
function multiAddInput() {
  const made = madeOf(PLAIN);
  const candidate = /** @type {any} */ (puzzleCandidate(candidateContext(PLAIN, { targetLevelId: 'expert' }), 1, 10));
  assert.ok(!('fail' in candidate), 'the engine makes the candidate');
  assert.deepEqual([candidate.made.slot, candidate.made.attempt, candidate.made.targetLevel], [1, 10, 'expert']);
  assert.equal(candidate.made.batchSeed, made.batchSeed);
  const puzzle = {
    id: 'multi-add', clues: candidate.clues, solution: candidate.layout, rating: JSON.parse(JSON.stringify(candidate.rating)),
  };
  const generation = { setOrigin: PLAIN.generation.setOrigin, made: { [puzzle.id]: candidate.made } };
  return { name: 'multi-add', set: PLAIN.set, puzzle, generation };
}

test('a repair that added several clues: only its last step carries the measurement, and the final step names it', () => {
  const input = multiAddInput();
  const run = runReplay(input, workspaces, REPLAY);
  const res = replayPuzzle(input, workspaces, REPLAY);
  assertStepTable(input, run, res);
  const selected = /** @type {any} */ (run.events[run.events.length - 1]);
  assert.equal(selected.kind, 'selected');
  assert.notEqual(selected.repairSequence, null, 'the winner was repaired');
  const own = res.steps.flatMap((s, i) => (s.kind === 'repair' && s.args.repairSequence === selected.repairSequence ? [i] : []));
  assert.ok(own.length >= 2, `${own.length} repair events in the selected finish`);
  const last = own[own.length - 1];
  for (const i of own.slice(0, -1)) {
    assert.deepEqual([res.steps[i].rating, res.steps[i].breakdown, res.steps[i].detail], [null, null, null], `step ${i}`);
    assert.equal(res.steps[i].args.accepted, null, `step ${i}`);
    assert.equal(typeof res.steps[i].args.added, 'string', `step ${i}: the clue it added`);
  }
  assert.equal(res.steps[last].args.accepted, true);
  assert.notEqual(res.steps[last].detail, null);
  assert.deepEqual(res.steps[last].rating, input.puzzle.rating);
  assert.equal(res.steps[res.steps.length - 1].args.detailStep, last, 'the last repair step of the finish, not the first');
  const clues = res.steps[res.steps.length - 2].board.clues;
  assert.deepEqual(clues, res.steps[last].board.clues, 'the selected clues are the clues of the last repair step');
  assert.deepEqual([...clues].sort(), input.puzzle.clues.map((/** @type {Pose} */ p) => p.piece).sort());
});

test('a set carved flat: its carve step counts no parts, and the calibration puzzle replays step by step', () => {
  const seedText = 'steps-flat-0';
  const request = { board: PLAIN.set.board, rotation: 0, levelId: 'hard', seedText, uniqueness: /** @type {const} */ ('any'), execution };
  const attempt = setAttempt(request, 0);
  assert.ok(attempt.ok);
  assert.equal(attempt.set.carving, 'flat', 'this seed carves flat on the fixture board');
  const { calibration } = attempt;
  const input = {
    name: 'flat calibration',
    set: attempt.set,
    puzzle: { id: calibration.id, clues: calibration.clues, solution: calibration.solution, rating: JSON.parse(JSON.stringify(calibration.rating)) },
    generation: {
      setOrigin: { schema: 1, seed: normalizeSeedText(seedText), level: 'hard', attempt: 0, uniqueness: 'any', versions: provenanceVersions() },
      made: { [calibration.id]: { schema: 1, kind: 'calibration' } },
    },
  };
  const run = runReplay(input, workspaces, REPLAY);
  assert.equal(run.status, 'matched');
  assert.equal(run.stages.candidate, 'calibration');
  const res = replayPuzzle(input, workspaces, REPLAY);
  assertStepTable(input, run, res);
  const carves = res.steps.filter((s) => s.kind === 'carve');
  assert.ok(carves.length >= 1);
  for (const step of carves) {
    assert.deepEqual(step.args, { mode: 'flat', parts: 0 });
  }
  assert.ok(res.steps.every((s) => s.stage !== 4), 'a calibration puzzle has no layout stage');
});

// ---------------------------------------------------------------------------------------------------------------
// Limits, input and cancellation.

test('replayPuzzle refuses malformed input and limits before anything runs, and propagates cancellation', () => {
  const { set, puzzle, generation } = PLAIN;
  assert.throws(() => replayPuzzle({ set, generation }, workspaces, REPLAY, neverCancelled), /invalid replay input/);
  assert.throws(() => replayPuzzle({ set, puzzle, generation: [] }, workspaces, REPLAY, neverCancelled), /invalid replay input/);
  assert.throws(() => replayPuzzle(null, workspaces, REPLAY, neverCancelled), /invalid replay input/);
  for (const limits of [null, { maxSteps: 0, maxBytes: 100, work: 5 }, { maxSteps: 4, maxBytes: 1.5, work: 5 },
    { maxSteps: 4, maxBytes: 100 }, { maxSteps: 4, maxBytes: 100, work: Infinity }]) {
    assert.throws(() => replayPuzzle(PLAIN, workspaces, /** @type {any} */ (limits), neverCancelled), /invalid replay limits/);
  }
  assert.throws(() => replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxBytes: 100 }, neverCancelled),
    /maxBytes cannot hold the final step/);
  assert.deepEqual(replayPuzzle(PLAIN, workspaces), resultOf(PLAIN), 'the defaults are REPLAY and never cancelled');

  let calls = 0;
  assert.throws(() => replayPuzzle(PLAIN, workspaces, REPLAY, () => {
    calls += 1;
    return calls >= 5;
  }), (e) => e instanceof ReplayCancelledError && e.code === 'cancelled');
  assert.equal(calls, 5);
});

// ---------------------------------------------------------------------------------------------------------------
// 7-8. Plain JSON and determinism.

test('the result is plain JSON, survives structuredClone, shares nothing with the input, and is deterministic', () => {
  const touched = (/** @type {ReplayInput} */ i) => JSON.stringify([i.set, i.puzzle, i.generation]);
  const before = touched(INPUTS[3]);
  /** @type {[string, ReplayResult][]} */
  const results = [
    ...[INPUTS[0], INPUTS[3], INPUTS[6]].map((i) => /** @type {[string, ReplayResult]} */ ([i.name, resultOf(i)])),
    ['cut by bytes', replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxBytes: 4000 })],
    ['cut by steps', replayPuzzle(PLAIN, workspaces, { ...REPLAY, maxSteps: 12 })],
    ['a mismatch', replayPuzzle(edited(PLAIN, (g) => { g.setOrigin.attempt = 12; }), workspaces, REPLAY)],
    ['nothing runs', replayPuzzle(edited(PLAIN, (g) => { delete g.setOrigin; delete g.made; }), workspaces, REPLAY)],
  ];
  for (const [name, res] of results) {
    assert.deepEqual(JSON.parse(JSON.stringify(res)), res, name);
    assert.deepEqual(structuredClone(res), res, name);
    assertPlain(res, name);
    assert.ok(!('events' in res) && !('set' in res), `${name}: no events and no set`);
    assert.equal(res.steps[res.steps.length - 1].stage, 7, name);
  }
  for (const input of [INPUTS[0], INPUTS[3], INPUTS[6]]) {
    assert.deepEqual(replayPuzzle(input, workspaces, REPLAY), resultOf(input), `${input.name}: the same steps again`);
  }
  assert.equal(touched(INPUTS[3]), before, 'the input is not modified');
  // A step does not alias the input: changing the result leaves the stored claim and poses alone.
  const copy = replayPuzzle(PLAIN, workspaces, REPLAY);
  const claim = JSON.stringify(PLAIN.puzzle.rating);
  const poses = JSON.stringify(PLAIN.puzzle.solution);
  const lastStep = copy.steps[copy.steps.length - 1];
  /** @type {any} */ (lastStep.rating).score = -1;
  /** @type {any} */ (lastStep.board.placed[0].pose).x = -1;
  assert.equal(JSON.stringify(PLAIN.puzzle.rating), claim);
  assert.equal(JSON.stringify(PLAIN.puzzle.solution), poses);
});

// ---------------------------------------------------------------------------------------------------------------
// A pose that cannot be placed.

test('a stored pose that the set cannot place is shown without cells, and nothing throws', () => {
  const solution = structuredClone(PLAIN.puzzle.solution);
  solution[0] = { ...solution[0], piece: 'Z' };
  solution[1] = { ...solution[1], turn: 9 };
  const res = replayPuzzle({ ...PLAIN, puzzle: { ...PLAIN.puzzle, solution } }, workspaces, REPLAY);
  assert.equal(res.status, 'mismatch');
  assert.equal(res.reason, 'solution');
  const placed = res.steps[res.steps.length - 1].board.placed;
  assert.deepEqual(placed[0], { id: 'Z', cells: [], pose: solution[0] }, 'a piece the set does not have');
  assert.deepEqual(placed[1], { id: solution[1].piece, cells: [], pose: solution[1] }, 'a turn that does not exist');
  assert.ok(placed.slice(2).every((p) => p.cells.length > 0), 'the others are placed');
  assert.deepEqual(JSON.parse(JSON.stringify(res)), res);
});

// ---------------------------------------------------------------------------------------------------------------
// 9. Measurements for the provisional bounds.

test('measurements: the steps of every fixture puzzle against REPLAY (reported, not pinned)', (t) => {
  const rows = INPUTS.map((input) => {
    const res = resultOf(input);
    return { name: input.name, steps: res.steps.length, bytes: bytesOf(res), work: res.work };
  });
  for (const r of rows) {
    t.diagnostic(`${r.name}: ${r.steps} steps, ${r.bytes} bytes, ${r.work} work`);
    assert.ok(r.steps <= REPLAY.maxSteps && r.bytes <= REPLAY.maxBytes && r.work <= REPLAY.work, r.name);
  }
  const max = (/** @type {'steps' | 'bytes' | 'work'} */ key) => Math.max(...rows.map((r) => r[key]));
  const share = (/** @type {number} */ v, /** @type {number} */ of) => `${((100 * v) / of).toFixed(4)} %`;
  t.diagnostic(`largest steps ${max('steps')} = ${share(max('steps'), REPLAY.maxSteps)} of ${REPLAY.maxSteps}`);
  t.diagnostic(`largest bytes ${max('bytes')} = ${share(max('bytes'), REPLAY.maxBytes)} of ${REPLAY.maxBytes}`);
  t.diagnostic(`largest work ${max('work')} = ${share(max('work'), REPLAY.work)} of ${REPLAY.work}`);
});

// ---------------------------------------------------------------------------------------------------------------
// 10. A puzzle without a rating claim.

test('a puzzle without a rating claim: matched, and a final step without rating, breakdown, band or measuring step', () => {
  const { rating: _rating, ...unrated } = PLAIN.puzzle;
  for (const puzzle of [unrated, { ...unrated, rating: null }]) {
    const input = { ...PLAIN, puzzle };
    const res = replayPuzzle(input, workspaces, REPLAY);
    assert.equal(res.status, 'matched');
    assert.equal(res.reason, null);
    assert.deepEqual(res.compared, ['board', 'pieces', 'witness', 'clues', 'solution']);
    const last = res.steps[res.steps.length - 1];
    assert.deepEqual(last.rating, null);
    assert.equal(last.breakdown, null);
    assert.equal(last.detail, null);
    assert.equal(last.band, null);
    assert.deepEqual(last.args, { status: 'matched', detailStep: null });
    assert.deepEqual(last.board.placed, itemsOf(input.set, puzzle.solution));
    assert.deepEqual(last.board.clues, puzzle.clues.map((/** @type {Pose} */ p) => p.piece));
    assert.deepEqual(JSON.parse(JSON.stringify(res)), res);
    assertPlain(res, 'unrated');
    const run = runOf(PLAIN);
    assert.equal(res.steps.length, run.events.length + 1);
    assert.ok(res.steps.slice(0, -1).every((s, i) => s.kind === run.events[i].kind));
  }
});

// ---------------------------------------------------------------------------------------------------------------
// 11. The provenance tuple of the gen-v4 family.

test('sameVersions compares the table ids', () => {
  const seven = { ...provenanceVersions(), priorTable: 'prior-s3-v1', screenTable: 'screen-v4-v1' };
  assert.equal(sameVersions(seven, { ...seven }), true);
  assert.equal(sameVersions(seven, { ...seven, screenTable: 'screen-v4-v2' }), false);
  assert.equal(sameVersions(seven, { ...seven, priorTable: 'prior-s3-v2' }), false);
  assert.equal(sameVersions(seven, /** @type {any} */ ({ algo: seven.algo, policy: seven.policy, rng: seven.rng, seedScheme: seven.seedScheme, ratingModel: seven.ratingModel })), false);
  assert.equal(sameVersions(provenanceVersions(), provenanceVersions()), true);
});

test('the fixture replays while ALGO_ID is gen-v4', () => {
  assert.equal(provenanceVersions().algo, 'gen-v4');
  assert.deepEqual(Object.keys(provenanceVersions()), ['algo', 'policy', 'rng', 'seedScheme', 'ratingModel', 'priorTable', 'screenTable']);
  const res = replayPuzzle(INPUTS[0], workspaces, REPLAY);
  assert.equal(res.status, 'matched');
  assert.equal(res.reason, null);
});
