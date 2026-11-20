// @ts-check
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deflateRawSync } from 'node:zlib';
import { boardFromRows } from '../core/engine/board.js';
import { score as liveScore } from '../core/engine/difficulty.js';
import { canonicalKey, orientedCells } from '../core/engine/geometry.js';
import { progressFingerprint, puzzleId } from '../core/engine/keys.js';
import { levelForScore } from '../core/engine/levels.js';
import { createPack, parsePack, serializePack, validatePack } from '../core/engine/pack.js';
import { colorFor as liveColor, labelFor as liveLabel } from '../core/engine/palette.js';
import { countPlacements, preparePlacements } from '../core/engine/placements.js';
import {
  PuzzleCodeError, createPuzzleCodec, decodePuzzleCode, encodePuzzleCode,
} from '../core/engine/puzzlecode.js';
import * as v1 from '../core/engine/puzzlecode-v1.js';

const root = new URL('../', import.meta.url);
/** @param {string} path */
const readText = (path) => readFileSync(new URL(path, root), 'utf8');
const fixture = JSON.parse(readText('tests/fixtures/puzzlecode-v1.json'));

/** @param {string} path */
function packOf(path) {
  const parsed = parsePack(readText(path));
  assert.ok(parsed.ok, path);
  return parsed.value;
}

/**
 * @param {import('../core/engine/types.js').Pack} pack
 * @param {number} index
 * @param {Record<string, unknown>} [over]
 * @returns {import('../core/engine/puzzlecode.js').PuzzleCodeSnapshot}
 */
function snapshotOf(pack, index = 0, over = {}) {
  const puzzle = pack.puzzles[index];
  return /** @type {any} */ ({
    rows: pack.board.rows,
    rotation: pack.presentation?.rotation ?? 0,
    pieces: pack.pieces,
    clues: puzzle.clues,
    solution: puzzle.solution ?? null,
    rating: puzzle.rating ?? null,
    certificate: puzzle.certificate ?? null,
    title: puzzle.title ?? null,
    ...over,
  });
}

const samplePack = packOf('player/samples/sample-pack.json');
const handPack = packOf('tests/fixtures/hand-authored-pack.json');
const sample1 = snapshotOf(samplePack, 0);

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
function deepFreeze(value) {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

/** @param {unknown} value */
const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * What a decode must give back for a snapshot: the validated, normalized pack
 * content (colour spelling lower case, solution in piece order, empty title
 * absent).
 * @param {any} snapshot
 */
function expectedOf(snapshot) {
  const puzzle = {
    id: 'x',
    clues: snapshot.clues,
    solution: snapshot.solution,
    rating: snapshot.rating,
    certificate: snapshot.certificate,
    ...(typeof snapshot.title === 'string' ? { title: snapshot.title } : {}),
  };
  const pack = createPack({
    board: boardFromRows(snapshot.rows), rotation: snapshot.rotation, pieces: snapshot.pieces, witness: null, puzzles: [puzzle],
  });
  const checked = validatePack(pack);
  assert.ok(checked.ok, checked.ok ? '' : JSON.stringify(checked.issues));
  const order = new Map(checked.value.pieces.map((piece, i) => [piece.id, i]));
  const content = contentOf(checked.value);
  if (content.solution !== null) {
    content.solution = [...content.solution].sort((a, b) => /** @type {number} */ (order.get(a.piece)) - /** @type {number} */ (order.get(b.piece)));
  }
  return content;
}

/** @param {import('../core/engine/types.js').Pack} pack */
function contentOf(pack) {
  const puzzle = pack.puzzles[0];
  return {
    rows: pack.board.rows,
    rotation: pack.presentation?.rotation ?? 0,
    pieces: pack.pieces.map((p) => ({ id: p.id, label: p.label, color: p.color.toLowerCase(), cells: p.cells })),
    clues: puzzle.clues,
    solution: puzzle.solution ?? null,
    rating: puzzle.rating ?? null,
    certificate: puzzle.certificate ?? null,
    title: puzzle.title === undefined || puzzle.title === '' ? null : puzzle.title,
  };
}

/**
 * Encodes a frozen copy (the input is never mutated), decodes the full code and
 * the core alone, and compares everything the code promises to carry.
 * @param {any} snapshot
 * @param {{ compression?: 'auto' | 'raw' | 'deflate', codec?: ReturnType<typeof createPuzzleCodec> }} [options]
 */
async function roundTrip(snapshot, options = {}) {
  const frozen = deepFreeze(clone(snapshot));
  const codec = options.codec ?? { encodePuzzleCode, decodePuzzleCode };
  const encoded = await codec.encodePuzzleCode(frozen, options.compression === undefined ? undefined : { compression: /** @type {any} */ (options.compression) });
  assert.equal(encoded.F, encoded.T === null ? encoded.C : `${encoded.C}.${encoded.T}`);
  assert.match(encoded.F, /^[0-9A-HJKMNP-TV-Z]+(\.[0-9A-HJKMNP-TV-Z]+)?$/);
  assert.equal(encoded.T === null, snapshot.solution === null);
  const expected = expectedOf(snapshot);
  const decoded = await decodePuzzleCode(encoded.F);
  assert.equal(decoded.tailError, null);
  assert.equal(decoded.hasTail, snapshot.solution !== null);
  assert.deepEqual(contentOf(decoded.pack), expected);
  const coreOnly = await decodePuzzleCode(encoded.C);
  assert.equal(coreOnly.hasTail, false);
  assert.equal(coreOnly.tailError, null);
  assert.deepEqual(contentOf(coreOnly.pack), { ...expected, solution: null });
  const board = boardFromRows(expected.rows);
  const puzzle = decoded.pack.puzzles[0];
  assert.equal(progressFingerprint(board, decoded.pack.pieces, puzzle.clues), progressFingerprint(board, snapshot.pieces, snapshot.clues));
  assert.equal(puzzle.id, puzzleId(board, snapshot.pieces, snapshot.clues));
  return { encoded, decoded };
}

/**
 * @param {Promise<unknown>} promise
 * @param {string} code
 * @param {RegExp} [message]
 */
async function rejectsWith(promise, code, message) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof PuzzleCodeError, `expected PuzzleCodeError, got ${String(error)}`);
    assert.equal(error.code, code, error.message);
    if (message !== undefined) {
      assert.match(error.message, message);
    }
    return true;
  });
}

// ---------------------------------------------------- code construction

/** @param {v1.BitWriter} pc Version symbol, payload and zero fill (multiple of five bits). */
function frameCore(pc) {
  pc.padTo(5);
  return v1.bitsToSymbols(pc.bits) + v1.checkSymbols(v1.crc20(pc.bits));
}

/**
 * A raw core code around a payload written by `body`.
 * @param {(w: v1.BitWriter) => void} body
 * @param {number} [version]
 */
function rawCode(body, version = 1) {
  const pc = new v1.BitWriter();
  pc.write(version, 5);
  body(pc);
  return frameCore(pc);
}

/** @param {number[]} bytes Inflated payload bytes. */
function deflatedCode(bytes) {
  const compressed = deflateRawSync(Buffer.from(bytes));
  const pc = new v1.BitWriter();
  pc.write(2, 5);
  v1.writeEG(pc, 8, compressed.length);
  for (const byte of compressed) {
    pc.write(byte, 8);
  }
  return frameCore(pc);
}

/** @param {string} core @returns {{ bits: Uint8Array, end: number }} */
function payloadOf(core) {
  const bits = v1.symbolsToBits(core.slice(0, -4));
  const r = new v1.BitReader(bits, 5, bits.length);
  v1.decodeCorePayload(r);
  return { bits, end: r.pos };
}

/**
 * @param {string} text
 * @param {number} index
 * @param {string} symbol
 */
const replaceAt = (text, index, symbol) => text.slice(0, index) + symbol + text.slice(index + 1);

const GOLDEN = Object.fromEntries(fixture.goldens.map((/** @type {any} */ g) => [g.name, g]));
const goldenSnapshot = (/** @type {string} */ name) => {
  const g = GOLDEN[name];
  return snapshotOf(packOf(g.source), g.puzzle, { title: g.title });
};

// ------------------------------------------------------- small test packs

/** @type {(id: string, cells: number[][], label?: string, color?: string) => any} */
const piece = (id, cells, label = id, color = '#102030') => ({ id, label, color, cells });
/** @type {(piece: string, x: number, y: number, turn?: number, mirrored?: boolean) => any} */
const pose = (id, x, y, turn = 0, mirrored = false) => ({ piece: id, x, y, turn, mirrored });

/** @param {Record<string, unknown>} over */
const base = (over) => ({
  rows: ['##'], rotation: 0, pieces: [], clues: [], solution: null, rating: null, certificate: null, title: null, ...over,
});

const disconnected = base({
  rows: ['#.', '.#'],
  pieces: [piece('q1', [[0, 0]], '\u03b1', '#A1B2C3'), piece('z-9', [[0, 0]], '', '#0f0f0f')],
  clues: [pose('q1', 0, 0)],
  solution: [pose('z-9', 1, 1), pose('q1', 0, 0)],
});

const RING = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
const ringPuzzle = base({
  rows: ['###', '###', '###'],
  pieces: [piece('A', RING, 'A', '#e6194b'), piece('B', [[0, 0]], 'B', '#3cb44b')],
  clues: [pose('B', 1, 1)],
  solution: [pose('A', 0, 0), pose('B', 1, 1)],
});

const repeatedShapes = base({
  rows: ['##', '##', '##', '##'],
  pieces: [
    piece('d1', [[0, 0], [1, 0]], 'a', '#111111'), piece('d2', [[0, 0], [1, 0]], 'b', '#222222'),
    piece('d3', [[0, 0], [1, 0]], 'c', '#333333'), piece('d4', [[0, 0], [1, 0]], 'd', '#444444'),
  ],
  clues: [pose('d4', 0, 3), pose('d2', 0, 1)],
  solution: [pose('d3', 0, 2), pose('d1', 0, 0), pose('d2', 0, 1), pose('d4', 0, 3)],
  title: 'Pairs',
});

/**
 * The hand-authored puzzle on a board with two blocked cells of margin on every
 * side; every pose is shifted by (2, 2).
 */
function paddedHand() {
  const source = snapshotOf(handPack, 0);
  const width = source.rows[0].length + 4;
  const shift = (/** @type {any[]} */ poses) => poses.map((p) => ({ ...p, x: p.x + 2, y: p.y + 2 }));
  return {
    ...source,
    rows: ['.'.repeat(width), '.'.repeat(width), ...source.rows.map((row) => `..${row}..`), '.'.repeat(width), '.'.repeat(width)],
    rotation: 135,
    clues: shift(source.clues),
    solution: shift(/** @type {any[]} */ (source.solution)),
  };
}

const lone = base({
  rows: ['##'],
  pieces: [piece('A', [[0, 0], [1, 0]], '\udc00Z', '#ABCDEF')],
  title: 'a\ud800b\ude00',
});

const foreignRating = snapshotOf(samplePack, 0, {
  rating: {
    model: 'x-model', score: 3.5, level: 'mystery', saturated: false, censored: true,
    metrics: { nested: { list: [1, 2.5, { deep: null }], text: '\u00e9\u4e2d' }, flag: true },
  },
  title: 'Mystery',
});

const oddV2Claims = [
  { ...(/** @type {any} */ (sample1.rating)), score: 8.5 },
  { ...(/** @type {any} */ (sample1.rating)), level: 'hard' },
  { ...(/** @type {any} */ (sample1.rating)), saturated: true },
];

const maxCertificate = snapshotOf(samplePack, 0, {
  certificate: { status: 'not-proved', model: 'x-cert-\u00e9', rowLimit: Number.MAX_SAFE_INTEGER },
});

// ======================================================= raw: primitives

test('raw: CRC-20 vectors, check symbols and the complete-component residue', () => {
  const bits = [...Buffer.from('123456789')].flatMap((byte) => Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1));
  assert.equal(v1.crc20(bits), Number(fixture.crc20.ascii123456789));
  assert.deepEqual({ ...v1.CRC20 }, { width: 20, poly: 0x6c1bd, init: 0xfffff, xorOut: 0xfffff, mask: 0xfffff });
  const residue = Number(fixture.crc20.completeComponentResidue);
  assert.equal(v1.RESIDUE_REGISTER ^ 0xfffff, residue);
  for (const golden of fixture.goldens) {
    const [core, tail] = golden.code.split('.');
    const coreBits = v1.symbolsToBits(core);
    const pc = coreBits.subarray(0, coreBits.length - 20);
    assert.equal(v1.crc20(coreBits), residue, `${golden.name}: a complete core ends in the residue`);
    assert.equal(v1.checkSymbols(v1.crc20(pc)), core.slice(-4), `${golden.name}: core check`);
    // The tail check covers the core payload Pc and the tail, not the core's check symbols.
    const tailBits = v1.symbolsToBits(tail);
    const covered = v1.crc20Register(tailBits, 0, tailBits.length - 20, v1.crc20Register(pc, 0, pc.length)) ^ 0xfffff;
    assert.equal(v1.checkSymbols(covered), tail.slice(-4), `${golden.name}: tail check covers Pc + Pt`);
    assert.equal(v1.crc20Register(tailBits, 0, tailBits.length, v1.crc20Register(pc, 0, pc.length)) ^ 0xfffff, residue);
    const withCheck = v1.crc20Register(tailBits, 0, tailBits.length - 20, v1.crc20Register(coreBits, 0, coreBits.length)) ^ 0xfffff;
    assert.notEqual(v1.checkSymbols(withCheck), tail.slice(-4), `${golden.name}: the core's own check must stay out of the tail coverage`);
  }
  assert.equal(v1.checkSymbols(0xfffff), 'ZZZZ');
  assert.equal(v1.checkSymbols(0), '0000');
  assert.equal(v1.checkSymbols(0x0c80c0 & 0xfffff), v1.bitsToSymbols(Uint8Array.from('11001000000011000000'.split('').map(Number))));
  assert.equal(v1.bitsToSymbols(v1.symbolsToBits(v1.ALPHABET)), v1.ALPHABET);
});

