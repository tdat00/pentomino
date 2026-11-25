// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import {
  isTaskKind,
  MAX_ROW_LIMIT,
  parseTaskMessage,
  parseWorkerMessage,
  TASK_KINDS,
  validatePayload,
} from '../core/engine/protocol.js';
import { CLASSIC_PENTOMINOES } from './fixtures/polyominoes.js';

const rows = Array(6).fill('#'.repeat(10));
const pieces = CLASSIC_PENTOMINOES.map((p) => ({ id: p.id, label: p.label, color: p.color, cells: p.cells.map(([x, y]) => [x, y]) }));
const pose = { piece: 'I', x: 3, y: 0, turn: 0, mirrored: false };
const set = {
  boardRows: rows,
  pieces,
  witness: null,
  carving: 'imported',
  macroRegion: null,
};
const snapshot = () => ({
  rows,
  rotation: 45,
  pieces,
  title: 'Easy #2',
  clues: [pose],
  solution: [pose],
  rating: { model: 'difficulty-v2', score: 31, level: 'normal', saturated: false, metrics: { U: 3, B: 40, stop: 'solution', nested: { list: [1, 'a', null, true] } } },
  certificate: { status: 'unique', model: 'dlx-v1', rowLimit: 2000 },
});
const CODE = '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE';

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
const V3_SUMMARY = { model: 'difficulty-v3', score: 30, level: 'expert', saturated: false, censored: true };

const REPLAY_FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/replay-case-v4.json', import.meta.url), 'utf8'));
/**
 * The replay payload of one fixture puzzle, as the Generator's client builds it (design §8.1): the set of its pack in
 * wire form, the puzzle's id, clues, solution and rating, and the pack's set origin with the puzzle's own `made` record.
 * @param {number} [puzzleIndex]
 */
const replayPayload = (puzzleIndex = 0) => {
  const pack = structuredClone(REPLAY_FIXTURE.packs[0]);
  const puzzle = pack.puzzles[puzzleIndex];
  return {
    set: {
      boardRows: pack.board.rows, pieces: pack.pieces, witness: pack.witness, carving: pack.generation.carving,
      macroRegion: pack.generation.macroRegion,
    },
    puzzle: { id: puzzle.id, clues: puzzle.clues, solution: puzzle.solution, rating: puzzle.rating },
    generation: { setOrigin: pack.generation.setOrigin, made: { [puzzle.id]: pack.generation.made[puzzle.id] } },
  };
};

/** @type {Record<string, () => any>} */
const PAYLOADS = {
  setAttempt: () => ({ boardRows: rows, rotation: 45, levelId: 'hard', seedText: 'demo', uniqueness: 'any', attempt: 3 }),
  puzzleCandidate: () => ({
    set: { ...set },
    targetLevelId: 'hard',
    quantity: 5,
    batchSeed: `${'s'.repeat(64)}#12`,
    uniqueness: 'require',
    seenLayouts: ['a', 'b'],
    seenClues: [],
    slot: 2,
    attempt: 0,
  }),
  certify: () => ({ boardRows: rows, pieces, clues: [pose], rowLimit: 10000 }),
  rate: () => ({ boardRows: rows, pieces, clues: [pose] }),
  verifyPack: () => ({ pack: { anything: 1 } }),
  solveFirst: () => ({ boardRows: rows, pieces, clues: [], rowLimit: MAX_ROW_LIMIT, maxSolutions: 1 }),
  enumerateLayouts: () => ({ boardRows: rows, pieces, seenLayouts: ['a', 'b'] }),
  completionCandidate: () => ({
    set: { ...set },
    targetLevelId: 'hard',
    quantity: 5,
    batchSeed: `${'s'.repeat(64)}#12`,
    uniqueness: 'require',
    seenLayouts: ['a', 'b'],
    seenClues: [],
    layout: [pose],
  }),
  encodePuzzleCode: () => ({ snapshot: snapshot() }),
  decodePuzzleCode: () => ({ text: CODE }),
  replayPuzzle: () => replayPayload(),
};

/**
 * @param {string} kind
 * @param {unknown} payload
 * @param {unknown} [id]
 */
const task = (kind, payload, id = 7) => parseTaskMessage({ type: 'task', id, kind, payload });

