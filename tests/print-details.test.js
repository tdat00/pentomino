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

test('what is not known is left out of the printed heading', () => {
  const t = lookup(PRINT_TEXTS_EN);
  assert.deepEqual(plain(puzzleDetails(t, { level: 'Easy', score: 8, saturated: true })), ['**Easy**: score 8+']);
  assert.deepEqual(puzzleDetails(t, null), []);
});

test('the texts of the removed lines are gone from both languages', () => {
  for (const pack of [PRINT_TEXTS_EN, PRINT_TEXTS_VI]) {
    for (const key of ['seed', 'rating', 'set', 'setSeed', 'code', 'codeTail', 'codeContinued', 'codeMore']) {
      assert.equal(Object.hasOwn(pack, `print.sheet.${key}`), false, key);
    }
    assert.equal(Object.hasOwn(pack, 'print.code.target'), false);
  }
});
