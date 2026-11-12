// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { boardFromRows } from '../core/engine/board.js';
import { canonicalKey } from '../core/engine/geometry.js';
import {
  FORMAT, MAX_FILE_BYTES, MAX_ISSUES, MAX_META_BYTES, PackError, RULES, SUPPORTED_VERSIONS,
  createPack, packBoard, parsePack, serializePack, validatePack, validatePackSliced,
} from '../core/engine/pack.js';
import { colorFor } from '../core/engine/palette.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

const FIXTURE_TEXT = readFileSync(new URL('./fixtures/hand-authored-pack.json', import.meta.url), 'utf8');
const OWNERSHIP = ['AABBCCCDII', 'ABBCCCDDIJ', 'AEBBCCCIIJ', 'EEBGGGCHHJ', 'EEFFFGHHHJ', 'FFFFFGGHJJ'];

/** @returns {any} */
const fixture = () => JSON.parse(FIXTURE_TEXT);

/**
 * @param {import('../core/engine/types.js').Result<any>} r
 * @returns {any}
 */
function good(r) {
  assert.ok(r.ok, r.ok ? '' : JSON.stringify(r.issues));
  return r;
}

/**
 * @param {import('../core/engine/types.js').Result<any>} r
 * @returns {string[]}
 */
function errorCodes(r) {
  assert.equal(r.ok, false);
  return r.ok ? [] : r.issues.map((i) => i.code);
}

/**
 * @param {(f: any) => void} mutate
 * @returns {import('../core/engine/types.js').Result<any>}
 */
function corrupt(mutate) {
  const f = fixture();
  mutate(f);
  return validatePack(f);
}

/**
 * @param {import('../core/engine/types.js').Result<any>} r
 * @param {string} code
 * @param {string} path
 */
function assertIssue(r, code, path) {
  assert.equal(r.ok, false);
  const found = r.ok ? [] : r.issues;
  assert.ok(found.some((i) => i.code === code && i.path === path), `expected ${code} at ${path}, got ${JSON.stringify(found)}`);
}

/**
 * @param {string} piece
 * @param {number} x
 * @param {number} y
 * @param {number} [turn]
 * @param {boolean} [mirrored]
 */
const pose = (piece, x, y, turn = 0, mirrored = false) => ({ piece, x, y, turn, mirrored });

/** A 2x3 board with a symmetric 2x2 piece and a domino. */
function symmetricPack() {
  return {
    format: FORMAT,
    version: 1,
    kind: 'puzzle-pack',
    rules: 'free-polyomino-v1',
    board: { rows: ['##', '##', '##'] },
    pieces: [
      { id: 'O', label: 'O', color: '#e6194b', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
      { id: 'D', label: 'D', color: '#3cb44b', cells: [[0, 0], [1, 0]] },
    ],
    puzzles: [{
      id: 'sym',
      clues: [pose('O', 0, 0, 3, true)],
      solution: [pose('O', 0, 0, 1, false), pose('D', 0, 2, 2, false)],
    }],
  };
}

/**
 * @param {string[]} rows
 * @param {{ id: string, cells: number[][] }[]} pieces
 */
function pieceSet(rows, pieces) {
  return {
    format: FORMAT,
    version: 1,
    kind: 'piece-set',
    rules: 'free-polyomino-v1',
    board: { rows },
    pieces: pieces.map((p, i) => ({ id: p.id, label: p.id, color: colorFor(i), cells: p.cells })),
    puzzles: [],
  };
}

test('constants describe the supported format', () => {
  assert.equal(FORMAT, 'pentomino-pack');
  assert.deepEqual([...SUPPORTED_VERSIONS], [1]);
  assert.deepEqual([...RULES], ['free-polyomino-v1']);
  assert.equal(MAX_FILE_BYTES, 524288);
  assert.equal(MAX_META_BYTES, 4096);
});

test('hand-authored fixture validates, covers the board and has no warnings', () => {
  const r = good(parsePack(FIXTURE_TEXT));
  assert.deepEqual(r.warnings, []);
  const pack = r.value;
  assert.equal(pack.kind, 'puzzle-pack');
  assert.equal(pack.witness, null);
  assert.deepEqual(pack.generation, { app: 'hand-authored' });
  assert.deepEqual(pack.pieces.map((p) => p.label), [...'ABCDEFGHIJ']);
  assert.deepEqual(pack.pieces.map((p) => p.color), Array.from({ length: 10 }, (_, i) => colorFor(i)));
  const [puzzle] = pack.puzzles;
  assert.equal(puzzle.id, 'example-1');
  assert.equal(puzzle.title, 'Example');
  assert.deepEqual(puzzle.clues.map((c) => c.piece), ['A', 'J']);
  assert.equal(puzzle.rating, null);
  assert.equal(puzzle.certificate, null);
  assert.ok(pack.puzzles[0].solution.every((s) => s.turn === 0 && !s.mirrored));

  // Re-derive the documented ownership rows from the solution.
  const grid = Array.from({ length: 6 }, () => Array(10).fill('.'));
  for (const s of puzzle.solution) {
    const piece = pack.pieces.find((p) => p.id === s.piece);
    for (const [x, y] of piece.cells) {
      grid[s.y + y][s.x + x] = s.piece;
    }
  }
  assert.deepEqual(grid.map((row) => row.join('')), OWNERSHIP);
});

test('round trips: parse, serialize and createPack agree', () => {
  const first = good(parsePack(FIXTURE_TEXT)).value;
  const compact = serializePack(first);
  assert.ok(!/\s/.test(compact.replace(/"[^"]*"/g, '')), 'compact output has no whitespace outside strings');
  assert.ok(compact.startsWith('{"format":"pentomino-pack","version":1,"kind":"puzzle-pack","rules":"free-polyomino-v1","board":'));
  const second = good(parsePack(compact)).value;
  assert.deepEqual(second, first);
  assert.equal(serializePack(second), compact);
  assert.deepEqual(good(parsePack(serializePack(first, { pretty: true }))).value, first);
  assert.ok(serializePack(first, { pretty: true }).includes('\n  "format"'));
  assert.deepEqual(JSON.parse(compact), fixture());

  const rebuilt = createPack({
    board: packBoard(first),
    rotation: first.presentation.rotation,
    pieces: first.pieces,
    witness: first.witness,
    puzzles: first.puzzles,
    generation: first.generation,
  });
  assert.deepEqual(rebuilt, first);
});

test('validation returns fresh objects and never keeps references to the input', () => {
  const input = fixture();
  const pack = good(validatePack(input)).value;
  assert.notEqual(pack.pieces[0].cells, input.pieces[0].cells);
  assert.notEqual(pack.generation, input.generation);
  input.pieces[0].cells[0][0] = 99;
  input.generation.app = 'changed';
  assert.equal(pack.pieces[0].cells[0][0], 0);
  assert.equal(pack.generation.app, 'hand-authored');
});

test('versions 0, -1, 2 and "1" are rejected; version 1 is accepted', () => {
  for (const version of [0, -1, 2, '1', 1.5, null, true, [1], {}, 1e308]) {
    const r = corrupt((f) => { f.version = version; });
    assertIssue(r, 'unsupported-version', 'version');
  }
  assertIssue(corrupt((f) => { delete f.version; }), 'missing-field', 'version');
  assertIssue(corrupt((f) => { f.format = 'other'; }), 'bad-format', 'format');
  assertIssue(corrupt((f) => { delete f.format; }), 'missing-field', 'format');
  // A future version is reported alone: its other fields may legitimately differ.
  const future = corrupt((f) => { f.version = 2; f.futureField = 1; });
  assert.deepEqual(errorCodes(future), ['unsupported-version']);
  assert.match(future.ok ? '' : future.issues[0].message, /unsupported version/i);
  good(corrupt((f) => { f.version = 1; }));
});

test('non-object inputs and bad JSON text give structured issues', () => {
  for (const input of [null, undefined, 5, 'text', [], true, () => 1]) {
    assert.deepEqual(errorCodes(validatePack(input)), ['invalid-type']);
  }
  assert.deepEqual(errorCodes(parsePack('{nope')), ['invalid-json']);
  assert.deepEqual(errorCodes(parsePack('')), ['invalid-json']);
  assert.deepEqual(errorCodes(parsePack('[]')), ['invalid-type']);
  assert.deepEqual(errorCodes(parsePack(/** @type {any} */ (42))), ['invalid-type']);
  good(parsePack(`\ufeff${FIXTURE_TEXT}`));
});

test('hostile objects are reported, not thrown', () => {
  const trap = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('boom'); } });
  assert.deepEqual(errorCodes(validatePack(trap)), ['invalid-input']);
  const keysTrap = new Proxy({}, { ownKeys() { throw new Error('boom'); } });
  assert.equal(validatePack(keysTrap).ok, false);
  const withGetter = fixture();
  Object.defineProperty(withGetter, 'meta', { enumerable: true, get() { throw new Error('boom'); } });
  assert.deepEqual(errorCodes(validatePack(withGetter)), ['invalid-type']);
  assert.equal(validatePack(Object.create({ kind: 'piece-set' })).ok, false);
});

