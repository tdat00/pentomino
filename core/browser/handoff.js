// @ts-check
// Play hand-off between the independent generator and player pages: prepared links and one validated incoming loader.
// Links are the only way puzzles travel: there is no file import or export. A link carries puzzle codes: one `#p=` code
// per puzzle, separated by `;`. There is no other kind of link.
import {
  MAX_URL_CHARS, WARN_URL_CHARS, parseLocationHashResult, puzzleListUrl,
} from '../engine/sharecode.js';
import { parsePack } from '../engine/pack.js';
import {
  MAX_PUZZLE_CODES, isPuzzleCodeList, normalizePuzzleCodeList, normalizePuzzleCodeValue, parsePuzzleHash,
} from '../engine/puzzlecode-input.js';
import { createPuzzleCodeClient, failureFromCodeError } from './puzzle-code-client.js';
import { puzzleSnapshot } from './puzzle-snapshot.js';

/** @typedef {import('../engine/types.js').Pack} Pack */
/** @typedef {import('../engine/types.js').Issue} Issue */
/** @typedef {import('./puzzle-code-client.js').CodeResult<import('./puzzle-code-client.js').DecodedPuzzleCode>} DecodedCodeResult */

/** @template T @typedef {import('../engine/types.js').Result<T>} Result */

/** @typedef {{ hash: string }} LocationLike */

/**
 * Decodes one puzzle code to a validated one-puzzle pack in a worker; see `createPuzzleCodeClient().decode`.
 * @typedef {(text: string) => Promise<DecodedCodeResult>} PuzzleDecode
 */

/**
 * Encodes the snapshot of one puzzle to its code in a worker; see `createPuzzleCodeClient().encode`.
 * @typedef {(data: import('../engine/puzzlecode.js').PuzzleCodeSnapshot) => Promise<import('./puzzle-code-client.js').CodeResult<import('../engine/puzzlecode.js').EncodedPuzzleCode>>} PuzzleEncode
 */

/**
 * Injection points for tests; everything defaults to the browser.
 * @typedef {object} HandoffEnv
 * @property {string | URL} [base] Page base, default `document.baseURI`.
 * @property {() => { location: { assign: (url: string) => void }, close: () => void, opener?: unknown } | null} [openTab]
 *   Opens a blank tab for `openInPlayerTab`; null when the browser refuses it. Default `window.open('about:blank')`.
 * @property {PuzzleDecode} [decodePuzzle] Decoder of `#p=` addresses and `readPuzzleCode`. Default: a puzzle-code client
 *   (one module worker) created for the call and disposed after it; a Player passes its own long-lived client.
 * @property {PuzzleEncode} [encodePuzzle] Encoder of the codes of a Play link. Default: a puzzle-code client created
 *   for the call and disposed after it.
 * @property {(n: number) => string} [untitled] Label of an untitled puzzle "Puzzle #n" in the sender's language, for
 *   the heading a code carries (English by default).
 */

export const PIECE_SET_MESSAGE = 'This link has pieces but no puzzle — open it in the generator.';

