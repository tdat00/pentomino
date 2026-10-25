// @ts-check
// Pure player state: legal placement, transactional commands, bounded undo/redo,
// complete-cover winning and safe progress restoration. No DOM, storage, timers
// or clocks: elapsed time is counted by the browser. Every
// function returns new values; inputs, maps and clue arrays are never mutated.

import { boardFromRows } from './board.js';
import { poseCells } from './geometry.js';

/** @typedef {import('./types.js').Pack} Pack */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Issue} Issue */

/**
 * Undoable one-piece command. `before`/`after` are poses, or null when the piece
 * is in the tray. `tBefore`/`tAfter` are `4*mirrored+turn`: the tray slot
 * orientation while unplaced, the pose orientation while placed.
 * @typedef {object} PieceCommand
 * @property {'piece'} kind
 * @property {string} piece
 * @property {Pose | null} before
 * @property {Pose | null} after
 * @property {number} tBefore
 * @property {number} tAfter
 */

/**
 * Complete movable placement + tray snapshot, in pack piece order.
 * @typedef {object} MovableSnapshot
 * @property {Pose[]} placed
 * @property {[string, number][]} tray
 */

/**
 * @typedef {object} ResetCommand
 * @property {'reset'} kind
 * @property {MovableSnapshot} before
 * @property {MovableSnapshot} after
 */

/** @typedef {PieceCommand | ResetCommand} MoveCommand */

/**
 * `history` and `future` are stacks: the last element is the next undo/redo.
 * `restoreWarnings` is never serialized.
 * @typedef {object} GameState
 * @property {Pack} pack
 * @property {number} index
 * @property {ReadonlyMap<string, Pose>} placed
 * @property {ReadonlyMap<string, number>} tray
 * @property {string | null} selected
 * @property {Pose | null} preview
 * @property {readonly MoveCommand[]} history
 * @property {readonly MoveCommand[]} future
 * @property {boolean} solved Geometry only: a complete cover. Earned completion is `isEarned`.
 * @property {boolean} revealed The answer was shown; sticky until a fresh session (Replay).
 * @property {number} hintsUsed Proven hints shown in this session.
 * @property {number} elapsedMs
 * @property {number} moves
 * @property {Issue[]} restoreWarnings
 */

/**
 * Local progress, version 2. Version 1 (no `revealed`/`hintsUsed`) is still read
 * by `createGame` and migrated with false and 0.
 * @typedef {object} Progress
 * @property {2} v
 * @property {Pose[]} placements
 * @property {number} elapsedMs
 * @property {number} moves
 * @property {boolean} solved
 * @property {boolean} revealed
 * @property {number} hintsUsed
 */

/**
 * `reveal` replaces every movable placement with the complete `layout` as one
 * undoable command and marks the session revealed. `hint` counts one shown hint.
 * @typedef {{ type: 'place' | 'move', pose: Pose }
 *   | { type: 'remove', piece: string }
 *   | { type: 'orient', piece: string, t: number, pose?: Pose }
 *   | { type: 'reveal', layout: Pose[] }
 *   | { type: 'reset' | 'undo' | 'redo' | 'hint' }} Action
 */

/** @typedef {'outside' | 'blocked' | 'overlap' | 'clue'} PlaceReason */
/** @typedef {{ ok: true } | { ok: false, reason: PlaceReason }} PlaceResult */

export const MAX_HISTORY = 500;
const MAX_WARNINGS = 100;

/**
 * Input of `createGame`: a version 2 record, or a version 1 record that lacks
 * `revealed` and `hintsUsed`.
 * @typedef {Omit<Progress, 'v' | 'revealed' | 'hintsUsed'> & { v: 1 | 2, revealed?: boolean, hintsUsed?: number }} SavedProgress
 */

/**
 * @typedef {object} Context
 * @property {import('./types.js').Board} board
 * @property {Map<string, Piece>} pieces
 * @property {Map<string, Pose>} clues
 * @property {Set<number>} clueCells
 * @property {number} area
 */

/**
 * Orientation index t = 4 * mirrored + turn.
 * @param {Pose} pose
 * @returns {number}
 */
