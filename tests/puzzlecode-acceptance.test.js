// @ts-check
// RP08: cross-app acceptance of the printed-puzzle reconstruction at the data level. The browser half is
// tests/browser/puzzle-code-acceptance.html. Every journey here runs through the shipped modules: the selected puzzle
// becomes a snapshot, the worker-backed client makes its code, the shared preparation chooses code, QR and address, the
// print layout lays the code out, an independent reading of that layout is joined back, the QR is rasterised and decoded
// with the test-only decoder, and the address that comes out opens a puzzle that is compared, value by value, with the
// selected source: board, angle, ordered pieces, original clues, pieces to place, stored answer, claims, heading and the
// progress fingerprint. Nothing is compared with another generated puzzle, a public id, a title or a thumbnail.
//
// Scenario identifiers BAnn are those of tests/fixtures/puzzlecode-acceptance.json; the last test checks that each one
// is named by a test here or a check of the browser harness, and that BA30 stays a physical, owner-run gate.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, test } from 'node:test';
import { createPuzzleCodeClient } from '../core/browser/puzzle-code-client.js';
import { PIECE_SET_MESSAGE, readIncoming, readPack } from '../core/browser/handoff.js';
import { puzzleDetails } from '../core/browser/print-dialog.js';
import { PAGE_MARGIN, PAGE_WIDTH, PREVIEW_BOTTOM, estimateTextWidth, planPrint } from '../core/browser/print-layout.js';
import {
  PUBLIC_PLAYER_URL, PuzzleShareError, isSameSnapshot, preparePuzzleShare, puzzlePlayerTarget, puzzleSnapshot,
} from '../core/browser/puzzle-snapshot.js';
import { MAX_NUMBERED_TITLE_CODE_POINTS, puzzleCodeTitle, puzzleDisplayName } from '../core/browser/puzzle-title.js';
import { makePuzzleQr, qrGeometry, qrRowRunPath } from '../core/browser/qr.js';
import { createPool } from '../core/browser/worker-pool.js';
import { createStorage } from '../core/browser/storage.js';
import { boardFromRows } from '../core/engine/board.js';
import { normalizeCells, poseCells } from '../core/engine/geometry.js';
import { progressFingerprint } from '../core/engine/keys.js';
import { validatePack } from '../core/engine/pack.js';
import { catalogueStats } from '../core/engine/puzzlecode-v1.js';
import { encodeShareCode, isPuzzleHash, parseLocationHashResult, puzzleCodeUrl } from '../core/engine/sharecode.js';
import { createI18n } from '../core/browser/i18n.js';
import playerEnPack from '../player/locale.en.js';
import playerViPack from '../player/locale.vi.js';
import { emitGeneratedResult } from '../tools/generate.mjs';
import { nodeWorkerFactory } from '../tools/node-worker.mjs';

const require = createRequire(import.meta.url);
/** @type {(data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: string }) => { data: string, chunks: Array<{ type: string, text?: string }> } | null} */
const jsQR = require('./vendor/jsqr.cjs');

const ROOT = new URL('../', import.meta.url);
/** @param {string} path */
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const fixture = JSON.parse(read('tests/fixtures/puzzlecode-v1.json'));
const matrix = JSON.parse(read('tests/fixtures/puzzlecode-acceptance.json'));
const sample = JSON.parse(read('player/samples/sample-pack.json'));
const hand = JSON.parse(read('tests/fixtures/hand-authored-pack.json'));
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const playerEn = createI18n({ en: playerEnPack, vi: playerViPack });
playerEn.setLocale('en', null);
const playerVi = createI18n({ en: playerEnPack, vi: playerViPack });
playerVi.setLocale('vi', null);

/** @param {number} n */
const english =  (n) => `Puzzle #${n}`;
/** @param {number} n */
const vietnamese = (n) => `Đề #${n}`;
/** @param {number} length */
const symbols = (length) => ALPHABET.repeat(Math.ceil(length / ALPHABET.length)).slice(0, length);
/** @param {Buffer | Uint8Array | string} data */
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
/** @param {ArrayLike<ArrayLike<number>>} rows */
const matrixHash = (rows) => sha256(Array.from(rows, (row) => Array.from(row).join('')).join('\n'));

// ---- the real worker-backed client ----------------------------------------------------------------------------------------

const workers = { spawned: 0 };
const factory = nodeWorkerFactory();
const client = createPuzzleCodeClient({
  createPool: () => /** @type {any} */ (createPool({
    size: 1,
    workerFactory: () => {
      workers.spawned += 1;
      return factory();
    },
  })),
});
after(() => client.dispose());

/** @param {string} text */
async function decodeOk(text) {
  const result = await client.decode(text);
  assert.ok(result.ok, `decodes: ${JSON.stringify(/** @type {any} */ (result).issues)}`);
  return /** @type {any} */ (result).value;
}

/** @param {import('../core/engine/puzzlecode.js').PuzzleCodeSnapshot} data */
async function encodeOk(data) {
  const result = await client.encode(data);
  assert.ok(result.ok, `encodes: ${JSON.stringify(/** @type {any} */ (result).issues)}`);
  return /** @type {any} */ (result).value;
}

// ---- the value oracle -------------------------------------------------------------------------------------------------------

/** @param {unknown} value @returns {unknown} The value with every object's keys in sorted order. */
function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(/** @type {any} */ (value)[key])]));
  }
  return value;
}
/** @param {unknown} value */
const canonical = (value) => JSON.stringify(sortKeys(value ?? null));

/**
 * Everything the puzzle must keep, in a form that equal puzzles share: accepted normalisations only (colour case,
 * symmetric pose notation through occupied cells, solution order).
 * @param {{ rows: string[], rotation: number, pieces: any[], clues: any[], solution: any[] | null, rating: unknown,
 *   certificate: unknown, heading: string }} p
 */
function viewOf(p) {
  const byId = new Map(p.pieces.map((piece) => [piece.id, piece]));
  /** @param {any} pose */
  const cellsOf = (pose) => poseCells(byId.get(pose.piece), pose).map(([x, y]) => `${x},${y}`).join(' ');
  const clued = new Set(p.clues.map((c) => c.piece));
  return {
    rows: [...p.rows],
    rotation: p.rotation,
    pieces: p.pieces.map((piece) => ({
      id: piece.id, label: piece.label, color: String(piece.color).toLowerCase(), shape: normalizeCells(piece.cells).map((c) => c.join(',')).join(' '),
    })),
    clues: p.clues.map((c) => [c.piece, cellsOf(c)]).sort(),
    toPlace: p.pieces.filter((piece) => !clued.has(piece.id)).map((piece) => piece.id),
    solution: p.solution === null ? null : p.solution.map((c) => [c.piece, cellsOf(c)]).sort(),
    rating: canonical(p.rating),
    certificate: canonical(p.certificate),
    heading: p.heading,
    fingerprint: progressFingerprint(boardFromRows(p.rows), p.pieces, p.clues),
  };
}