export class HandoffError extends Error {
  /**
   * @param {string} code `handoff-unavailable` | `invalid-index`
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'HandoffError';
    this.code = code;
  }
}

/**
 * @param {HandoffEnv} env
 * @returns {string | URL | null}
 */
function baseOf(env) {
  return env.base ?? globalThis.document?.baseURI ?? null;
}

/**
 * The code of puzzles of the pack, as Print and Copy this puzzle link make it (`puzzleSnapshot`, in the worker), at
 * the angle of the pack. The codes are made one after the other: a client runs one operation at a time.
 * @param {Pack} pack
 * @param {HandoffEnv} env
 * @param {number[]} [indexes] The puzzles to encode, in order; every puzzle by default.
 * @returns {Promise<string[] | null>} Null when a code cannot be made (no worker, an encoder failure, an invalid pack).
 */
export async function puzzleCodesOf(pack, env, indexes = pack.puzzles.map((_, at) => at)) {
  /** @type {import('./puzzle-code-client.js').PuzzleCodeClient | null} */
  let own = null;
  try {
    /** @type {PuzzleEncode} */
    let encode;
    if (env.encodePuzzle === undefined) {
      const client = createPuzzleCodeClient();
      own = client;
      encode = (data) => client.encode(data);
    } else {
      encode = env.encodePuzzle;
    }
    const rotation = pack.presentation?.rotation ?? 0;
    /** @type {string[]} */
    const codes = [];
    for (const at of indexes) {
      const snapshot = puzzleSnapshot({
        rows: pack.board.rows, pieces: pack.pieces, puzzle: pack.puzzles[at], index: at, rotation,
        ...(env.untitled === undefined ? {} : { untitled: env.untitled }),
      });
      const encoded = await encode(snapshot.data);
      if (!encoded.ok) {
        return null;
      }
      codes.push(encoded.value.F);
    }
    return codes;
  } catch {
    return null;
  } finally {
    own?.dispose();
  }
}

/**
 * @param {string} href
 * @returns {{ href: string, portable: true, warning?: string }}
 */
function portableLink(href) {
  return href.length > WARN_URL_CHARS
    ? { href, portable: true, warning: `This link is ${href.length} characters long, and some chat apps cut long links.` }
    : { href, portable: true };
}

/**
 * Builds the player link for the puzzles of a pack without navigating: `#p=` with the code of every puzzle, separated
 * by `;`, and `&i=` when the puzzle to open is not the first. When that URL would exceed 16,000 characters (or the pack
 * has more than 100 puzzles) the link carries only the puzzle to open, and `only` says so. If a code cannot be made or
 * even that link is too long, `href` is null and `warning` says why. `warning` is also set for links above 4,000
 * characters.
 * @param {Pack} pack
 * @param {number} index
 * @param {HandoffEnv} [env]
 * @returns {Promise<{ href: string | null, portable: boolean, only?: boolean, warning?: string }>}
 */
export async function preparePlayerLink(pack, index, env = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= pack.puzzles.length) {
    return { href: null, portable: false, warning: 'This pack has no puzzle to open in the player.' };
  }
  const base = baseOf(env);
  if (base === null) {
    return { href: null, portable: false, warning: 'The player address could not be determined.' };
  }
  if (pack.puzzles.length > 1 && pack.puzzles.length <= MAX_PUZZLE_CODES) {
    const codes = await puzzleCodesOf(pack, env);
    if (codes === null) {
      return { href: null, portable: false, warning: 'The puzzle codes could not be made.' };
    }
    try {
      const href = puzzleListUrl(base, codes, index);
      if (href.length <= MAX_URL_CHARS) {
        return portableLink(href);
      }
    } catch {
      // Fall through to the one puzzle.
    }
  }
  const alone = await puzzleCodesOf(pack, env, [index]);
  if (alone === null) {
    return { href: null, portable: false, warning: 'The puzzle codes could not be made.' };
  }
  try {
    const href = puzzleListUrl(base, alone, 0);
    if (href.length <= MAX_URL_CHARS) {
      return pack.puzzles.length > 1 ? { ...portableLink(href), only: true } : portableLink(href);
    }
  } catch {
    // Fall through to the failure below.
  }
  return { href: null, portable: false, warning: 'This puzzle is too large for a link.' };
}

/**
 * Opens the player in a new tab. The tab is opened first, in the click's own turn, so pop-up blockers let it through,
 * and gets its address once the link is ready. Rejects with `HandoffError('handoff-unavailable')` when no link could be
 * prepared (the empty tab is closed) and with `HandoffError('popup-blocked')` when the browser refused the tab.
 * @param {Pack} pack
 * @param {number} index
 * @param {HandoffEnv} [env]
 * @returns {Promise<{ only: boolean }>} `only`: the list was too long for one link, so only the puzzle to open went.
 */
export async function openInPlayerTab(pack, index, env = {}) {
  const tab = (env.openTab ?? (() => globalThis.open('about:blank', '_blank')))();
  if (tab === null || tab === undefined) {
    throw new HandoffError('popup-blocked', 'The browser blocked the new tab.');
  }
  try {
    tab.opener = null;
  } catch {
    // The tab still opens; it just keeps its link to this page.
  }
  try {
    const link = await preparePlayerLink(pack, index, env);
    if (link.href === null) {
      throw new HandoffError('handoff-unavailable', link.warning ?? 'The player could not be opened.');
    }
    tab.location.assign(link.href);
    return { only: link.only === true };
  } catch (error) {
    tab.close();
    throw error;
  }
}

