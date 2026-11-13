// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDisplayRatings, displayRatingKey, needsDisplayRating, ratingDisplay } from '../core/browser/display-rating.js';
import { createI18n } from '../core/browser/i18n.js';
import { PRINT_TEXTS_EN, PRINT_TEXTS_VI } from '../core/browser/print-texts.js';
import { PoolAbortError, PoolError, WorkerTaskError } from '../core/browser/worker-pool.js';
import { MODEL } from '../core/engine/difficulty.js';
import { setLocale as setPlayerLocale } from '../player/i18n.js';
import { levelLabel } from '../player/strings.js';

const english = createI18n({ en: PRINT_TEXTS_EN, vi: PRINT_TEXTS_VI });
const vietnamese = createI18n({ en: PRINT_TEXTS_EN, vi: PRINT_TEXTS_VI });
vietnamese.setLocale('vi', null);

const text = { t: english.t, levelLabel };

const v2 = { model: 'difficulty-v2', score: 8, level: 'easy', saturated: false };
const v1 = { model: 'difficulty-v1', score: 30, level: 'hard' };
/** @param {object} [extra] */
const derived = (extra = {}) => ({
  model: 'difficulty-v3', score: 14, level: 'normal', saturated: false, metrics: { censusComplete: true, censusUndecided: 0 }, ...extra,
});
/** A rating whose census did not finish. @param {number} undecided */
const estimate = (undecided) => derived({ censored: true, metrics: { censusComplete: false, censusUndecided: undecided } });

test('needsDisplayRating: only claims of the difficulty-v2 and difficulty-v1 models are rated again', () => {
  assert.equal(needsDisplayRating(v2), true);
  assert.equal(needsDisplayRating(v1), true);
  assert.equal(needsDisplayRating({ model: 'difficulty-v2' }), true);
  for (const claim of [null, undefined, derived(), { model: 'difficulty-v3', score: 14, level: 'normal' }, estimate(2), { model: 'other' }, 'difficulty-v2', 8]) {
    assert.equal(needsDisplayRating(claim), false, JSON.stringify(claim));
  }
});

test('displayRatingKey: the fingerprint and the model; equal puzzles share it', () => {
  assert.equal(displayRatingKey('abc'), `abc|${MODEL}`);
  assert.equal(displayRatingKey('abc'), displayRatingKey('abc'));
  assert.notEqual(displayRatingKey('abc'), displayRatingKey('abd'));
});

test('ratingDisplay: no claim, no rating line', () => {
  assert.equal(ratingDisplay(null, undefined, text), null);
  assert.equal(ratingDisplay(undefined, { status: 'rated', rating: derived() }, text), null);
  assert.equal(ratingDisplay(null, { status: 'pending' }, text), null);
});

test('ratingDisplay: a v2 or v1 claim with a derived rating shows it, with the original in a note', () => {
  const shown = ratingDisplay(v2, { status: 'rated', rating: derived() }, text);
  assert.deepEqual(shown, { rating: derived(), notes: ['Re-rated with the current scale (original: Easy 8, difficulty-v2)'] });
  assert.deepEqual(ratingDisplay(v1, { status: 'rated', rating: derived() }, text)?.notes,
    ['Re-rated with the current scale (original: Hard 30, difficulty-v1)']);
  assert.deepEqual(ratingDisplay({ ...v2, score: 123.4, saturated: true }, { status: 'rated', rating: derived() }, text)?.notes,
    ['Re-rated with the current scale (original: Easy 123+, difficulty-v2)'], 'the original is shown as its line was: rounded, with +');
  assert.equal(ratingDisplay(v2, { status: 'rated', rating: derived({ level: 'hell-2', score: 301 }) }, text)?.rating.level, 'hell-2',
    'the derived level is the worker\'s, whatever the old level was');
});

test('ratingDisplay: an unfinished census of the derived rating adds the estimate note, "+" never', () => {
  const many = ratingDisplay(v2, { status: 'rated', rating: estimate(3) }, text);
  assert.deepEqual(many?.notes, [
    'Re-rated with the current scale (original: Easy 8, difficulty-v2)',
    'Decisive estimate: 3 alternatives undecided within the work limit',
  ]);
  assert.equal(many?.rating.saturated, false);
  assert.equal(ratingDisplay(v2, { status: 'rated', rating: estimate(1) }, text)?.notes[1],
    'Decisive estimate: 1 alternative undecided within the work limit');
  assert.equal(ratingDisplay(v2, { status: 'rated', rating: derived({ censored: true, metrics: undefined }) }, text)?.notes[1],
    'Decisive estimate', 'a rating without metrics gets the short note');
  assert.equal(ratingDisplay(v2, { status: 'rated', rating: derived() }, text)?.notes.length, 1, 'a finished census adds nothing');
});

