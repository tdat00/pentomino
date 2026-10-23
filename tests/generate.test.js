// @ts-check
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { activeCount, boardFromRows, rectangle } from '../core/engine/board.js';
import { carveFlatSet, carveMacro, finalizeSet } from '../core/engine/carve.js';
import { selectClues } from '../core/engine/clues.js';
import {
  candidateContext,
  certifyTask,
  completionCandidate,
  dispatchOrder,
  firstSetAttempt,
  foldAccept,
  foldNext,
  foldStart,
  GenerationError,
  puzzleCandidate,
  runCompletion,
  runFold,
  setAttempt,
} from '../core/engine/generate.js';
import { poseCells } from '../core/engine/geometry.js';
import { clueKey, layoutDistance, layoutKey } from '../core/engine/keys.js';
import { level } from '../core/engine/levels.js';
import { validatePack } from '../core/engine/pack.js';
import { BUDGETS, pieceCountRange } from '../core/engine/policy.js';
import { createRng } from '../core/engine/rng.js';
import { isValidLayout, lnsWalk, randomTiling } from '../core/engine/tiling.js';
import { createWorkspace, MAIN_WORKSPACE_BYTES, SCRATCH_WORKSPACE_BYTES } from '../core/engine/workspace.js';
import { currentVersions, expectedOf, replayRecipe, verifySample } from '../tools/record-fixtures.mjs';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

/** @typedef {import('../core/engine/types.js').Piece} Piece */
/** @typedef {import('../core/engine/types.js').Pose} Pose */
/** @typedef {import('../core/engine/types.js').PieceSet} PieceSet */
/** @typedef {import('../core/engine/types.js').PuzzleCandidate} PuzzleCandidate */
/** @typedef {import('../core/engine/types.js').BatchContext} BatchContext */
/** @typedef {import('../core/engine/generate.js').FoldState} FoldState */

const execution = { main: createWorkspace(MAIN_WORKSPACE_BYTES), scratch: createWorkspace(SCRATCH_WORKSPACE_BYTES) };
const pieces = /** @type {Piece[]} */ ([...CLASSIC_PENTOMINOES]);
const board = rectangle(10, 6);
const RECIPE = JSON.parse(readFileSync(new URL('./fixtures/generation-case.json', import.meta.url), 'utf8'));
const SAMPLE = JSON.parse(readFileSync(new URL('./fixtures/generated-sample-pack.json', import.meta.url), 'utf8'));
const FAKE_RATING = /** @type {import('../core/engine/types.js').Rating} */ ({
  model: 'difficulty-v2',
  score: 30,
  level: 'hard',
  saturated: false,
  metrics: { U: 5, B: 0, branchTrials: 0, rowTrials: 0, stop: 'solution', R: 0, H: 0 },
});

const base = /** @type {Pose[]} */ (randomTiling(board, pieces, createRng('p0'), execution.scratch, { totalRowTrials: 100000, restartBase: 2000 }));
/** @type {PieceSet} */
const classicSet = { board, pieces, witness: base, carving: 'imported', macroRegion: null };

/** Distinct layouts reachable from `base`, each with its distance to it. */
const pool = (() => {
  /** @type {Map<string, { layout: Pose[], key: string, dist: number }>} */
  const found = new Map();
  for (let i = 0; i < 60; i += 1) {
    const layout = lnsWalk(classicSet, base, createRng('pool', `w${i}`), execution.scratch, 3);
    const key = layoutKey(board, pieces, layout);
    const dist = layoutDistance(board, pieces, base, layout);
    if (dist > 0 && !found.has(key)) {
      found.set(key, { layout, key, dist });
    }
  }
  return [...found.values()];
})();

/**
 * @param {number} dist
 * @returns {{ layout: Pose[], key: string, dist: number }[]}
 */
const atDistance = (dist) => pool.filter((p) => p.dist === dist);

/**
 * @param {Pose[]} layout
 * @param {string} tag
 * @returns {PuzzleCandidate}
 */
function cand(layout, tag) {
  return { layout, layoutKey: layoutKey(board, pieces, layout), clueKey: `clue-${tag}`, clues: [], rating: FAKE_RATING, certificate: null };
}

/**
 * @param {Partial<BatchContext>} [o]
 * @returns {BatchContext}
 */
function ctxFor(o = {}) {
  return {
    set: classicSet,
    targetLevelId: 'hard',
    quantity: 3,
    batchSeed: 'fake#1',
    uniqueness: 'any',
    seenLayouts: new Set(),
    seenClues: new Set(),
    execution,
    ...o,
  };
}

/**
 * State with a raised distance preference, so near candidates are not taken at once.
 * @param {BatchContext} ctx
 * @param {number} [preferred]
 * @returns {FoldState}
 */
function startWith(ctx, preferred = 12) {
  return { ...foldStart(ctx), preferred, distance: preferred };
}

/**
 * @param {FoldState} s
 * @param {(PuzzleCandidate | { fail: string })[]} list
 * @returns {FoldState}
 */
function feed(s, list) {
  return list.reduce((state, c) => foldAccept(state, c), s);
}

/**
 * @param {FoldState} s
 * @returns {string}
 */
const summary = (s) => JSON.stringify({
  status: s.status,
  reason: s.reason ?? null,
  layouts: s.accepted.map((c) => c.layoutKey),
  clues: s.accepted.map((c) => c.clueKey),
  scores: s.accepted.map((c) => c.rating.score),
});

/**
 * Mirrors a layout left to right with an independently searched pose per piece.
 * @param {Pose[]} layout
 * @returns {Pose[]}
 */