/**
 * @param {Pack} pack
 * @param {number} index
 * @returns {Result<{ pack: Pack, index: number }>}
 */
function finish(pack, index) {
  if (pack.puzzles.length === 0) {
    return { ok: false, issues: [{ code: 'piece-set', path: '$', message: PIECE_SET_MESSAGE }] };
  }
  if (index >= pack.puzzles.length) {
    return {
      ok: false,
      issues: [{
        code: 'index-out-of-range',
        path: '$',
        message: `The address asks for puzzle ${index + 1}, but the pack has ${pack.puzzles.length}.`,
      }],
    };
  }
  return { ok: true, value: { pack, index }, warnings: [] };
}

/**
 * @param {PuzzleDecode | undefined} decode
 * @returns {PuzzleDecode}
 */
function puzzleDecoder(decode) {
  if (decode !== undefined) {
    return decode;
  }
  return async (text) => {
    const client = createPuzzleCodeClient();
    try {
      return await client.decode(text);
    } finally {
      client.dispose();
    }
  };
}

/**
 * Opens one typed, pasted or scanned puzzle code (a bare or grouped code, or a link with `#p=`) as a one-puzzle pack,
 * decoded in a worker; text with several codes separated by `;` opens them all as one pack (see `readPuzzleCodeList`).
 * Like `readIncoming` it changes no application or storage state, so the caller commits after
 * success. A failure keeps the decoder's typed issues and, for a damaged tail, the validated core-only `recovery`
 * and any `candidate`; neither is ever opened here. A decoder that was cancelled rejects with its abort error.
 * @param {string} text
 * @param {HandoffEnv} [env]
 * @returns {Promise<Result<{ pack: Pack, index: number }>>}
 */
export async function readPuzzleCode(text, env = {}) {
  const list = listIn(text);
  if (list !== null) {
    return readPuzzleCodeList(list.p, list.index, env);
  }
  const decoded = await puzzleDecoder(env.decodePuzzle)(text);
  if (!decoded.ok) {
    return decoded;
  }
  const result = finish(decoded.value.pack, 0);
  return result.ok ? { ok: true, value: result.value, warnings: decoded.warnings } : result;
}

/**
 * @param {string} text A typed or pasted text, or a link.
 * @returns {{ p: string, index: number } | null} The `p` value and the puzzle number when the text carries several
 *   codes (a `;`); null for one code, and for a link that is not a `p` route (the decoder reports that).
 */
function listIn(text) {
  const trimmed = text.trim();
  let p = trimmed;
  let index = 0;
  if (trimmed.includes('#')) {
    const route = parsePuzzleHash(trimmed);
    if (!route.ok) {
      return null;
    }
    p = route.value.p;
    index = route.value.index;
  }
  return isPuzzleCodeList(p) ? { p, index } : null;
}

/**
 * @param {import('./puzzle-code-client.js').CodeFailure | Result<never>} failure The failure of the code at `at`.
 * @param {number} at Zero-based position of the code.
 * @returns {Result<never>} The same issues, named by the code's place (`$.p[at]`); the recovery and the correction of
 *   a single code are not offered for a list.
 */
function atPuzzle(failure, at) {
  const issues = /** @type {Issue[]} */ (failure.issues);
  return { ok: false, issues: issues.map((issue) => ({ ...issue, path: `$.p[${at}]` })) };
}

/**
 * The puzzles of one `p` value with several codes as one pack, in the order of the codes, `index` being the one to
 * open. Every code opens through the decoder as a one-puzzle pack; the packs must have the same board and piece set,
 * and no puzzle may repeat. The angle of the first code is the pack's.
 * @param {string} p Decoded `p` value, the codes separated by `;`.
 * @param {number} index
 * @param {HandoffEnv} [env]
 * @returns {Promise<Result<{ pack: Pack, index: number }>>}
 */
