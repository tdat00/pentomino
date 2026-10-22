// @ts-check
// Proven hints and reveal (design section 11.13, D27). Every positive statement
// comes with a complete layout that this module re-validates itself: a
// compatible layout proves that one more piece can be placed, a layout that
// exists after removing one placed piece proves a repair. An inconclusive or
// capped search never blames or suggests anything. The search itself is injected
// (`solve`), so the browser runs it in a worker through the `solveFirst` task and
// tests run it with any independent oracle; nothing here searches.

import { poseCells } from './geometry.js';
import { BUDGETS } from './policy.js';

/** @typedef {import('./types.js').Board} Board */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./game.js').MoveCommand} MoveCommand */

/**
 * @typedef {{ kind: 'place', pose: Pose, proof: 'compatible-layout', layout: Pose[] }
 *   | { kind: 'remove', piece: string, proof: 'repairing-layout', layout: Pose[] }
 *   | { kind: 'unknown', message: typeof HINT_UNKNOWN_MESSAGE }} HintResult
 * `layout` is the validated complete layout that proves a positive result.
 */

/**
 * What an injected search returns: the same fields as `solveFirst`. `layout` is
 * null when none was found; `exhausted` is true only for a complete search, so
 * a null layout with `exhausted` proves that no solution exists.
 * @typedef {{ layout: Pose[] | null, exhausted: boolean }} SolveReply
 */

/** @typedef {(fixed: Pose[]) => Promise<SolveReply> | SolveReply} Solver */

export const HINT_UNKNOWN_MESSAGE = 'No repair identified within this check.';

/** Per-query work cap of hints: the rating row budget (not a change to the score's own caps). */
export const HINT_ROW_LIMIT = BUDGETS.rateRows;

/**
 * Cell indices of every pose, or null when a pose is malformed, names an
 * unknown or repeated piece, leaves the board, covers a blocked cell or overlaps
 * another pose. `cells` has one sorted array per piece.
 * @param {Board} board
 * @param {readonly Piece[]} pieces
 * @param {readonly Pose[]} poses
 * @returns {Map<string, number[]> | null}
 */
function footprints(board, pieces, poses) {
  if (!Array.isArray(poses) || !Array.isArray(pieces)) {
    return null;
  }
  const byId = new Map(pieces.map((piece) => [piece.id, piece]));
  /** @type {Map<string, number[]>} */
  const cells = new Map();
  const taken = new Set();
  for (const pose of poses) {
    const piece = typeof pose === 'object' && pose !== null ? byId.get(pose.piece) : undefined;
    if (piece === undefined || cells.has(pose.piece) || !Number.isInteger(pose.x) || !Number.isInteger(pose.y)
      || !Number.isInteger(pose.turn) || pose.turn < 0 || pose.turn > 3 || typeof pose.mirrored !== 'boolean') {
      return null;
    }
    /** @type {number[]} */
    const own = [];
    for (const [x, y] of poseCells(piece, pose)) {
      if (x < 0 || y < 0 || x >= board.width || y >= board.height || board.active[y * board.width + x] !== 1) {
        return null;
      }
      const at = y * board.width + x;
      if (taken.has(at)) {
        return null;
      }
      taken.add(at);
      own.push(at);
    }
    cells.set(pose.piece, own.sort((a, b) => a - b));
  }
  return cells;
}

/**
 * @param {Board} board
 * @returns {number}
 */
function activeCount(board) {
  let n = 0;
  for (let i = 0; i < board.active.length; i += 1) {
    n += board.active[i] === 1 ? 1 : 0;
  }
  return n;
}

/**
 * @param {Pose} pose
 * @returns {Pose}
 */
function copyPose(pose) {
  return { piece: pose.piece, x: pose.x, y: pose.y, turn: pose.turn, mirrored: pose.mirrored };
}

/**
 * Whether `solution` is a complete exact cover that places every fixed piece on
 * exactly the cells it already occupies. Compared by occupied cells, so a
 * symmetric piece posed differently still agrees.
 * @param {Board} board
 * @param {readonly Piece[]} pieces
 * @param {readonly Pose[]} fixed Clues and current placements.
 * @param {readonly Pose[] | null | undefined} solution
 * @returns {Pose[] | null} A copy of the solution when it is compatible.
 */
export function compatibleStoredLayout(board, pieces, fixed, solution) {
  if (!Array.isArray(solution) || solution.length !== pieces.length) {
    return null;
  }
  const answer = footprints(board, pieces, solution);
  const current = footprints(board, pieces, fixed);
  if (answer === null || current === null || answer.size !== pieces.length) {
    return null;
  }
  let total = 0;
  for (const own of answer.values()) {
    total += own.length;
  }
  if (total !== activeCount(board)) {
    return null;
  }
  for (const [id, own] of current) {
    const theirs = answer.get(id);
    if (theirs === undefined || theirs.length !== own.length || theirs.some((at, i) => at !== own[i])) {
      return null;
    }
  }
  return solution.map(copyPose);
}

/**
 * The next piece to show from a compatible answer: the unplaced piece that
 * touches the most occupied, blocked or border cells (side neighbours), ties
 * broken by the smaller piece ID. Only pieces missing from `fixed` qualify.
 * @param {Board} board
 * @param {readonly Piece[]} pieces
 * @param {readonly Pose[]} fixed
 * @param {readonly Pose[]} solution
 * @returns {Pose | null} Null when the answer is not compatible or nothing is left to place.
 */
