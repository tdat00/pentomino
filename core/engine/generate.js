// @ts-check
// Piece-set attempts, puzzle candidates and the deterministic batch fold
// (design §6.5, §6.7, §6.9, §8.2). Every task is a pure function of its payload
// with named random streams, so one worker or four give the same result.

import { activeCount } from './board.js';
import { certify, countRowLimit, selectClues } from './clues.js';
import { carveFlatSet, carveMacro, finalizeSet, validateSet } from './carve.js';
import { clueKey, layoutKey, minLayoutDistance, puzzleId } from './keys.js';
import { level } from './levels.js';
import { BUDGETS, pieceCountRange } from './policy.js';
import { createRng, normalizeSeedText } from './rng.js';
import { lnsWalk, randomTiling } from './tiling.js';

/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Puzzle} Puzzle */
/** @typedef {import('./types.js').Certificate} Certificate */
/** @typedef {import('./types.js').SetRequest} SetRequest */
/** @typedef {import('./types.js').SetAttemptResult} SetAttemptResult */
/** @typedef {import('./types.js').BatchContext} BatchContext */
/** @typedef {import('./types.js').PuzzleCandidate} PuzzleCandidate */

/** @typedef {'layout' | 'not-in-band' | 'uniqueness-not-proved'} FailReason */
/** @typedef {{ fail: FailReason }} CandidateFailure */
/** @typedef {'layouts-not-found' | 'difficulty-not-found' | 'uniqueness-not-proved'} PartialReason */

/**
 * Explicit fold state; `foldAccept` returns a new state and never mutates the
 * old one. `slot` is the one-based slot being filled (`accepted.length + 1`),
 * `attempt` the next attempt to consume. `seenLayouts` / `seenClues` grow with
 * every acceptance; `initialSeen*` are the frozen request-start histories
 * (including a reused calibration puzzle) that every candidate task receives.
 * @typedef {object} FoldState
 * @property {'running' | 'complete' | 'partial'} status
 * @property {PartialReason} [reason] Set when `status` is `partial`.
 * @property {number} slot
 * @property {number} attempt
 * @property {number} distance Current preferred minimum layout distance.
 * @property {number} rejected Candidates rejected in the current slot.
 * @property {PuzzleCandidate | null} best Farthest valid candidate of the current slot.
 * @property {number} bestDistance `-Infinity` until a valid candidate is seen.
 * @property {Record<FailReason, number>} failCounts Failures of the current slot.
 * @property {PuzzleCandidate[]} accepted
 * @property {Set<string>} seenLayouts
 * @property {Set<string>} seenClues
 * @property {ReadonlySet<string>} initialSeenLayouts
 * @property {ReadonlySet<string>} initialSeenClues
 * @property {number} quantity
 * @property {number} preferred Starting distance preference of every slot.
 * @property {import('./types.js').Board} board
 * @property {import('./types.js').Piece[]} pieces
 */

const FAIL_ORDER = /** @type {const} */ (['layout', 'not-in-band', 'uniqueness-not-proved']);
const PARTIAL_REASON = /** @type {const} */ ({
  layout: 'layouts-not-found',
  'not-in-band': 'difficulty-not-found',
  'uniqueness-not-proved': 'uniqueness-not-proved',
});
const MACRO_MIN_MEAN = 6.5;
const RESTART_MAX_AREA = BUDGETS.restartMaxArea;
const MIN_DISTANCE = 2;

