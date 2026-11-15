// @ts-check
// Clue-stage recorders, the replay of skips and the work meter of `selectClues` (MP14a; RES-27, RES-28, RES-29,
// D30, D31). The doubles are those of tests/clues.test.js: a `rate` seam scores by the number of clues, and the work
// doubles carry `metrics.work = 1000 + clues.length` (a capped rating throws counters with work 7).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { makeUnique, selectClues, SkipReplayError } from '../core/engine/clues.js';
import { IncompleteRatingError, rateDetailed } from '../core/engine/difficulty.js';
import { clueKey } from '../core/engine/keys.js';
import { level, levelForScore } from '../core/engine/levels.js';
import { createRng } from '../core/engine/rng.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { RECIPE_BOARD_ROWS, recipeWitness } from './fixtures/clue-recipes.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').Rating} Rating */
/** @typedef {import('../core/engine/types.js').ClueEvent} ClueEvent */
/** @typedef {Parameters<typeof selectClues>[0]} Context */

const ws = createWorkspace(MAIN_WORKSPACE_BYTES);
const board = boardFromRows([...RECIPE_BOARD_ROWS]);
const pieces = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);
const layout = recipeWitness();
const layoutOrder = layout.map((p) => p.piece);

/** @param {Pose[]} clues */
const ids = (clues) => clues.map((c) => c.piece).join('');
/** @param {Pose[]} clues */
const keyOf = (clues) => clueKey(board, pieces, clues);
/** @param {string} names Piece ids. @returns {Pose[]} The poses of the layout, in layout order. */
const posesOf = (names) => layout.filter((p) => names.includes(p.piece));

/**
 * @param {number} score
 * @param {Piece[]} p
 * @param {Pose[]} clues
 * @param {Record<string, number>} [extra] Metrics besides `U` and the work double.
 * @returns {Rating}
 */
const fake = (score, p, clues, extra = {}) => /** @type {Rating} */ (/** @type {unknown} */ ({
  model: 'difficulty-v3', score, level: levelForScore(score).id, saturated: false,
  metrics: { U: p.length - clues.length, ...extra, work: 1000 + clues.length },
}));

/** MP07's `scripted` with the work double (no `Gproved`, so the RES-35 refusal never applies). */
const scripted = (/** @type {Record<number, number>} */ table) => /** @type {NonNullable<Context['rate']>} */ (
  (_b, p, clues) => fake(table[clues.length] ?? 10, p, clues));
const S = scripted({ 1: 40, 2: 25, 3: 21, 4: 18 });
const T = { min: 20, max: 30, share: 0.22 };
const H = level('hard');

const capped = () => new IncompleteRatingError('the deduction path was capped', { nodes: 5, work: 7, stop: 'work-cap' });

/** @typedef {number | [number, number | undefined] | 'capped'} Scripted */
/**
 * MP09c's entries: a score (Gproved 1), [score, Gproved] or 'capped' (unrateable), with the work double.
 * @param {Scripted} entry
 * @param {Piece[]} p
 * @param {Pose[]} clues
 * @returns {Rating}
 */
function answer(entry, p, clues) {
  if (entry === 'capped') {
    throw capped();
  }
  const [score, Gproved] = typeof entry === 'number' ? [entry, 1] : entry;
  return fake(score, p, clues, { Gproved: /** @type {number} */ (Gproved) });
}
const byCount = (/** @type {Record<number, Scripted>} */ table) => /** @type {NonNullable<Context['rate']>} */ (
  (_b, p, clues) => answer(table[clues.length] ?? [10, 1], p, clues));
const bySequence = (/** @type {Scripted[]} */ list) => {
  let next = 0;
  return /** @type {NonNullable<Context['rate']>} */ ((_b, p, clues) => answer(list[Math.min(next++, list.length - 1)], p, clues));
};

/**
 * An rng that logs every draw (method and result) and draws exactly as the plain one.
 * @param {string} seed
 * @param {string[]} draws
 * @returns {import('../core/engine/rng.js').Rng}
 */
function loggingRng(seed, draws) {
  const inner = /** @type {any} */ (createRng(seed));
  /** @type {any} */
  const wrapped = { derive: (/** @type {string} */ label) => inner.derive(label) };
  for (const name of ['nextU32', 'int', 'float', 'shuffle', 'pick']) {
    wrapped[name] = (/** @type {any[]} */ ...args) => {
      const result = inner[name](...args);
      draws.push(`${name}:${JSON.stringify(result)}`);
      return result;
    };
  }
  return wrapped;
}

/**
 * One `selectClues` call on the recipe board with everything an observer can see.
 * @param {Partial<Context> & Pick<Context, 'target'> & { seed: string }} o
 * @param {{ record?: boolean, charge?: boolean }} [observers] Which observers to set (default both).
 */
function observed(o, observers = {}) {
  const { record: withRecord = true, charge: withCharge = true } = observers;
  /** @type {ClueEvent[]} */
  const events = [];
  /** @type {string[]} JSON of each event at the moment of its delivery. */
  const snapshots = [];
  /** @type {number[]} */
  const charges = [];
  /** @type {string[]} `w<n>` for a charge and `e<kind>` for an event, in call order. */
  const order = [];
  /** @type {string[]} */
  const draws = [];
  /** @type {string[]} */
  const rated = [];
  const { seed, ...rest } = o;
  const result = selectClues({
    board,
    pieces,
    layout,
    rng: loggingRng(seed, draws),
    uniqueness: 'any',
    excludeClueKeys: new Set(),
    ws,
    ...rest,
    onRate: (clues, rating) => rated.push(`${ids(clues)}:${rating.score}`),
    ...(withRecord ? {
      record: (/** @type {ClueEvent} */ event) => {
        events.push(event);
        snapshots.push(JSON.stringify(event));
        order.push(`e${event.kind}`);
      },
    } : {}),
    ...(withCharge ? {
      charge: (/** @type {number} */ units) => {
        charges.push(units);
        order.push(`w${units}`);
      },
    } : {}),
  });
  return { result, events, snapshots, charges, order, draws, rated };
}

