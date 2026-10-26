// @ts-check
// Local QR code for a puzzle link: a thin adapter over the pinned Nayuki encoder (./vendor/qrcodegen.js). Codes are
// opaque payloads, never parsed or shortened here; level M (or L on request) is never boosted. Pure: no DOM or network.

import { qrcodegen } from './vendor/qrcodegen.js';

/**
 * @typedef {'M' | 'L'} QrEc
 */

/**
 * @typedef {object} PuzzleQrInput
 * @property {string} urlPrefix Destination up to and including `#p=`, used verbatim (UTF-8 bytes are measured).
 * @property {string} code Canonical output code: the core, or core + "." + tail, upper case, ungrouped.
 * @property {QrEc} [ec] Requested error correction level; defaults to M.
 */

/**
 * The symbol and its physical size. `rows[y][x]` is 0 or 1 for the data modules only (no quiet zone);
 * the result owns these arrays and callers must not mutate them.
 * @typedef {object} PuzzleQrMatrix
 * @property {string} url `urlPrefix + code`: exactly what a scanner reads.
 * @property {string} code
 * @property {string} urlPrefix
 * @property {QrEc} ec Error correction actually used: the requested level.
 * @property {number} version Smallest version (1-40) that fits at `ec`.
 * @property {number} modules Data modules per side: 17 + 4 * version.
 * @property {4} quietModules White modules required on every edge.
 * @property {number} outerModules `modules` plus the quiet zone on both sides.
 * @property {number} outerMm Side of the reserved box including the quiet zone: at least 25 mm and 0.5 mm per module.
 * @property {number} moduleMm Side of one module in millimetres: `outerMm / outerModules`, never below 0.5.
 * @property {Uint8Array[]} rows
 */

/**
 * @typedef {object} QrFailure
 * @property {false} ok
 * @property {'qr-invalid-input' | 'qr-too-long'} code
 * @property {string} message
 */

/** @typedef {{ ok: true, value: PuzzleQrMatrix } | QrFailure} QrResult */

export const QR_QUIET_MODULES = 4;
export const QR_MIN_MODULE_MM = 0.5;
export const QR_MIN_OUTER_MM = 25;
export const QR_MIN_VERSION = 1;
export const QR_MAX_VERSION = 40;

const URL_PREFIX_END = '#p=';
const CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]+(?:\.[0-9A-HJKMNP-TV-Z]+)?$/;
const UNSAFE_PREFIX_CHARACTER = /[\u0000-\u0020\u007F]/;
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
// The standard's absolute maxima at version 40 / level L: a larger part cannot fit whatever the other segment is.
const MAX_BYTE_MODE_BYTES = 2953;
const MAX_ALPHANUMERIC_CHARACTERS = 4296;
// The vendored encoder's only capacity failure, thrown from encodeSegments when no version up to the maximum fits.
const VENDOR_DATA_TOO_LONG = 'Data too long';

/**
 * Module counts and physical size for a version: a 4-module quiet zone, at least 0.5 mm per module and a box of at
 * least 25 mm. The 25 mm minimum enlarges small symbols; large ones are never shrunk below 0.5 mm per module.
 * @param {number} version 1-40.
 * @returns {{ modules: number, quietModules: 4, outerModules: number, outerMm: number, moduleMm: number }}
 * @throws {RangeError} For a version outside 1-40.
 */
export function qrGeometry(version) {
  if (!Number.isInteger(version) || version < QR_MIN_VERSION || version > QR_MAX_VERSION) {
    throw new RangeError(`QR version must be an integer from ${QR_MIN_VERSION} to ${QR_MAX_VERSION}`);
  }
  const modules = 17 + 4 * version;
  const outerModules = modules + 2 * QR_QUIET_MODULES;
  const outerMm = Math.max(QR_MIN_OUTER_MM, outerModules * QR_MIN_MODULE_MM);
  return { modules, quietModules: QR_QUIET_MODULES, outerModules, outerMm, moduleMm: outerMm / outerModules };
}

/**
 * @param {unknown} input
 * @returns {string | null} Why the input is not a producer-valid payload, or null.
 */
