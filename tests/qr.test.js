// @ts-check
// RP04: the local QR adapter, its SVG row-run path and the pinned vendored libraries.
//
// Provenance of the test-only decoder (tests/vendor/jsqr.cjs, tests/vendor/jsqr.LICENSE):
//   jsQR 1.4.0, Apache-2.0, https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js (256,885 bytes) and
//   https://cdn.jsdelivr.net/npm/jsqr@1.4.0/LICENSE (11,358 bytes); the npm package ships no NOTICE file.
//   The committed copies differ from upstream only in line endings (git checks them out with the platform's endings),
//   so the digests below are taken after CRLF-to-LF normalisation and equal the upstream digests.
// Provenance of the runtime encoder (core/browser/vendor/qrcodegen.js) is recorded in qrcodegen.LICENSE: the upstream
// digest is that of the download, the digest asserted here is that of the adapted module with CRLF normalised to LF.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkText } from '../tools/check-conventions.mjs';
import { QR_MAX_VERSION, makePuzzleQr, qrGeometry, qrRowRunPath } from '../core/browser/qr.js';

const require = createRequire(import.meta.url);
/** @type {(data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: string }) => { data: string, binaryData: number[], chunks: Array<{ type: string, text?: string }> } | null} */
const jsQR = require('./vendor/jsqr.cjs');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STANDARD_PREFIX = 'https://tdat00.github.io/pentomino/player/#p=';
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const GOLDENS = [
  { name: 'G1', version: 5, modules: 37, hash: '8fd29495b33327d2b34f1c5b0b2554b832bb25d199f12ad21666959a823b0c42', code: '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE' },
  { name: 'G2', version: 5, modules: 37, hash: '6ca966be5185d6731a4631313c86e06a9445ff187995e62a012320cda64efbc4', code: '1D2KTH4A0GXPKPP0VSJR425KR0JJR03GKGJ0N2.1AR9VWV' },
  { name: 'G3', version: 5, modules: 37, hash: 'fcfb568e43da12bdfdeeab914a4bd80ffa91140536ef7ee1db947c9ea40426c6', code: '1DESV14A0GXPKPP0VSJR425KR0EKJ97PGQXMQ.19M0GDB' },
  { name: 'G4', version: 6, modules: 41, hash: 'bd4069185f71651f1481a73f68bffd5e532aa48980edee7131ba953b8e50974e', code: '16YHBRC5PQ0V3528M12FADS1D5515TBQVC9BBY1Y8N835B4XSNGJ9NH.1439213K5' },
  {
    name: 'G5',
    version: 11,
    modules: 61,
    hash: '7cd76340de36049de81dd86e02614cca72abd3eac9672d0160e5daeb90ed05b7',
    code: '1EG2H6A2XE0BZ5TNBYPNFBYQNTVVZF57XNJS67YWYDKZEENH7XSVS3YYTDFKZT7YYTE3YWYEFVS9N3YYC3VDDZ6QXSSSZF73DNQQQXHQFXSHRVZJNYFN0ZTTR5NWKD7XRAJFKYZVKBYYVYTS1ZFA1ZD61TTFMFA3JZKFFKEFSWNQT54VV9ZQ7TPG5ZE28JPP62C5PNNABSE2CX0BYKZ.14ZDJDYJYM30V6MX43A5AWCJY447TZG',
  },
];

/** @param {string} path */
const read = (path) => readFileSync(join(ROOT, path));
/** @param {Buffer | Uint8Array | string} data */
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
/** @param {Buffer} buffer Same bytes with every CRLF replaced by LF. */
const lf = (buffer) => Buffer.from(buffer.toString('latin1').replaceAll('\r\n', '\n'), 'latin1');
/** @param {number} length Canonical-alphabet text of exactly this length. */
const symbols = (length) => ALPHABET.repeat(Math.ceil(length / ALPHABET.length)).slice(0, length);