export function chooseHintPlacement(board, pieces, fixed, solution) {
  const layout = compatibleStoredLayout(board, pieces, fixed, solution);
  const current = footprints(board, pieces, fixed);
  if (layout === null || current === null) {
    return null;
  }
  const occupied = new Set();
  for (const own of current.values()) {
    for (const at of own) {
      occupied.add(at);
    }
  }
  const byId = new Map(pieces.map((piece) => [piece.id, piece]));
  /** @type {{ pose: Pose, score: number } | null} */
  let best = null;
  for (const pose of layout) {
    if (current.has(pose.piece)) {
      continue;
    }
    const piece = /** @type {Piece} */ (byId.get(pose.piece));
    const own = new Set();
    for (const [x, y] of poseCells(piece, pose)) {
      own.add(y * board.width + x);
    }
    let score = 0;
    for (const at of own) {
      const x = at % board.width;
      const y = Math.floor(at / board.width);
      for (const [dx, dy] of /** @type {const} */ ([[1, 0], [-1, 0], [0, 1], [0, -1]])) {
        const nx = x + dx;
        const ny = y + dy;
        const inside = nx >= 0 && ny >= 0 && nx < board.width && ny < board.height;
        const neighbour = ny * board.width + nx;
        if (!inside || board.active[neighbour] !== 1 || (!own.has(neighbour) && occupied.has(neighbour))) {
          score += 1;
        }
      }
    }
    if (best === null || score > best.score || (score === best.score && pose.piece < best.pose.piece)) {
      best = { pose, score };
    }
  }
  return best === null ? null : copyPose(best.pose);
}

/**
 * Every currently placed movable piece exactly once, the most recently moved
 * first. A piece whose move is not in the retained history (older than the
 * history cap, or restored from a save) follows in canonical ID order. There is
 * deliberately no cutoff: a search only skips candidates by finishing them.
 * @param {ReadonlyMap<string, Pose>} placed
 * @param {readonly MoveCommand[]} history Oldest first; the last command is the newest.
 * @returns {string[]}
 */
export function repairCandidates(placed, history) {
  /** @type {string[]} */
  const order = [];
  const seen = new Set();
  /** @param {string} id */
  const add = (id) => {
    if (placed.has(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  };
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const cmd = history[i];
    if (cmd.kind === 'piece') {
      add(cmd.piece);
    }
  }
  const rest = [...placed.keys()].filter((id) => !seen.has(id)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  rest.forEach(add);
  return order;
}

/**
 * @typedef {object} CompatibleRequest
 * @property {Board} board
 * @property {readonly Piece[]} pieces
 * @property {readonly Pose[]} fixed Clues plus every current placement.
 * @property {readonly Pose[] | null | undefined} [solution] Stored answer, if the puzzle has one.
 * @property {Solver} solve
 */

/**
 * @typedef {{ status: 'found', layout: Pose[], source: 'stored' | 'search' }
 *   | { status: 'unsatisfiable' }
 *   | { status: 'unknown' }} Compatible
 */

/**
 * A complete layout that keeps every fixed placement, or why none is known. A
 * stored answer counts only when it agrees with the placements; otherwise one
 * search runs. `unsatisfiable` needs an exhausted search without a solution.
 * @param {CompatibleRequest} request
 * @returns {Promise<Compatible>}
 */
export async function findCompatibleLayout({ board, pieces, fixed, solution, solve }) {
  if (footprints(board, pieces, fixed) === null) {
    return { status: 'unknown' };
  }
  const stored = compatibleStoredLayout(board, pieces, fixed, solution ?? null);
  if (stored !== null) {
    return { status: 'found', layout: stored, source: 'stored' };
  }
  const reply = await solve([...fixed]);
  if (reply.layout !== null) {
    const layout = compatibleStoredLayout(board, pieces, fixed, reply.layout);
    return layout === null ? { status: 'unknown' } : { status: 'found', layout, source: 'search' };
  }
  return reply.exhausted ? { status: 'unsatisfiable' } : { status: 'unknown' };
}

/**
 * @typedef {object} HintRequest
 * @property {Board} board
 * @property {readonly Piece[]} pieces
 * @property {readonly Pose[]} clues
 * @property {ReadonlyMap<string, Pose>} placed Current movable placements.
 * @property {readonly MoveCommand[]} history
 * @property {readonly Pose[] | null | undefined} [solution]
 * @property {Solver} solve
 */

/**
 * The hint of the design: a proven compatible placement, a proven repairing
 * removal or the honest unknown. A `solve` that throws (cancel, deadline) stops
 * the hint; the caller decides what that means.
 * @param {HintRequest} request
 * @returns {Promise<HintResult>}
 */
export async function resolveHint({ board, pieces, clues, placed, history, solution, solve }) {
  /** @type {HintResult} */
  const unknown = { kind: 'unknown', message: HINT_UNKNOWN_MESSAGE };
  const fixed = [...clues, ...placed.values()];
  const current = await findCompatibleLayout({ board, pieces, fixed, solution, solve });
  if (current.status === 'found') {
    const pose = chooseHintPlacement(board, pieces, fixed, current.layout);
    return pose === null ? unknown : { kind: 'place', pose, proof: 'compatible-layout', layout: current.layout };
  }
  if (current.status !== 'unsatisfiable') {
    return unknown;
  }
  for (const id of repairCandidates(placed, history)) {
    const without = fixed.filter((pose) => pose.piece !== id);
    const repaired = await findCompatibleLayout({ board, pieces, fixed: without, solution, solve });
    if (repaired.status === 'found') {
      return { kind: 'remove', piece: id, proof: 'repairing-layout', layout: repaired.layout };
    }
  }
  return unknown;
}