test('envelope fields and unknown core fields are rejected with paths', () => {
  assertIssue(corrupt((f) => { f.kind = 'set'; }), 'bad-kind', 'kind');
  assertIssue(corrupt((f) => { f.rules = 'free-polyomino-v2'; }), 'bad-rules', 'rules');
  assertIssue(corrupt((f) => { f.extra = 1; }), 'unknown-field', 'extra');
  assertIssue(corrupt((f) => { f.board.extra = 1; }), 'unknown-field', 'board.extra');
  assertIssue(corrupt((f) => { f.pieces[3].extra = 1; }), 'unknown-field', 'pieces[3].extra');
  assertIssue(corrupt((f) => { f.puzzles[0].extra = 1; }), 'unknown-field', 'puzzles[0].extra');
  assertIssue(corrupt((f) => { f.puzzles[0].clues[1].extra = 1; }), 'unknown-field', 'puzzles[0].clues[1].extra');
  assertIssue(corrupt((f) => { f.presentation.extra = 1; }), 'unknown-field', 'presentation.extra');
  assertIssue(corrupt((f) => { delete f.board; }), 'missing-field', 'board');
  assertIssue(corrupt((f) => { delete f.pieces; }), 'missing-field', 'pieces');
  assertIssue(corrupt((f) => { delete f.puzzles; }), 'missing-field', 'puzzles');
  assertIssue(corrupt((f) => { delete f.puzzles[0].clues; }), 'missing-field', 'puzzles[0].clues');
  assertIssue(corrupt((f) => { delete f.pieces[0].color; }), 'missing-field', 'pieces[0].color');
  assertIssue(corrupt((f) => { f.meta = null; }), 'invalid-type', 'meta');
  assertIssue(corrupt((f) => { f.generation = []; }), 'invalid-type', 'generation');
  assertIssue(corrupt((f) => { f.puzzles[0].title = null; }), 'invalid-type', 'puzzles[0].title');
});

test('presentation rotation defaults to 0 and accepts the eight angles', () => {
  assert.deepEqual(good(corrupt((f) => { delete f.presentation; })).value.presentation, { rotation: 0 });
  for (const rotation of [0, 45, 90, 135, 180, 225, 270, 315]) {
    assert.equal(good(corrupt((f) => { f.presentation.rotation = rotation; })).value.presentation.rotation, rotation);
  }
  for (const rotation of [30, 360, -45, 45.5, '0', null]) {
    assertIssue(corrupt((f) => { f.presentation.rotation = rotation; }), 'invalid-rotation', 'presentation.rotation');
  }
  assertIssue(corrupt((f) => { f.presentation = {}; }), 'missing-field', 'presentation.rotation');
});

test('board shape and size limits', () => {
  const full = (/** @type {number} */ w, /** @type {number} */ h) => ({ rows: Array.from({ length: h }, () => '#'.repeat(w)) });
  assertIssue(corrupt((f) => { f.board.rows[2] = '#########'; }), 'board-ragged', 'board.rows[2]');
  assertIssue(corrupt((f) => { f.board.rows[0] = '#x########'; }), 'board-invalid-char', 'board.rows[0]');
  assertIssue(corrupt((f) => { f.board.rows[0] = 7; }), 'invalid-type', 'board.rows[0]');
  assertIssue(corrupt((f) => { f.board.rows = 'abc'; }), 'invalid-type', 'board.rows');
  assertIssue(corrupt((f) => { f.board.rows = []; }), 'board-size', 'board.rows');
  assertIssue(corrupt((f) => { f.board = full(1, 65); }), 'board-size', 'board.rows');
  assertIssue(corrupt((f) => { f.board = full(65, 1); }), 'board-size', 'board.rows[0]');
  assertIssue(corrupt((f) => { f.board = { rows: [''] }; }), 'board-size', 'board.rows[0]');
  assertIssue(corrupt((f) => { f.board = full(33, 33); }), 'board-area', 'board.rows');
  assertIssue(corrupt((f) => { f.board = { rows: ['....'] }; }), 'board-area', 'board.rows');
  assertIssue(corrupt((f) => { f.board.rows[0] = '#'.repeat(1e6); }), 'board-size', 'board.rows[0]');
  // 64 x 16 = 1024 active cells is the largest accepted board (see the largest-board test).
});

test('piece syntax, geometry and area rules', () => {
  assertIssue(corrupt((f) => { f.pieces[0].id = ''; }), 'invalid-id', 'pieces[0].id');
  assertIssue(corrupt((f) => { f.pieces[0].id = 'abcdefghi'; }), 'invalid-id', 'pieces[0].id');
  assertIssue(corrupt((f) => { f.pieces[0].id = 'a b'; }), 'invalid-id', 'pieces[0].id');
  assertIssue(corrupt((f) => { f.pieces[0].id = 7; }), 'invalid-type', 'pieces[0].id');
  assertIssue(corrupt((f) => { f.pieces[1].id = 'A'; }), 'duplicate-id', 'pieces[1].id');
  assertIssue(corrupt((f) => { f.pieces[0].label = 'ABCDE'; }), 'invalid-length', 'pieces[0].label');
  assertIssue(corrupt((f) => { f.pieces[0].color = 'red'; }), 'invalid-color', 'pieces[0].color');
  assertIssue(corrupt((f) => { f.pieces[0].color = '#12345'; }), 'invalid-color', 'pieces[0].color');
  assertIssue(corrupt((f) => { f.pieces[0].color = '#12345g'; }), 'invalid-color', 'pieces[0].color');
  assertIssue(corrupt((f) => { f.pieces[0].cells = [[1, 0], [2, 0], [1, 1], [1, 2]]; }), 'piece-not-normalized', 'pieces[0].cells');
  assertIssue(corrupt((f) => { f.pieces[0].cells = [[0, 0], [0, 1], [1, 0], [0, 2]]; }), 'piece-not-normalized', 'pieces[0].cells');
  assertIssue(corrupt((f) => { f.pieces[0].cells = [[0, 0], [1, 0], [0, 1], [0, 1]]; }), 'piece-duplicate-cell', 'pieces[0].cells[3]');
  assertIssue(corrupt((f) => { f.pieces[0].cells = [[0, 0], [1, 0], [0, 2], [1, 2]]; }), 'piece-disconnected', 'pieces[0].cells');
  assertIssue(corrupt((f) => { f.pieces[0].cells = [[0, 0], [0.5, 0], [0, 1], [0, 2]]; }), 'invalid-type', 'pieces[0].cells[1]');
  assertIssue(corrupt((f) => { f.pieces[0].cells = [[0, 0, 0], [1, 0], [0, 1], [0, 2]]; }), 'invalid-type', 'pieces[0].cells[0]');
  assertIssue(corrupt((f) => { f.pieces[0].cells = []; }), 'piece-size', 'pieces[0].cells');
  assertIssue(corrupt((f) => { f.pieces[0].cells = Array.from({ length: 129 }, (_, x) => [x, 0]); }), 'piece-size', 'pieces[0].cells');
  assertIssue(corrupt((f) => { f.pieces = []; }), 'piece-count', 'pieces');
  assertIssue(corrupt((f) => { f.pieces = Array.from({ length: 129 }, () => f.pieces[0]); }), 'piece-count', 'pieces');
  assertIssue(corrupt((f) => { f.pieces.pop(); }), 'area-mismatch', 'pieces');
  assertIssue(corrupt((f) => { f.pieces[3].cells.push([1, 2]); }), 'area-mismatch', 'pieces');
});

test('pose fields and footprints are checked', () => {
  const bad = (/** @type {(c: any) => void} */ edit, /** @type {string} */ code, /** @type {string} */ field) => {
    assertIssue(corrupt((f) => edit(f.puzzles[0].clues[0])), code, `puzzles[0].clues[0]${field}`);
  };
  bad((c) => { c.piece = 'Z'; }, 'pose-unknown-piece', '.piece');
  bad((c) => { c.piece = 5; }, 'pose-unknown-piece', '.piece');
  bad((c) => { c.x = 1.5; }, 'invalid-type', '.x');
  bad((c) => { c.y = '0'; }, 'invalid-type', '.y');
  bad((c) => { c.x = 1e300; }, 'invalid-type', '.x');
  bad((c) => { c.turn = 4; }, 'invalid-turn', '.turn');
  bad((c) => { c.turn = -1; }, 'invalid-turn', '.turn');
  bad((c) => { c.turn = '0'; }, 'invalid-turn', '.turn');
  bad((c) => { c.mirrored = 0; }, 'invalid-type', '.mirrored');
  bad((c) => { delete c.mirrored; }, 'missing-field', '.mirrored');
  assertIssue(corrupt((f) => { f.puzzles[0].clues[0].x = 9; }), 'pose-out-of-bounds', 'puzzles[0].clues[0]');
  assertIssue(corrupt((f) => { f.puzzles[0].clues[0].y = -1; }), 'pose-out-of-bounds', 'puzzles[0].clues[0]');
  assertIssue(corrupt((f) => { f.puzzles[0].clues = 'x'; }), 'invalid-type', 'puzzles[0].clues');

  const blocked = pieceSet(['##.'], [{ id: 'D', cells: [[0, 0], [1, 0]] }]);
  blocked.kind = 'piece-set';
  /** @type {any} */ (blocked).witness = [pose('D', 1, 0)];
  assertIssue(validatePack(blocked), 'pose-blocked', 'witness[0]');
  /** @type {any} */ (blocked).witness = [pose('D', 0, 0)];
  good(validatePack(blocked));
});

test('clues: zero is fine, K-1 is the limit, no repeats or overlaps', () => {
  const solution = fixture().puzzles[0].solution;
  assert.deepEqual(good(corrupt((f) => { f.puzzles[0].clues = []; })).value.puzzles[0].clues, []);
  good(corrupt((f) => { f.puzzles[0].clues = solution.slice(0, 9); }));
  assertIssue(corrupt((f) => { f.puzzles[0].clues = solution; }), 'too-many-clues', 'puzzles[0].clues');
  assertIssue(corrupt((f) => { f.puzzles[0].clues = [solution[0], solution[0]]; }), 'pose-duplicate-piece', 'puzzles[0].clues[1]');
  assertIssue(corrupt((f) => { f.puzzles[0].clues = [solution[0], pose('E', 0, 0)]; }), 'pose-overlap', 'puzzles[0].clues[1]');
});