/**
 * @param {Parameters<typeof makePuzzleQr>[0]} input
 * @returns {import('../core/browser/qr.js').PuzzleQrMatrix}
 */
function mustMake(input) {
  const result = makePuzzleQr(input);
  assert.ok(result.ok, `expected a QR for ${input.code.slice(0, 20)}…: ${result.ok ? '' : result.message}`);
  return result.value;
}

/** @param {ArrayLike<ArrayLike<number>>} rows */
const matrixHash = (rows) => sha256(Array.from(rows, (row) => Array.from(row).join('')).join('\n'));

/**
 * Four pixels per module and a four-module white quiet zone, opaque RGBA.
 * @param {ArrayLike<ArrayLike<number>>} rows
 */
function rasterize(rows) {
  const scale = 4;
  const quiet = 4;
  const size = rows.length;
  const side = (size + quiet * 2) * scale;
  const data = new Uint8ClampedArray(side * side * 4);
  data.fill(255);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (rows[y][x] !== 1) continue;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const xx = (x + quiet) * scale + dx;
          const yy = (y + quiet) * scale + dy;
          const at = (yy * side + xx) * 4;
          data[at] = 0;
          data[at + 1] = 0;
          data[at + 2] = 0;
        }
      }
    }
  }
  return { data, side };
}

/** @param {ArrayLike<ArrayLike<number>>} rows */
function decode(rows) {
  const image = rasterize(rows);
  return jsQR(image.data, image.side, image.side, { inversionAttempts: 'dontInvert' });
}

/**
 * A second, independent reading of the symbol: the error correction level from both copies of the format
 * information (checked against its BCH code), not from anything the adapter reports.
 * @param {ArrayLike<ArrayLike<number>>} rows
 * @returns {'L' | 'M' | 'Q' | 'H'}
 */
function formatEcLevel(rows) {
  const size = rows.length;
  let first = 0;
  for (let i = 0; i <= 5; i += 1) first |= rows[i][8] << i;
  first |= rows[7][8] << 6;
  first |= rows[8][8] << 7;
  first |= rows[8][7] << 8;
  for (let i = 9; i < 15; i += 1) first |= rows[8][14 - i] << i;
  let second = 0;
  for (let i = 0; i < 8; i += 1) second |= rows[8][size - 1 - i] << i;
  for (let i = 8; i < 15; i += 1) second |= rows[size - 15 + i][8] << i;
  assert.equal(first, second, 'both format copies agree');
  const data = (first ^ 0x5412) >> 10;
  let remainder = data;
  for (let i = 0; i < 10; i += 1) remainder = (remainder << 1) ^ ((remainder >> 9) * 0x537);
  assert.equal(first ^ 0x5412, (data << 10) | (remainder & 0x3ff), 'format BCH code is valid');
  const level = /** @type {Record<number, 'L' | 'M' | 'Q' | 'H'>} */ ({ 1: 'L', 0: 'M', 3: 'Q', 2: 'H' })[data >> 3];
  assert.ok(level, 'known error correction bits');
  return level;
}

/**
 * Independent reader for the path data this adapter documents: absolute/relative M, H, V and Z. Every closed subpath
 * must be an axis-aligned rectangle inside the matrix and no module may be covered twice.
 * @param {string} path
 * @param {number} size
 * @returns {Uint8Array[]}
 */