/** Control errors: invalid requests, not failed searches. `code` is `history-full`. */
export class GenerationError extends Error {
  /**
   * @param {'history-full'} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'GenerationError';
    this.code = code;
  }
}

/**
 * One piece-set attempt. Streams: root `set/<attempt>` chooses K; macro, flat
 * and calibration search use its derived `macro`, `flat` and `cal` streams.
 * The display rotation never enters a label. Throws RangeError when the level
 * is not offered for the board.
 * @param {SetRequest} req
 * @param {number} attempt
 * @returns {SetAttemptResult}
 */
export function setAttempt(req, attempt) {
  if (!Number.isInteger(attempt) || attempt < 0) {
    throw new RangeError('attempt must be a nonnegative integer');
  }
  const { board } = req;
  const area = activeCount(board);
  const rng = createRng(normalizeSeedText(req.seedText), `set/${attempt}`);
  const ks = pieceCountRange(req.levelId, area);
  if (ks === null || ks.length === 0) {
    throw new RangeError(`level ${req.levelId} is not offered for ${area} cells`);
  }
  const k = ks[rng.int(ks.length)];
  /** @type {{ regions: number[][], regionOf?: number[] } | null} */
  let carved = null;
  if (area / k >= MACRO_MIN_MEAN) {
    carved = carveMacro(board, k, rng.derive('macro'), BUDGETS);
  }
  if (carved === null) {
    carved = carveFlatSet(board, k, rng.derive('flat'), BUDGETS);
  }
  if (carved === null) {
    return { ok: false, reason: 'carve' };
  }
  const set = finalizeSet(board, carved.regions, carved.regionOf ?? null);
  const witness = /** @type {Pose[]} */ (set.witness);
  if (validateSet(set).length > 0) {
    return { ok: false, reason: 'internal' };
  }
  const cal = selectClues({
    board,
    pieces: set.pieces,
    layout: witness,
    target: level(req.levelId),
    rng: rng.derive('cal'),
    uniqueness: req.uniqueness,
    excludeClueKeys: new Set(),
    ws: req.execution.main,
  });
  if (!cal.ok) {
    return { ok: false, reason: cal.reason };
  }
  return {
    ok: true,
    set,
    calibration: {
      id: puzzleId(board, set.pieces, cal.clues),
      clues: cal.clues,
      solution: witness,
      rating: cal.rating,
      certificate: cal.certificate,
    },
    attempt,
  };
}

/**
 * Lowest successful set attempt, trying attempts 0 .. `maxAttempts - 1` in
 * order (the serial equivalent of the pool's lowest-j rule).
 * @param {SetRequest} req
 * @param {number} [maxAttempts]
 * @returns {{ result: SetAttemptResult & { ok: true } | null, failures: string[] }}
 */
export function firstSetAttempt(req, maxAttempts = 32) {
  /** @type {string[]} */
  const failures = [];
  for (let j = 0; j < maxAttempts; j += 1) {
    const r = setAttempt(req, j);
    if (r.ok) {
      return { result: r, failures };
    }
    failures.push(r.reason);
  }
  return { result: null, failures };
}

/**
 * One puzzle candidate for `(slot, attempt)`; the context history is the
 * frozen request-start snapshot. Streams: root `slot/<slot>/<attempt>` with
 * `restart`, `walk` and `clues` children. The walk starts from the set's
 * witness (or a random tiling on attempts 2, 5, 8, ... of boards of at most 150
 * cells); a set without a witness can only start from a random tiling.
 * @param {BatchContext} ctx
 * @param {number} slot One-based.
 * @param {number} attempt Zero-based.
 * @returns {PuzzleCandidate | CandidateFailure}
 */
export function puzzleCandidate(ctx, slot, attempt) {
  const { set } = ctx;
  const { board, pieces } = set;
  const { main, scratch } = ctx.execution;
  const rng = createRng(ctx.batchSeed, `slot/${slot}/${attempt}`);
  const small = activeCount(board) <= RESTART_MAX_AREA;
  let start = set.witness;
  if (small && (attempt % 3 === 2 || start === null)) {
    start = randomTiling(board, pieces, rng.derive('restart'), scratch, {
      totalRowTrials: BUDGETS.tilingTotal,
      restartBase: BUDGETS.restartBase,
    }) ?? start;
  }
  if (start === null) {
    return { fail: 'layout' };
  }
  const layout = lnsWalk(set, start, rng.derive('walk'), scratch, BUDGETS.lnsSteps);
  const key = layoutKey(board, pieces, layout);
  if (ctx.seenLayouts.has(key)) {
    return { fail: 'layout' };
  }
  const sel = selectClues({
    board,
    pieces,
    layout,
    target: level(ctx.targetLevelId),
    rng: rng.derive('clues'),
    uniqueness: ctx.uniqueness,
    excludeClueKeys: ctx.seenClues,
    ws: main,
  });
  if (!sel.ok) {
    return { fail: sel.reason };
  }
  return {
    layout,
    layoutKey: key,
    clueKey: clueKey(board, pieces, sel.clues),
    clues: sel.clues,
    rating: sel.rating,
    certificate: sel.certificate,
  };
}

/**
 * Candidate for one known layout of the completion pass: no walk; only clue selection draws from
 * the stream `completion/<layout key>` of the batch seed. Otherwise the `puzzleCandidate` pipeline.
 * `ctx` carries the history as of the end of the fold.
 * @param {BatchContext} ctx
 * @param {Pose[]} layout A complete layout of the context's set.
 * @returns {PuzzleCandidate | CandidateFailure}
 */
export function completionCandidate(ctx, layout) {
  const { board, pieces } = ctx.set;
  const key = layoutKey(board, pieces, layout);
  if (ctx.seenLayouts.has(key)) {
    return { fail: 'layout' };
  }
  const rng = createRng(ctx.batchSeed, `completion/${key}`);
  const sel = selectClues({
    board,
    pieces,
    layout,
    target: level(ctx.targetLevelId),
    rng: rng.derive('clues'),
    uniqueness: ctx.uniqueness,
    excludeClueKeys: ctx.seenClues,
    ws: ctx.execution.main,
  });
  if (!sel.ok) {
    return { fail: sel.reason };
  }
  return {
    layout,
    layoutKey: key,
    clueKey: clueKey(board, pieces, sel.clues),
    clues: sel.clues,
    rating: sel.rating,
    certificate: sel.certificate,
  };
}

/**
 * @param {BatchContext} ctx
 * @param {FoldState} s
 * @returns {BatchContext}
 */
export function completionContext(ctx, s) {
  return { ...ctx, seenLayouts: frozenCopy(s.seenLayouts), seenClues: frozenCopy(s.seenClues) };
}

/**
 * Feeds one completion candidate (in layout-key order) to a fold that stopped short. Accepted when
 * both keys are new; the fold's distance preference does not apply here.
 * @param {FoldState} s
 * @param {PuzzleCandidate | CandidateFailure} c
 * @returns {{ state: FoldState, failed: FailReason | null }}
 */
export function completionAccept(s, c) {
  if ('fail' in c) {
    return { state: s, failed: c.fail };
  }
  if (s.seenLayouts.has(c.layoutKey) || s.seenClues.has(c.clueKey)) {
    return { state: s, failed: 'layout' };
  }
  const next = withAccepted(s, c);
  return { state: next.status === 'complete' ? next : { ...next, status: 'partial', reason: s.reason }, failed: null };
}

/**
 * Serial reference run of the completion pass over `layouts` (sorted by key), equivalent to the
 * pool-driven pass.
 * @param {BatchContext} ctx
 * @param {FoldState} s A partial fold state.
 * @param {Pose[][]} layouts
 * @param {(c: BatchContext, layout: Pose[]) => PuzzleCandidate | CandidateFailure} [candidate]
 * @returns {{ state: FoldState, tried: number, failures: Record<FailReason, number> }}
 */
export function runCompletion(ctx, s, layouts, candidate = completionCandidate) {
  const frozen = completionContext(ctx, s);
  const failures = zeroFailures();
  let state = s;
  let tried = 0;
  for (const layout of layouts) {
    if (state.accepted.length >= state.quantity) {
      break;
    }
    tried += 1;
    const next = completionAccept(state, candidate(frozen, layout));
    state = next.state;
    if (next.failed !== null) {
      failures[next.failed] += 1;
    }
  }
  return { state, tried, failures };
}

/**
 * Lazy raw proof status of an accepted puzzle's clues, in the main workspace.
 * It never changes which puzzles were accepted.
 * @param {BatchContext} ctx
 * @param {Pose[]} clues
 * @returns {Certificate}
 */
export function certifyTask(ctx, clues) {
  const { board, pieces } = ctx.set;
  return certify(board, pieces, clues, ctx.execution.main, countRowLimit(board));
}

/**
 * @param {ReadonlySet<string>} source
 * @returns {ReadonlySet<string>}
 */
function frozenCopy(source) {
  const copy = new Set(source);
  const refuse = () => {
    throw new TypeError('the request-start history is frozen');
  };
  Object.defineProperties(copy, {
    add: { value: refuse },
    delete: { value: refuse },
    clear: { value: refuse },
  });
  return Object.freeze(copy);
}

/**
 * Matching calibration puzzle as a candidate, or null: its rating must show the
 * target level, `require` mode needs a unique certificate, and both keys must
 * be unseen.
 * @param {BatchContext} ctx
 * @returns {PuzzleCandidate | null}
 */
function calibrationCandidate(ctx) {
  const cal = ctx.calibration;
  if (cal === undefined || cal.rating === null || cal.rating.level !== ctx.targetLevelId) {
    return null;
  }
  if (ctx.uniqueness === 'require' && cal.certificate?.status !== 'unique') {
    return null;
  }
  const { board, pieces } = ctx.set;
  const layout = cal.solution ?? ctx.set.witness;
  if (layout === null) {
    return null;
  }
  const candidate = {
    layout,
    layoutKey: layoutKey(board, pieces, layout),
    clueKey: clueKey(board, pieces, cal.clues),
    clues: cal.clues,
    rating: cal.rating,
    certificate: cal.certificate,
  };
  return ctx.seenLayouts.has(candidate.layoutKey) || ctx.seenClues.has(candidate.clueKey) ? null : candidate;
}

/**
 * @returns {Record<FailReason, number>}
 */
function zeroFailures() {
  return { layout: 0, 'not-in-band': 0, 'uniqueness-not-proved': 0 };
}

/**
 * Starts the fold. Validates the request, reuses a matching unseen calibration
 * puzzle as slot 1 and freezes the request-start history. Throws RangeError for
 * a quantity outside 1..10 and `GenerationError('history-full')` when either
 * seen-key set cannot take `quantity` more entries; that check happens before
 * any dispatch and never evicts identities.
 * @param {BatchContext} ctx
 * @returns {FoldState}
 */
export function foldStart(ctx) {
  const { quantity } = ctx;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new RangeError('quantity must be an integer from 1 to 10');
  }
  level(ctx.targetLevelId);
  const room = BUDGETS.historyKeys - Math.max(ctx.seenLayouts.size, ctx.seenClues.size);
  if (room < quantity) {
    throw new GenerationError('history-full', `The history holds ${BUDGETS.historyKeys} keys and has room for ${Math.max(room, 0)} more puzzles, `
      + `fewer than the ${quantity} requested. Reset the history or request fewer.`);
  }
  const { board, pieces } = ctx.set;
  const seenLayouts = new Set(ctx.seenLayouts);
  const seenClues = new Set(ctx.seenClues);
  /** @type {PuzzleCandidate[]} */
  const accepted = [];
  const calibration = calibrationCandidate(ctx);
  if (calibration !== null) {
    accepted.push(calibration);
    seenLayouts.add(calibration.layoutKey);
    seenClues.add(calibration.clueKey);
  }
  const preferred = Math.min(10, Math.max(3, Math.ceil(pieces.length / 4)));
  return {
    status: accepted.length >= quantity ? 'complete' : 'running',
    slot: accepted.length + 1,
    attempt: 0,
    distance: preferred,
    rejected: 0,
    best: null,
    bestDistance: -Infinity,
    failCounts: zeroFailures(),
    accepted,
    seenLayouts,
    seenClues,
    initialSeenLayouts: frozenCopy(seenLayouts),
    initialSeenClues: frozenCopy(seenClues),
    quantity,
    preferred,
    board,
    pieces,
  };
}