test('solutions and witnesses must be exact covers containing every clue', () => {
  const solution = () => fixture().puzzles[0].solution;
  assertIssue(corrupt((f) => { f.puzzles[0].solution = solution().slice(1); }), 'layout-invalid', 'puzzles[0].solution');
  assertIssue(corrupt((f) => { f.puzzles[0].solution = [...solution(), pose('A', 0, 0)]; }), 'layout-invalid', 'puzzles[0].solution');
  assertIssue(corrupt((f) => { f.puzzles[0].solution = []; }), 'layout-invalid', 'puzzles[0].solution');
  assertIssue(corrupt((f) => {
    const s = solution();
    [s[1].x, s[2].x] = [s[2].x, s[1].x];
    f.puzzles[0].solution = s;
  }), 'pose-overlap', 'puzzles[0].solution[2]');
  assertIssue(corrupt((f) => {
    const s = solution();
    s[3].piece = 'C';
    f.puzzles[0].solution = s;
  }), 'pose-duplicate-piece', 'puzzles[0].solution[3]');
  assertIssue(corrupt((f) => { f.puzzles[0].solution[0].x = 9; }), 'pose-out-of-bounds', 'puzzles[0].solution[0]');
  // A valid exact cover that moves a clue piece.
  assertIssue(corrupt((f) => { f.puzzles[0].clues[0] = pose('A', 0, 0, 0, true); }), 'solution-clue-mismatch', 'puzzles[0].solution');
  assertIssue(corrupt((f) => { f.witness = solution().slice(2); }), 'layout-invalid', 'witness');

  const set = corrupt((f) => { f.kind = 'piece-set'; f.puzzles = []; f.witness = solution(); });
  assert.equal(good(set).value.witness.length, 10);
  assert.equal(good(set).value.kind, 'piece-set');
});

test('symmetric clue encodings match by occupied cells and are written canonically', () => {
  const r = good(validatePack(symmetricPack()));
  assert.deepEqual(r.value.puzzles[0].clues, [pose('O', 0, 0, 3, true)]);
  const written = JSON.parse(serializePack(r.value));
  assert.deepEqual(written.puzzles[0].clues, [pose('O', 0, 0)]);
  assert.deepEqual(written.puzzles[0].solution, [pose('O', 0, 0), pose('D', 0, 2)]);
  assert.deepEqual(good(validatePack(written)).value.puzzles[0].solution, written.puzzles[0].solution);

  const moved = symmetricPack();
  moved.puzzles[0].solution = [pose('D', 0, 0), pose('O', 0, 1)];
  assertIssue(validatePack(moved), 'solution-clue-mismatch', 'puzzles[0].solution');
});

test('kind, puzzle counts, ids and titles', () => {
  assertIssue(corrupt((f) => { f.kind = 'piece-set'; }), 'kind-mismatch', 'puzzles');
  assertIssue(corrupt((f) => { f.puzzles = []; }), 'puzzle-count', 'puzzles');
  assertIssue(corrupt((f) => { f.puzzles = 'x'; }), 'invalid-type', 'puzzles');
  assertIssue(corrupt((f) => { f.puzzles.push(f.puzzles[0]); }), 'duplicate-id', 'puzzles[1].id');
  assertIssue(corrupt((f) => { f.puzzles[0].id = 'has space'; }), 'invalid-id', 'puzzles[0].id');
  assertIssue(corrupt((f) => { f.puzzles[0].id = 'x'.repeat(65); }), 'invalid-id', 'puzzles[0].id');
  assertIssue(corrupt((f) => { f.puzzles[0].id = 4; }), 'invalid-type', 'puzzles[0].id');
  good(corrupt((f) => { f.puzzles[0].id = 'x'.repeat(64); }));
  const many = (/** @type {number} */ n) => (/** @type {any} */ f) => {
    f.puzzles = Array.from({ length: n }, (_, i) => ({ ...f.puzzles[0], id: `p${i}` }));
  };
  assert.equal(good(corrupt(many(100))).value.puzzles.length, 100);
  assertIssue(corrupt(many(101)), 'puzzle-count', 'puzzles');
  good(corrupt((f) => { delete f.puzzles[0].title; }));
  assert.ok(!('title' in good(corrupt((f) => { delete f.puzzles[0].title; })).value.puzzles[0]));
});

test('labels and titles count Unicode code points', () => {
  const smile = '\u{1F600}';
  assert.equal(good(corrupt((f) => { f.pieces[0].label = smile.repeat(4); })).value.pieces[0].label, smile.repeat(4));
  assertIssue(corrupt((f) => { f.pieces[0].label = smile.repeat(5); }), 'invalid-length', 'pieces[0].label');
  good(corrupt((f) => { f.pieces[0].label = ''; }));
  good(corrupt((f) => { f.puzzles[0].title = smile.repeat(80); }));
  assertIssue(corrupt((f) => { f.puzzles[0].title = smile.repeat(81); }), 'invalid-length', 'puzzles[0].title');
  assertIssue(corrupt((f) => { f.puzzles[0].title = 'x'.repeat(1e6); }), 'invalid-length', 'puzzles[0].title');
  good(corrupt((f) => { f.puzzles[0].title = 'x'.repeat(80); }));
});

test('file size is measured in UTF-8 bytes before parsing', () => {
  assert.deepEqual(errorCodes(parsePack(' '.repeat(MAX_FILE_BYTES + 1))), ['pack-too-large']);
  assert.deepEqual(errorCodes(parsePack(' '.repeat(MAX_FILE_BYTES))), ['invalid-json']);
  const euros = '\u20ac'.repeat(Math.floor(MAX_FILE_BYTES / 3) + 1);
  assert.ok(euros.length < MAX_FILE_BYTES);
  assert.deepEqual(errorCodes(parsePack(euros)), ['pack-too-large']);
  assert.deepEqual(errorCodes(parsePack('\u20ac'.repeat(Math.floor(MAX_FILE_BYTES / 3)))), ['invalid-json']);
});

test('meta is limited to 4096 serialized UTF-8 bytes and generation is preserved', () => {
  const withMeta = (/** @type {unknown} */ meta) => corrupt((f) => { f.meta = meta; });
  // {"k":"..."} costs 8 bytes plus its payload.
  const exact = good(withMeta({ k: 'x'.repeat(MAX_META_BYTES - 8) })).value;
  assert.equal(new TextEncoder().encode(JSON.stringify(exact.meta)).length, MAX_META_BYTES);
  assertIssue(withMeta({ k: 'x'.repeat(MAX_META_BYTES - 7) }), 'meta-too-large', 'meta');
  good(withMeta({ k: '\u00e9'.repeat((MAX_META_BYTES - 8) / 2) }));
  assertIssue(withMeta({ k: '\u00e9'.repeat((MAX_META_BYTES - 8) / 2 + 1) }), 'meta-too-large', 'meta');
  assertIssue(withMeta({ k: 'x', n: Number.NaN }), 'json-invalid', 'meta');
  assertIssue(withMeta({ k: undefined }), 'json-invalid', 'meta');
  assertIssue(withMeta({ k: new Date(0) }), 'json-invalid', 'meta');

  const provenance = {
    app: 'pentomino-generator/1.0.0', algo: 'gen-v2', policy: 'mixed-v2', rng: 'xoshiro128ss-v1',
    seedScheme: 'seed-sha256-v1', setSeed: 'K7Q2-9MXA-3FWD', setLevel: 'hard', setAttempt: 2,
    carving: 'macro', macroRegion: [0, 0, 1, 1, 1, 2, 2, 3, 3, 3], batchSeed: 'K7Q2-9MXA-3FWD#1',
    batchLevel: 'hard', batchIndex: 1, uniqueness: 'any', createdAt: '2026-10-22T03:00:00.000Z',
  };
  const pack = good(corrupt((f) => { f.generation = provenance; f.meta = { note: { nested: [1, 'two', null, true] } }; })).value;
  assert.deepEqual(pack.generation, provenance);
  assert.deepEqual(good(parsePack(serializePack(pack))).value.meta, { note: { nested: [1, 'two', null, true] } });
});

test('deep, cyclic and huge metadata fail with structured errors', () => {
  let deep = /** @type {unknown[]} */ ([]);
  for (let i = 0; i < 100000; i += 1) {
    deep = [deep];
  }
  assertIssue(corrupt((f) => { f.meta = { deep }; }), 'json-too-deep', 'meta');
  assertIssue(corrupt((f) => { f.generation = { deep }; }), 'json-too-deep', 'generation');

  const cycle = /** @type {any} */ ({});
  cycle.self = cycle;
  assertIssue(corrupt((f) => { f.meta = cycle; }), 'json-too-deep', 'meta');

  const n = 50000;
  const text = `${JSON.stringify({ ...fixture(), generation: undefined }).slice(0, -1)},"meta":{"d":${'['.repeat(n)}${']'.repeat(n)}}}`;
  const parsed = parsePack(text);
  assert.equal(parsed.ok, false);
  assert.ok(['json-too-deep', 'invalid-json'].includes(errorCodes(parsed)[0]));

  assertIssue(corrupt((f) => { f.meta = { list: new Array(200000).fill(1) }; }), 'json-too-large', 'meta');
  const sparse = [];
  sparse[3_000_000_000] = 1;
  assertIssue(corrupt((f) => { f.meta = { sparse }; }), 'json-too-large', 'meta');
  const holey = [1, , 3]; // eslint-disable-line no-sparse-arrays
  assertIssue(corrupt((f) => { f.meta = { holey }; }), 'json-invalid', 'meta');
});