function rasterizePath(path, size) {
  const rows = Array.from({ length: size }, () => new Uint8Array(size));
  let x = 0;
  let y = 0;
  /** @type {Array<[number, number]>} */
  let vertices = [];
  const close = () => {
    if (vertices.length === 0) return;
    const xs = vertices.map((v) => v[0]);
    const ys = vertices.map((v) => v[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    assert.ok(x0 >= 0 && y0 >= 0 && x1 <= size && y1 <= size, `rectangle ${x0},${y0}-${x1},${y1} stays inside ${size}x${size}`);
    assert.equal(new Set(xs).size, 2, 'rectangle has two x edges');
    assert.equal(new Set(ys).size, 2, 'rectangle has two y edges');
    for (let yy = y0; yy < y1; yy += 1) {
      for (let xx = x0; xx < x1; xx += 1) {
        assert.equal(rows[yy][xx], 0, `module ${xx},${yy} covered once`);
        rows[yy][xx] = 1;
      }
    }
    vertices = [];
  };
  for (const [, command, args] of path.matchAll(/([MHVhvZz])([^MHVhvZz]*)/g)) {
    const numbers = args.trim() === '' ? [] : args.trim().split(/[\s,]+/).map(Number);
    assert.ok(numbers.every(Number.isInteger), `integer arguments in ${command}${args}`);
    if (command === 'M') {
      close();
      [x, y] = numbers;
      vertices.push([x, y]);
    } else if (command === 'H' || command === 'h') {
      x = command === 'H' ? numbers[0] : x + numbers[0];
      vertices.push([x, y]);
    } else if (command === 'V' || command === 'v') {
      y = command === 'V' ? numbers[0] : y + numbers[0];
      vertices.push([x, y]);
    } else {
      close();
    }
  }
  close();
  return rows;
}

/**
 * @param {string} dir
 * @param {string[]} extensions
 * @returns {string[]} Repository-relative paths with forward slashes.
 */
function listFiles(dir, extensions) {
  /** @type {string[]} */
  const found = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      found.push(...listFiles(path, extensions));
    } else if (extensions.includes(extname(entry.name).toLowerCase())) {
      found.push(path);
    }
  }
  return found;
}

// --- Vendored libraries and licences ---------------------------------------------------------------------------

test('vendored Nayuki encoder equals its pinned adapted digest (CRLF-normalised)', () => {
  const bytes = lf(read('core/browser/vendor/qrcodegen.js'));
  assert.equal(bytes.length, 45368);
  assert.equal(sha256(bytes), '68453133c5cffbaebe89cdfba48f1bb0918535335bae75adfbdbfde2a8b318f5');
  const text = bytes.toString('utf8');
  assert.ok(text.endsWith('\n\nexport { qrcodegen };\n'), 'the only addition is the blank line and the export');
  assert.ok(text.startsWith('/*\n * QR Code generator library (compiled from TypeScript)\n *\n * Copyright (c) Project Nayuki. (MIT License)'));
});

test('the adapted encoder is whitespace-clean authored text without further normalisation', () => {
  assert.deepEqual(checkText('core/browser/vendor/qrcodegen.js', read('core/browser/vendor/qrcodegen.js')), []);
});

test('the Nayuki licence file keeps the MIT notice and the provenance', () => {
  const text = lf(read('core/browser/vendor/qrcodegen.LICENSE')).toString('utf8');
  for (const needle of [
    'Copyright (c) Project Nayuki. (MIT License)',
    'Permission is hereby granted, free of charge',
    'The above copyright notice and this permission notice shall be included in',
    'https://www.nayuki.io/res/qr-code-generator-library/qrcodegen.js',
    '2511bc17f40a3c41d4a0578995db956b38997334d3d20113a5d4dc5c49c69480',
    '68453133c5cffbaebe89cdfba48f1bb0918535335bae75adfbdbfde2a8b318f5',
  ]) {
    assert.ok(text.includes(needle), `licence file mentions ${needle}`);
  }
  const header = lf(read('core/browser/vendor/qrcodegen.js')).toString('utf8').split('*/')[0];
  const permission = header.slice(header.indexOf('Permission is hereby granted')).replace(/^ \* ?/gm, '').trim();
  assert.ok(text.includes(permission), 'the notice in the licence file is the notice of the source header');
});