/**
 * The original context with the fold's frozen request-start history.
 * @param {BatchContext} ctx
 * @param {FoldState} s
 * @returns {BatchContext}
 */
export function candidateContext(ctx, s) {
  return { ...ctx, seenLayouts: s.initialSeenLayouts, seenClues: s.initialSeenClues };
}

/**
 * The next candidate the fold consumes, or null once it is complete or partial.
 * @param {FoldState} s
 * @returns {{ slot: number, attempt: number } | null}
 */
export function foldNext(s) {
  return s.status === 'running' ? { slot: s.slot, attempt: s.attempt } : null;
}

/**
 * @param {Record<FailReason, number>} counts
 * @returns {PartialReason}
 */
function partialReason(counts) {
  let top = FAIL_ORDER[0];
  for (const reason of FAIL_ORDER) {
    if (counts[reason] > counts[top]) {
      top = reason;
    }
  }
  return PARTIAL_REASON[top];
}

/**
 * @param {FoldState} s
 * @param {PuzzleCandidate} c
 * @returns {FoldState}
 */
function withAccepted(s, c) {
  const accepted = [...s.accepted, c];
  return {
    ...s,
    status: accepted.length >= s.quantity ? 'complete' : 'running',
    slot: accepted.length + 1,
    attempt: 0,
    distance: s.preferred,
    rejected: 0,
    best: null,
    bestDistance: -Infinity,
    failCounts: zeroFailures(),
    accepted,
    seenLayouts: new Set([...s.seenLayouts, c.layoutKey]),
    seenClues: new Set([...s.seenClues, c.clueKey]),
  };
}

