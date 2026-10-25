// @ts-check
// Play hand-off between the independent generator and player pages: prepared links and one validated incoming loader.
// Links are the only way puzzles travel: there is no file import or export.
import {
  MAX_URL_CHARS, WARN_URL_CHARS, decodeShareCode, encodeShareCode, parseLocationHashResult, playerUrl,
} from '../engine/sharecode.js';
import { parsePack } from '../engine/pack.js';
import { normalizePuzzleCodeValue } from '../engine/puzzlecode-input.js';
import { createPuzzleCodeClient, failureFromCodeError } from './puzzle-code-client.js';
import { browserStorage } from './storage.js';

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
 * Injection points for tests; everything defaults to the browser.
 * @typedef {object} HandoffEnv
 * @property {string | URL} [base] Page base, default `document.baseURI`.
 * @property {Pick<import('./storage.js').Storage, 'saveLibraryPack' | 'loadLibraryPack'>} [storage]
 * @property {() => { location: { assign: (url: string) => void }, close: () => void, opener?: unknown } | null} [openTab]
 *   Opens a blank tab for `openInPlayerTab`; null when the browser refuses it. Default `window.open('about:blank')`.
 * @property {PuzzleDecode} [decodePuzzle] Decoder of `#p=` addresses and `readPuzzleCode`. Default: a puzzle-code client
 *   (one module worker) created for the call and disposed after it; a Player passes its own long-lived client.
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

/** @type {WeakMap<Pack, Promise<string | null>>} */
const encoded = new WeakMap();

/**
 * @param {Pack} pack
 * @returns {Promise<string | null>} The share code, or null when it cannot be made.
 */
function shareCodeOf(pack) {
  let pending = encoded.get(pack);
  if (!pending) {
    pending = encodeShareCode(pack).catch(() => null);
    encoded.set(pack, pending);
  }
  return pending;
}

/**
 * @param {HandoffEnv} env
 * @returns {string | URL | null}
 */
function baseOf(env) {
  return env.base ?? globalThis.document?.baseURI ?? null;
}

/**
 * Builds the player link for one puzzle without navigating. Portable
 * `#pack=` links are preferred; when the URL would exceed 16,000 characters
 * (or encoding fails) the pack is saved to the local library and, only after a
 * successful readback, a same-browser `#lib=` link is returned. If both fail
 * `href` is null and `warning` says why. `warning` is also set for portable
 * links above 4,000 characters.
 * @param {Pack} pack
 * @param {number} index
 * @param {HandoffEnv} [env]
 * @returns {Promise<{ href: string | null, portable: boolean, warning?: string }>}
 */
export async function preparePlayerLink(pack, index, env = {}) {
  if (!Number.isInteger(index) || index < 0 || index >= pack.puzzles.length) {
    return { href: null, portable: false, warning: 'This pack has no puzzle to open in the player.' };
  }
  const base = baseOf(env);
  if (base === null) {
    return { href: null, portable: false, warning: 'The player address could not be determined.' };
  }
  const code = await shareCodeOf(pack);
  if (code !== null) {
    try {
      const href = playerUrl(base, code, index);
      if (href.length <= MAX_URL_CHARS) {
        return href.length > WARN_URL_CHARS
          ? { href, portable: true, warning: `This link is ${href.length} characters long, and some chat apps cut long links.` }
          : { href, portable: true };
      }
    } catch {
      // Fall through to the local library.
    }
  }
  const store = env.storage ?? browserStorage();
  const saved = store.saveLibraryPack(pack);
  if (saved.ok && store.loadLibraryPack(saved.packId).ok) {
    try {
      return {
        href: playerUrl(base, saved.packId, index),
        portable: false,
        warning: 'This link only works in this browser and cannot be shared.',
      };
    } catch {
      // Fall through to the failure below.
    }
  }
  return {
    href: null,
    portable: false,
    warning: "This puzzle is too large for a link and can't be saved in this browser.",
  };
}

/**
 * Opens the player in a new tab. The tab is opened first, in the click's own turn, so pop-up blockers let it through,
 * and gets its address once the link is ready. Rejects with `HandoffError('handoff-unavailable')` when no link could be
 * prepared (the empty tab is closed) and with `HandoffError('popup-blocked')` when the browser refused the tab.
 * @param {Pack} pack
 * @param {number} index
 * @param {HandoffEnv} [env]
 * @returns {Promise<void>}
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
 * decoded in a worker. Like `readIncoming` it changes no application or storage state, so the caller commits after
 * success. A failure keeps the decoder's typed issues and, for a damaged tail, the validated core-only `recovery`
 * and any `candidate`; neither is ever opened here. A decoder that was cancelled rejects with its abort error.
 * @param {string} text
 * @param {HandoffEnv} [env]
 * @returns {Promise<Result<{ pack: Pack, index: number }>>}
 */
export async function readPuzzleCode(text, env = {}) {
  const decoded = await puzzleDecoder(env.decodePuzzle)(text);
  if (!decoded.ok) {
    return decoded;
  }
  const result = finish(decoded.value.pack, 0);
  return result.ok ? { ok: true, value: result.value, warnings: decoded.warnings } : result;
}

/**
 * The single incoming loader for `#pack=`, `#lib=` and `#p=` addresses. It returns
 * validated data and changes no application or storage state; callers commit
 * after success. Failure codes: `no-incoming`, `invalid-hash`, `invalid-code`,
 * `invalid-index`, `index-out-of-range`, `piece-set`, `library-missing`,
 * `library-mismatch`, and the codes of `decodeShareCode` / `parsePack`. A `#p=`
 * address (always puzzle 0, decoded by `env.decodePuzzle`) fails structurally as
 * `invalid-hash` or `invalid-index` (the host names of the route parser's
 * `invalid` and `index`), then with the codes of `readPuzzleCode`: the code's
 * own syntax and checksum codes, `tail-check`/`tail-tag`/`tail-invalid` with a
 * `recovery`, and `worker-unavailable` / `worker-error`. The value of `p` is
 * normalized as a bare code, never read as a link or decoded a second time.
 * @param {LocationLike} location
 * @param {HandoffEnv} [env]
 * @returns {Promise<Result<{ pack: Pack, index: number }>>}
 */
export async function readIncoming(location, env = {}) {
  const parsed = parseLocationHashResult(location?.hash ?? '');
  if (!parsed.ok) {
    return parsed;
  }
  const { pack: code, lib, p, index } = parsed.value;
  if (p !== undefined) {
    /** @type {string} */
    let normalized;
    try {
      normalized = normalizePuzzleCodeValue(p);
    } catch (error) {
      return failureFromCodeError(error);
    }
    return readPuzzleCode(normalized, env);
  }
  const loaded = code !== undefined
    ? await decodeShareCode(code)
    : (env.storage ?? browserStorage()).loadLibraryPack(/** @type {string} */ (lib));
  if (!loaded.ok) {
    return loaded;
  }
  const result = finish(loaded.value, index);
  return result.ok ? { ok: true, value: result.value, warnings: loaded.warnings } : result;
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