test('vendored jsQR 1.4.0 bundle and Apache licence equal the upstream digests (CRLF-normalised)', () => {
  const bundle = lf(read('tests/vendor/jsqr.cjs'));
  assert.equal(bundle.length, 256885);
  assert.equal(sha256(bundle), 'bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859');
  const licence = lf(read('tests/vendor/jsqr.LICENSE'));
  assert.equal(licence.length, 11358);
  assert.equal(sha256(licence), 'c6596eb7be8581c18be736c846fb9173b69eccf6ef94c5135893ec56bd92ba08');
  assert.match(licence.toString('utf8'), /Apache License\s+Version 2\.0, January 2004/);
});

test('the test-only decoder is outside every browser graph', () => {
  for (const file of [
    ...listFiles('core', ['.js', '.mjs', '.html', '.css']),
    ...listFiles('generator', ['.js', '.mjs', '.html', '.css']),
    ...listFiles('player', ['.js', '.mjs', '.html', '.css']),
    ...listFiles('tests/browser', ['.js', '.mjs', '.html', '.css']),
  ]) {
    assert.doesNotMatch(read(file).toString('utf8'), /jsqr|tests\/vendor/i, `${file} does not mention the test decoder`);
  }
  /** @type {Set<string>} */
  const graph = new Set();
  const visit = (/** @type {string} */ file) => {
    if (graph.has(file)) return;
    graph.add(file);
    for (const [, specifier] of read(file).toString('utf8').matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)) {
      if (specifier.startsWith('.')) {
        visit(relative(ROOT, resolve(ROOT, dirname(file), specifier)).replaceAll('\\', '/'));
      }
    }
  };
  visit('tests/browser/puzzle-qr.js');
  visit('core/browser/qr.js');
  assert.ok(graph.has('core/browser/vendor/qrcodegen.js'), 'the adapter reaches the runtime encoder');
  assert.deepEqual([...graph].filter((file) => file.startsWith('tests/vendor/')), []);
});

test('no npm dependency or lockfile was added', () => {
  const manifest = JSON.parse(read('package.json').toString('utf8'));
  for (const key of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    assert.equal(manifest[key], undefined, key);
  }
  for (const name of ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml']) {
    assert.equal(existsSync(join(ROOT, name)), false, name);
  }
});

