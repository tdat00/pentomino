// @ts-check
// User-visible texts of the player, looked up in the language packs (locale.en.js / locale.vi.js) at each read, so
// text built after a language switch follows it. Values are plain text for `textContent`.
import { level } from '../core/engine/levels.js';
import { pieceLabelText } from '../core/browser/piece-look.js';
import { has, onChange, t } from './i18n.js';

/** @typedef {import('../core/engine/types.js').Issue} Issue */
/** @typedef {import('../core/engine/types.js').PackPuzzle} PackPuzzle */

// Messages that the controllers keep as plain strings; live bindings that a language switch rewrites.
export let PIECE_SET_MESSAGE = '';
export let UNSUPPORTED_MESSAGE = '';
export let INDEX_MESSAGE = '';
export let SAMPLE_FAILED_MESSAGE = '';
export let LOAD_FAILED_MESSAGE = '';

function readConstants() {
  PIECE_SET_MESSAGE = t('msg.pieceSet');
  UNSUPPORTED_MESSAGE = t('msg.unsupported');
  INDEX_MESSAGE = t('msg.index');
  SAMPLE_FAILED_MESSAGE = t('msg.sampleFailed');
  LOAD_FAILED_MESSAGE = t('msg.loadFailed');
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
    case 'index-out-of-range':
    case 'invalid-index':
      return INDEX_MESSAGE;
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
 * Whole score, with "+" when the rating is capped, as in the generator's cards.
 * @param {{ score: number, saturated?: boolean }} rating
 * @returns {string}
 */
function scoreText(rating) {
  const score = Number.isFinite(rating.score) ? Math.round(rating.score) : 0;
  return `${score}${rating.saturated === true ? '+' : ''}`;
}

const LEVEL_MARK = '\u0000';

/**
 * The rating line split around the level name, so that a view can emphasise the level.
 * @param {PackPuzzle['rating']} rating
 * @returns {{ before: string, level: string, after: string } | null}
 */
export function ratingParts(rating) {
  if (!rating || typeof rating.score !== 'number') {
    return null;
  }
  const [before, after] = t('rating.line', { level: LEVEL_MARK, score: scoreText(rating) }).split(LEVEL_MARK);
  return { before, level: levelLabel(rating.level), after: after ?? '' };
}

const CERTIFICATE_STATUSES = new Set(['unique', 'multiple', 'not-proved', 'unsatisfiable']);

/**
 * Status of the uniqueness badge. A certificate carried by the pack is shown as it is. Without one, a puzzle whose
 * solution is known (an included answer, or a successful solvability check) is "not-proved", which reads
 * "At least 1 solution" as a new puzzle does in the generator; otherwise nothing is claimed.
 * @param {{ status: string } | null | undefined} certificate
 * @param {boolean} [solvable] A solution of the puzzle is known.
 * @returns {string} Empty when nothing is claimed.
 */
export function certificateStatus(certificate, solvable = false) {
  const status = certificate ? certificate.status : solvable ? 'not-proved' : '';
  return CERTIFICATE_STATUSES.has(status) ? status : '';
}

/**
 * Same wording as the generator's cards.
 * @param {{ status: string } | null | undefined} certificate
 * @param {boolean} [solvable] A solution of the puzzle is known.
 * @returns {string}
 */
export function certificateLabel(certificate, solvable = false) {
  const status = certificateStatus(certificate, solvable);
  return status === '' ? '' : t(`cert.${status}`);
}

/** @type {Readonly<Record<string, string>>} */
const VERIFICATION_KEYS = Object.freeze({
  pending: 'verify.pending', solvable: 'verify.solvable', unsatisfiable: 'verify.impossible', 'not-verified': 'verify.inconclusive',
});

/**
 * Only an exhausted search with zero solutions says "No solution exists".
 * @param {{ status: 'pending' | 'solvable' | 'unsatisfiable' | 'not-verified' } | null | undefined} verification
 * @returns {string}
 */
export function verificationLabel(verification) {
  const key = verification ? VERIFICATION_KEYS[verification.status] : undefined;
  return key === undefined ? '' : t(key);
}

/**
 * @param {Issue[]} warnings `game.restoreWarnings`
 * @returns {string}
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

export const LABELS = Object.freeze(Object.assign(texts('ui', [
  'boardLabel', 'rotateCcw', 'rotateCw', 'flipH', 'flipV', 'toTrayLabel', 'unplaceAll',
  'replayPuzzle', 'revealedBadge', 'winTime',
]), {
  piecesLeft: (/** @type {number} */ n) => t('ui.piecesLeft', { count: n }),
  moves: (/** @type {number} */ n) => t('ui.moves', { count: n }),
  puzzleNumber: (/** @type {number} */ n) => t('ui.puzzleNumber', { n }),
  toPlace: (/** @type {number} */ n) => t('card.toPlace', { count: n }),
  cardHeading: (/** @type {number} */ n) => t('card.heading', { n }),
}));

