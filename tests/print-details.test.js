// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { puzzleDetails } from '../core/browser/print-dialog.js';
import { PRINT_TEXTS_EN, PRINT_TEXTS_VI } from '../core/browser/print-texts.js';

/**
 * @param {Readonly<Record<string, string>>} pack
 * @returns {(key: string, args?: Record<string, unknown>) => string}
 */
const lookup = (pack) => (key, args = {}) => pack[key].replace(/\{(\w+)\}/g, (_, name) => String(args[name]));

/** @param {ReturnType<typeof puzzleDetails>} lines */
const plain = (lines) => lines.map((line) => line.map((part) => (part.bold === true ? `**${part.text}**` : part.text)).join(''));

test('the printed heading names the rating, with the level in bold, and neither a puzzle seed nor a set line', () => {
  const t = lookup(PRINT_TEXTS_EN);
  assert.deepEqual(plain(puzzleDetails(t, { level: 'Nightmare', score: 123.4 })), ['**Nightmare**: score 123']);
  assert.deepEqual(plain(puzzleDetails(lookup(PRINT_TEXTS_VI), { level: 'Khó', score: 8 })), ['**Khó**: điểm 8']);
});

test('the notes of a rating become one more line each, in both languages; without notes the output is as before', () => {
  const en = lookup(PRINT_TEXTS_EN);
  const notes = ['Re-rated with the current scale (original: Easy 8, difficulty-v2)', 'Decisive estimate: 3 alternatives undecided within the work limit'];
  assert.deepEqual(plain(puzzleDetails(en, { level: 'Hard', score: 14, notes })), ['**Hard**: score 14', ...notes]);
  assert.deepEqual(plain(puzzleDetails(lookup(PRINT_TEXTS_VI), { level: 'Khó', score: 14, saturated: true, notes: ['Không chấm lại được'] })),
    ['**Khó**: điểm 14+', 'Không chấm lại được']);
  assert.deepEqual(puzzleDetails(en, { level: 'Hard', score: 14, notes: ['Could not be re-rated'] })[1], [{ text: 'Could not be re-rated' }], 'a note is plain text');
  assert.deepEqual(puzzleDetails(en, { level: 'Hard', score: 14, notes: [] }), puzzleDetails(en, { level: 'Hard', score: 14 }));
  assert.deepEqual(puzzleDetails(en, null), [], 'no rating, no lines');
  assert.equal(puzzleDetails.length, 2, 'neither a puzzle seed nor a set is a parameter');
});

test('the texts of the removed lines are gone from both languages', () => {
  for (const pack of [PRINT_TEXTS_EN, PRINT_TEXTS_VI]) {
    for (const key of ['seed', 'rating', 'set', 'setSeed', 'code', 'codeTail', 'codeContinued', 'codeMore']) {
      assert.equal(Object.hasOwn(pack, `print.sheet.${key}`), false, key);
    }
    assert.equal(Object.hasOwn(pack, 'print.code.target'), false);
  }
});
