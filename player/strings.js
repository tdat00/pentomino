// @ts-check
// Every user-visible player message lives here so wording stays consistent and
// testable. All values are plain text for `textContent`; nothing is markup.
import { level } from '../core/engine/levels.js';

/** @typedef {import('../core/engine/types.js').Issue} Issue */
/** @typedef {import('../core/engine/types.js').PackPuzzle} PackPuzzle */

export const PIECE_SET_MESSAGE = 'This file has pieces but no puzzle — open it in the generator.';
export const UNSUPPORTED_MESSAGE = 'Unsupported puzzle version or rules.';
export const MISSING_LOCAL_MESSAGE = "This puzzle is not in this browser's library. Import a file or use a portable link.";
export const INDEX_MESSAGE = 'Puzzle index is out of range.';
export const SAMPLE_FAILED_MESSAGE = 'The sample puzzle could not be loaded.';
export const LOAD_FAILED_MESSAGE = 'The puzzle could not be opened.';

export const VERIFICATION_PENDING = 'Checking solvability…';
export const VERIFICATION_INCONCLUSIVE = 'Solvability not verified';
export const VERIFICATION_SOLVABLE = 'Solvable ✓';
export const VERIFICATION_IMPOSSIBLE = 'No solution exists';

export const CERTIFICATE_NONE = 'Uniqueness not checked';
export const CERTIFICATE_PENDING = 'Checking…';

/** Codes of `parsePack`/`validatePack` that mean "a newer or foreign format". */
const UNSUPPORTED_CODES = new Set(['unsupported-version', 'bad-rules']);

/**
 * @param {string} message
 * @returns {string}
 */
export function invalidPackMessage(message) {
  return `This file is not a valid Pentomino pack: ${message}`;
}

/**
 * Maps the failure issues of any incoming loader to one message.
 * @param {Issue[] | undefined} issues
 * @returns {string}
 */
export function messageForIssues(issues) {
  const list = Array.isArray(issues) ? issues : [];
  if (list.some((issue) => UNSUPPORTED_CODES.has(issue?.code))) {
    return UNSUPPORTED_MESSAGE;
  }
  const first = list[0];
  switch (first?.code) {
    case 'piece-set':
      return PIECE_SET_MESSAGE;
    case 'library-missing':
      return MISSING_LOCAL_MESSAGE;
    case 'index-out-of-range':
    case 'invalid-index':
      return INDEX_MESSAGE;
    case 'no-decompressor':
    case 'load-failed':
      return String(first.message);
    default:
      return invalidPackMessage(first ? String(first.message) : 'the data could not be read.');
  }
}

/**
 * @param {string} id
 * @returns {string} Human label of a (possibly claimed, unknown) level id.
 */
export function levelLabel(id) {
  try {
    return level(id).label;
  } catch {
    return String(id).slice(0, 40);
  }
}

/**
 * @param {number} score
 * @returns {string}
 */
