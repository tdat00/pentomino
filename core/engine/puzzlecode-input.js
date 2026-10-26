// @ts-check
// Single-puzzle code input handling: the `#p=` hash parser and the two input
// normalizers. Structural text work only: no catalogue, no compression, no
// codec implementation and no browser side effect, so every host can import it
// cheaply. The typed error class of the whole puzzle-code family lives here.

/** Crockford-style base32 alphabet; `I`, `L`, `O` and `U` are not symbols. */
export const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Longest accepted input text (a pasted link, a clipboard text or typed code). */
export const MAX_INPUT_CHARS = 32768;
/** Longest normalized code, counted in symbols (the dot is not a symbol). */
export const MAX_CODE_SYMBOLS = 16000;

const HASH_INDEX = /^(?:0|[1-9][0-9]{0,5})$/;

/** Developer-facing default texts; apps show their own localized texts by `code`. */
const MESSAGES = Object.freeze({
  empty: 'Type or paste a puzzle code.',
  'bad-char': 'The code contains a character that puzzle codes never use.',
  dots: 'A puzzle code has at most one ".".',
  'too-long': 'This code is too long.',
  'core-check': 'The code has a typing error.',
  version: 'This puzzle code needs a newer version.',
  'no-deflate': 'This browser cannot open compressed puzzle codes.',
  invalid: 'This code does not describe a valid puzzle.',
  index: 'The puzzle number in the link does not name one of its puzzles; fix or remove it.',
});

/**
 * @typedef {object} CodeCandidate
 * @property {'core' | 'tail'} component
 * @property {number} group One-based group of four symbols within the component.
 * @property {number} position One-based position within the group.
 * @property {string} expected The symbol the correction proposes.
 * @property {string} typed The symbol that was typed.
 * @property {string} correctedCode Complete normalized code with the correction applied.
 */

/**
 * Typed failure of the puzzle-code family. `code` is one of `empty`, `bad-char`,
 * `dots`, `too-long`, `core-check`, `version`, `no-deflate`, `invalid` or
 * `index`; `params` holds message values such as `{ char }`; a `core-check`
 * failure may carry one unique `candidate` correction, which is never applied.
 */
export class PuzzleCodeError extends Error {
  /**
   * @param {string} code
   * @param {string} [message]
   * @param {{ params?: Record<string, string | number>, candidate?: CodeCandidate }} [options]
   */
  constructor(code, message, options = {}) {
    super(message ?? /** @type {Record<string, string>} */ (MESSAGES)[code] ?? code);
    this.name = 'PuzzleCodeError';
    this.code = code;
    if (options.params !== undefined) {
      this.params = options.params;
    }
    if (options.candidate !== undefined) {
      this.candidate = options.candidate;
    }
  }
}

/**
 * Structural extraction of the `p` route: no puzzle is decoded and no catalogue
 * is built. The value is URI-decoded exactly once and returned unnormalized. It
 * may hold several puzzle codes separated by `;`; `index` is then the puzzle to
 * open (`i`), which must name one of them. For one code `i` can only be 0.
 * @param {string} hash With or without `#`, or a whole pasted link.
 * @returns {{ ok: true, value: { p: string, index: number } }
 *   | { ok: false, code: 'index' | 'invalid', message: string }}
 */