/**
 * The selected puzzle exactly as the source holds it.
 * @param {any} pack
 * @param {number} index
 * @param {{ rotation?: number, untitled?: (n: number) => string, tail?: boolean }} [over]
 */
function sourceView(pack, index, over = {}) {
  const puzzle = pack.puzzles[index];
  return viewOf({
    rows: pack.board.rows,
    rotation: over.rotation ?? pack.presentation?.rotation ?? 0,
    pieces: pack.pieces,
    clues: puzzle.clues,
    solution: over.tail === false ? null : (puzzle.solution ?? null),
    rating: puzzle.rating ?? null,
    certificate: puzzle.certificate ?? null,
    heading: puzzleDisplayName(puzzle.title, index, over.untitled ?? english),
  });
}

/**
 * What a decoded one-puzzle pack shows when it is opened.
 * @param {any} pack
 * @param {{ untitled?: (n: number) => string }} [over]
 */
function openedView(pack, over = {}) {
  const puzzle = pack.puzzles[0];
  return viewOf({
    rows: pack.board.rows,
    rotation: pack.presentation?.rotation ?? 0,
    pieces: pack.pieces,
    clues: puzzle.clues,
    solution: puzzle.solution ?? null,
    rating: puzzle.rating ?? null,
    certificate: puzzle.certificate ?? null,
    heading: puzzleDisplayName(puzzle.title, 0, over.untitled ?? english),
  });
}

/**
 * @param {ReturnType<typeof viewOf>} actual
 * @param {ReturnType<typeof viewOf>} expected
 * @param {string} label
 */
function assertSameView(actual, expected, label) {
  for (const key of /** @type {const} */ (['rows', 'rotation', 'pieces', 'clues', 'toPlace', 'solution', 'rating', 'certificate', 'heading', 'fingerprint'])) {
    assert.deepEqual(actual[key], expected[key], `${label}: ${key}`);
  }
}

/** One puzzle, nothing of the history that made it: no neighbours, no witness, no generation record. @param {any} pack */
function assertOnlyThisPuzzle(pack) {
  assert.equal(pack.puzzles.length, 1, 'one puzzle');
  assert.equal(pack.witness ?? null, null, 'no witness');
  assert.equal(pack.generation ?? null, null, 'no generation record');
  assert.deepEqual(Object.keys(pack.puzzles[0]).filter((key) => !['id', 'title', 'clues', 'solution', 'rating', 'certificate'].includes(key)), [], 'no seed, history or provenance on the puzzle');
}

// ---- print layout, QR raster ------------------------------------------------------------------------------------------------

/**
 * The plan of the printout of a snapshot with a prepared share (null: the job carries a share without code).
 * @param {object | null} job Overrides of the plan's job input.
 * @param {ReturnType<typeof puzzleSnapshot>} snapshot
 * @param {import('../core/browser/puzzle-snapshot.js').PreparedPuzzleShare | null} share
 * @param {Partial<import('../core/browser/print-layout.js').PrintOptions>} [options]
 */
function planFor(job, snapshot, share, options = {}) {
  return planPrint({
    board: boardFromRows(snapshot.data.rows),
    pieces: snapshot.data.pieces,
    clues: snapshot.data.clues,
    rotation: snapshot.data.rotation,
    title: snapshot.heading,
    details: [[{ text: 'Easy: score 8' }]],
    share,
    measure: estimateTextWidth,
    ...(job ?? {}),
  }, { pieces: true, board: true, size: 'medium', duplex: false, ...options });
}

/**
 * The black modules the SVG path draws, read by an independent reader of the documented `M x y h w v1 h-w z` runs.
 * @param {string} path
 * @param {number} size
 */
function modulesOfPath(path, size) {
  const rows = Array.from({ length: size }, () => new Uint8Array(size));
  const run = /M(\d+) (\d+)h(\d+)v1h-(\d+)z/y;
  let at = 0;
  while (at < path.length) {
    run.lastIndex = at;
    const m = run.exec(path);
    assert.ok(m !== null && m[3] === m[4], `a run at ${at}`);
    const [x, y, w] = [Number(m[1]), Number(m[2]), Number(m[3])];
    assert.ok(y < size && x + w <= size, 'a run inside the symbol');
    for (let i = x; i < x + w; i += 1) {
      assert.equal(rows[y][i], 0, 'no module is drawn twice');
      rows[y][i] = 1;
    }
    at += m[0].length;
  }
  return rows;
}

/**
 * Four pixels per module and four white quiet-zone modules, opaque, decoded with the pinned jsQR.
 * @param {ArrayLike<ArrayLike<number>>} rows
 */
function scan(rows) {
  const scale = 4;
  const quiet = 4;
  const side = (rows.length + 2 * quiet) * scale;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows.length; x += 1) {
      if (rows[y][x] !== 1) {
        continue;
      }
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const at = (((y + quiet) * scale + dy) * side + (x + quiet) * scale + dx) * 4;
          data[at] = 0;
          data[at + 1] = 0;
          data[at + 2] = 0;
        }
      }
    }
  }
  return jsQR(data, side, side, { inversionAttempts: 'dontInvert' });
}

// ---- journeys ---------------------------------------------------------------------------------------------------------------

/**
 * The whole data path of a printout for one selected puzzle, and its checks against the source.
 * @param {string} label
 * @param {any} pack The source pack, with the selected puzzle among others.
 * @param {number} index
 * @param {{ rotation?: number, expectedCode?: string, expectedHash?: string, untitled?: (n: number) => string }} [over]
 */