test('ratingDisplay: a failed or unavailable entry keeps the claim with "Could not be re-rated"', () => {
  for (const entry of [{ status: 'failed', code: 'rating-incomplete' }, { status: 'unavailable' }]) {
    assert.deepEqual(ratingDisplay(v2, /** @type {any} */ (entry), text), { rating: v2, notes: ['Could not be re-rated'] }, entry.status);
    assert.deepEqual(ratingDisplay(v1, /** @type {any} */ (entry), text), { rating: v1, notes: ['Could not be re-rated'] }, entry.status);
  }
  assert.deepEqual(ratingDisplay(v2, { status: 'rated', rating: 'scripted' }, text), { rating: v2, notes: ['Could not be re-rated'] },
    'a reply that is no rating cannot be drawn');
});

test('ratingDisplay: a request not yet settled shows the claim alone', () => {
  for (const entry of [{ status: 'pending' }, undefined]) {
    assert.deepEqual(ratingDisplay(v2, /** @type {any} */ (entry), text), { rating: v2, notes: [] });
  }
});

test('ratingDisplay: a v3 claim is shown as it is, with the estimate note exactly when censored', () => {
  const entries = [undefined, { status: 'pending' }, { status: 'failed', code: 'x' }, { status: 'unavailable' }, { status: 'rated', rating: derived({ score: 99 }) }];
  for (const entry of entries) {
    assert.deepEqual(ratingDisplay(derived(), /** @type {any} */ (entry), text), { rating: derived(), notes: [] });
    assert.deepEqual(ratingDisplay(estimate(2), /** @type {any} */ (entry), text),
      { rating: estimate(2), notes: ['Decisive estimate: 2 alternatives undecided within the work limit'] });
  }
  const summary = { model: 'difficulty-v3', score: 33, level: 'expert', saturated: false, censored: true };
  assert.deepEqual(ratingDisplay(summary, undefined, text), { rating: summary, notes: ['Decisive estimate'] });
  const metricsOnly = { ...derived(), censored: false };
  assert.deepEqual(ratingDisplay(metricsOnly, undefined, text)?.notes, [], 'censored false adds no note');
});

test('ratingDisplay: another model is shown as it is, without notes', () => {
  const other = { model: 'other', score: 5, level: 'easy' };
  for (const entry of [undefined, { status: 'pending' }, { status: 'failed', code: 'x' }, { status: 'rated', rating: derived() }]) {
    assert.deepEqual(ratingDisplay(other, /** @type {any} */ (entry), text), { rating: other, notes: [] });
  }
});

test('ratingDisplay: the notes read well in Vietnamese, with one plural form', () => {
  setPlayerLocale('vi', null);
  try {
    const vi = { t: vietnamese.t, levelLabel };
    assert.deepEqual(ratingDisplay(v2, { status: 'rated', rating: estimate(1) }, vi)?.notes, [
      'Đã chấm lại theo thang điểm hiện tại (gốc: Dễ 8, difficulty-v2)',
      'Ước lượng quyết định: 1 phương án chưa phân định trong giới hạn tính toán',
    ]);
    assert.equal(ratingDisplay(v2, { status: 'rated', rating: estimate(4) }, vi)?.notes[1],
      'Ước lượng quyết định: 4 phương án chưa phân định trong giới hạn tính toán');
    assert.deepEqual(ratingDisplay(v2, { status: 'unavailable' }, vi)?.notes, ['Không chấm lại được']);
    assert.deepEqual(ratingDisplay({ model: 'difficulty-v3', score: 3, level: 'easy', saturated: false, censored: true }, undefined, vi)?.notes,
      ['Ước lượng quyết định']);
  } finally {
    setPlayerLocale('en', null);
  }
});

/** A `submit` whose replies the test settles. */
function scripted() {
  /** @type {{ kind: string, payload: any, signal: AbortSignal, resolve: (v: unknown) => void, reject: (e: unknown) => void }[]} */
  const calls = [];
  return {
    calls,
    /** @param {string} kind @param {any} payload @param {{ signal: AbortSignal }} o */
    submit: (kind, payload, o) => new Promise((resolve, reject) => {
      calls.push({ kind, payload, signal: o.signal, resolve, reject });
    }),
  };
}

/** @param {string} key */
const wish = (key) => ({ key, payload: { boardRows: ['##'], pieces: [], clues: [{ key }] } });

const tick = () => new Promise((resolve) => setImmediate(resolve));

/** @param {Parameters<typeof createDisplayRatings>[0]['limit']} [limit] */
function harness(limit) {
  const pool = scripted();
  /** @type {[string, string | null][]} */
  const changes = [];
  const ratings = createDisplayRatings({
    submit: pool.submit,
    onChange: (key, entry) => changes.push([key, entry?.status ?? null]),
    ...(limit === undefined ? {} : { limit }),
  });
  return { pool, changes, ratings, calls: pool.calls };
}