function reflect(layout) {
  return layout.map((pose) => {
    const piece = /** @type {Piece} */ (pieces.find((p) => p.id === pose.piece));
    const want = poseCells(piece, pose).map(([x, y]) => `${board.width - 1 - x},${y}`).sort().join(';');
    for (const mirrored of [false, true]) {
      for (const turn of /** @type {const} */ ([0, 1, 2, 3])) {
        for (let y = 0; y < board.height; y += 1) {
          for (let x = 0; x < board.width; x += 1) {
            const next = { piece: pose.piece, x, y, turn, mirrored };
            if (poseCells(piece, next).map(([a, b]) => `${a},${b}`).sort().join(';') === want) {
              return next;
            }
          }
        }
      }
    }
    throw new Error('no reflected pose');
  });
}

describe('fold state and acceptance', () => {
  test('starts explicit, with preferred distance clamp(ceil(K/4), 3, 10)', () => {
    const s = foldStart(ctxFor({ quantity: 4 }));
    assert.deepEqual(
      { status: s.status, slot: s.slot, attempt: s.attempt, distance: s.distance, rejected: s.rejected, best: s.best, bestDistance: s.bestDistance },
      { status: 'running', slot: 1, attempt: 0, distance: 3, rejected: 0, best: null, bestDistance: -Infinity },
    );
    assert.deepEqual(s.failCounts, { layout: 0, 'not-in-band': 0, 'uniqueness-not-proved': 0 });
    assert.deepEqual(foldNext(s), { slot: 1, attempt: 0 });
    for (const [k, want] of [[1, 3], [12, 3], [28, 7], [37, 10], [44, 10]]) {
      const big = foldStart(ctxFor({ set: { ...classicSet, pieces: Array(k).fill(pieces[0]) } }));
      assert.equal(big.distance, want, `K=${k}`);
    }
  });

  test('accepting never mutates the previous state or the supplied history', () => {
    const seenLayouts = new Set(['old']);
    const ctx = ctxFor({ seenLayouts });
    const s0 = foldStart(ctx);
    const s1 = foldAccept(s0, cand(base, 'a'));
    assert.equal(s0.accepted.length, 0);
    assert.equal(s0.seenLayouts.size, 1);
    assert.equal(s1.accepted.length, 1);
    assert.ok(s1.seenLayouts.has(layoutKey(board, pieces, base)) && s1.seenClues.has('clue-a'));
    assert.equal(s1.slot, 2);
    assert.deepEqual([...seenLayouts], ['old']);
    assert.equal(candidateContext(ctx, s1).seenLayouts, s1.initialSeenLayouts);
    assert.equal(s1.initialSeenLayouts.size, 1);
    assert.throws(() => s1.initialSeenLayouts.add('x'), TypeError);
    assert.throws(() => s1.initialSeenClues.clear(), TypeError);
    assert.equal(s1.initialSeenLayouts.size, 1);
  });

  test('the farthest valid candidate fills a slot nobody satisfied', () => {
    const nine = atDistance(9);
    const eight = atDistance(8);
    assert.ok(nine.length >= 2 && eight.length >= 1, 'fixture pool has the needed distances');
    let s = feed(startWith(ctxFor({ quantity: 2 })), [cand(base, 'first')]);
    const farthest = cand(nine[0].layout, 'far');
    s = feed(s, [cand(eight[0].layout, 'near'), farthest, cand(nine[1].layout, 'tie')]);
    assert.equal(s.best, farthest);
    assert.equal(s.bestDistance, 9);
    assert.equal(s.rejected, 3);
    s = feed(s, Array(9).fill({ fail: 'layout' }));
    assert.equal(s.status, 'complete');
    assert.equal(s.accepted[1], farthest);
    assert.equal(s.best, null);
    assert.equal(s.bestDistance, -Infinity);
  });

  test('equal distances keep the earliest attempt', () => {
    const nine = atDistance(9);
    let s = feed(startWith(ctxFor({ quantity: 2 })), [cand(base, 'first')]);
    s = feed(s, [{ fail: 'layout' }, cand(nine[1].layout, 'early'), cand(nine[0].layout, 'late'), ...Array(9).fill({ fail: 'layout' })]);
    assert.equal(s.status, 'complete');
    assert.equal(s.accepted[1].clueKey, 'clue-early');
  });

  test('the preference relaxes by one per four rejections and resets for the next slot', () => {
    const nine = atDistance(9);
    const eleven = pool.filter((p) => p.dist >= 11);
    assert.ok(nine.length >= 4 && eleven.length >= 1);
    let s = feed(startWith(ctxFor()), [cand(base, 'first')]);
    s = feed(s, nine.slice(0, 4).map((p, i) => cand(p.layout, `n${i}`)));
    assert.equal(s.distance, 11);
    assert.equal(s.rejected, 4);
    assert.equal(s.attempt, 4);
    s = foldAccept(s, cand(eleven[0].layout, 'ok'));
    assert.equal(s.accepted[1].clueKey, 'clue-ok');
    assert.deepEqual([s.slot, s.attempt, s.distance, s.rejected], [3, 0, 12, 0]);
    // The floor is 2, whatever the preference was.
    let low = feed(startWith(ctxFor(), 3), [cand(base, 'first')]);
    low = feed(low, Array(8).fill({ fail: 'not-in-band' }));
    assert.equal(low.distance, 2);
  });

  test('a reflected duplicate and a repeated clue key are rejected as layouts', () => {
    const mirrored = reflect(base);
    assert.equal(layoutKey(board, pieces, mirrored), layoutKey(board, pieces, base));
    assert.equal(layoutDistance(board, pieces, base, mirrored), 0);
    const far = pool.find((p) => p.dist >= 11);
    const another = pool.find((p) => p.dist >= 11 && p !== far);
    assert.ok(far && another);
    let s = feed(foldStart(ctxFor()), [cand(base, 'first')]);
    s = foldAccept(s, { ...cand(mirrored, 'mirror') });
    assert.deepEqual(s.failCounts, { layout: 1, 'not-in-band': 0, 'uniqueness-not-proved': 0 });
    s = foldAccept(s, cand(far.layout, 'first'));
    assert.equal(s.failCounts.layout, 2, 'a new layout with an old clue key is not a new puzzle');
    s = foldAccept(s, { ...cand(base, 'other-clues') });
    assert.equal(s.failCounts.layout, 3, 'a clue-only variant of an accepted layout is not a new puzzle');
    s = foldAccept(s, cand(another.layout, 'fresh'));
    assert.deepEqual([s.accepted.length, s.slot, s.attempt], [2, 3, 0]);
    assert.equal(s.accepted[1].clueKey, 'clue-fresh');
  });

  test('conflicts between candidates built from the same frozen history resolve in slot order', () => {
    const far = pool.filter((p) => p.dist >= 11).slice(0, 2);
    assert.equal(far.length, 2);
    /** @type {Map<string, PuzzleCandidate | { fail: string }>} */
    const table = new Map([
      ['1/0', cand(base, 'one')],
      ['2/0', cand(far[0].layout, 'two')],
      ['3/0', cand(far[0].layout, 'two')],
      ['3/1', cand(far[1].layout, 'three')],
    ]);
    const asked = /** @type {string[]} */ ([]);
    const s = runFold(ctxFor(), (_ctx, slot, attempt) => {
      asked.push(`${slot}/${attempt}`);
      return table.get(`${slot}/${attempt}`) ?? { fail: 'layout' };
    });
    assert.equal(s.status, 'complete');
    assert.deepEqual(s.accepted.map((c) => c.clueKey), ['clue-one', 'clue-two', 'clue-three']);
    assert.deepEqual(asked, ['1/0', '2/0', '3/0', '3/1']);
  });

  /**
   * @param {string[]} fails
   * @returns {FoldState}
   */
  function exhaust(fails) {
    let s = feed(foldStart(ctxFor()), [cand(base, 'first')]);
    for (const fail of fails) {
      s = foldAccept(s, { fail });
    }
    return s;
  }

  test('exhausting twelve attempts is partial with the most frequent reason, ties in fixed order', () => {
    const rep = (/** @type {string} */ name, /** @type {number} */ n) => Array(n).fill(name);
    const cases = /** @type {[string[], string][]} */ ([
      [rep('layout', 12), 'layouts-not-found'],
      [rep('not-in-band', 12), 'difficulty-not-found'],
      [rep('uniqueness-not-proved', 12), 'uniqueness-not-proved'],
      [[...rep('not-in-band', 6), ...rep('layout', 6)], 'layouts-not-found'],
      [[...rep('uniqueness-not-proved', 6), ...rep('not-in-band', 6)], 'difficulty-not-found'],
      [[...rep('uniqueness-not-proved', 6), ...rep('layout', 6)], 'layouts-not-found'],
      [[...rep('layout', 3), ...rep('not-in-band', 4), ...rep('uniqueness-not-proved', 5)], 'uniqueness-not-proved'],
      [[...rep('layout', 2), ...rep('not-in-band', 5), ...rep('uniqueness-not-proved', 5)], 'difficulty-not-found'],
    ]);
    for (const [fails, reason] of cases) {
      const s = exhaust(fails);
      assert.equal(s.status, 'partial');
      assert.equal(s.reason, reason, fails.join());
      assert.equal(s.accepted.length, 1, 'the accepted prefix is kept');
      assert.equal(foldNext(s), null);
      assert.equal(foldAccept(s, cand(base, 'late')), s, 'a finished fold ignores further input');
    }
    const running = exhaust(Array(11).fill('layout'));
    assert.equal(running.status, 'running');
    assert.deepEqual(foldNext(running), { slot: 2, attempt: 11 });
    assert.throws(() => foldAccept(running, { fail: 'carve' }), RangeError);
  });

  test('duplicate valid-looking candidates count as layout failures when the slot is exhausted', () => {
    const dup = cand(base, 'dup');
    const s = exhaust([]);
    const done = feed(s, Array(12).fill(dup));
    assert.equal(done.status, 'partial');
    assert.equal(done.reason, 'layouts-not-found');
    assert.equal(done.failCounts.layout, 12);
  });
});