const SHAPES = {
  rated: ['stage', 'kind', 'source', 'phase', 'sequence', 'clueIds', 'rating', 'detail', 'band'],
  skip: ['stage', 'kind', 'source', 'sequence'],
  unrateable: ['stage', 'kind', 'source', 'phase', 'sequence', 'clueIds', 'reason', 'band'],
  rejected: ['stage', 'kind', 'source', 'phase', 'sequence', 'clueIds', 'rating', 'detail', 'band', 'reason'],
  repair: ['stage', 'kind', 'source', 'repairSequence', 'addedId', 'clues', 'rating', 'detail', 'accepted'],
  selected: ['stage', 'kind', 'source', 'sequence', 'repairSequence'],
};
const DETAIL_KEYS = ['path', 'first', 'search', 'count', 'census'];
const REPAIR_REASONS = ['not-proved', 'path-capped', 'no-proved-guess', 'out-of-band', 'excluded'];

/**
 * An event has exactly the fields of its kind, in order, with the types of the typedef, and is plain JSON.
 * @param {ClueEvent} e
 * @param {string} name
 */
function assertShape(e, name) {
  const expected = [...SHAPES[e.kind]];
  if (e.kind === 'repair' && 'reason' in e) {
    expected.push('reason');
  }
  assert.deepEqual(Object.keys(e), expected, `${name}: keys of ${e.kind}`);
  assert.equal(e.stage, e.kind === 'repair' ? 'unique' : 'clues', name);
  assert.ok(e.source === 'candidate' || e.source === 'calibration', name);
  if ('phase' in e) {
    assert.ok(['sample', 'seed', 'beam'].includes(e.phase), name);
  }
  if ('sequence' in e) {
    assert.ok(Number.isInteger(e.sequence) && e.sequence >= 0, name);
  }
  if ('clueIds' in e) {
    assert.deepEqual(e.clueIds, layoutOrder.filter((id) => e.clueIds.includes(id)), `${name}: clue ids in layout order`);
  }
  if ('band' in e) {
    assert.deepEqual(Object.keys(e.band), ['min', 'max'], name);
    assert.ok(e.band.max === null || Number.isFinite(e.band.max), name);
  }
  if ('detail' in e && e.detail !== null) {
    assert.deepEqual(Object.keys(e.detail), DETAIL_KEYS, name);
  }
  if (e.kind === 'rated' || e.kind === 'rejected') {
    assert.equal(e.rating.model, 'difficulty-v3', name);
  }
  if (e.kind === 'unrateable') {
    assert.equal(e.reason, 'path-capped', name);
  }
  if (e.kind === 'rejected') {
    assert.equal(e.reason, 'no-proved-guess', name);
  }
  if (e.kind === 'repair') {
    assert.ok(Number.isInteger(e.repairSequence) && e.repairSequence >= 0, name);
    assert.ok(e.addedId === null || typeof e.addedId === 'string', name);
    assert.ok(e.accepted === null || typeof e.accepted === 'boolean', name);
    if (e.rating === null) {
      assert.equal(e.detail, null, name);
    }
    assert.ok(e.clues.every((p) => !layout.includes(p) && Object.keys(p).join() === 'piece,x,y,turn,mirrored'),
      `${name}: owned poses`);
    if ('reason' in e) {
      assert.equal(e.accepted, false, name);
      assert.ok(REPAIR_REASONS.includes(/** @type {string} */ (e.reason)), name);
    }
  }
  if (e.kind === 'selected') {
    assert.ok(e.repairSequence === null || Number.isInteger(e.repairSequence), name);
  }
  assert.deepEqual(structuredClone(e), e, `${name}: structured clone`);
  assert.deepEqual(JSON.parse(JSON.stringify(e)), e, `${name}: JSON round trip`);
}

/** @param {ClueEvent[]} events @param {string} name */
const assertShapes = (events, name) => events.forEach((e, i) => assertShape(e, `${name} #${i}`));

/**
 * The `repair` events by repair ordinal, each list checked to be contiguous in the stream.
 * @param {ClueEvent[]} events
 * @returns {Map<number, Extract<ClueEvent, { kind: 'repair' }>[]>}
 */
function repairGroups(events) {
  /** @type {Map<number, Extract<ClueEvent, { kind: 'repair' }>[]>} */
  const groups = new Map();
  /** @type {number | null} */
  let open = null;
  events.forEach((e) => {
    if (e.kind !== 'repair') {
      open = null;
      return;
    }
    const list = groups.get(e.repairSequence) ?? [];
    assert.ok(open === null || open === e.repairSequence, 'the events of one finish are consecutive');
    assert.ok(open === e.repairSequence || list.length === 0, 'a finish is not interrupted and resumed');
    list.push(e);
    groups.set(e.repairSequence, list);
    open = e.repairSequence;
  });
  return groups;
}

// ---------------------------------------------------------------------------------------------------------------
// Case 3 (B03, T02): observers change nothing.

