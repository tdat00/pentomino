// @ts-check
import assert from 'node:assert/strict';
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

  test('validatePayload reports unknown kinds and verifyPack accepts any pack value', () => {
    assert.ok(!validatePayload('nope', {}).ok);
    assert.ok(validatePayload('verifyPack', { pack: 5 }).ok);
    assert.ok(!validatePayload('verifyPack', {}).ok);
  });
});

describe('worker messages', () => {
  test('accepts progress, result and error replies', () => {
    const good = [
      { type: 'progress', id: 1, stage: 'search', rowTrials: 50000, bytes: 1024 },
      { type: 'result', id: 2, value: { any: ['thing'] } },
      { type: 'result', id: 2, value: null },
      { type: 'error', id: 3, code: 'model-too-large', message: 'too big' },
      { type: 'error', id: 3, code: 'invalid-pack', message: '', issues: [{ code: 'x', path: '$', message: 'm' }] },
    ];
    for (const message of good) {
      const parsed = parseWorkerMessage(message);
      assert.ok(parsed.ok, JSON.stringify(message));
      assert.deepEqual(parsed.value, message);
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