test('scheduler: one request at a time, in the order of the wishes, duplicates ignored; a value is rated', async () => {
  const { ratings, calls, changes } = harness();
  ratings.want([wish('A'), wish('B'), wish('A'), wish('C')]);
  assert.equal(calls.length, 1);
  assert.deepEqual([calls[0].kind, calls[0].payload], ['rate', wish('A').payload]);
  assert.deepEqual(ratings.get('A'), { status: 'pending' });
  assert.equal(ratings.get('B'), undefined);
  calls[0].resolve({ score: 1 });
  await tick();
  assert.deepEqual(ratings.get('A'), { status: 'rated', rating: { score: 1 } });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].payload, wish('B').payload);
  calls[1].resolve({ score: 2 });
  await tick();
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[2].payload, wish('C').payload);
  calls[2].resolve({ score: 3 });
  await tick();
  assert.deepEqual(changes, [['A', 'pending'], ['A', 'rated'], ['B', 'pending'], ['B', 'rated'], ['C', 'pending'], ['C', 'rated']]);
  assert.equal(calls.length, 3, 'nothing more to ask');
});

test('scheduler: a worker error is a failed entry with its code, and the next wish goes on', async () => {
  const { ratings, calls } = harness();
  ratings.want([wish('A'), wish('B'), wish('C'), wish('D')]);
  calls[0].reject(new WorkerTaskError('rating-incomplete', 'the first path was capped'));
  await tick();
  assert.deepEqual(ratings.get('A'), { status: 'failed', code: 'rating-incomplete' });
  calls[1].reject(new WorkerTaskError('unsatisfiable', 'no solution'));
  await tick();
  assert.deepEqual(ratings.get('B'), { status: 'failed', code: 'unsatisfiable' });
  calls[2].reject(new PoolError('worker-crashed', 'boom'));
  await tick();
  assert.deepEqual(ratings.get('C'), { status: 'failed', code: 'worker-crashed' });
  calls[3].reject(new Error('plain'));
  await tick();
  assert.deepEqual(ratings.get('D'), { status: 'failed', code: 'error' });
});

test('scheduler: a submit that throws is a failed entry', async () => {
  const changes = /** @type {[string, string | null][]} */ ([]);
  const ratings = createDisplayRatings({
    submit: () => {
      throw new TypeError('unknown kind');
    },
    onChange: (key, entry) => changes.push([key, entry?.status ?? null]),
  });
  ratings.want([wish('A')]);
  await tick();
  assert.deepEqual(ratings.get('A'), { status: 'failed', code: 'error' });
});

test('scheduler: a cancel that it did not cause (a new main request) submits the same key again, still pending', async () => {
  const { ratings, calls, changes } = harness();
  ratings.want([wish('A'), wish('B')]);
  calls[0].reject(new PoolAbortError('cancelled'));
  await tick();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].payload, wish('A').payload, 'the same key again, before any other');
  assert.equal(calls[1].signal.aborted, false);
  assert.deepEqual(ratings.get('A'), { status: 'pending' });
  assert.deepEqual(changes, [['A', 'pending']], 'the entry did not flicker');
  calls[1].reject(new PoolAbortError('cancelled'));
  await tick();
  assert.equal(calls.length, 3);
  calls[2].resolve({ score: 1 });
  await tick();
  assert.deepEqual(ratings.get('A'), { status: 'rated', rating: { score: 1 } });
  assert.equal(calls.length, 4, 'then the next wish');
  assert.deepEqual(calls[3].payload, wish('B').payload);
});

test('scheduler: the queue closing removes the entry and asks for nothing more', async () => {
  const { ratings, calls, changes } = harness();
  ratings.want([wish('A'), wish('B')]);
  calls[0].reject(new PoolAbortError('closed'));
  await tick();
  assert.equal(ratings.get('A'), undefined);
  assert.equal(calls.length, 1);
  assert.deepEqual(changes, [['A', 'pending'], ['A', null]]);
});

test('scheduler: a want without the key in flight aborts it and drops the entry, and a late reply is dropped', async () => {
  const { ratings, calls, changes } = harness();
  ratings.want([wish('A'), wish('B')]);
  ratings.want([wish('C')]);
  assert.equal(calls[0].signal.aborted, true, 'its own signal');
  assert.equal(ratings.get('A'), undefined);
  assert.equal(calls.length, 2, 'the next wish was submitted at once');
  assert.deepEqual(calls[1].payload, wish('C').payload);
  assert.deepEqual(changes, [['A', 'pending'], ['A', null], ['C', 'pending']]);
  calls[0].resolve({ score: 1 });
  await tick();
  assert.equal(ratings.get('A'), undefined, 'a late value for a removed key');
  assert.equal(ratings.get('C')?.status, 'pending');
  const before = changes.length;
  calls[0].reject(new PoolAbortError('cancelled'));
  await tick();
  assert.deepEqual([calls.length, changes.length], [2, before], 'a late abort neither resubmits nor changes anything');
  calls[1].resolve({ score: 3 });
  await tick();
  assert.deepEqual(ratings.get('C'), { status: 'rated', rating: { score: 3 } });
});

