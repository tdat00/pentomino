// @ts-check
// The proof bundles prior-replay and legacy (P2-12e): the judgments, on synthetic case records.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { judgeEqual, judgeReplay } from './proof-legacy.mjs';
import { bundleStatus, judgeSeed, PRIOR_TABLE, SCREEN_TABLE, startCountOf } from './proof-prior-replay.mjs';

const VERSIONS = Object.freeze({
  algo: 'gen-v4', policy: 'p', rng: 'r', seedScheme: 's', ratingModel: 'm', priorTable: PRIOR_TABLE, screenTable: SCREEN_TABLE,
});

/** @param {Record<string, unknown>} [over] @returns {any} A Hell 1 record that passes every check. */
const record = (over = {}) => ({
  id: 'p1', kind: 'candidate', dispatched: 6, stored: 6, versions: VERSIONS, replay: 'matched', ...over,
});

/** @param {Record<string, unknown>} [over] @returns {any} A Hell 1 seed that passes every check. */
const seed = (over = {}) => ({
  level: 'hell-1',
  K: 20,
  expected: 6,
  dispatches: [{ slot: 1, attempt: 0, igPrior: 6 }],
  records: [record()],
  setVersions: VERSIONS,
  start: { igPrior: 6, K: 20, count: 6 },
  ...over,
});

describe('the prior and replay bundle', () => {
  it('a seed that carries its prior end to end passes', () => {
    assert.equal(judgeSeed(seed()).status, 'pass');
    assert.equal(judgeSeed(seed({ level: 'nightmare', expected: null, dispatches: [{ slot: 1, attempt: 0, igPrior: null }], records: [record({ dispatched: null, stored: null })], start: null })).status, 'pass');
  });

  it('a dispatched prior that does not reach the record fails', () => {
    const verdict = judgeSeed(seed({ records: [record({ id: 'puzzle-7', dispatched: 6, stored: null })] }));
    assert.equal(verdict.status, 'fail');
    assert.ok(verdict.problems.some((p) => p.includes('puzzle-7') && p.includes('stored null')));
    const lost = judgeSeed(seed({ dispatches: [{ slot: 1, attempt: 0, igPrior: null }], records: [record({ dispatched: null, stored: null })] }));
    assert.equal(lost.status, 'fail');
  });

  it('an empty replay sample is not measured', () => {
    const none = judgeSeed(seed({ records: [], dispatches: [], start: null }));
    assert.equal(none.status, 'not-measured');
    const calibrationOnly = judgeSeed(seed({ records: [record({ kind: 'calibration', dispatched: null, stored: null, versions: null })], dispatches: [], start: null }));
    assert.equal(calibrationOnly.status, 'not-measured');
    assert.equal(judgeReplay([{ id: 'c', kind: 'calibration', replay: null }]).status, 'not-measured');
    assert.equal(judgeReplay([]).status, 'not-measured');
    assert.equal(judgeReplay([{ id: 'c', kind: 'candidate', replay: 'matched' }]).status, 'pass');
    assert.equal(judgeReplay([{ id: 'c', kind: 'candidate', replay: 'mismatch' }]).status, 'fail');
    assert.equal(bundleStatus([{ status: 'pass' }, { status: 'not-measured' }]), 'fail');
    assert.equal(bundleStatus([]), 'fail');
    assert.equal(bundleStatus([{ status: 'pass' }]), 'pass');
  });

  it('a start count different from the prior fails', () => {
    assert.equal(startCountOf(6, 20), 6);
    assert.equal(startCountOf(30, 20), 18);
    assert.equal(startCountOf(0, 20), 1);
    const verdict = judgeSeed(seed({ start: { igPrior: 6, K: 20, count: 5 } }));
    assert.equal(verdict.status, 'fail');
    assert.ok(verdict.problems.some((p) => p.startsWith('start:')));
    assert.equal(judgeSeed(seed({ start: { igPrior: 30, K: 20, count: 18 } })).status, 'pass');
  });

  it('a record without its seven keys fails', () => {
    const { rng: _rng, ...six } = VERSIONS;
    assert.equal(judgeSeed(seed({ records: [record({ versions: six })] })).status, 'fail');
    assert.equal(judgeSeed(seed({ records: [record({ versions: { ...VERSIONS, priorTable: 'prior-s2' } })] })).status, 'fail');
  });
});

describe('the legacy bundle', () => {
  /** @param {string} second @returns {any} */
  const view = (second) => ({
    pieces: [{ id: 0 }],
    accepted: [{ layoutKey: 'l0', clueKey: 'c0', score: 60 }, { layoutKey: 'l1', clueKey: second, score: 61 }],
  });

  it('legacy differences are reported by path', () => {
    assert.equal(judgeEqual(view('c1'), view('c1')).status, 'pass');
    const verdict = judgeEqual(view('c1'), view('other'));
    assert.equal(verdict.status, 'fail');
    assert.ok(verdict.problems.some((p) => p.includes('accepted.1.clueKey')));
  });

  it('two empty accepted lists are not measured', () => {
    assert.equal(judgeEqual({ pieces: [], accepted: [] }, { pieces: [], accepted: [] }).status, 'not-measured');
  });
});
