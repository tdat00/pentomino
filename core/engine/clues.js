// @ts-check
// Clue selection and proof-status certificates (design §6.10–§6.11). A puzzle
// is a subset of its witness layout: count-guided sampling first, then a small
// beam search over add/remove/swap moves, never more than 64 rated subsets.
// Required uniqueness is repaired counterexample by counterexample and is only
// reported after an exhaustive count; cutoffs never become proofs.

import { activeCount } from './board.js';
import { inBand, rate } from './difficulty.js';
import { poseCells } from './geometry.js';
import { clueKey } from './keys.js';
import { BUDGETS } from './policy.js';
import { buildModel, countSolutions, isValidLayout } from './tiling.js';

/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Rating} Rating */
/** @typedef {import('./types.js').Certificate} Certificate */
/** @typedef {import('./levels.js').Level} Level */
/** @typedef {import('./rng.js').Rng} Rng */
/** @typedef {import('./workspace.js').Workspace} Workspace */

/**
 * `onRate` observes every search rating (diagnostics and tests; it must not mutate its arguments).
 * @typedef {object} SelectContext
 * @property {Board} board
 * @property {Piece[]} pieces
 * @property {Pose[]} layout Complete valid witness layout.
 * @property {Pick<Level, 'min' | 'max' | 'share'>} target
 * @property {Rng} rng
 * @property {'any' | 'require'} uniqueness
 * @property {ReadonlySet<string>} excludeClueKeys
 * @property {Workspace} ws
 * @property {(clues: Pose[], rating: Rating) => void} [onRate]
 */

/**
 * @typedef {{ ok: true, clues: Pose[], rating: Rating, certificate: Certificate | null }
 *   | { ok: false, reason: 'not-in-band' | 'uniqueness-not-proved' }} SelectResult
 */

/**
 * @typedef {object} Candidate
 * @property {number[]} idx Ascending layout positions of the clued pieces.
 * @property {Pose[]} clues
 * @property {Rating} rating
 * @property {string} key Symmetry-aware clue key.
 */

const BEAM_WIDTH = 4;
const SAMPLES_PER_COUNT = 4;
const COUNT_CHANGES = 8;
const MOVES_PER_MEMBER = 8;
const SMALL_AREA = 200;

/**
 * Row limit of a raw uniqueness count: 10,000 up to 200 active cells, else 2,000.
 * @param {Board} board
 * @returns {number}
 */
export function countRowLimit(board) {
  return activeCount(board) <= SMALL_AREA ? BUDGETS.countRowsSmall : BUDGETS.countRowsLarge;
}

/**
 * Raw proof status of a clue set: no board-symmetry quotient, at most two
 * solutions, at most `rowLimit` row trials.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} clues
 * @param {Workspace} ws
 * @param {number} rowLimit
 * @returns {Certificate}
 */
export function certify(board, pieces, clues, ws, rowLimit) {
  const model = buildModel(board, pieces, clues, ws);
  const c = countSolutions(model, { cap: 2, rowTrialLimit: rowLimit, witnessLimit: 0 });
  /** @type {Certificate['status']} */
  let status = 'not-proved';
  if (c.found >= 2) {
    status = 'multiple';
  } else if (c.exhausted) {
    status = c.found === 1 ? 'unique' : 'unsatisfiable';
  }
  return { status, model: 'dlx-v1', rowLimit, verified: true };
}

/**
 * @param {Piece} piece
 * @param {Pose} pose
 * @returns {string}
 */
function footprint(piece, pose) {
  return poseCells(piece, pose).map(([x, y]) => y * 65536 + x).sort((a, b) => a - b).join(',');
}

/**
 * Counterexample-guided repair: while two raw completions exist, clue the
 * smallest planted piece whose footprint differs in another solution. Returns
 * the clues (the given ones first, then the added ones) once one completion
 * exists and the search was exhaustive; null when that cannot be proved.
 * @param {Board} board
 * @param {Piece[]} pieces
 * @param {Pose[]} layout
 * @param {Pose[]} clues
 * @param {Rng} rng
 * @param {Workspace} ws
 * @param {number} rowLimit
 * @returns {Pose[] | null}
 */