export function poseT(pose) {
  return (pose.mirrored ? 4 : 0) + pose.turn;
}

/**
 * @param {unknown} p
 * @returns {p is Pose}
 */
function isPose(p) {
  if (typeof p !== 'object' || p === null) {
    return false;
  }
  const q = /** @type {Record<string, unknown>} */ (p);
  return typeof q.piece === 'string'
    && Number.isSafeInteger(q.x) && Number.isSafeInteger(q.y)
    && Number.isInteger(q.turn) && /** @type {number} */ (q.turn) >= 0 && /** @type {number} */ (q.turn) <= 3
    && typeof q.mirrored === 'boolean';
}

/**
 * Frozen copy holding exactly the five pose fields.
 * @param {Pose} p
 * @returns {Pose}
 */
function copyPose(p) {
  return Object.freeze({ piece: p.piece, x: p.x, y: p.y, turn: p.turn, mirrored: p.mirrored });
}

/**
 * @param {Pose} a
 * @param {Pose} b
 * @returns {boolean}
 */
function samePose(a, b) {
  return a.piece === b.piece && a.x === b.x && a.y === b.y && a.turn === b.turn && a.mirrored === b.mirrored;
}

/**
 * Runtime board, piece table and locked clue cells. Throws RangeError for a
 * missing puzzle or an invalid clue (packs are expected to be validated).
 * @param {Pack} pack
 * @param {number} index
 * @returns {Context}
 */
function context(pack, index) {
  const puzzle = Number.isInteger(index) ? pack.puzzles[index] : undefined;
  if (!puzzle) {
    throw new RangeError(`puzzle index ${index} is out of range`);
  }
  const board = boardFromRows(pack.board.rows);
  /** @type {Map<string, Piece>} */
  const pieces = new Map();
  for (const piece of pack.pieces) {
    pieces.set(piece.id, piece);
  }
  /** @type {Map<string, Pose>} */
  const clues = new Map();
  /** @type {Set<number>} */
  const clueCells = new Set();
  let area = 0;
  for (let i = 0; i < board.active.length; i += 1) {
    area += board.active[i];
  }
  for (const [i, clue] of puzzle.clues.entries()) {
    const piece = isPose(clue) ? pieces.get(clue.piece) : undefined;
    if (!piece || clues.has(clue.piece)) {
      throw new RangeError(`clue ${i} is malformed, unknown or repeated`);
    }
    for (const [x, y] of poseCells(piece, clue)) {
      const at = cellIndex(board, x, y);
      if (at < 0 || board.active[at] !== 1 || clueCells.has(at)) {
        throw new RangeError(`clue ${i} does not fit the board`);
      }
      clueCells.add(at);
    }
    clues.set(clue.piece, copyPose(clue));
  }
  return { board, pieces, clues, clueCells, area };
}

/**
 * @param {import('./types.js').Board} board
 * @param {number} x
 * @param {number} y
 * @returns {number} index, or -1 outside the grid
 */
function cellIndex(board, x, y) {
  return x < 0 || y < 0 || x >= board.width || y >= board.height ? -1 : y * board.width + x;
}

/**
 * @param {Context} ctx
 * @param {Pose} pose
 * @param {ReadonlyMap<string, Pose>} placed
 * @param {string | undefined} ignore
 * @returns {PlaceResult}
 */
function check(ctx, pose, placed, ignore) {
  const piece = isPose(pose) ? ctx.pieces.get(pose.piece) : undefined;
  if (!piece) {
    return { ok: false, reason: 'outside' };
  }
  if (ctx.clues.has(pose.piece)) {
    return { ok: false, reason: 'clue' };
  }
  /** @type {Set<number>} */
  const taken = new Set();
  for (const [id, other] of placed) {
    const otherPiece = ctx.pieces.get(id);
    if (id === ignore || !otherPiece) {
      continue;
    }
    for (const [x, y] of poseCells(otherPiece, other)) {
      taken.add(cellIndex(ctx.board, x, y));
    }
  }
  let outside = false;
  let blocked = false;
  let clue = false;
  let overlap = false;
  for (const [x, y] of poseCells(piece, pose)) {
    const at = cellIndex(ctx.board, x, y);
    if (at < 0) {
      outside = true;
    } else if (ctx.board.active[at] !== 1) {
      blocked = true;
    } else if (ctx.clueCells.has(at)) {
      clue = true;
    } else if (taken.has(at)) {
      overlap = true;
    }
  }
  if (outside) {
    return { ok: false, reason: 'outside' };
  }
  if (blocked) {
    return { ok: false, reason: 'blocked' };
  }
  if (clue) {
    return { ok: false, reason: 'clue' };
  }
  return overlap ? { ok: false, reason: 'overlap' } : { ok: true };
}