test('recording and charging change nothing: result, skips, ratings and rng draws are the same (any, req-3, a subset skip)', () => {
  const free3 = observed({ rate: S, target: T, uniqueness: 'require', seed: 'req-3' }, { record: false, charge: false });
  const excludeClueKeys = new Set([keyOf(posesOf(free3.rated[0].split(':')[0]))]);
  const calls = /** @type {const} */ ([
    ['any, real ratings', { target: H, seed: 'rec-1' }],
    ['req-3', { rate: S, target: T, uniqueness: 'require', seed: 'req-3' }],
    ['req-3 with an excluded subset', { rate: S, target: T, uniqueness: 'require', seed: 'req-3', excludeClueKeys }],
  ]);
  for (const [name, o] of calls) {
    const base = observed(o, { record: false, charge: false });
    assert.equal(base.events.length + base.charges.length, 0, name);
    assert.ok(base.draws.length > 0 && base.rated.length > 0, name);
    for (const observers of [{ record: true, charge: true }, { record: true, charge: false }, { record: false, charge: true }]) {
      const seen = observed(o, observers);
      const label = `${name} ${JSON.stringify(observers)}`;
      assert.deepEqual(seen.result, base.result, label);
      assert.equal(JSON.stringify(seen.result), JSON.stringify(base.result), label);
      assert.deepEqual(seen.draws, base.draws, `${label}: rng draws`);
      assert.deepEqual(seen.rated, base.rated, `${label}: ratings`);
      assert.equal(seen.events.length > 0, observers.record, label);
      assert.equal(seen.charges.length > 0, observers.charge, label);
    }
  }
  const skipped = observed(calls[2][1], { record: false, charge: false });
  assert.ok(skipped.result.ok);
  assert.deepEqual(skipped.result.skips.subsets, [0], 'the first subset is the one that is skipped');
});

// ---------------------------------------------------------------------------------------------------------------
// Case 4 (B01, B02, T03): event shapes, bands, the detail channel.

test('events have exactly the fields of their kind in order; real ratings carry their detail, a seam none', () => {
  const real = observed({ target: H, seed: 'rec-1' });
  assert.ok(real.result.ok);
  assertShapes(real.events, 'any, real ratings');
  const kinds = new Set(real.events.map((e) => e.kind));
  assert.deepEqual([...kinds].sort(), ['rated', 'rejected', 'selected']);
  assert.deepEqual([...new Set(real.events.flatMap((e) => ('phase' in e ? [e.phase] : [])))], ['sample', 'beam']);
  assert.ok(real.events.every((e) => e.source === 'candidate'), 'the default source');
  assert.equal(real.events[real.events.length - 1].kind, 'selected');

  // Every ordinal of a subset call has exactly one event, in order.
  const sequences = real.events.flatMap((e) => (e.kind === 'selected' || e.kind === 'repair' ? [] : [e.sequence]));
  assert.deepEqual(sequences, sequences.map((_, i) => i));

  for (const e of real.events) {
    if (e.kind !== 'rated' && e.kind !== 'rejected') {
      continue;
    }
    assert.ok(e.detail !== null, 'a recorder asks for the detail channel');
    assert.equal(e.detail.first.G, e.rating.metrics.G);
    const again = rateDetailed(board, pieces, posesOf(e.clueIds.join('')), ws);
    assert.deepEqual(e.rating, again.rating, 'the rating of the event is the rating of the call');
    assert.deepEqual(e.detail, again.detail, 'and its detail is the detail of the same measurement');
    assert.deepEqual(e.band, { min: H.min, max: H.max });
  }
  assert.equal(real.events.some((e) => e.kind === 'rejected'), true, 'RES-35 refusals of real ratings');
  assert.deepEqual(real.charges, real.events.flatMap((e) => (e.kind === 'rated' || e.kind === 'rejected'
    ? [e.rating.metrics.work] : [])), 'one charge per rating, the metrics.work of each');

  const unbounded = observed({ target: { min: 17, max: Infinity, share: 0.38 }, seed: 'unbounded' });
  assertShapes(unbounded.events, 'unbounded');
  const banded = unbounded.events.flatMap((e) => ('band' in e ? [e.band] : []));
  assert.ok(banded.length > 0);
  assert.ok(banded.every((b) => b.min === 17 && b.max === null), 'band.max is null for an unbounded target');

  const seam = observed({ rate: S, target: T, uniqueness: 'any', seed: 'req-0' });
  assertShapes(seam.events, 'seam');
  assert.ok(seam.events.some((e) => e.kind === 'rated'));
  assert.ok(seam.events.every((e) => !('detail' in e) || e.detail === null), 'with the rate seam, detail is null');
});

test('an event shape of every kind (the kinds the other cases drive)', () => {
  const excluded = new Set([keyOf(posesOf(observed({ rate: S, target: T, uniqueness: 'any', seed: 'req-3' },
    { record: false }).rated[0].split(':')[0]))]);
  const runs = [
    observed({ rate: S, target: T, uniqueness: 'any', seed: 'req-3', excludeClueKeys: excluded }),
    observed({ rate: byCount({ 5: 'capped' }), target: H, seed: 'capped-0' }),
    observed({ rate: byCount({ 5: [21, 0] }), target: H, seed: 'refused-0' }),
    observed({ rate: byCount({ 5: [21, 1], 6: 'capped', 7: 'capped', 8: 'capped', 9: 'capped' }), target: H,
      uniqueness: 'require', seed: 'repair-2' }),
    observed({ rate: S, target: T, uniqueness: 'require', seed: 'req-2' }),
  ];
  const seen = new Set();
  runs.forEach((run, i) => {
    assertShapes(run.events, `run ${i}`);
    run.events.forEach((e) => seen.add(e.kind));
  });
  assert.deepEqual([...seen].sort(), ['rated', 'rejected', 'repair', 'selected', 'skip', 'unrateable']);
});