/**
 * Feeds the result of candidate `(s.slot, s.attempt)` to the fold and returns
 * the next state. A candidate is valid only when its layout key and clue key
 * are both new to the fold's own growing history, so conflicts with earlier
 * slots are caught here, in slot order. Throws RangeError for an unknown
 * failure name; a state that is no longer running is returned unchanged.
 * @param {FoldState} s
 * @param {PuzzleCandidate | { fail: string }} c
 * @returns {FoldState}
 */
export function foldAccept(s, c) {
  if (s.status !== 'running') {
    return s;
  }
  /** @type {Record<FailReason, number>} */
  const failCounts = { ...s.failCounts };
  let { best, bestDistance, distance, rejected } = s;
  if ('fail' in c) {
    if (!FAIL_ORDER.includes(/** @type {FailReason} */ (c.fail))) {
      throw new RangeError(`unknown candidate failure: ${c.fail}`);
    }
    failCounts[/** @type {FailReason} */ (c.fail)] += 1;
  } else if (s.seenLayouts.has(c.layoutKey) || s.seenClues.has(c.clueKey)) {
    failCounts.layout += 1;
  } else {
    const dist = minLayoutDistance(s.board, s.pieces, c.layout, s.accepted.map((p) => p.layout));
    if (dist >= distance) {
      return withAccepted(s, c);
    }
    if (dist > bestDistance) {
      best = c;
      bestDistance = dist;
    }
  }
  rejected += 1;
  if (rejected % 4 === 0) {
    distance = Math.max(MIN_DISTANCE, distance - 1);
  }
  const attempt = s.attempt + 1;
  if (attempt < BUDGETS.slotAttempts) {
    return { ...s, attempt, distance, rejected, best, bestDistance, failCounts };
  }
  if (best !== null) {
    return withAccepted(s, best);
  }
  return {
    ...s,
    status: 'partial',
    reason: partialReason(failCounts),
    attempt,
    distance,
    rejected,
    best,
    bestDistance,
    failCounts,
  };
}