async function journey(label, pack, index, over = {}) {
  const untitled = over.untitled ?? english;
  const rotation = over.rotation ?? pack.presentation?.rotation ?? 0;
  const snapshot = puzzleSnapshot({ rows: pack.board.rows, pieces: pack.pieces, puzzle: pack.puzzles[index], index, rotation, untitled });
  const prepared = await preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client });
  const code = prepared.code;
  if (over.expectedCode !== undefined) {
    assert.equal(code.F, over.expectedCode, `${label}: the frozen code`);
  }
  assert.equal(prepared.carried, 'C.T', `${label}: the stored answer is carried`);
  assert.deepEqual(prepared.notices, [], `${label}: no notice for the public target`);

  // The sheet carries the QR and nothing typed: the code is the QR's, not a printed substitute.
  const plan = planFor(null, snapshot, prepared);
  assert.ok(plan.band.qr !== null, `${label}: the QR is on the first sheet`);
  assert.ok(!('code' in plan.band) && !('continuation' in plan.band), `${label}: no typed code and no continuation sheets`);

  // The QR: from the very path the sheet draws, decoded independently to the complete URL.
  const qr = /** @type {NonNullable<typeof prepared.qr>} */ (prepared.qr);
  const drawn = modulesOfPath(qrRowRunPath(qr.rows), qr.modules);
  assert.deepEqual(drawn.map((row) => Array.from(row)), qr.rows.map((row) => Array.from(row)), `${label}: the drawn modules are the matrix`);
  if (over.expectedHash !== undefined) {
    assert.equal(matrixHash(drawn), over.expectedHash, `${label}: the frozen matrix`);
  }
  const scanned = scan(drawn);
  assert.ok(scanned !== null, `${label}: the QR decodes`);
  assert.equal(scanned.data, `${PUBLIC_PLAYER_URL}#p=${code.F}`, `${label}: the QR carries the complete URL, prefix case included`);
  assert.equal(scanned.data, prepared.url, `${label}: and it is the address Copy link copies`);
  assert.deepEqual(scanned.chunks.map((chunk) => chunk.type), ['byte', 'alphanumeric'], `${label}: byte prefix, alphanumeric code`);

  // The address opens the same puzzle (the scan), and so does the typed full code and the typed core alone.
  const decodePuzzle = (/** @type {string} */ text) => client.decode(text);
  const opened = await readIncoming({ hash: new URL(scanned.data).hash }, { decodePuzzle });
  assert.ok(opened.ok, `${label}: the scanned address opens`);
  const expected = sourceView(pack, index, { rotation, untitled });
  const full = /** @type {any} */ (opened).value;
  assert.equal(full.index, 0);
  assertOnlyThisPuzzle(full.pack);
  assertSameView(openedView(full.pack, { untitled }), expected, `${label} full`);
  const typed = await decodeOk(code.F.replace(/(.{4})/g, '$1 ').toLowerCase());
  assert.equal(typed.hasTail, true);
  assertSameView(openedView(typed.pack, { untitled }), expected, `${label} typed grouped`);

  const core = await decodeOk(code.C);
  assert.equal(core.hasTail, false, `${label}: a core alone has no answer`);
  assert.equal(core.pack.puzzles[0].solution ?? null, null, `${label}: no answer is invented`);
  assertOnlyThisPuzzle(core.pack);
  assertSameView(openedView(core.pack, { untitled }), { ...expected, solution: null }, `${label} core`);
  assert.equal(openedView(core.pack, { untitled }).fingerprint, expected.fingerprint, `${label}: the same progress fingerprint from the core alone`);
  return { snapshot, prepared, plan, url: /** @type {string} */ (prepared.url), expected };
}

test('BA01 BA02 BA03 BA04: print, read the code, scan the QR, open the puzzle — original samples and the hand-authored puzzle', async () => {
  const hashOf = (/** @type {string} */ name) => fixture.qrMatrices.rows.find((/** @type {any} */ row) => row.name === name).sha256;
  const [g1, g2, g3, g4] = fixture.goldens;
  await journey('sample 1 of 3', sample, 0, { expectedCode: g1.code, expectedHash: hashOf(g1.name) });
  const middle = await journey('sample 2 of 3 (title Normal, shown Normal #2)', sample, 1, { expectedCode: g2.code, expectedHash: hashOf(g2.name) });
  assert.equal(middle.snapshot.heading, 'Normal #2');
  assert.equal(middle.expected.heading, 'Normal #2');
  await journey('sample 3 of 3', sample, 2, { expectedCode: g3.code, expectedHash: hashOf(g3.name) });
  await journey('hand-authored', hand, 0, { expectedCode: g4.code, expectedHash: hashOf(g4.name) });
  // One selected puzzle: the code of puzzle 2 holds neither neighbour.
  const decoded = await decodeOk(g2.code);
  assertOnlyThisPuzzle(decoded.pack);
  const neighbours = [sample.puzzles[0], sample.puzzles[2]];
  for (const other of neighbours) {
    assert.notDeepEqual(decoded.pack.puzzles[0].clues, other.clues, 'the neighbour is not what the code opens');
  }
  assert.ok(g2.code.length < 60, 'a code is a puzzle, not a pack');
});

test('BA05: the 243-character oracle — pieces beyond Z keep their identity, colours, order, clues, claims and answer', async () => {
  const oracle = fixture.large;
  const decoded = await decodeOk(oracle.code);
  const pack = decoded.pack;
  assertOnlyThisPuzzle(pack);
  assert.equal(decoded.hasTail, true);
  assert.equal(oracle.code.length, oracle.fullLength);
  assert.equal(oracle.code.indexOf('.'), oracle.coreLength);
  assert.deepEqual([pack.board.rows.length, pack.board.rows[0].length], [oracle.height, oracle.width]);
  assert.ok(pack.board.rows.every((/** @type {string} */ row) => row === '#'.repeat(oracle.width)), 'a full 24 x 24 board');
  assert.equal(pack.presentation?.rotation ?? 0, oracle.rotation);
  assert.equal(pack.pieces.length, oracle.pieceCount);
  assert.deepEqual(pack.pieces.map((/** @type {any} */ piece) => piece.cells.length), oracle.pieceSizes, 'sizes in source order');
  const labels = Array.from({ length: oracle.pieceCount }, (_, i) => (i < 26 ? String.fromCharCode(65 + i) : `A${String.fromCharCode(65 + i - 26)}`));
  assert.deepEqual(pack.pieces.map((/** @type {any} */ piece) => piece.id), labels, 'default identities A to AN, in order');
  assert.deepEqual(pack.pieces.map((/** @type {any} */ piece) => piece.label), labels, 'default labels');
  assert.deepEqual(pack.pieces.map((/** @type {any} */ piece) => piece.color.toLowerCase()), fixture.colors.slice(0, oracle.pieceCount), 'the frozen RGB defaults');
  const puzzle = pack.puzzles[0];
  assert.equal(puzzle.clues.length, oracle.clueCount);
  const byId = new Map(pack.pieces.map((/** @type {any} */ piece) => [piece.id, piece]));
  /** @param {any} pose */
  const cells = (pose) => poseCells(byId.get(pose.piece), pose).map(([x, y]) => `${x},${y}`).join(' ');
  assert.deepEqual(puzzle.clues.map(cells), oracle.clues.map(cells), 'the original clues, as occupied cells');
  assert.deepEqual(puzzle.rating, oracle.rating, 'the complete rating claim');
  assert.equal(progressFingerprint(boardFromRows(pack.board.rows), pack.pieces, puzzle.clues), oracle.progressFingerprint, 'the independent fingerprint');
  // The stored answer tiles the board, and its clued pieces sit where the clues put them.
  const covered = new Map();
  for (const pose of puzzle.solution) {
    for (const cell of poseCells(byId.get(pose.piece), pose)) {
      const key = cell.join(',');
      assert.ok(!covered.has(key), `cell ${key} is covered once`);
      covered.set(key, pose.piece);
    }
  }
  assert.equal(covered.size, oracle.width * oracle.height, 'every cell is covered');
  assert.equal(puzzle.solution.length, oracle.pieceCount);
  for (const clue of puzzle.clues) {
    const placed = puzzle.solution.find((/** @type {any} */ pose) => pose.piece === clue.piece);
    assert.equal(cells(placed), cells(clue), `answer keeps clue ${clue.piece}`);
  }
  // The core alone is the same puzzle without the answer.
  const core = await decodeOk(oracle.code.slice(0, oracle.coreLength));
  assert.equal(core.pack.puzzles[0].solution ?? null, null);
  assert.equal(openedView(core.pack).fingerprint, oracle.progressFingerprint);
  // Printing the puzzle that this code opens re-creates this very code, and its QR is the frozen version 11 symbol.
  const sourceLike = { board: { rows: pack.board.rows }, pieces: pack.pieces, puzzles: [puzzle], presentation: pack.presentation };
  const hash = fixture.qrMatrices.rows.find((/** @type {any} */ row) => row.name === oracle.name).sha256;
  const made = await journey('24 x 24, 40 pieces, answer, hell-1', sourceLike, 0, { expectedCode: oracle.code, expectedHash: hash });
  assert.equal(made.prepared.qr?.version, 11);
  assert.equal(made.prepared.qr?.modules, 61);
  assert.equal(made.url.length, 288, 'the 288-character link');
  assert.deepEqual(made.expected.pieces.map((piece) => piece.id), labels);
});