export function makeUnique(board, pieces, layout, clues, rng, ws, rowLimit) {
  const byId = new Map(pieces.map((p) => [p.id, p]));
  const planted = new Map(layout.map((pose) => [pose.piece, pose]));
  const maxClues = pieces.length - 2;
  let current = clues.slice();
  while (current.length <= maxClues) {
    const model = buildModel(board, pieces, current, ws);
    const c = countSolutions(model, { cap: 2, rowTrialLimit: rowLimit, witnessLimit: 2 });
    if (c.found === 1 && c.exhausted) {
      return current;
    }
    if (c.found < 2) {
      return null;
    }
    const clued = new Set(current.map((p) => p.piece));
    const other = c.witnesses.find((w) => w.some((pose) => {
      const piece = /** @type {Piece} */ (byId.get(pose.piece));
      return footprint(piece, pose) !== footprint(piece, /** @type {Pose} */ (planted.get(pose.piece)));
    }));
    if (other === undefined) {
      return null;
    }
    /** @type {Piece[]} */
    const differing = [];
    for (const pose of other) {
      const piece = /** @type {Piece} */ (byId.get(pose.piece));
      if (!clued.has(pose.piece)
        && footprint(piece, pose) !== footprint(piece, /** @type {Pose} */ (planted.get(pose.piece)))) {
        differing.push(piece);
      }
    }
    if (differing.length === 0) {
      return null;
    }
    const smallest = Math.min(...differing.map((p) => p.cells.length));
    const ties = differing.filter((p) => p.cells.length === smallest);
    const chosen = ties.length === 1 ? ties[0] : rng.pick(ties);
    current = [...current, /** @type {Pose} */ (planted.get(chosen.id))];
  }
  return null;
}

/**
 * @param {Pick<Level, 'min' | 'max'>} target
 * @param {Rating} r
 * @returns {number} 0 inside the band, else the distance to the nearest in-band score.
 */
function bandDistance(target, r) {
  if (r.score < target.min) {
    return target.min - r.score;
  }
  return r.score >= target.max ? r.score - target.max + 1 : 0;
}

/**
 * @param {Pick<Level, 'min' | 'max'>} target
 * @param {Candidate[]} list
 * @returns {Candidate[]}
 */