test('raw: Exp-Golomb is exact up to the largest safe integer', () => {
  for (let k = 0; k <= 12; k += 1) {
    for (let v = 0; v < 300; v += 1) {
      const w = new v1.BitWriter();
      v1.writeEG(w, k, v);
      const length = (v + 2 ** k).toString(2).length;
      assert.equal(w.length, 2 * length - k - 1, `EG${k}(${v})`);
      const r = new v1.BitReader(w.bits);
      assert.equal(v1.readEG(r, k), v);
      assert.equal(r.remaining, 0);
    }
  }
  const small = new v1.BitWriter();
  v1.writeEG(small, 0, 0);
  v1.writeEG(small, 0, 1);
  v1.writeEG(small, 2, 0);
  assert.equal(small.bits.join(''), '1' + '010' + '100');
  for (const k of [0, 2, 3, 5, 8, 10]) {
    for (const v of [2 ** 53 - 1, 2 ** 53 - 2, 2 ** 52, 2 ** 31, 2 ** 32 - 1]) {
      const w = new v1.BitWriter();
      v1.writeEG(w, k, v);
      assert.equal(v1.readEG(new v1.BitReader(w.bits), k), v);
    }
  }
  const largest = new v1.BitWriter();
  v1.writeEG(largest, 10, Number.MAX_SAFE_INTEGER);
  assert.equal(largest.bits.indexOf(1), 43, 'EG10 of 2^53 - 1 has 43 zero bits');
  assert.equal(largest.length, 43 + 54);
  assert.throws(() => v1.writeEG(new v1.BitWriter(), 10, 2 ** 53), RangeError);
  assert.throws(() => v1.writeEG(new v1.BitWriter(), 0, -1), RangeError);
  assert.throws(() => v1.writeEG(new v1.BitWriter(), 0, 1.5), RangeError);
  // 2^53 itself, one prefix zero too many, and truncated input are typed failures.
  const over = new v1.BitWriter();
  over.write(0, 0);
  over.bits.push(...new Array(43).fill(0));
  over.writeBig(BigInt(2 ** 53) + 1024n, 54);
  assert.throws(() => v1.readEG(new v1.BitReader(over.bits), 10), (e) => e instanceof PuzzleCodeError && e.code === 'invalid');
  assert.throws(() => v1.readEG(new v1.BitReader(new Array(44).fill(0).concat([1])), 10), (e) => e instanceof PuzzleCodeError);
  assert.throws(() => v1.readEG(new v1.BitReader([0, 0, 0]), 0), (e) => e instanceof PuzzleCodeError);
});

test('raw: truncated binary is exact, prefix-free and zero-width for one choice', () => {
  for (let n = 1; n <= 300; n += 1) {
    const k = Math.floor(Math.log2(n));
    let kraft = 0;
    for (let x = 0; x < n; x += 1) {
      const w = new v1.BitWriter();
      v1.writeTB(w, x, n);
      assert.ok(w.length === k || w.length === k + 1);
      kraft += 2 ** -w.length;
      const r = new v1.BitReader(w.bits);
      assert.equal(v1.readTB(r, n), x);
      assert.equal(r.remaining, 0);
    }
    assert.equal(kraft, 1, `n=${n}`);
  }
  const w = new v1.BitWriter();
  v1.writeTB(w, 0, 1);
  assert.equal(w.length, 0);
  assert.throws(() => v1.writeTB(new v1.BitWriter(), 5, 5), RangeError);
  assert.throws(() => v1.readTB(new v1.BitReader([]), 0), (e) => e instanceof PuzzleCodeError);
  const five = new v1.BitWriter();
  for (let x = 0; x < 5; x += 1) {
    v1.writeTB(five, x, 5);
  }
  assert.equal(five.bits.join(''), '00' + '01' + '10' + '110' + '111');
});

test('raw: colex ranks are a bijection and exact for large alphabets', () => {
  for (let N = 0; N <= 9; N += 1) {
    for (let k = 0; k <= N; k += 1) {
      const total = Number(v1.binomial(N, k));
      const seen = new Set();
      for (let mask = 0; mask < 1 << N; mask += 1) {
        const subset = [...Array(N).keys()].filter((i) => (mask >> i) & 1);
        if (subset.length !== k) {
          continue;
        }
        const rank = v1.colexRank(subset);
        assert.ok(rank >= 0n && rank < BigInt(total));
        assert.deepEqual(v1.colexUnrank(rank, N, k), subset);
        seen.add(rank);
      }
      assert.equal(seen.size, total);
      const w = new v1.BitWriter();
      v1.writeRank(w, [...Array(k).keys()], N);
      assert.equal(w.length, v1.bitLength(BigInt(total) - 1n));
    }
  }
  assert.equal(v1.binomial(4655, 128) > 2n ** 600n, true);
  assert.equal(v1.binomial(5, 7), 0n);
  let seed = 12345;
  const random = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed / 2 ** 32;
  };
  for (const [N, k] of [[4655, 128], [4655, 60], [128, 64], [369, 127], [1285, 1], [4655, 3]]) {
    for (let round = 0; round < 5; round += 1) {
      const subset = new Set();
      while (subset.size < k) {
        subset.add(Math.floor(random() * N));
      }
      const sorted = [...subset].sort((a, b) => a - b);
      const w = new v1.BitWriter();
      v1.writeRank(w, sorted, N);
      assert.equal(w.length, v1.bitLength(v1.binomial(N, k) - 1n));
      assert.deepEqual(v1.readRank(new v1.BitReader(w.bits), N, k), sorted);
    }
  }
  const full = new v1.BitWriter();
  v1.writeRank(full, [0, 1, 2], 3);
  assert.equal(full.length, 0);
  assert.throws(() => v1.readRank(new v1.BitReader([1, 1, 1, 1]), 5, 2), (e) => e instanceof PuzzleCodeError && /rank/.test(e.message));
  assert.throws(() => v1.readRank(new v1.BitReader([]), 3, 4), (e) => e instanceof PuzzleCodeError);
});

test('raw: bit writer and reader keep order and bounds', () => {
  const w = new v1.BitWriter();
  w.write(5, 3);
  w.write(0, 0);
  w.writeBig(2n ** 70n + 5n, 71);
  w.write(0xffffff, 24);
  w.padTo(8);
  assert.equal(w.length % 8, 0);
  const r = new v1.BitReader(w.bits);
  assert.equal(r.read(3), 5);
  assert.equal(r.readBig(71), 2n ** 70n + 5n);
  assert.equal(r.read(24), 0xffffff);
  assert.equal(r.restIsZero(), true);
  assert.throws(() => new v1.BitReader([1]).read(2), (e) => e instanceof PuzzleCodeError);
  assert.throws(() => new v1.BitWriter().write(8, 3), RangeError);
  assert.deepEqual([...new v1.BitWriter().toBytes()], []);
  const bytes = new v1.BitWriter();
  bytes.write(0b101, 3);
  assert.deepEqual([...bytes.toBytes()], [0b10100000]);
});

// ===================================================== raw: frozen data

test('raw: the frozen catalogue has the golden count and hash', () => {
  const lines = [];
  for (let n = 1; n <= 10; n += 1) {
    assert.equal(v1.catalogueCount(n), fixture.catalogue.counts[n - 1], `size ${n}`);
    for (const shape of v1.catalogueShapes(n)) {
      lines.push(shape.map(([x, y]) => `${x},${y}`).join(' '));
    }
  }
  assert.equal(lines.length, fixture.catalogue.total);
  assert.equal(createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex'), fixture.catalogue.sha256);
  assert.deepEqual(v1.catalogueShapes(4).map((s) => s.map(([x, y]) => `${x},${y}`).join(' ')), [
    '0,0 1,0 2,0 3,0', '0,0 1,0 2,0 0,1', '0,0 1,0 2,0 1,1', '0,0 1,0 0,1 1,1', '0,0 1,0 1,1 2,1',
  ]);
  assert.throws(() => v1.catalogueShapes(11), RangeError);
  assert.throws(() => v1.catalogueShapes(0), RangeError);
});

test('raw: every catalogue shape is canonical, connected, ordered and independent of the live key', () => {
  for (let n = 1; n <= 10; n += 1) {
    const shapes = v1.catalogueShapes(n);
    const step = n < 9 ? 1 : 7;
    for (let i = 0; i < shapes.length; i += step) {
      const text = `${n}:${shapes[i].map(([x, y]) => `${x},${y}`).join(';')}`;
      assert.equal(canonicalKey(shapes[i]), text, `size ${n} shape ${i} is the canonical form`);
    }
    for (let i = 1; i < shapes.length; i += 1) {
      assert.ok(v1.compareCells(shapes[i - 1], shapes[i]) < 0, `size ${n} is strictly ascending`);
    }
  }
});

test('raw: importing the codec builds no catalogue and no work', () => {
  const script = [
    "import * as input from './core/engine/puzzlecode-input.js';",
    "import * as codec from './core/engine/puzzlecode.js';",
    "import * as v1 from './core/engine/puzzlecode-v1.js';",
    'console.log(JSON.stringify({ built: v1.catalogueStats.sizesBuilt, exports: Object.keys(codec).length + Object.keys(input).length }));',
  ].join('\n');
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: new URL('.', root), encoding: 'utf8' });
  const result = JSON.parse(out);
  assert.equal(result.built, 0);
  assert.ok(result.exports > 5);
});

test('raw: the 128 default colours and labels are pinned', () => {
  assert.equal(fixture.colors.length, 128);
  for (let i = 0; i < 128; i += 1) {
    assert.equal(v1.colorFor(i), fixture.colors[i], `colour ${i}`);
    assert.equal(v1.colorFor(i), liveColor(i), `the live palette agrees today at ${i}`);
    assert.equal(v1.labelFor(i), liveLabel(i), `label ${i}`);
  }
  assert.equal(v1.FROZEN_COLORS.length, 128);
  assert.deepEqual([0, 25, 26, 51, 52, 126, 127].map(v1.labelFor), ['A', 'Z', 'AA', 'AZ', 'BA', 'DW', 'DX']);
});

test('raw: integer scores and bands equal the live functions for all 640,128 combinations', () => {
  assert.deepEqual([...v1.RATING.thresholds], fixture.ratingTables.thresholds);
  assert.deepEqual([...v1.RATING.bandEdges], fixture.ratingTables.bandEdges);
  assert.equal(v1.RATING.branchCap, fixture.ratingTables.branchCap);
  assert.equal(v1.RATING.rowCap, fixture.ratingTables.rowCap);
  assert.equal(v1.RATING.thresholds.length, 30);
  let checked = 0;
  for (let U = 1; U <= 128; U += 1) {
    for (let B = 0; B <= 5000; B += 1) {
      const frozen = v1.frozenScore(U, B);
      if (frozen !== liveScore(U, B)) {
        assert.fail(`score(${U}, ${B}): frozen ${frozen}, live ${liveScore(U, B)}`);
      }
      checked += 1;
    }
  }
  assert.equal(checked, 640128);
  assert.equal(v1.frozenScore(0, 4000), 0);
  const maximum = v1.frozenScore(128, 5000);
  assert.equal(maximum, 286);
  assert.ok(maximum < 341, 'below the next band edge');
  for (let s = 0; s <= 286; s += 1) {
    assert.equal(v1.frozenLevelId(s), levelForScore(s).id, `level of ${s}`);
  }
  assert.deepEqual(['very-easy', 'nightmare', 'hell-1', 'hell-999'].map(v1.levelLabelOf), ['Very easy', 'Nightmare', 'Hell 1', 'Hell 999']);
  assert.deepEqual(['hell-0', 'hell-1000', 'hell-01', 'Easy', 'EASY', '', 7, null].map((v) => v1.levelLabelOf(v)), new Array(8).fill(null));
});

// ================================================== raw: goldens and packs

test('raw: the repository goldens are reproduced exactly', async () => {
  for (const golden of fixture.goldens) {
    const encoded = await encodePuzzleCode(goldenSnapshot(golden.name), { compression: 'raw' });
    assert.equal(encoded.F, golden.code, golden.name);
    assert.equal(encoded.version, 1);
    assert.equal(encoded.C, golden.code.split('.')[0]);
    assert.equal(encoded.T, golden.code.split('.')[1]);
    const { decoded } = await roundTrip(goldenSnapshot(golden.name), { compression: 'raw' });
    assert.equal(decoded.pack.puzzles[0].title, golden.title);
    const auto = await encodePuzzleCode(goldenSnapshot(golden.name));
    assert.equal(auto.F, golden.code, 'raw is shorter for every repository puzzle, so auto chooses it');
  }
});

test('raw: edge-case goldens are reproduced and decode to their changed field', async () => {
  for (const edge of fixture.edges) {
    const snapshot = { ...goldenSnapshot(edge.base), ...(edge.set ?? {}) };
    const codec = edge.forceRebuildFailure === true
      ? createPuzzleCodec({ measure() { throw new Error('forced failure'); } })
      : { encodePuzzleCode, decodePuzzleCode };
    const encoded = await codec.encodePuzzleCode(snapshot, { compression: edge.compression ?? 'raw' });
    assert.equal(encoded.F, edge.code, edge.name);
    const decoded = await decodePuzzleCode(edge.code);
    assert.equal(decoded.hasTail, true);
    const puzzle = decoded.pack.puzzles[0];
    if (edge.set?.title !== undefined) {
      assert.equal(puzzle.title, edge.set.title);
    }
    if (edge.set?.certificate !== undefined) {
      assert.deepEqual(puzzle.certificate, edge.set.certificate);
    }
    if (edge.escapedClaim !== undefined) {
      assert.equal(JSON.stringify(puzzle.rating), edge.escapedClaim);
      assert.deepEqual(puzzle.rating, snapshot.rating);
    }
    assert.deepEqual(contentOf(decoded.pack), expectedOf(snapshot), edge.name);
  }
});

test('raw: a failed rating reconstruction keeps the whole claim instead of failing the encode', async () => {
  const failing = createPuzzleCodec({ measure() { throw new RangeError('no model'); } });
  const normal = await encodePuzzleCode(sample1, { compression: 'raw' });
  const escaped = await failing.encodePuzzleCode(sample1, { compression: 'raw' });
  assert.ok(escaped.C.length > normal.C.length + 100, 'the claim is carried as text');
  const decoded = await decodePuzzleCode(escaped.F);
  assert.deepEqual(decoded.pack.puzzles[0].rating, sample1.rating);
  // Without a rating the counter is never consulted.
  await failing.encodePuzzleCode({ ...sample1, rating: null }, { compression: 'raw' });
});