describe('calibration reuse and history capacity', () => {
  const clues = base.slice(0, 3);
  /** @param {Partial<import('../core/engine/types.js').Puzzle>} [o] */
  const calibration = (o = {}) => ({ id: 'cal', clues, solution: base, rating: FAKE_RATING, certificate: null, ...o });

  test('a matching unseen calibration puzzle fills slot 1 and joins the frozen history', () => {
    const s = foldStart(ctxFor({ quantity: 2, calibration: calibration() }));
    assert.equal(s.accepted.length, 1);
    assert.deepEqual(s.accepted[0].layout, base);
    assert.equal(s.slot, 2);
    assert.ok(s.initialSeenLayouts.has(layoutKey(board, pieces, base)));
    assert.ok(s.initialSeenClues.has(clueKey(board, pieces, clues)));
    const done = foldStart(ctxFor({ quantity: 1, calibration: calibration() }));
    assert.equal(done.status, 'complete');
    assert.equal(foldNext(done), null);
  });

  test('a calibration puzzle of another level, a seen key or an unproven require is not reused', () => {
    const mismatched = calibration({ rating: { ...FAKE_RATING, level: 'easy' } });
    assert.equal(foldStart(ctxFor({ calibration: mismatched })).accepted.length, 0);
    const seenLayouts = new Set([layoutKey(board, pieces, base)]);
    assert.equal(foldStart(ctxFor({ calibration: calibration(), seenLayouts })).accepted.length, 0);
    const seenClues = new Set([clueKey(board, pieces, clues)]);
    assert.equal(foldStart(ctxFor({ calibration: calibration(), seenClues })).accepted.length, 0);
    assert.equal(foldStart(ctxFor({ calibration: calibration(), uniqueness: 'require' })).accepted.length, 0);
    const unique = calibration({ certificate: { status: 'unique', model: 'dlx-v1', rowLimit: 10000, verified: true } });
    assert.equal(foldStart(ctxFor({ calibration: unique, uniqueness: 'require' })).accepted.length, 1);
  });

  test('each seen-key set holds at most 1,000 entries and the request is refused up front', () => {
    const keys = (/** @type {string} */ p, /** @type {number} */ n) => new Set(Array.from({ length: n }, (_, i) => `${p}${i}`));
    const fits = foldStart(ctxFor({ quantity: 10, seenLayouts: keys('l', 990), seenClues: keys('c', 990) }));
    assert.equal(fits.status, 'running');
    for (const [layouts, clueSet] of [[991, 0], [0, 991], [1000, 1000]]) {
      const seenLayouts = keys('l', layouts);
      const seenClues = keys('c', clueSet);
      assert.throws(() => foldStart(ctxFor({ quantity: 10, seenLayouts, seenClues })), (e) => e instanceof GenerationError && e.code === 'history-full');
      assert.equal(seenLayouts.size, layouts, 'nothing is evicted');
    }
    assert.throws(() => foldStart(ctxFor({ quantity: 6, seenLayouts: keys('l', 995) })), GenerationError);
    for (const quantity of [0, 11, 2.5]) {
      assert.throws(() => foldStart(ctxFor({ quantity })), RangeError);
    }
  });
});

