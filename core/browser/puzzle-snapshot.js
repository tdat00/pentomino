// @ts-check
// The one prepared description of a selected puzzle that Print and Copy link both use: an immutable snapshot of what
// the puzzle code carries (board frame, piece identities, clues, stored answer, claims, view angle and the title the
// code must hold), the Player address a printout or link opens, and the preparation of the code and its QR symbol with
// the approved capacity ladder. Pure and Node-importable: nothing here touches the DOM, a worker, storage or the
// locale; the code is made by an injected client (the worker-backed one in the browser) and the QR by the local
// adapter.

import { boardFromRows } from '../engine/board.js';
import { createPack } from '../engine/pack.js';
import { MAX_URL_CHARS, puzzleCodeUrl } from '../engine/sharecode.js';
import { MAX_PUZZLE_CODES } from '../engine/puzzlecode-input.js';
import { puzzleCodeTitle, puzzleDisplayName } from './puzzle-title.js';
import { makeListQr, makePuzzleQr } from './qr.js';

/** @typedef {import('../engine/types.js').Piece} Piece */
/** @typedef {import('../engine/types.js').Pose} Pose */
/** @typedef {import('../engine/types.js').RatingClaim} RatingClaim */
/** @typedef {import('../engine/types.js').CertificateClaim} CertificateClaim */
/** @typedef {import('../engine/puzzlecode.js').PuzzleCodeSnapshot} PuzzleCodeSnapshot */
/** @typedef {import('./qr.js').PuzzleQrMatrix} PuzzleQrMatrix */

/**
 * @typedef {object} SnapshotSource
 * @property {string[]} rows Board rows of the pack the puzzle belongs to (`#` active, `.` blocked), margins included.
 * @property {Piece[]} pieces Every piece of the set, in set order.
 * @property {{ title?: string | null, clues: Pose[], solution?: Pose[] | null, rating?: RatingClaim | object | null,
 *   certificate?: CertificateClaim | object | null }} puzzle The selected puzzle as stored (not the current moves).
 * @property {number} index Zero-based position of the puzzle in its pack or list: the heading rule numbers by it.
 * @property {number} rotation The angle the puzzle is shown at (counter-clockwise degrees, a multiple of 45).
 * @property {(n: number) => string} [untitled] Localized label of an untitled puzzle ("Puzzle #n"); English by default.
 */

/**
 * @typedef {object} PuzzleSnapshot
 * @property {PuzzleCodeSnapshot} data Plain data for the codec; deeply frozen, safe to post to a worker.
 * @property {string} heading The heading the sheet prints and the re-created puzzle shows.
 * @property {string} key Every code-relevant value of `data` in one string: two snapshots with equal keys give the
 *   same code. Progress, moves and unrelated puzzles are not part of it.
 */

/**
 * @typedef {object} EncodedCode
 * @property {string} C
 * @property {string | null} T
 * @property {string} F
 * @property {1 | 2} version
 */

/**
 * @typedef {object} PuzzleCodeClientLike
 * @property {(snapshot: PuzzleCodeSnapshot) => Promise<
 *   { ok: true, value: EncodedCode, warnings: object[] }
 *   | { ok: false, issues: { code: string, path: string, message: string }[] }>} encode
 */

/**
 * @typedef {'noTail' | 'lowEc' | 'none'} ShareNotice
 */

/**
 * @typedef {object} PreparedPuzzleShare
 * @property {EncodedCode} code The code as carried: without its tail T = null and F = C.
 * @property {string | null} url The complete Player address, or null when it exceeds the URL budget.
 * @property {'C.T' | 'C'} carried What `url` and the QR carry after the capacity ladder.
 * @property {PuzzleQrMatrix | null} qr Null: the sheet prints neither code nor QR.
 * @property {readonly ShareNotice[]} notices In the order of the ladder.
 */

/** Where a printout or link opens when the page has no usable address of its own (a constant next to the share logic). */
export const PUBLIC_PLAYER_URL = 'https://tdat00.github.io/pentomino/player/';

/**
 * Failure of the preparation itself (worker, encoder or QR adapter), never an oversize puzzle: an oversize puzzle
 * resolves with the reduced result of the ladder instead.
 */
export class PuzzleShareError extends Error {
  /**
   * @param {'encode-failed' | 'target-invalid' | 'qr-failed' | 'internal'} code
   * @param {string} message
   * @param {{ code: string, path: string, message: string }[]} [issues] The codec's or the client's issues.
   */
  constructor(code, message, issues = []) {
    super(message);
    this.name = 'PuzzleShareError';
    this.code = code;
    this.issues = issues;
  }
}

/**
 * @template T
 * @param {T} value
 * @returns {T} The value, frozen together with everything below it.
 */