test('raw: the decoded pack is an ordinary one-puzzle pack with a recomputed id', async () => {
  const { decoded } = await roundTrip(sample1, { compression: 'raw' });
  const pack = decoded.pack;
  assert.deepEqual(Object.keys(pack).sort(), ['board', 'format', 'kind', 'pieces', 'presentation', 'puzzles', 'rules', 'version', 'witness']);
  assert.equal(pack.format, 'pentomino-pack');
  assert.equal(pack.version, 1);
  assert.equal(pack.kind, 'puzzle-pack');
  assert.equal(pack.rules, 'free-polyomino-v1');
  assert.equal(pack.witness, null);
  assert.equal(pack.puzzles.length, 1);
  const puzzle = pack.puzzles[0];
  assert.deepEqual(Object.keys(puzzle).sort(), ['certificate', 'clues', 'id', 'rating', 'solution', 'title']);
  assert.match(puzzle.id, /^p[0-9a-f]{12}$/);
  assert.equal(puzzle.id, puzzleId(boardFromRows(pack.board.rows), pack.pieces, puzzle.clues));
  assert.equal(JSON.stringify(pack).includes('verified'), false);
  const again = validatePack(JSON.parse(serializePack(pack)));
  assert.ok(again.ok);
  assert.deepEqual(again.value.puzzles[0].clues, puzzle.clues);
  const core = await decodePuzzleCode((await encodePuzzleCode(sample1, { compression: 'raw' })).C);
  assert.equal(core.pack.puzzles[0].solution, null);
  assert.equal('seed' in puzzle, false);
});

test('raw: constructed puzzles survive with their identity, order, blocked margins and angle', async () => {
  const packs = {
    disconnected, ringPuzzle, repeatedShapes, padded: paddedHand(), lone, foreignRating, maxCertificate,
    fractional: snapshotOf(samplePack, 0, { rating: oddV2Claims[0] }),
    inconsistentLevel: snapshotOf(samplePack, 0, { rating: oddV2Claims[1] }),
    saturatedClaim: snapshotOf(samplePack, 0, { rating: oddV2Claims[2] }),
  };
  for (const [name, snapshot] of Object.entries(packs)) {
    const { decoded } = await roundTrip(snapshot, { compression: 'raw' });
    const content = contentOf(decoded.pack);
    assert.deepEqual(content.rows, snapshot.rows, `${name}: rows keep every blocked margin`);
    assert.equal(content.rotation, snapshot.rotation, `${name}: the display angle`);
    assert.deepEqual(content.pieces.map((p) => p.id), snapshot.pieces.map((p) => p.id), `${name}: piece order`);
    assert.deepEqual(content.pieces.map((p) => p.cells), snapshot.pieces.map((p) => p.cells), `${name}: stored orientation`);
  }
  const padded = paddedHand();
  assert.equal(padded.rows.length, handPack.board.rows.length + 4);
  const plain = await encodePuzzleCode(snapshotOf(handPack, 0), { compression: 'raw' });
  const shifted = await encodePuzzleCode(padded, { compression: 'raw' });
  assert.notEqual(plain.C, shifted.C);
  assert.equal(progressFingerprint(boardFromRows(padded.rows), padded.pieces, padded.clues) === progressFingerprint(boardFromRows(snapshotOf(handPack, 0).rows), handPack.pieces, handPack.puzzles[0].clues), false);
});

test('raw: the first puzzle clue order, custom colours and labels are kept; colour case is the only respelling', async () => {
  const { decoded } = await roundTrip(repeatedShapes, { compression: 'raw' });
  const pack = decoded.pack;
  assert.deepEqual(pack.puzzles[0].clues.map((c) => c.piece), ['d4', 'd2'], 'clue records keep their array order');
  assert.deepEqual(pack.puzzles[0].solution?.map((p) => p.piece), ['d1', 'd2', 'd3', 'd4'], 'a stored answer is written in piece order');
  assert.deepEqual(pack.pieces.map((p) => [p.id, p.label, p.color]), [
    ['d1', 'a', '#111111'], ['d2', 'b', '#222222'], ['d3', 'c', '#333333'], ['d4', 'd', '#444444'],
  ]);
  const upper = await roundTrip({ ...disconnected, pieces: disconnected.pieces.map((p) => ({ ...p, color: p.color.toUpperCase() })) }, { compression: 'raw' });
  assert.deepEqual(upper.decoded.pack.pieces.map((p) => p.color), ['#a1b2c3', '#0f0f0f']);
  const defaults = await roundTrip({ ...ringPuzzle, pieces: ringPuzzle.pieces.map((p) => ({ ...p, color: p.color.toUpperCase() })) }, { compression: 'raw' });
  assert.deepEqual(defaults.decoded.pack.pieces.map((p) => p.color), ['#e6194b', '#3cb44b']);
  const sameDefault = await encodePuzzleCode(ringPuzzle, { compression: 'raw' });
  const upperDefault = await encodePuzzleCode({ ...ringPuzzle, pieces: ringPuzzle.pieces.map((p) => ({ ...p, color: p.color.toUpperCase() })) }, { compression: 'raw' });
  assert.equal(sameDefault.F, upperDefault.F, 'default colours are compared ignoring case');
});

test('raw: Unicode, lone surrogates and a leading byte-order mark survive exactly', async () => {
  const { decoded } = await roundTrip(lone, { compression: 'raw' });
  assert.equal(decoded.pack.puzzles[0].title, 'a\ud800b\ude00');
  assert.equal(decoded.pack.pieces[0].label, '\udc00Z');
  for (const title of ['\ufeffBOM first', 'astral \u{1f9e9} piece', 'e\u0301 combining', '\u202eRTL', 'x'.repeat(80), '\u{1f9e9}'.repeat(80)]) {
    const { decoded: d } = await roundTrip({ ...disconnected, title }, { compression: 'raw' });
    assert.equal(d.pack.puzzles[0].title, title);
  }
  const absent = await encodePuzzleCode({ ...disconnected, title: null }, { compression: 'raw' });
  const empty = await encodePuzzleCode({ ...disconnected, title: '' }, { compression: 'raw' });
  assert.equal(empty.F, absent.F, 'an empty title is absent');
  assert.equal((await decodePuzzleCode(empty.F)).pack.puzzles[0].title, undefined);
});

test('raw: titles use the level label kinds only when they rebuild exactly', async () => {
  const titled = async (/** @type {string} */ title, /** @type {any} */ rating = sample1.rating) => {
    const { decoded, encoded } = await roundTrip({ ...sample1, title, rating }, { compression: 'raw' });
    assert.equal(decoded.pack.puzzles[0].title, title);
    return encoded.C.length;
  };
  const literal = await titled('Zasy');
  assert.ok(await titled('Easy') < literal, 'the bare level label is a short kind');
  assert.ok(await titled('Easy #7') < literal + 2);
  await titled('Easy #1');
  await titled('Easy #2147483647');
  for (const title of ['Easy #0', 'Easy #007', 'Easy #', 'Easy #12345678901', 'Easy #2147483648', 'Easy #9007199254740993', 'easy #3', 'Easy  #3', 'Easy #3x']) {
    await titled(title);
  }
  // The label is looked up from the carried claim, so a foreign or unknown level stays literal.
  await titled('Easy #4', null);
  await titled('Easy #4', { ...sample1.rating, level: 'mystery' });
  await titled('Hell 12 #5', { ...sample1.rating, level: 'hell-12' });
  await titled('Hell 1', { ...sample1.rating, level: 'hell-1' });
  await titled('Mystery #2', { ...sample1.rating, level: 'mystery' });
  await titled('Normal #2', { ...sample1.rating, level: 'normal', score: 14 });
});

test('raw: certificates keep their model, status and every row limit', async () => {
  for (const status of ['unique', 'multiple', 'not-proved', 'unsatisfiable']) {
    for (const model of ['dlx-v1', 'other-v2', '\u00e9\u4e2d']) {
      for (const rowLimit of [undefined, 0, 1, 1023, 1024, 2 ** 31, 2 ** 40 + 3, 2 ** 53 - 1]) {
        const certificate = rowLimit === undefined ? { status, model } : { status, model, rowLimit };
        const { decoded } = await roundTrip({ ...sample1, certificate }, { compression: 'raw' });
        assert.deepEqual(decoded.pack.puzzles[0].certificate, certificate);
      }
    }
  }
});

test('raw: a foreign claim keeps censored, nested metrics and its field order', async () => {
  const { decoded } = await roundTrip(foreignRating, { compression: 'raw' });
  const claim = decoded.pack.puzzles[0].rating;
  assert.deepEqual(claim, foreignRating.rating);
  assert.deepEqual(Object.keys(/** @type {object} */ (claim)), ['model', 'score', 'level', 'saturated', 'censored', 'metrics']);
  assert.equal(/** @type {any} */ (claim).metrics.nested.text, '\u00e9\u4e2d');
});

test('raw: the count-only stress pack of 1,024 cells and 128 pieces needs no exact-cover model', async () => {
  const cells = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [0, 2]];
  const pieces = Array.from({ length: 128 }, (_, i) => piece(v1.labelFor(i), cells, v1.labelFor(i), v1.colorFor(i)));
  const rows = Array.from({ length: 16 }, () => '#'.repeat(64));
  const board = boardFromRows(rows);
  const plan = preparePlacements(board, pieces, []);
  assert.equal(countPlacements(plan).rows, 849920);
  const { R, H } = v1.measureFreePlacements(board, pieces, []);
  assert.equal(R, 1024);
  assert.ok(Math.abs(H - Math.log2(1 + 849920 / 128)) < 1e-12);
  const claim = {
    model: 'difficulty-v2', score: 256, level: 'hell-4', saturated: false,
    metrics: { U: 128, B: 0, branchTrials: 0, rowTrials: 0, stop: 'solution', R, H },
  };
  const snapshot = base({ rows, pieces, rating: claim });
  const consistent = (await roundTrip(snapshot, { compression: 'raw' })).encoded;
  assert.deepEqual((await decodePuzzleCode(consistent.F)).pack.puzzles[0].rating, claim);
  assert.ok(consistent.C.length < 80, `compact form, not the escape (${consistent.C.length} symbols)`);
  const edited = { ...claim, metrics: { ...claim.metrics, H: claim.metrics.H + 1 } };
  const escaped = (await roundTrip({ ...snapshot, rating: edited }, { compression: 'raw' })).encoded;
  assert.deepEqual((await decodePuzzleCode(escaped.F)).pack.puzzles[0].rating, edited);
  assert.ok(escaped.C.length > 250, 'the changed claim is carried whole');
  const bare = await roundTrip({ ...snapshot, rating: null }, { compression: 'raw' });
  assert.ok(bare.encoded.C.length < consistent.C.length);
  assert.equal(v1.rebuildRatingClaim(board, pieces, [], { stop: 'solution', branchTrials: 0, rowTrials: 0 }, v1.measureFreePlacements).level, 'hell-4');
});

test('raw: the 24 x 24 oracle decodes to its independent facts and re-encodes to itself', async () => {
  const large = fixture.large;
  const decoded = await decodePuzzleCode(large.code);
  assert.equal(decoded.hasTail, true);
  assert.equal(large.code.split('.')[0].length, large.coreLength);
  assert.equal(large.code.length, large.fullLength, 'F counts its dot');
  const pack = decoded.pack;
  assert.equal(pack.board.rows.length, large.height);
  assert.ok(pack.board.rows.every((row) => row === '#'.repeat(large.width)));
  assert.equal(pack.presentation?.rotation, large.rotation);
  assert.equal(pack.pieces.length, large.pieceCount);
  assert.deepEqual(pack.pieces.map((p) => p.cells.length), large.pieceSizes);
  assert.deepEqual(pack.pieces.map((p) => p.id), pack.pieces.map((_, i) => v1.labelFor(i)));
  assert.deepEqual(pack.pieces.map((p) => p.label), pack.pieces.map((_, i) => v1.labelFor(i)));
  assert.deepEqual(pack.pieces.map((p) => p.color), pack.pieces.map((_, i) => fixture.colors[i]));
  const puzzle = pack.puzzles[0];
  assert.deepEqual(puzzle.clues, large.clues);
  assert.deepEqual(puzzle.rating, large.rating);
  assert.equal(puzzle.solution?.length, large.pieceCount);
  assert.equal(progressFingerprint(boardFromRows(pack.board.rows), pack.pieces, puzzle.clues), large.progressFingerprint);
  const again = await encodePuzzleCode(snapshotOf(pack, 0), { compression: 'raw' });
  assert.equal(again.F, large.code);
  assert.equal(again.F.length, large.fullLength);
});

test('raw: the raw negative vectors and the certificate overflow are rejected as invalid', async () => {
  const messages = [/unused data/, /unused data/, /unused data/, /unused data/, /out of range/];
  for (const [i, negative] of fixture.negatives.entries()) {
    if (negative.code.startsWith('1')) {
      await rejectsWith(decodePuzzleCode(negative.code), negative.error, messages[i]);
    }
  }
  const overflow = fixture.negatives[4];
  assert.equal(overflow.defect, 'Certificate rowLimit 2^53, one above the safe range');
  const accepted = await decodePuzzleCode(fixture.edges[3].code);
  assert.equal(accepted.pack.puzzles[0].certificate?.rowLimit, Number.MAX_SAFE_INTEGER);
});

test('raw: input and a decoded pack are never mutated and are detached from each other', async () => {
  const snapshot = deepFreeze(clone(sample1));
  const encoded = await encodePuzzleCode(snapshot, { compression: 'raw' });
  assert.deepEqual(snapshot, sample1);
  const first = await decodePuzzleCode(encoded.F);
  const second = await decodePuzzleCode(encoded.F);
  assert.notEqual(first.pack, second.pack);
  assert.notEqual(first.pack.pieces[0].cells, second.pack.pieces[0].cells);
  first.pack.pieces[0].cells.push([9, 9]);
  assert.equal(second.pack.pieces[0].cells.length, sample1.pieces[0].cells.length);
  const catalogue = v1.catalogueShapes(5);
  const before = JSON.stringify(catalogue);
  (await decodePuzzleCode(fixture.large.code)).pack.pieces.forEach((p) => p.cells.pop());
  assert.equal(JSON.stringify(v1.catalogueShapes(5)), before);
});

// ================================================ bounded decoder cases

/**
 * Options block without rating, title and certificate, then the geometry up to
 * the piece count, written with the frozen grammar.
 * @param {v1.BitWriter} w
 * @param {{ repeated?: number, rating?: (w: v1.BitWriter) => void, title?: (w: v1.BitWriter) => void,
 *   W?: number, H?: number, mask?: (w: v1.BitWriter) => void, K?: number }} [o]
 */