describe('dispatch priority and scheduler simulation', () => {
  /**
   * @param {FoldState} s
   * @param {{ slot: number, attempt: number }[]} taken
   * @param {number} limit
   */
  const order = (s, taken, limit) => dispatchOrder(s, (slot, attempt) => taken.some((t) => t.slot === slot && t.attempt === attempt), limit)
    .map((t) => `${t.slot}/${t.attempt}`);

  test('awaited attempt, then attempt 0 of later slots, then current retries, then later retries', () => {
    const s = foldStart(ctxFor({ quantity: 10 }));
    assert.deepEqual(order(s, [], 4), ['1/0', '2/0', '3/0', '4/0']);
    const first = [1, 2, 3, 4].map((slot) => ({ slot, attempt: 0 }));
    assert.deepEqual(order(s, first, 4), ['5/0', '6/0', '7/0', '8/0']);
    const allFirst = [...Array(10).keys()].map((i) => ({ slot: i + 1, attempt: 0 }));
    assert.deepEqual(order(s, allFirst, 3), ['1/1', '1/2', '1/3']);
    const currentDone = [...allFirst, ...Array.from({ length: 11 }, (_, i) => ({ slot: 1, attempt: i + 1 }))];
    assert.deepEqual(order(s, currentDone, 3), ['2/1', '2/2', '2/3']);
    assert.deepEqual(order(s, [{ slot: 1, attempt: 0 }], 2), ['2/0', '3/0'], 'the awaited attempt is never re-dispatched');
    const calibrated = foldStart(ctxFor({ quantity: 10, calibration: { id: 'c', clues: base.slice(0, 3), solution: base, rating: FAKE_RATING, certificate: null } }));
    assert.deepEqual(order(calibrated, [], 2), ['2/0', '3/0']);
    assert.deepEqual(order(foldStart(ctxFor({ quantity: 1, calibration: { id: 'c', clues: [], solution: base, rating: FAKE_RATING, certificate: null } })), [], 4), []);
  });

  test('q=10 with every attempt 0 accepted needs ceil(10/width) dispatch rounds', () => {
    const layouts = pool.slice(0, 10);
    assert.equal(layouts.length, 10);
    for (const width of [1, 2, 3, 4]) {
      let s = foldStart(ctxFor({ quantity: 10 }));
      /** @type {Map<string, PuzzleCandidate | { fail: string }>} */
      const cache = new Map();
      /** @type {number[]} */
      const log = [];
      let rounds = 0;
      while (s.status === 'running') {
        const batch = dispatchOrder(s, (slot, attempt) => cache.has(`${slot}/${attempt}`), width);
        assert.ok(batch.length > 0);
        rounds += 1;
        for (const t of batch) {
          log.push(t.attempt);
          cache.set(`${t.slot}/${t.attempt}`, t.attempt === 0 ? cand(layouts[t.slot - 1].layout, `s${t.slot}`) : { fail: 'layout' });
        }
        for (let next = foldNext(s); next !== null && cache.has(`${next.slot}/${next.attempt}`); next = foldNext(s)) {
          s = foldAccept(s, /** @type {PuzzleCandidate} */ (cache.get(`${next.slot}/${next.attempt}`)));
        }
      }
      assert.equal(s.status, 'complete');
      assert.equal(s.accepted.length, 10);
      assert.equal(rounds, Math.ceil(10 / width), `width ${width}`);
      assert.equal(log.filter((a) => a === 0).length, 10);
      const firstRetry = log.findIndex((a) => a > 0);
      assert.ok(firstRetry === -1 || firstRetry > log.lastIndexOf(0), 'no retry was dispatched ahead of a first attempt');
    }
  });
});