function scoreText(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/**
 * Ratings read from a file are always claims until the runtime re-rates.
 * @param {PackPuzzle['rating']} rating
 * @param {boolean} [recomputed]
 * @returns {string} Empty when the puzzle carries no rating.
 */
export function ratingLabel(rating, recomputed = false) {
  if (!rating || typeof rating.score !== 'number') {
    return '';
  }
  const body = `${levelLabel(rating.level)} · score ${scoreText(rating.score)}`;
  return recomputed ? body : `Claimed ${body}`;
}

/**
 * @param {{ status: string, verified?: boolean } | null | undefined} certificate
 * @param {boolean} [pending] A runtime certificate is being computed.
 * @returns {string}
 */
export function certificateLabel(certificate, pending = false) {
  if (!certificate) {
    return pending ? CERTIFICATE_PENDING : CERTIFICATE_NONE;
  }
  const runtime = certificate.verified === true;
  switch (certificate.status) {
    case 'unique':
      return runtime ? 'Unique solution ✓' : 'Claimed unique solution';
    case 'multiple':
      return runtime ? 'Several solutions' : 'Claimed several solutions';
    case 'unsatisfiable':
      return runtime ? VERIFICATION_IMPOSSIBLE : 'Claimed: no solution exists';
    default:
      return runtime ? 'Uniqueness not proved' : 'Claimed uniqueness not proved';
  }
}

/**
 * Only an exhausted search with zero solutions says "No solution exists".
 * @param {{ status: 'pending' | 'solvable' | 'unsatisfiable' | 'not-verified' } | null | undefined} verification
 * @returns {string} Empty before any check was requested.
 */
export function verificationLabel(verification) {
  switch (verification?.status) {
    case 'pending':
      return VERIFICATION_PENDING;
    case 'solvable':
      return VERIFICATION_SOLVABLE;
    case 'unsatisfiable':
      return VERIFICATION_IMPOSSIBLE;
    case 'not-verified':
      return VERIFICATION_INCONCLUSIVE;
    default:
      return '';
  }
}

/**
 * @param {Issue[]} warnings `game.restoreWarnings`
 * @returns {string} Empty when nothing was discarded.
 */
export function restorationNotice(warnings) {
  const dropped = warnings.filter((w) => w.code !== 'too-many-warnings').length;
  if (dropped === 0) {
    return '';
  }
  const many = warnings.some((w) => w.code === 'too-many-warnings');
  if (warnings.some((w) => w.code === 'progress-invalid')) {
    return 'Saved progress for this puzzle could not be used and was discarded.';
  }
  const count = many ? `${dropped} or more saved moves` : `${dropped} saved ${dropped === 1 ? 'move' : 'moves'}`;
  return `${count} no longer fit${dropped === 1 && !many ? 's' : ''} this puzzle and ${dropped === 1 && !many ? 'was' : 'were'} discarded.`;
}

/**
 * @param {'new' | 'in-progress' | 'solved'} status
 * @returns {string}
 */
export function puzzleStatusLabel(status) {
  return status === 'solved' ? 'Solved ✓' : status === 'in-progress' ? 'In progress' : 'New';
}

/**
 * @param {number} ms
 * @returns {string} `m:ss` or `h:mm:ss`
 */
export function formatElapsed(ms) {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export const LABELS = Object.freeze({
  appName: 'Pentomino Player',
  menu: '☰ Pack ▾',
  menuTitle: 'Puzzles in this pack',
  previous: 'Previous puzzle',
  next: 'Next puzzle',
  view: 'View',
  labels: 'Labels',
  patterns: 'Patterns',
  timer: 'Timer',
  undo: 'Undo',
  redo: 'Redo',
  reset: 'Reset',
  straighten: 'Straighten',
  straightenOn: 'Straightened',
  import: 'Import',
  generator: 'Open the Generator',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomFit: 'Fit board',
  piecesLeft: (/** @type {number} */ n) => `${n} ${n === 1 ? 'piece' : 'pieces'} left`,
  moves: (/** @type {number} */ n) => `${n} ${n === 1 ? 'move' : 'moves'}`,
  puzzleNumber: (/** @type {number} */ n) => `Puzzle ${n}`,
  localLink: "Local link — it only works in this browser.",
  loading: 'Loading…',
  continue: 'Continue',
  restart: 'Restart',
  resumeQuestion: (/** @type {number} */ placed, /** @type {boolean} */ solved) => (solved
    ? 'You solved this puzzle before.'
    : `Saved progress found: ${placed} ${placed === 1 ? 'piece' : 'pieces'} placed.`),
  trayLabel: 'Unplaced pieces',
  boardHelp: 'Select a piece in the tray, then tap a board cell to preview it and tap the same cell or press Place to drop it. '
    + 'With the keyboard, press Enter on a piece to pick it up, move it with the arrow keys and press Enter to drop it; press ? for all shortcuts. '
    + 'Locked clue pieces cannot be moved.',
  selectedNone: 'Select a piece',
  selected: (/** @type {string} */ label) => `Selected: ${label}`,
  rotateCcw: 'Rotate counter-clockwise',
  rotateCw: 'Rotate clockwise',
  flipH: 'Mirror left and right',
  flipV: 'Mirror top and bottom',
  place: 'Place',
  toTray: '↩ to tray',
  toTrayLabel: 'Return to tray',
  help: 'Shortcuts',
  helpTitle: 'Keyboard shortcuts',
  close: 'Close',
  results: 'Results',
  solvedInfo: 'Puzzle solved ✓',
  resetTitle: 'Reset this puzzle?',
  resetBody: 'Every placed piece returns to the tray. You can undo this.',
  resetConfirm: 'Reset',
  cancel: 'Cancel',
  winTitle: 'Puzzle solved!',
  winTime: 'Time',
  winMoves: 'Moves',
  winLevel: 'Level',
  nextPuzzle: 'Next puzzle',
  replay: 'Replay',
  backToGenerator: 'Back to generator',
  noGame: 'No puzzle is open.',
  importTitle: 'Open a puzzle',
  importIntro: 'Open a puzzle from a link, a file, pasted text, a recent pack or the sample.',
  chooseFile: 'Import file',
  dropHint: 'Drop a .json pack file anywhere on this page (512 KiB at most).',
  pasteLabel: 'Paste a link, share code or pack JSON',
  pasteOpen: 'Open pasted text',
  sample: 'Try the sample',
  recent: 'Recent packs',
  recentEmpty: 'No recent packs yet.',
  open: 'Open',
  export: 'Export',
  delete: 'Delete',
  confirmDelete: 'Confirm delete',
  back: 'Back to puzzle',
  solvedCount: (/** @type {number} */ solved, /** @type {number} */ total) => `${solved} of ${total} solved`,
  exportFailed: 'The pack could not be exported.',
  deleted: 'Removed from this browser.',
});

/** @type {Readonly<Record<string, string>>} */
const REASON_TEXT = Object.freeze({
  outside: 'it would leave the board',
  blocked: 'it would cover a blocked cell',
  clue: 'it would overlap a locked clue',
  overlap: 'it would overlap another piece',
});

/**
 * @param {string} reason A `canPlace` reason.
 * @returns {string}
 */
export function reasonText(reason) {
  return REASON_TEXT[reason] ?? 'that spot is not free';
}

/** Spoken and visible outcomes of piece manipulation; every one is announced through the live region. */
export const PLAY_TEXT = Object.freeze({
  noRoom: 'No room to rotate here',
  selectFirst: 'Select a piece first',
  noSelection: 'No piece is selected',
  alreadyInTray: 'The piece is already in the tray',
  cancelled: 'Cancelled',
  moveCancelled: 'Move cancelled, the piece stays where it was',
  undone: 'Undone',
  redone: 'Redone',
  nothingToUndo: 'Nothing to undo',
  nothingToRedo: 'Nothing to redo',
  resetDone: 'Puzzle reset. All pieces are back in the tray',
  previewValid: 'Preview. Tap the same cell, press Place or Enter to drop it',
  /** @param {string} label @returns {string} */
  selected: (label) => `Selected piece ${label}`,
  /** @param {string} label @returns {string} */
  pickedUp: (label) => `Picked up piece ${label}. Move it with the arrow keys, press Enter to drop it, Escape to cancel`,
  /** @param {string} reason @returns {string} */
  cannotPlace: (reason) => `Cannot place here: ${reasonText(reason)}`,
  /** @param {string} name Accessible piece name. @returns {string} */
  placed: (name) => `Placed. ${name}`,
  /** @param {string} name @returns {string} */
  moved: (name) => `Moved. ${name}`,
  /** @param {string} label @returns {string} */
  returned: (label) => `Piece ${label} returned to the tray`,
  /** @param {string} label @returns {string} */
  turned: (label) => `Piece ${label} turned`,
  /** @param {string} total @returns {string} */
  solved: (total) => `Puzzle solved! ${total}`,
  /**
   * @param {number} row 1-based
   * @param {number} column 1-based
   * @param {string | null} reason Why the ghost cannot be dropped here, or null when it can.
   * @returns {string}
   */
  ghostAt: (row, column, reason) => `Row ${row}, column ${column}. ${reason === null ? 'Free' : `Not free: ${reasonText(reason)}`}`,
});

/**
 * @param {number} ms
 * @param {number} moves
 * @returns {string} "Time 3:12, 17 moves"
 */
export function solvedSummary(ms, moves) {
  return `${LABELS.winTime} ${formatElapsed(ms)}, ${LABELS.moves(moves)}`;
}