test('recordSource labels every event; a throwing record propagates', () => {
  const calibration = observed({ rate: S, target: T, uniqueness: 'require', seed: 'req-2', recordSource: 'calibration' });
  assert.ok(calibration.events.length > 0);
  assert.ok(calibration.events.every((e) => e.source === 'calibration'));
  const stop = new Error('stop');
  /** @type {string[]} */
  const seen = [];
  assert.throws(() => selectClues({
    board, pieces, layout, rng: createRng('req-0'), uniqueness: 'require', excludeClueKeys: new Set(), ws, target: T, rate: S,
    record: (e) => {
      seen.push(e.kind);
      if (seen.length === 3) {
        throw stop;
      }
    },
  }), (e) => e === stop);
  assert.deepEqual(seen, ['rated', 'rated', 'rated']);
});

// ---------------------------------------------------------------------------------------------------------------
// Cases 5 and 6 (B02, T04): refusal, unrateable, refused and capped repairs.

test('a subset refused for lack of a proved guess emits rejected, not rated (RES-35)', () => {
  const all = observed({ rate: byCount({ 5: [21, 0] }), target: H, seed: 'refused-0' });
  assert.deepEqual(all.result, { ok: false, reason: 'not-in-band' });
  assert.equal(all.events.length, 20);
  assert.ok(all.events.every((e) => e.kind === 'rejected' && e.reason === 'no-proved-guess' && e.detail === null));
  assert.deepEqual(all.events.map((e) => e.kind === 'rejected' && e.phase),
    [...Array(4).fill('sample'), ...Array(16).fill('seed')]);
  assert.deepEqual(all.events.map((e) => e.kind === 'rejected' && e.sequence), all.events.map((_, i) => i));
  assert.equal(all.events.some((e) => e.kind === 'rated' || e.kind === 'selected'), false, 'no selected on a failure');
  assert.deepEqual(all.rated, [], 'a refusal is not a rated candidate');

  const then = observed({ rate: bySequence([[21, 0], [21, 1]]), target: H, seed: 'refused-1' });
  assert.ok(then.result.ok);
  assert.deepEqual(then.events.map((e) => `${e.kind}${'sequence' in e ? e.sequence : ''}`), ['rejected0', 'rated1', 'selected1']);
  const rejected = then.events[0];
  assert.ok(rejected.kind === 'rejected');
  assert.equal(rejected.rating.metrics.Gproved, 0);
  assert.equal(rejected.clueIds.join(''), 'LPUVF');
});

test('an unrateable subset emits unrateable with no rating; a refused or capped repair ends with its reason', () => {
  const capture = observed({ rate: bySequence(['capped', [21, 1]]), target: H, seed: 'capped-1' });
  assert.ok(capture.result.ok);
  assert.deepEqual(capture.events.map((e) => `${e.kind}${'sequence' in e ? e.sequence : ''}`), ['unrateable0', 'rated1', 'selected1']);
  assert.deepEqual(capture.events[0], {
    stage: 'clues', kind: 'unrateable', source: 'candidate', phase: 'sample', sequence: 0, clueIds: ['I', 'L', 'Y', 'T', 'Z'],
    reason: 'path-capped', band: { min: H.min, max: H.max },
  });
  assert.deepEqual(capture.charges, [7, 1005]);

  // S4: the repair rating of IYTZX is refused (Gproved 0), S6: it is capped.
  const refused = observed({ rate: byCount({ 5: [21, 1], 6: [21, 0], 7: [21, 0], 8: [21, 0], 9: [21, 0] }), target: H,
    uniqueness: 'require', seed: 'repair-2' });
  const lastOf = (/** @type {ClueEvent[]} */ events, /** @type {number} */ n) => {
    const group = repairGroups(events).get(n) ?? [];
    return group[group.length - 1];
  };
  const s4 = lastOf(refused.events, 0);
  assert.equal(s4.accepted, false);
  assert.equal(s4.reason, 'no-proved-guess');
  assert.ok(s4.rating !== null && s4.rating.metrics.Gproved === 0, 'the refused rating is reported');
  assert.equal(s4.detail, null, 'the seam has no detail');
  assert.equal(s4.addedId, 'W');
  assert.equal(ids(s4.clues), 'IYTWZX');

  const unrateable = observed({ rate: byCount({ 5: [21, 1], 6: 'capped', 7: 'capped', 8: 'capped', 9: 'capped' }), target: H,
    uniqueness: 'require', seed: 'repair-2' });
  const s6 = lastOf(unrateable.events, 0);
  assert.deepEqual([s6.accepted, s6.reason, s6.rating, s6.detail], [false, 'path-capped', null, null]);
  assert.equal(repairGroups(unrateable.events).get(0)?.length, 1, 'one clue was added: one event');
  for (const run of [refused, unrateable]) {
    assert.ok(run.result.ok);
    assert.equal(ids(run.result.clues), 'YUVWZ');
    assert.equal(run.events[run.events.length - 1].kind, 'selected');
  }
});

// ---------------------------------------------------------------------------------------------------------------
// Case 7 (B02, T04): repair steps (D31).