describe('set attempts and puzzle candidates', () => {
  const request = (/** @type {Partial<import('../core/engine/types.js').SetRequest>} */ o = {}) => ({
    board, rotation: 0, levelId: 'hard', seedText: 'fixture-set-0', uniqueness: /** @type {const} */ ('any'), execution, ...o,
  });

  test('chooses K from the root stream and carves from the named macro stream', () => {
    const r = setAttempt(request(), 0);
    assert.ok(r.ok);
    const ks = /** @type {number[]} */ (pieceCountRange('hard', 60));
    const rng = createRng('fixture-set-0', 'set/0');
    const k = ks[rng.int(ks.length)];
    assert.equal(r.set.pieces.length, k);
    assert.ok(60 / k >= 6.5);
    assert.equal(r.set.carving, 'macro');
    const carved = /** @type {NonNullable<ReturnType<typeof carveMacro>>} */ (carveMacro(board, k, rng.derive('macro'), BUDGETS));
    assert.deepEqual(r.set, finalizeSet(board, carved.regions, carved.regionOf));
    assert.equal(r.attempt, 0);
    assert.deepEqual(setAttempt(request(), 0), r);
  });

  test('uses the flat stream below mean piece size 6.5 and keeps calibration on its own stream', () => {
    const r = setAttempt(request({ seedText: 'fixture-set-1' }), 0);
    assert.ok(r.ok);
    const ks = /** @type {number[]} */ (pieceCountRange('hard', 60));
    const rng = createRng('fixture-set-1', 'set/0');
    const k = ks[rng.int(ks.length)];
    assert.ok(60 / k < 6.5);
    assert.equal(r.set.carving, 'flat');
    const carved = /** @type {NonNullable<ReturnType<typeof carveFlatSet>>} */ (carveFlatSet(board, k, rng.derive('flat'), BUDGETS));
    assert.deepEqual(r.set, finalizeSet(board, carved.regions, null));
    const cal = selectClues({
      board, pieces: r.set.pieces, layout: /** @type {Pose[]} */ (r.set.witness), target: level('hard'),
      rng: rng.derive('cal'), uniqueness: 'any', excludeClueKeys: new Set(), ws: execution.main,
    });
    assert.ok(cal.ok);
    assert.deepEqual(r.calibration.clues, cal.clues);
    assert.deepEqual(r.calibration.rating, cal.rating);
  });

  test('is independent of display rotation and differs between attempts', () => {
    const a = setAttempt(request(), 0);
    const b = setAttempt(request({ rotation: 90 }), 0);
    const c = setAttempt(request(), 1);
    assert.ok(a.ok && b.ok && c.ok);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a.set.pieces.map((p) => p.cells), c.set.pieces.map((p) => p.cells));
  });

  test('keeps the witness, produces an in-band calibration puzzle and proves it in require mode', () => {
    for (const uniqueness of /** @type {const} */ (['any', 'require'])) {
      const r = setAttempt(request({ uniqueness }), 0);
      assert.ok(r.ok, `${uniqueness}: ${r.ok ? '' : r.reason}`);
      assert.ok(isValidLayout(board, r.set.pieces, /** @type {Pose[]} */ (r.set.witness)));
      assert.equal(r.calibration.rating?.level, 'hard');
      assert.deepEqual(r.calibration.solution, r.set.witness);
      assert.equal(r.calibration.certificate?.status ?? null, uniqueness === 'any' ? null : 'unique');
      const byPiece = new Map(/** @type {Pose[]} */ (r.set.witness).map((p) => [p.piece, p]));
      assert.ok(r.calibration.clues.length >= 1 && r.calibration.clues.every((c) => JSON.stringify(byPiece.get(c.piece)) === JSON.stringify(c)));
    }
  });

  test('rejects unoffered levels and bad attempt numbers as control errors; firstSetAttempt keeps the lowest success', () => {
    assert.throws(() => setAttempt(request({ levelId: 'nightmare' }), 0), RangeError);
    assert.throws(() => setAttempt(request(), -1), RangeError);
    assert.throws(() => setAttempt(request({ seedText: '  ' }), 0), RangeError);
    const found = firstSetAttempt(request(), 5);
    assert.ok(found.result);
    assert.equal(found.result.attempt, found.failures.length);
  });

  const set0 = /** @type {PieceSet} */ (/** @type {import('../core/engine/types.js').SetAttemptResult & { ok: true }} */ (setAttempt(request(), 0)).set);
  const realCtx = (/** @type {Partial<BatchContext>} */ o = {}) => ({
    set: set0, targetLevelId: 'hard', quantity: 3, batchSeed: 'fixture-set-0#1', uniqueness: /** @type {const} */ ('any'),
    seenLayouts: new Set(), seenClues: new Set(), execution, ...o,
  });

  test('candidates are deterministic, valid, in band and carry matching keys', () => {
    const c = /** @type {PuzzleCandidate} */ (puzzleCandidate(realCtx(), 1, 0));
    assert.ok('layout' in c);
    assert.deepEqual(puzzleCandidate(realCtx(), 1, 0), c);
    assert.ok(isValidLayout(board, set0.pieces, c.layout));
    assert.equal(c.layoutKey, layoutKey(board, set0.pieces, c.layout));
    assert.equal(c.clueKey, clueKey(board, set0.pieces, c.clues));
    assert.equal(c.rating.level, 'hard');
    assert.equal(c.certificate, null);
    const byPiece = new Map(c.layout.map((p) => [p.piece, p]));
    assert.ok(c.clues.length >= 1 && c.clues.length <= set0.pieces.length - 2);
    assert.ok(c.clues.every((p) => JSON.stringify(byPiece.get(p.piece)) === JSON.stringify(p)));
    const other = /** @type {PuzzleCandidate} */ (puzzleCandidate(realCtx(), 2, 0));
    assert.notEqual(other.layoutKey + other.clueKey, c.layoutKey + c.clueKey);
  });

  test('a seen layout fails early, an excluded clue key never repeats', () => {
    const c = /** @type {PuzzleCandidate} */ (puzzleCandidate(realCtx(), 1, 0));
    assert.deepEqual(puzzleCandidate(realCtx({ seenLayouts: new Set([c.layoutKey]) }), 1, 0), { fail: 'layout' });
    const again = puzzleCandidate(realCtx({ seenClues: new Set([c.clueKey]) }), 1, 0);
    assert.ok('fail' in again || again.clueKey !== c.clueKey);
  });

  test('walks start from the witness, or from the restart stream on attempts 2, 5, 8 of small boards', () => {
    for (const attempt of [0, 1, 2]) {
      const rng = createRng('fixture-set-0#1', `slot/1/${attempt}`);
      const restart = attempt % 3 === 2
        ? randomTiling(board, set0.pieces, rng.derive('restart'), execution.scratch, { totalRowTrials: BUDGETS.tilingTotal, restartBase: BUDGETS.restartBase })
        : null;
      const expected = lnsWalk(set0, restart ?? /** @type {Pose[]} */ (set0.witness), rng.derive('walk'), execution.scratch, BUDGETS.lnsSteps);
      const c = puzzleCandidate(realCtx(), 1, attempt);
      assert.ok('layout' in c || c.fail !== undefined);
      if ('layout' in c) {
        assert.deepEqual(c.layout, expected, `attempt ${attempt}`);
      }
    }
  });

  test('boards over 150 cells never use random restarts; a set without a witness needs one', () => {
    const big = setAttempt({ ...request({ board: rectangle(20, 18) }) }, 0);
    assert.ok(big.ok);
    const ctx = realCtx({ set: big.set, batchSeed: 'big#1' });
    const rng = createRng('big#1', 'slot/1/2');
    const expected = lnsWalk(big.set, /** @type {Pose[]} */ (big.set.witness), rng.derive('walk'), execution.scratch, BUDGETS.lnsSteps);
    const c = puzzleCandidate(ctx, 1, 2);
    assert.ok('layout' in c);
    assert.deepEqual(c.layout, expected);
    assert.deepEqual(puzzleCandidate(realCtx({ set: { ...big.set, witness: null } }), 1, 0), { fail: 'layout' });
    const imported = puzzleCandidate(realCtx({ set: { ...set0, witness: null, carving: 'imported', macroRegion: null } }), 1, 0);
    assert.ok('layout' in imported ? isValidLayout(board, set0.pieces, imported.layout) : imported.fail !== undefined);
  });

  test('lazy certification gives a proof status without changing the accepted fold', () => {
    const ctx = realCtx({ quantity: 2 });
    const fold = runFold(ctx);
    const before = summary(fold);
    for (const c of fold.accepted) {
      const cert = certifyTask(ctx, c.clues);
      assert.equal(cert.model, 'dlx-v1');
      assert.equal(cert.verified, true);
      assert.ok(['unique', 'multiple', 'not-proved'].includes(cert.status));
    }
    assert.equal(summary(fold), before);
    assert.equal(summary(runFold(ctx)), before);
  });

  describe('completion pass', () => {
    const witness = /** @type {Pose[]} */ (set0.witness);
    /** Distinct layouts of the set other than the witness, in layout-key order (the order the pass consumes). */
    const others = (() => {
      /** @type {Map<string, Pose[]>} */
      const found = new Map();
      for (let i = 0; i < 40 && found.size < 6; i += 1) {
        const layout = lnsWalk(set0, witness, createRng('completion-test', `w${i}`), execution.scratch, 3);
        found.set(layoutKey(board, set0.pieces, layout), layout);
      }
      return [...found].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, layout]) => layout);
    })();
    /** A fold that stopped short with the witness layout accepted, as after layouts-not-found. */
    const partialAfterWitness = (/** @type {Partial<BatchContext>} */ o = {}) => {
      const ctx = realCtx({ quantity: 4, ...o });
      const start = foldStart(ctx);
      const first = { layout: witness, layoutKey: layoutKey(board, set0.pieces, witness), clueKey: 'clue-w', clues: [], rating: FAKE_RATING, certificate: null };
      const state = { ...foldAccept({ ...start, distance: 0 }, first), status: /** @type {const} */ ('partial'), reason: /** @type {const} */ ('layouts-not-found') };
      return { ctx, state };
    };

    test('a candidate is a pure function of the batch seed and the layout: valid, in band, keyed, independent of slot streams', () => {
      assert.ok(others.length >= 4);
      const ctx = realCtx();
      const c = /** @type {PuzzleCandidate} */ (completionCandidate(ctx, others[0]));
      assert.ok('layout' in c);
      assert.deepEqual(completionCandidate(realCtx(), others[0]), c);
      assert.deepEqual(completionCandidate(realCtx({ quantity: 9, seenLayouts: new Set(['x']) }), others[0]), c, 'quantity and unrelated history do not matter');
      assert.ok(isValidLayout(board, set0.pieces, c.layout));
      assert.equal(c.layoutKey, layoutKey(board, set0.pieces, others[0]));
      assert.equal(c.clueKey, clueKey(board, set0.pieces, c.clues));
      assert.equal(c.rating.level, 'hard');
      const expected = selectClues({
        board, pieces: set0.pieces, layout: others[0], target: level('hard'),
        rng: createRng('fixture-set-0#1', `completion/${c.layoutKey}`).derive('clues'),
        uniqueness: 'any', excludeClueKeys: new Set(), ws: execution.main,
      });
      assert.ok(expected.ok);
      assert.deepEqual(c.clues, expected.clues);
      assert.notDeepEqual(completionCandidate(realCtx({ batchSeed: 'fixture-set-0#2' }), others[0]), c, 'another batch seed draws other clues');
    });

    test('a seen layout fails, an excluded clue key never repeats, failures keep the pipeline reasons', () => {
      const c = /** @type {PuzzleCandidate} */ (completionCandidate(realCtx(), others[1]));
      assert.deepEqual(completionCandidate(realCtx({ seenLayouts: new Set([c.layoutKey]) }), others[1]), { fail: 'layout' });
      const again = completionCandidate(realCtx({ seenClues: new Set([c.clueKey]) }), others[1]);
      assert.ok('fail' in again || again.clueKey !== c.clueKey);
      const impossible = completionCandidate(realCtx({ targetLevelId: 'hell-5' }), others[1]);
      assert.ok('fail' in impossible && impossible.fail === 'not-in-band');
    });

    test('accepts in key order until the quantity is reached, with strict key distinctness and no distance preference', () => {
      const { ctx, state } = partialAfterWitness();
      const run = runCompletion(ctx, state, others);
      assert.equal(run.state.status, 'complete');
      assert.equal(run.state.accepted.length, 4);
      assert.equal(run.tried, 3, 'stops as soon as the request is full');
      assert.deepEqual(run.state.accepted.slice(1).map((c) => c.layout), others.slice(0, 3));
      assert.equal(new Set(run.state.accepted.map((c) => c.layoutKey)).size, 4);
      assert.equal(new Set(run.state.accepted.map((c) => c.clueKey)).size, 4);
      assert.deepEqual(run.state.seenLayouts, new Set(run.state.accepted.map((c) => c.layoutKey)));
      assert.equal(state.accepted.length, 1, 'the input state is not mutated');
      assert.deepEqual(runCompletion(ctx, state, others).state.accepted, run.state.accepted, 'repeatable');
    });

    test('unusable arrangements are counted by reason and skipped; the fold stays partial when they run out', () => {
      const { ctx, state } = partialAfterWitness({ quantity: 6 });
      const none = runCompletion(ctx, state, others.slice(0, 3), () => ({ fail: 'not-in-band' }));
      assert.deepEqual(none.failures, { layout: 0, 'not-in-band': 3, 'uniqueness-not-proved': 0 });
      assert.deepEqual([none.state.status, none.state.reason, none.state.accepted.length, none.tried], ['partial', 'layouts-not-found', 1, 3]);
      const mixed = runCompletion(ctx, state, others.slice(0, 4), (c, layout) => (layout === others[1] ? { fail: 'not-in-band' } : completionCandidate(c, layout)));
      assert.deepEqual(mixed.state.accepted.slice(1).map((c) => c.layout), [others[0], others[2], others[3]]);
      assert.equal(mixed.failures['not-in-band'], 1);
      assert.equal(mixed.state.status, 'partial');
      const twin = { layout: others[0], layoutKey: '', clueKey: 'clue-same', clues: [], rating: FAKE_RATING, certificate: null };
      const clash = runCompletion(ctx, state, others.slice(0, 2), (_c, layout) => ({ ...twin, layout, layoutKey: layoutKey(board, set0.pieces, layout) }));
      assert.deepEqual([clash.state.accepted.length, clash.failures.layout], [2, 1], 'a repeated clue key is a failed candidate');
    });
  });
});