/**
 * Whether `pose` is legal on the current position. The piece's own existing
 * placement counts as an obstacle unless it is named in `ignorePiece`.
 * Malformed poses and unknown pieces report `outside`; clue pieces report `clue`.
 * @param {GameState} s
 * @param {Pose} pose
 * @param {string} [ignorePiece]
 * @returns {PlaceResult}
 */
export function canPlace(s, pose, ignorePiece) {
  return check(context(s.pack, s.index), pose, s.placed, ignorePiece);
}

/**
 * Complete cover: every piece exactly once (clues included), every placement
 * legal and disjoint, occupied cells equal the active cells. Recomputed from
 * the placements; `s.solved` and any stored solution are never consulted.
 * @param {GameState} s
 * @returns {boolean}
 */
export function isSolved(s) {
  return solvedIn(context(s.pack, s.index), s.placed);
}

/**
 * Earned completion: a complete cover reached without the revealed answer.
 * `isSolved` still checks geometry only.
 * @param {GameState} s
 * @returns {boolean}
 */
export function isEarned(s) {
  return !s.revealed && isSolved(s);
}

/**
 * @param {Context} ctx
 * @param {ReadonlyMap<string, Pose>} placed
 * @returns {boolean}
 */
function solvedIn(ctx, placed) {
  if (placed.size + ctx.clues.size !== ctx.pieces.size) {
    return false;
  }
  const occupied = new Set(ctx.clueCells);
  for (const [id, pose] of placed) {
    const piece = ctx.pieces.get(id);
    if (!piece || ctx.clues.has(id) || !isPose(pose) || pose.piece !== id) {
      return false;
    }
    for (const [x, y] of poseCells(piece, pose)) {
      const at = cellIndex(ctx.board, x, y);
      if (at < 0 || ctx.board.active[at] !== 1 || occupied.has(at)) {
        return false;
      }
      occupied.add(at);
    }
  }
  return occupied.size === ctx.area;
}

/**
 * Canonical state maps: placed and tray both follow pack piece order and tray
 * holds exactly the unplaced movable pieces.
 * @param {Context} ctx
 * @param {ReadonlyMap<string, Pose>} placed
 * @param {ReadonlyMap<string, number>} tray
 * @returns {{ p: Map<string, Pose>, t: Map<string, number> }}
 */
function canonical(ctx, placed, tray) {
  /** @type {Map<string, Pose>} */
  const p = new Map();
  /** @type {Map<string, number>} */
  const t = new Map();
  for (const id of ctx.pieces.keys()) {
    const pose = placed.get(id);
    if (pose) {
      p.set(id, pose);
    } else if (!ctx.clues.has(id)) {
      t.set(id, tray.get(id) ?? 0);
    }
  }
  return { p, t };
}

/**
 * @param {Pack} pack
 * @param {number} index
 * @param {SavedProgress} [saved] Version 1 or 2; version 1 migrates to not revealed, no hints.
 * @returns {GameState}
 */
