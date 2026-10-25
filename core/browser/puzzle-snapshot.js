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
import { puzzleCodeTitle, puzzleDisplayName } from './puzzle-title.js';
import { makePuzzleQr } from './qr.js';

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
 * @typedef {'noTail' | 'lowEc' | 'none' | 'localTarget' | 'devTarget'} ShareNotice
 */

/**
 * @typedef {object} PreparedPuzzleShare
 * @property {EncodedCode} code The code as carried: without its tail T = null and F = C.
 * @property {string | null} url The complete Player address, or null when it exceeds the URL budget.
 * @property {'C.T' | 'C'} carried What `url` and the QR carry after the capacity ladder.
 * @property {PuzzleQrMatrix | null} qr Null: the sheet prints neither code nor QR.
 * @property {readonly ShareNotice[]} notices In order: the ladder's, then the target's.
 */

/** Where a printout or link opens when this page is not on the public web (a constant next to the share logic). */
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
 * @param {PuzzleSnapshot | null | undefined} a
 * @param {PuzzleSnapshot | null | undefined} b
 * @returns {boolean} Whether both describe the same code and the same printed heading.
 */
export function isSameSnapshot(a, b) {
  return a != null && b != null && a.key === b.key && a.heading === b.heading;
}

/**
 * @param {string} hostname A URL host: lower case, IPv6 in brackets.
 * @returns {number[] | null} The eight 16-bit groups of an IPv6 address, or null when it is not valid.
 */
function ipv6Groups(hostname) {
  let text = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  // A dotted IPv4 tail ("::ffff:127.0.0.1") is two groups.
  const dotted = /^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (dotted !== null) {
    const bytes = dotted.slice(2).map(Number);
    if (bytes.some((n) => n > 255)) {
      return null;
    }
    text = `${dotted[1]}${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) {
    return null;
  }
  /** @param {string} part @returns {number[] | null} */
  const read = (part) => {
    if (part === '') {
      return [];
    }
    const out = [];
    for (const group of part.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(group)) {
        return null;
      }
      out.push(Number.parseInt(group, 16));
    }
    return out;
  };
  const head = read(halves[0]);
  const tail = halves.length === 2 ? read(halves[1]) : [];
  if (head === null || tail === null) {
    return null;
  }
  if (halves.length === 1) {
    return head.length === 8 ? head : null;
  }
  const gap = 8 - head.length - tail.length;
  return gap < 1 ? null : [...head, ...new Array(gap).fill(0), ...tail];
}

/**
 * @param {number} a
 * @param {number} b
 * @returns {boolean} Whether the IPv4 address starting with these two bytes is loopback, private or link-local.
 */
function isLocalIpv4(a, b) {
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

/**
 * Whether a host names this machine or its own network. No DNS lookup: only the name and the address ranges count.
 * Case and one trailing DNS dot are ignored; an IPv4-mapped IPv6 address is judged by its IPv4 address.
 * @param {string} host A URL `hostname` (IPv6 in brackets is fine).
 * @returns {boolean}
 */
export function isLocalHost(host) {
  const name = host.toLowerCase().replace(/\.$/, '');
  if (name === 'localhost' || name.endsWith('.localhost') || name.endsWith('.local')) {
    return true;
  }
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(name);
  if (v4 !== null) {
    const bytes = v4.slice(1).map(Number);
    return bytes.every((n) => n <= 255) && isLocalIpv4(bytes[0], bytes[1]);
  }
  if (!name.includes(':')) {
    return false;
  }
  const groups = ipv6Groups(name);
  if (groups === null) {
    return false;
  }
  if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) {
    return true;
  }
  if ((groups[0] & 0xfe00) === 0xfc00 || (groups[0] & 0xffc0) === 0xfe80) {
    return true;
  }
  return groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff && isLocalIpv4(groups[6] >> 8, groups[6] & 0xff);
}

/**
 * The Player address a printout or link opens. A page on the public web points at its own Player (`../player/`, right
 * for GitHub Pages and forks); a local page (localhost, a private or link-local address, `file:` or any other
 * non-http(s) page) points at the configured public Player, because a phone cannot reach the developer's machine.
 * `useThisPage` is the dialog's developer override: on a local page only, the page's own Player is used and the result
 * says so. Copy link calls this without the override.
 * @param {string | URL} pageBase The address of the page that makes the printout (its base URL).
 * @param {{ useThisPage?: boolean }} [options]
 * @returns {{ target: string, local: boolean, notice: null | 'localTarget' | 'devTarget' }}
 * @throws {RangeError} For a page address that is not a URL.
 */
export function puzzlePlayerTarget(pageBase, options = {}) {
  /** @type {URL} */
  let base;
  try {
    base = new URL(String(pageBase));
  } catch {
    throw new RangeError('The page address is not a valid URL');
  }
  /** @type {string | null} */
  let own = null;
  try {
    own = new URL('../player/', base).href;
  } catch {
    own = null;
  }
  const web = base.protocol === 'http:' || base.protocol === 'https:';
  if (web && !isLocalHost(base.hostname) && own !== null) {
    return { target: own, local: false, notice: null };
  }
  const usable = own !== null && (base.protocol === 'http:' || base.protocol === 'https:' || base.protocol === 'file:');
  if (options.useThisPage === true && usable) {
    return { target: /** @type {string} */ (own), local: true, notice: 'devTarget' };
  }
  return { target: PUBLIC_PLAYER_URL, local: true, notice: 'localTarget' };
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
 * @param {{ target: string, client: PuzzleCodeClientLike, targetNotice?: 'localTarget' | 'devTarget' | null }} options
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
  if (options.targetNotice === 'localTarget' || options.targetNotice === 'devTarget') {
    notices.push(options.targetNotice);
  }
  return Object.freeze({
    code: Object.freeze({ ...code }),
    url: fit === null ? addressOf(code.F) : fit.url,
    carried: code.T === null ? 'C' : 'C.T',
    qr: fit === null ? null : fit.qr,
    notices: Object.freeze(notices),
  });
}