describe('task messages', () => {
  test('accepts every kind and returns an equal but fresh copy', () => {
    assert.deepEqual([...TASK_KINDS], Object.keys(PAYLOADS));
    for (const kind of TASK_KINDS) {
      const payload = PAYLOADS[kind]();
      const parsed = task(kind, payload);
      assert.ok(parsed.ok, kind);
      assert.equal(parsed.value.kind, kind);
      assert.equal(parsed.value.id, 7);
      if (kind !== 'verifyPack') {
        assert.notEqual(parsed.value.payload, payload);
        assert.deepEqual(parsed.value.payload, payload);
      }
      assert.ok(isTaskKind(kind));
    }
  });

  test('solveFirst defaults maxSolutions to 1 and rejects anything else', () => {
    const { maxSolutions, ...rest } = PAYLOADS.solveFirst();
    assert.equal(maxSolutions, 1);
    const parsed = task('solveFirst', rest);
    assert.ok(parsed.ok);
    assert.equal(parsed.value.payload.maxSolutions, 1);
    assert.ok(!task('solveFirst', { ...rest, maxSolutions: 2 }).ok);
    assert.ok(!task('solveFirst', { ...rest, maxSolutions: 0 }).ok);
  });

  test('unknown kinds and malformed envelopes never validate', () => {
    for (const kind of ['', 'solve', 'toString', '__proto__', null, 5]) {
      const parsed = task(/** @type {any} */ (kind), {});
      assert.ok(!parsed.ok);
      assert.equal(parsed.issues[0].code, 'unknown-kind');
    }
    const bad = [
      null, 'task', 7, [], () => 1, new Map(),
      { type: 'result', id: 1, kind: 'rate', payload: PAYLOADS.rate() },
      { type: 'task', kind: 'rate', payload: PAYLOADS.rate() },
      { type: 'task', id: 1, kind: 'rate' },
      { type: 'task', id: 1, kind: 'rate', payload: PAYLOADS.rate(), extra: true },
    ];
    for (const message of bad) {
      assert.ok(!parseTaskMessage(message).ok, String(JSON.stringify(message)));
    }
  });

  test('ids are safe nonnegative integers', () => {
    for (const id of [0, 1, Number.MAX_SAFE_INTEGER]) {
      assert.ok(task('rate', PAYLOADS.rate(), id).ok, String(id));
    }
    for (const id of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN, '1', null, 2 ** 53]) {
      assert.ok(!task('rate', PAYLOADS.rate(), id).ok, String(id));
    }
  });

  test('payloads reject functions, class instances, typed arrays and unknown or inherited fields', () => {
    const base = PAYLOADS.rate();
    const cases = [
      { ...base, onProgress: () => 1 },
      { ...base, extra: 1 },
      { ...base, clues: [{ ...pose, toString: () => 'x' }] },
      Object.assign(Object.create({ boardRows: rows }), { pieces, clues: [] }),
      new (class Payload { boardRows = rows; pieces = pieces; clues = []; })(),
      { ...base, boardRows: new Uint8Array(4) },
      { ...base, workspace: { bytes: () => 0 } },
      JSON.parse('{"boardRows":["#"],"pieces":[],"clues":[],"__proto__":{"x":1}}'),
      null,
      [],
    ];
    for (const payload of cases) {
      assert.ok(!task('rate', payload).ok);
    }
  });

  test('board rows, pieces and poses are shape-checked', () => {
    /** @type {[string, (p: any) => void][]} */
    const mutations = [
      ['ragged rows', (p) => { p.boardRows = ['###', '##']; }],
      ['bad character', (p) => { p.boardRows = ['#x#']; }],
      ['empty rows', (p) => { p.boardRows = []; }],
      ['too wide', (p) => { p.boardRows = ['#'.repeat(33)]; }],
      ['too tall', (p) => { p.boardRows = Array(33).fill('#'); }],
      ['duplicate piece ids', (p) => { p.pieces = [pieces[0], pieces[0]]; }],
      ['empty piece', (p) => { p.pieces = [{ ...pieces[0], cells: [] }]; }],
      ['fractional cell', (p) => { p.pieces = [{ ...pieces[0], cells: [[0.5, 0]] }]; }],
      ['no pieces', (p) => { p.pieces = []; }],
      ['bad turn', (p) => { p.clues = [{ ...pose, turn: 4 }]; }],
      ['bad mirrored', (p) => { p.clues = [{ ...pose, mirrored: 0 }]; }],
      ['pose extra field', (p) => { p.clues = [{ ...pose, extra: 1 }]; }],
    ];
    for (const [name, mutate] of mutations) {
      const payload = PAYLOADS.rate();
      mutate(payload);
      const parsed = task('rate', payload);
      assert.ok(!parsed.ok, name);
      assert.ok(parsed.issues.length > 0 && parsed.issues.every((i) => typeof i.path === 'string'), name);
    }
  });

  test('row limits are finite integers from 0 to 2,000,000', () => {
    for (const rowLimit of [0, 1, 10000, MAX_ROW_LIMIT]) {
      assert.ok(task('certify', { ...PAYLOADS.certify(), rowLimit }).ok, String(rowLimit));
    }
    for (const rowLimit of [-1, MAX_ROW_LIMIT + 1, 1.5, NaN, Infinity, -Infinity, '10', null, undefined]) {
      assert.ok(!task('certify', { ...PAYLOADS.certify(), rowLimit }).ok, String(rowLimit));
      assert.ok(!task('solveFirst', { ...PAYLOADS.solveFirst(), rowLimit }).ok, String(rowLimit));
    }
  });

  test('set seed text is UI-normalized and at most 64 code points; batch seed is not', () => {
    const attempt = PAYLOADS.setAttempt();
    assert.ok(task('setAttempt', { ...attempt, seedText: '🙂'.repeat(64) }).ok);
    for (const seedText of ['🙂'.repeat(65), '', '  padded ', 'e\u0301', 5]) {
      assert.ok(!task('setAttempt', { ...attempt, seedText }).ok, String(seedText));
    }
    const candidate = PAYLOADS.puzzleCandidate();
    const long = `${'x'.repeat(64)}#1234567`;
    const parsed = task('puzzleCandidate', { ...candidate, batchSeed: long });
    assert.ok(parsed.ok);
    assert.equal(parsed.value.payload.batchSeed, long);
    assert.ok(!task('puzzleCandidate', { ...candidate, batchSeed: '' }).ok);
    assert.ok(!task('puzzleCandidate', { ...candidate, batchSeed: ' x#1' }).ok);
  });

  test('levels, uniqueness, attempts, slots and quantities are checked', () => {
    const attempt = PAYLOADS.setAttempt();
    assert.ok(task('setAttempt', { ...attempt, levelId: 'hell-3' }).ok);
    assert.ok(!task('setAttempt', { ...attempt, levelId: 'impossible' }).ok);
    assert.ok(!task('setAttempt', { ...attempt, uniqueness: 'maybe' }).ok);
    assert.ok(!task('setAttempt', { ...attempt, attempt: -1 }).ok);
    assert.ok(!task('setAttempt', { ...attempt, rotation: 360 }).ok);
    const c = PAYLOADS.puzzleCandidate();
    for (const patch of [{ quantity: 0 }, { quantity: 11 }, { slot: 0 }, { slot: 11 }, { attempt: 1.5 }]) {
      assert.ok(!task('puzzleCandidate', { ...c, ...patch }).ok, JSON.stringify(patch));
    }
  });

  test('candidate sets need matching witness and region lengths and bounded history', () => {
    const c = PAYLOADS.puzzleCandidate();
    assert.ok(!task('puzzleCandidate', { ...c, set: { ...set, witness: [pose] } }).ok);
    assert.ok(!task('puzzleCandidate', { ...c, set: { ...set, macroRegion: [0, 1] } }).ok);
    assert.ok(!task('puzzleCandidate', { ...c, set: { ...set, carving: 'other' } }).ok);
    assert.ok(!task('puzzleCandidate', { ...c, set: { ...set, extra: 1 } }).ok);
    assert.ok(task('puzzleCandidate', { ...c, set: { ...set, macroRegion: pieces.map((_, i) => i) } }).ok);
    assert.ok(task('puzzleCandidate', { ...c, seenLayouts: Array(1000).fill('k') }).ok);
    assert.ok(!task('puzzleCandidate', { ...c, seenLayouts: Array(1001).fill('k') }).ok);
    assert.ok(!task('puzzleCandidate', { ...c, seenClues: [1] }).ok);
    assert.ok(task('puzzleCandidate', { ...c, seenLayouts: ['0'.repeat(1352)] }).ok, 'a key of a 676-cell board');
    assert.ok(!task('puzzleCandidate', { ...c, seenLayouts: ['0'.repeat(2049)] }).ok);
  });

  test('puzzleCandidate accepts an optional igPrior from 1 to 128', () => {
    const c = PAYLOADS.puzzleCandidate();
    for (const igPrior of [1, 128]) {
      const parsed = /** @type {any} */ (task('puzzleCandidate', { ...c, igPrior }));
      assert.ok(parsed.ok, String(igPrior));
      assert.equal(parsed.value.payload.igPrior, igPrior);
    }
    const absent = /** @type {any} */ (task('puzzleCandidate', c));
    assert.ok(absent.ok);
    assert.equal(Object.hasOwn(absent.value.payload, 'igPrior'), false);
    for (const igPrior of [0, 129, 1.5, '3']) {
      const parsed = /** @type {any} */ (task('puzzleCandidate', { ...c, igPrior }));
      assert.ok(!parsed.ok, String(igPrior));
      assert.deepEqual(parsed.issues.map((/** @type {any} */ i) => i.path), ['payload.igPrior'], String(igPrior));
    }
  });

  test('validatePayload reports unknown kinds and verifyPack accepts any pack value', () => {
    assert.ok(!validatePayload('nope', {}).ok);
    assert.ok(validatePayload('verifyPack', { pack: 5 }).ok);
    assert.ok(!validatePayload('verifyPack', {}).ok);
  });

  test('puzzle-code payloads: the snapshot is a strict plain-data copy; omitted optional claims become null', () => {
    const full = task('encodePuzzleCode', { snapshot: snapshot() });
    assert.ok(full.ok);
    assert.deepEqual(full.value.payload.snapshot, snapshot());
    const { title, solution, rating, certificate, ...minimal } = snapshot();
    const bare = task('encodePuzzleCode', { snapshot: minimal });
    assert.ok(bare.ok);
    assert.deepEqual(bare.value.payload.snapshot, { ...minimal, title: null, solution: null, rating: null, certificate: null });
    const hostile = { snapshot: { ...snapshot(), rating: { model: 'm', score: 1, level: 'x', metrics: JSON.parse('{"__proto__":{"x":1}}') } } };
    const copied = /** @type {any} */ (task('encodePuzzleCode', hostile));
    assert.ok(copied.ok);
    assert.equal(Object.getPrototypeOf(copied.value.payload.snapshot.rating.metrics), Object.prototype, 'a __proto__ key stays data');
    assert.equal(Object.hasOwn(copied.value.payload.snapshot.rating.metrics, '__proto__'), true);
    assert.equal(/** @type {any} */ ({}).x, undefined, 'and pollutes nothing');
    assert.ok(task('encodePuzzleCode', { snapshot: { ...snapshot(), rating: { model: 'foreign-v9', score: 4.5, level: 'who knows', censored: true } } }).ok);
  });

  test('puzzle-code snapshots keep difficulty-v3 claims and summaries field for field', () => {
    for (const rating of [V3_ESTIMATE, V3_SUMMARY, V3_CLAIM]) {
      const parsed = validatePayload('encodePuzzleCode', { snapshot: { ...snapshot(), rating } });
      const expected = JSON.stringify(rating);
      assert.ok(parsed.ok, expected);
      const copy = /** @type {any} */ (parsed.value).snapshot.rating;
      assert.equal(JSON.stringify(copy), expected, 'no field dropped, added or reordered');
      assert.notEqual(copy, rating);
      if ('metrics' in rating) {
        assert.notEqual(copy.metrics, rating.metrics);
        assert.notEqual(copy.metrics.rules, rating.metrics.rules);
      }
    }
  });

  test('puzzle-code snapshots reject unknown fields, wrong types and unbounded metrics', () => {
    const deep = (/** @type {number} */ n) => (n === 0 ? 1 : { a: deep(n - 1) });
    /** @type {[string, (s: any) => void][]} */
    const mutations = [
      ['unknown snapshot field', (s) => { s.index = 2; }],
      ['function field', (s) => { s.onDone = () => 1; }],
      ['missing rows', (s) => { delete s.rows; }],
      ['ragged rows', (s) => { s.rows = ['###', '##']; }],
      ['fractional rotation', (s) => { s.rotation = 1.5; }],
      ['rotation 360', (s) => { s.rotation = 360; }],
      ['numeric title', (s) => { s.title = 5; }],
      ['overlong title', (s) => { s.title = 'x'.repeat(513); }],
      ['clue with unknown field', (s) => { s.clues = [{ ...pose, extra: 1 }]; }],
      ['solution of a wrong type', (s) => { s.solution = 'yes'; }],
      ['rating with unknown field', (s) => { s.rating = { model: 'm', score: 1, level: 'x', verified: true }; }],
      ['negative score', (s) => { s.rating = { model: 'm', score: -1, level: 'x' }; }],
      ['non-finite score', (s) => { s.rating = { model: 'm', score: Infinity, level: 'x' }; }],
      ['array metrics', (s) => { s.rating = { model: 'm', score: 1, level: 'x', metrics: [1] }; }],
      ['too deep metrics', (s) => { s.rating = { model: 'm', score: 1, level: 'x', metrics: deep(12) }; }],
      ['huge metrics', (s) => { s.rating = { model: 'm', score: 1, level: 'x', metrics: { list: new Array(5000).fill(1) } }; }],
      ['class instance in metrics', (s) => { s.rating = { model: 'm', score: 1, level: 'x', metrics: { when: new Date(0) } }; }],
      ['certificate with a bad status', (s) => { s.certificate = { status: 'maybe', model: 'm' }; }],
      ['certificate with a fractional limit', (s) => { s.certificate = { status: 'unique', model: 'm', rowLimit: 1.5 }; }],
    ];
    for (const [name, mutate] of mutations) {
      const s = snapshot();
      mutate(s);
      const parsed = task('encodePuzzleCode', { snapshot: s });
      assert.ok(!parsed.ok, name);
      assert.ok(parsed.issues.length > 0 && parsed.issues.every((i) => i.code && i.path), name);
    }
    assert.ok(!task('encodePuzzleCode', {}).ok);
    assert.ok(!task('encodePuzzleCode', { snapshot: snapshot(), options: { compression: 'raw' } }).ok, 'no options travel');
    assert.ok(!task('encodePuzzleCode', { snapshot: new Map() }).ok);
  });

  test('decode text is a string of at most 32,768 UTF-16 code units; the codec judges the rest', () => {
    for (const text of ['', ' ', CODE, '1D0J-492G 47DM', 'not a code at all', 'x'.repeat(32768)]) {
      assert.ok(task('decodePuzzleCode', { text }).ok, text.slice(0, 20));
    }
    for (const text of ['x'.repeat(32769), 5, null, undefined, ['a'], { toString: () => 'a' }]) {
      assert.ok(!task('decodePuzzleCode', { text }).ok, String(text).slice(0, 20));
    }
    assert.ok(!task('decodePuzzleCode', { text: CODE, signal: {} }).ok, 'no AbortSignal');
    assert.ok(!task('decodePuzzleCode', { text: new URL('https://example.test/') }).ok, 'no URL instance');
    assert.ok(!task('decodePuzzleCode', {}).ok);
  });
});