function ranked(target, list) {
  const center = (target.min + target.max) / 2;
  return list.slice().sort((a, b) => bandDistance(target, a.rating) - bandDistance(target, b.rating)
    || Math.abs(a.rating.score - center) - Math.abs(b.rating.score - center)
    || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/**
 * Selects the starting pieces: a subset of the witness whose measured score
 * lies in the target band. Throws RangeError for fewer than three pieces or a
 * layout that is not a complete valid arrangement.
 * @param {SelectContext} ctx
 * @returns {SelectResult}
 */
export function selectClues(ctx) {
  const { board, pieces, layout, target, rng, uniqueness, excludeClueKeys, ws, onRate } = ctx;
  const K = pieces.length;
  if (K < 3) {
    throw new RangeError('clue selection needs at least three pieces');
  }
  if (!isValidLayout(board, pieces, layout)) {
    throw new RangeError('layout is not a complete valid arrangement of the pieces');
  }
  const limit = BUDGETS.clueSubsets;
  const rowLimit = countRowLimit(board);
  /** @type {Set<string>} */
  const tried = new Set();
  /** @type {Candidate[]} */
  const rated = [];
  let profiles = 0;
  let unproved = false;

  /**
   * @param {number[]} idx
   * @returns {Candidate | null} null when skipped: repeated, excluded or out of budget.
   */
  const rateSubset = (idx) => {
    const id = idx.join(',');
    if (profiles >= limit || tried.has(id)) {
      return null;
    }
    tried.add(id);
    const clues = idx.map((i) => layout[i]);
    const key = clueKey(board, pieces, clues);
    if (excludeClueKeys.has(key)) {
      return null;
    }
    const rating = rate(board, pieces, clues, ws);
    profiles += 1;
    if (onRate !== undefined) {
      onRate(clues, rating);
    }
    const candidate = { idx, clues, rating, key };
    rated.push(candidate);
    return candidate;
  };

  /**
   * @param {Candidate} c In-band candidate.
   * @returns {SelectResult | null}
   */
  const finish = (c) => {
    if (uniqueness === 'any') {
      return { ok: true, clues: c.clues, rating: c.rating, certificate: null };
    }
    const repaired = makeUnique(board, pieces, layout, c.clues, rng, ws, rowLimit);
    if (repaired === null) {
      unproved = true;
      return null;
    }
    // Repair re-rates only a changed clue set; that rating is not a search profile.
    const clues = repaired.length === c.clues.length ? c.clues : sortLike(layout, repaired);
    const rating = repaired.length === c.clues.length ? c.rating : rate(board, pieces, clues, ws);
    if (!inBand(rating, target)) {
      return null;
    }
    return { ok: true, clues, rating, certificate: { status: 'unique', model: 'dlx-v1', rowLimit, verified: true } };
  };

  /**
   * @param {number} count
   * @returns {number[]}
   */
  const sample = (count) => rng.shuffle(layout.map((_, i) => i)).slice(0, count).sort((a, b) => a - b);

  /**
   * @param {Candidate | null} c
   * @returns {SelectResult | null}
   */
  const accept = (c) => (c !== null && inBand(c.rating, target) ? finish(c) : null);

  let count = Math.min(K - 2, Math.max(1, Math.round(target.share * K)));
  const startCount = count;
  const countsTried = new Set();
  for (let step = 0; step < COUNT_CHANGES; step += 1) {
    countsTried.add(count);
    let below = 0;
    let above = 0;
    for (let attempt = 0; attempt < SAMPLES_PER_COUNT; attempt += 1) {
      const c = rateSubset(sample(count));
      if (c === null) {
        continue;
      }
      const done = accept(c);
      if (done !== null) {
        return done;
      }
      if (c.rating.score < target.min) {
        below += 1;
      } else if (c.rating.score >= target.max) {
        above += 1;
      }
    }
    if (below > 0 && above === 0) {
      count -= 1;
    } else if (above > 0 && below === 0) {
      count += 1;
    } else {
      break;
    }
    if (count < 1 || count > K - 2 || countsTried.has(count)) {
      break;
    }
  }

  // Phase 2: when every phase-1 sample was skipped, seed the beam afresh.
  for (let attempt = 0; rated.length === 0 && attempt < 4 * SAMPLES_PER_COUNT; attempt += 1) {
    const done = accept(rateSubset(sample(startCount)));
    if (done !== null) {
      return done;
    }
  }

  /**
   * Up to `MOVES_PER_MEMBER` unseen neighbours: add, remove or swap one clue,
   * leaning towards the side of the band the member is on.
   * @param {Candidate} member
   * @returns {number[][]}
   */
  const neighbours = (member) => {
    const inSet = new Set(member.idx);
    const outside = layout.map((_, i) => i).filter((i) => !inSet.has(i));
    const size = member.idx.length;
    const options = ['swap'];
    const lean = member.rating.score < target.min ? ['remove'] : member.rating.score >= target.max ? ['add'] : ['add', 'remove'];
    for (const kind of lean) {
      if ((kind === 'add' && size + 1 <= K - 2) || (kind === 'remove' && size - 1 >= 1)) {
        options.push(kind, kind);
      }
    }
    /** @type {number[][]} */
    const out = [];
    const local = new Set();
    for (let attempt = 0; attempt < 4 * MOVES_PER_MEMBER && out.length < MOVES_PER_MEMBER; attempt += 1) {
      const kind = rng.pick(options);
      const next = member.idx.slice();
      if (kind === 'add') {
        next.push(rng.pick(outside));
      } else if (kind === 'remove') {
        next.splice(rng.int(size), 1);
      } else {
        if (outside.length === 0) {
          continue;
        }
        next[rng.int(size)] = rng.pick(outside);
      }
      next.sort((a, b) => a - b);
      const id = next.join(',');
      if (!tried.has(id) && !local.has(id)) {
        local.add(id);
        out.push(next);
      }
    }
    return out;
  };

  let beam = ranked(target, rated).slice(0, BEAM_WIDTH);
  while (profiles < limit && beam.length > 0) {
    /** @type {Candidate[]} */
    const fresh = [];
    for (const member of beam) {
      for (const idx of neighbours(member)) {
        const c = rateSubset(idx);
        if (c === null) {
          continue;
        }
        const done = accept(c);
        if (done !== null) {
          return done;
        }
        fresh.push(c);
      }
    }
    if (fresh.length === 0) {
      break;
    }
    beam = ranked(target, [...beam, ...fresh]).slice(0, BEAM_WIDTH);
  }
  return { ok: false, reason: unproved ? 'uniqueness-not-proved' : 'not-in-band' };
}

/**
 * Clues in layout order.
 * @param {Pose[]} layout
 * @param {Pose[]} clues
 * @returns {Pose[]}
 */
function sortLike(layout, clues) {
  const wanted = new Set(clues.map((c) => c.piece));
  return layout.filter((p) => wanted.has(p.piece));
}