export function createGame(pack, index, saved) {
  const ctx = context(pack, index);
  /** @type {Map<string, Pose>} */
  const placed = new Map();
  /** @type {Issue[]} */
  const warnings = [];
  let elapsedMs = 0;
  let moves = 0;
  let revealed = false;
  let hintsUsed = 0;
  if (saved !== undefined && saved !== null) {
    if (typeof saved !== 'object' || (saved.v !== 1 && saved.v !== 2) || !Array.isArray(saved.placements)) {
      warn(warnings, 'progress-invalid', '$', 'Saved progress has an unsupported shape and was ignored');
    } else {
      restorePlacements(ctx, saved.placements, placed, warnings);
      if (typeof saved.elapsedMs === 'number' && Number.isFinite(saved.elapsedMs) && saved.elapsedMs >= 0) {
        elapsedMs = saved.elapsedMs;
      }
      if (Number.isSafeInteger(saved.moves) && saved.moves >= 0) {
        moves = saved.moves;
      }
      if (saved.v === 2) {
        revealed = saved.revealed === true;
        if (Number.isSafeInteger(saved.hintsUsed) && /** @type {number} */ (saved.hintsUsed) >= 0) {
          hintsUsed = /** @type {number} */ (saved.hintsUsed);
        }
      }
    }
  }
  const { p, t } = canonical(ctx, placed, new Map());
  return {
    pack,
    index,
    placed: p,
    tray: t,
    selected: null,
    preview: null,
    history: [],
    future: [],
    solved: solvedIn(ctx, p),
    revealed,
    hintsUsed,
    elapsedMs,
    moves,
    restoreWarnings: warnings,
  };
}

/**
 * @param {Issue[]} warnings
 * @param {string} code
 * @param {string} path
 * @param {string} message
 */
function warn(warnings, code, path, message) {
  if (warnings.length < MAX_WARNINGS) {
    warnings.push({ code, path, message });
  } else if (warnings.length === MAX_WARNINGS) {
    warnings.push({ code: 'too-many-warnings', path: '$', message: 'Further discarded moves are not listed' });
  }
}

/**
 * Applies saved placements one at a time; invalid ones are dropped and reported.
 * @param {Context} ctx
 * @param {unknown[]} saved
 * @param {Map<string, Pose>} placed
 * @param {Issue[]} warnings
 */
function restorePlacements(ctx, saved, placed, warnings) {
  saved.forEach((entry, i) => {
    const path = `placements[${i}]`;
    if (!isPose(entry)) {
      warn(warnings, 'placement-malformed', path, 'Saved move is not a valid pose and was discarded');
      return;
    }
    if (!ctx.pieces.has(entry.piece)) {
      warn(warnings, 'placement-unknown-piece', path, `Saved move uses unknown piece "${entry.piece}"`);
      return;
    }
    if (placed.has(entry.piece)) {
      warn(warnings, 'placement-duplicate', path, `Piece "${entry.piece}" was already placed by an earlier saved move`);
      return;
    }
    const result = check(ctx, entry, placed, undefined);
    if (!result.ok) {
      warn(warnings, `placement-${result.reason}`, path,
        `Saved move for piece "${entry.piece}" is not legal (${result.reason}) and was discarded`);
      return;
    }
    placed.set(entry.piece, copyPose(entry));
  });
}

/**
 * Deterministic movable-only progress: placements follow pack piece order;
 * clues, preview, selection, history and warnings are not included.
 * @param {GameState} s
 * @returns {Progress}
 */
export function snapshot(s) {
  /** @type {Pose[]} */
  const placements = [];
  for (const piece of s.pack.pieces) {
    const pose = s.placed.get(piece.id);
    if (pose) {
      placements.push({ piece: pose.piece, x: pose.x, y: pose.y, turn: pose.turn, mirrored: pose.mirrored });
    }
  }
  return {
    v: 2,
    placements,
    elapsedMs: s.elapsedMs,
    moves: s.moves,
    solved: s.solved,
    revealed: s.revealed,
    hintsUsed: s.hintsUsed,
  };
}

/**
 * @param {Context} ctx
 * @param {ReadonlyMap<string, Pose>} placed
 * @param {ReadonlyMap<string, number>} tray
 * @returns {MovableSnapshot}
 */
function movableSnapshot(ctx, placed, tray) {
  const { p, t } = canonical(ctx, placed, tray);
  return { placed: [...p.values()], tray: [...t.entries()] };
}