/**
 * Next candidates a scheduler should start, at most `limit`, skipping those it
 * already has (in flight or cached). Priority: the awaited attempt, attempt 0 of
 * later unfilled slots ascending, further attempts of the current slot, then
 * retries of later slots. This orders dispatch only; the fold still consumes in
 * (slot, attempt) order.
 * @param {FoldState} s
 * @param {(slot: number, attempt: number) => boolean} have
 * @param {number} limit
 * @returns {{ slot: number, attempt: number }[]}
 */
export function dispatchOrder(s, have, limit) {
  /** @type {{ slot: number, attempt: number }[]} */
  const out = [];
  if (s.status !== 'running') {
    return out;
  }
  const attempts = BUDGETS.slotAttempts;
  /**
   * @param {number} slot
   * @param {number} attempt
   */
  const offer = (slot, attempt) => {
    if (out.length < limit && !have(slot, attempt)) {
      out.push({ slot, attempt });
    }
  };
  offer(s.slot, s.attempt);
  for (let slot = s.slot + 1; slot <= s.quantity; slot += 1) {
    offer(slot, 0);
  }
  for (let attempt = s.attempt + 1; attempt < attempts; attempt += 1) {
    offer(s.slot, attempt);
  }
  for (let slot = s.slot + 1; slot <= s.quantity; slot += 1) {
    for (let attempt = 1; attempt < attempts; attempt += 1) {
      offer(slot, attempt);
    }
  }
  return out;
}

/**
 * Serial reference run of the whole fold: candidates computed one by one in
 * fold order from the frozen request-start history. `candidate` defaults to
 * `puzzleCandidate`.
 * @param {BatchContext} ctx
 * @param {(c: BatchContext, slot: number, attempt: number) => PuzzleCandidate | CandidateFailure} [candidate]
 * @returns {FoldState}
 */
export function runFold(ctx, candidate = puzzleCandidate) {
  let s = foldStart(ctx);
  const frozen = candidateContext(ctx, s);
  for (let next = foldNext(s); next !== null; next = foldNext(s)) {
    s = foldAccept(s, candidate(frozen, next.slot, next.attempt));
  }
  return s;
}