/**
 * A custom pack from the hand-authored one: a piece removed and its cells blocked (irregular holes), a blocked border of
 * different widths around the board, ASCII ids and Unicode labels, upper-case RGB, an angle of 135 degrees, claims of
 * every kind and three titled puzzles of the same board.
 */
function customPack() {
  const base = structuredClone(hand);
  const removed = 'D';
  const piece = base.pieces.find((/** @type {any} */ p) => p.id === removed);
  const pose = base.puzzles[0].solution.find((/** @type {any} */ p) => p.piece === removed);
  const holes = new Set(poseCells(piece, pose).map(([x, y]) => `${x},${y}`));
  const open = base.board.rows.map((/** @type {string} */ row, /** @type {number} */ y) => [...row].map((c, x) => (holes.has(`${x},${y}`) ? '.' : c)).join(''));
  const left = 2;
  const right = 3;
  const top = 1;
  const bottom = 2;
  const width = open[0].length + left + right;
  const rows = [
    ...Array(top).fill('.'.repeat(width)),
    ...open.map((/** @type {string} */ row) => `${'.'.repeat(left)}${row}${'.'.repeat(right)}`),
    ...Array(bottom).fill('.'.repeat(width)),
  ];
  const identity = {
    A: ['a-1', 'Đ', '#FF00AA'], B: ['B_2', '🙂', '#00AAFF'], C: ['x3', 'ƒ', '#12AB34'], E: ['E', '', '#FFFFFF'],
    F: ['f-6', '日本', '#000001'], G: ['G7', 'G', '#C0FFEE'], H: ['h8', 'Ω', '#BADA55'], I: ['I9', 'é', '#010203'], J: ['J_10', '⑩', '#FEDCBA'],
  };
  const rename = (/** @type {string} */ id) => /** @type {any} */ (identity)[id][0];
  /** @param {any} p */
  const shift = (p) => ({ ...p, piece: rename(p.piece), x: p.x + left, y: p.y + top });
  const claims = {
    rating: { model: 'difficulty-v2', score: 51, level: 'hard-2', saturated: false, metrics: { U: 11, B: 120, branchTrials: 30, rowTrials: 900, stop: 'solution', R: 140, H: 6.25 } },
    certificate: { status: 'unique', model: 'dlx-v1', rowLimit: 123456789 },
  };
  const solution = base.puzzles[0].solution.filter((/** @type {any} */ p) => p.piece !== removed).map(shift);
  const clues = base.puzzles[0].clues.map(shift);
  const puzzles = [
    { id: 'c-1', title: 'Ünïcødé 🧩 Rätsel', clues, solution, ...claims },
    { id: 'c-2', clues, solution },
    { id: 'c-3', title: `${'😀'.repeat(MAX_NUMBERED_TITLE_CODE_POINTS)} end`, clues, solution },
  ];
  const checked = validatePack({
    ...base,
    board: { rows },
    presentation: { rotation: 135 },
    pieces: base.pieces.filter((/** @type {any} */ p) => p.id !== removed).map((/** @type {any} */ p) => ({
      id: rename(p.id), label: /** @type {any} */ (identity)[p.id][1], color: /** @type {any} */ (identity)[p.id][2], cells: p.cells,
    })),
    puzzles,
  });
  assert.ok(checked.ok, `the custom pack is valid: ${JSON.stringify(/** @type {any} */ (checked).issues)}`);
  return JSON.parse(JSON.stringify(/** @type {any} */ (checked).value));
}

test('BA06 BA07 BA08 BA09: custom ids, Unicode labels and RGB, a padded border, irregular holes and a turned view survive exactly', async () => {
  const pack = customPack();
  assert.ok(pack.board.rows[0].startsWith('..') && pack.board.rows[0].endsWith('...'), 'the border is blocked on every side with different widths');
  assert.ok(pack.board.rows.slice(1, -2).some((/** @type {string} */ row) => row.slice(2, -3).includes('.')), 'and the board has holes inside');
  assert.equal(pack.pieces.find((/** @type {any} */ p) => p.id === 'E').label, '', 'an empty label stays empty');
  const made = await journey('custom, view 135', pack, 0, { rotation: 135 });
  assert.equal(made.snapshot.data.rotation, 135);
  const opened = (await decodeOk(/** @type {string} */ (made.prepared.code.F))).pack;
  assert.equal(opened.presentation.rotation, 135, 'the encoded angle is the view');
  assert.deepEqual(opened.pieces.map((/** @type {any} */ p) => [p.id, p.label, p.color.toLowerCase()]), pack.pieces.map((/** @type {any} */ p) => [p.id, p.label, p.color.toLowerCase()]), 'custom identities are not relabelled');
  assert.deepEqual(opened.board.rows, pack.board.rows, 'frame, holes and shifted coordinates');
  assert.deepEqual(opened.puzzles[0].rating, pack.puzzles[0].rating, 'the claims');
  assert.deepEqual(opened.puzzles[0].certificate, pack.puzzles[0].certificate);

  // Every angle the Player can show is encoded as shown, and nothing else changes.
  const turns = [];
  for (const rotation of [0, 45, 90, 135, 180, 225, 270, 315, 360, 405, -45]) {
    const snapshot = puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle: sample.puzzles[0], index: 0, rotation, untitled: english });
    const code = await encodeOk(snapshot.data);
    const back = (await decodeOk(code.F)).pack;
    turns.push(back.presentation?.rotation ?? 0);
    assert.equal(openedView(back).fingerprint, sourceView(sample, 0).fingerprint, `angle ${rotation}: the same puzzle`);
  }
  assert.deepEqual(turns, [0, 45, 90, 135, 180, 225, 270, 315, 0, 45, 315]);
});