function head(w, o = {}) {
  const { repeated = 0, W = 2, H = 1, K = 1 } = o;
  w.write(repeated, 1);
  if (o.rating) {
    o.rating(w);
  } else {
    w.write(0, 1);
  }
  if (o.title) {
    o.title(w);
  } else {
    w.write(0, 2);
  }
  w.write(0, 1);
  w.write(W - 1, 6);
  w.write(H - 1, 6);
  if (o.mask) {
    o.mask(w);
  } else {
    v1.writeTB(w, 0, 5);
  }
  w.write(0, 3);
  v1.writeEG(w, 3, K - 1);
}

/** @param {v1.BitWriter} w @param {number[]} flags canonical order, orientation, default identity */
const flags = (w, flags) => flags.forEach((bit) => w.write(bit, 1));

/** Tail of a one-puzzle payload: no clues in piece order. */
function noClues(/** @type {v1.BitWriter} */ w, /** @type {number} */ K) {
  v1.writeTB(w, 0, K + 1);
  w.write(1, 1);
}

/** A valid K = 1 puzzle: a domino on a 2 x 1 board, no clue. */
function dominoPayload(/** @type {v1.BitWriter} */ w) {
  head(w);
  flags(w, [1, 1, 1]);
  v1.writeEG(w, 2, 1);
  noClues(w, 1);
}

/**
 * Identity-override block of a K = 2 pair of monominoes (repeated shapes).
 * @param {(w: v1.BitWriter, piece: number) => void} writePiece
 */
function pairPayload(writePiece) {
  return (/** @type {v1.BitWriter} */ w) => {
    head(w, { repeated: 1, K: 2 });
    flags(w, [1, 1, 0]);
    w.write(1, 1);
    v1.writeEG(w, 2, 0);
    writePiece(w, 0);
    writePiece(w, 1);
    noClues(w, 2);
  };
}

/** @param {string} id @param {string} [label] */
const overrideId = (id, label) => (/** @type {v1.BitWriter} */ w) => {
  w.write(1, 1);
  w.write(label === undefined ? 0 : 1, 1);
  w.write(0, 1);
  v1.writeText(w, id);
  if (label !== undefined) {
    v1.writeText(w, label);
  }
};

test('the construction helpers build a valid minimal puzzle', async () => {
  const decoded = await decodePuzzleCode(rawCode(dominoPayload));
  assert.deepEqual(decoded.pack.board.rows, ['##']);
  assert.deepEqual(decoded.pack.pieces, [{ id: 'A', label: 'A', color: '#e6194b', cells: [[0, 0], [1, 0]] }]);
  assert.deepEqual(decoded.pack.puzzles[0].clues, []);
  assert.equal(decoded.pack.puzzles[0].rating, null);
  const pair = await decodePuzzleCode(rawCode(pairPayload((w, i) => overrideId(i === 0 ? 'x' : 'y')(w))));
  assert.deepEqual(pair.pack.pieces.map((p) => [p.id, p.label, p.color]), [['x', 'B', '#e6194b'], ['y', 'C', '#3cb44b']].map(([id], i) => [id, v1.labelFor(i), v1.colorFor(i)]));
});

test('bounds: sizes and counts are accepted just inside their limits', async () => {
  const wide = base({ rows: [`${'#'.repeat(64)}`, `${'#'.repeat(64)}`], pieces: [piece('A', [...Array(128).keys()].map((i) => [i % 64, Math.floor(i / 64)]), 'A', '#e6194b')] });
  await roundTrip(wide, { compression: 'raw' });
  await roundTrip(base({ rows: ['#'], pieces: [piece('A', [[0, 0]], 'A', '#e6194b')] }), { compression: 'raw' });
  const single = await encodePuzzleCode(base({ rows: ['#'], pieces: [piece('A', [[0, 0]], 'A', '#e6194b')] }), { compression: 'raw' });
  assert.ok(single.C.length <= 14, `a 1 x 1 puzzle is tiny (${single.C.length})`);
});

/** @param {v1.BitWriter} w The rest of a valid K = 1 domino puzzle after its head. */
function complete(w) {
  flags(w, [1, 1, 1]);
  v1.writeEG(w, 2, 1);
  noClues(w, 1);
}

/** @type {[string, (w: v1.BitWriter) => void, string, RegExp][]} */
const CRAFTED = [
  ['more than 128 pieces', (w) => head(w, { K: 129 }), 'invalid', /pieces/],
  ['a piece of 129 cells', (w) => { head(w, { W: 64, H: 3 }); flags(w, [1, 1, 1]); v1.writeEG(w, 2, 128); }, 'invalid', /cells/],
  ['a piece size that drops to zero', (w) => { head(w, { W: 3, K: 2 }); flags(w, [1, 1, 1]); v1.writeEG(w, 2, 1); v1.writeEG(w, 0, 2); }, 'invalid', /cells/],
  ['sizes that do not add up to the board', (w) => { head(w); flags(w, [1, 1, 1]); v1.writeEG(w, 2, 2); }, 'invalid', /add up/],
  ['a board of 1,088 active cells', (w) => head(w, { W: 64, H: 17 }), 'invalid', /active cells/],
  ['a board with no active cell', (w) => head(w, { mask: (m) => { v1.writeTB(m, 4, 5); m.write(0, 2); } }), 'invalid', /active cells/],
  ['G equal to K', (w) => { head(w); flags(w, [1, 1, 1]); v1.writeEG(w, 2, 1); v1.writeTB(w, 1, 2); w.write(1, 1); }, 'invalid', /at most 0/],
  ['a subset larger than its alphabet', (w) => { head(w, { W: 2, K: 2 }); flags(w, [1, 1, 1]); v1.writeEG(w, 2, 0); v1.writeEG(w, 0, 0); }, 'invalid', /alphabet/],
  ['a subset rank above C(N, k)', (w) => {
    head(w, { W: 8, K: 2 }); flags(w, [1, 1, 1]); v1.writeEG(w, 2, 3); v1.writeEG(w, 0, 0); w.write(15, 4);
  }, 'invalid', /rank/],
  ['a shape that cannot finish its BFS', (w) => {
    head(w, { W: 11 }); flags(w, [1, 1, 1]); v1.writeEG(w, 2, 10); w.write(0, 8);
  }, 'invalid', /declared size/],
  ['duplicate piece ids', pairPayload((w) => overrideId('A')(w)), 'invalid', /repeated/],
  ['an id with a forbidden character', pairPayload((w, i) => overrideId(i === 0 ? 'a b' : 'ok')(w)), 'invalid', /Piece id/],
  ['an id of nine characters', pairPayload((w, i) => overrideId(i === 0 ? 'abcdefghi' : 'ok')(w)), 'invalid', /Piece id/],
  ['a label of five code points', pairPayload((w, i) => overrideId(i === 0 ? 'p' : 'q', i === 0 ? 'abcde' : 'z')(w)), 'invalid', /Piece label/],
  ['ill-formed UTF-8 in an id', pairPayload((w, i) => {
    if (i === 0) {
      flags(w, [1, 0, 0]);
      w.write(0, 1);
      v1.writeEG(w, 3, 1);
      w.write(0xff, 8);
    } else {
      overrideId('q')(w);
    }
  }), 'invalid', /UTF-8/],
  ['an oversized text length that must not be allocated', pairPayload((w, i) => {
    if (i === 0) {
      flags(w, [1, 0, 0]);
      w.write(0, 1);
      v1.writeEG(w, 3, 2 ** 40);
    } else {
      overrideId('q')(w);
    }
  }), 'invalid', /too long/],
  ['an oversized UTF-16 text length', pairPayload((w, i) => {
    if (i === 0) {
      flags(w, [1, 0, 0]);
      w.write(1, 1);
      v1.writeEG(w, 3, 2 ** 53 - 1);
    } else {
      overrideId('q')(w);
    }
  }), 'invalid', /too long/],
  ['a title of 81 code points', (w) => {
    head(w, { title: (t) => { t.write(3, 2); v1.writeText(t, 'x'.repeat(81)); } });
    complete(w);
  }, 'invalid', /title/],
  ['a title count above four times the limit', (w) => head(w, { title: (t) => { t.write(3, 2); t.write(0, 1); v1.writeEG(t, 3, 321); } }), 'invalid', /too long/],
  ['a title referring to a level that the rating lacks', (w) => { head(w, { title: (t) => t.write(1, 2) }); complete(w); }, 'invalid', /level/],
  ['a title number above 2^31 - 1', (w) => head(w, {
    rating: (r) => { r.write(1, 1); r.write(0, 1); v1.writeText(r, JSON.stringify({ model: 'm', score: 1, level: 'easy' })); },
    title: (t) => { t.write(2, 2); v1.writeEG(t, 2, 2147483647); },
  }), 'invalid', /title number/],
  ['a rating model of 65 characters', (w) => {
    head(w, { rating: (r) => { r.write(1, 1); r.write(0, 1); v1.writeText(r, JSON.stringify({ model: 'm'.repeat(65), score: 1, level: 'x' })); } });
    complete(w);
  }, 'invalid', /Rating model/],
  ['rating JSON that is not an object', (w) => {
    head(w, { rating: (r) => { r.write(1, 1); r.write(0, 1); v1.writeText(r, 'null'); } });
    complete(w);
  }, 'invalid', /rating/],
  ['rating JSON that does not parse', (w) => {
    head(w, { rating: (r) => { r.write(1, 1); r.write(0, 1); v1.writeText(r, '{nope'); } });
    complete(w);
  }, 'invalid', /rating/],
  ['rating JSON of 8,193 bytes', (w) => head(w, { rating: (r) => { r.write(1, 1); r.write(0, 1); r.write(0, 1); v1.writeEG(r, 3, 8193); } }), 'invalid', /too long/],
  ['rating JSON of 8,192 bytes with oversized metrics', (w) => {
    const fixed = Buffer.byteLength(JSON.stringify({ model: 'x', score: 1, level: 'y', metrics: { p: '' } }));
    const json = JSON.stringify({ model: 'x', score: 1, level: 'y', metrics: { p: 'a'.repeat(8192 - fixed) } });
    assert.equal(Buffer.byteLength(json), 8192);
    head(w, { rating: (r) => { r.write(1, 1); r.write(0, 1); v1.writeText(r, json); } });
    complete(w);
  }, 'invalid', /metrics exceed/],
  ['a rating counter above its cap', (w) => head(w, { rating: (r) => { r.write(1, 1); r.write(1, 1); v1.writeTB(r, 0, 3); v1.writeEG(r, 5, 5001); v1.writeEG(r, 5, 0); } }), 'invalid', /cap/],
  ['an Exp-Golomb prefix that is too long', (w) => head(w, { title: (t) => { t.write(2, 2); t.bits.push(...new Array(52).fill(0)); t.write(1, 1); } }), 'invalid', /out of range/],
  ['a blocked-cell index outside the board', (w) => head(w, { mask: (m) => { v1.writeTB(m, 1, 5); v1.writeEG(m, 2, 1); m.write(0, 3); v1.writeEG(m, 0, 5); } }), 'invalid', /outside the board/],
  ['more blocked cells than cells', (w) => head(w, { mask: (m) => { v1.writeTB(m, 1, 5); v1.writeEG(m, 2, 3); m.write(0, 3); } }), 'invalid', /more blocked/],
  ['a board run that leaves the board', (w) => head(w, { mask: (m) => { v1.writeTB(m, 2, 5); m.write(0, 3); v1.writeEG(m, 2, 1); v1.writeEG(m, 0, 9); } }), 'invalid', /leaves the board/],
  ['more board runs than cells', (w) => head(w, { mask: (m) => { v1.writeTB(m, 2, 5); m.write(0, 3); v1.writeEG(m, 2, 1000); } }), 'invalid', /more runs/],
  ['overlapping blocked rectangles', (w) => head(w, { W: 4, H: 2, mask: (m) => {
    v1.writeTB(m, 3, 5); v1.writeEG(m, 0, 2);
    for (const start of [0, 1]) { v1.writeTB(m, start, 8); v1.writeTB(m, 1, 4 - start); v1.writeTB(m, 0, 2); }
  } }), 'invalid', /overlap/],
  ['a blocked-rectangle count above the cell count', (w) => head(w, { mask: (m) => { v1.writeTB(m, 3, 5); v1.writeEG(m, 0, 3); } }), 'invalid', /rectangles/],
  ['a bitmap that stops early', (w) => head(w, { W: 8, H: 8, mask: (m) => { v1.writeTB(m, 4, 5); m.write(0, 10); } }), 'invalid', /ends too early/],
];

test('bounds: every malformed payload with a valid checksum is a typed invalid error', async () => {
  for (const [name, body, code, message] of CRAFTED) {
    await rejectsWith(decodePuzzleCode(rawCode(body)), code, message).catch((error) => {
      error.message = `${name}: ${error.message}`;
      throw error;
    });
  }
});

test('bounds: the 4n + 8 BFS bound and oversized claims cost no allocation', async () => {
  const start = performance.now();
  await rejectsWith(decodePuzzleCode(rawCode(CRAFTED[15][1])), 'invalid', /too long/);
  await rejectsWith(decodePuzzleCode(rawCode(CRAFTED[16][1])), 'invalid', /too long/);
  assert.ok(performance.now() - start < 2000, 'claimed lengths are rejected before anything is read');
  // A BFS shape that keeps answering "not in the shape" runs out of queue, never past 4n + 8 reads.
  for (const n of [11, 12, 20, 128]) {
    await rejectsWith(decodePuzzleCode(rawCode((w) => {
      head(w, { W: Math.min(n, 64), H: Math.ceil(n / 64) }); flags(w, [1, 1, 1]); v1.writeEG(w, 2, n - 1); w.bits.push(...new Array(600).fill(0));
    })), 'invalid');
  }
});