function inputProblem(input) {
  if (typeof input !== 'object' || input === null) {
    return 'The QR input must be an object with urlPrefix, code and optional ec.';
  }
  const { urlPrefix, code, ec } = /** @type {Record<string, unknown>} */ (input);
  if (typeof urlPrefix !== 'string' || urlPrefix === '') {
    return 'The URL prefix must be a nonempty string.';
  }
  if (!urlPrefix.endsWith(URL_PREFIX_END)) {
    return `The URL prefix must end with "${URL_PREFIX_END}".`;
  }
  if (UNSAFE_PREFIX_CHARACTER.test(urlPrefix) || LONE_SURROGATE.test(urlPrefix)) {
    return 'The URL prefix contains a space, a control character or an unpaired surrogate.';
  }
  if (typeof code !== 'string' || !CODE_PATTERN.test(code)) {
    return 'The code must be upper-case Crockford symbols, ungrouped, with at most one nonempty ".tail".';
  }
  if (ec !== undefined && ec !== 'M' && ec !== 'L') {
    return 'The error correction level must be "M" or "L".';
  }
  return null;
}

/**
 * Builds the QR symbol for a puzzle link: byte segment `urlPrefix`, alphanumeric segment `code`, requested error
 * correction without boosting, automatic mask, smallest version 1-40.
 * @param {PuzzleQrInput} input
 * @returns {QrResult} `qr-invalid-input` for a payload the transfer producer must not send, `qr-too-long` when a valid
 *   payload does not fit version 40 at the requested level. Any other exception is a programming error and propagates.
 */
export function makePuzzleQr(input) {
  const problem = inputProblem(input);
  if (problem !== null) {
    return { ok: false, code: 'qr-invalid-input', message: problem };
  }
  const { urlPrefix, code } = input;
  const ec = input.ec ?? 'M';
  const prefixBytes = new TextEncoder().encode(urlPrefix);
  const tooLong = /** @type {QrFailure} */ ({
    ok: false,
    code: 'qr-too-long',
    message: `The QR code cannot hold this link: ${prefixBytes.length} URL bytes plus ${code.length} code characters `
      + `exceed QR version 40 at error correction ${ec}. Shorten the code${ec === 'M' ? ' or use error correction L' : ''}.`,
  });
  if (prefixBytes.length > MAX_BYTE_MODE_BYTES || code.length > MAX_ALPHANUMERIC_CHARACTERS) {
    return tooLong;
  }

  const segments = [
    qrcodegen.QrSegment.makeBytes(prefixBytes),
    qrcodegen.QrSegment.makeAlphanumeric(code),
  ];
  let symbol;
  try {
    symbol = qrcodegen.QrCode.encodeSegments(
      segments,
      ec === 'M' ? qrcodegen.QrCode.Ecc.MEDIUM : qrcodegen.QrCode.Ecc.LOW,
      QR_MIN_VERSION,
      QR_MAX_VERSION,
      -1,
      false,
    );
  } catch (error) {
    if (error instanceof RangeError && error.message === VENDOR_DATA_TOO_LONG) {
      return tooLong;
    }
    throw error;
  }

  /** @type {number} */
  const version = symbol.version;
  const geometry = qrGeometry(version);
  if (symbol.size !== geometry.modules) {
    throw new Error(`QR encoder returned a ${symbol.size}-module symbol for version ${version}`);
  }
  /** @type {Uint8Array[]} */
  const rows = [];
  for (let y = 0; y < geometry.modules; y += 1) {
    const row = new Uint8Array(geometry.modules);
    for (let x = 0; x < geometry.modules; x += 1) {
      row[x] = symbol.getModule(x, y) ? 1 : 0;
    }
    rows.push(row);
  }
  return {
    ok: true,
    value: Object.freeze({
      url: urlPrefix + code,
      code,
      urlPrefix,
      ec,
      version,
      ...geometry,
      rows: Object.freeze(rows),
    }),
  };
}

/**
 * Builds the QR symbol of a link that carries several puzzle codes: byte segment `urlPrefix` (up to `#p=`), then each
 * code as an alphanumeric segment with a byte `;` between them, then the byte `suffix` (`&i=<n>` or nothing). Everything
 * else is as in `makePuzzleQr`: the requested level without boosting, the smallest version, a data-only matrix.
 * @param {{ urlPrefix: string, codes: readonly string[], suffix?: string, ec?: QrEc }} input
 * @returns {QrResult}
 */
