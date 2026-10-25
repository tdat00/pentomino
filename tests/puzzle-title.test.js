// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_NUMBERED_TITLE_CODE_POINTS, puzzleCodeTitle, puzzleDisplayName } from '../core/browser/puzzle-title.js';

/** @param {number} n */
const english = (n) => `Puzzle #${n}`;
/** @param {number} n */
const vietnamese = (n) => `Đề #${n}`;
/** @param {number} count @param {string} [unit] */
const ofLength = (count, unit = 'a') => unit.repeat(count);
/** @param {string} text */
const points = (text) => [...text].length;

test('an untitled puzzle is "Puzzle #n" or "Đề #n" at its one-based position', () => {
  assert.equal(puzzleDisplayName(undefined, 0, english), 'Puzzle #1');
  assert.equal(puzzleDisplayName('', 1, english), 'Puzzle #2');
  assert.equal(puzzleDisplayName(null, 99, english), 'Puzzle #100');
  assert.equal(puzzleDisplayName(undefined, 0, vietnamese), 'Đề #1');
  assert.equal(puzzleDisplayName('', 6, vietnamese), 'Đề #7');
  assert.equal(puzzleDisplayName(undefined, 2), 'Puzzle #3', 'English without a callback');
});

test('a title that ends in "#" and digits is shown as it is; any other short title gets " #n"', () => {
  assert.equal(puzzleDisplayName('Hard #3', 0, english), 'Hard #3');
  assert.equal(puzzleDisplayName('Hard #3', 40, english), 'Hard #3');
  assert.equal(puzzleDisplayName('Puzzle #7', 5, english), 'Puzzle #7');
  assert.equal(puzzleDisplayName('Foo#12', 1, english), 'Foo#12', 'no space needed before the number');
  assert.equal(puzzleDisplayName('Normal', 0, english), 'Normal #1');
  assert.equal(puzzleDisplayName('Normal', 1, english), 'Normal #2');
  assert.equal(puzzleDisplayName('Normal', 99, english), 'Normal #100');
  assert.equal(puzzleDisplayName('Level #x', 1, english), 'Level #x #2', '"#" without digits at the end is not a number');
  assert.equal(puzzleDisplayName('Hard #3 (hint)', 1, english), 'Hard #3 (hint) #2', 'the number must be last');
});

test('a title of more than 75 code points is never numbered, whatever its position', () => {
  assert.equal(MAX_NUMBERED_TITLE_CODE_POINTS, 75);
  const at75 = ofLength(75);
  assert.equal(puzzleDisplayName(at75, 0, english), `${at75} #1`);
  assert.equal(puzzleDisplayName(at75, 99, english), `${at75} #100`);
  assert.equal(points(puzzleDisplayName(at75, 99, english)), 80, '75 + " #100" is exactly the 80 of a pack');
  for (const length of [76, 77, 80]) {
    const title = ofLength(length);
    for (const index of [0, 1, 99]) {
      assert.equal(puzzleDisplayName(title, index, english), title, `${length} code points at ${index}`);
    }
  }
});

test('code points, not UTF-16 units, are counted', () => {
  const astral75 = ofLength(75, '😀');
  const astral76 = ofLength(76, '😀');
  assert.equal(astral75.length, 150);
  assert.equal(puzzleDisplayName(astral75, 1, english), `${astral75} #2`, '75 astral characters still take a number');
  assert.equal(puzzleDisplayName(astral76, 1, english), astral76, '76 astral characters do not');
  const accented = ofLength(76, 'ế');
  assert.equal(puzzleDisplayName(accented, 3, vietnamese), accented);
});

test('the code carries the stored title of the first puzzle and the displayed heading of any other', () => {
  assert.equal(puzzleCodeTitle(undefined, 0, english), null, 'absent stays absent');
  assert.equal(puzzleCodeTitle('', 0, english), null, 'empty becomes absent');
  assert.equal(puzzleCodeTitle('Normal', 0, english), 'Normal');
  assert.equal(puzzleCodeTitle('Hard #3', 0, english), 'Hard #3');
  assert.equal(puzzleCodeTitle('Normal', 1, english), 'Normal #2');
  assert.equal(puzzleCodeTitle('Hard #3', 5, english), 'Hard #3');
  assert.equal(puzzleCodeTitle(undefined, 1, english), 'Puzzle #2', 'literal, in the language of the sheet');
  assert.equal(puzzleCodeTitle('', 4, vietnamese), 'Đề #5');
  const long = ofLength(78);
  assert.equal(puzzleCodeTitle(long, 6, english), long);
});

test('the re-created puzzle shows exactly the heading that was printed', () => {
  const titles = [undefined, null, '', 'Normal', 'Hard #3', 'Foo#9', 'Level #x', ofLength(75), ofLength(76), ofLength(80), ofLength(75, '😀'), ofLength(76, '😀')];
  for (const untitled of [english, vietnamese]) {
    for (const title of titles) {
      for (const index of [0, 1, 2, 9, 98, 99]) {
        const printed = puzzleDisplayName(title, index, untitled);
        const encoded = puzzleCodeTitle(title, index, untitled);
        assert.ok(encoded === null || points(encoded) <= 80, 'the encoded title fits a pack title');
        assert.equal(puzzleDisplayName(encoded, 0, untitled), printed, `${JSON.stringify(title)} at ${index}`);
      }
    }
  }
});