describe('deterministic parallel simulation', () => {
  /**
   * @param {BatchContext} ctx
   * @param {Map<string, PuzzleCandidate | { fail: string }>} memo
   * @param {number} width
   * @param {string} orderSeed
   * @returns {FoldState}
   */
  function simulate(ctx, memo, width, orderSeed) {
    let s = foldStart(ctx);
    const frozen = candidateContext(ctx, s);
    const rng = createRng(orderSeed);
    /** @type {{ slot: number, attempt: number }[]} */
    const inflight = [];
    /** @type {Map<string, PuzzleCandidate | { fail: string }>} */
    const cache = new Map();
    while (s.status === 'running') {
      const have = (/** @type {number} */ slot, /** @type {number} */ attempt) => cache.has(`${slot}/${attempt}`)
        || inflight.some((t) => t.slot === slot && t.attempt === attempt);
      inflight.push(...dispatchOrder(s, have, width - inflight.length));
      const done = /** @type {{ slot: number, attempt: number }} */ (inflight.splice(rng.int(inflight.length), 1)[0]);
      const key = `${done.slot}/${done.attempt}`;
      if (!memo.has(key)) {
        memo.set(key, puzzleCandidate(frozen, done.slot, done.attempt));
      }
      cache.set(key, /** @type {PuzzleCandidate | { fail: string }} */ (memo.get(key)));
      for (let next = foldNext(s); next !== null && cache.has(`${next.slot}/${next.attempt}`); next = foldNext(s)) {
        s = foldAccept(s, /** @type {PuzzleCandidate} */ (cache.get(`${next.slot}/${next.attempt}`)));
      }
    }
    return s;
  }

  for (const [seedText, tag] of [['fixture-set-0', ''], ['fixture-set-1', ' (slow)']]) {
    test(`pool sizes 1-4 and shuffled completion orders agree on ${seedText}${tag}`, () => {
      const r = setAttempt({ board, rotation: 0, levelId: 'hard', seedText, uniqueness: 'any', execution }, 0);
      assert.ok(r.ok);
      const seenLayouts = new Set(['pre-existing']);
      /** @type {BatchContext} */
      const ctx = {
        set: r.set, targetLevelId: 'hard', quantity: 5, batchSeed: `${seedText}#1`, uniqueness: 'any',
        seenLayouts, seenClues: new Set(), calibration: r.calibration, execution,
      };
      const serial = runFold(ctx);
      assert.ok(serial.accepted.length >= 2, 'the serial reference produces puzzles');
      const want = summary(serial);
      const memo = /** @type {Map<string, PuzzleCandidate | { fail: string }>} */ (new Map());
      for (const width of [1, 2, 3, 4]) {
        for (const order of ['a', 'b', 'c']) {
          assert.equal(summary(simulate(ctx, memo, width, `${order}${width}`)), want, `width ${width} order ${order}`);
        }
      }
      assert.deepEqual([...seenLayouts], ['pre-existing'], 'the request history is never mutated');
      assert.equal(ctx.seenClues.size, 0);
      for (const [key, value] of [...memo].slice(0, 3)) {
        const [slot, attempt] = key.split('/').map(Number);
        const fresh = puzzleCandidate(candidateContext(ctx, foldStart(ctx)), slot, attempt);
        assert.deepEqual(fresh, value, 'candidates are pure functions of their payload');
      }
    });
  }
});