async function readPuzzleCodeList(p, index, env = {}) {
  /** @type {string[]} */
  let codes;
  try {
    codes = normalizePuzzleCodeList(p);
  } catch (error) {
    return failureFromCodeError(error);
  }
  if (index >= codes.length) {
    return { ok: false, issues: [{ code: 'invalid-index', path: '$', message: `The address asks for puzzle ${index + 1}, but it carries ${codes.length}.` }] };
  }
  /** @type {import('./puzzle-code-client.js').PuzzleCodeClient | null} */
  let own = null;
  try {
    /** @type {PuzzleDecode} */
    let decode;
    if (env.decodePuzzle === undefined) {
      const client = createPuzzleCodeClient();
      own = client;
      decode = (text) => client.decode(text);
    } else {
      decode = env.decodePuzzle;
    }
    /** @type {Pack[]} */
    const packs = [];
    /** @type {Issue[]} */
    const warnings = [];
    for (const [at, code] of codes.entries()) {
      const decoded = await decode(code);
      if (!decoded.ok) {
        return atPuzzle(decoded, at);
      }
      packs.push(decoded.value.pack);
      warnings.push(...decoded.warnings);
    }
    const [first] = packs;
    const frame = JSON.stringify([first.board, first.pieces]);
    /** @type {Map<string, number>} */
    const seen = new Map();
    for (const [at, pack] of packs.entries()) {
      if (JSON.stringify([pack.board, pack.pieces]) !== frame) {
        return atPuzzle({ ok: false, issues: [{ code: 'invalid', path: '$', message: `Puzzle ${at + 1} is for another board or piece set than puzzle 1.` }] }, at);
      }
      const id = pack.puzzles[0].id;
      const before = seen.get(id);
      if (before !== undefined) {
        return atPuzzle({ ok: false, issues: [{ code: 'invalid', path: '$', message: `Puzzle ${at + 1} repeats puzzle ${before + 1}.` }] }, at);
      }
      seen.set(id, at);
    }
    const result = finish({ ...first, puzzles: packs.map((pack) => pack.puzzles[0]) }, index);
    return result.ok ? { ok: true, value: result.value, warnings } : result;
  } finally {
    own?.dispose();
  }
}

/**
 * The single incoming loader for `#p=` addresses. It returns validated data and changes no application or storage state;
 * callers commit after success. Failure codes: `no-incoming` (a hash without `p`), `invalid-hash`, `invalid-index`,
 * `index-out-of-range`, `piece-set`, and the codes of `readPuzzleCode`. A `#p=`
 * address (puzzle 0 for one code, decoded by `env.decodePuzzle`; with several codes
 * separated by `;`, one pack of them, opened at `i`) fails structurally as
 * `invalid-hash` or `invalid-index` (the host names of the route parser's
 * `invalid` and `index`), then with the codes of `readPuzzleCode`: the code's
 * own syntax and checksum codes, `tail-check`/`tail-tag`/`tail-invalid` with a
 * `recovery` (for one code only), and `worker-unavailable` / `worker-error`. The
 * value of `p` is normalized as a bare code, never read as a link or decoded a
 * second time.
 * @param {LocationLike} location
 * @param {HandoffEnv} [env]
 * @returns {Promise<Result<{ pack: Pack, index: number }>>}
 */
export async function readIncoming(location, env = {}) {
  const parsed = parseLocationHashResult(location?.hash ?? '');
  if (!parsed.ok) {
    return parsed;
  }
  const { p, index } = parsed.value;
  if (isPuzzleCodeList(p)) {
    return readPuzzleCodeList(p, index, env);
  }
  /** @type {string} */
  let normalized;
  try {
    normalized = normalizePuzzleCodeValue(p);
  } catch (error) {
    return failureFromCodeError(error);
  }
  return readPuzzleCode(normalized, env);
}

/**
 * Reads pack JSON shipped with the page (the sample) and opens its first puzzle.
 * @param {string} text
 * @returns {Result<{ pack: Pack, index: number }>}
 */
export function readPack(text) {
  const parsed = parsePack(text);
  if (!parsed.ok) {
    return parsed;
  }
  const result = finish(parsed.value, 0);
  return result.ok ? { ok: true, value: result.value, warnings: parsed.warnings } : result;
}