test('malicious property names never pollute prototypes', () => {
  const text = FIXTURE_TEXT.trim();
  const polluted = (/** @type {string} */ body) => `${text.slice(0, -1)},${body}}`;
  const attempts = [
    polluted('"__proto__": {"polluted": true}'),
    polluted('"constructor": {"prototype": {"polluted": true}}'),
    text.replace('"title"', '"__proto__": {"polluted": true}, "title"'),
    text.replace('"label": "A"', '"label": "A", "__proto__": {"polluted": true}'),
    text.replace('"mirrored": false }', '"mirrored": false, "__proto__": {"polluted": true} }'),
  ];
  for (const attempt of attempts) {
    const r = parsePack(attempt);
    assert.equal(r.ok, false);
    assert.ok(errorCodes(r).includes('unknown-field') || errorCodes(r).includes('invalid-json'));
  }
  const r = good(parsePack(polluted('"meta": {"__proto__": {"polluted": true}, "constructor": 1, "prototype": 2, "toString": 3}')));
  const meta = r.value.meta;
  assert.equal(Object.getPrototypeOf(meta), Object.prototype);
  assert.deepEqual(Object.keys(meta).sort(), ['__proto__', 'constructor', 'prototype', 'toString']);
  assert.equal(/** @type {any} */ (meta).polluted, undefined);
  assert.equal(Object.hasOwn(meta, 'polluted'), false);
  assert.ok(serializePack(r.value).includes('"__proto__":{"polluted":true}'));
  assert.equal(/** @type {any} */ ({}).polluted, undefined);
  assert.equal(/** @type {any} */ (Object.prototype).polluted, undefined);

  const hostile = fixture();
  Object.defineProperty(hostile, '__proto__', { value: { polluted: true }, enumerable: true, configurable: true, writable: true });
  assertIssue(validatePack(hostile), 'unknown-field', '__proto__');
  assert.equal(/** @type {any} */ ({}).polluted, undefined);
});

test('many problems are capped', () => {
  const r = corrupt((f) => {
    f.pieces = Array.from({ length: 128 }, (_, i) => ({ ...f.pieces[0], id: `P${i}`, extra: 1 }));
  });
  assert.equal(r.ok, false);
  const issues = r.ok ? [] : r.issues;
  assert.equal(issues.length, MAX_ISSUES + 1);
  assert.equal(issues[MAX_ISSUES].code, 'too-many-issues');
});

test('difficulty-v2 ratings are legacy claims: basic fields checked, metrics kept as opaque bounded JSON', () => {
  const v2 = () => ({
    model: 'difficulty-v2', score: 13, level: 'normal', saturated: false,
    metrics: { U: 4, B: 3, branchTrials: 3, rowTrials: 40, stop: 'solution', R: 20, H: 2.5 },
  });
  const rate = (/** @type {(r: any) => void} */ edit) => corrupt((f) => {
    const r = v2();
    edit(r);
    f.puzzles[0].rating = r;
  });
  const accepted = good(rate(() => {}));
  assert.deepEqual(accepted.value.puzzles[0].rating, v2());
  assert.deepEqual(accepted.warnings, []);
  // What the strict v2 reader refused is now read as it is stored, without a warning.
  const kept = /** @type {((r: any) => void)[]} */ ([
    (r) => { r.censored = true; },
    (r) => { delete r.saturated; },
    (r) => { delete r.metrics; },
    (r) => { r.metrics.extra = 1; },
    (r) => { delete r.metrics.H; },
    (r) => { r.metrics.stop = 'timeout'; },
    (r) => { r.metrics.U = 1.5; },
    (r) => { r.metrics.B = -1; },
    (r) => { r.metrics = { oldCounter: 7, nested: { note: 'keep' } }; },
  ]);
  for (const edit of kept) {
    const expected = v2();
    edit(expected);
    const r = good(rate(edit));
    assert.deepEqual(r.value.puzzles[0].rating, expected);
    assert.deepEqual(r.warnings, []);
  }
  assertIssue(rate((r) => { r.metrics.H = Number.POSITIVE_INFINITY; }), 'rating-invalid', 'puzzles[0].rating.metrics');
  assertIssue(rate((r) => { r.score = -1; }), 'rating-invalid', 'puzzles[0].rating.score');
  assertIssue(rate((r) => { r.score = Number.NaN; }), 'rating-invalid', 'puzzles[0].rating.score');
  assertIssue(rate((r) => { r.score = '13'; }), 'rating-invalid', 'puzzles[0].rating.score');
  assertIssue(rate((r) => { r.saturated = 'no'; }), 'rating-invalid', 'puzzles[0].rating.saturated');
  assertIssue(rate((r) => { r.level = ''; }), 'invalid-length', 'puzzles[0].rating.level');
  assertIssue(rate((r) => { r.level = 'x'.repeat(65); }), 'invalid-length', 'puzzles[0].rating.level');
  assertIssue(rate((r) => { r.metrics = 5; }), 'rating-invalid', 'puzzles[0].rating.metrics');
  assertIssue(rate((r) => { r.verified = true; }), 'unknown-field', 'puzzles[0].rating.verified');
  assertIssue(corrupt((f) => { f.puzzles[0].rating = 'hard'; }), 'invalid-type', 'puzzles[0].rating');
});

/**
 * The claim as `createPack` stores it and as `serializePack` writes it.
 * @param {any} rating
 */
function claimPaths(rating) {
  const base = good(parsePack(FIXTURE_TEXT)).value;
  const puzzle = { ...base.puzzles[0], rating };
  const made = createPack({ board: packBoard(base), rotation: 0, pieces: base.pieces, puzzles: [puzzle] }).puzzles[0].rating;
  const text = serializePack({ ...base, puzzles: [puzzle] });
  return { made, text, written: JSON.parse(text).puzzles[0].rating };
}

test('a legacy v2 claim is written back with every field it was read with (FP04)', () => {
  const seven = { U: 4, B: 3, branchTrials: 3, rowTrials: 40, stop: 'solution', R: 20, H: 2.5 };
  const claim = (/** @type {unknown} */ metrics) => ({ model: 'difficulty-v2', score: 13, level: 'normal', saturated: false, metrics });
  const read = (/** @type {unknown} */ rating) => good(corrupt((f) => { f.puzzles[0].rating = rating; })).value.puzzles[0].rating;
  const odd = {
    'an extra key': { ...seven, oldCounter: 7 },
    'an extra key between the seven': { U: 4, B: 3, oldCounter: 7, branchTrials: 3, rowTrials: 40, stop: 'solution', R: 20, H: 2.5 },
    'missing keys': { U: 5, B: 3 },
    'nested opaque values': { oldCounter: 7, nested: { note: 'keep' } },
  };
  for (const [name, metrics] of Object.entries(odd)) {
    const paths = claimPaths(claim(metrics));
    const again = good(parsePack(paths.text)).value.puzzles[0].rating;
    for (const stored of [read(claim(metrics)).metrics, paths.made.metrics, paths.written.metrics, again.metrics]) {
      assert.equal(JSON.stringify(stored), JSON.stringify(metrics), name);
    }
    assert.notEqual(paths.made.metrics, metrics, `${name}: detached from the input`);
  }

  // Exactly the seven keys, in any order, are written in the fixed order.
  const shuffled = { H: 2.5, R: 20, stop: 'solution', rowTrials: 40, branchTrials: 3, B: 3, U: 4 };
  const paths = claimPaths(claim(shuffled));
  assert.equal(JSON.stringify(read(claim(shuffled)).metrics), JSON.stringify(shuffled), 'the reader keeps the stored order');
  assert.equal(JSON.stringify(paths.made.metrics), JSON.stringify(seven));
  assert.equal(JSON.stringify(paths.written), JSON.stringify(claim(seven)));
  assert.equal(JSON.stringify(good(parsePack(paths.text)).value.puzzles[0].rating), JSON.stringify(claim(seven)));

  // A value that is not a plain object is copied, not invented over; the reader judges it afterwards.
  const listed = claimPaths(claim([1, 2]));
  assert.deepEqual(listed.made.metrics, [1, 2]);
  assert.deepEqual(listed.written.metrics, [1, 2]);
  assert.equal(parsePack(listed.text).ok, false);
});

test('the generated sample pack re-serialises byte for byte', () => {
  const text = readFileSync(new URL('./fixtures/generated-sample-pack.json', import.meta.url), 'utf8');
  const pack = good(parsePack(text));
  assert.deepEqual(pack.warnings, []);
  assert.equal(pack.value.puzzles[0].rating.model, 'difficulty-v3');
  assert.equal(serializePack(pack.value, { pretty: true }), text.replace(/\r\n/g, '\n').replace(/\n$/, ''));
});

const V3_METRICS = {
  U: 7, R: 35, H: 3.5, B: 12, branchTrials: 12, rowTrials: 40, dlxStop: 'solution', searchStop: 'exhausted',
  F: 4, E: 0, rules: { R1: 3, R2: 1, R3: 0, R4: 2, R5: 0, R6: 0, R7: 0, R8: 58, R9: 0 }, deductionTier: 3, tier: 4,
  G: 2, info: 3.321928094887362, Cmax: 5, Dmax: 2, Gt: 2, nodes: 8, work: 123456, S: 1, solutionLimit: 8,
  solutions: 'unique', censusComplete: true, censusUndecided: 0, censusNodes: 0, censusWork: 0, Gproved: 2,
};
const V3_CLAIM = { model: 'difficulty-v3', score: 30, level: 'expert', saturated: false, metrics: V3_METRICS };
// An estimate: the census did not finish.
const V3_ESTIMATE = {
  model: 'difficulty-v3', score: 30, level: 'expert', saturated: false, censored: true,
  metrics: {
    ...V3_METRICS, S: 8, searchStop: 'solution-limit', solutions: 'many', censusComplete: false,
    censusUndecided: 3, nodes: 18, censusNodes: 10, censusWork: 5000, Gproved: 1,
  },
};
const NO_RULES = { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, R9: 0 };
const at = (/** @type {string} */ suffix = '') => `puzzles[0].rating${suffix}`;
const withRating = (/** @type {unknown} */ rating) => corrupt((f) => { f.puzzles[0].rating = rating; });
const clone = (/** @type {unknown} */ value) => JSON.parse(JSON.stringify(value));
const reversed = (/** @type {object} */ o) => Object.fromEntries(Object.entries(o).reverse());
const without = (/** @type {Record<string, unknown>} */ o, /** @type {string} */ key) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== key));