test('bounds: padding, trailing data, truncation and version symbols', async () => {
  const valid = rawCode(dominoPayload);
  assert.ok((await decodePuzzleCode(valid)).pack);
  for (const extra of [5, 6, 10]) {
    await rejectsWith(decodePuzzleCode(rawCode((w) => { dominoPayload(w); w.write(0, extra); })), 'invalid', /unused data/);
  }
  for (const extra of [1, 2, 3, 4]) {
    const padded = rawCode((w) => { dominoPayload(w); w.write(0, extra); });
    if (padded.length === valid.length) {
      assert.ok((await decodePuzzleCode(padded)).pack, 'zero fill below five bits is padding');
    }
  }
  await rejectsWith(decodePuzzleCode(rawCode((w) => { dominoPayload(w); w.write(1, 1); w.padTo(5); })), 'invalid', /unused data/);
  for (const version of [0, 3, 4, 15, 16, 31]) {
    const unsupported = rawCode(dominoPayload, version);
    await assert.rejects(decodePuzzleCode(unsupported), (error) => {
      assert.ok(error instanceof PuzzleCodeError);
      assert.equal(error.code, 'version');
      assert.equal(error.candidate, undefined, 'a checksum-valid future version is never repaired');
      return true;
    });
    const typo = replaceAt(unsupported, 7, unsupported[7] === '0' ? '1' : '0');
    await assert.rejects(decodePuzzleCode(typo), (error) => error instanceof PuzzleCodeError && error.code === 'core-check' && error.candidate === undefined);
  }
  for (const length of [0, 1, 4]) {
    await rejectsWith(decodePuzzleCode('1'.repeat(length) || '.'), length === 0 ? 'empty' : 'core-check');
  }
  await rejectsWith(decodePuzzleCode('.1234'), 'core-check');
  await rejectsWith(decodePuzzleCode('1D0J.18V3WE'), 'core-check');
  await rejectsWith(decodePuzzleCode(rawCode((w) => w.write(0, 0))), 'invalid', /ends too early/);
  // Every truncation of a real payload is a typed outcome: a puzzle or a PuzzleCodeError, nothing else.
  const real = fixture.goldens[0].code.split('.')[0];
  const { bits, end } = payloadOf(real);
  for (let cut = 5; cut < end; cut += 1) {
    const code = frameCore(Object.assign(new v1.BitWriter(), { bits: Array.from(bits.subarray(0, cut)) }));
    await decodePuzzleCode(code).then((d) => assert.ok(d.pack), (error) => assert.ok(error instanceof PuzzleCodeError, String(error)));
  }
});

test('bounds: malformed input of every ordinary kind gives typed errors only', async () => {
  const samples = [fixture.goldens[0].code, fixture.goldens[3].code, fixture.large.code, fixture.edges[4].code];
  let seed = 7;
  const next = (/** @type {number} */ n) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % n;
  };
  let rejected = 0;
  for (const sample of samples) {
    const [core, tail] = sample.split('.');
    const { bits, end } = payloadOf(core);
    for (let round = 0; round < 120; round += 1) {
      const mutated = Array.from(bits.subarray(0, end));
      const kind = next(4);
      if (kind === 0) {
        mutated[5 + next(end - 5)] ^= 1;
      } else if (kind === 1) {
        mutated.splice(5 + next(end - 5), 1);
      } else if (kind === 2) {
        mutated.splice(5 + next(end - 5), 0, next(2));
      } else {
        for (let i = 0; i < 3; i += 1) {
          mutated[5 + next(end - 5)] = next(2);
        }
      }
      const code = `${frameCore(Object.assign(new v1.BitWriter(), { bits: mutated }))}.${tail}`;
      await decodePuzzleCode(code).then(
        (decoded) => assert.ok(decoded.pack.puzzles.length === 1),
        (error) => {
          rejected += 1;
          assert.ok(error instanceof PuzzleCodeError, String(error?.stack ?? error));
          assert.ok(['invalid', 'core-check', 'version', 'no-deflate'].includes(error.code), error.code);
        },
      );
    }
  }
  assert.ok(rejected > 100, 'most mutations are structural errors');
});

// ================================================================= tails

/**
 * A tail with a correct check for `core`.
 * @param {string} core
 * @param {(w: v1.BitWriter) => void} body Tag and steps.
 */
function frameTail(core, body) {
  const pc = v1.symbolsToBits(core.slice(0, -4));
  const pt = new v1.BitWriter();
  body(pt);
  pt.padTo(5);
  const register = v1.crc20Register(pt.bits, 0, pt.length, v1.crc20Register(pc, 0, pc.length));
  return v1.bitsToSymbols(pt.bits) + v1.checkSymbols(register ^ 0xfffff);
}

const splitGolden = (/** @type {number} */ i) => /** @type {[string, string]} */ (fixture.goldens[i].code.split('.'));

test('tails: a core alone is playable and a valid tail adds only a validated stored answer', async () => {
  for (const golden of fixture.goldens) {
    const [core] = golden.code.split('.');
    const alone = await decodePuzzleCode(core);
    assert.equal(alone.hasTail, false);
    assert.equal(alone.tailError, null);
    assert.equal(alone.pack.puzzles[0].solution, null);
    const full = await decodePuzzleCode(golden.code);
    assert.equal(full.hasTail, true);
    const solution = /** @type {any[]} */ (full.pack.puzzles[0].solution);
    assert.equal(solution.length, full.pack.pieces.length);
    assert.deepEqual(solution.map((p) => p.piece), full.pack.pieces.map((p) => p.id), 'poses are in piece order');
    const board = boardFromRows(full.pack.board.rows);
    const clues = full.pack.puzzles[0].clues;
    for (const clue of clues) {
      assert.deepEqual(solution.find((p) => p.piece === clue.piece), clue, 'the answer keeps every clue exactly');
    }
    assert.deepEqual({ ...full.pack, puzzles: [{ ...full.pack.puzzles[0], solution: null }] }, alone.pack);
    assert.equal(progressFingerprint(board, full.pack.pieces, clues), progressFingerprint(board, alone.pack.pieces, alone.pack.puzzles[0].clues));
  }
});

test('tails: a bad tail never hides or replaces a good core and is never opened automatically', async () => {
  const [core, tail] = splitGolden(0);
  const alone = (await decodePuzzleCode(core)).pack;
  /** @type {[string, string, string][]} */
  const cases = [
    ['an empty tail', `${core}.`, 'tail-check'],
    ['a tail shorter than a check', `${core}.12`, 'tail-check'],
    ['a tail of only a check', `${core}.0000`, 'tail-check'],
    ['a wrong check', `${core}.${tail.slice(0, -1)}${tail.endsWith('0') ? '1' : '0'}`, 'tail-check'],
    ['zero symbols appended', `${core}.${tail}0`, 'tail-check'],
    ['a symbol dropped', `${core}.${tail.slice(0, -1)}`, 'tail-check'],
    ['a tail of another puzzle', `${core}.${splitGolden(1)[1]}`, 'tail-check'],
    ['the tail of a different core', `${core}.${splitGolden(3)[1]}`, 'tail-check'],
    ['a reserved tag', `${core}.${frameTail(core, (w) => { w.write(2, 5); w.write(0, 10); })}`, 'tail-tag'],
    ['tag zero', `${core}.${frameTail(core, (w) => w.write(0, 5))}`, 'tail-tag'],
    ['tag thirty-one', `${core}.${frameTail(core, (w) => w.write(31, 5))}`, 'tail-tag'],
    ['a tag with no steps', `${core}.${frameTail(core, (w) => w.write(1, 5))}`, 'tail-invalid'],
    ['too many zero bits after the steps', `${core}.${frameTail(core, (w) => { w.write(1, 5); w.bits.push(...new Array(60).fill(0)); })}`, 'tail-invalid'],
    ['a path from another puzzle with a valid check', `${core}.${frameTail(core, (w) => { const p = payloadOfTail(splitGolden(3)); w.bits.push(...p); })}`, 'tail-invalid'],
  ];
  for (const [name, code, tailError] of cases) {
    const result = await decodePuzzleCode(code);
    assert.equal(result.hasTail, false, name);
    assert.equal(result.tailError, tailError, name);
    assert.deepEqual(result.pack, alone, `${name}: the core is returned unchanged and without an answer`);
    assert.equal(result.pack.puzzles[0].solution, null, name);
  }
});

/** @param {[string, string]} parts The tag and steps (without fill) of the tail of a golden code. */
function payloadOfTail([, tail]) {
  return Array.from(v1.symbolsToBits(tail.slice(0, -4)));
}

test('tails: the tail check covers the core payload, so a spliced tail is refused', async () => {
  const parts = fixture.goldens.map((/** @type {any} */ g) => g.code.split('.'));
  for (const [i, [core]] of parts.entries()) {
    for (const [j, [, tail]] of parts.entries()) {
      const result = await decodePuzzleCode(`${core}.${tail}`);
      if (i === j) {
        assert.equal(result.hasTail, true);
      } else {
        assert.equal(result.hasTail, false, `core ${i} with tail ${j}`);
        assert.equal(result.tailError, 'tail-check');
      }
    }
  }
});

test('tails: a code with a dot but a bad core is an error, whatever its tail', async () => {
  const [core, tail] = splitGolden(1);
  await rejectsWith(decodePuzzleCode(`${replaceAt(core, 5, core[5] === 'Z' ? 'Y' : 'Z')}.${tail}`), 'core-check');
  await rejectsWith(decodePuzzleCode(`${core}0.${tail}`), 'core-check');
  await rejectsWith(decodePuzzleCode(`${core}.${tail}.${tail}`), 'dots');
  await rejectsWith(decodePuzzleCode(`${core}.${tail}.`), 'dots');
  await rejectsWith(decodePuzzleCode(`.${tail}`), 'core-check');
});

test('tails: a stored answer survives clue order, hole pieces and every piece orientation', async () => {
  for (const snapshot of [disconnected, ringPuzzle, repeatedShapes, paddedHand(), goldenSnapshot('hand-authored-1')]) {
    const { decoded } = await roundTrip(snapshot, { compression: 'raw' });
    assert.equal(decoded.hasTail, true);
  }
});

// ============================================================= compression

/**
 * @param {'CompressionStream' | 'DecompressionStream'} name
 * @param {unknown} value `undefined` removes the global.
 * @param {() => Promise<void>} fn
 */
async function withGlobal(name, value, fn) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  try {
    await fn();
  } finally {
    if (saved) {
      Object.defineProperty(globalThis, name, saved);
    } else {
      delete (/** @type {any} */ (globalThis))[name];
    }
  }
}

const forcedDeflate = createPuzzleCodec({ allowDeflate: true });

test('deflate: the decode-only golden gives the sample puzzle and other compressors are accepted', async () => {
  const [golden] = fixture.version2DecodeOnly;
  const decoded = await decodePuzzleCode(golden.code);
  assert.equal(decoded.hasTail, true);
  assert.deepEqual(contentOf(decoded.pack), expectedOf(snapshotOf(samplePack, golden.puzzle)));
  assert.equal(decoded.pack.puzzles[0].title, golden.title);
  const core = await decodePuzzleCode(golden.code.split('.')[0]);
  assert.equal(core.hasTail, false);
  assert.deepEqual(contentOf(core.pack), { ...expectedOf(snapshotOf(samplePack, golden.puzzle)), solution: null });
  // The same puzzle compressed here, at any zlib level, decodes to the same content.
  const { bits, end } = payloadOf(fixture.goldens[2].code.split('.')[0]);
  const raw = new v1.BitWriter();
  raw.bits.push(...bits.subarray(5, end));
  for (const level of [1, 6, 9]) {
    const compressed = deflateRawSync(Buffer.from(raw.toBytes()), { level });
    const pc = new v1.BitWriter();
    pc.write(2, 5);
    v1.writeEG(pc, 8, compressed.length);
    for (const byte of compressed) {
      pc.write(byte, 8);
    }
    const viaLevel = await decodePuzzleCode(frameCore(pc));
    assert.deepEqual(contentOf(viaLevel.pack), { ...expectedOf(snapshotOf(samplePack, 2, { title: 'Hard #3' })), solution: null });
  }
});

test('deflate: forced version-2 encoding round trips every kind of puzzle', async () => {
  const sources = [
    ...fixture.goldens.map((/** @type {any} */ g) => goldenSnapshot(g.name)), disconnected, ringPuzzle, repeatedShapes, paddedHand(),
    lone, foreignRating, maxCertificate, snapshotOf(samplePack, 0, { rating: oddV2Claims[0] }),
  ];
  for (const snapshot of sources) {
    const { encoded } = await roundTrip(snapshot, { compression: 'deflate', codec: forcedDeflate });
    assert.equal(encoded.version, 2);
    assert.equal(encoded.C[0], '2');
  }
  const large = await decodePuzzleCode(fixture.large.code);
  const viaV2 = await forcedDeflate.encodePuzzleCode(snapshotOf(large.pack, 0), { compression: 'deflate' });
  assert.equal(viaV2.version, 2);
  assert.deepEqual(contentOf((await decodePuzzleCode(viaV2.F)).pack), contentOf(large.pack));
  await assert.rejects(encodePuzzleCode(sample1, /** @type {any} */ ({ compression: 'deflate' })), TypeError);
  await assert.rejects(encodePuzzleCode(sample1, /** @type {any} */ ({ compression: 'zstd' })), TypeError);
});

test('deflate: auto mode keeps the shortest core and raw wins every tie', async () => {
  for (const golden of fixture.goldens) {
    const auto = await encodePuzzleCode(goldenSnapshot(golden.name));
    assert.equal(auto.version, 1);
    assert.equal(auto.F, golden.code);
  }
  const cells = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [0, 2]];
  const pieces = Array.from({ length: 128 }, (_, i) => piece(v1.labelFor(i), cells, v1.labelFor(i), v1.colorFor(i)));
  const rows = Array.from({ length: 16 }, () => '#'.repeat(64));
  const { R, H } = v1.measureFreePlacements(boardFromRows(rows), pieces, []);
  const claim = { model: 'difficulty-v2', score: 256, level: 'hell-4', saturated: false, metrics: { U: 128, B: 0, branchTrials: 0, rowTrials: 0, stop: 'solution', R, H } };
  const repetitive = base({ rows, pieces, rating: claim });
  const raw = await encodePuzzleCode(repetitive, { compression: 'raw' });
  const auto = await encodePuzzleCode(repetitive);
  assert.equal(auto.version, 2);
  assert.ok(auto.C.length < raw.C.length, `${auto.C.length} < ${raw.C.length}`);
  assert.deepEqual(contentOf((await decodePuzzleCode(auto.F)).pack), expectedOf(repetitive));
  const edited = base({ rows, pieces, rating: { ...claim, metrics: { ...claim.metrics, H: H + 1 } } });
  const escaped = await encodePuzzleCode(edited);
  assert.equal(escaped.version, 2);
  assert.ok(escaped.C.length < (await encodePuzzleCode(edited, { compression: 'raw' })).C.length);

  // A stub compressor whose output length decides the comparison exactly.
  const rawLength = (await encodePuzzleCode(sample1, { compression: 'raw' })).C.length;
  /** @param {number} m */
  const symbolsFor = (m) => {
    const eg = new v1.BitWriter();
    v1.writeEG(eg, 8, m);
    return Math.ceil((5 + eg.length + 8 * m) / 5) + 4;
  };
  /** @param {number} m */
  const stubbed = async (m) => {
    class Stub {
      constructor() {
        const t = new TransformStream({ transform() {}, flush(c) { c.enqueue(new Uint8Array(m)); } });
        this.readable = t.readable;
        this.writable = t.writable;
      }
    }
    /** @type {any} */
    let result;
    await withGlobal('CompressionStream', Stub, async () => {
      result = await encodePuzzleCode(sample1);
    });
    return result;
  };
  let tie = 0;
  while (symbolsFor(tie + 1) < rawLength) {
    tie += 1;
  }
  assert.ok(symbolsFor(tie) < rawLength);
  assert.equal(symbolsFor(tie + 1), rawLength, 'a tie exists for this puzzle');
  assert.equal((await stubbed(tie)).version, 2, 'one symbol shorter: version 2');
  assert.equal((await stubbed(tie + 1)).version, 1, 'equal length: raw wins');
  assert.equal((await stubbed(tie + 2)).version, 1, 'longer: raw');
});