export function makeListQr(input) {
  const { urlPrefix, codes, suffix = '' } = input;
  const ec = input.ec ?? 'M';
  const problem = inputProblem({ urlPrefix, code: codes?.[0], ec });
  if (problem !== null) {
    return { ok: false, code: 'qr-invalid-input', message: problem };
  }
  if (!Array.isArray(codes) || codes.length === 0 || codes.some((code) => typeof code !== 'string' || !CODE_PATTERN.test(code))) {
    return { ok: false, code: 'qr-invalid-input', message: 'Every code must be upper-case Crockford symbols, ungrouped, with at most one nonempty ".tail".' };
  }
  if (typeof suffix !== 'string' || !/^(?:&i=\d{1,3})?$/.test(suffix)) {
    return { ok: false, code: 'qr-invalid-input', message: 'The suffix must be empty or "&i=" and a puzzle number.' };
  }
  const encoder = new TextEncoder();
  /** @type {ReturnType<typeof qrcodegen.QrSegment.makeBytes>[]} */
  const segments = [qrcodegen.QrSegment.makeBytes(encoder.encode(urlPrefix))];
  codes.forEach((code, at) => {
    if (at > 0) {
      segments.push(qrcodegen.QrSegment.makeBytes(encoder.encode(';')));
    }
    segments.push(qrcodegen.QrSegment.makeAlphanumeric(code));
  });
  if (suffix !== '') {
    segments.push(qrcodegen.QrSegment.makeBytes(encoder.encode(suffix)));
  }
  let symbol;
  try {
    symbol = qrcodegen.QrCode.encodeSegments(
      segments, ec === 'M' ? qrcodegen.QrCode.Ecc.MEDIUM : qrcodegen.QrCode.Ecc.LOW, QR_MIN_VERSION, QR_MAX_VERSION, -1, false,
    );
  } catch (error) {
    if (error instanceof RangeError && error.message === VENDOR_DATA_TOO_LONG) {
      return {
        ok: false,
        code: 'qr-too-long',
        message: `The QR code cannot hold this link: it exceeds QR version 40 at error correction ${ec}.`,
      };
    }
    throw error;
  }
  /** @type {number} */
  const version = symbol.version;
  const geometry = qrGeometry(version);
  /** @type {Uint8Array[]} */
  const rows = [];
  for (let y = 0; y < geometry.modules; y += 1) {
    const row = new Uint8Array(geometry.modules);
    for (let x = 0; x < geometry.modules; x += 1) {
      row[x] = symbol.getModule(x, y) ? 1 : 0;
    }
    rows.push(row);
  }
  const code = codes.join(';');
  return {
    ok: true,
    value: Object.freeze({ url: urlPrefix + code + suffix, code, urlPrefix, ec, version, ...geometry, rows: Object.freeze(rows) }),
  };
}

/**
 * @param {unknown} rows
 * @returns {asserts rows is ReadonlyArray<ArrayLike<number>>}
 * @throws {RangeError} Unless `rows` is a nonempty square matrix of 0/1 modules.
 */
function assertSquareMatrix(rows) {
  const matrix = /** @type {ArrayLike<ArrayLike<unknown> | null>} */ (rows);
  if (typeof rows !== 'object' || rows === null || !Number.isInteger(matrix.length) || matrix.length < 1) {
    throw new RangeError('A QR matrix must be a nonempty array of rows.');
  }
  for (let y = 0; y < matrix.length; y += 1) {
    const row = matrix[y];
    if (typeof row !== 'object' || row === null || row.length !== matrix.length) {
      throw new RangeError(`QR matrix row ${y} does not have ${matrix.length} modules: the matrix must be square.`);
    }
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] !== 0 && row[x] !== 1) {
        throw new RangeError(`QR matrix module (${x}, ${y}) must be 0 or 1.`);
      }
    }
  }
}

/**
 * SVG path data for the black modules in data-module coordinates (one unit per module, no quiet zone, y down):
 * one closed horizontal rectangle `M{x} {y}h{w}v1h-{w}z` per run of consecutive black modules, in row-major order.
 * White gaps are never merged and no rectangle leaves the matrix. An all-white matrix gives "".
 * Fill it with `fill-rule` default and no stroke; place it with `translate(4 4)` inside the quiet-zone box.
 * @param {ReadonlyArray<ArrayLike<number>>} rows Square matrix of 0/1 values, as in `PuzzleQrMatrix.rows`.
 * @returns {string}
 * @throws {RangeError} When the matrix is not a nonempty square of 0/1 values (a caller error).
 */
export function qrRowRunPath(rows) {
  assertSquareMatrix(rows);
  let path = '';
  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    let x = 0;
    while (x < row.length) {
      if (row[x] !== 1) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < row.length && row[x] === 1) {
        x += 1;
      }
      const width = x - start;
      path += `M${start} ${y}h${width}v1h-${width}z`;
    }
  }
  return path;
}