/**
 * A valid v3 claim with some metrics replaced; `censored` follows the census.
 * @param {Record<string, unknown>} [patch]
 * @param {Record<string, number>} [rules]
 * @returns {any}
 */
function v3With(patch = {}, rules = {}) {
  const metrics = { ...V3_METRICS, ...patch, rules: { ...V3_METRICS.rules, ...rules } };
  return { model: 'difficulty-v3', score: 30, level: 'expert', saturated: false, ...(metrics.censusComplete ? {} : { censored: true }), metrics };
}

/**
 * @param {import('../core/engine/types.js').Result<any>} r
 * @param {string} path
 */
function assertOnlyIssue(r, path) {
  assert.equal(r.ok, false);
  assert.deepEqual(r.ok ? [] : r.issues.map((i) => [i.code, i.path]), [['rating-invalid', path]]);
}

test('a difficulty-v3 claim is written in the MetricsV3 order and rewrites byte for byte', () => {
  const base = good(parsePack(FIXTURE_TEXT)).value;
  const keys = Object.keys(V3_METRICS);
  assert.equal(keys.length, 28);
  for (const claim of [V3_CLAIM, V3_ESTIMATE]) {
    const scrambled = { ...claim, metrics: { ...reversed(claim.metrics), rules: reversed(claim.metrics.rules) } };
    const pack = createPack({ board: packBoard(base), rotation: 0, pieces: base.pieces, puzzles: [{ ...base.puzzles[0], rating: scrambled }] });
    assert.equal(JSON.stringify(pack.puzzles[0].rating), JSON.stringify(claim));
    const text = serializePack(pack);
    assert.equal(JSON.stringify(JSON.parse(text).puzzles[0].rating), JSON.stringify(claim));
    const read = good(parsePack(text));
    assert.deepEqual(read.warnings, []);
    const rating = read.value.puzzles[0].rating;
    assert.deepEqual(rating, claim);
    assert.deepEqual(Object.keys(rating.metrics), keys);
    assert.deepEqual(Object.keys(rating.metrics.rules), Object.keys(V3_METRICS.rules));
    assert.equal(serializePack(read.value), text);
    assert.equal(serializePack(good(parsePack(serializePack(read.value, { pretty: true }))).value), text);
    // The reader detaches the claim from its input.
    const input = clone(claim);
    const detached = good(withRating(input)).value.puzzles[0].rating;
    assert.notEqual(detached.metrics, input.metrics);
    assert.notEqual(detached.metrics.rules, input.metrics.rules);
  }
  const estimate = good(withRating(V3_ESTIMATE)).value.puzzles[0].rating;
  assert.equal(estimate.censored, true);
  assert.equal(estimate.metrics.censusComplete, false);
  // A claim is not re-rated: the score and the level are not checked against the metrics.
  good(withRating({ ...V3_CLAIM, score: 999, level: 'nonsense' }));
});

test('a difficulty-v3 summary claim has no metrics and may carry censored alone', () => {
  const summary = { model: 'difficulty-v3', score: 30, level: 'expert', saturated: false };
  for (const claim of [summary, { ...summary, censored: true }, { ...summary, censored: false }]) {
    const r = good(withRating(claim));
    assert.deepEqual(r.value.puzzles[0].rating, claim);
    assert.deepEqual(r.warnings, []);
    assert.ok(!('metrics' in r.value.puzzles[0].rating));
    const paths = claimPaths(claim);
    assert.ok(!('metrics' in paths.made), 'never zeros');
    assert.deepEqual(paths.written, claim.censored === true ? claim : summary);
    assert.deepEqual(Object.keys(paths.written), Object.keys(claim.censored === true ? claim : summary));
  }
  assertIssue(withRating({ model: 'difficulty-v3', score: 30, level: 'expert' }), 'missing-field', at('.saturated'));
  assertIssue(withRating({ ...summary, censored: 'yes' }), 'rating-invalid', at('.censored'));
  assertIssue(withRating({ ...summary, verified: true }), 'unknown-field', at('.verified'));
  assertIssue(withRating({ ...summary, score: -1 }), 'rating-invalid', at('.score'));
  assertIssue(withRating({ ...summary, metrics: null }), 'invalid-type', at('.metrics'));
});

test('a difficulty-v3 claim is never saturated and its censored mark follows the census', () => {
  assertIssue(withRating({ ...V3_CLAIM, saturated: true }), 'rating-invalid', at('.saturated'));
  assertIssue(withRating({ ...V3_CLAIM, saturated: 'no' }), 'rating-invalid', at('.saturated'));
  assertIssue(withRating({ model: 'difficulty-v3', score: 30, level: 'expert', saturated: true }), 'rating-invalid', at('.saturated'));
  const unsaturated = without(V3_CLAIM, 'saturated');
  assertIssue(withRating(unsaturated), 'missing-field', at('.saturated'));
  assertIssue(withRating({ ...V3_CLAIM, verified: true }), 'unknown-field', at('.verified'));

  assertOnlyIssue(withRating({ ...V3_CLAIM, censored: true }), at('.censored'));
  assertOnlyIssue(withRating(without(V3_ESTIMATE, 'censored')), at('.censored'));
  assertOnlyIssue(withRating({ ...V3_ESTIMATE, censored: false }), at('.censored'));
  assertIssue(withRating({ ...V3_ESTIMATE, censored: 1 }), 'rating-invalid', at('.censored'));
  good(withRating(V3_ESTIMATE));

  // `censored: false` is read and is never written back.
  const falseMark = { model: 'difficulty-v3', score: 30, level: 'expert', saturated: false, censored: false, metrics: V3_METRICS };
  const read = good(withRating(falseMark)).value.puzzles[0].rating;
  const paths = claimPaths(falseMark);
  assert.equal(read.censored, false);
  assert.ok(!('censored' in paths.made));
  assert.ok(!('censored' in paths.written));
  assert.equal(JSON.stringify(paths.written), JSON.stringify(V3_CLAIM));
  // A mark another model carries is kept as before.
  assert.equal(claimPaths({ model: 'difficulty-v1', score: 3, level: 'x', censored: false }).written.censored, false);
});

test('difficulty-v3 metrics: every field is checked on its own', () => {
  const rate = (/** @type {(m: any) => void} */ edit) => {
    const claim = v3With();
    edit(claim.metrics);
    return withRating(claim);
  };
  const keys = Object.keys(V3_METRICS);
  good(rate(() => {}));
  for (const key of keys) {
    assertIssue(rate((m) => { delete m[key]; }), 'missing-field', at(`.metrics.${key}`));
  }
  assertIssue(rate((m) => { m.extra = 1; }), 'unknown-field', at('.metrics.extra'));
  assertIssue(rate((m) => { m.dlxStop2 = 1; }), 'unknown-field', at('.metrics.dlxStop2'));
  assertIssue(rate((m) => { m.stop = 'solution'; }), 'unknown-field', at('.metrics.stop'));
  for (const bad of [5, null, [], 'text']) {
    assertIssue(withRating({ ...V3_CLAIM, metrics: bad }), 'invalid-type', at('.metrics'));
  }

  const counts = ['U', 'R', 'B', 'branchTrials', 'rowTrials', 'F', 'E', 'G', 'Cmax', 'Dmax', 'Gt', 'nodes', 'work', 'S',
    'solutionLimit', 'censusUndecided', 'censusNodes', 'censusWork', 'Gproved'];
  for (const key of counts) {
    for (const bad of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '3', null, Number.NaN]) {
      assertOnlyIssue(rate((m) => { m[key] = bad; }), at(`.metrics.${key}`));
    }
  }
  for (const key of Object.keys(V3_METRICS.rules)) {
    for (const bad of [-1, 0.5, '1', null]) {
      assertOnlyIssue(rate((m) => { m.rules[key] = bad; }), at(`.metrics.rules.${key}`));
    }
  }
  for (const key of ['H', 'info']) {
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, '1']) {
      assertOnlyIssue(rate((m) => { m[key] = bad; }), at(`.metrics.${key}`));
    }
  }
  good(rate((m) => { m.H = 0; m.G = 0; m.info = 0; m.Cmax = 0; m.Dmax = 0; m.tier = 3; m.Gproved = 0; }));

  const enums = /** @type {[string, unknown[]][]} */ ([
    ['dlxStop', ['timeout', 'exhausted', 1, null]],
    ['searchStop', ['timeout', 'solution', 1, null]],
    ['solutions', ['several', 'one', 1, null]],
    ['deductionTier', [-1, 4, 1.5, '3', null]],
    ['tier', [-1, 5, 2.5, '4', null]],
    ['censusComplete', ['true', 1, 0, null]],
  ]);
  for (const [key, invalid] of enums) {
    for (const bad of invalid) {
      assertOnlyIssue(rate((m) => { m[key] = bad; }), at(`.metrics.${key}`));
    }
  }
  for (const stop of ['solution', 'branch-cap', 'row-cap']) {
    good(rate((m) => { m.dlxStop = stop; }));
  }

  // `rules` has exactly the keys R1 to R9.
  assertIssue(rate((m) => { m.rules.R10 = 0; }), 'unknown-field', at('.metrics.rules.R10'));
  assertIssue(rate((m) => { m.rules.R0 = 0; }), 'unknown-field', at('.metrics.rules.R0'));
  assertIssue(rate((m) => { delete m.rules.R9; }), 'missing-field', at('.metrics.rules.R9'));
  assertIssue(rate((m) => { delete m.rules.R1; }), 'missing-field', at('.metrics.rules.R1'));
  for (const bad of [5, [], null, 'R1']) {
    assertIssue(rate((m) => { m.rules = bad; }), 'invalid-type', at('.metrics.rules'));
  }
});

