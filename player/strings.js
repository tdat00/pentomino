// @ts-check
// Every user-visible player message lives here (in the language packs locale.en.js / locale.vi.js) so wording stays
// consistent and testable. All values are plain text for `textContent`; nothing is markup. Each read uses the current
// language, so text built after a language switch follows it.
import { level } from '../core/engine/levels.js';
import { has, onChange, t } from './i18n.js';

/** @typedef {import('../core/engine/types.js').Issue} Issue */
/** @typedef {import('../core/engine/types.js').PackPuzzle} PackPuzzle */

// Messages that the controllers store as plain strings. They are live bindings: a language switch replaces them.
export let PIECE_SET_MESSAGE = '';
export let UNSUPPORTED_MESSAGE = '';
export let MISSING_LOCAL_MESSAGE = '';
export let INDEX_MESSAGE = '';
export let SAMPLE_FAILED_MESSAGE = '';
export let LOAD_FAILED_MESSAGE = '';

export let VERIFICATION_PENDING = '';
export let VERIFICATION_INCONCLUSIVE = '';
export let VERIFICATION_SOLVABLE = '';
export let VERIFICATION_IMPOSSIBLE = '';

export let CERTIFICATE_NONE = '';
export let CERTIFICATE_PENDING = '';

function readConstants() {
  PIECE_SET_MESSAGE = t('msg.pieceSet');
  UNSUPPORTED_MESSAGE = t('msg.unsupported');
  MISSING_LOCAL_MESSAGE = t('msg.missingLocal');
  INDEX_MESSAGE = t('msg.index');
  SAMPLE_FAILED_MESSAGE = t('msg.sampleFailed');
  LOAD_FAILED_MESSAGE = t('msg.loadFailed');
  VERIFICATION_PENDING = t('verify.pending');
  VERIFICATION_INCONCLUSIVE = t('verify.inconclusive');
  VERIFICATION_SOLVABLE = t('verify.solvable');
  VERIFICATION_IMPOSSIBLE = t('verify.impossible');
  CERTIFICATE_NONE = t('cert.none');
  CERTIFICATE_PENDING = t('cert.pending');
}
readConstants();
onChange(readConstants);

/**
 * An object whose text properties read the pack key `<prefix>.<name>` each time.
 * @param {string} prefix
 * @param {readonly string[]} names
 * @returns {Record<string, string>}
 */
function texts(prefix, names) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const name of names) {
    Object.defineProperty(out, name, { enumerable: true, get: () => t(`${prefix}.${name}`) });
  }
  return out;
}

/** Codes of `parsePack`/`validatePack` that mean "a newer or foreign format". */
const UNSUPPORTED_CODES = new Set(['unsupported-version', 'bad-rules']);

/**
 * @param {string} message
 * @returns {string}
 */
export function invalidPackMessage(message) {
  return t('msg.invalidPack', { message });
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
      return invalidPackMessage(first ? String(first.message) : t('msg.unreadable'));
  }
}

/**
 * @param {string} id
 * @returns {string} Human label of a (possibly claimed, unknown) level id, in the current language.
 */
export function levelLabel(id) {
  if (has(`level.name.${id}`)) {
    return t(`level.name.${id}`);
  }
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
  const body = t('rating.line', { level: levelLabel(rating.level), score: scoreText(rating.score) });
  return recomputed ? body : t('rating.claimed', { rating: body });
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
      return t(runtime ? 'cert.unique' : 'cert.unique.claimed');
    case 'multiple':
      return t(runtime ? 'cert.multiple' : 'cert.multiple.claimed');
    case 'unsatisfiable':
      return runtime ? VERIFICATION_IMPOSSIBLE : t('cert.unsatisfiable.claimed');
    default:
      return t(runtime ? 'cert.other' : 'cert.other.claimed');
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
  if (warnings.some((w) => w.code === 'progress-invalid')) {
    return t('msg.restored.invalid');
  }
  const many = warnings.some((w) => w.code === 'too-many-warnings');
  return t(many ? 'msg.restored.many' : 'msg.restored', { count: dropped });
}

/**
 * @param {'new' | 'in-progress' | 'solved' | 'revealed'} status
 * @returns {string}
 */