test('BA12 BA13 BA14 BA15: typos are never applied silently, a bad tail opens nothing by itself, bad addresses change nothing, source changes make new snapshots', async () => {
  const golden = fixture.goldens[1].code;
  const core = golden.slice(0, golden.indexOf('.'));
  const expected = sourceView(sample, 1);
  /** @param {string} text @param {number} at */
  const change = (text, at) => text.slice(0, at) + (text[at] === '0' ? '1' : '0') + text.slice(at + 1);

  const typo = await client.decode(change(core, 5));
  assert.ok(!typo.ok, 'one wrong symbol does not open a puzzle');
  const failure = /** @type {any} */ (typo);
  assert.equal(failure.issues[0].code, 'core-check');
  assert.equal(failure.candidate.expected, core[5], 'the one candidate names the original symbol');
  assert.equal(failure.candidate.typed, change(core, 5)[5]);
  assertSameView(openedView((await decodeOk(failure.candidate.correctedCode)).pack), { ...expected, solution: null }, 'confirmed candidate');
  assert.deepEqual([failure.candidate.component, failure.candidate.group, failure.candidate.position], ['core', 2, 2], 'named by printed group and position');
  assert.ok(!(await client.decode(change(change(core, 5), 9))).ok, 'two wrong symbols open nothing');
  assert.equal(/** @type {any} */ (await client.decode(change(change(core, 5), 9))).candidate, undefined, 'and offer no guess');

  const damaged = change(golden, golden.length - 1);
  const tail = await client.decode(damaged);
  assert.ok(!tail.ok, 'a damaged tail does not open the puzzle by itself');
  assert.equal(/** @type {any} */ (tail).issues[0].code, 'tail-check');
  const recovery = /** @type {any} */ (tail).recovery;
  assert.equal(recovery.kind, 'core-only');
  assertSameView(openedView(recovery.pack), { ...expected, solution: null }, 'core offered after a bad tail');
  const viaAddress = await readIncoming({ hash: `#p=${damaged}` }, { decodePuzzle: (text) => client.decode(text) });
  assert.ok(!viaAddress.ok && /** @type {any} */ (viaAddress).recovery?.kind === 'core-only', 'an address with a bad tail offers the core and opens nothing');

  /** Every failure leaves the store alone: nothing is read for a puzzle address and nothing is written. */
  const writes = [];
  const data = new Map();
  const adapter = {
    get length() {
      return data.size;
    },
    key: (/** @type {number} */ i) => [...data.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => data.get(k) ?? null,
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => void (writes.push(k), data.set(k, v)),
    removeItem: (/** @type {string} */ k) => void data.delete(k),
  };
  const storage = createStorage(adapter, () => 1_800_000_000_000);
  /** @type {Array<[string, string]>} */
  const bad = [
    [`#p=${golden}&i=1`, 'invalid-index'],
    [`#p=${golden}&i=0&i=0`, 'invalid-hash'],
    [`#p=${golden}&p=${core}`, 'invalid-hash'],
    [`#p=${golden}&pack=2z.abc`, 'invalid-hash'],
    [`#p=${golden}&lib=0123456789abcdef`, 'invalid-hash'],
    ['#p=', 'invalid-hash'],
    [`#pack=2z.abc&p=${golden}`, 'invalid-hash'],
  ];
  for (const [hash, code] of bad) {
    const result = await readIncoming({ hash }, { decodePuzzle: (text) => client.decode(text), storage });
    assert.ok(!result.ok, hash);
    assert.equal(/** @type {any} */ (result).issues[0].code, code, hash);
  }
  assert.deepEqual(writes, [], 'no bad address wrote anything');
  assert.equal(parseLocationHashResult(`#p=${golden}`).ok, true);
  assert.equal(isPuzzleHash(`#p=${golden}`), true);

  // Source changes make a new snapshot: a stale preparation is recognisable; progress and neighbours are no part of it.
  const first = puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle: sample.puzzles[1], index: 1, rotation: 0, untitled: english });
  const again = puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle: { ...sample.puzzles[1], moves: 12 }, index: 1, rotation: 0, untitled: english });
  assert.ok(isSameSnapshot(first, again), 'moves and elapsed time are not part of the snapshot');
  const neighbour = structuredClone(sample);
  neighbour.puzzles[0].clues = neighbour.puzzles[0].clues.slice(1);
  assert.ok(isSameSnapshot(first, puzzleSnapshot({ rows: neighbour.board.rows, pieces: neighbour.pieces, puzzle: neighbour.puzzles[1], index: 1, rotation: 0, untitled: english })), 'a neighbour is not part of it');
  /** @type {Array<[string, Parameters<typeof puzzleSnapshot>[0]]>} */
  const changes = [
    ['angle', { rows: sample.board.rows, pieces: sample.pieces, puzzle: sample.puzzles[1], index: 1, rotation: 45, untitled: english }],
    ['title', { rows: sample.board.rows, pieces: sample.pieces, puzzle: { ...sample.puzzles[1], title: 'Other' }, index: 1, rotation: 0, untitled: english }],
    ['position', { rows: sample.board.rows, pieces: sample.pieces, puzzle: sample.puzzles[1], index: 2, rotation: 0, untitled: english }],
    ['clues', { rows: sample.board.rows, pieces: sample.pieces, puzzle: { ...sample.puzzles[1], clues: sample.puzzles[1].clues.slice(1) }, index: 1, rotation: 0, untitled: english }],
    ['answer', { rows: sample.board.rows, pieces: sample.pieces, puzzle: { ...sample.puzzles[1], solution: null }, index: 1, rotation: 0, untitled: english }],
    ['label', { rows: sample.board.rows, pieces: sample.pieces.map((/** @type {any} */ p, /** @type {number} */ i) => (i === 0 ? { ...p, label: 'Z' } : p)), puzzle: sample.puzzles[1], index: 1, rotation: 0, untitled: english }],
    ['language', { rows: sample.board.rows, pieces: sample.pieces, puzzle: { ...sample.puzzles[1], title: '' }, index: 1, rotation: 0, untitled: vietnamese }],
  ];
  for (const [name, source] of changes) {
    assert.ok(!isSameSnapshot(first, puzzleSnapshot(source)), `a change of the ${name} is a new snapshot`);
  }
  assert.ok(Object.isFrozen(first.data) && Object.isFrozen(first.data.clues), 'the snapshot is immutable');
});

