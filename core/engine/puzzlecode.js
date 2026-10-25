// @ts-check
// Single-puzzle code (version 1): frames one puzzle as a typed, checked core
// and an optional checked tail with the stored answer. A core alone is a valid,
// playable puzzle; a tail is only ever an addition. The payload grammar and the
// frozen tables are in `puzzlecode-v1.js`, the input handling in
// `puzzlecode-input.js`. Compression uses the native streams of the host;
// nothing here touches the DOM, storage, clock or network, and nothing heavy is
// built on import. A one-substitution correction is only ever a candidate: the
// engine never applies it and never opens a puzzle by itself.

import { boardFromRows } from './board.js';
import { createPack, validatePack } from './pack.js';
import {
  ALPHABET, MAX_CODE_SYMBOLS, MAX_INPUT_CHARS, PuzzleCodeError, normalizePuzzleCodeInput,
  normalizePuzzleCodeValue, parsePuzzleHash,
} from './puzzlecode-input.js';
import {
  BitReader, BitWriter, CODE_BOUNDS, CRC20, RESIDUE_REGISTER, bitsToSymbols, checkSymbols, crc20Register,
  decodeCorePayload, decodeTailPayload, encodeCorePayload, encodeTailPayload, symbolsToBits, writeEG, readEG,
} from './puzzlecode-v1.js';

/** @typedef {import('./types.js').Pack} Pack */
/** @typedef {import('./types.js').Piece} Piece */
/** @typedef {import('./types.js').Pose} Pose */
/** @typedef {import('./types.js').RatingClaim} RatingClaim */
/** @typedef {import('./types.js').CertificateClaim} CertificateClaim */
/** @typedef {import('./puzzlecode-input.js').CodeCandidate} CodeCandidate */
/** @typedef {import('./puzzlecode-v1.js').CodecDeps} CodecDeps */
/** @typedef {import('./puzzlecode-v1.js').PuzzleParts} PuzzleParts */

/**
 * The selected puzzle exactly as printed or copied. The browser snapshot owner
 * resolves the displayed title first; the codec never reads an app index,
 * locale or current placements.
 * @typedef {object} PuzzleCodeSnapshot
 * @property {string[]} rows Board rows including blocked margins (`#` active, `.` blocked).
 * @property {number} rotation Display angle in degrees: 0, 45, ... 315.
 * @property {Piece[]} pieces
 * @property {Pose[]} clues
 * @property {Pose[] | null} solution
 * @property {RatingClaim | null} rating
 * @property {CertificateClaim | null} certificate
 * @property {string | null} title
 */

/**
 * @typedef {object} EncodedPuzzleCode
 * @property {string} C Core symbols, upper case, no grouping.
 * @property {string | null} T Tail symbols, or null without a stored solution.
 * @property {string} F `C`, or `C` + `.` + `T`.
 * @property {1 | 2} version 1 raw payload, 2 DEFLATE payload.
 */

/**
 * @typedef {object} DecodedPuzzleCode
 * @property {Pack} pack One-puzzle ordinary pack; the solution is set only with a valid tail.
 * @property {boolean} hasTail True when a tail decoded to a validated stored answer.
 * @property {null | 'tail-check' | 'tail-tag' | 'tail-invalid'} tailError
 *   Set when the core is valid but its tail is not. Opening the core alone is
 *   an explicit user choice, never an automatic one.
 * @property {CodeCandidate} [candidate] Unique one-substitution correction of a bad tail.
 */

export { ALPHABET, MAX_CODE_SYMBOLS, MAX_INPUT_CHARS, PuzzleCodeError, normalizePuzzleCodeInput, normalizePuzzleCodeValue, parsePuzzleHash };

const DEFLATE_SLICE = 256;

/**
 * @param {string} message
 * @returns {PuzzleCodeError}
 */
const invalid = (message) => new PuzzleCodeError('invalid', message);

// ------------------------------------------------------------- compression

/**
 * Pipes bytes through a native stream in small writes, aborting as soon as the
 * output passes `maxOut`.
 * @param {{ readable: ReadableStream<Uint8Array>, writable: WritableStream<Uint8Array> }} stream
 * @param {Uint8Array} bytes
 * @param {number} maxOut
 * @returns {Promise<Uint8Array>}
 */
