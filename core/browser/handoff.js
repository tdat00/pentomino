// @ts-check
// Play hand-off between the independent generator and player pages: prepared
// links, one validated incoming loader, and pack downloads.
import {
  MAX_URL_CHARS, WARN_URL_CHARS, decodeShareCode, encodeShareCode, extractCode, parseLocationHashResult, playerUrl,
} from '../engine/sharecode.js';
import { MAX_FILE_BYTES, PackError, parsePack, serializePack } from '../engine/pack.js';
import { downloadText, safeFileName } from './dom.js';
import { browserStorage } from './storage.js';

/** @typedef {import('../engine/types.js').Pack} Pack */
/** @typedef {import('../engine/types.js').Issue} Issue */

/** @template T @typedef {import('../engine/types.js').Result<T>} Result */

/** @typedef {{ hash: string }} LocationLike */

/**
 * Injection points for tests; everything defaults to the browser.
 * @typedef {object} HandoffEnv
 * @property {string | URL} [base] Page base, default `document.baseURI`.
 * @property {Pick<import('./storage.js').Storage, 'saveLibraryPack' | 'loadLibraryPack'>} [storage]
 * @property {{ assign: (url: string) => void }} [location] Navigation target for `openInPlayer`.
 */

export const PIECE_SET_MESSAGE = 'This file has pieces but no puzzle — open it in the generator.';

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
 * `href` is null and `warning` explains the Download / Open player fallback.
 * `warning` is also set for portable links above 4,000 characters.
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
          ? {
            href,
            portable: true,
            warning: `This link is ${href.length} characters long and some chat apps cut long links — use Export file to share it reliably.`,
          }
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
        warning: 'This link only works in this browser and is not shareable — use Export file to share the puzzle.',
      };
    } catch {
      // Fall through to the download fallback.
    }
  }
  return {
    href: null,
    portable: false,
    warning: "This puzzle is too large for a link and can't be saved in this browser — use Download, then Import file in the player.",
  };
}

/**
 * Same-tab navigation to the player. A portable hand-off also tries to save
 * the pack to the library (best effort) so Recent works. Rejects with
 * `HandoffError('handoff-unavailable')` when no link could be prepared; the
 * caller then offers Download and Open player instead of claiming success.
 * Save generator state before calling.
 * @param {Pack} pack
 * @param {number} index
 * @param {HandoffEnv} [env]
 * @returns {Promise<void>}
 */
export async function openInPlayer(pack, index, env = {}) {
  const link = await preparePlayerLink(pack, index, env);
  if (link.href === null) {
    throw new HandoffError('handoff-unavailable', link.warning ?? 'The player could not be opened.');
  }
  if (link.portable) {
    (env.storage ?? browserStorage()).saveLibraryPack(pack);
  }
  (env.location ?? globalThis.location).assign(link.href);
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
 * The single incoming loader for `#pack=` and `#lib=` addresses. It returns
 * validated data and changes no application or storage state; callers commit
 * after success. Failure codes: `no-incoming`, `invalid-hash`, `invalid-code`,
 * `invalid-index`, `index-out-of-range`, `piece-set`, `library-missing`,
 * `library-mismatch`, and the codes of `decodeShareCode` / `parsePack`.
 * @param {LocationLike} location
 * @param {HandoffEnv} [env]
 * @returns {Promise<Result<{ pack: Pack, index: number }>>}
 */
export async function readIncoming(location, env = {}) {
  const parsed = parseLocationHashResult(location?.hash ?? '');
  if (!parsed.ok) {
    return parsed;
  }
  const { pack: code, lib, index } = parsed.value;
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
 * Loads pasted text: a player link (`#pack=`/`#lib=`), a bare share code or
 * raw pack JSON, always as data, never fetching anything. Puzzle 0 opens
 * unless a link names another.
 * @param {string} text
 * @param {HandoffEnv} [env]
 * @returns {Promise<Result<{ pack: Pack, index: number }>>}
 */
export async function loadFromText(text, env = {}) {
  const hash = typeof text === 'string' ? /#[^\s#]+/.exec(text)?.[0] : undefined;
  if (hash !== undefined && parseLocationHashResult(hash).ok) {
    return readIncoming({ hash }, env);
  }
  const code = extractCode(text);
  if (code === null) {
    return { ok: false, issues: [{ code: 'no-code', path: '$', message: 'No puzzle link, code or file contents were found in the text.' }] };
  }
  const loaded = code.startsWith('{') ? parsePack(code) : await decodeShareCode(code);
  if (!loaded.ok) {
    return loaded;
  }
  const result = finish(loaded.value, 0);
  return result.ok ? { ok: true, value: result.value, warnings: loaded.warnings } : result;
}

/**
 * Loads a chosen or dropped file (at most 512 KiB, checked before reading).
 * @param {{ size: number, text: () => Promise<string> }} file
 * @param {HandoffEnv} [env]
 * @returns {Promise<Result<{ pack: Pack, index: number }>>}
 */
export async function loadFromFile(file, env = {}) {
  if (!file || file.size > MAX_FILE_BYTES) {
    return { ok: false, issues: [{ code: 'pack-too-large', path: '$', message: `A pack file is at most ${MAX_FILE_BYTES} bytes` }] };
  }
  let text;
  try {
    text = await file.text();
  } catch {
    return { ok: false, issues: [{ code: 'file-unreadable', path: '$', message: 'The file could not be read.' }] };
  }
  return loadFromText(text, env);
}

/**
 * Downloads `<name>.pentomino.json` (readable indentation when it still fits
 * the 512 KiB import limit). `omitSolutions` removes the witness and answers.
 * @param {Pack} pack
 * @param {string} fileName
 * @param {{ omitSolutions?: boolean }} [o]
 * @throws {PackError} `pack-too-large` when no importable file can be made.
 */
export function downloadPack(pack, fileName, o = {}) {
  const omitSolutions = o.omitSolutions === true;
  let text;
  try {
    text = serializePack(pack, { omitSolutions, pretty: true });
  } catch (error) {
    if (!(error instanceof PackError) || error.code !== 'pack-too-large') {
      throw error;
    }
    text = serializePack(pack, { omitSolutions });
  }
  const stem = safeFileName(String(fileName).replace(/(?:\.pentomino)?\.json$/i, ''));
  downloadText(`${stem}.pentomino.json`, text);
}