describe('recorded generation fixture', () => {
  const replay = replayRecipe(RECIPE);

  test('replays ten distinct Hard puzzles with the recorded keys and scores', () => {
    assert.equal(RECIPE.version, 1);
    assert.equal(RECIPE.batchSeed, `${RECIPE.seedText}#1`);
    assert.deepEqual(RECIPE.versions, currentVersions());
    assert.equal(replay.fold.status, 'complete');
    assert.equal(replay.fold.accepted.length, 10);
    assert.deepEqual(expectedOf(RECIPE, replay), RECIPE.expected);
    assert.equal(new Set(RECIPE.expected.layoutKeys).size, 10);
    assert.equal(new Set(RECIPE.expected.clueKeys).size, 10);
    for (const c of replay.fold.accepted) {
      assert.equal(c.rating.level, 'hard');
      assert.ok(isValidLayout(replay.set.board, replay.set.pieces, c.layout));
    }
  });

  test('a second batch with carried history adds new layouts on the same board, shapes, ids and colors', () => {
    const { ctx, fold, set } = replay;
    const second = runFold({ ...ctx, batchSeed: `${RECIPE.seedText}#2`, quantity: 5, seenLayouts: fold.seenLayouts, seenClues: fold.seenClues, calibration: undefined });
    assert.ok(second.accepted.length > 0, 'the second batch returns puzzles');
    const taken = new Set(fold.accepted.map((c) => c.layoutKey));
    const takenClues = new Set(fold.accepted.map((c) => c.clueKey));
    for (const c of second.accepted) {
      assert.ok(!taken.has(c.layoutKey) && !takenClues.has(c.clueKey));
      assert.ok(isValidLayout(set.board, set.pieces, c.layout));
    }
    assert.equal(second.accepted.length, new Set(second.accepted.map((c) => c.layoutKey)).size);
    assert.equal(fold.seenLayouts.size, 10, 'the first fold state is not mutated');
    const rerun = replayRecipe(RECIPE);
    assert.deepEqual(rerun.set, replay.set, 'a fresh session with the same seed reproduces the set');
    assert.deepEqual(expectedOf(RECIPE, rerun), RECIPE.expected, 'and batch 1');
  });

  test('the sample pack verifies independently, is a valid pack and uses three different layouts', () => {
    assert.deepEqual(verifySample(SAMPLE), []);
    assert.deepEqual(SAMPLE.puzzles.map((/** @type {{ title: string }} */ p) => p.title), ['Easy', 'Normal', 'Hard']);
    assert.deepEqual(SAMPLE.puzzles.map((/** @type {{ rating: { level: string } }} */ p) => p.rating.level), ['easy', 'normal', 'hard']);
    assert.equal(SAMPLE.generation.setSeed, RECIPE.seedText);
    assert.deepEqual(SAMPLE.pieces, replay.set.pieces);
    assert.deepEqual(SAMPLE.witness, replay.set.witness);
    assert.ok(SAMPLE.puzzles.every((/** @type {object} */ p) => !('certificate' in p)));
    const result = validatePack(SAMPLE);
    assert.ok(result.ok, result.ok ? '' : JSON.stringify(result.issues));
    assert.equal(activeCount(boardFromRows(SAMPLE.board.rows)), 60);
  });

  test('the recorder refuses to overwrite, requires a reason to replace, and --check replays cleanly', () => {
    const tool = fileURLToPath(new URL('../tools/record-fixtures.mjs', import.meta.url));
    const run = (/** @type {string[]} */ ...args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });
    assert.equal(run('--check').status, 0);
    const create = run('--create');
    assert.equal(create.status, 1);
    assert.match(create.stderr, /already exist/);
    assert.equal(run('--replace').status, 2);
    assert.equal(run().status, 2);
    assert.equal(run('--check').status, 0, 'refused commands left the fixtures intact');
  });
});