test('deflate: without native compression auto mode writes raw and a forced version 2 fails clearly', async () => {
  await withGlobal('CompressionStream', undefined, async () => {
    const encoded = await encodePuzzleCode(sample1);
    assert.equal(encoded.version, 1);
    assert.equal(encoded.F, fixture.goldens[0].code);
    await rejectsWith(forcedDeflate.encodePuzzleCode(sample1, { compression: 'deflate' }), 'no-deflate');
  });
  await withGlobal('CompressionStream', class { constructor() { throw new Error('unsupported format'); } }, async () => {
    assert.equal((await encodePuzzleCode(sample1)).version, 1);
  });
});

test('deflate: version-2 decoding needs a decompressor and says so; raw codes do not', async () => {
  const v2 = fixture.version2DecodeOnly[0].code;
  await withGlobal('DecompressionStream', undefined, async () => {
    await rejectsWith(decodePuzzleCode(v2), 'no-deflate');
    await rejectsWith(decodePuzzleCode(v2.split('.')[0]), 'no-deflate');
    assert.equal((await decodePuzzleCode(fixture.goldens[0].code)).hasTail, true);
    assert.ok((await decodePuzzleCode(fixture.large.code)).pack);
    // The outer frame is judged before the decompressor is needed.
    await rejectsWith(decodePuzzleCode(fixture.negatives[3].code), 'invalid', /unused data/);
  });
});

test('deflate: the version-2 negative vectors are invalid and bound errors are typed', async () => {
  for (const negative of fixture.negatives.slice(1, 4)) {
    await rejectsWith(decodePuzzleCode(negative.code), negative.error, /unused data/);
  }
  const { bits, end } = payloadOf(fixture.goldens[0].code.split('.')[0]);
  const payload = new v1.BitWriter();
  payload.bits.push(...bits.subarray(5, end));
  const bytes = [...payload.toBytes()];
  const fill = bytes.length * 8 - payload.length;
  assert.ok((await decodePuzzleCode(deflatedCode(bytes))).pack);
  await rejectsWith(decodePuzzleCode(deflatedCode([...bytes, 0])), 'invalid', /unused data/);
  await rejectsWith(decodePuzzleCode(deflatedCode([...bytes, 0, 0, 0])), 'invalid', /unused data/);
  if (fill > 0) {
    const poisoned = [...bytes];
    poisoned[poisoned.length - 1] |= 1;
    await rejectsWith(decodePuzzleCode(deflatedCode(poisoned)), 'invalid', /unused data/);
  }
  const frame = (/** @type {(w: v1.BitWriter) => void} */ body) => rawCode(body, 2);
  await rejectsWith(decodePuzzleCode(frame((w) => v1.writeEG(w, 8, 0))), 'invalid', /impossible length/);
  await rejectsWith(decodePuzzleCode(frame((w) => { v1.writeEG(w, 8, 5); w.write(0, 16); })), 'invalid', /impossible length/);
  await rejectsWith(decodePuzzleCode(frame((w) => { v1.writeEG(w, 8, 2 ** 40); })), 'invalid');
  await rejectsWith(decodePuzzleCode(frame((w) => { v1.writeEG(w, 8, 3); w.write(0xffffff, 24); })), 'invalid', /damaged/);
  const compressed = deflateRawSync(Buffer.from(bytes));
  await rejectsWith(decodePuzzleCode(frame((w) => {
    v1.writeEG(w, 8, compressed.length - 2);
    for (const byte of compressed.subarray(0, compressed.length - 2)) {
      w.write(byte, 8);
    }
  })), 'invalid', /damaged/);
  await rejectsWith(decodePuzzleCode(frame((w) => w.write(0, 0))), 'invalid');
});

test('deflate: inflation stops at 64 KiB while streaming', async () => {
  await rejectsWith(decodePuzzleCode(deflatedCode(Buffer.alloc(65537))), 'invalid', /expands beyond/);
  // Exactly 64 KiB passes the bound and then fails as content.
  await assert.rejects(decodePuzzleCode(deflatedCode(Buffer.alloc(65536))), (error) => {
    assert.ok(error instanceof PuzzleCodeError);
    assert.equal(error.code, 'invalid');
    assert.doesNotMatch(error.message, /expands beyond/);
    return true;
  });
  const Real = /** @type {any} */ (globalThis).DecompressionStream;
  let produced = 0;
  class Spy {
    constructor(/** @type {string} */ format) {
      const real = new Real(format);
      const counter = new TransformStream({ transform(chunk, controller) { produced += chunk.byteLength; controller.enqueue(chunk); } });
      this.writable = real.writable;
      this.readable = real.readable.pipeThrough(counter);
    }
  }
  const bomb = deflatedCode(Buffer.alloc(8 * 1024 * 1024));
  assert.ok(bomb.length <= 16000, 'an 8 MiB bomb still fits the input bound');
  await withGlobal('DecompressionStream', Spy, async () => {
    await rejectsWith(decodePuzzleCode(bomb), 'invalid', /expands beyond/);
  });
  assert.ok(produced < 2 * 1024 * 1024, `only ${produced} of 8 MiB were inflated before the limit stopped the stream`);
});

// ====================================================== correction candidates

/** Deterministic pseudo-random numbers for the exhaustive and random edits. */
function lcg(/** @type {number} */ seed) {
  let state = seed >>> 0;
  return (/** @type {number} */ n) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor((state / 2 ** 32) * n);
  };
}

/**
 * Symbols tried in place of `symbol`: three spread-out ones, or every other symbol.
 * @param {string} symbol
 * @param {boolean} every
 */
function replacements(symbol, every) {
  const spread = [0, 15, 31].map((i) => v1.ALPHABET[(v1.ALPHABET.indexOf(symbol) + 1 + i) % 32]);
  return (every ? [...v1.ALPHABET] : spread).filter((s) => s !== symbol);
}

/**
 * The first golden is always tried with every substitution; the others with a
 * spread of three unless `all` is set.
 * @param {boolean} all
 */
async function sweepCoreSubstitutions(all) {
  for (const [index, withTail] of [[0, true], [3, false]]) {
    const [core, tail] = splitGolden(/** @type {number} */ (index));
    const suffix = withTail ? `.${tail}` : '';
    for (let p = 0; p < core.length; p += 1) {
      for (const symbol of replacements(core[p], all || index === 0)) {
        await assert.rejects(decodePuzzleCode(replaceAt(core, p, symbol) + suffix), (error) => {
          assert.ok(error instanceof PuzzleCodeError);
          assert.equal(error.code, 'core-check');
          assert.deepEqual(error.candidate, {
            component: 'core', group: Math.floor(p / 4) + 1, position: (p % 4) + 1, expected: core[p], typed: symbol, correctedCode: core + suffix,
          });
          return true;
        });
      }
    }
  }
}

/** @param {boolean} all Every golden with every substitution, not only the first. */
async function sweepTailSubstitutions(all) {
  for (const index of [0, 1, 2, 3]) {
    const [core, tail] = splitGolden(index);
    const alone = (await decodePuzzleCode(core)).pack;
    for (let q = 0; q < tail.length; q += 1) {
      for (const symbol of replacements(tail[q], all || index === 0)) {
        const result = await decodePuzzleCode(`${core}.${replaceAt(tail, q, symbol)}`);
        assert.equal(result.tailError, 'tail-check');
        assert.equal(result.hasTail, false);
        assert.deepEqual(result.pack, alone, 'the core is returned and nothing is applied');
        assert.deepEqual(result.candidate, {
          component: 'tail', group: Math.floor(q / 4) + 1, position: (q % 4) + 1, expected: tail[q], typed: symbol, correctedCode: `${core}.${tail}`,
        });
      }
    }
  }
}

test('correction: every one-symbol substitution of a short golden yields one unique candidate and applies nothing', () => sweepCoreSubstitutions(false));

test('slow: every one-symbol core substitution of every sampled golden yields its unique candidate', () => sweepCoreSubstitutions(true));

test('correction: aliases and grouping do not move the positions and the candidate is the normalized code', async () => {
  const [core, tail] = splitGolden(0);
  const typed = replaceAt(core, 6, core[6] === '2' ? '3' : '2');
  const grouped = typed.replace(/(.{4})/g, '$1 ').toLowerCase().trim();
  await assert.rejects(decodePuzzleCode(`${grouped}. ${tail}`), (error) => {
    assert.equal(error.candidate.group, 2);
    assert.equal(error.candidate.position, 3);
    assert.equal(error.candidate.correctedCode, `${core}.${tail}`);
    return true;
  });
  // A typed O is the alias of 0 and not an error; a real error is reported as the normalized symbol.
  const withZero = fixture.goldens.map((/** @type {any} */ g) => g.code).find((/** @type {string} */ code) => code.includes('0'));
  assert.ok(withZero);
  assert.ok((await decodePuzzleCode(withZero.replaceAll('0', 'o').replaceAll('1', 'l'))).pack);
});

test('correction: every one-symbol tail substitution of a short golden yields one unique candidate for a still-valid core', () => sweepTailSubstitutions(false));

test('slow: every one-symbol tail substitution of every golden yields its unique candidate', () => sweepTailSubstitutions(true));

test('correction: no candidate for two errors, swaps, bursts, boundary bursts and appended symbols', async () => {
  const next = lcg(99);
  for (const index of [0, 1, 2, 3]) {
    const [core, tail] = splitGolden(index);
    const code = `${core}.${tail}`;
    /** @param {string} edited */
    const verdict = async (edited) => decodePuzzleCode(edited).then((d) => ({ error: null, d }), (error) => ({ error, d: null }));
    // Adjacent swaps of different symbols are always detected.
    for (let p = 0; p + 1 < core.length; p += 1) {
      if (core[p] !== core[p + 1]) {
        const swapped = core.slice(0, p) + core[p + 1] + core[p] + core.slice(p + 2);
        const { error } = await verdict(`${swapped}.${tail}`);
        assert.equal(error?.code, 'core-check', `swap at ${p}`);
      }
    }
    for (let q = 0; q + 1 < tail.length; q += 1) {
      if (tail[q] !== tail[q + 1]) {
        const swapped = tail.slice(0, q) + tail[q + 1] + tail[q] + tail.slice(q + 2);
        const { error, d } = await verdict(`${core}.${swapped}`);
        assert.equal(error, null);
        assert.equal(d?.tailError, 'tail-check', `tail swap at ${q}`);
      }
    }
    // Bursts of up to four neighbouring symbols are always detected.
    for (let round = 0; round < 300; round += 1) {
      const length = 2 + next(3);
      const at = next(code.length - length);
      const span = code.slice(at, at + length);
      if (span.includes('.')) {
        continue;
      }
      let burst = '';
      for (let i = 0; i < length; i += 1) {
        burst += v1.ALPHABET[next(32)];
      }
      if (burst === span) {
        continue;
      }
      const { error, d } = await verdict(code.slice(0, at) + burst + code.slice(at + length));
      if (at + length <= core.length) {
        assert.equal(error?.code, 'core-check');
      } else {
        assert.equal(d?.tailError, 'tail-check', `burst at ${at}`);
      }
    }
    // Bursts across the core/tail boundary never pass: the core check or the tail check fails.
    for (let before = 1; before <= 3; before += 1) {
      for (let after = 1; before + after <= 4; after += 1) {
        for (let round = 0; round < 30; round += 1) {
          let a = core.slice(0, -before);
          let b = tail.slice(after);
          for (let i = 0; i < before; i += 1) {
            a += v1.ALPHABET[next(32)];
          }
          let head = '';
          for (let i = 0; i < after; i += 1) {
            head += v1.ALPHABET[next(32)];
          }
          b = head + b;
          if (`${a}.${b}` === code) {
            continue;
          }
          const { error, d } = await verdict(`${a}.${b}`);
          assert.ok(error?.code === 'core-check' || d?.tailError === 'tail-check', `${a}.${b}`);
        }
      }
    }
    // Symbols moved across the dot, and appended zero symbols.
    for (const moved of [`${core}${tail[0]}.${tail.slice(1)}`, `${core.slice(0, -1)}.${core.slice(-1)}${tail}`]) {
      assert.equal((await verdict(moved)).error?.code, 'core-check');
    }
    for (let zeros = 1; zeros <= 4; zeros += 1) {
      assert.equal((await verdict(`${core}${'0'.repeat(zeros)}.${tail}`)).error?.code, 'core-check');
      assert.equal((await verdict(`${core}.${tail}${'0'.repeat(zeros)}`)).d?.tailError, 'tail-check');
    }
    // Two substituted symbols: the corrected code is never offered as a unique repair of both.
    for (let round = 0; round < 400; round += 1) {
      const p1 = next(core.length);
      const p2 = (p1 + 1 + next(core.length - 1)) % core.length;
      let typed = core;
      for (const p of [p1, p2]) {
        typed = replaceAt(typed, p, v1.ALPHABET[(v1.ALPHABET.indexOf(core[p]) + 1 + next(31)) % 32]);
      }
      const { error } = await verdict(typed);
      assert.equal(error?.code, 'core-check');
      if (error.candidate !== undefined) {
        assert.notEqual(error.candidate.correctedCode, core, 'a two-error input can never repair to the original with one change');
      }
    }
  }
});