describe('replayPuzzle payloads', () => {
  const deep = (/** @type {number} */ n) => (n === 0 ? 1 : { a: deep(n - 1) });

  test('the first fixture puzzle validates and comes back as an equal but fresh copy', () => {
    const payload = replayPayload();
    const parsed = validatePayload('replayPuzzle', payload);
    assert.ok(parsed.ok);
    const copy = parsed.value;
    assert.deepEqual(copy, payload);
    assert.deepEqual(Object.keys(copy.generation), ['setOrigin', 'made']);
    assert.equal(Object.keys(copy.generation.made).length, 1);
    assert.equal(typeof copy.puzzle.rating.metrics, 'object', 'the claim keeps its metrics');
    for (const [fresh, given] of [
      [copy, payload], [copy.set, payload.set], [copy.set.pieces, payload.set.pieces], [copy.set.pieces[0].cells, payload.set.pieces[0].cells],
      [copy.set.witness, payload.set.witness], [copy.puzzle, payload.puzzle], [copy.puzzle.clues, payload.puzzle.clues],
      [copy.puzzle.solution, payload.puzzle.solution], [copy.puzzle.rating, payload.puzzle.rating],
      [copy.puzzle.rating.metrics, payload.puzzle.rating.metrics], [copy.generation, payload.generation],
      [copy.generation.setOrigin, payload.generation.setOrigin], [copy.generation.setOrigin.versions, payload.generation.setOrigin.versions],
      [copy.generation.made, payload.generation.made], [Object.values(copy.generation.made)[0], Object.values(payload.generation.made)[0]],
    ]) {
      assert.notEqual(fresh, given);
    }
    const message = task('replayPuzzle', payload);
    assert.ok(message.ok);
    assert.deepEqual(message.value.payload, payload);
  });

  test('the solution, the rating, the set origin and the record are optional; a missing one is left out or null', () => {
    const { solution, rating, ...bare } = replayPayload().puzzle;
    const stored = validatePayload('replayPuzzle', { ...replayPayload(), puzzle: bare });
    assert.ok(stored.ok);
    assert.deepEqual(stored.value.puzzle, { ...bare, solution: null, rating: null });
    const nulls = validatePayload('replayPuzzle', { ...replayPayload(), puzzle: { ...bare, solution: null, rating: null } });
    assert.ok(nulls.ok);
    assert.deepEqual(nulls.value.puzzle, stored.value.puzzle);
    for (const [generation, expected] of /** @type {[object, object][]} */ ([
      [{}, {}], [{ setOrigin: undefined, made: undefined }, {}], [{ made: {} }, { made: {} }],
    ])) {
      const parsed = validatePayload('replayPuzzle', { ...replayPayload(), generation });
      assert.ok(parsed.ok, JSON.stringify(generation));
      assert.deepEqual(parsed.value.generation, expected);
    }
    const { setOrigin } = replayPayload().generation;
    const only = validatePayload('replayPuzzle', { ...replayPayload(), generation: { setOrigin } });
    assert.ok(only.ok);
    assert.deepEqual(Object.keys(only.value.generation), ['setOrigin']);
  });

  test('the protocol checks structure and size only: an invalid record is the engine\'s to judge', () => {
    const id = replayPayload().puzzle.id;
    for (const made of [{ [id]: { schema: 99 } }, { [id]: {} }, { elsewhere: { kind: 'calibration' } }, { [id]: [1, 2] }]) {
      assert.ok(validatePayload('replayPuzzle', { ...replayPayload(), generation: { made } }).ok, JSON.stringify(made));
    }
    assert.ok(validatePayload('replayPuzzle', { ...replayPayload(), generation: { setOrigin: { schema: 0, seed: 7 } } }).ok);
  });

  test('a malformed payload is an issue at the right path', () => {
    const id = replayPayload().puzzle.id;
    /** @type {[string, (p: any) => void, string, string][]} */
    const bad = [
      ['missing generation', (p) => { delete p.generation; }, 'missing-field', 'payload.generation'],
      ['missing puzzle', (p) => { delete p.puzzle; }, 'missing-field', 'payload.puzzle'],
      ['unknown payload field', (p) => { p.limits = { maxSteps: 1 }; }, 'unknown-field', 'payload.limits'],
      ['unknown field in the puzzle', (p) => { p.puzzle.certificate = null; }, 'unknown-field', 'payload.puzzle.certificate'],
      ['unknown field in the generation', (p) => { p.generation.createdAt = 'now'; }, 'unknown-field', 'payload.generation.createdAt'],
      ['no pieces', (p) => { p.set.pieces = []; }, 'invalid-value', 'payload.set.pieces'],
      ['a long puzzle id', (p) => { p.puzzle.id = 'p'.repeat(65); }, 'invalid-value', 'payload.puzzle.id'],
      ['a solution of a wrong type', (p) => { p.puzzle.solution = 'yes'; }, 'invalid-type', 'payload.puzzle.solution'],
      ['a clue with an unknown field', (p) => { p.puzzle.clues[0] = { ...p.puzzle.clues[0], extra: 1 }; }, 'unknown-field', 'payload.puzzle.clues[0].extra'],
      ['a negative score', (p) => { p.puzzle.rating = { ...p.puzzle.rating, score: -1 }; }, 'invalid-value', 'payload.puzzle.rating.score'],
      ['two keys in made', (p) => { p.generation.made.other = {}; }, 'invalid-value', 'payload.generation.made'],
      ['a made that is not an object', (p) => { p.generation.made = [1]; }, 'invalid-type', 'payload.generation.made'],
      ['a null made', (p) => { p.generation.made = null; }, 'invalid-type', 'payload.generation.made'],
      ['a null setOrigin', (p) => { p.generation.setOrigin = null; }, 'invalid-type', 'payload.generation.setOrigin'],
      ['an array setOrigin', (p) => { p.generation.setOrigin = []; }, 'invalid-type', 'payload.generation.setOrigin'],
      ['a string setOrigin', (p) => { p.generation.setOrigin = 'origin'; }, 'invalid-type', 'payload.generation.setOrigin'],
      ['a class instance as setOrigin', (p) => { p.generation.setOrigin = new Date(0); }, 'invalid-type', 'payload.generation.setOrigin'],
      ['a function in setOrigin', (p) => { p.generation.setOrigin = { run: () => 1 }; }, 'invalid-type', 'payload.generation.setOrigin.run'],
      ['a non-finite number in made', (p) => { p.generation.made = { [id]: { n: Infinity } }; }, 'invalid-value', `payload.generation.made.${id}.n`],
      ['a setOrigin nested 9 levels', (p) => { p.generation.setOrigin = deep(9); }, 'invalid-type', `payload.generation.setOrigin${'.a'.repeat(8)}`],
      ['a made nested 9 levels', (p) => { p.generation.made = { [id]: deep(8) }; }, 'invalid-type', `payload.generation.made.${id}${'.a'.repeat(7)}`],
    ];
    for (const [name, mutate, code, path] of bad) {
      const payload = replayPayload();
      mutate(payload);
      const parsed = validatePayload('replayPuzzle', payload);
      assert.ok(!parsed.ok, name);
      assert.deepEqual(parsed.issues.map((i) => [i.code, i.path]), [[code, path]], name);
    }
  });

  test('nesting of 8 levels and 4,096 values pass; more are refused', () => {
    const id = replayPayload().puzzle.id;
    const origin = { ...replayPayload().generation.setOrigin, deep: deep(7) };
    const parsed = validatePayload('replayPuzzle', { ...replayPayload(), generation: { setOrigin: origin, made: { [id]: deep(7) } } });
    assert.ok(parsed.ok, '8 levels: the object itself and 7 more');
    assert.deepEqual(parsed.value.generation.setOrigin, origin);
    // The object and its list are 2 values, the items follow.
    const list = (/** @type {number} */ n) => ({ list: new Array(n).fill(1) });
    assert.ok(validatePayload('replayPuzzle', { ...replayPayload(), generation: { made: { [id]: list(4093) } } }).ok, 'exactly 4,096 values');
    const over = validatePayload('replayPuzzle', { ...replayPayload(), generation: { made: { [id]: list(4094) } } });
    assert.ok(!over.ok);
    assert.deepEqual([over.issues[0].code, over.issues.length], ['invalid-value', 1]);
    assert.match(over.issues[0].path, /^payload\.generation\.made\.p[0-9a-f]+\.list\[\d+\]$/);
  });

  test('parseTaskMessage accepts the kind in the envelope and still rejects unknown kinds', () => {
    assert.ok(isTaskKind('replayPuzzle'));
    assert.equal(TASK_KINDS.at(-1), 'replayPuzzle');
    const parsed = task('replayPuzzle', replayPayload(), 41);
    assert.ok(parsed.ok);
    assert.equal(parsed.value.kind, 'replayPuzzle');
    assert.equal(parsed.value.id, 41);
    assert.ok(!task('replayPuzzle', { ...replayPayload(), extra: 1 }).ok);
    assert.ok(!parseTaskMessage({ type: 'task', id: 1, kind: 'replayPuzzle' }).ok, 'a task needs its payload');
    for (const kind of ['replay', 'replayPuzzles', 'ReplayPuzzle', 'replayPuzzle ']) {
      const refused = task(/** @type {any} */ (kind), replayPayload());
      assert.ok(!refused.ok, kind);
      assert.equal(refused.issues[0].code, 'unknown-kind', kind);
      assert.ok(!isTaskKind(kind), kind);
    }
  });
});

