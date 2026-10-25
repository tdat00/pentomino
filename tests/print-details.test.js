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

test('the printed heading names the rating, the seed and the piece set, with the levels in bold', () => {
  const t = lookup(PRINT_TEXTS_EN);
  assert.deepEqual(plain(puzzleDetails(t, { level: 'Nightmare', score: 123.4 }, '4567', { level: 'Expert', seed: 'ABCD-EFGH-JKLM' })),
    ['**Nightmare**: score 123, seed 4567', 'Set: **Expert**, ABCD-EFGH-JKLM']);
  assert.deepEqual(plain(puzzleDetails(lookup(PRINT_TEXTS_VI), { level: 'Khó', score: 8 }, '1', null)), ['**Khó**: điểm 8, seed 1']);
});

test('what is not known is left out of the printed heading', () => {
  const t = lookup(PRINT_TEXTS_EN);
  assert.deepEqual(plain(puzzleDetails(t, { level: 'Easy', score: 8, saturated: true }, undefined, null)), ['**Easy**: score 8+']);
  assert.deepEqual(plain(puzzleDetails(t, null, '9', { level: null, seed: 'S' })), ['Seed: 9', 'Set: S']);
  assert.deepEqual(puzzleDetails(t, null, null, { level: 'Hard', seed: '' }), []);
});