test('repair steps: one event per added clue, the finish decides, only the last carries the outcome', () => {
  const run = observed({ rate: S, target: T, uniqueness: 'require', seed: 'req-3' });
  assert.ok(run.result.ok);
  const groups = repairGroups(run.events);
  assert.deepEqual([...groups.keys()], [...groups.keys()].map((_, i) => i), 'ordinals 0, 1, 2, ... one per finish');
  const ratedSubsets = run.events.flatMap((e) => (e.kind === 'rated' ? [e.clueIds.join('')] : []));
  let multi = 0;
  for (const [ordinal, list] of groups) {
    const name = `finish ${ordinal}`;
    multi += list.length > 1 ? 1 : 0;
    list.forEach((e, i) => {
      assert.equal(e.repairSequence, ordinal, name);
      assert.notEqual(e.addedId, null, name);
      // The clue list grows by exactly the added piece, in layout order.
      const before = i === 0 ? null : list[i - 1].clues.map((p) => p.piece);
      const now = e.clues.map((p) => p.piece);
      assert.deepEqual(now, layoutOrder.filter((id) => now.includes(id)), name);
      if (before !== null) {
        assert.deepEqual(now.filter((id) => !before.includes(id)), [e.addedId], name);
        assert.deepEqual(before.filter((id) => !now.includes(id)), [], name);
      }
      if (i < list.length - 1) {
        assert.deepEqual([e.rating, e.detail, e.accepted, 'reason' in e], [null, null, null, false], name);
      } else {
        assert.equal(typeof e.accepted, 'boolean', name);
        assert.equal('reason' in e, e.accepted === false, name);
      }
    });
    // The finish repaired a rated candidate: its raw subset is the final clue list minus the added pieces.
    const added = list.map((e) => e.addedId);
    const raw = list[list.length - 1].clues.map((p) => p.piece).filter((id) => !added.includes(id)).join('');
    assert.ok(ratedSubsets.includes(raw), `${name}: ${raw} was rated`);
  }
  assert.ok(multi > 0, 'the case has a repair that adds more than one clue');
  assert.equal(run.events.filter((e) => e.kind === 'repair' && 'reason' in e && e.reason === 'excluded').length, 0);

  // req-0: the winner is finished by one count and no clue: no repair event, its count is charged (case 14).
  const zero = observed({ rate: S, target: T, uniqueness: 'require', seed: 'req-0' });
  assert.deepEqual(zero.events.filter((e) => e.kind === 'repair'), []);
  assert.equal(zero.charges.length, 7, 'six ratings and the count of the zero-add finish');
});

test('repair steps: the excluded repaired key is the reason of the last event of its finish, once', () => {
  const first = selectClues({ board, pieces, layout, rng: createRng('req-3'), uniqueness: 'require',
    excludeClueKeys: new Set(), ws, target: T, rate: S });
  assert.ok(first.ok);
  const run = observed({ rate: S, target: T, uniqueness: 'require', seed: 'req-3', excludeClueKeys: new Set([keyOf(first.clues)]) });
  assert.ok(run.result.ok);
  const excluded = run.events.filter((e) => e.kind === 'repair' && 'reason' in e && e.reason === 'excluded');
  assert.equal(excluded.length, 1);
  const [event] = /** @type {Extract<ClueEvent, { kind: 'repair' }>[]} */ (excluded);
  assert.equal(run.result.skips.repairs.length, 1);
  assert.equal(event.repairSequence, run.result.skips.repairs[0]);
  const group = repairGroups(run.events).get(event.repairSequence) ?? [];
  assert.equal(group[group.length - 1], event, 'the last event of the finish');
  assert.equal(event.accepted, false);
  assert.equal(ids(event.clues), 'UFX');
  assert.ok(event.rating !== null, 'the repair rating is reported with the exclusion');
});

test('repair steps: a repair that fails after an add ends with not-proved; the zero-add failure uses the same builder', () => {
  // The first count of a failed zero-add finish would have to stop at the row limit with at most one solution found;
  // no quick input reaches it (none in ten seeds on the 10 x 6 board, none on the 41-I strip). Its event is built by
  // the same code as the failure below with an empty step list (`addedId: null`, the candidate's clues, rating and
  // detail null, `accepted: false`, `reason: 'not-proved'`), and its rendering is covered by MP16a's synthetic test.
  const run = observed({ rate: scripted({ 1: 25 }), target: T, uniqueness: 'require', seed: 'budget-0' });
  assert.deepEqual(run.result, { ok: false, reason: 'uniqueness-not-proved' });
  const groups = repairGroups(run.events);
  const failed = [...groups.values()].filter((list) => list[list.length - 1].reason === 'not-proved');
  assert.equal(failed.length, 1);
  assert.equal(failed[0].length, 1, 'one clue was added before the count that stopped at the row limit');
  assert.deepEqual(failed[0][0], {
    stage: 'unique', kind: 'repair', source: 'candidate', repairSequence: 0, addedId: 'L', clues: posesOf('LU').map((p) => ({ ...p })),
    rating: null, detail: null, accepted: false, reason: 'not-proved',
  });
  assert.equal(run.events.some((e) => e.kind === 'selected'), false, 'a failure has no selected event');
  const at = run.order.indexOf('erepair');
  assert.deepEqual(run.order.slice(at - 2, at + 1), ['w433', 'w10000', 'erepair'], 'the counts are charged before the event');
});