/**
 * Snapshot of a domino puzzle whose core is about `n` characters of foreign rating metrics long.
 * @param {number} n
 * @param {boolean} withSolution
 */
function paddedSnapshot(n, withSolution) {
  return base({
    pieces: [piece('A', [[0, 0], [1, 0]], 'A', '#e6194b')],
    solution: withSolution ? [pose('A', 0, 0)] : null,
    rating: { model: 'x-model', score: 1, level: 'z', metrics: { pad: 'x'.repeat(n) } },
  });
}

test('correction: candidates respect the 5,732-symbol coverage bound for core and tail', async () => {
  /** @param {boolean} withSolution @param {(c: number, t: number) => number} covered */
  const firstOver = async (withSolution, covered) => {
    let low = 3000;
    let high = 4000;
    while (low < high) {
      const mid = (low + high) >> 1;
      const e = await encodePuzzleCode(paddedSnapshot(mid, withSolution), { compression: 'raw' });
      if (covered(e.C.length, e.T?.length ?? 0) > 5732) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    return low;
  };
  // Core: the word is the whole core including its check.
  const overCore = await firstOver(false, (c) => c);
  for (const [n, offered] of [[overCore - 1, true], [overCore, false], [overCore + 200, false]]) {
    const e = await encodePuzzleCode(paddedSnapshot(/** @type {number} */ (n), false), { compression: 'raw' });
    assert.equal(e.C.length > 5732, !offered);
    const typed = replaceAt(e.C, 100, e.C[100] === 'A' ? 'B' : 'A');
    await assert.rejects(decodePuzzleCode(typed), (error) => {
      assert.equal(error.code, 'core-check');
      assert.equal(error.candidate !== undefined, offered, `n=${n} length=${e.C.length}`);
      if (offered) {
        assert.equal(error.candidate.correctedCode, e.C);
      }
      return true;
    });
  }
  // Tail: the covered word is Pc, the tail steps and the tail check.
  const overTail = await firstOver(true, (c, t) => c - 4 + t);
  for (const [n, offered] of [[overTail - 1, true], [overTail, false]]) {
    const e = await encodePuzzleCode(paddedSnapshot(/** @type {number} */ (n), true), { compression: 'raw' });
    assert.equal(e.C.length - 4 + /** @type {string} */ (e.T).length > 5732, !offered);
    const typedTail = replaceAt(/** @type {string} */ (e.T), 1, /** @type {string} */ (e.T)[1] === 'A' ? 'B' : 'A');
    const result = await decodePuzzleCode(`${e.C}.${typedTail}`);
    assert.equal(result.tailError, 'tail-check');
    assert.equal(result.candidate !== undefined, offered, `n=${n}`);
    if (offered) {
      assert.equal(result.candidate?.correctedCode, e.F);
    }
  }
});

test('slow: single-symbol CRC syndromes are distinct for 5,732 symbols and first collide at 5,733', () => {
  // Syndrome of difference d at distance j symbols from the end, clocked one symbol at a time.
  /** @param {number} register @param {number} bit */
  const clock = (register, bit) => {
    const feedback = ((register >>> 19) & 1) ^ bit;
    const shifted = (register << 1) & 0xfffff;
    return feedback ? shifted ^ 0x6c1bd : shifted;
  };
  /** @param {number} d */
  const start = (d) => [4, 3, 2, 1, 0].reduce((r, b) => clock(r, (d >> b) & 1), 0);
  // Cross-check the recurrence against the real check on explicit bit strings.
  const next = lcg(5);
  for (let round = 0; round < 50; round += 1) {
    const length = 6 + next(60);
    const p = next(length);
    const d = 1 + next(31);
    const bits = new Uint8Array(length * 5);
    for (let b = 0; b < 5; b += 1) {
      bits[p * 5 + b] = (d >> (4 - b)) & 1;
    }
    let expected = start(d);
    for (let j = 0; j < length - 1 - p; j += 1) {
      for (let step = 0; step < 5; step += 1) {
        expected = clock(expected, 0);
      }
    }
    assert.equal(v1.crc20Register(bits, 0, bits.length, 0), expected);
  }
  const seen = new Set();
  const registers = Array.from({ length: 31 }, (_, i) => start(i + 1));
  let firstCollision = 0;
  for (let j = 0; j < 6000 && firstCollision === 0; j += 1) {
    for (let i = 0; i < 31; i += 1) {
      assert.notEqual(registers[i], 0);
      if (seen.has(registers[i])) {
        firstCollision = j + 1;
        break;
      }
      seen.add(registers[i]);
      for (let step = 0; step < 5; step += 1) {
        registers[i] = clock(registers[i], 0);
      }
    }
  }
  assert.equal(firstCollision, 5733, 'the first collision appears when the word has 5,733 symbols');
  assert.equal(31 * 5732, 177692);
});

test('slow: two substituted symbols anywhere in a golden core and tail are always detected', () => {
  for (const component of [splitGolden(0)[0], splitGolden(0)[1]]) {
    const bits = v1.symbolsToBits(component);
    const reference = v1.crc20Register(bits, 0, bits.length);
    let checked = 0;
    for (let p1 = 0; p1 < component.length; p1 += 1) {
      for (let p2 = p1 + 1; p2 < component.length; p2 += 1) {
        for (let d1 = 1; d1 < 32; d1 += 1) {
          for (let d2 = 1; d2 < 32; d2 += 1) {
            const edited = Uint8Array.from(bits);
            for (let b = 0; b < 5; b += 1) {
              edited[p1 * 5 + b] ^= (d1 >> (4 - b)) & 1;
              edited[p2 * 5 + b] ^= (d2 >> (4 - b)) & 1;
            }
            assert.notEqual(v1.crc20Register(edited, 0, edited.length), reference);
            checked += 1;
          }
        }
      }
    }
    assert.equal(checked, (component.length * (component.length - 1) / 2) * 961);
  }
});

// ============================================================ board masks

/** Exp-Golomb length, counted from the definition and not from the writer. */
const egBits = (/** @type {number} */ k, /** @type {number} */ v) => 2 * (Math.floor(Math.log2(Math.floor(v / 2 ** k) + 1)) + 1) - 1 + k;

/** Truncated-binary length of `x` among `n` values. */
function tbBits(/** @type {number} */ n, /** @type {number} */ x) {
  const k = Math.floor(Math.log2(n));
  return x < 2 ** (k + 1) - n ? k : k + 1;
}

/**
 * Raster rectangles by the greedy rule of the task: at each uncovered blocked
 * cell extend right, then down while the whole span is blocked and uncovered.
 * @param {string[]} rows
 */
function greedyRectangles(rows) {
  const H = rows.length;
  const W = rows[0].length;
  const blocked = (/** @type {number} */ x, /** @type {number} */ y) => rows[y][x] === '.';
  const covered = new Set();
  /** @type {{ x: number, y: number, w: number, h: number }[]} */
  const list = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!blocked(x, y) || covered.has(y * W + x)) {
        continue;
      }
      let w = 1;
      while (x + w < W && blocked(x + w, y) && !covered.has(y * W + x + w)) {
        w += 1;
      }
      let h = 1;
      for (; y + h < H; h += 1) {
        let whole = true;
        for (let dx = 0; dx < w; dx += 1) {
          whole = whole && blocked(x + dx, y + h) && !covered.has((y + h) * W + x + dx);
        }
        if (!whole) {
          break;
        }
      }
      for (let dy = 0; dy < h; dy += 1) {
        for (let dx = 0; dx < w; dx += 1) {
          covered.add((y + dy) * W + x + dx);
        }
      }
      list.push({ x, y, w, h });
    }
  }
  return list;
}

/**
 * Every mode's size for a mask, counted from the task's table, and the winner.
 * @param {string[]} rows '.' blocked, '#' active
 */
function maskReference(rows) {
  const H = rows.length;
  const W = rows[0].length;
  const cells = W * H;
  const flat = rows.join('');
  const blocked = [...flat].flatMap((c, i) => (c === '.' ? [i] : []));
  /** @type {Map<number, { bits: number, k?: number }>} */
  const options = new Map();
  if (blocked.length === 0) {
    options.set(0, { bits: tbBits(5, 0) });
  }
  const gaps = blocked.map((index, i) => index - (i === 0 ? -1 : blocked[i - 1]) - 1);
  const stored = [];
  let current = '#';
  let run = 0;
  for (const c of flat) {
    if (c === current) {
      run += 1;
    } else {
      stored.push(run);
      current = c;
      run = 1;
    }
  }
  /**
   * @param {number} mode
   * @param {number} fixed
   * @param {number[]} values
   */
  const withBestK = (mode, fixed, values) => {
    let best = { bits: Infinity, k: -1 };
    for (let k = 0; k < 8; k += 1) {
      const bits = tbBits(5, mode) + fixed + 3 + values.reduce((sum, v) => sum + egBits(k, v), 0);
      if (bits < best.bits) {
        best = { bits, k };
      }
    }
    options.set(mode, best);
  };
  withBestK(1, egBits(2, gaps.length), gaps);
  withBestK(2, egBits(2, stored.length), stored);
  const rectangles = greedyRectangles(rows);
  options.set(3, {
    bits: tbBits(5, 3) + egBits(0, rectangles.length) + rectangles.reduce(
      (sum, r) => sum + tbBits(cells, r.y * W + r.x) + tbBits(W - r.x, r.w - 1) + tbBits(H - r.y, r.h - 1), 0,
    ),
  });
  options.set(4, { bits: tbBits(5, 4) + cells });
  let mode = -1;
  for (const [candidate, { bits }] of [...options].sort((a, b) => a[0] - b[0])) {
    if (mode === -1 || bits < /** @type {{ bits: number }} */ (options.get(mode)).bits) {
      mode = candidate;
    }
  }
  return { mode, ...options.get(mode), rectangles, options };
}

/**
 * A puzzle whose pieces are the horizontal strips of the active cells; the
 * solution places each strip where it lies.
 * @param {string[]} rows
 */