test('BA16 BA22 BA25: print options change the layout, never the code; Print and Copy link share one prepared address; the stored answer adds no solution sheet', async () => {
  const snapshot = puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle: sample.puzzles[0], index: 0, rotation: 0, untitled: english });
  const target = puzzlePlayerTarget('http://localhost:8708/pentomino/generator/');
  const asPrint = await preparePuzzleShare(snapshot, { target, client });
  const asCopy = await preparePuzzleShare(snapshot, { target: puzzlePlayerTarget('http://localhost:8708/pentomino/player/'), client });
  assert.equal(asPrint.url, asCopy.url, 'one snapshot, one target (the page the user is on), one address');
  assert.equal(asPrint.url, `http://localhost:8708/pentomino/player/#p=${fixture.goldens[0].code}`);
  assert.deepEqual([asPrint.notices, asCopy.notices], [[], []]);
  assert.equal(await client.encode(snapshot.data).then((r) => /** @type {any} */ (r).value.F), asPrint.code.F, 'a fresh encoding agrees');

  const layouts = new Set();
  let calls = 0;
  const counting = { encode: (/** @type {any} */ data) => (calls += 1, client.encode(data)) };
  const shared = await preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client: /** @type {any} */ (counting) });
  assert.equal(calls, 1);
  for (const size of /** @type {const} */ (['small', 'medium', 'large', 'fit_page'])) {
    for (const [pieces, board] of [[true, true], [true, false], [false, true], [false, false]]) {
      for (const duplex of [false, true]) {
        const plan = planFor(null, snapshot, shared, { size, pieces, board, duplex });
        assert.deepEqual(plan.band.qr?.x, 10, `${size} ${pieces} ${board} ${duplex}: the QR stays at the left`);
        assert.equal(plan.share?.url, shared.url);
        layouts.add(`${plan.cellMm}|${plan.sheets.length}|${plan.pages.length}`);
      }
    }
  }
  assert.ok(layouts.size > 1, 'the layouts differ');
  assert.equal(calls, 1, 'no option change encoded again');

  // The answer in the code gives no solution sheet: only the job's own solution does.
  const withShare = planFor(null, snapshot, shared, { solution: true });
  const withoutShare = planFor(null, snapshot, null, { solution: true });
  assert.deepEqual(withShare.sheets.map((sheet) => sheet.kind).filter((kind) => kind === 'solution'), []);
  assert.deepEqual(withoutShare.sheets.map((sheet) => sheet.kind).filter((kind) => kind === 'solution'), []);
  assert.equal(shared.carried, 'C.T');
});

test('BA17 BA18 BA19: the Player target — the page\'s own Player on every http, https and file page, a fork keeps its path, only an unusable page uses the public Player', () => {
  assert.equal(puzzlePlayerTarget('http://localhost:8708/pentomino/generator/'), 'http://localhost:8708/pentomino/player/');
  for (const [page, own] of [
    ['http://127.0.0.1:8080/pentomino/generator/', 'http://127.0.0.1:8080/pentomino/player/'],
    ['http://192.168.1.20:8080/pentomino/generator/', 'http://192.168.1.20:8080/pentomino/player/'],
    ['file:///Q:/git/pentomino/generator/index.html', 'file:///Q:/git/pentomino/player/'],
  ]) {
    assert.equal(puzzlePlayerTarget(page), own, `${page} points at its own Player`);
  }
  assert.equal(puzzlePlayerTarget('https://tdat00.github.io/pentomino/generator/'), 'https://tdat00.github.io/pentomino/player/');
  assert.equal(puzzlePlayerTarget('https://Example.org/My-Fork/pentomino/generator/'), 'https://example.org/My-Fork/pentomino/player/', 'a fork keeps its case-sensitive path');
  assert.equal(puzzlePlayerTarget('about:blank'), PUBLIC_PLAYER_URL, 'a page without a usable address uses the public Player');
  assert.throws(() => puzzlePlayerTarget('not a url'), RangeError);
  assert.equal(puzzleCodeUrl('https://example.org/My-Fork/pentomino/player/', fixture.goldens[0].code), `https://example.org/My-Fork/pentomino/player/#p=${fixture.goldens[0].code}`, 'no index and no change of the target\'s case');
});

test('BA20 BA21: the capacity ladder — drop the tail before the lower error correction, then L, then no code and no QR', async () => {
  /** @param {number} c @param {number} t */
  const fixed = (c, t) => ({
    encode: async () => {
      const C = symbols(c);
      const T = t > 0 ? symbols(t) : null;
      return { ok: /** @type {const} */ (true), value: { C, T, F: T === null ? C : `${C}.${T}`, version: /** @type {const} */ (1) }, warnings: [] };
    },
  });
  const snapshot = puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle: sample.puzzles[0], index: 0, rotation: 0, untitled: english });
  const prepare = (/** @type {number} */ c, /** @type {number} */ t) => preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client: fixed(c, t) });

  const fits = await prepare(200, 40);
  assert.deepEqual([fits.carried, fits.qr?.ec, fits.notices], ['C.T', 'M', []], 'a code that fits carries its answer');
  // M holds 3,322 code characters at version 40, L 4,227: with the full code at 3,501 the lower level would fit, but the tail goes first.
  const noTail = await prepare(3000, 500);
  assert.deepEqual([noTail.carried, noTail.code.T, noTail.qr?.ec, noTail.notices], ['C', null, 'M', ['noTail']], 'the tail leaves text and QR, M is kept');
  assert.equal(noTail.code.F, noTail.code.C);
  assert.equal(noTail.url, `${PUBLIC_PLAYER_URL}#p=${noTail.code.C}`);
  assert.equal(noTail.qr?.url, noTail.url);
  const low = await prepare(3400, 500);
  assert.deepEqual([low.carried, low.qr?.ec, low.notices], ['C', 'L', ['noTail', 'lowEc']], 'then L for the core');
  const none = await prepare(4300, 0);
  assert.deepEqual([none.qr, none.notices], [null, ['none']], 'a core that fits no symbol has no QR');
  assert.equal(none.url, `${PUBLIC_PLAYER_URL}#p=${none.code.C}`, 'a within-budget address may still be copied');
  const tooBig = await prepare(15990, 0);
  assert.deepEqual([tooBig.qr, tooBig.url, tooBig.notices], [null, null, ['none']], 'beyond the URL budget there is no address either');
  for (const [name, share] of [['none', none], ['too big', tooBig]]) {
    const plan = planFor(null, snapshot, share);
    assert.equal(plan.band.qr, null, `${name}: no QR on the sheet`);
    assert.ok(plan.band.noCodeY !== null, `${name}: the sheet says so`);
  }
  // The notices are the ladder's only: the page the link points at adds none.
  const both = await preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client: fixed(3000, 500) });
  assert.deepEqual(both.notices, ['noTail']);
  // An encoder failure is an error, never an oversize puzzle.
  await assert.rejects(preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client: { encode: async () => ({ ok: false, issues: [{ code: 'worker-error', path: '$', message: 'boom' }] }) } }), PuzzleShareError);
});