async function pipeBytes(stream, bytes, maxOut) {
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const pump = (async () => {
    try {
      for (let i = 0; i < bytes.length; i += DEFLATE_SLICE) {
        await writer.write(bytes.subarray(i, i + DEFLATE_SLICE));
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
        throw invalid('The compressed part expands beyond its limit.');
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
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array | null>} Null when native compression is unavailable or fails.
 */
async function deflateRaw(bytes) {
  const Compression = /** @type {any} */ (globalThis).CompressionStream;
  if (typeof Compression !== 'function') {
    return null;
  }
  try {
    return await pipeBytes(new Compression('deflate-raw'), bytes, bytes.length + 1024);
  } catch {
    return null;
  }
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<Uint8Array>}
 * @throws {PuzzleCodeError} `no-deflate` without native support, else `invalid`.
 */
async function inflateRaw(bytes) {
  const Decompression = /** @type {any} */ (globalThis).DecompressionStream;
  if (typeof Decompression !== 'function') {
    throw new PuzzleCodeError('no-deflate');
  }
  try {
    return await pipeBytes(new Decompression('deflate-raw'), bytes, CODE_BOUNDS.inflatedBytes);
  } catch (error) {
    throw error instanceof PuzzleCodeError ? error : invalid('The compressed part is damaged.');
  }
}

// ---------------------------------------------------------------- encoding

/**
 * @param {PuzzleCodeSnapshot} snapshot
 * @returns {PuzzleParts}
 */
function partsFromSnapshot(snapshot) {
  /** @type {Pack} */
  let pack;
  try {
    const board = boardFromRows(snapshot.rows);
    /** @type {import('./types.js').PackPuzzle} */
    const puzzle = {
      id: 'p',
      clues: snapshot.clues,
      solution: snapshot.solution,
      rating: snapshot.rating,
      certificate: snapshot.certificate,
    };
    if (typeof snapshot.title === 'string') {
      puzzle.title = snapshot.title;
    }
    pack = createPack({ board, rotation: snapshot.rotation, pieces: snapshot.pieces, witness: null, puzzles: [puzzle] });
  } catch (error) {
    throw invalid(error instanceof Error ? error.message : 'The puzzle snapshot is not valid.');
  }
  const checked = validatePack(pack);
  if (!checked.ok) {
    throw invalid(checked.issues[0]?.message ?? 'The puzzle snapshot is not valid.');
  }
  const valid = checked.value;
  const puzzle = valid.puzzles[0];
  return {
    board: boardFromRows(valid.board.rows),
    rotation: valid.presentation?.rotation ?? 0,
    pieces: valid.pieces,
    clues: puzzle.clues,
    solution: puzzle.solution ?? null,
    rating: puzzle.rating ?? null,
    certificate: puzzle.certificate ?? null,
    title: puzzle.title === undefined || puzzle.title === '' ? null : puzzle.title,
  };
}

/**
 * @param {BitWriter} payload
 * @param {1 | 2} version
 * @param {Uint8Array | null} deflated
 * @returns {BitWriter} Pc: version symbol, payload and zero fill to a multiple of five bits.
 */
function buildCoreBits(payload, version, deflated) {
  const pc = new BitWriter();
  pc.write(version, 5);
  if (version === 1 || deflated === null) {
    pc.append(payload);
  } else {
    writeEG(pc, 8, deflated.length);
    for (const byte of deflated) {
      pc.write(byte, 8);
    }
  }
  pc.padTo(5);
  return pc;
}

/**
 * @param {PuzzleCodeSnapshot} snapshot
 * @param {{ compression?: 'auto' | 'raw' | 'deflate' }} options
 * @param {CodecDeps & { allowDeflate?: boolean }} deps
 * @returns {Promise<EncodedPuzzleCode>}
 */
async function encode(snapshot, options, deps) {
  const mode = options?.compression ?? 'auto';
  if (mode !== 'auto' && mode !== 'raw' && !(mode === 'deflate' && deps.allowDeflate === true)) {
    throw new TypeError(`unsupported compression option: ${String(mode)}`);
  }
  const parts = partsFromSnapshot(snapshot);
  const payload = encodeCorePayload(parts, deps);
  let pc = buildCoreBits(payload, 1, null);
  /** @type {1 | 2} */
  let version = 1;
  if (mode !== 'raw') {
    const deflated = await deflateRaw(payload.toBytes());
    if (deflated === null) {
      if (mode === 'deflate') {
        throw new PuzzleCodeError('no-deflate');
      }
    } else {
      const compressed = buildCoreBits(payload, 2, deflated);
      if (mode === 'deflate' || compressed.length < pc.length) {
        pc = compressed;
        version = 2;
      }
    }
  }
  const C = bitsToSymbols(pc.bits) + checkSymbols(crc20Register(pc.bits, 0, pc.length) ^ CRC20.xorOut);
  let T = null;
  const tail = encodeTailPayload(parts);
  if (tail !== null) {
    const pt = new BitWriter();
    pt.append(tail);
    pt.padTo(5);
    const register = crc20Register(pt.bits, 0, pt.length, crc20Register(pc.bits, 0, pc.length));
    T = bitsToSymbols(pt.bits) + checkSymbols(register ^ CRC20.xorOut);
  }
  if (C.length > MAX_CODE_SYMBOLS || (T !== null && C.length + T.length > MAX_CODE_SYMBOLS)) {
    throw new PuzzleCodeError('too-long');
  }
  return { C, T, F: T === null ? C : `${C}.${T}`, version };
}

// ---------------------------------------------------------------- decoding

/**
 * @param {string} symbols
 * @returns {number} The 20-bit value of four symbols.
 */
function valueOfCheck(symbols) {
  let value = 0;
  for (const symbol of symbols) {
    value = value * 32 + ALPHABET.indexOf(symbol);
  }
  return value;
}

/**
 * Turns anything unexpected inside the decoder into a typed `invalid`.
 * @param {unknown} error
 * @returns {PuzzleCodeError}
 */
function typed(error) {
  return error instanceof PuzzleCodeError ? error : invalid('This code does not describe a valid puzzle.');
}

/**
 * Checks, then parses, one core.
 * @param {string} core Normalized symbols.
 * @param {CodecDeps} deps
 * @returns {Promise<{ pack: Pack, coreBits: Uint8Array }>}
 * @throws {PuzzleCodeError} `core-check`, `version`, `no-deflate` or `invalid`.
 */
async function parseCore(core, deps) {
  if (core.length < 5) {
    throw new PuzzleCodeError('core-check');
  }
  const bits = symbolsToBits(core);
  const dataEnd = (core.length - 4) * 5;
  const check = crc20Register(bits, 0, dataEnd) ^ CRC20.xorOut;
  if (check !== valueOfCheck(core.slice(-4))) {
    throw new PuzzleCodeError('core-check');
  }
  const coreBits = bits.subarray(0, dataEnd);
  const version = new BitReader(bits, 0, 5).read(5);
  try {
    const r = new BitReader(bits, 5, dataEnd);
    if (version === 1) {
      const pack = decodeCorePayload(r, deps);
      if (r.remaining >= 5 || !r.restIsZero()) {
        throw invalid('The code has unused data after the puzzle.');
      }
      return { pack, coreBits };
    }
    if (version !== 2) {
      throw new PuzzleCodeError('version');
    }
    const m = readEG(r, 8);
    if (m < 1 || m * 8 > r.remaining) {
      throw invalid('The compressed part has an impossible length.');
    }
    const bytes = new Uint8Array(m);
    for (let i = 0; i < m; i += 1) {
      bytes[i] = r.read(8);
    }
    if (r.remaining >= 5 || !r.restIsZero()) {
      throw invalid('The code has unused data after the compressed part.');
    }
    const inflated = await inflateRaw(bytes);
    const inner = new Uint8Array(inflated.length * 8);
    for (let i = 0; i < inner.length; i += 1) {
      inner[i] = (inflated[i >> 3] >> (7 - (i & 7))) & 1;
    }
    const ir = new BitReader(inner);
    const pack = decodeCorePayload(ir, deps);
    if (ir.remaining >= 8 || !ir.restIsZero()) {
      throw invalid('The compressed part has unused data after the puzzle.');
    }
    return { pack, coreBits };
  } catch (error) {
    throw typed(error);
  }
}

/**
 * Checks, then parses, one tail against its core.
 * @param {string} tail Normalized symbols (possibly empty).
 * @param {Uint8Array} coreBits Pc of the core: version symbol, payload and fill.
 * @param {Pack} corePack
 * @returns {Pack} The core pack with its stored solution.
 * @throws {PuzzleCodeError} `tail-check`, `tail-tag` or `tail-invalid`.
 */
function parseTail(tail, coreBits, corePack) {
  if (tail.length < 5) {
    throw new PuzzleCodeError('tail-check');
  }
  const bits = symbolsToBits(tail);
  const dataEnd = (tail.length - 4) * 5;
  const register = crc20Register(bits, 0, dataEnd, crc20Register(coreBits, 0, coreBits.length));
  if ((register ^ CRC20.xorOut) !== valueOfCheck(tail.slice(-4))) {
    throw new PuzzleCodeError('tail-check');
  }
  const r = new BitReader(bits, 0, dataEnd);
  if (r.read(5) !== 1) {
    throw new PuzzleCodeError('tail-tag');
  }
  try {
    return decodeTailPayload(r, corePack);
  } catch {
    throw new PuzzleCodeError('tail-invalid');
  }
}

/**
 * The single-symbol error (position and 5-bit difference) whose CRC syndrome
 * equals `syndrome`, using one table of five basis syndromes that is clocked
 * back one symbol at a time. Null unless exactly one position qualifies.
 * @param {number} syndrome Register of the received word xor the valid residue.
 * @param {number} length Symbols in the covered word.
 * @param {number} first First position that may be wrong.
 * @returns {{ position: number, difference: number } | null}
 */
function singleSymbolError(syndrome, length, first) {
  /** @param {number} register @param {number} bit */
  const clock = (register, bit) => {
    const feedback = ((register >>> 19) & 1) ^ bit;
    const shifted = (register << 1) & CRC20.mask;
    return feedback === 1 ? shifted ^ CRC20.poly : shifted;
  };
  const basis = [0, 0, 0, 0, 0];
  for (let j = 0; j < 5; j += 1) {
    let register = 0;
    for (let b = 4; b >= 0; b -= 1) {
      register = clock(register, ((1 << j) >> b) & 1);
    }
    basis[j] = register;
  }
  /** @type {{ position: number, difference: number } | null} */
  let found = null;
  for (let position = length - 1; position >= first; position -= 1) {
    for (let difference = 1; difference < 32; difference += 1) {
      let value = 0;
      for (let j = 0; j < 5; j += 1) {
        if ((difference >> j) & 1) {
          value ^= basis[j];
        }
      }
      if (value === syndrome) {
        if (found !== null) {
          return null;
        }
        found = { position, difference };
      }
    }
    for (let j = 0; j < 5; j += 1) {
      let register = basis[j];
      for (let step = 0; step < 5; step += 1) {
        register = clock(register, 0);
      }
      basis[j] = register;
    }
  }
  return found;
}

/**
 * @param {'core' | 'tail'} component
 * @param {number} index Zero-based symbol index within the component.
 * @param {string} typedSymbol
 * @param {string} expected
 * @param {string} correctedCode
 * @returns {CodeCandidate}
 */
function candidateOf(component, index, typedSymbol, expected, correctedCode) {
  return {
    component,
    group: Math.floor(index / 4) + 1,
    position: (index % 4) + 1,
    expected,
    typed: typedSymbol,
    correctedCode,
  };
}

/**
 * Unique one-substitution correction of a core whose check fails, or null.
 * @param {string} core
 * @param {string | null} tail
 * @param {CodecDeps} deps
 * @returns {Promise<CodeCandidate | null>}
 */
async function coreCandidate(core, tail, deps) {
  if (core.length < 5 || core.length > CODE_BOUNDS.syndromeSymbols) {
    return null;
  }
  const bits = symbolsToBits(core);
  const syndrome = crc20Register(bits, 0, bits.length) ^ RESIDUE_REGISTER;
  const error = singleSymbolError(syndrome, core.length, 0);
  if (error === null) {
    return null;
  }
  const typedSymbol = core[error.position];
  const expected = ALPHABET[ALPHABET.indexOf(typedSymbol) ^ error.difference];
  const corrected = core.slice(0, error.position) + expected + core.slice(error.position + 1);
  try {
    await parseCore(corrected, deps);
  } catch {
    return null;
  }
  return candidateOf('core', error.position, typedSymbol, expected, tail === null ? corrected : `${corrected}.${tail}`);
}

/**
 * Unique one-substitution correction of a tail whose check fails, or null.
 * @param {string} core Valid core.
 * @param {string} tail
 * @param {Uint8Array} coreBits
 * @param {Pack} corePack
 * @returns {CandidateOrNull}
 */
function tailCandidate(core, tail, coreBits, corePack) {
  const covered = coreBits.length / 5 + tail.length;
  if (tail.length < 5 || covered > CODE_BOUNDS.syndromeSymbols) {
    return null;
  }
  const bits = symbolsToBits(tail);
  const syndrome = crc20Register(bits, 0, bits.length, crc20Register(coreBits, 0, coreBits.length)) ^ RESIDUE_REGISTER;
  const error = singleSymbolError(syndrome, covered, coreBits.length / 5);
  if (error === null) {
    return null;
  }
  const index = error.position - coreBits.length / 5;
  const typedSymbol = tail[index];
  const expected = ALPHABET[ALPHABET.indexOf(typedSymbol) ^ error.difference];
  const corrected = tail.slice(0, index) + expected + tail.slice(index + 1);
  try {
    parseTail(corrected, coreBits, corePack);
  } catch {
    return null;
  }
  return candidateOf('tail', index, typedSymbol, expected, `${core}.${corrected}`);
}

/** @typedef {CodeCandidate | null} CandidateOrNull */

/**
 * @param {string} text
 * @param {CodecDeps} deps
 * @returns {Promise<DecodedPuzzleCode>}
 */
async function decode(text, deps) {
  const normalized = normalizePuzzleCodeInput(text);
  const dot = normalized.indexOf('.');
  const core = dot < 0 ? normalized : normalized.slice(0, dot);
  const tail = dot < 0 ? null : normalized.slice(dot + 1);
  /** @type {{ pack: Pack, coreBits: Uint8Array }} */
  let parsed;
  try {
    parsed = await parseCore(core, deps);
  } catch (error) {
    if (error instanceof PuzzleCodeError && error.code === 'core-check') {
      const candidate = await coreCandidate(core, tail, deps);
      if (candidate !== null) {
        throw new PuzzleCodeError('core-check', undefined, { candidate });
      }
    }
    throw error;
  }
  if (tail === null) {
    return { pack: parsed.pack, hasTail: false, tailError: null };
  }
  try {
    return { pack: parseTail(tail, parsed.coreBits, parsed.pack), hasTail: true, tailError: null };
  } catch (error) {
    const tailError = error instanceof PuzzleCodeError && (error.code === 'tail-check' || error.code === 'tail-tag')
      ? error.code
      : 'tail-invalid';
    /** @type {DecodedPuzzleCode} */
    const result = { pack: parsed.pack, hasTail: false, tailError };
    if (tailError === 'tail-check') {
      const candidate = tailCandidate(core, tail, parsed.coreBits, parsed.pack);
      if (candidate !== null) {
        result.candidate = candidate;
      }
    }
    return result;
  }
}

// -------------------------------------------------------------- public API

/**
 * A codec with replaceable computations. Test-only seam: the production worker
 * uses the default codec and never receives a function or force-failure flag.
 * @param {CodecDeps & { allowDeflate?: boolean }} [deps]
 *   `measure` replaces the count-only rating rebuild; `allowDeflate` lets
 *   `compression: 'deflate'` force the version-2 form.
 */
export function createPuzzleCodec(deps = {}) {
  return {
    /**
     * @param {PuzzleCodeSnapshot} snapshot
     * @param {{ compression?: 'auto' | 'raw' | 'deflate' }} [options]
     * @returns {Promise<EncodedPuzzleCode>}
     */
    encodePuzzleCode: (snapshot, options) => encode(snapshot, options ?? {}, deps),
    /**
     * @param {string} text
     * @returns {Promise<DecodedPuzzleCode>}
     */
    decodePuzzleCode: (text) => decode(text, deps),
  };
}

const defaultCodec = createPuzzleCodec();

/**
 * Encodes one selected puzzle. The shortest complete core wins and raw wins a
 * tie; `compression: 'raw'` is a deterministic test/CLI seam. Without native
 * compression, auto mode uses raw. Throws `PuzzleCodeError`: `invalid` for a
 * snapshot that is not a valid puzzle, `too-long` beyond the decoder's bound.
 * @param {PuzzleCodeSnapshot} snapshot Never mutated.
 * @param {{ compression?: 'auto' | 'raw' }} [options]
 * @returns {Promise<EncodedPuzzleCode>}
 */
export function encodePuzzleCode(snapshot, options) {
  return defaultCodec.encodePuzzleCode(snapshot, options);
}

/**
 * Decodes typed, pasted or scanned text (a bare code, grouped code or a link
 * with `#p=`). Throws `PuzzleCodeError` for every bad core: `empty`,
 * `bad-char`, `dots`, `too-long`, `index`, `core-check` (possibly with a
 * `candidate`), `version`, `no-deflate` and `invalid`. A valid core with a bad
 * tail resolves with `tailError` instead of throwing.
 * @param {string} text
 * @returns {Promise<DecodedPuzzleCode>}
 */
export function decodePuzzleCode(text) {
  return defaultCodec.decodePuzzleCode(text);
}