test('difficulty-v3 metrics: every rule that ties fields together has a valid and an invalid case', () => {
  const accepts = (/** @type {Record<string, unknown>} */ patch, /** @type {Record<string, number>} */ rules) => good(withRating(v3With(patch, rules)));
  const refuses = (/** @type {string} */ path, /** @type {Record<string, unknown>} */ patch, /** @type {Record<string, number>} */ rules) => {
    assertOnlyIssue(withRating(v3With(patch, rules)), at(`.metrics.${path}`));
  };
  const only = (/** @type {string} */ key, /** @type {number} */ n) => ({ ...NO_RULES, [key]: n });
  const exact = { ...NO_RULES, R1: 1, R2: 1, R3: 1, R4: 1, R5: 1, R6: 1, R7: 1, R8: 1, R9: 1 };
  accepts({}, {});

  // Limit and count: solutionLimit >= 2 and 1 <= S <= solutionLimit.
  accepts({ solutionLimit: 2 }, {});
  refuses('solutionLimit', { solutionLimit: 1 }, {});
  accepts({ S: 8, searchStop: 'solution-limit', solutions: 'many' }, {});
  refuses('S', { S: 0, solutions: 'unknown' }, {});
  refuses('S', { S: 9 }, {});

  // Count status (RES-04).
  accepts({ S: 3, solutions: 'few' }, {});
  accepts({ S: 8, searchStop: 'exhausted', solutions: 'many' }, {});
  accepts({ S: 1, searchStop: 'node-cap', solutions: 'unknown' }, {});
  accepts({ S: 1, searchStop: 'work-cap', solutions: 'unknown' }, {});
  accepts({ S: 3, searchStop: 'node-cap', solutions: 'few' }, {});
  refuses('solutions', { solutions: 'few' }, {});
  refuses('solutions', { S: 3, solutions: 'unique' }, {});
  refuses('solutions', { S: 3, solutions: 'many' }, {});
  refuses('solutions', { S: 8, searchStop: 'solution-limit', solutions: 'few' }, {});
  refuses('solutions', { S: 1, searchStop: 'node-cap', solutions: 'unique' }, {});
  refuses('solutions', { S: 3, searchStop: 'work-cap', solutions: 'unknown' }, {});

  // The tuple of the decisive guesses.
  accepts({ G: 0, info: 0, Cmax: 0, Dmax: 0, tier: 3, Gproved: 0 }, {});
  refuses('G', { G: 0, info: 1, Cmax: 0, Dmax: 0, tier: 3, Gproved: 0 }, {});
  refuses('G', { G: 0, info: 0, Cmax: 2, Dmax: 0, tier: 3, Gproved: 0 }, {});
  refuses('G', { G: 0, info: 0, Cmax: 0, Dmax: 1, tier: 3, Gproved: 0 }, {});
  accepts({ G: 1, Gproved: 1, info: 0.5, Cmax: 2 }, {});
  refuses('G', { info: 0 }, {});
  refuses('G', { Cmax: 1 }, {});
  refuses('G', { Cmax: 0, info: 1 }, {});

  // The tiers follow the rule counts.
  accepts({ F: 0, deductionTier: 0 }, NO_RULES);
  accepts({ F: 1, deductionTier: 1 }, only('R1', 1));
  accepts({ F: 3, deductionTier: 1 }, only('R3', 3));
  accepts({ F: 0, deductionTier: 2 }, only('R4', 1));
  accepts({ F: 0, deductionTier: 2 }, only('R5', 1));
  accepts({ F: 0, E: 2, deductionTier: 2 }, only('R6', 2));
  accepts({ F: 0, deductionTier: 3 }, only('R7', 1));
  accepts({ F: 0, deductionTier: 3 }, only('R9', 1));
  accepts({ F: 3, E: 1, deductionTier: 3 }, exact);
  refuses('deductionTier', { F: 0, deductionTier: 1 }, only('R4', 1));
  refuses('deductionTier', { F: 1, deductionTier: 0 }, only('R1', 1));
  refuses('deductionTier', { deductionTier: 2 }, {});
  refuses('deductionTier', { F: 0, deductionTier: 1 }, only('R9', 1));
  accepts({ G: 0, info: 0, Cmax: 0, Dmax: 0, F: 0, deductionTier: 0, tier: 0, Gproved: 0 }, NO_RULES);
  accepts({ G: 0, info: 0, Cmax: 0, Dmax: 0, F: 1, deductionTier: 1, tier: 1, Gproved: 0 }, only('R1', 1));
  refuses('tier', { tier: 3 }, {});
  refuses('tier', { G: 0, info: 0, Cmax: 0, Dmax: 0, tier: 4, Gproved: 0 }, {});
  refuses('tier', { G: 0, info: 0, Cmax: 0, Dmax: 0, F: 1, deductionTier: 1, tier: 2, Gproved: 0 }, only('R1', 1));

  // The sums.
  refuses('F', { F: 5 }, {});
  refuses('F', { F: 3 }, {});
  refuses('E', { E: 1 }, {});
  refuses('E', { E: 0 }, { R6: 1 });

  // The census.
  accepts({ censusComplete: false, censusUndecided: 3, Gproved: 1 }, {});
  accepts({ censusComplete: false, censusUndecided: 1, Gproved: 2 }, {});
  refuses('censusComplete', { censusUndecided: 1 }, {});
  refuses('censusComplete', { censusComplete: false }, {});
  accepts({ censusNodes: 8, censusWork: 123456 }, {});
  refuses('censusNodes', { censusNodes: 9 }, {});
  refuses('censusWork', { censusWork: 123457 }, {});

  // Gproved (RES-35).
  accepts({ censusComplete: false, censusUndecided: 1, Gproved: 0 }, {});
  refuses('Gproved', { Gproved: 3 }, {});
  refuses('Gproved', { censusComplete: false, censusUndecided: 1, Gproved: 3 }, {});
  refuses('Gproved', { Gproved: 1 }, {});
  refuses('Gproved', { Gproved: 0 }, {});

  // One issue per failed rule: three broken rules give three issues.
  const many = withRating(v3With({ F: 9, E: 9, Gproved: 9 }, {}));
  assert.deepEqual(many.ok ? [] : many.issues.map((i) => i.path), [at('.metrics.F'), at('.metrics.E'), at('.metrics.Gproved')]);
});

test('difficulty-v3 metrics: the generic bound holds and large legal values stay far below it', () => {
  const sized = (/** @type {string} */ model, /** @type {number} */ bytes) => withRating({
    model, score: 1, level: 'x', metrics: { pad: 'x'.repeat(bytes - JSON.stringify({ pad: '' }).length) },
  });
  for (const model of ['difficulty-v2', 'difficulty-v1', 'acme-elo/3']) {
    good(sized(model, 4096));
    assertIssue(sized(model, 4097), 'rating-invalid', at('.metrics'));
  }
  const nested = (/** @type {number} */ n) => Array.from({ length: n }).reduce((inner) => ({ a: inner }), /** @type {unknown} */ (1));
  for (const model of ['difficulty-v2', 'acme-elo/3']) {
    good(withRating({ model, score: 1, level: 'x', metrics: nested(9) }));
    assertIssue(withRating({ model, score: 1, level: 'x', metrics: nested(10) }), 'rating-invalid', at('.metrics'));
  }
  assert.deepEqual(good(withRating({ model: 'difficulty-v2', score: 1, level: 'x', metrics: { pad: 'y' } })).warnings, []);

  const big = Number.MAX_SAFE_INTEGER;
  const large = v3With({
    U: big, R: big, H: Number.MAX_VALUE, B: big, branchTrials: big, rowTrials: big, F: 0, E: big, G: big, Gproved: big,
    info: Number.MAX_VALUE, Cmax: big, Dmax: big, Gt: big, nodes: big, work: big, censusNodes: big, censusWork: big,
    solutionLimit: big,
  }, { R1: 0, R2: 0, R3: 0, R4: big, R5: big, R6: big, R7: big, R8: big, R9: big });
  const read = good(withRating(large));
  assert.deepEqual(read.value.puzzles[0].rating, large);
  const bytes = new TextEncoder().encode(JSON.stringify(read.value.puzzles[0].rating.metrics)).length;
  assert.ok(bytes > 500 && bytes < 1500, `${bytes} bytes`);
  assert.equal(JSON.stringify(claimPaths(large).written), JSON.stringify(large));
});

test('omitSolutions keeps v3 claims unchanged', () => {
  const pack = good(parsePack(FIXTURE_TEXT)).value;
  pack.witness = pack.puzzles[0].solution;
  for (const claim of [V3_CLAIM, V3_ESTIMATE]) {
    pack.puzzles[0].rating = clone(claim);
    const stripped = serializePack(pack, { omitSolutions: true });
    assert.equal(JSON.stringify(JSON.parse(stripped).puzzles[0].rating), JSON.stringify(claim));
    assert.deepEqual(good(parsePack(stripped)).value.puzzles[0].rating, claim);
  }
});

