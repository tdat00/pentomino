// @ts-check
// The addresses puzzles travel in: `…/player/#p=<puzzle code>` for one puzzle, `#p=<code>;<code>…[&i=<n>]` for several.
// There is no other route into the Player (no pack link, no library link). Structure only: nothing here decodes a code.
import { normalizePuzzleCodeValue, parsePuzzleHash } from './puzzlecode-input.js';

/** @typedef {import('./types.js').Issue} Issue */

/** @template T @typedef {import('./types.js').Result<T>} Result */

/** Longest address a link may have: the page and its fragment. */
export const MAX_URL_CHARS = 16000;
/** Above this a link is still made, with a warning that some chat apps cut long links. */
export const WARN_URL_CHARS = 4000;

/**
 * @param {string} code
 * @param {string} message
 * @param {string} [path]
 * @returns {{ ok: false, issues: Issue[] }}
 */
function failure(code, message, path = '$') {
  return { ok: false, issues: [{ code, path, message }] };
}

/**
 * The hash that opens several puzzles: `#p=` and the canonical code of every puzzle, separated by `;`, and `&i=<index>`
 * when the puzzle to open is not the first.
 * @param {string[]} codes At least one puzzle code (`C` or `C.T`), as made or grouped.
 * @param {number} [index] The puzzle to open, one of the codes.
 * @returns {string}
 * @throws {RangeError} No code, or an index that names none.
 * @throws {import('./puzzlecode-input.js').PuzzleCodeError} A code has an unusable character, dots or length.
 */
export function puzzleListHash(codes, index = 0) {
  if (!Array.isArray(codes) || codes.length === 0) {
    throw new RangeError('At least one puzzle code is needed');
  }
  if (!Number.isInteger(index) || index < 0 || index >= codes.length) {
    throw new RangeError('The puzzle index must name one of the codes');
  }
  const canonical = codes.map((code) => normalizePuzzleCodeValue(code));
  return `#p=${canonical.join(';')}${index === 0 ? '' : `&i=${index}`}`;
}

/**
 * Address that opens several puzzles in the Player at `base`'s own `../player/` (see `puzzleListHash`). Length limits
 * are the caller's concern (`MAX_URL_CHARS`).
 * @param {string | URL} base Page base such as `document.baseURI`.
 * @param {string[]} codes
 * @param {number} [index]
 * @returns {string}
 * @throws {RangeError} No code, or an index that names none.
 * @throws {import('./puzzlecode-input.js').PuzzleCodeError} A code has an unusable character, dots or length.
 */
export function puzzleListUrl(base, codes, index = 0) {
  return `${new URL('../player/', base).href}${puzzleListHash(codes, index)}`;
}

/**
 * What an address carries: the `p` value (one puzzle code, or several separated by `;`) and the puzzle to open, which
 * is 0 for a single code.
 * @typedef {object} IncomingHash
 * @property {string} p Decoded once, not yet normalized.
 * @property {number} index
 */

/**
 * @param {string} body Hash without its leading `#`.
 * @returns {boolean}
 */
const bodyHasP = (body) => body.split('&').some((part) => part === 'p' || part.startsWith('p='));

/**
 * Whether the address uses the `p` key at all (valid or not). Key names are case-sensitive.
 * @param {string} hash With or without the leading `#`.
 * @returns {boolean}
 */
export function isPuzzleHash(hash) {
  return typeof hash === 'string' && bodyHasP(hash.startsWith('#') ? hash.slice(1) : hash);
}

/**
 * Parses a location hash with diagnostics. A hash without a `p` key (an empty one, or any other) has no puzzle data
 * (`no-incoming`). With a `p` key the whole hash goes to `parsePuzzleHash`, the one structural parser of that route
 * (index and mixed-key rules included); its `index` failure becomes `invalid-index` and its `invalid` failure
 * `invalid-hash`.
 * @param {string} hash With or without the leading `#`.
 * @returns {Result<IncomingHash>}
 */
export function parseLocationHashResult(hash) {
  if (typeof hash !== 'string') {
    return failure('invalid-hash', 'The location hash must be text');
  }
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!bodyHasP(body)) {
    return failure('no-incoming', 'The address has no puzzle data');
  }
  const route = parsePuzzleHash(`#${body}`);
  return route.ok
    ? { ok: true, value: { p: route.value.p, index: route.value.index }, warnings: [] }
    : failure(route.code === 'index' ? 'invalid-index' : 'invalid-hash', route.message);
}

/**
 * `#p=<puzzle code>[;<puzzle code>…][&i=<index>]`. Returns null when the hash carries none of them or is malformed.
 * @param {string} hash
 * @returns {IncomingHash | null}
 */
export function parseLocationHash(hash) {
  const result = parseLocationHashResult(hash);
  return result.ok ? result.value : null;
}

/**
 * Address of one puzzle for a Player the caller has already chosen: that target without its query and fragment,
 * then `#p=` and the canonical code (upper case, ungrouped). The target is a selected Player address, never the
 * page the caller is on; a `file:` target is for the explicit local developer override only (the caller supplies
 * it), and any other scheme, credentials or an unparsable target are refused. No `i` key is added: a code opens
 * exactly one puzzle. Length limits are the caller's concern: the complete address against `MAX_URL_CHARS`,
 * which is a different bound from the code's own 16,000 symbols.
 * @param {string | URL} playerTarget
 * @param {string} code A puzzle code as typed or grouped; `C` or `C.T`.
 * @returns {string}
 * @throws {RangeError} The target is not a usable Player address.
 * @throws {import('./puzzlecode-input.js').PuzzleCodeError} The code has an unusable character, dots or length.
 */
export function puzzleCodeUrl(playerTarget, code) {
  /** @type {URL} */
  let target;
  try {
    target = new URL(playerTarget);
  } catch {
    throw new RangeError('The Player address is not a valid URL');
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:' && target.protocol !== 'file:') {
    throw new RangeError('The Player address must be http, https or a local file');
  }
  if (target.username !== '' || target.password !== '') {
    throw new RangeError('The Player address must not contain credentials');
  }
  const canonical = normalizePuzzleCodeValue(code);
  target.search = '';
  target.hash = '';
  return `${target.href}#p=${canonical}`;
}
