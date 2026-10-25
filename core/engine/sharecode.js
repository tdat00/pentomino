// @ts-check
// Portable share codes: UTF-8 compact JSON, optionally raw-deflated, as unpadded
// base64url with a codec prefix. Uses only native TextEncoder/CompressionStream.
import { parsePack, serializePack } from './pack.js';
import { normalizePuzzleCodeValue, parsePuzzleHash } from './puzzlecode-input.js';

/** @typedef {import('./types.js').Pack} Pack */
/** @typedef {import('./types.js').Issue} Issue */

/** @template T @typedef {import('./types.js').Result<T>} Result */

export const MAX_CODE_CHARS = 350000;
export const MAX_DECODED_BYTES = 256 * 1024;
export const MAX_URL_CHARS = 16000;
export const WARN_URL_CHARS = 4000;

export const NO_DECOMPRESSOR_MESSAGE = "This browser can't open compressed links.";

const PREFIX_COMPRESSED = '1z.';
const PREFIX_PLAIN = '1j.';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const WRITE_SLICE = 8192;
const CODE_BODY = /^[A-Za-z0-9_-]*$/;
const HASH_PACK = /^1[zj]\.[A-Za-z0-9_-]+$/;
const HASH_LIB = /^[0-9a-f]{16}$/;
const HASH_INDEX = /^(?:0|[1-9][0-9]{0,5})$/;

export class ShareCodeError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'ShareCodeError';
    this.code = code;
  }
}

/**
 * @param {string} code
 * @param {string} message
 * @param {string} [path]
 * @returns {{ ok: false, issues: Issue[] }}
 */
function failure(code, message, path = '$') {
  return { ok: false, issues: [{ code, path, message }] };
}

const DECODE_TABLE = (() => {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i += 1) {
    table[ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

/**
 * Unpadded base64url.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function base64urlEncode(bytes) {
  const chars = new Uint8Array(Math.ceil(bytes.length / 3) * 4);
  let n = 0;
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    chars[n++] = ALPHABET.charCodeAt(a >> 2);
    chars[n++] = ALPHABET.charCodeAt(((a & 3) << 4) | (b >> 4));
    if (i + 1 < bytes.length) {
      chars[n++] = ALPHABET.charCodeAt(((b & 15) << 2) | (c >> 6));
    }
    if (i + 2 < bytes.length) {
      chars[n++] = ALPHABET.charCodeAt(c & 63);
    }
  }
  return new TextDecoder().decode(chars.subarray(0, n));
}

/**
 * Strict unpadded base64url: only the URL-safe alphabet, a possible length and
 * zero trailing bits. Returns null for anything else.
 * @param {string} text
 * @returns {Uint8Array | null}
 */
export function base64urlDecode(text) {
  const len = text.length;
  if (len % 4 === 1) {
    return null;
  }
  const out = new Uint8Array(Math.floor((len * 3) / 4));
  let acc = 0;
  let bits = 0;
  let n = 0;
  for (let i = 0; i < len; i += 1) {
    const code = text.charCodeAt(i);
    const v = code < 128 ? DECODE_TABLE[code] : -1;
    if (v < 0) {
      return null;
    }
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[n++] = (acc >> bits) & 255;
      acc &= (1 << bits) - 1;
    }
  }
  return acc === 0 ? out : null;
}

/**
 * Pipes bytes through a native (De)CompressionStream in small writes so output
 * can be aborted as soon as it passes `maxOut`.
 * @param {{ readable: ReadableStream<Uint8Array>, writable: WritableStream<Uint8Array> }} stream
 * @param {Uint8Array} bytes
 * @param {number} maxOut
 * @returns {Promise<Uint8Array>} Throws ShareCodeError('decoded-too-large') on overflow.
 */
async function pipeThrough(stream, bytes, maxOut) {
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const pump = (async () => {
    try {
      for (let i = 0; i < bytes.length; i += WRITE_SLICE) {
        await writer.write(bytes.subarray(i, i + WRITE_SLICE));
      }
      await writer.close();
    } catch {
      // The reader reports the failure.
    }
  })();
  /** @type {Uint8Array[]} */
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > maxOut) {
        throw new ShareCodeError('decoded-too-large', `The decoded data exceeds ${maxOut} bytes`);
      }
      chunks.push(value);
    }
  } catch (error) {
    reader.cancel().catch(() => {});
    writer.abort(error).catch(() => {});
    throw error;
  } finally {
    await pump;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

/**
 * Compresses UTF-8 JSON when the browser supports it; otherwise (or when the
 * stream fails) the uncompressed `1j.` codec is used.
 * @param {Pack} pack
 * @returns {Promise<string>}
 * @throws {ShareCodeError} `pack-too-large` / `share-too-large` when the decoder would refuse the result.
 */
export async function encodeShareCode(pack) {
  let text;
  try {
    text = serializePack(pack);
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'invalid-pack';
    throw new ShareCodeError(code, error instanceof Error ? error.message : 'The pack could not be written');
  }
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > MAX_DECODED_BYTES) {
    throw new ShareCodeError('share-too-large', `The pack is ${bytes.length} bytes; share codes carry at most ${MAX_DECODED_BYTES}`);
  }
  let prefix = PREFIX_PLAIN;
  let body = bytes;
  const Compression = /** @type {any} */ (globalThis).CompressionStream;
  if (typeof Compression === 'function') {
    try {
      body = await pipeThrough(new Compression('deflate-raw'), bytes, MAX_CODE_CHARS);
      prefix = PREFIX_COMPRESSED;
    } catch {
      body = bytes;
    }
  }
  const code = prefix + base64urlEncode(body);
  if (code.length > MAX_CODE_CHARS) {
    throw new ShareCodeError('share-too-large', `The share code would be ${code.length} characters; the limit is ${MAX_CODE_CHARS}`);
  }
  return code;
}

