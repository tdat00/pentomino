// @ts-check
// Replay runs (MP15a1, design §6.12): `runReplay` on the replay fixture of tests/fixtures/replay-case.json (hard,
// 10 x 6, `require`, the set seed replay-case-0: two batch packs of the same set, the first puzzle of pack 0 being
// the set's reused calibration puzzle). The fixture has no skip of any kind, so the skip cases (17) are made by the
// real engine and never written by hand.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { activeCount, boardFromRows } from '../core/engine/board.js';
import { puzzleCandidate, setAttempt } from '../core/engine/generate.js';
import { poseCells } from '../core/engine/geometry.js';
import { parsePack, serializePack, validatePack } from '../core/engine/pack.js';
import { BUDGETS, pieceCountRange, REPLAY } from '../core/engine/policy.js';
import { ReplayCancelledError, runReplay, utf8Length } from '../core/engine/replay.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';

/** @typedef {import('../core/engine/types.js').PieceSet} PieceSet */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/replay.js').ReplayRun} ReplayRun */
/** @typedef {{ name: string, set: PieceSet, puzzle: any, generation: any }} ReplayInput */

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/replay-case.json', import.meta.url), 'utf8'));
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
  const setChanged = runReplay(edited(candidate, (g) => { g.setOrigin.versions.algo = 'gen-v0'; }), workspaces);
  assert.equal(setChanged.status, 'unavailable');
  assert.equal(setChanged.reason, 'set-versions');
  assert.equal(setChanged.stages.set, 'unavailable');
  assert.equal(setChanged.stages.candidate, 'replayed', 'the candidate stage still runs from the stored set');
  assert.deepEqual(setChanged.compared, ['clues', 'rating', 'solution']);

  const both = edited(candidate, (g) => {
    g.setOrigin.versions.algo = 'gen-v0';
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

  // Every one of the five ids counts, in the origin and in the record.
  for (const name of ['algo', 'policy', 'rng', 'seedScheme', 'ratingModel']) {
    const origin = runReplay(edited(candidate, (g) => {
      g.setOrigin.versions[name] = 'other';
      g.made[id].versions[name] = 'other';
    }), workspaces, REPLAY, neverCancelled);
    assert.equal(origin.reason, 'set-versions', name);
    assert.equal(origin.stages.candidate, 'unavailable', name);
    const record = runReplay(edited(candidate, (g) => {
      delete g.setOrigin;
      g.made[id].versions[name] = 'other';
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