test('QR box: N = 17 + 4v, outer = N + 8, side = max(25, 0.5 x outer); version 5, 11 and 40 lay out beside the text without overlap', async () => {
  for (const [version, side] of [[5, 25], [11, 34.5], [40, 92.5]]) {
    const n = 17 + 4 * version;
    assert.equal(qrGeometry(version).outerModules, n + 8);
    assert.equal(qrGeometry(version).outerMm, side, `version ${version}`);
    assert.equal(Math.max(25, (n + 8) * 0.5), side);
    assert.ok(qrGeometry(version).moduleMm >= 0.5 - 1e-9);
  }
  const snapshot = puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle: sample.puzzles[0], index: 0, rotation: 0, untitled: english });
  /** The shortest code of a QR version at level M, with a tail of a tenth of the core like a stored answer. @param {number} version */
  const codeFor = (version) => {
    /** @param {number} length */
    const made = (length) => {
      const C = symbols(length);
      const T = symbols(Math.max(1, Math.floor(length / 10)));
      const qr = makePuzzleQr({ urlPrefix: `${PUBLIC_PLAYER_URL}#p=`, code: `${C}.${T}`, ec: 'M' });
      return { C, T, version: qr.ok ? qr.value.version : 41 };
    };
    let low = 20;
    let high = 3400;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (made(middle).version >= version) {
        high = middle;
      } else {
        low = middle + 1;
      }
    }
    const { C, T, version: found } = made(low);
    assert.equal(found, version, `a code makes a version ${version} symbol`);
    return { encode: async () => ({ ok: /** @type {const} */ (true), value: { C, T, F: `${C}.${T}`, version: /** @type {const} */ (1) }, warnings: [] }) };
  };
  const shares = [
    await preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client }),
    await preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client: codeFor(11) }),
    await preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client: codeFor(40) }),
  ];
  assert.deepEqual(shares.map((share) => share.qr?.version), [5, 11, 40]);
  assert.deepEqual(shares.map((share) => share.qr?.outerMm), [25, 34.5, 92.5]);
  for (const share of shares) {
    const qr = /** @type {NonNullable<typeof share.qr>} */ (share.qr);
    const scanned = scan(modulesOfPath(qrRowRunPath(qr.rows), qr.modules));
    assert.equal(scanned?.data, share.url, `version ${qr.version}: decodes to the address`);
    const plan = planFor(null, snapshot, share);
    const box = /** @type {NonNullable<typeof plan.band.qr>} */ (plan.band.qr);
    assert.deepEqual([box.x, box.y], [PAGE_MARGIN, PAGE_MARGIN], 'the QR sits in the top-left corner of the content area, left of the puzzle name');
    // The heading is to the right of the QR column, with the same 6 mm gap whatever the size of the symbol.
    assert.equal(plan.band.head.x, box.x + box.size + 6);
    assert.equal(plan.band.head.x + plan.band.head.width, PAGE_WIDTH - PAGE_MARGIN, 'and ends at the right margin');
    assert.ok(PREVIEW_BOTTOM - plan.band.top >= 120 - 1e-6, `version ${qr.version}: the preview keeps its room (${PREVIEW_BOTTOM - plan.band.top})`);
    assert.ok(plan.band.bottom >= box.y + box.size, 'the band ends under the QR');
  }
  // Every module the sheet draws is black on opaque white: the matrix, not an inversion, with its quiet zone.
  const qr = /** @type {NonNullable<typeof shares[0]['qr']>} */ (shares[0].qr);
  assert.equal(qr.quietModules, 4);
  assert.equal(qr.ec, 'M');
  const lowOnly = makePuzzleQr({ urlPrefix: PUBLIC_PLAYER_URL + '#p=', code: symbols(3300), ec: 'L' });
  assert.ok(lowOnly.ok && lowOnly.value.ec === 'L' && lowOnly.value.version < 40, 'L is used only when asked, and is not boosted');
});

test('BA24: the puzzle seed and the set line are gone from the printed lines; only the level and the score stay', () => {
  const lines = puzzleDetails(playerEn.t, { level: 'Easy', score: 8 });
  const text = lines.map((line) => line.map((part) => part.text).join(''));
  assert.deepEqual(text, ['Easy: score 8']);
  assert.ok(!/seed|set/i.test(text.join(' ')));
  const vi = puzzleDetails(playerVi.t, { level: 'Dễ', score: 8, saturated: true }).map((line) => line.map((part) => part.text).join(''));
  assert.deepEqual(vi, ['Dễ: điểm 8+']);
  assert.equal(puzzleDetails.length, 2, 'neither a puzzle seed nor a set is a parameter');
  assert.deepEqual(puzzleDetails(playerEn.t, null), []);
});

test('BA26 BA27: the shared heading rule — untitled later puzzles, 75/76/80 code points at positions 1, 2 and 100, also through the codec', async () => {
  const astral = (/** @type {number} */ n) => '😀'.repeat(n);
  assert.deepEqual([0, 1, 4, 99].map((i) => puzzleDisplayName(undefined, i, english)), ['Puzzle #1', 'Puzzle #2', 'Puzzle #5', 'Puzzle #100']);
  assert.deepEqual([0, 1, 4, 99].map((i) => puzzleDisplayName('', i, vietnamese)), ['Đề #1', 'Đề #2', 'Đề #5', 'Đề #100']);
  assert.equal(puzzleDisplayName('Hard #3', 0), 'Hard #3', 'an existing #digits suffix stays');
  assert.equal(puzzleDisplayName('Hard #3', 8), 'Hard #3');
  assert.equal(puzzleDisplayName('Normal', 1), 'Normal #2');
  for (const length of [75, 76, 80]) {
    for (const index of [0, 1, 99]) {
      const title = astral(length);
      const shown = puzzleDisplayName(title, index);
      assert.equal(shown, length > MAX_NUMBERED_TITLE_CODE_POINTS ? title : `${title} #${index + 1}`, `${length} code points at position ${index + 1}`);
      assert.equal(Array.from(shown).length <= 80, true, 'a heading always fits a pack title');
      assert.equal(puzzleDisplayName(puzzleCodeTitle(title, index), 0), shown, `the title in the code re-creates the heading (${length}, ${index + 1})`);
    }
  }
  // The whole path: a puzzle at position 100 of a pack, with the heading it shows there.
  for (const [title, untitled, label] of /** @type {const} */ ([
    [undefined, english, 'untitled'], [undefined, vietnamese, 'untitled, Vietnamese'], [astral(75), english, '75 code points'], [astral(76), english, '76 code points'], [astral(80), english, '80 code points'], ['Normal', english, 'ordinary title'], ['Hard #3', english, 'title with a number'],
  ])) {
    const puzzle = { ...sample.puzzles[1], title };
    const snapshot = puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle, index: 99, rotation: 0, untitled });
    const code = await encodeOk(snapshot.data);
    const opened = (await decodeOk(code.F)).pack;
    assert.equal(puzzleDisplayName(opened.puzzles[0].title, 0, untitled), snapshot.heading, `${label}: the re-created puzzle shows the printed heading`);
    assert.equal(snapshot.heading, puzzleDisplayName(title, 99, untitled));
  }
});