/**
 * Validated decoding; never throws. Issue codes: `invalid-code`, `code-too-long`,
 * `invalid-base64`, `no-decompressor`, `invalid-compression`, `decoded-too-large`,
 * `invalid-utf8`, plus every `parsePack` code.
 * @param {string} code
 * @param {{ maxBytes?: number }} [o] Lowers (never raises) the 256 KiB decoded limit.
 * @returns {Promise<Result<Pack>>}
 */
export async function decodeShareCode(code, o = {}) {
  if (typeof code !== 'string') {
    return failure('invalid-code', 'A share code must be text');
  }
  if (code.length > MAX_CODE_CHARS) {
    return failure('code-too-long', `A share code has at most ${MAX_CODE_CHARS} characters`);
  }
  const prefix = code.slice(0, 3);
  if (prefix !== PREFIX_COMPRESSED && prefix !== PREFIX_PLAIN) {
    return failure('invalid-code', 'This is not a pentomino share code (expected prefix 1z. or 1j.)');
  }
  const body = code.slice(3);
  if (!CODE_BODY.test(body)) {
    return failure('invalid-code', 'The share code contains characters outside the URL-safe alphabet');
  }
  const limit = Math.min(Number.isFinite(o.maxBytes) ? /** @type {number} */ (o.maxBytes) : MAX_DECODED_BYTES, MAX_DECODED_BYTES);
  const raw = base64urlDecode(body);
  if (raw === null) {
    return failure('invalid-base64', 'The share code is damaged (bad base64url data)');
  }
  /** @type {Uint8Array} */
  let bytes = raw;
  if (prefix === PREFIX_COMPRESSED) {
    const Decompression = /** @type {any} */ (globalThis).DecompressionStream;
    if (typeof Decompression !== 'function') {
      return failure('no-decompressor', NO_DECOMPRESSOR_MESSAGE);
    }
    try {
      bytes = await pipeThrough(new Decompression('deflate-raw'), raw, limit);
    } catch (error) {
      if (error instanceof ShareCodeError) {
        return failure(error.code, `The decoded pack is larger than ${limit} bytes`);
      }
      return failure('invalid-compression', 'The share code is damaged (bad compressed data)');
    }
  } else if (bytes.length > limit) {
    return failure('decoded-too-large', `The decoded pack is larger than ${limit} bytes`);
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return failure('invalid-utf8', 'The share code is damaged (not valid UTF-8)');
  }
  return parsePack(text);
}

/**
 * Same-page-base URL of the player: `../player/` resolved against the page
 * base (works under `/pentomino/` and at a development root). A share code
 * (`1z.`/`1j.` prefix) becomes `#pack=`; a 16-hex pack ID becomes `#lib=`.
 * Length limits are the caller's concern (`MAX_URL_CHARS`).
 * @param {string | URL} base Page base such as `document.baseURI`.
 * @param {string} code
 * @param {number} index
 * @returns {string}
 */