export function parsePuzzleHash(hash) {
  /** @param {'index' | 'invalid'} code @param {string} message */
  const fail = (code, message) => ({ ok: /** @type {const} */ (false), code, message });
  if (typeof hash !== 'string') {
    return fail('invalid', 'The address must be text.');
  }
  const at = hash.indexOf('#');
  const body = at < 0 ? hash : hash.slice(at + 1);
  /** @type {Map<string, string>} */
  const found = new Map();
  for (const part of body.split('&')) {
    const eq = part.indexOf('=');
    const key = eq < 0 ? part : part.slice(0, eq);
    if (key !== 'p' && key !== 'pack' && key !== 'lib' && key !== 'i') {
      continue;
    }
    if (found.has(key)) {
      return fail('invalid', `The address repeats "${key}".`);
    }
    found.set(key, eq < 0 ? '' : part.slice(eq + 1));
  }
  const rawP = found.get('p');
  if (rawP === undefined || rawP === '') {
    return fail('invalid', 'The address has no puzzle code.');
  }
  if (found.has('pack') || found.has('lib')) {
    return fail('invalid', 'The address mixes a puzzle code with a pack or library reference.');
  }
  const rawIndex = found.get('i');
  /** Raw `p` that can carry several codes: a literal `;` or an encoded one, which decodes to `;` only after the index is judged. */
  const mayBeList = /;|%3b/i.test(rawP);
  let index = 0;
  if (rawIndex !== undefined && rawIndex !== '0') {
    if (!HASH_INDEX.test(rawIndex)) {
      return fail('invalid', 'The puzzle number in the address is not valid.');
    }
    if (!mayBeList) {
      return fail('index', MESSAGES.index);
    }
    index = Number(rawIndex);
  }
  let p;
  try {
    p = decodeURIComponent(rawP);
  } catch {
    return fail('invalid', 'The puzzle code in the address is not valid percent-encoding.');
  }
  if (p === '') {
    return fail('invalid', 'The address has no puzzle code.');
  }
  if (index > 0 && index >= splitPuzzleCodes(p).length) {
    return fail('index', MESSAGES.index);
  }
  return { ok: true, value: { p, index } };
}

/** Most puzzles one address or pasted text may carry: the size of a pack. */
export const MAX_PUZZLE_CODES = 100;

/**
 * The codes of a `p` value: puzzle codes separated by `;`, in order. Spaces around a code and empty pieces (a trailing
 * `;`) are dropped. Nothing is normalized or checked here.
 * @param {string} value
 * @returns {string[]}
 */
export function splitPuzzleCodes(value) {
  return value.split(';').map((piece) => piece.trim()).filter((piece) => piece !== '');
}

/**
 * Whether a `p` value (decoded) is a list of puzzles rather than one.
 * @param {string} value
 * @returns {boolean}
 */
export function isPuzzleCodeList(value) {
  return value.includes(';');
}

/**
 * Whether the address carries several puzzles: a `p` key whose value has a `;`. Structural only; a malformed address is not a list.
 * @param {string} hash With or without `#`.
 * @returns {boolean}
 */
export function isPuzzleListHash(hash) {
  const parsed = parsePuzzleHash(hash);
  return parsed.ok && splitPuzzleCodes(parsed.value.p).length > 1;
}

/**
 * Normalizes every code of a `p` value (see `splitPuzzleCodes`).
 * @param {string} value
 * @returns {string[]} At least one normalized code.
 * @throws {PuzzleCodeError} `empty`, `too-long` (more than `MAX_PUZZLE_CODES` codes, or too much text) or the error of a code.
 */
export function normalizePuzzleCodeList(value) {
  if (typeof value !== 'string') {
    throw new PuzzleCodeError('empty');
  }
  if (value.length > MAX_INPUT_CHARS) {
    throw new PuzzleCodeError('too-long');
  }
  const pieces = splitPuzzleCodes(value);
  if (pieces.length === 0) {
    throw new PuzzleCodeError('empty');
  }
  if (pieces.length > MAX_PUZZLE_CODES) {
    throw new PuzzleCodeError('too-long');
  }
  return pieces.map((piece) => normalizePuzzleCodeValue(piece));
}

/**
 * Canonical symbol of a typed character, or null. ASCII letters are
 * upper-cased by hand so that no locale rule or other script maps onto one.
 * @param {string} ch
 * @returns {string | null}
 */