/**
 * Applies one side of a command. Direction 'forward' yields the `after` state.
 * @param {Context} ctx
 * @param {GameState} s
 * @param {MoveCommand} cmd
 * @param {'forward' | 'backward'} dir
 * @returns {{ placed: Map<string, Pose>, tray: Map<string, number> }}
 */
function apply(ctx, s, cmd, dir) {
  const placed = new Map(s.placed);
  const tray = new Map(s.tray);
  const forward = dir === 'forward';
  if (cmd.kind === 'reset') {
    const side = forward ? cmd.after : cmd.before;
    placed.clear();
    tray.clear();
    for (const pose of side.placed) {
      placed.set(pose.piece, pose);
    }
    for (const [id, t] of side.tray) {
      tray.set(id, t);
    }
  } else {
    const pose = forward ? cmd.after : cmd.before;
    const t = forward ? cmd.tAfter : cmd.tBefore;
    if (pose) {
      placed.set(cmd.piece, pose);
      tray.delete(cmd.piece);
    } else {
      placed.delete(cmd.piece);
      tray.set(cmd.piece, t);
    }
  }
  const { p, t } = canonical(ctx, placed, tray);
  return { placed: p, tray: t };
}

/**
 * @param {Context} ctx
 * @param {GameState} s
 * @param {{ placed: Map<string, Pose>, tray: Map<string, number> }} maps
 * @param {Partial<GameState>} extra
 * @returns {GameState}
 */
function withMaps(ctx, s, maps, extra) {
  return { ...s, ...extra, placed: maps.placed, tray: maps.tray, solved: solvedIn(ctx, maps.placed) };
}

/**
 * @param {Context} ctx
 * @param {GameState} s
 * @param {MoveCommand} cmd
 * @returns {GameState}
 */
function commit(ctx, s, cmd) {
  const history = [...s.history, Object.freeze(cmd)];
  return withMaps(ctx, s, apply(ctx, s, cmd, 'forward'), {
    history: history.length > MAX_HISTORY ? history.slice(history.length - MAX_HISTORY) : history,
    future: [],
    moves: s.moves + 1,
  });
}

/**
 * Applies an action. Invalid, illegal and no-op actions return `s` itself.
 * `place` and `move` are equivalent: the piece is placed from the tray or moved
 * if already on the board. Placed-piece `orient` needs the candidate `pose`
 * (matching `t`); no rotation kicks are invented here.
 * @param {GameState} s
 * @param {Action} a
 * @returns {GameState}
 */
export function reduce(s, a) {
  if (typeof a !== 'object' || a === null) {
    return s;
  }
  const ctx = context(s.pack, s.index);
  switch (a.type) {
    case 'place':
    case 'move':
      return setPose(ctx, s, a.pose, undefined);
    case 'orient':
      return orient(ctx, s, a);
    case 'remove':
      return remove(ctx, s, a.piece);
    case 'reset':
      return reset(ctx, s);
    case 'reveal':
      return reveal(ctx, s, a.layout);
    case 'hint':
      return { ...s, hintsUsed: s.hintsUsed + 1 };
    case 'undo':
      return undo(ctx, s);
    case 'redo':
      return redo(ctx, s);
    default:
      return s;
  }
}

/**
 * @param {Context} ctx
 * @param {GameState} s
 * @param {Pose} pose
 * @param {number | undefined} requiredT
 * @returns {GameState}
 */
function setPose(ctx, s, pose, requiredT) {
  if (!isPose(pose) || !ctx.pieces.has(pose.piece) || ctx.clues.has(pose.piece)) {
    return s;
  }
  if (requiredT !== undefined && poseT(pose) !== requiredT) {
    return s;
  }
  const current = s.placed.get(pose.piece);
  if (current && samePose(current, pose)) {
    return s;
  }
  if (!check(ctx, pose, s.placed, pose.piece).ok) {
    return s;
  }
  return commit(ctx, s, {
    kind: 'piece',
    piece: pose.piece,
    before: current ?? null,
    after: copyPose(pose),
    tBefore: current ? poseT(current) : s.tray.get(pose.piece) ?? 0,
    tAfter: poseT(pose),
  });
}