test('legacy and foreign ratings are preserved as unverified claims', () => {
  const rated = (/** @type {unknown} */ rating) => corrupt((f) => { f.puzzles[0].rating = rating; });
  const legacy = { model: 'difficulty-v1', score: 12.5, level: 'hard', metrics: { moves: [1, { a: 2 }], note: 'x' }, censored: false, saturated: true };
  const r = good(rated(legacy));
  assert.deepEqual(r.value.puzzles[0].rating, legacy);
  assert.deepEqual(r.warnings, []);
  good(rated({ model: 'difficulty-v1', score: 0, level: 'x' }));
  assertIssue(rated({ model: 'difficulty-v1', score: -0.5, level: 'x' }), 'rating-invalid', 'puzzles[0].rating.score');
  assertIssue(rated({ model: 'difficulty-v1', score: 1, level: 'x', extra: 1 }), 'unknown-field', 'puzzles[0].rating.extra');
  assertIssue(rated({ model: 'difficulty-v1', score: 1 }), 'missing-field', 'puzzles[0].rating.level');
  assertIssue(rated({ model: 'difficulty-v1', score: 1, level: 'x', metrics: [] }), 'rating-invalid', 'puzzles[0].rating.metrics');
  assertIssue(rated({ model: 'difficulty-v1', score: 1, level: 'x', metrics: { big: 'x'.repeat(5000) } }), 'rating-invalid', 'puzzles[0].rating.metrics');
  const nested = (/** @type {number} */ n) => Array.from({ length: n }).reduce((inner) => ({ a: inner }), /** @type {unknown} */ (1));
  assertIssue(rated({ model: 'difficulty-v1', score: 1, level: 'x', metrics: nested(10) }), 'rating-invalid', 'puzzles[0].rating.metrics');
  good(rated({ model: 'difficulty-v1', score: 1, level: 'x', metrics: nested(8) }));
  assertIssue(rated({ model: '', score: 1, level: 'x' }), 'invalid-length', 'puzzles[0].rating.model');

  const foreign = good(rated({ model: 'acme-elo/3', score: 1500, level: 'expert', censored: true }));
  assert.equal(foreign.value.puzzles[0].rating.model, 'acme-elo/3');
  assert.deepEqual(foreign.warnings.map((w) => [w.code, w.path]), [['unsupported-model', 'puzzles[0].rating.model']]);
  assertIssue(rated({ model: 'acme-elo/3', score: 1, level: 'x', verified: true }), 'unknown-field', 'puzzles[0].rating.verified');
  assert.equal(good(rated(null)).value.puzzles[0].rating, null);
});

test('certificates are claims; verified is never accepted or written', () => {
  const certified = (/** @type {unknown} */ certificate) => corrupt((f) => { f.puzzles[0].certificate = certificate; });
  for (const status of ['unique', 'multiple', 'not-proved', 'unsatisfiable']) {
    const r = good(certified({ status, model: 'dlx-v1', rowLimit: 10000 }));
    assert.deepEqual(r.value.puzzles[0].certificate, { status, model: 'dlx-v1', rowLimit: 10000 });
    assert.deepEqual(r.warnings, []);
  }
  assert.deepEqual(good(certified({ status: 'unique', model: 'dlx-v1' })).value.puzzles[0].certificate, { status: 'unique', model: 'dlx-v1' });
  assertIssue(certified({ status: 'verified', model: 'dlx-v1' }), 'certificate-invalid', 'puzzles[0].certificate.status');
  assertIssue(certified({ status: 'unique', model: 'dlx-v1', verified: true }), 'unknown-field', 'puzzles[0].certificate.verified');
  assertIssue(certified({ status: 'unique', model: 'dlx-v1', rowLimit: -1 }), 'certificate-invalid', 'puzzles[0].certificate.rowLimit');
  assertIssue(certified({ status: 'unique', model: 'dlx-v1', rowLimit: 1.5 }), 'certificate-invalid', 'puzzles[0].certificate.rowLimit');
  assertIssue(certified({ status: 'unique' }), 'missing-field', 'puzzles[0].certificate.model');
  assertIssue(certified('unique'), 'invalid-type', 'puzzles[0].certificate');
  const foreign = good(certified({ status: 'multiple', model: 'other-solver' }));
  assert.deepEqual(foreign.warnings.map((w) => w.code), ['unsupported-model']);
  assert.equal(good(certified(null)).value.puzzles[0].certificate, null);

  const pack = good(parsePack(FIXTURE_TEXT)).value;
  pack.puzzles[0].certificate = { status: 'unique', model: 'dlx-v1', rowLimit: 10, verified: true };
  pack.puzzles[0].rating = { model: 'difficulty-v1', score: 3, level: 'x', verified: true };
  const text = serializePack(pack);
  assert.ok(!text.includes('verified'));
  assert.deepEqual(JSON.parse(text).puzzles[0].certificate, { status: 'unique', model: 'dlx-v1', rowLimit: 10 });
  assert.equal(good(parsePack(text)).value.puzzles[0].certificate.status, 'unique');
});

test('explicit null is accepted for absent optional witness, solution, rating and certificate', () => {
  const r = good(corrupt((f) => {
    f.witness = null;
    f.puzzles[0].solution = null;
    f.puzzles[0].rating = null;
    f.puzzles[0].certificate = null;
  }));
  const [puzzle] = r.value.puzzles;
  assert.equal(r.value.witness, null);
  assert.equal(puzzle.solution, null);
  assert.equal(puzzle.rating, null);
  assert.equal(puzzle.certificate, null);
  const written = JSON.parse(serializePack(r.value));
  assert.deepEqual(Object.keys(written.puzzles[0]), ['id', 'title', 'clues']);
  assert.ok(!('witness' in written));
});

test('a puzzle seed is optional, kept in order after the title and limited to 1-256 characters', () => {
  const pack = good(parsePack(FIXTURE_TEXT)).value;
  pack.puzzles[0].seed = '4242';
  const text = serializePack(pack);
  assert.deepEqual(Object.keys(JSON.parse(text).puzzles[0]).slice(0, 3), ['id', 'title', 'seed']);
  assert.equal(good(parsePack(text)).value.puzzles[0].seed, '4242');
  const wire = JSON.parse(text);
  wire.puzzles[0].seed = '';
  assert.equal(parsePack(JSON.stringify(wire)).ok, false);
  wire.puzzles[0].seed = 'x'.repeat(257);
  assert.equal(parsePack(JSON.stringify(wire)).ok, false);
});

test('omitSolutions removes answers without inventing proofs', () => {
  const pack = good(parsePack(FIXTURE_TEXT)).value;
  pack.witness = pack.puzzles[0].solution;
  pack.puzzles[0].rating = { model: 'difficulty-v1', score: 3, level: 'normal' };
  const full = JSON.parse(serializePack(pack));
  assert.equal(full.witness.length, 10);
  assert.equal(full.puzzles[0].solution.length, 10);

  const stripped = serializePack(pack, { omitSolutions: true });
  const data = JSON.parse(stripped);
  assert.ok(!('witness' in data));
  assert.ok(!('solution' in data.puzzles[0]));
  assert.ok(!('certificate' in data.puzzles[0]));
  assert.deepEqual(data.puzzles[0].rating, pack.puzzles[0].rating);
  const reread = good(parsePack(stripped)).value;
  assert.equal(reread.witness, null);
  assert.equal(reread.puzzles[0].solution, null);
  assert.equal(reread.puzzles[0].certificate, null);
  assert.deepEqual(reread.puzzles[0].clues, pack.puzzles[0].clues);
  assert.ok(serializePack(pack, { omitSolutions: true, pretty: true }).includes('\n'));
});

test('piece order and generation hints survive canonical writing', () => {
  const f = fixture();
  f.pieces.reverse();
  f.generation = { carving: 'macro', macroRegion: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0] };
  const pack = good(validatePack(f)).value;
  const again = good(parsePack(serializePack(pack))).value;
  assert.deepEqual(again.pieces.map((p) => p.id), [...'JIHGFEDCBA']);
  assert.deepEqual(again.generation.macroRegion, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
});

test('createPack derives the kind, rows and claims', () => {
  const board = boardFromRows(['##', '##', '##']);
  const base = symmetricPack();
  const rating = {
    model: /** @type {const} */ ('difficulty-v2'), score: 13, level: 'normal', saturated: false,
    metrics: { U: 4, B: 3, branchTrials: 3, rowTrials: 40, stop: /** @type {const} */ ('solution'), R: 20, H: 2.5 },
  };
  const puzzle = {
    id: 'p1',
    clues: [pose('O', 0, 0, 3, true)],
    solution: [pose('D', 0, 2, 2), pose('O', 0, 0, 3, true)],
    rating,
    certificate: { status: /** @type {const} */ ('unique'), model: /** @type {const} */ ('dlx-v1'), rowLimit: 100, verified: true },
  };
  const pack = createPack({ board, rotation: 45, pieces: /** @type {any} */ (base.pieces), puzzles: [/** @type {any} */ (puzzle)], generation: { app: 'test' } });
  assert.equal(pack.kind, 'puzzle-pack');
  assert.deepEqual(pack.board, { rows: ['##', '##', '##'] });
  assert.deepEqual(pack.presentation, { rotation: 45 });
  assert.equal(pack.witness, null);
  assert.deepEqual(pack.puzzles[0].clues, [pose('O', 0, 0)]);
  assert.deepEqual(pack.puzzles[0].solution?.map((p) => p.piece), ['D', 'O']);
  assert.deepEqual(pack.puzzles[0].certificate, { status: 'unique', model: 'dlx-v1', rowLimit: 100 });
  assert.deepEqual(pack.puzzles[0].rating, rating);
  assert.notEqual(pack.puzzles[0].rating, rating);
  assert.ok(!('meta' in pack));
  assert.deepEqual(good(validatePack(pack)).value, pack);

  const set = createPack({ board, rotation: 0, pieces: /** @type {any} */ (base.pieces), witness: [pose('O', 0, 0), pose('D', 0, 2)], puzzles: [] });
  assert.equal(set.kind, 'piece-set');
  assert.equal(good(validatePack(set)).value.witness?.length, 2);

  assert.throws(() => createPack({ board, rotation: 30, pieces: /** @type {any} */ (base.pieces), puzzles: [] }), PackError);
  assert.throws(() => createPack({ board, rotation: 0, pieces: /** @type {any} */ (base.pieces), puzzles: [], meta: { k: 'x'.repeat(5000) } }), { code: 'meta-too-large' });
});