test('makeUnique hooks only observe: onAdd gets copies after each added clue, onCount each count', () => {
  const start = posesOf('YV');
  const plain = makeUnique(board, pieces, layout, start, createRng('hooks'), ws, 10000);
  /** @type {{ id: string, clues: Pose[] }[]} */
  const adds = [];
  /** @type {number[]} */
  const counts = [];
  const draws = /** @type {string[]} */ ([]);
  const hooked = makeUnique(board, pieces, layout, start, loggingRng('hooks', draws), ws, 10000, {
    onAdd: (id, clues) => adds.push({ id, clues }),
    onCount: (n) => counts.push(n),
  });
  assert.deepEqual(hooked, plain);
  assert.ok(plain !== null && adds.length === plain.length - start.length && adds.length >= 1);
  assert.equal(counts.length, adds.length + 1, 'one count before each added clue and the final one');
  assert.ok(counts.every((n) => Number.isInteger(n) && n > 0));
  adds.forEach((add, i) => {
    assert.equal(add.clues.length, start.length + i + 1);
    assert.equal(add.clues[add.clues.length - 1].piece, add.id);
  });
  const again = makeUnique(board, pieces, layout, start, loggingRng('hooks', []), ws, 10000);
  assert.deepEqual(again, plain, 'the hooks do not draw');
});

// ---------------------------------------------------------------------------------------------------------------
// Case 8 (T05): selected.

/**
 * The `selected` event is the last event, and names the candidate (and the repair) the result came from.
 * @param {ReturnType<typeof observed>} run
 */
function assertSelected(run) {
  assert.ok(run.result.ok);
  const selected = run.events.filter((e) => e.kind === 'selected');
  assert.equal(selected.length, 1, 'exactly one');
  assert.equal(run.events[run.events.length - 1], selected[0], 'the last of all events');
  const [event] = /** @type {Extract<ClueEvent, { kind: 'selected' }>[]} */ (selected);
  const finalIds = ids(run.result.clues);
  const group = event.repairSequence === null ? null : (repairGroups(run.events).get(event.repairSequence) ?? null);
  const raw = group === null
    ? finalIds
    : finalIds.split('').filter((id) => !group.map((e) => e.addedId).includes(id)).join('');
  const candidate = run.events.find((e) => e.kind === 'rated' && e.clueIds.join('') === raw);
  assert.ok(candidate !== undefined && candidate.kind === 'rated', 'the raw subset was rated');
  assert.equal(event.sequence, candidate.sequence);
  if (group !== null) {
    const last = group[group.length - 1];
    assert.equal(last.accepted, true, 'the repair that produced the result was accepted');
    assert.equal(ids(last.clues), finalIds);
    assert.equal('reason' in last, false);
  }
  return event;
}