function symbolOf(ch) {
  let c = ch;
  if (c >= 'a' && c <= 'z') {
    c = String.fromCharCode(c.charCodeAt(0) - 32);
  }
  if (c === 'O') {
    return '0';
  }
  if (c === 'I' || c === 'L') {
    return '1';
  }
  return c.length === 1 && ALPHABET.includes(c) ? c : null;
}

/**
 * Removes grouping (spaces, tabs, line breaks, `-`), upper-cases, maps
 * O→0 and I/L→1 and validates the alphabet. Never parses a hash and never
 * URI-decodes again. At most one `.` is kept.
 * @param {string} value
 * @returns {string} Symbols with at most one dot; never empty.
 * @throws {PuzzleCodeError} `empty`, `bad-char`, `dots` or `too-long`.
 */
export function normalizePuzzleCodeValue(value) {
  if (typeof value !== 'string') {
    throw new PuzzleCodeError('empty');
  }
  if (value.length > MAX_INPUT_CHARS) {
    throw new PuzzleCodeError('too-long');
  }
  let out = '';
  let symbols = 0;
  let dots = 0;
  for (const ch of value) {
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '-') {
      continue;
    }
    if (ch === '.') {
      dots += 1;
      if (dots > 1) {
        throw new PuzzleCodeError('dots');
      }
      out += '.';
      continue;
    }
    const symbol = symbolOf(ch);
    if (symbol === null) {
      throw new PuzzleCodeError('bad-char', `The code contains "${ch}", which puzzle codes never use.`, { params: { char: ch } });
    }
    symbols += 1;
    if (symbols > MAX_CODE_SYMBOLS) {
      throw new PuzzleCodeError('too-long');
    }
    out += symbol;
  }
  if (symbols === 0) {
    throw new PuzzleCodeError('empty');
  }
  return out;
}

/**
 * Normalizes typed, pasted or scanned text: a link (text containing `#`) goes
 * through `parsePuzzleHash` and its decoded `p` value; anything else is a bare
 * code. The result is only characters and at most one dot; its content is
 * checked later by the decoder.
 * @param {string} text
 * @returns {string}
 * @throws {PuzzleCodeError} `empty`, `bad-char`, `dots`, `too-long`, `index` or `invalid`.
 */
export function normalizePuzzleCodeInput(text) {
  if (typeof text !== 'string') {
    throw new PuzzleCodeError('empty');
  }
  if (text.length > MAX_INPUT_CHARS) {
    throw new PuzzleCodeError('too-long');
  }
  const trimmed = text.trim();
  if (trimmed.includes('#')) {
    const parsed = parsePuzzleHash(trimmed);
    if (!parsed.ok) {
      throw new PuzzleCodeError(parsed.code, parsed.message);
    }
    return normalizePuzzleCodeValue(parsed.value.p);
  }
  return normalizePuzzleCodeValue(trimmed);
}

/**
 * Like `normalizePuzzleCodeInput`, for text that may carry several puzzles: a link's decoded `p` value or a bare text,
 * its codes separated by `;`.
 * @param {string} text
 * @returns {{ codes: string[], index: number }} The normalized codes and the puzzle to open (0 for a bare text).
 * @throws {PuzzleCodeError} As `normalizePuzzleCodeInput`, and `index` when the link's puzzle number names no code.
 */
export function normalizePuzzleCodeText(text) {
  if (typeof text !== 'string') {
    throw new PuzzleCodeError('empty');
  }
  if (text.length > MAX_INPUT_CHARS) {
    throw new PuzzleCodeError('too-long');
  }
  const trimmed = text.trim();
  if (trimmed.includes('#')) {
    const parsed = parsePuzzleHash(trimmed);
    if (!parsed.ok) {
      throw new PuzzleCodeError(parsed.code, parsed.message);
    }
    return { codes: normalizePuzzleCodeList(parsed.value.p), index: parsed.value.index };
  }
  return { codes: normalizePuzzleCodeList(trimmed), index: 0 };
}
