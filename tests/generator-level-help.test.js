// @ts-check
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { pieceCountPlan } from '../core/engine/policy.js';
import { setLocale } from '../generator/i18n.js';
import { describeCount } from '../generator/state.js';
import { levelHelp } from '../generator/ui/level-help.js';

afterEach(() => {
  setLocale('en', null);
});

/** @param {ReturnType<typeof levelHelp>} help */
const lines = (help) => (help?.lines ?? []).map((line) => [line.text, line.value, line.result]);

test('pre-placed help shows share × pieces = value → rounded result for the smallest and largest count', () => {
  const help = levelHelp('placed', 'hard', 360);
  assert.equal(help?.title, 'Pre-placed pieces');
  assert.deepEqual(lines(help), [
    ['38% × 16 pieces', '6.08', '6 pieces'],
    ['38% × 18 pieces', '6.84', '7 pieces'],
  ]);
  const count = describeCount('hard', 360);
  assert.deepEqual([count?.placedMin, count?.placedMax], [6, 7], 'the help ends on the numbers in the table');
});

test('piece-size help works the window out from the largest and smallest piece counts', () => {
  assert.deepEqual(lines(levelHelp('size', 'hard', 360)), [
    ['Smallest: 60% × 360 squares ÷ 18 pieces', undefined, '12 squares'],
    ['Largest: 150% × 360 squares ÷ 16 pieces', '33.75', '34 squares'],
  ]);
});

test('piece-count help follows the policy plan and ends on the table range', () => {
  const plan = /** @type {NonNullable<ReturnType<typeof pieceCountPlan>>} */ (pieceCountPlan('hard', 360));
  const help = levelHelp('pieces', 'hard', 360);
  const shown = lines(help);
  assert.equal(shown[0][0], 'Target: 10 × (360 ÷ 60)^0.28');
  assert.equal(shown[1][0], `Spread: ${Math.round(plan.mid * 100) / 100} ± ${Math.round(plan.spread * 100) / 100}`);
  assert.equal(shown[1][1], '16–18');
  assert.equal(shown[2][0], `This board fits ${plan.low}–${plan.high} pieces`);
  assert.deepEqual(shown.at(-1), ['Result', undefined, '16–18 pieces']);
  const capped = lines(levelHelp('pieces', 'hell-1', 676));
  assert.deepEqual(capped.find((line) => line[0] === 'Most for this level'), ['Most for this level', '42', undefined], 'the Hell cap is shown when it applies');
});

test('help follows the page language and is null for a level the board cannot use', () => {
  setLocale('vi', null);
  assert.deepEqual(lines(levelHelp('placed', 'hard', 360))[0], ['38% × 16 mảnh', '6,08', '6 mảnh']);
  assert.equal(levelHelp('pieces', 'nightmare', 60), null);
  assert.equal(levelHelp('size', 'hard', 0), null);
});
