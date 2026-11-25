// @ts-check
// The proof bundles observer and certificate (P2-12c): the judgments, on synthetic case records. The two bundles
// themselves run as locked rehearsals (proofs.mjs <bundle> --quick).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { judgeCertificate } from './proof-certificate.mjs';
import { judgeObserverCase } from './proof-observer.mjs';

const VIEW = Object.freeze({ ok: true, clues: ['a', 'b'], rating: { score: 60 }, skips: { subsets: [], repairs: [] }, igWindow: null, counters: { budgetStops: 0 } });

/** @param {Record<string, unknown>} [over] @returns {any} A case record that passes every check. */
const observed = (over = {}) => ({
  views: { none: VIEW, charge: VIEW, record: VIEW, traced: VIEW },
  units: { charge: 100, record: 100, traced: 100 },
  journal: { complete: true, problems: [], calls: 1, lo: 100, hi: 100 },
  ...over,
});

describe('the observer bundle', () => {
  it('a case whose observers change nothing and whose journal sums to the charge passes', () => {
    assert.deepEqual(judgeObserverCase(observed()), { status: 'pass', problems: [] });
  });

  it('a missing or incomplete journal fails the observer case', () => {
    const missing = judgeObserverCase(observed({ journal: null }));
    assert.equal(missing.status, 'fail');
    assert.ok(missing.problems.includes('no journal was read'));
    const incomplete = judgeObserverCase(observed({ journal: { complete: false, problems: ['missing caps c1'], calls: 1, lo: 100, hi: 100 } }));
    assert.equal(incomplete.status, 'fail');
    assert.ok(incomplete.problems.some((p) => p.includes('incomplete') && p.includes('missing caps c1')));
  });

  it('a traced sum different from the charge fails', () => {
    const verdict = judgeObserverCase(observed({ journal: { complete: true, problems: [], calls: 1, lo: 90, hi: 90 } }));
    assert.equal(verdict.status, 'fail');
    assert.ok(verdict.problems.some((p) => p.includes('90') && p.includes('100')));
    assert.equal(judgeObserverCase(observed({ journal: { complete: true, problems: [], calls: 1, lo: 90, hi: 100 } })).status, 'fail');
  });

  it('an observer that changes a result or the metered units fails', () => {
    const changed = judgeObserverCase(observed({ views: { none: VIEW, charge: VIEW, record: { ...VIEW, rating: { score: 61 } }, traced: VIEW } }));
    assert.equal(changed.status, 'fail');
    assert.ok(changed.problems.some((p) => p.includes('record') && p.includes('rating.score')));
    assert.equal(judgeObserverCase(observed({ units: { charge: 100, record: 101, traced: 100 } })).status, 'fail');
  });
});

describe('the certificate bundle', () => {
  /** @param {number} score @param {number} work @param {number} census @returns {any} */
  const rating = (score, work, census) => ({ score, metrics: { work: work + census, censusWork: census } });
  /** @param {any} screen @param {any} canonical @param {string} [id] @returns {any} */
  const screenOf = (screen, canonical, id = 'p1') => ({ clues: [id], W: 100, screen, canonical });
  /** @param {any[]} screens @param {string | null} [sameResult] @returns {any} */
  const corpusOf = (screens, sameResult = null) => [{ case: '14x14-nightmare-0', sameResult, screens }];

  it('certified, screen-capped and capped ratings that agree with the canonical one pass', () => {
    const verdict = judgeCertificate(corpusOf([
      screenOf({ rating: rating(60, 50, 5) }, { rating: rating(60, 50, 5) }),
      screenOf({ rating: rating(40, 150, 5) }, { rating: rating(70, 400, 5) }, 'p2'),
      screenOf({ capped: true }, { capped: true }, 'p3'),
    ]));
    assert.equal(verdict.status, 'pass');
    assert.deepEqual(verdict.counts, { certified: 1, screenCapped: 1, capped: 1 });
  });

  it('a certified rating different from the canonical one fails', () => {
    const verdict = judgeCertificate(corpusOf([
      screenOf({ rating: rating(60, 50, 5) }, { rating: rating(60, 50, 5) }),
      screenOf({ rating: rating(60, 50, 5) }, { rating: rating(61, 50, 5) }, 'p2'),
    ]));
    assert.equal(verdict.status, 'fail');
    assert.ok(verdict.problems.some((p) => p.startsWith('14x14-nightmare-0:') && p.includes('p2') && p.includes('score')));
    assert.equal(verdict.cases[0].status, 'fail');
  });

  it('an uncertified rating that the canonical run completes within W fails', () => {
    const verdict = judgeCertificate(corpusOf([
      screenOf({ rating: rating(60, 50, 5) }, { rating: rating(60, 50, 5) }),
      screenOf({ rating: rating(40, 150, 5) }, { rating: rating(60, 90, 5) }, 'p2'),
    ]));
    assert.equal(verdict.status, 'fail');
  });

  it('a seam that changes the result, or a corpus without evidence, fails', () => {
    const certified = screenOf({ rating: rating(60, 50, 5) }, { rating: rating(60, 50, 5) });
    assert.equal(judgeCertificate(corpusOf([certified], 'rating.score')).status, 'fail');
    assert.equal(judgeCertificate(corpusOf([])).status, 'fail');
    assert.equal(judgeCertificate([]).status, 'fail');
    assert.equal(judgeCertificate(corpusOf([screenOf({ capped: true }, { capped: true })])).status, 'fail');
  });
});