function deepFreeze(value) {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * Detaches the selected puzzle. Poses are written canonically and claims whitelisted by the pack writer (`createPack`,
 * the same one that writes the Play link), so the Player and the Generator give the same code for the same puzzle
 * and angle; the source is never touched and its arrays are copied.
 * @param {SnapshotSource} source
 * @returns {PuzzleSnapshot}
 * @throws {RangeError | import('../engine/pack.js').PackError} For rows or an angle no pack could hold.
 */
export function puzzleSnapshot(source) {
  const { rows, pieces, puzzle, index } = source;
  const untitled = source.untitled;
  const angle = ((Math.round(source.rotation) % 360) + 360) % 360;
  const solution = Array.isArray(puzzle.solution) && puzzle.solution.length > 0 ? puzzle.solution : null;
  const pack = createPack({
    board: boardFromRows(rows),
    rotation: angle,
    pieces,
    puzzles: [/** @type {import('../engine/types.js').PackPuzzle} */ ({
      id: 'snapshot',
      clues: puzzle.clues,
      solution,
      rating: /** @type {RatingClaim | null} */ (puzzle.rating ?? null),
      certificate: /** @type {CertificateClaim | null} */ (puzzle.certificate ?? null),
    })],
  });
  const stored = pack.puzzles[0];
  /** @type {PuzzleCodeSnapshot} */
  const data = {
    rows: [...pack.board.rows],
    rotation: pack.presentation?.rotation ?? 0,
    pieces: pack.pieces,
    clues: stored.clues,
    solution: stored.solution ?? null,
    rating: stored.rating ?? null,
    certificate: stored.certificate ?? null,
    title: puzzleCodeTitle(puzzle.title, index, untitled),
  };
  deepFreeze(data);
  return Object.freeze({ data, heading: puzzleDisplayName(puzzle.title, index, untitled), key: JSON.stringify(data) });
}

/**
 * @typedef {object} PreparedListShare
 * @property {readonly string[]} codes The codes the link carries, in list order (cores only after `noTail`).
 * @property {string | null} url The complete Player address (`#p=<code>;<code>…`, with `&i=` for a later puzzle), or
 *   null when it exceeds the URL budget even without the stored answers.
 * @property {'C.T' | 'C'} carried What the link carries after the ladder.
 * @property {PuzzleQrMatrix | null} qr Null: the link does not fit one QR symbol.
 * @property {readonly ShareNotice[]} notices In the order of the ladder.
 */

/**
 * Prepares one link for several puzzles of a list, with the capacity ladder of `preparePuzzleShare`: the full codes
 * first, then the cores only (the stored answers left out of text and QR), then error correction L for the QR, then
 * no QR. The codes are made one after the other by `client` (it runs one operation at a time).
 * @param {readonly PuzzleSnapshot[]} snapshots The puzzles in list order.
 * @param {{ target: string, client: PuzzleCodeClientLike, index?: number }} options `index`: the puzzle to open.
 * @returns {Promise<PreparedListShare>}
 */
export async function preparePuzzleListShare(snapshots, options) {
  const { target, client } = options;
  const index = options.index ?? 0;
  if (snapshots.length === 0 || !Number.isInteger(index) || index < 0 || index >= snapshots.length) {
    throw new RangeError('There is no puzzle to share.');
  }
  /** @type {EncodedCode[]} */
  const encoded = [];
  for (const snapshot of snapshots) {
    const reply = await client.encode(snapshot.data);
    if (!reply.ok) {
      throw new PuzzleShareError('encode-failed', reply.issues[0]?.message ?? 'The puzzle code could not be made.', reply.issues);
    }
    encoded.push(reply.value);
  }
  /** @type {string} */
  let urlPrefix;
  try {
    const probe = puzzleCodeUrl(target, encoded[0].F);
    urlPrefix = probe.slice(0, probe.length - encoded[0].F.length);
  } catch (error) {
    throw new PuzzleShareError('target-invalid', error instanceof Error ? error.message : 'The Player address is not valid.');
  }
  const suffix = index > 0 ? `&i=${index}` : '';
  /** @param {readonly string[]} codes @returns {string | null} */
  const addressOf = (codes) => {
    const url = `${urlPrefix}${codes.join(';')}${suffix}`;
    return codes.length <= MAX_PUZZLE_CODES && url.length <= MAX_URL_CHARS ? url : null;
  };
  /**
   * @param {readonly string[]} codes
   * @param {'M' | 'L'} ec
   * @returns {{ url: string, qr: PuzzleQrMatrix } | null}
   */
  const attempt = (codes, ec) => {
    const url = addressOf(codes);
    if (url === null) {
      return null;
    }
    const made = makeListQr({ urlPrefix, codes, suffix, ec });
    if (made.ok) {
      return { url, qr: made.value };
    }
    if (made.code === 'qr-too-long') {
      return null;
    }
    throw new PuzzleShareError('qr-failed', made.message);
  };

  const hasTail = encoded.some((code) => code.T !== null);
  /** @type {ShareNotice[]} */
  const notices = [];
  let codes = encoded.map((code) => code.F);
  let fit = attempt(codes, 'M');
  if (fit === null && hasTail) {
    codes = encoded.map((code) => code.C);
    notices.push('noTail');
    fit = attempt(codes, 'M');
  }
  if (fit === null) {
    fit = attempt(codes, 'L');
    if (fit !== null) {
      notices.push('lowEc');
    }
  }
  if (fit === null) {
    notices.push('none');
  }
  return Object.freeze({
    codes: Object.freeze(codes),
    url: fit === null ? addressOf(codes) : fit.url,
    carried: codes.some((code) => code.includes('.')) ? 'C.T' : 'C',
    qr: fit === null ? null : fit.qr,
    notices: Object.freeze(notices),
  });
}

/**
 * @param {PuzzleSnapshot | null | undefined} a
 * @param {PuzzleSnapshot | null | undefined} b
 * @returns {boolean} Whether both describe the same code and the same printed heading.
 */
export function isSameSnapshot(a, b) {
  return a != null && b != null && a.key === b.key && a.heading === b.heading;
}

/**
 * The Player address a printout or link opens: the page's own Player (`../player/` of its address, right for GitHub
 * Pages, forks and a local page alike), so a printout and a link point at the page the user is on. Only a page that is
 * not http, https or file (no usable address) falls back to the configured public Player.
 * @param {string | URL} pageBase The address of the page that makes the printout (its base URL).
 * @returns {string}
 * @throws {RangeError} For a page address that is not a URL.
 */
export function puzzlePlayerTarget(pageBase) {
  /** @type {URL} */
  let base;
  try {
    base = new URL(String(pageBase));
  } catch {
    throw new RangeError('The page address is not a valid URL');
  }
  const usable = base.protocol === 'http:' || base.protocol === 'https:' || base.protocol === 'file:';
  try {
    return usable ? new URL('../player/', base).href : PUBLIC_PLAYER_URL;
  } catch {
    return PUBLIC_PLAYER_URL;
  }
}

/**
 * Prepares the code, the complete address and the QR symbol of a snapshot, following the approved capacity ladder:
 * the shortest encoding first; when the full code does not fit one QR symbol at level M, the optional tail is dropped
 * from both text and QR; when the core still does not fit, error correction L is used; when nothing fits, there is no
 * QR (the sheet then prints neither code nor QR) and the address carries the core only when it is within the URL
 * budget. Identity is never truncated, nothing leaves the page and no library fallback is invented.
 *
 * The code is made by `client` (a worker in the browser); an encoder or worker failure rejects with a
 * `PuzzleShareError` and is never reported as an oversize puzzle. An abort of the client rejects as the client's own
 * abort error, for the caller to ignore when it has moved on.
 * @param {PuzzleSnapshot} snapshot
 * @param {{ target: string, client: PuzzleCodeClientLike }} options
 * @returns {Promise<PreparedPuzzleShare>}
 */
export async function preparePuzzleShare(snapshot, options) {
  const { target, client } = options;
  const encoded = await client.encode(snapshot.data);
  if (!encoded.ok) {
    throw new PuzzleShareError('encode-failed', encoded.issues[0]?.message ?? 'The puzzle code could not be made.', encoded.issues);
  }
  const full = encoded.value;

  /**
   * @param {string} text
   * @returns {string | null} The complete address, or null when it exceeds the URL budget.
   */
  const addressOf = (text) => {
    let url;
    try {
      url = puzzleCodeUrl(target, text);
    } catch (error) {
      throw new PuzzleShareError('target-invalid', error instanceof Error ? error.message : 'The Player address is not valid.');
    }
    if (!url.endsWith(text)) {
      throw new PuzzleShareError('internal', 'The Player address does not end with the code.');
    }
    return url.length <= MAX_URL_CHARS ? url : null;
  };
  /**
   * @param {EncodedCode} code
   * @param {'M' | 'L'} ec
   * @returns {{ url: string, qr: PuzzleQrMatrix } | null} Null when the symbol or the address does not fit.
   */
  const attempt = (code, ec) => {
    const url = addressOf(code.F);
    if (url === null) {
      return null;
    }
    const made = makePuzzleQr({ urlPrefix: url.slice(0, url.length - code.F.length), code: code.F, ec });
    if (made.ok) {
      return { url, qr: made.value };
    }
    if (made.code === 'qr-too-long') {
      return null;
    }
    throw new PuzzleShareError('qr-failed', made.message);
  };

  /** @type {ShareNotice[]} */
  const notices = [];
  let code = full;
  let fit = attempt(code, 'M');
  if (fit === null && full.T !== null) {
    code = { C: full.C, T: null, F: full.C, version: full.version };
    notices.push('noTail');
    fit = attempt(code, 'M');
  }
  if (fit === null) {
    fit = attempt(code, 'L');
    if (fit !== null) {
      notices.push('lowEc');
    }
  }
  if (fit === null) {
    notices.push('none');
  }
  return Object.freeze({
    code: Object.freeze({ ...code }),
    url: fit === null ? addressOf(code.F) : fit.url,
    carried: code.T === null ? 'C' : 'C.T',
    qr: fit === null ? null : fit.qr,
    notices: Object.freeze(notices),
  });
}