export function puzzleStatusLabel(status) {
  return t(`status.${status === 'revealed' || status === 'solved' || status === 'in-progress' ? status : 'new'}`);
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

export const LABELS = Object.freeze(Object.defineProperties(Object.assign(texts('ui', [
  'previous', 'next', 'view', 'labels', 'patterns', 'timer', 'elapsed', 'undo', 'redo', 'reset', 'straighten', 'straightenOn', 'import',
  'generator', 'zoom', 'zoomIn', 'zoomOut', 'zoomFit', 'localLink', 'loading', 'continue', 'restart', 'savedProgress', 'trayLabel',
  'boardLabel', 'boardHelp', 'selectedGroup', 'selectedNone', 'rotateCcw', 'rotateCw', 'flipH', 'flipV', 'place', 'toTray', 'toTrayLabel',
  'pieceMenu', 'help', 'helpTitle', 'keyColumn', 'actionColumn', 'close', 'results', 'solvedInfo', 'revealedInfo', 'hintsGroup', 'hint',
  'hintLabel', 'reveal', 'revealLabel', 'placeIt', 'removeIt', 'dismiss', 'cancelCheck', 'revealedBadge', 'hintsUsed', 'revealTitle',
  'revealBody', 'revealConfirm', 'resetRevealTitle', 'resetRevealBody', 'resetRevealConfirm', 'resetTitle', 'resetBody', 'resetConfirm',
  'cancel', 'winTitle', 'winTime', 'winMoves', 'winLevel', 'nextPuzzle', 'replay', 'backToGenerator', 'noGame', 'importTitle',
  'importIntro', 'chooseFile', 'dropHint', 'pasteLabel', 'pasteOpen', 'sample', 'recent', 'recentEmpty', 'open', 'export', 'delete',
  'confirmDelete', 'back', 'exportFailed', 'deleted',
]), {
  piecesLeft: (/** @type {number} */ n) => t('ui.piecesLeft', { count: n }),
  moves: (/** @type {number} */ n) => t('ui.moves', { count: n }),
  puzzleNumber: (/** @type {number} */ n) => t('ui.puzzleNumber', { n }),
  toPlace: (/** @type {number} */ n) => t('card.toPlace', { count: n }),
  selected: (/** @type {string} */ label) => t('ui.selected', { label }),
  solvedCount: (/** @type {number} */ solved, /** @type {number} */ total) => t('ui.solvedCount', { solved, total }),
  resumeQuestion: (/** @type {number} */ placed, /** @type {boolean} */ solved, /** @type {boolean} */ revealed = false) => (revealed
    ? t('ui.resume.revealed')
    : solved
      ? t('ui.resume.solved')
      : t('ui.resume.progress', { count: placed })),
}), {
  appName: { enumerable: true, get: () => t('shell.title') },
  version: { enumerable: true, get: () => t('shell.version') },
}));

/**
 * @param {string} reason A `canPlace` reason.
 * @returns {string}
 */
export function reasonText(reason) {
  return t(reason === 'outside' || reason === 'blocked' || reason === 'clue' || reason === 'overlap' ? `reason.${reason}` : 'reason.other');
}

/** Spoken and visible outcomes of piece manipulation; every one is announced through the live region. */
export const PLAY_TEXT = Object.freeze(Object.assign(texts('play', [
  'noRoom', 'selectFirst', 'noSelection', 'alreadyInTray', 'cancelled', 'moveCancelled', 'undone', 'redone', 'nothingToUndo',
  'nothingToRedo', 'resetDone', 'previewValid',
]), {
  /** @param {string} label @returns {string} */
  selected: (label) => t('play.selected', { label }),
  /** @param {string} label @returns {string} */
  pickedUp: (label) => t('play.pickedUp', { label }),
  /** @param {string} reason @returns {string} */
  cannotPlace: (reason) => t('play.cannotPlace', { reason: reasonText(reason) }),
  /** @param {string} name Accessible piece name. @returns {string} */
  placed: (name) => t('play.placed', { name }),
  /** @param {string} name @returns {string} */
  moved: (name) => t('play.moved', { name }),
  /** @param {string} label @returns {string} */
  returned: (label) => t('play.returned', { label }),
  /** @param {string} label @returns {string} */
  turned: (label) => t('play.turned', { label }),
  /** @param {string} total @returns {string} */
  solved: (total) => t('play.solved', { total }),
  /**
   * @param {number} row 1-based
   * @param {number} column 1-based
   * @param {string | null} reason Why the ghost cannot be dropped here, or null when it can.
   * @returns {string}
   */
  ghostAt: (row, column, reason) => t('play.ghostAt', {
    row, column, state: reason === null ? t('play.ghostFree') : t('play.ghostBlocked', { reason: reasonText(reason) }),
  }),
}));

/** Outcomes of hints and reveal; every one is announced through the live region. */
export const HINT_TEXT = Object.freeze(Object.assign(texts('hint', [
  'working', 'revealWorking', 'cancelled', 'stale', 'complete', 'noLongerFits', 'revealed', 'revealUnsat', 'revealImpossible',
  'revealCancelled', 'revealUnknown', 'revealFailed', 'replayed',
]), {
  /** @param {string} label @returns {string} */
  place: (label) => t('hint.place', { label }),
  /** @param {string} label @returns {string} */
  remove: (label) => t('hint.remove', { label }),
  /** @param {string} label @returns {string} */
  placedHint: (label) => t('hint.placedHint', { label }),
  /** @param {string} label @returns {string} */
  removedHint: (label) => t('hint.removedHint', { label }),
}));

/**
 * @param {number} ms
 * @param {number} moves
 * @returns {string} "Time 3:12, 17 moves"
 */
export function solvedSummary(ms, moves) {
  return `${LABELS.winTime} ${formatElapsed(ms)}, ${LABELS.moves(moves)}`;
}