function stripPuzzle(rows) {
  const pieces = [];
  const solution = [];
  rows.forEach((row, y) => {
    for (const match of row.matchAll(/#+/g)) {
      const id = `s${pieces.length}`;
      pieces.push(piece(id, Array.from({ length: match[0].length }, (_, i) => [i, 0]), id, '#102030'));
      solution.push(pose(id, /** @type {number} */ (match.index), y));
    }
  });
  return base({ rows, pieces, solution, clues: [] });
}

/** @param {string} core @returns {v1.BitReader} reader at the board mask of a core with no rating, title or certificate */
function readerAtMask(core) {
  const bits = v1.symbolsToBits(core.slice(0, -4));
  return new v1.BitReader(bits, 22, bits.length);
}

/** @param {string[]} rows @param {number} y @param {number} x0 @param {number} w @param {number} h */
function blockRectangle(rows, y, x0, w, h) {
  return rows.map((row, r) => (r >= y && r < y + h ? row.slice(0, x0) + '.'.repeat(w) + row.slice(x0 + w) : row));
}

const maskCases = (() => {
  /** @type {Map<string, string[]>} */
  const cases = new Map();
  const full = (/** @type {number} */ w, /** @type {number} */ h) => Array.from({ length: h }, () => '#'.repeat(w));
  cases.set('full', full(5, 4));
  cases.set('one hole', blockRectangle(full(9, 9), 4, 4, 1, 1));
  cases.set('a corner hole', blockRectangle(full(6, 6), 0, 0, 1, 1));
  cases.set('top rows blocked', blockRectangle(full(8, 8), 0, 0, 8, 3));
  cases.set('alternate rows blocked', full(8, 8).map((row, y) => (y % 2 === 1 ? '.'.repeat(8) : row)));
  cases.set('two big holes', blockRectangle(blockRectangle(full(16, 16), 2, 2, 5, 4), 9, 8, 6, 5));
  cases.set('checkerboard', full(8, 8).map((row, y) => [...row].map((_, x) => ((x + y) % 2 === 0 ? '#' : '.')).join('')));
  cases.set('frame', full(7, 7).map((row, y) => [...row].map((_, x) => (x > 0 && x < 6 && y > 0 && y < 6 ? '.' : '#')).join('')));
  cases.set('cell 0 blocked', blockRectangle(full(4, 4), 0, 0, 1, 1));
  cases.set('last cell blocked', blockRectangle(full(4, 4), 3, 3, 1, 1));
  cases.set('single column', full(1, 6));
  cases.set('1x1 with a hole beside', ['#.']);
  cases.set('64 wide', [`${'#'.repeat(30)}.${'#'.repeat(33)}`]);
  const next = lcg(2024);
  for (let i = 0; i < 40; i += 1) {
    const w = 1 + next(14);
    const h = 1 + next(10);
    const density = [0.05, 0.2, 0.5, 0.8][next(4)];
    let rows = Array.from({ length: h }, () => Array.from({ length: w }, () => (next(1000) / 1000 < density ? '.' : '#')).join(''));
    if (next(3) === 0) {
      rows = blockRectangle(rows, next(h), 0, 1 + next(w), 1 + next(h));
    }
    if (rows.every((row) => !row.includes('#'))) {
      rows[0] = `#${rows[0].slice(1)}`;
    }
    cases.set(`random ${i}`, rows);
  }
  return cases;
})();

test('masks: the encoder writes the shortest board mask, the lowest mode on a tie and the smallest k', async () => {
  const won = new Set();
  for (const [name, rows] of maskCases) {
    const snapshot = stripPuzzle(rows);
    const { encoded } = await roundTrip(snapshot, { compression: 'raw' });
    const reference = maskReference(rows);
    won.add(reference.mode);
    const r = readerAtMask(encoded.C);
    const mode = v1.readTB(r, 5);
    assert.equal(mode, reference.mode, `${name}: mode (sizes ${JSON.stringify([...reference.options])})`);
    if (mode === 1) {
      v1.readEG(r, 2);
      assert.equal(r.read(3), reference.k, `${name}: k of the gap list`);
    } else if (mode === 2) {
      assert.equal(r.read(3), reference.k, `${name}: k of the run list`);
    } else if (mode === 3) {
      assert.equal(v1.readEG(r, 0), reference.rectangles.length, `${name}: rectangle count`);
      const W = rows[0].length;
      const H = rows.length;
      for (const rect of reference.rectangles) {
        const start = v1.readTB(r, W * H);
        assert.deepEqual(
          { x: start % W, y: Math.floor(start / W), w: v1.readTB(r, W - (start % W)) + 1, h: v1.readTB(r, H - Math.floor(start / W)) + 1 },
          rect,
          `${name}: rectangle`,
        );
      }
    }
  }
  assert.deepEqual([...won].sort(), [0, 1, 2, 3, 4], 'every mode is the shortest somewhere in the cases');
});

test('masks: every mode decodes to the same board when spliced into a real payload', async () => {
  const rows = blockRectangle(blockRectangle(['#'.repeat(7), '#'.repeat(7), '#'.repeat(7), '#'.repeat(7)], 0, 5, 2, 2), 3, 1, 2, 1);
  const W = 7;
  const H = 4;
  const flat = rows.join('');
  const blocked = [...flat].flatMap((c, i) => (c === '.' ? [i] : []));
  /** @returns {number[]} stored runs of the run-length mode */
  const storedRuns = () => {
    const runs = [];
    let current = '#';
    let run = 0;
    for (const c of flat) {
      if (c === current) {
        run += 1;
      } else {
        runs.push(run);
        current = c;
        run = 1;
      }
    }
    return runs;
  };
  /** @type {Record<number, (w: v1.BitWriter) => void>} */
  const fields = {
    1: (w) => {
      v1.writeEG(w, 2, blocked.length);
      w.write(5, 3);
      blocked.forEach((index, i) => v1.writeEG(w, 5, index - (i === 0 ? -1 : blocked[i - 1]) - 1));
    },
    2: (w) => {
      const runs = storedRuns();
      w.write(0, 3);
      v1.writeEG(w, 2, runs.length);
      runs.forEach((value) => v1.writeEG(w, 0, value));
    },
    3: (w) => {
      const rectangles = greedyRectangles(rows);
      v1.writeEG(w, 0, rectangles.length);
      for (const r of rectangles) {
        v1.writeTB(w, r.y * W + r.x, W * H);
        v1.writeTB(w, r.w - 1, W - r.x);
        v1.writeTB(w, r.h - 1, H - r.y);
      }
    },
    4: (w) => [...flat].forEach((c) => w.write(c === '#' ? 1 : 0, 1)),
  };
  const snapshot = stripPuzzle(rows);
  const encoded = await encodePuzzleCode(snapshot, { compression: 'raw' });
  const expected = contentOf((await decodePuzzleCode(encoded.C)).pack);
  assert.deepEqual(expected.rows, rows);
  const { bits, end } = payloadOf(encoded.C);
  const fieldEnd = 22 + /** @type {{ bits: number }} */ (maskReference(rows).options.get(maskReference(rows).mode)).bits;
  for (const mode of [1, 2, 3, 4]) {
    const pc = new v1.BitWriter();
    pc.bits.push(...bits.subarray(0, 22));
    v1.writeTB(pc, mode, 5);
    fields[mode](pc);
    pc.bits.push(...bits.subarray(fieldEnd, end));
    const code = frameCore(pc);
    assert.deepEqual(contentOf((await decodePuzzleCode(code)).pack), expected, `mode ${mode}`);
  }
  // Mode 0 on a board that has blocked cells cannot be a valid puzzle: the pieces no longer tile the board.
  const noBlocked = new v1.BitWriter();
  noBlocked.bits.push(...bits.subarray(0, 22));
  v1.writeTB(noBlocked, 0, 5);
  noBlocked.bits.push(...bits.subarray(fieldEnd, end));
  await rejectsWith(decodePuzzleCode(frameCore(noBlocked)), 'invalid');
});

// ======================================================== property test

/**
 * A seeded random puzzle that reaches most of the grammar: holes, margins,
 * rectangles, grown tilings with repeated and large pieces, every piece order
 * and orientation, default and custom identity, clue subsets in any order,
 * and every kind of rating, title and certificate.
 * @param {number} seed
 */
function randomPuzzle(seed) {
  const next = lcg(seed * 7919 + 13);
  /** @template T @param {T[]} list @returns {T} */
  const pick = (list) => list[next(list.length)];
  const chance = (/** @type {number} */ percent) => next(100) < percent;
  /** @template T @param {T[]} list @returns {T[]} */
  const shuffled = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = next(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const W = 1 + next(12);
  const H = 1 + next(10);
  const grid = Array.from({ length: H }, () => Array.from({ length: W }, () => true));
  const style = next(5);
  if (style === 1 || style === 4) {
    const density = pick([5, 20, 40]);
    grid.forEach((row) => row.forEach((_, x) => {
      row[x] = !chance(density);
    }));
  }
  if (style === 2 || style === 4) {
    grid.forEach((row, y) => row.forEach((_, x) => {
      row[x] = row[x] && x > 0 && y > 0 && x < W - 1 && y < H - 1;
    }));
  }
  if (style === 3) {
    for (let n = 1 + next(2); n > 0; n -= 1) {
      const x0 = next(W);
      const y0 = next(H);
      const w = 1 + next(W - x0);
      const h = 1 + next(H - y0);
      for (let y = y0; y < y0 + h; y += 1) {
        grid[y].fill(false, x0, x0 + w);
      }
    }
  }
  if (!grid.some((row) => row.some(Boolean))) {
    grid[next(H)][next(W)] = true;
  }
  const rows = grid.map((row) => row.map((on) => (on ? '#' : '.')).join(''));

  // Grow connected regions that tile the active cells.
  const maxSize = pick([1, 2, 3, 4, 5, 5, 6, 9, 12, 20]);
  const owner = grid.map((row) => row.map(() => false));
  /** @type {number[][][]} */
  const regions = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!grid[y][x] || owner[y][x]) {
        continue;
      }
      owner[y][x] = true;
      const cells = [[x, y]];
      const target = 1 + next(maxSize);
      while (cells.length < target) {
        const options = new Map();
        for (const [cx, cy] of cells) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && ny >= 0 && nx < W && ny < H && grid[ny][nx] && !owner[ny][nx]) {
              options.set(`${nx},${ny}`, [nx, ny]);
            }
          }
        }
        if (options.size === 0) {
          break;
        }
        const cell = pick([...options.values()]);
        owner[cell[1]][cell[0]] = true;
        cells.push(cell);
      }
      regions.push(cells);
    }
  }

  const relative = regions.map((cells) => orientedCells(/** @type {any} */ (cells), 0));
  const arrangement = next(3);
  let order = regions.map((_, i) => i);
  if (arrangement === 1) {
    order = shuffled(order);
  } else if (arrangement === 2) {
    order.sort((a, b) => relative[b].length - relative[a].length
      || v1.compareCells(v1.canonicalCells(relative[a]), v1.canonicalCells(relative[b])));
  }
  const orientation = pick(['canonical', 'random', 'random', 'identity']);
  const identity = next(4);
  const sameShape = (/** @type {any} */ a, /** @type {any} */ b) => JSON.stringify(a) === JSON.stringify(b);
  /** @type {any[]} */
  const pieces = [];
  /** @type {any[]} */
  const poses = [];
  /** @type {number[][]} */
  const equivalent = [];
  order.forEach((regionIndex, i) => {
    const rel = relative[regionIndex];
    let stored = rel;
    if (orientation === 'canonical') {
      stored = v1.canonicalCells(rel);
    } else if (orientation === 'random') {
      stored = orientedCells(/** @type {any} */ (rel), next(8));
    }
    const ts = [0, 1, 2, 3, 4, 5, 6, 7].filter((t) => sameShape(orientedCells(/** @type {any} */ (stored), t), rel));
    const cells = regions[regionIndex];
    const id = identity === 0 || (identity >= 2 && chance(50)) ? v1.labelFor(i) : `p${i}x`;
    const label = identity === 0 || (identity >= 2 && chance(50)) ? v1.labelFor(i) : pick(['', 'a', '\u00e9', '\u4e2d\u6587', '\ud83d\ude00x', 'abcd']);
    const color = identity === 0 || (identity >= 2 && chance(50))
      ? v1.colorFor(i)
      : `#${(next(2 ** 24) + 2 ** 24).toString(16).slice(1)}${''}`.replace(/[a-f]/g, (c) => (chance(50) ? c.toUpperCase() : c));
    pieces.push({ id, label, color, cells: stored });
    equivalent.push(ts);
    poses.push({
      piece: id,
      x: Math.min(...cells.map((c) => c[0])),
      y: Math.min(...cells.map((c) => c[1])),
      t: ts[0],
    });
  });
  /** @param {{ piece: string, x: number, y: number, t: number }} p @param {boolean} varied */
  const toPose = (p, varied) => {
    const ts = equivalent[pieces.findIndex((piece) => piece.id === p.piece)];
    const t = varied ? pick(ts) : p.t;
    return { piece: p.piece, x: p.x, y: p.y, turn: t % 4, mirrored: t >= 4 };
  };

  const K = pieces.length;
  const clueCount = pick([0, 1, K, next(K + 1), next(K + 1)]);
  const chosen = shuffled(poses.map((_, i) => i)).slice(0, Math.min(clueCount, K - 1));
  const clues = (chance(50) ? [...chosen].sort((a, b) => a - b) : chosen).map((i) => toPose(poses[i], chance(50)));
  const solution = chance(60) ? shuffled(poses).map((p) => toPose(p, chance(50))) : null;

  const board = boardFromRows(rows);
  /** @type {any} */
  let rating = null;
  const ratingKind = next(5);
  if (ratingKind === 1 || ratingKind === 2 || ratingKind === 4) {
    const stop = pick(v1.RATING.stops);
    const branchTrials = chance(30) ? v1.RATING.branchCap : next(v1.RATING.branchCap + 1);
    const rowTrials = chance(30) ? v1.RATING.rowCap : next(v1.RATING.rowCap + 1);
    rating = v1.rebuildRatingClaim(board, pieces, clues, { stop, branchTrials, rowTrials }, v1.measureFreePlacements);
    if (ratingKind === 4) {
      rating = { ...rating, score: rating.score + 0.5 };
    }
  } else if (ratingKind === 3) {
    rating = {
      model: 'x-model', score: next(400) / 4, level: pick(['easy', 'mystery']), saturated: false, censored: chance(50),
      metrics: { nested: { list: [1, 2.5, { deep: null }], text: '\u00e9\u4e2d' }, n: next(1000) },
    };
  }
  const label = rating === null ? null : v1.levelLabelOf(rating.level);
  const text = () => Array.from({ length: 1 + next(12) }, () => pick(['a', 'Z', '\u00e9', '\u4e2d', '\ud83d\ude00', ' ', '#'])).join('');
  const title = pick([
    null, '', label ?? 'Puzzle', label === null ? text() : `${label} #${1 + next(1000)}`, text(),
  ]);
  const certificate = chance(40)
    ? {
      status: pick(['unique', 'multiple', 'not-proved', 'unsatisfiable']),
      model: chance(50) ? 'dlx-v1' : `m-${text()}`.slice(0, 20),
      ...(chance(50) ? { rowLimit: pick([0, next(2 ** 20), Number.MAX_SAFE_INTEGER]) } : {}),
    }
    : null;

  return base({ rows, rotation: 45 * next(8), pieces, clues, solution, rating, certificate, title });
}

test('property: seeded random puzzles round-trip in every compression mode and re-encode identically', async () => {
  const seen = {
    solutions: 0, large: 0, repeated: 0, clued: 0, rated: 0, titled: 0, certified: 0, repeatedFlag: 0, compactRating: 0, escapedRating: 0,
  };
  for (let seed = 1; seed <= 150; seed += 1) {
    const snapshot = randomPuzzle(seed);
    const label = `seed ${seed}`;
    const { encoded, decoded } = await roundTrip(snapshot, { compression: 'raw' });
    const auto = await roundTrip(snapshot);
    const forced = await roundTrip(snapshot, { compression: 'deflate', codec: forcedDeflate });
    assert.equal(forced.encoded.version, 2, label);
    assert.ok(auto.encoded.version === 1 || auto.encoded.version === 2, label);
    assert.ok(auto.encoded.C.length <= encoded.C.length, `${label}: auto never gives a longer core than raw`);
    assert.equal(auto.encoded.T?.slice(0, -4), encoded.T?.slice(0, -4), `${label}: only the tail's check depends on the core's compression`);
    assert.equal(forced.encoded.T?.slice(0, -4), encoded.T?.slice(0, -4), label);
    const again = await encodePuzzleCode(snapshotOf(decoded.pack, 0), { compression: 'raw' });
    if (snapshot.title !== '') {
      assert.equal(again.F, encoded.F, `${label}: re-encoding the decoded pack is identical`);
    }
    assert.deepEqual(contentOf((await decodePuzzleCode(again.F)).pack), contentOf(decoded.pack), label);
    seen.solutions += snapshot.solution === null ? 0 : 1;
    const flagBits = v1.symbolsToBits(encoded.C.slice(0, -4));
    seen.repeatedFlag += flagBits[5];
    seen.compactRating += flagBits[6] === 1 && flagBits[7] === 1 ? 1 : 0;
    seen.escapedRating += flagBits[6] === 1 && flagBits[7] === 0 ? 1 : 0;
    seen.large += snapshot.pieces.some((/** @type {any} */ p) => p.cells.length > 10) ? 1 : 0;
    seen.repeated += new Set(snapshot.pieces.map((/** @type {any} */ p) => canonicalKey(p.cells))).size < snapshot.pieces.length ? 1 : 0;
    seen.clued += snapshot.clues.length > 0 ? 1 : 0;
    seen.rated += snapshot.rating === null ? 0 : 1;
    seen.titled += snapshot.title === null ? 0 : 1;
    seen.certified += snapshot.certificate === null ? 0 : 1;
  }
  for (const [name, count] of Object.entries(seen)) {
    assert.ok(count >= 10, `the random puzzles exercise ${name} (${count} of 150)`);
  }
});

test('property: the smallest puzzles round-trip', async () => {
  await roundTrip(base({ rows: ['#'], pieces: [piece('A', [[0, 0]], 'A', '#e6194b')] }), { compression: 'raw' });
  await roundTrip(base({
    rows: ['#'], pieces: [piece('A', [[0, 0]], 'A', '#e6194b')], solution: [pose('A', 0, 0)], rotation: 315,
  }));
  const wide = base({
    rows: ['#'.repeat(64)], pieces: [piece('Z9_-', Array.from({ length: 64 }, (_, i) => [i, 0]), '', '#000000')], solution: [pose('Z9_-', 0, 0)],
  });
  await roundTrip(wide);
});