test('BA28: #pack, #lib and file imports behave as before and never touch the puzzle-code service', async () => {
  const neverDecoded = { decodePuzzle: () => { throw new Error('the code service must not be used'); } };
  const link = await encodeShareCode(sample);
  const viaPack = await readIncoming({ hash: `#pack=${link}&i=2` }, neverDecoded);
  assert.ok(viaPack.ok);
  const packed = /** @type {any} */ (viaPack).value;
  assert.equal(packed.index, 2);
  assert.equal(packed.pack.puzzles.length, 3, 'the whole pack, not one puzzle');
  assert.deepEqual(packed.pack.puzzles.map((/** @type {any} */ p) => p.clues), sample.puzzles.map((/** @type {any} */ p) => p.clues));
  assert.equal(isPuzzleHash(`#pack=${link}&i=2`), false);

  const data = new Map();
  const adapter = {
    get length() {
      return data.size;
    },
    key: (/** @type {number} */ i) => [...data.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => data.get(k) ?? null,
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => void data.set(k, v),
    removeItem: (/** @type {string} */ k) => void data.delete(k),
  };
  const storage = createStorage(adapter, () => 1_800_000_000_000);
  const saved = storage.saveLibraryPack(hand);
  assert.ok(saved.ok);
  const viaLib = await readIncoming({ hash: `#lib=${/** @type {any} */ (saved).packId}&i=0` }, { ...neverDecoded, storage });
  assert.ok(viaLib.ok);
  assert.equal(/** @type {any} */ (viaLib).value.pack.puzzles[0].id, 'example-1');
  const file = readPack(read('player/samples/sample-pack.json'));
  assert.ok(file.ok);
  assert.equal(/** @type {any} */ (file).value.pack.puzzles.length, 3);
  assert.equal(/** @type {any} */ (file).value.index, 0);
  const set = await readIncoming({ hash: '#lib=0123456789abcdef' }, { ...neverDecoded, storage: /** @type {any} */ ({ loadLibraryPack: () => ({ ok: true, value: { ...hand, kind: 'piece-set', puzzles: [] }, warnings: [] }) }) });
  assert.ok(!set.ok);
  assert.equal(/** @type {any} */ (set).issues[0].message, PIECE_SET_MESSAGE);
});

test('BA29: a missing worker is an honest error — nothing is encoded or decoded on the main thread, nothing is printed or copied', async () => {
  const before = catalogueStats.sizesBuilt;
  const broken = createPuzzleCodeClient();
  const snapshot = puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle: sample.puzzles[0], index: 0, rotation: 0, untitled: english });
  const encoded = await broken.encode(snapshot.data);
  assert.ok(!encoded.ok);
  assert.equal(/** @type {any} */ (encoded).issues[0].code, 'worker-unavailable');
  const decoded = await broken.decode(fixture.goldens[0].code);
  assert.ok(!decoded.ok, 'no decoding without a worker');
  assert.equal(/** @type {any} */ (decoded).issues[0].code, 'worker-unavailable');
  await assert.rejects(preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client: broken }), (error) => error instanceof PuzzleShareError && error.code === 'encode-failed', 'no share without a code');
  const opened = await readIncoming({ hash: `#p=${fixture.goldens[0].code}` }, { decodePuzzle: (text) => broken.decode(text) });
  assert.ok(!opened.ok, 'an address opens nothing without a worker');
  assert.equal(catalogueStats.sizesBuilt, before, 'no catalogue was built on the main thread');
  broken.dispose();
});

test('CLI parity: --code prints the very lines that Print and Copy link carry for the same puzzles', async () => {
  const lines = [];
  const errors = [];
  await emitGeneratedResult(sample, { code: true }, { stdout: (text) => lines.push(text), stderr: (text) => errors.push(text), writeText: () => { throw new Error('no output file was asked for'); } });
  const printed = lines.join('').split('\n').filter(Boolean);
  assert.deepEqual(errors, []);
  assert.deepEqual(printed, fixture.goldens.slice(0, 3).map((/** @type {any} */ golden) => golden.code), 'one canonical line per puzzle, in pack order, equal to the frozen codes');
  for (const [index, line] of printed.entries()) {
    const snapshot = puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle: sample.puzzles[index], index, rotation: 0, untitled: english });
    const prepared = await preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client });
    assert.equal(prepared.code.F, line, `puzzle ${index + 1}: the browser preparation and the CLI line agree`);
    assertSameView(openedView((await decodeOk(line)).pack), sourceView(sample, index), `CLI line ${index + 1}`);
  }
  // Without --code nothing changes: the pack JSON is the output.
  const plain = [];
  await emitGeneratedResult(sample, { code: false }, { stdout: (text) => plain.push(text), stderr: () => {}, writeText: () => {} });
  assert.equal(JSON.parse(plain.join('')).puzzles.length, 3);
});

test('traceability: every BA scenario is named by a test or a harness check; BA30 stays a physical, owner-run gate', () => {
  const sources = {
    node: read('tests/puzzlecode-acceptance.test.js'),
    browser: read('tests/browser/puzzle-code-acceptance.js'),
  };
  assert.deepEqual(matrix.scenarios.map((/** @type {any} */ s) => s.id), Array.from({ length: 30 }, (_, i) => `BA${String(i + 1).padStart(2, '0')}`));
  for (const scenario of matrix.scenarios) {
    assert.ok(Array.isArray(scenario.evidence) && scenario.evidence.length > 0, `${scenario.id} names its evidence`);
    for (const place of scenario.evidence) {
      if (place === 'physical') {
        assert.equal(scenario.id, 'BA30');
        assert.deepEqual(scenario.evidence, ['physical'], 'no automated claim for the physical gate');
        continue;
      }
      assert.ok(place in sources, `${scenario.id}: known place ${place}`);
      const named = new RegExp(`(?:test|check)\\((?:'|\`|")[^\\n]*\\b${scenario.id}\\b`).test(/** @type {any} */ (sources)[place]);
      assert.ok(named, `${scenario.id} is named by a ${place} test title`);
    }
  }
  assert.ok(matrix.scenarios.filter((/** @type {any} */ s) => s.evidence.includes('physical')).length === 1);
});