export function playerUrl(base, code, index) {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError('The puzzle index must be a nonnegative integer');
  }
  let key;
  if (HASH_PACK.test(code)) {
    key = 'pack';
  } else if (HASH_LIB.test(code)) {
    key = 'lib';
  } else {
    throw new RangeError('Expected a share code or a 16-hex pack ID');
  }
  return `${new URL('../player/', base).href}#${key}=${code}&i=${index}`;
}

/**
 * Which keys a hash may carry: `pack` (portable share code), `lib` (same-browser library entry) or `p` (a
 * one-puzzle code, always puzzle index 0), plus the puzzle number `index`.
 * @typedef {object} IncomingHash
 * @property {number} index
 * @property {string} [pack]
 * @property {string} [lib]
 * @property {string} [p] Decoded once, not yet normalized.
 */

/**
 * @param {string} body Hash without its leading `#`.
 * @returns {boolean}
 */
const bodyHasP = (body) => body.split('&').some((part) => part === 'p' || part.startsWith('p='));

/**
 * Whether the address uses the one-puzzle `p` key at all (valid or not). Key names are case-sensitive.
 * @param {string} hash With or without the leading `#`.
 * @returns {boolean}
 */
export function isPuzzleHash(hash) {
  return typeof hash === 'string' && bodyHasP(hash.startsWith('#') ? hash.slice(1) : hash);
}

/**
 * Parses a location hash with diagnostics. Unknown keys are ignored; repeated
 * known keys, bad values and hashes without `pack`/`lib`/`p` are failures.
 * When a `p` key is present the whole hash goes to `parsePuzzleHash`, the one
 * structural parser of that route (index and mixed-key rules included); its
 * `index` failure becomes `invalid-index` and its `invalid` failure
 * `invalid-hash`. Without a `p` key the legacy rules apply unchanged.
 * @param {string} hash With or without the leading `#`.
 * @returns {Result<IncomingHash>}
 */
export function parseLocationHashResult(hash) {
  if (typeof hash !== 'string') {
    return failure('invalid-hash', 'The location hash must be text');
  }
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  if (body === '') {
    return failure('no-incoming', 'The address has no puzzle data');
  }
  if (bodyHasP(body)) {
    const route = parsePuzzleHash(`#${body}`);
    return route.ok
      ? { ok: true, value: { p: route.value.p, index: 0 }, warnings: [] }
      : failure(route.code === 'index' ? 'invalid-index' : 'invalid-hash', route.message);
  }
  /** @type {Map<string, string>} */
  const found = new Map();
  for (const part of body.split('&')) {
    const eq = part.indexOf('=');
    const key = eq < 0 ? part : part.slice(0, eq);
    if (key !== 'pack' && key !== 'lib' && key !== 'i') {
      continue;
    }
    if (found.has(key)) {
      return failure('invalid-hash', `The address repeats "${key}"`);
    }
    found.set(key, eq < 0 ? '' : part.slice(eq + 1));
  }
  const pack = found.get('pack');
  const lib = found.get('lib');
  if (pack === undefined && lib === undefined) {
    return failure('no-incoming', 'The address has no puzzle data');
  }
  if (pack !== undefined && !HASH_PACK.test(pack)) {
    return failure('invalid-code', 'The pack in the address is not a pentomino share code');
  }
  if (lib !== undefined && !HASH_LIB.test(lib)) {
    return failure('invalid-hash', 'The library reference in the address is not valid');
  }
  const rawIndex = found.get('i');
  if (rawIndex !== undefined && !HASH_INDEX.test(rawIndex)) {
    return failure('invalid-index', 'The puzzle number in the address must be a nonnegative integer');
  }
  /** @type {IncomingHash} */
  const value = { index: rawIndex === undefined ? 0 : Number(rawIndex) };
  if (pack !== undefined) {
    value.pack = pack;
  }
  if (lib !== undefined) {
    value.lib = lib;
  }
  return { ok: true, value, warnings: [] };
}

/**
 * `#pack=<code>&i=<index>` (portable), `#lib=<16-hex>&i=<index>` (same
 * browser) or `#p=<puzzle code>` (one puzzle, `index` 0). Returns null when the
 * hash carries none of them or is malformed.
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