/**
 * @param {Context} ctx
 * @param {GameState} s
 * @param {{ piece: string, t: number, pose?: Pose }} a
 * @returns {GameState}
 */
function orient(ctx, s, a) {
  if (!Number.isInteger(a.t) || a.t < 0 || a.t > 7 || !ctx.pieces.has(a.piece) || ctx.clues.has(a.piece)) {
    return s;
  }
  const current = s.placed.get(a.piece);
  if (current) {
    if (!isPose(a.pose) || a.pose.piece !== a.piece) {
      return s;
    }
    return setPose(ctx, s, a.pose, a.t);
  }
  const before = s.tray.get(a.piece) ?? 0;
  if (before === a.t) {
    return s;
  }
  return commit(ctx, s, { kind: 'piece', piece: a.piece, before: null, after: null, tBefore: before, tAfter: a.t });
}

/**
 * @param {Context} ctx
 * @param {GameState} s
 * @param {string} piece
 * @returns {GameState}
 */
function remove(ctx, s, piece) {
  const current = typeof piece === 'string' ? s.placed.get(piece) : undefined;
  if (!current || ctx.clues.has(piece)) {
    return s;
  }
  return commit(ctx, s, {
    kind: 'piece',
    piece,
    before: current,
    after: null,
    tBefore: poseT(current),
    tAfter: poseT(current),
  });
}

/**
 * @param {Context} ctx
 * @param {GameState} s
 * @returns {GameState}
 */
function reset(ctx, s) {
  const before = movableSnapshot(ctx, s.placed, s.tray);
  if (before.placed.length === 0 && before.tray.every(([, t]) => t === 0)) {
    return s;
  }
  const empty = movableSnapshot(ctx, new Map(), new Map());
  return commit(ctx, s, { kind: 'reset', before, after: empty });
}

/**
 * Shows the answer: every movable piece goes to its pose in `layout`, in one
 * undoable command, and the session becomes revealed for good. The layout must
 * keep the clues and be a complete cover; anything else changes nothing.
 * @param {Context} ctx
 * @param {GameState} s
 * @param {Pose[]} layout
 * @returns {GameState}
 */
function reveal(ctx, s, layout) {
  if (!Array.isArray(layout) || layout.length !== ctx.pieces.size) {
    return s;
  }
  /** @type {Map<string, Pose>} */
  const answer = new Map();
  for (const pose of layout) {
    if (!isPose(pose) || answer.has(pose.piece) || !ctx.pieces.has(pose.piece)) {
      return s;
    }
    answer.set(pose.piece, copyPose(pose));
  }
  for (const [id, clue] of ctx.clues) {
    const given = answer.get(id);
    const piece = /** @type {Piece} */ (ctx.pieces.get(id));
    const same = given !== undefined && [...poseCells(piece, given)].sort().join() === [...poseCells(piece, clue)].sort().join();
    if (!same) {
      return s;
    }
    answer.delete(id);
  }
  if (!solvedIn(ctx, answer)) {
    return s;
  }
  const before = movableSnapshot(ctx, s.placed, s.tray);
  const after = movableSnapshot(ctx, answer, new Map());
  return { ...commit(ctx, s, { kind: 'reset', before, after }), revealed: true };
}

/**
 * @param {Context} ctx
 * @param {GameState} s
 * @returns {GameState}
 */
function undo(ctx, s) {
  const cmd = s.history[s.history.length - 1];
  if (!cmd) {
    return s;
  }
  const future = [...s.future, cmd];
  return withMaps(ctx, s, apply(ctx, s, cmd, 'backward'), {
    history: s.history.slice(0, -1),
    future: future.length > MAX_HISTORY ? future.slice(future.length - MAX_HISTORY) : future,
  });
}

/**
 * @param {Context} ctx
 * @param {GameState} s
 * @returns {GameState}
 */
function redo(ctx, s) {
  const cmd = s.future[s.future.length - 1];
  if (!cmd) {
    return s;
  }
  return withMaps(ctx, s, apply(ctx, s, cmd, 'forward'), {
    history: [...s.history, cmd],
    future: s.future.slice(0, -1),
  });
}