test('scheduler: a want that keeps the key in flight leaves the request alone, whatever the new order', async () => {
  const { ratings, calls } = harness();
  ratings.want([wish('A'), wish('B')]);
  ratings.want([wish('B'), wish('A')]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].signal.aborted, false);
  calls[0].resolve({ score: 1 });
  await tick();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].payload, wish('B').payload);
});

test('scheduler: worker-unavailable marks the key and every later wish unavailable, and asks for nothing more', async () => {
  const { ratings, calls, changes } = harness();
  ratings.want([wish('A'), wish('B'), wish('C')]);
  calls[0].resolve({ score: 1 });
  await tick();
  calls[1].reject(new PoolError('worker-unavailable', 'no workers'));
  await tick();
  assert.deepEqual([ratings.get('A')?.status, ratings.get('B')?.status, ratings.get('C')?.status], ['rated', 'unavailable', 'unavailable']);
  assert.equal(calls.length, 2, 'no further submit');
  assert.deepEqual(changes.slice(-2), [['B', 'unavailable'], ['C', 'unavailable']]);
  ratings.want([wish('A'), wish('B'), wish('C')]);
  assert.equal(calls.length, 2, 'the same keys are not asked again');
  ratings.want([wish('A'), wish('D')]);
  assert.equal(calls.length, 3, 'a want with a new key tries again');
  assert.deepEqual(calls[2].payload, wish('D').payload);
});

test('scheduler: rated and failed entries are kept and never requested again', async () => {
  const { ratings, calls } = harness();
  ratings.want([wish('A'), wish('B')]);
  calls[0].resolve({ score: 1 });
  await tick();
  calls[1].reject(new WorkerTaskError('rating-incomplete', 'capped'));
  await tick();
  ratings.want([wish('B'), wish('A')]);
  ratings.want([]);
  ratings.want([wish('A'), wish('B')]);
  await tick();
  assert.equal(calls.length, 2);
  assert.deepEqual([ratings.get('A')?.status, ratings.get('B')?.status], ['rated', 'failed']);
});

test('scheduler: at most `limit` entries are kept; the oldest settled one that no wish needs goes first', async () => {
  const { ratings, calls, changes } = harness(2);
  ratings.want([wish('A'), wish('B')]);
  calls[0].resolve({ score: 1 });
  await tick();
  calls[1].resolve({ score: 2 });
  await tick();
  ratings.want([wish('C')]);
  assert.equal(ratings.get('A'), undefined, 'removed for room as soon as C has an entry');
  assert.equal(ratings.get('B')?.status, 'rated');
  calls[2].resolve({ score: 3 });
  await tick();
  assert.deepEqual([ratings.get('A'), ratings.get('B')?.status, ratings.get('C')?.status], [undefined, 'rated', 'rated']);
  assert.deepEqual(changes.filter(([, status]) => status === null), [['A', null]]);
  ratings.want([wish('A')]);
  assert.equal(calls.length, 4, 'a removed entry is asked for again');
  assert.equal(ratings.get('B'), undefined, 'and the oldest settled one goes in its turn');
});

test('scheduler: only the first `limit` wishes are heard, so a wished entry is never dropped for room and asked again', async () => {
  const { ratings, calls } = harness(2);
  ratings.want([wish('A'), wish('B'), wish('C')]);
  calls[0].resolve({ score: 1 });
  await tick();
  calls[1].resolve({ score: 2 });
  await tick();
  assert.equal(calls.length, 2, 'C is beyond the limit');
  assert.deepEqual([ratings.get('A')?.status, ratings.get('B')?.status, ratings.get('C')], ['rated', 'rated', undefined]);
});

test('scheduler: dispose aborts the request in flight, drops everything and stops', async () => {
  const { ratings, calls, changes } = harness();
  ratings.want([wish('A'), wish('B')]);
  ratings.dispose();
  assert.equal(calls[0].signal.aborted, true);
  assert.equal(ratings.get('A'), undefined);
  const before = changes.length;
  calls[0].resolve({ score: 1 });
  await tick();
  calls[0].reject(new PoolAbortError('cancelled'));
  ratings.want([wish('C')]);
  await tick();
  assert.deepEqual([calls.length, changes.length, ratings.get('A'), ratings.get('C')], [1, before, undefined, undefined]);
});