test('the adapter and the browser harness use no unsafe DOM or string execution', () => {
  const unsafe = /\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(|\.(?:inner|outer)HTML\b|insertAdjacentHTML|document\.write|setTimeout\s*\(\s*['"`]/;
  for (const file of ['core/browser/qr.js', 'core/browser/vendor/qrcodegen.js', 'tests/browser/puzzle-qr.js', 'tests/browser/puzzle-qr.html']) {
    assert.doesNotMatch(read(file).toString('utf8'), unsafe, file);
  }
  const html = read('tests/browser/puzzle-qr.html').toString('utf8');
  assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)|<style|\sstyle=|\son[a-z]+=/i, 'no inline script, style or handler');
  assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'">/);
});

// --- Golden payloads -------------------------------------------------------------------------------------------

for (const golden of GOLDENS) {
  test(`${golden.name}: exact matrix with explicit segments, EC M and automatic mask; an independent decoder reads the URL`, () => {
    const qr = mustMake({ urlPrefix: STANDARD_PREFIX, code: golden.code });
    assert.equal(qr.version, golden.version);
    assert.equal(qr.modules, golden.modules);
    assert.equal(qr.ec, 'M');
    assert.equal(matrixHash(qr.rows), golden.hash);
    assert.equal(qr.url, STANDARD_PREFIX + golden.code);
    assert.equal(formatEcLevel(qr.rows), 'M');

    const decoded = decode(qr.rows);
    assert.ok(decoded, 'jsQR decodes the symbol');
    assert.equal(decoded.data, STANDARD_PREFIX + golden.code);
    assert.deepEqual(decoded.chunks.map((chunk) => chunk.type), ['byte', 'alphanumeric']);
    assert.equal(decoded.chunks[0].text, STANDARD_PREFIX);
    assert.equal(decoded.chunks[1].text, golden.code);
  });
}

test('matrix rows are exactly the data modules: square, owned, zero/one only', () => {
  for (const golden of GOLDENS) {
    const qr = mustMake({ urlPrefix: STANDARD_PREFIX, code: golden.code });
    assert.equal(qr.rows.length, qr.modules);
    for (const row of qr.rows) {
      assert.ok(row instanceof Uint8Array);
      assert.equal(row.length, qr.modules);
      assert.ok(row.every((value) => value === 0 || value === 1));
    }
    assert.equal(qr.quietModules, 4);
    const again = mustMake({ urlPrefix: STANDARD_PREFIX, code: golden.code });
    assert.notEqual(again.rows[0], qr.rows[0], 'every call owns fresh arrays');
    assert.deepEqual(again.rows, qr.rows);
  }
});

// --- Payload and prefix --------------------------------------------------------------------------------------------

test('the path case of the prefix reaches the scanner unchanged', () => {
  const urlPrefix = 'https://tdat00.github.io/Pentomino/Player/#p=';
  const code = GOLDENS[0].code;
  const qr = mustMake({ urlPrefix, code });
  assert.equal(qr.url, urlPrefix + code);
  assert.equal(decode(qr.rows)?.data, 'https://tdat00.github.io/Pentomino/Player/#p=' + code);
  assert.notEqual(matrixHash(qr.rows), GOLDENS[0].hash, 'a different prefix is a different symbol');
});

test('a public fork prefix is used verbatim, not the upstream destination', () => {
  const urlPrefix = 'https://example.org/forks/penta/player/#p=';
  const qr = mustMake({ urlPrefix, code: GOLDENS[1].code });
  assert.equal(qr.urlPrefix, urlPrefix);
  assert.equal(decode(qr.rows)?.data, urlPrefix + GOLDENS[1].code);
});

test('capacity follows the UTF-8 byte length of the prefix, not its character count', () => {
  const code = symbols(55);
  assert.equal(mustMake({ urlPrefix: STANDARD_PREFIX, code }).version, 5);
  const longer = 'https://tdat00.github.io/pentomino/players/#p=';
  assert.equal(mustMake({ urlPrefix: longer, code }).version, 6);
  const accented = 'https://tdat00.github.io/pentomino/pl\u00e4yer/#p=';
  assert.equal(accented.length, STANDARD_PREFIX.length);
  const qr = mustMake({ urlPrefix: accented, code });
  assert.equal(qr.version, 6, 'two bytes for the accented letter');
  assert.deepEqual(decode(qr.rows)?.binaryData, [...new TextEncoder().encode(accented + code)]);
});

test('a bare core stays bare and a tail stays whole', () => {
  const core = '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR';
  const bare = mustMake({ urlPrefix: STANDARD_PREFIX, code: core });
  assert.equal(bare.url, STANDARD_PREFIX + core);
  assert.equal(decode(bare.rows)?.data, STANDARD_PREFIX + core);
  assert.ok(!bare.code.includes('.'));
  const full = mustMake({ urlPrefix: STANDARD_PREFIX, code: `${core}.18V3WE` });
  assert.equal(decode(full.rows)?.data, `${STANDARD_PREFIX}${core}.18V3WE`);
});

test('producer-invalid payloads are qr-invalid-input before any encoding', () => {
  const ok = GOLDENS[0].code;
  const bad = /** @type {Array<[string, any]>} */ ([
    ['empty core', { urlPrefix: STANDARD_PREFIX, code: '' }],
    ['empty core before a tail', { urlPrefix: STANDARD_PREFIX, code: '.18V3WE' }],
    ['trailing dot', { urlPrefix: STANDARD_PREFIX, code: '1D0J492G.' }],
    ['two dots', { urlPrefix: STANDARD_PREFIX, code: '1D0J.18V3.WE' }],
    ['lower case', { urlPrefix: STANDARD_PREFIX, code: ok.toLowerCase() }],
    ['display grouping', { urlPrefix: STANDARD_PREFIX, code: '1D0J 492G 47DM' }],
    ['hyphen grouping', { urlPrefix: STANDARD_PREFIX, code: '1D0J-492G' }],
    ['surrounding space', { urlPrefix: STANDARD_PREFIX, code: ` ${ok}` }],
    ['trailing newline', { urlPrefix: STANDARD_PREFIX, code: `${ok}\n` }],
    ['letter U', { urlPrefix: STANDARD_PREFIX, code: '1D0U492G' }],
    ['letter I', { urlPrefix: STANDARD_PREFIX, code: '1D0I492G' }],
    ['letter O', { urlPrefix: STANDARD_PREFIX, code: '1D0O492G' }],
    ['letter L', { urlPrefix: STANDARD_PREFIX, code: '1D0L492G' }],
    ['non-string code', { urlPrefix: STANDARD_PREFIX, code: 123 }],
    ['missing code', { urlPrefix: STANDARD_PREFIX }],
    ['empty prefix', { urlPrefix: '', code: ok }],
    ['missing prefix', { code: ok }],
    ['prefix without #p=', { urlPrefix: 'https://tdat00.github.io/pentomino/player/', code: ok }],
    ['prefix ending #p', { urlPrefix: 'https://tdat00.github.io/pentomino/player/#p', code: ok }],
    ['prefix with a space', { urlPrefix: 'https://tdat00.github.io/pentomino/play er/#p=', code: ok }],
    ['prefix with an unpaired surrogate', { urlPrefix: 'https://x.example/\ud800/#p=', code: ok }],
    ['EC Q', { urlPrefix: STANDARD_PREFIX, code: ok, ec: 'Q' }],
    ['EC H', { urlPrefix: STANDARD_PREFIX, code: ok, ec: 'H' }],
    ['EC lower case', { urlPrefix: STANDARD_PREFIX, code: ok, ec: 'm' }],
    ['EC empty', { urlPrefix: STANDARD_PREFIX, code: ok, ec: '' }],
    ['EC null', { urlPrefix: STANDARD_PREFIX, code: ok, ec: null }],
    ['not an object', null],
  ]);
  for (const [name, input] of bad) {
    const result = makePuzzleQr(input);
    assert.equal(result.ok, false, name);
    assert.ok(!result.ok && result.code === 'qr-invalid-input' && result.message.length > 0, name);
  }
});

// --- Error correction, versions, capacity -----------------------------------------------------------------------

test('explicit M stays M and is never boosted; explicit L stays L', () => {
  // Version 1 would hold this payload even at H, so a boosting encoder would not have kept M.
  const tiny = { urlPrefix: '#p=', code: '0' };
  const m = mustMake({ ...tiny, ec: 'M' });
  assert.equal(m.version, 1);
  assert.equal(m.ec, 'M');
  assert.equal(formatEcLevel(m.rows), 'M');
  assert.equal(mustMake(tiny).ec, 'M', 'M is the default');
  const l = mustMake({ ...tiny, ec: 'L' });
  assert.equal(l.ec, 'L');
  assert.equal(formatEcLevel(l.rows), 'L');
  assert.notEqual(matrixHash(m.rows), matrixHash(l.rows));
  for (const golden of GOLDENS) {
    const qr = mustMake({ urlPrefix: STANDARD_PREFIX, code: golden.code, ec: 'L' });
    assert.equal(formatEcLevel(qr.rows), 'L');
    assert.equal(decode(qr.rows)?.data, STANDARD_PREFIX + golden.code);
  }
});

test('the smallest fitting version is chosen at the requested level', () => {
  // Version 5 holds 86 data codewords at M and 108 at L; 45 prefix bytes use 372 bits and each code pair 11 bits.
  const at = (/** @type {number} */ length, /** @type {'M' | 'L'} */ ec) => mustMake({ urlPrefix: STANDARD_PREFIX, code: symbols(length), ec });
  assert.equal(at(55, 'M').version, 5);
  assert.equal(at(56, 'M').version, 6);
  assert.equal(at(56, 'L').version, 5, 'L fits where M needs the next version');
  assert.equal(at(87, 'L').version, 5);
  assert.equal(at(88, 'L').version, 6);
});

test('a valid payload beyond version 40 is qr-too-long and the largest still fits', () => {
  // Version 40 holds 2334 data codewords at M and 2956 at L.
  const m = mustMake({ urlPrefix: STANDARD_PREFIX, code: symbols(3322), ec: 'M' });
  assert.equal(m.version, 40);
  assert.equal(decode(m.rows)?.data, STANDARD_PREFIX + symbols(3322));
  const l = mustMake({ urlPrefix: STANDARD_PREFIX, code: symbols(4227), ec: 'L' });
  assert.equal(l.version, 40);
  assert.equal(decode(l.rows)?.data, STANDARD_PREFIX + symbols(4227));
  for (const [length, ec] of /** @type {const} */ ([[3323, 'M'], [4228, 'L'], [4296, 'L'], [100000, 'M']])) {
    const result = makePuzzleQr({ urlPrefix: STANDARD_PREFIX, code: symbols(length), ec });
    assert.ok(!result.ok && result.code === 'qr-too-long', `${length} at ${ec}`);
    assert.match(result.message, /version 40/);
  }
  const hugePrefix = makePuzzleQr({ urlPrefix: `https://x.example/${'a'.repeat(3000)}#p=`, code: '1' });
  assert.ok(!hugePrefix.ok && hugePrefix.code === 'qr-too-long');
  const tooLongForM = makePuzzleQr({ urlPrefix: STANDARD_PREFIX, code: symbols(3323) });
  assert.ok(!tooLongForM.ok, 'the default level is M, never silently L');
});

test('physical size follows the formula for every version', () => {
  for (let version = 1; version <= QR_MAX_VERSION; version += 1) {
    const geometry = qrGeometry(version);
    const outerModules = 17 + 4 * version + 8;
    assert.equal(geometry.modules, 17 + 4 * version);
    assert.equal(geometry.quietModules, 4);
    assert.equal(geometry.outerModules, outerModules);
    assert.equal(geometry.outerMm, Math.max(25, outerModules * 0.5));
    assert.equal(geometry.moduleMm, geometry.outerMm / outerModules);
    assert.ok(geometry.moduleMm >= 0.5, `version ${version} keeps 0.5 mm modules`);
    assert.ok(geometry.outerMm >= 25);
    assert.ok(geometry.outerMm >= (17 + 4 * version) * geometry.moduleMm + 8 * geometry.moduleMm - 1e-9);
  }
  const outer = (/** @type {number} */ version) => qrGeometry(version).outerMm;
  assert.deepEqual([5, 6, 10, 11, 15, 40].map(outer), [25, 25, 32.5, 34.5, 42.5, 92.5]);
  assert.deepEqual([5, 6, 10, 11, 15, 40].map((version) => qrGeometry(version).outerModules), [45, 49, 65, 69, 85, 185]);
  assert.equal(qrGeometry(11).moduleMm, 0.5);
  assert.throws(() => qrGeometry(0), RangeError);
  assert.throws(() => qrGeometry(41), RangeError);
  assert.throws(() => qrGeometry(5.5), RangeError);
});

test('results carry the geometry of the version actually produced', () => {
  for (const length of [1, 20, 60, 120, 300, 700, 1500, 3322]) {
    const qr = mustMake({ urlPrefix: STANDARD_PREFIX, code: symbols(length) });
    assert.deepEqual(
      { modules: qr.modules, quietModules: qr.quietModules, outerModules: qr.outerModules, outerMm: qr.outerMm, moduleMm: qr.moduleMm },
      qrGeometry(qr.version),
    );
    assert.equal(qr.rows.length, 17 + 4 * qr.version);
    assert.ok(qr.moduleMm >= 0.5 && qr.outerMm >= 25);
    assert.equal(decode(qr.rows)?.data, STANDARD_PREFIX + symbols(length), `${length} characters decode`);
  }
  assert.equal(mustMake({ urlPrefix: STANDARD_PREFIX, code: symbols(3322) }).outerMm, 92.5);
});

// --- Row-run SVG path --------------------------------------------------------------------------------------------

test('qrRowRunPath merges only consecutive black modules, row by row', () => {
  assert.equal(qrRowRunPath([[1, 1, 0], [0, 1, 1], [0, 0, 0]]), 'M0 0h2v1h-2zM1 1h2v1h-2z');
  assert.equal(qrRowRunPath([new Uint8Array([1, 1, 0]), new Uint8Array([0, 1, 1]), new Uint8Array(3)]), 'M0 0h2v1h-2zM1 1h2v1h-2z');
  assert.equal(qrRowRunPath([[0, 0, 0], [0, 0, 0], [0, 0, 0]]), '', 'white only: nothing to paint');
  assert.equal(qrRowRunPath([[0]]), '');
  assert.equal(qrRowRunPath([[1]]), 'M0 0h1v1h-1z');
  assert.equal(qrRowRunPath([[0, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'M1 0h3v1h-3z', 'one run: x, y and width');
  assert.equal(qrRowRunPath([[1, 0, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'M0 0h1v1h-1zM2 0h2v1h-2z', 'a white gap is kept');
  assert.equal(
    qrRowRunPath([[0, 0, 0], [0, 0, 0], [1, 1, 1]]),
    'M0 2h3v1h-3z',
    'the last row and last column stay inside the matrix',
  );
  assert.equal(qrRowRunPath([[0, 0, 1], [0, 0, 1], [0, 0, 1]]), 'M2 0h1v1h-1zM2 1h1v1h-1zM2 2h1v1h-1z', 'vertical neighbours are separate rectangles');
});

test('qrRowRunPath rejects malformed matrices before producing any path', () => {
  const malformed = /** @type {Array<[string, any]>} */ ([
    ['ragged', [[1, 1, 0], [0, 1], [0, 0, 0]]],
    ['wider than tall', [[1, 1, 0], [0, 1, 1]]],
    ['taller than wide', [[1, 1], [0, 1], [0, 0]]],
    ['empty', []],
    ['not an array', 'abc'],
    ['null', null],
    ['null row', [null]],
    ['string row', ['1']],
    ['non-binary value', [[1, 2], [0, 0]]],
    ['boolean value', [[true, false], [false, true]]],
    ['negative value', [[1, -1], [0, 0]]],
  ]);
  for (const [name, rows] of malformed) {
    assert.throws(() => qrRowRunPath(rows), RangeError, name);
  }
});

for (const golden of [...GOLDENS, { name: 'version 40', code: symbols(3322) }]) {
  test(`${golden.name}: the row-run path paints exactly the matrix and still decodes`, () => {
    const qr = mustMake({ urlPrefix: STANDARD_PREFIX, code: golden.code });
    const path = qrRowRunPath(qr.rows);
    const painted = rasterizePath(path, qr.modules);
    assert.deepEqual(painted, qr.rows);
    const runs = qr.rows.reduce((sum, row) => sum + row.filter((value, x) => value === 1 && row[x - 1] !== 1).length, 0);
    const black = qr.rows.reduce((sum, row) => sum + row.reduce((count, value) => count + value, 0), 0);
    assert.equal(path.split('M').length - 1, runs, 'one rectangle per run');
    assert.ok(runs < black, 'runs are merged: fewer rectangles than black modules');
    assert.equal(decode(painted)?.data, STANDARD_PREFIX + golden.code);
  });
}

test('the path parser used above also notices a path that leaves the matrix', () => {
  assert.throws(() => rasterizePath('M2 0h2v1h-2z', 3));
  assert.throws(() => rasterizePath('M0 0h2v1h-2zM1 0h2v1h-2z', 3));
});