test('serializePack rejects a result too large to import', () => {
  const board = boardFromRows(['##', '##', '##']);
  const base = symmetricPack();
  const huge = createPack({ board, rotation: 0, pieces: /** @type {any} */ (base.pieces), puzzles: [], generation: { blob: 'x'.repeat(MAX_FILE_BYTES) } });
  assert.throws(() => serializePack(huge), (e) => e instanceof PackError && e.code === 'pack-too-large');
  const wide = createPack({ board, rotation: 0, pieces: /** @type {any} */ (base.pieces), puzzles: [], generation: { blob: '\u20ac'.repeat(Math.floor(MAX_FILE_BYTES / 3)) } });
  assert.throws(() => serializePack(wide), { code: 'pack-too-large' });
  assert.equal(errorCodes(parsePack(JSON.stringify(huge))).join(), 'pack-too-large');
});

test('a classic pentomino set is a clean piece-set; non-standard sets warn but stay playable', () => {
  const classic = pieceSet(Array(6).fill('#'.repeat(10)), CLASSIC_PENTOMINOES.map((p) => ({ id: p.id, cells: p.cells })));
  classic.pieces.forEach((p, i) => { p.color = CLASSIC_PENTOMINOES[i].color; });
  const r = good(validatePack(classic));
  assert.deepEqual(r.warnings, []);
  assert.equal(r.value.pieces.length, 12);
  assert.equal(r.value.witness, null);

  const ring = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
  const holed = good(validatePack(pieceSet(['###', '###', '###'], [{ id: 'R', cells: ring }, { id: 'm', cells: [[0, 0]] }])));
  assert.deepEqual(holed.warnings.map((w) => [w.code, w.path]), [['piece-hole', 'pieces[0]'], ['small-piece', 'pieces[1]']]);

  const twins = validatePack(pieceSet(['##', '##'], [{ id: 'a', cells: [[0, 0], [1, 0]] }, { id: 'b', cells: [[0, 0], [0, 1]] }]));
  assert.equal(twins.ok, false);
  assert.deepEqual(twins.ok ? [] : twins.issues, [{
    code: 'duplicate-shape',
    path: 'pieces[1]',
    message: 'Piece b has the same shape as piece a',
    params: { piece: 'b', first: 'a' },
  }]);

  const split = good(validatePack(pieceSet(['#.##'], [{ id: 'a', cells: [[0, 0]] }, { id: 'b', cells: [[0, 0], [1, 0]] }])));
  assert.ok(split.warnings.some((w) => w.code === 'board-disconnected'));
  assert.equal(split.value.pieces.length, 2);

  const blockedMargin = good(validatePack(pieceSet(['.###.'], [{ id: 'a', cells: [[0, 0], [1, 0], [2, 0]] }])));
  assert.deepEqual(blockedMargin.warnings, []);
  assert.deepEqual(blockedMargin.value.board.rows, ['.###.']);
});

test('two pieces of the same free shape are refused, one error per later copy, by every reader', async () => {
  const lShape = [[0, 0], [1, 0], [2, 0], [0, 1]];
  const mirrored = [[0, 0], [1, 0], [2, 0], [2, 1]];
  const mirrorPair = pieceSet(['####', '####'], [{ id: 'a', cells: lShape }, { id: 'b', cells: mirrored }]);
  const refusal = (/** @type {import('../core/engine/types.js').Result<any>} */ r) => (r.ok ? null : r.issues.map((i) => [i.code, i.path, i.params]));
  assert.deepEqual(refusal(validatePack(mirrorPair)), [['duplicate-shape', 'pieces[1]', { piece: 'b', first: 'a' }]], 'a mirror image is the same shape');

  const domino = [[0, 0], [1, 0]];
  const threeCopies = pieceSet(['###', '###'], [
    { id: 'a', cells: domino }, { id: 'b', cells: [[0, 0], [0, 1]] }, { id: 'c', cells: domino },
  ]);
  const expected = [
    ['duplicate-shape', 'pieces[1]', { piece: 'b', first: 'a' }],
    ['duplicate-shape', 'pieces[2]', { piece: 'c', first: 'a' }],
  ];
  assert.deepEqual(refusal(validatePack(threeCopies)), expected);
  assert.deepEqual(refusal(parsePack(JSON.stringify(threeCopies))), expected);
  const pause = async () => {};
  assert.deepEqual(await validatePackSliced(threeCopies, pause), validatePack(threeCopies));
  assert.deepEqual(refusal(await validatePackSliced(mirrorPair, pause)), [['duplicate-shape', 'pieces[1]', { piece: 'b', first: 'a' }]]);

  const later = pieceSet(['#####', '#####'], [{ id: 'x', cells: [[0, 0]] }, { id: 'y', cells: lShape }, { id: 'z', cells: mirrored }, { id: 'w', cells: [[0, 0]] }]);
  assert.deepEqual(refusal(validatePack(later)), [
    ['duplicate-shape', 'pieces[2]', { piece: 'z', first: 'y' }],
    ['duplicate-shape', 'pieces[3]', { piece: 'w', first: 'x' }],
  ], 'each copy names the first piece of its shape');
  const different = pieceSet(['###', '###'], [{ id: 'a', cells: [[0, 0], [1, 0], [2, 0]] }, { id: 'b', cells: [[0, 0], [1, 0], [0, 1]] }]);
  assert.deepEqual(good(validatePack(different)).warnings, [], 'different shapes stay accepted');
});

test('the shape check never runs on a pack whose board or pieces were not read', () => {
  const domino = [[0, 0], [1, 0]];
  const twins = () => pieceSet(['##', '##'], [{ id: 'a', cells: domino }, { id: 'b', cells: domino }]);
  /** @param {(p: any) => void} mutate */
  const issuesOf = (mutate) => {
    const p = /** @type {any} */ (twins());
    mutate(p);
    return errorCodes(validatePack(p));
  };
  assert.deepEqual(issuesOf((p) => { p.board.rows = 'abc'; }), ['invalid-type']);
  assert.deepEqual(issuesOf((p) => { p.board = { rows: ['....'] }; }), ['board-area']);
  assert.deepEqual(issuesOf((p) => { delete p.board; }), ['missing-field']);
  assert.deepEqual(issuesOf((p) => { delete p.pieces; }), ['missing-field']);
  assert.deepEqual(issuesOf((p) => { p.pieces = 'x'; }), ['invalid-type']);
  assert.deepEqual(issuesOf((p) => { p.pieces[1].cells = [[0, 0], [2, 0]]; }), ['piece-disconnected']);
  assert.deepEqual(issuesOf((p) => { p.pieces[1].id = 'a'; }), ['duplicate-id']);
  assert.deepEqual(issuesOf((p) => { p.pieces.push({ id: 'c', label: 'c', color: '#123456', cells: [[0, 0]] }); }), ['area-mismatch']);
});

test('the largest board (64 x 16 = 1024 cells, eight 128-cell pieces) is accepted', () => {
  // Eight 64 x 2 bands, each given one cell to the next piece and taking one from it, so that all eight differ.
  const owner = Array.from({ length: 16 }, (_, y) => Array.from({ length: 64 }, () => Math.floor(y / 2)));
  for (let k = 0; k < 7; k += 1) {
    owner[2 * k + 1][2 * k + 1] = k + 1;
    owner[2 * k + 2][2 * k + 40] = k;
  }
  const ids = [...'abcdefgh'];
  const shapes = ids.map((_, k) => {
    const cells = owner.flatMap((row, y) => row.flatMap((o, x) => (o === k ? [[x, y]] : [])));
    const minX = Math.min(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    return { minX, minY, cells: cells.map(([x, y]) => [x - minX, y - minY]) };
  });
  assert.equal(new Set(shapes.map((s) => canonicalKey(/** @type {any} */ (s.cells)))).size, 8, 'the eight shapes are pairwise distinct');
  const set = /** @type {any} */ (pieceSet(Array(16).fill('#'.repeat(64)), ids.map((id, k) => ({ id, cells: shapes[k].cells }))));
  set.witness = ids.map((id, k) => pose(id, shapes[k].minX, shapes[k].minY));
  const r = good(validatePack(set));
  assert.deepEqual(r.warnings, []);
  assert.equal(r.value.witness.length, 8);
  assert.equal(r.value.pieces.reduce((n, p) => n + p.cells.length, 0), 1024);
  assertIssue(corrupt((f) => { f.board = { rows: Array(17).fill('#'.repeat(64)) }; }), 'board-area', 'board.rows');
});

test('validatePackSliced pauses between slices and returns what validatePack returns', async () => {
  const pack = fixture();
  let pauses = 0;
  const pause = async () => {
    pauses += 1;
  };
  assert.deepEqual(await validatePackSliced(pack, pause), validatePack(pack));
  assert.equal(pauses, 1 + pack.puzzles.length);
  const broken = fixture();
  broken.puzzles[0].clues = [{ piece: 'nope', x: 0, y: 0, turn: 0, mirrored: false }];
  assert.deepEqual(await validatePackSliced(broken, pause), validatePack(broken));
  assert.deepEqual(await validatePackSliced(null, pause), validatePack(null));
});