describe('worker messages', () => {
  test('accepts progress, result and error replies', () => {
    const candidate = { component: 'core', group: 2, position: 2, expected: '9', typed: '0', correctedCode: '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE' };
    const good = [
      { type: 'progress', id: 1, stage: 'search', rowTrials: 50000, bytes: 1024 },
      { type: 'result', id: 2, value: { any: ['thing'] } },
      { type: 'result', id: 2, value: null },
      { type: 'error', id: 3, code: 'model-too-large', message: 'too big' },
      { type: 'error', id: 3, code: 'invalid-pack', message: '', issues: [{ code: 'x', path: '$', message: 'm' }] },
      { type: 'error', id: 4, code: 'bad-char', message: 'm', issues: [{ code: 'bad-char', path: '$', message: 'm', params: { char: '!', at: 3 } }] },
      { type: 'error', id: 5, code: 'core-check', message: 'm', issues: [{ code: 'core-check', path: '$', message: 'm', candidate }] },
    ];
    for (const message of good) {
      const parsed = parseWorkerMessage(message);
      assert.ok(parsed.ok, JSON.stringify(message));
      assert.deepEqual(parsed.value, message);
    }
  });

  test('a difficulty-v3 rating claim in a result reply is unchanged', () => {
    const message = { type: 'result', id: 9, value: V3_ESTIMATE };
    const parsed = parseWorkerMessage(message);
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value, message);
    assert.equal(JSON.stringify(/** @type {any} */ (parsed.value).value), JSON.stringify(V3_ESTIMATE));
    assert.equal(JSON.stringify(parsed.value), JSON.stringify(message));
  });

  test('puzzle-code error issues keep valid params and candidates only', () => {
    const issue = { code: 'core-check', path: '$', message: 'm' };
    const candidate = { component: 'tail', group: 1, position: 4, expected: 'A', typed: 'B', correctedCode: 'AAAA.BBBB' };
    const wrap = (/** @type {object} */ extra) => ({ type: 'error', id: 1, code: 'core-check', message: 'm', issues: [{ ...issue, ...extra }] });
    assert.ok(parseWorkerMessage(wrap({ candidate })).ok);
    for (const extra of [
      { params: 'x' }, { params: { a: {} } }, { params: { a: Infinity } }, { params: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, i])) },
      { params: { a: 'x'.repeat(257) } }, { candidate: { ...candidate, component: 'head' } }, { candidate: { ...candidate, position: 5 } },
      { candidate: { ...candidate, group: 0 } }, { candidate: { ...candidate, expected: 'AB' } }, { candidate: { ...candidate, extra: 1 } },
      { candidate: { ...candidate, correctedCode: 'A'.repeat(16002) } }, { candidate: 'AAAA' }, { unknown: 1 },
    ]) {
      assert.ok(!parseWorkerMessage(wrap(extra)).ok, JSON.stringify(extra).slice(0, 60));
    }
  });

  test('rejects malformed replies', () => {
    const bad = [
      null, 5, 'result', [], () => 1,
      { type: 'result', id: 1 },
      { type: 'result', id: -1, value: 1 },
      { type: 'result', id: 1.5, value: 1 },
      { type: 'result', id: 1, value: 1, extra: 1 },
      { type: 'progress', id: 1, stage: 'x', rowTrials: -1, bytes: 0 },
      { type: 'progress', id: 1, stage: '', rowTrials: 0, bytes: 0 },
      { type: 'progress', id: 1, stage: 'x', rowTrials: 0, bytes: NaN },
      { type: 'progress', id: 1, stage: 'x', rowTrials: 0 },
      { type: 'error', id: 1, code: '', message: 'm' },
      { type: 'error', id: 1, code: 'c', message: 5 },
      { type: 'error', id: 1, code: 'c', message: 'm', issues: [{ code: 'x' }] },
      { type: 'error', id: 1, code: 'c', message: 'm', issues: 'none' },
      { type: 'task', id: 1, kind: 'rate', payload: {} },
      { id: 1 },
    ];
    for (const message of bad) {
      const parsed = parseWorkerMessage(message);
      assert.ok(!parsed.ok, String(JSON.stringify(message)));
      assert.ok(parsed.issues.length > 0);
    }
  });
});