test('selected names the candidate and the repair of the result, once and last, and never on a failure', () => {
  const any = assertSelected(observed({ target: H, seed: 'rec-1' }));
  assert.equal(any.repairSequence, null, 'any mode has no repairs');
  assert.equal(any.sequence, 15);

  const zero = assertSelected(observed({ rate: S, target: T, uniqueness: 'require', seed: 'req-0' }));
  assert.deepEqual([zero.sequence, zero.repairSequence], [5, null], 'finished with no added clue: no repair sequence');

  const repaired = observed({ rate: S, target: T, uniqueness: 'require', seed: 'req-3' });
  const done = assertSelected(repaired);
  assert.notEqual(done.repairSequence, null, 'the result was repaired');

  const skipped = observed({ rate: S, target: T, uniqueness: 'require', seed: 'req-3' }, { charge: false });
  assert.ok(skipped.result.ok);
  const afterExclusion = observed({ rate: S, target: T, uniqueness: 'require', seed: 'req-3',
    excludeClueKeys: new Set([keyOf(skipped.result.clues)]) });
  assert.notEqual(assertSelected(afterExclusion).repairSequence, done.repairSequence);

  for (const failure of [
    observed({ rate: scripted({}), target: T, seed: 'none-0' }),
    observed({ rate: scripted({ 1: 25 }), target: T, uniqueness: 'require', seed: 'budget-1' }),
  ]) {
    assert.equal(failure.result.ok, false);
    assert.equal(failure.events.some((e) => e.kind === 'selected'), false);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// Cases 9 to 12 (B04, T06): the replay of skips.

const first3 = observed({ rate: S, target: T, uniqueness: 'require', seed: 'req-3' }, { record: false, charge: false });
assert.ok(first3.result.ok);
const subsetSkipRun = {
  rate: S, target: T, uniqueness: /** @type {const} */ ('require'), seed: 'req-3',
  excludeClueKeys: new Set([keyOf(posesOf(first3.rated[0].split(':')[0]))]),
};
const repairSkipRun = {
  rate: S, target: T, uniqueness: /** @type {const} */ ('require'), seed: 'req-3',
  excludeClueKeys: new Set([keyOf(first3.result.ok ? first3.result.clues : [])]),
};

/** A set whose `has` must never be called: a replay does not consult `excludeClueKeys`. */
const forbidden = /** @type {ReadonlySet<string>} */ (/** @type {unknown} */ ({
  has: () => {
    throw new Error('excludeClueKeys was consulted');
  },
}));

test('replay of subset skips: replaySkips without excludeClueKeys reproduces the recorded run and its events', () => {
  const recorded = observed(subsetSkipRun);
  assert.ok(recorded.result.ok);
  assert.deepEqual(recorded.result.skips, { subsets: [0], repairs: [] });
  assert.ok(recorded.events.some((e) => e.kind === 'skip'));
  assert.deepEqual(recorded.events[0], { stage: 'clues', kind: 'skip', source: 'candidate', sequence: 0 });
  for (const excludeClueKeys of [new Set(), forbidden]) {
    const replayed = observed({ ...subsetSkipRun, excludeClueKeys, replaySkips: recorded.result.skips });
    assert.deepEqual(replayed.result, recorded.result);
    assert.deepEqual(replayed.events, recorded.events);
    assert.deepEqual(replayed.draws, recorded.draws);
    assert.deepEqual(replayed.charges, recorded.charges);
  }
  // Without the record the same run does not skip.
  const free = observed({ ...subsetSkipRun, excludeClueKeys: new Set() });
  assert.ok(free.result.ok);
  assert.deepEqual(free.result.skips, { subsets: [], repairs: [] });
  assert.equal(free.events.some((e) => e.kind === 'skip'), false);
});

test('replay of a repair skip: the recorded repair ordinal rejects the same repair', () => {
  const recorded = observed(repairSkipRun);
  assert.ok(recorded.result.ok);
  assert.deepEqual(recorded.result.skips, { subsets: [43], repairs: [4] },
    'the excluded key is also a rated subset (43) and the repair UFX of ordinal 4 (MP13a case 3)');
  for (const excludeClueKeys of [new Set(), forbidden]) {
    const replayed = observed({ ...repairSkipRun, excludeClueKeys, replaySkips: recorded.result.skips });
    assert.deepEqual(replayed.result, recorded.result);
    assert.deepEqual(replayed.result.ok && replayed.result.skips.repairs, recorded.result.skips.repairs);
    assert.deepEqual(replayed.events, recorded.events);
    assert.deepEqual(replayed.draws, recorded.draws);
  }
  // A neighbouring ordinal is another repair: it is unreachable or it changes the run, never silently equal.
  const [ordinal] = recorded.result.skips.repairs;
  for (const wrong of [ordinal - 1, ordinal + 1]) {
    let outcome;
    try {
      outcome = observed({ ...repairSkipRun, excludeClueKeys: forbidden,
        replaySkips: { subsets: recorded.result.skips.subsets, repairs: [wrong] } }).result;
    } catch (error) {
      assert.ok(error instanceof SkipReplayError, `repair ${wrong}`);
      continue;
    }
    assert.notDeepEqual(outcome, recorded.result, `repair ${wrong}`);
  }
});

test('replay of skips: an entry beyond the run is unused, on success and on failure', () => {
  const recorded = observed(subsetSkipRun);
  assert.ok(recorded.result.ok);
  assert.throws(() => observed({ ...subsetSkipRun, excludeClueKeys: new Set(),
    replaySkips: { subsets: [...recorded.result.skips.subsets, 2127], repairs: [] } }),
  (e) => e instanceof SkipReplayError && e.reason === 'unused' && e.list === 'subsets' && e.ordinal === 2127
    && e.code === 'replay-skips' && e.name === 'SkipReplayError' && e.message === 'recorded subsets skip 2127 is unused');
  const repaired = observed(repairSkipRun);
  assert.ok(repaired.result.ok);
  assert.throws(() => observed({ ...repairSkipRun, excludeClueKeys: new Set(),
    replaySkips: { subsets: repaired.result.skips.subsets, repairs: [...repaired.result.skips.repairs, 63] } }),
  (e) => e instanceof SkipReplayError && e.reason === 'unused' && e.list === 'repairs' && e.ordinal === 63);
  // A failure result does not hide an unused entry either.
  assert.throws(() => observed({ rate: scripted({}), target: T, seed: 'none-0', replaySkips: { subsets: [100], repairs: [] } }),
    (e) => e instanceof SkipReplayError && e.reason === 'unused' && e.list === 'subsets' && e.ordinal === 100);
  const none = observed({ rate: scripted({}), target: T, seed: 'none-0', replaySkips: { subsets: [], repairs: [] } });
  assert.deepEqual(none.result, { ok: false, reason: 'not-in-band' });
});

test('replay of skips: a repair ordinal whose finish ends before the excluded-key check is unreachable', () => {
  const unreachable = (/** @type {number} */ ordinal, /** @type {Partial<Context> & Pick<Context, 'target'> & { seed: string }} */ o) => {
    assert.throws(() => observed({ ...o, replaySkips: { subsets: [], repairs: [ordinal] } }),
      (e) => e instanceof SkipReplayError && e.reason === 'unreachable' && e.list === 'repairs' && e.ordinal === ordinal
        && e.message === `recorded repairs skip ${ordinal} is unreachable`, `repair ${ordinal} of ${o.seed}`);
  };
  // No clue added (a successful zero-add finish).
  unreachable(0, { rate: S, target: T, uniqueness: 'require', seed: 'req-0' });
  // Out of band after two added clues.
  unreachable(0, { rate: S, target: T, uniqueness: 'require', seed: 'req-2' });
  // makeUnique failed (not proved).
  unreachable(0, { rate: scripted({ 1: 25 }), target: T, uniqueness: 'require', seed: 'budget-0' });
  // Refused and unrateable repair ratings.
  unreachable(0, { rate: byCount({ 5: [21, 1], 6: [21, 0], 7: [21, 0], 8: [21, 0], 9: [21, 0] }), target: H,
    uniqueness: 'require', seed: 'repair-2' });
  unreachable(0, { rate: byCount({ 5: [21, 1], 6: 'capped', 7: 'capped', 8: 'capped', 9: 'capped' }), target: H,
    uniqueness: 'require', seed: 'repair-2' });
  // The excluded repair itself is reachable: its entry is consumed.
  const recorded = observed(repairSkipRun);
  assert.ok(recorded.result.ok);
  const replayed = observed({ ...repairSkipRun, excludeClueKeys: new Set(), replaySkips: recorded.result.skips });
  assert.deepEqual(replayed.result, recorded.result);
});

// ---------------------------------------------------------------------------------------------------------------
// Case 13 (T03): events are not touched after delivery.

test('no event is mutated after delivery', () => {
  for (const o of [
    { target: H, seed: 'rec-1' },
    { rate: S, target: T, uniqueness: /** @type {const} */ ('require'), seed: 'req-3' },
    { rate: S, target: T, uniqueness: /** @type {const} */ ('require'), seed: 'req-2' },
    subsetSkipRun,
    repairSkipRun,
    { rate: byCount({ 5: [21, 1], 6: 'capped', 7: 'capped', 8: 'capped', 9: 'capped' }), target: H,
      uniqueness: /** @type {const} */ ('require'), seed: 'repair-2' },
  ]) {
    const run = observed(o);
    assert.ok(run.events.length > 0);
    assert.equal(run.snapshots.length, run.events.length);
    run.events.forEach((e, i) => assert.equal(JSON.stringify(e), run.snapshots[i], `${o.seed} event ${i}`));
    assert.equal(new Set(run.events).size, run.events.length, 'every event is a fresh object');
  }
});

// ---------------------------------------------------------------------------------------------------------------
// Cases 14 and 15 (B05, T07): the work meter.

test('the work meter: the reference logs of req-0, req-2 and MP09c S6 and S4, and the charges alone', () => {
  const cases = [
    ['req-0', { rate: S, target: T, uniqueness: /** @type {const} */ ('require'), seed: 'req-0' },
      'w1003 erated w1003 erated w1003 erated w1003 erated w1003 erated w1002 erated w353 eselected'],
    ['req-2', { rate: S, target: T, uniqueness: /** @type {const} */ ('require'), seed: 'req-2' },
      'w1003 erated w1003 erated w1003 erated w1003 erated w1004 erated w1002 erated w390 w304 w77 w1004 erepair erepair '
      + 'w1004 erated w1002 erated w557 eselected'],
    ['S6', { rate: byCount({ 5: [21, 1], 6: 'capped', 7: 'capped', 8: 'capped', 9: 'capped' }), target: H,
      uniqueness: /** @type {const} */ ('require'), seed: 'repair-2' },
    'w1005 erated w10 w7 w7 erepair w1005 erated w23 eselected'],
    ['S4', { rate: byCount({ 5: [21, 1], 6: [21, 0], 7: [21, 0], 8: [21, 0], 9: [21, 0] }), target: H,
      uniqueness: /** @type {const} */ ('require'), seed: 'repair-2' },
    'w1005 erated w10 w7 w1006 erepair w1005 erated w23 eselected'],
  ];
  for (const [name, o, log] of /** @type {const} */ (cases)) {
    const both = observed(o);
    assert.equal(both.order.join(' '), log, name);
    const alone = observed(o, { record: false });
    assert.deepEqual(alone.charges, both.charges, `${name}: charge alone`);
    assert.equal(alone.events.length, 0);
    assert.deepEqual(alone.result, both.result, name);
  }
});

test('the work meter: ratings charge metrics.work or the work of a capped path, errors of any other kind nothing', () => {
  // A rating with no work reading, or a non-finite one, is charged 0 (here the six ratings of req-0, then its count).
  const reading = (/** @type {Record<string, number>} */ metrics) => /** @type {NonNullable<Context['rate']>} */ (
    (_b, p, clues) => /** @type {Rating} */ (/** @type {unknown} */ ({
      ...S(_b, p, clues), metrics: { U: p.length - clues.length, ...metrics } })));
  for (const metrics of [{}, { work: NaN }, { work: Infinity }]) {
    const run = observed({ rate: reading(metrics), target: T, uniqueness: 'require', seed: 'req-0' });
    assert.deepEqual(run.charges, [0, 0, 0, 0, 0, 0, 353], JSON.stringify(metrics));
  }

  const boom = new RangeError('boom');
  /** @type {number[]} */
  const charges = [];
  assert.throws(() => selectClues({
    board, pieces, layout, rng: createRng('boom'), uniqueness: 'any', excludeClueKeys: new Set(), ws, target: H,
    rate: () => {
      throw boom;
    },
    charge: (n) => charges.push(n),
  }), (e) => e === boom);
  assert.deepEqual(charges, []);

  // An unrateable subset is charged the work of its capped path, before its event.
  const run = observed({ rate: bySequence(['capped', [21, 1]]), target: H, seed: 'capped-1' });
  assert.equal(run.order.join(' '), 'w7 eunrateable w1005 erated eselected');
});

test('a throwing charge propagates unchanged, before the event of its rating or finish', () => {
  const stop = new Error('stop');
  /** @type {ClueEvent[]} */
  const events = [];
  let calls = 0;
  assert.throws(() => selectClues({
    board, pieces, layout, rng: createRng('req-2'), uniqueness: 'require', excludeClueKeys: new Set(), ws, target: T,
    rate: S,
    charge: () => {
      calls += 1;
      if (calls === 7) {
        throw stop;
      }
    },
    record: (e) => events.push(e),
  }), (e) => e === stop);
  assert.equal(calls, 7, 'the 7th charge is the first count (390)');
  assert.deepEqual(events.map((e) => e.kind), Array(6).fill('rated'));
  assert.deepEqual(events.map((e) => e.kind === 'rated' && e.sequence), [0, 1, 2, 3, 4, 5]);

  // The charge of a rating comes before its event: the first rating's charge throws, no event was recorded.
  /** @type {ClueEvent[]} */
  const early = [];
  assert.throws(() => selectClues({
    board, pieces, layout, rng: createRng('req-2'), uniqueness: 'require', excludeClueKeys: new Set(), ws, target: T,
    rate: S,
    charge: () => {
      throw stop;
    },
    record: (e) => early.push(e),
  }), (e) => e === stop);
  assert.deepEqual(early, []);
});