/**
 * @param {string} reason A `canPlace` reason.
 * @returns {string}
 */
export function reasonText(reason) {
  return t(reason === 'outside' || reason === 'blocked' || reason === 'clue' || reason === 'overlap' ? `reason.${reason}` : 'reason.other');
}

export const PLAY_TEXT = Object.freeze(Object.assign(texts('play', [
  'selectFirst', 'noSelection', 'alreadyInTray', 'cancelled', 'moveCancelled', 'undone', 'redone', 'nothingToUndo',
  'nothingToRedo', 'resetDone', 'previewValid',
]), {
  /** @param {string} label @returns {string} */
  selected: (label) => t('play.selected', { label: pieceLabelText(label) }),
  /** @param {string} label @returns {string} */
  pickedUp: (label) => t('play.pickedUp', { label: pieceLabelText(label) }),
  /** @param {string} reason @returns {string} */
  cannotPlace: (reason) => t('play.cannotPlace', { reason: reasonText(reason) }),
  /** @param {string} name Accessible piece name. @returns {string} */
  placed: (name) => t('play.placed', { name }),
  /** @param {string} name @returns {string} */
  moved: (name) => t('play.moved', { name }),
  /** @param {string} label @returns {string} */
  returned: (label) => t('play.returned', { label: pieceLabelText(label) }),
  /** @param {string} label @returns {string} */
  turned: (label) => t('play.turned', { label: pieceLabelText(label) }),
  /** @param {string} label @returns {string} */
  returnedTurned: (label) => t('play.returnedTurned', { label: pieceLabelText(label) }),
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

/**
 * Hint texts mark what matters with `**double asterisks**`: the panel shows it in bold and a screen reader hears it plain.
 * @param {string} text
 * @returns {{ text: string, bold: boolean }[]}
 */
export function richSegments(text) {
  return text.split(/\*\*(.+?)\*\*/).map((part, i) => ({ text: part, bold: i % 2 === 1 })).filter((segment) => segment.text !== '');
}

/**
 * @param {string} text
 * @returns {string} The text without its bold markers.
 */
export function plainText(text) {
  return richSegments(text).map((segment) => segment.text).join('');
}

/** The hint texts that name a piece, with their `**bold**` markers; `HINT_TEXT` has the same texts without them. */
export const HINT_RICH = Object.freeze({
  /** @param {string} label @returns {string} */
  place: (label) => t('hint.place', { label: pieceLabelText(label) }),
  /** @param {string} label @returns {string} */
  remove: (label) => t('hint.remove', { label: pieceLabelText(label) }),
  /** @param {string} label @returns {string} */
  placedHint: (label) => t('hint.placedHint', { label: pieceLabelText(label) }),
  /** @param {string} label @returns {string} */
  removedHint: (label) => t('hint.removedHint', { label: pieceLabelText(label) }),
});

export const HINT_TEXT = Object.freeze(Object.assign(texts('hint', [
  'working', 'revealWorking', 'cancelled', 'stale', 'complete', 'noLongerFits', 'revealed', 'revealUnsat', 'revealImpossible',
  'revealCancelled', 'revealUnknown', 'revealFailed', 'replayed',
]), {
  /** @param {string} label @returns {string} */
  place: (label) => plainText(HINT_RICH.place(label)),
  /** @param {string} label @returns {string} */
  remove: (label) => plainText(HINT_RICH.remove(label)),
  /** @param {string} label @returns {string} */
  placedHint: (label) => plainText(HINT_RICH.placedHint(label)),
  /** @param {string} label @returns {string} */
  removedHint: (label) => plainText(HINT_RICH.removedHint(label)),
}));

/**
 * @param {number} ms
 * @param {number} moves
 * @returns {string} "Time 3:12, 17 moves"
 */
export function solvedSummary(ms, moves) {
  return `${LABELS.winTime} ${formatElapsed(ms)}, ${LABELS.moves(moves)}`;
}
