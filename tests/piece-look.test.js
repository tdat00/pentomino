// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BASE_COLORS, labelFor } from '../core/engine/palette.js';
import { displayColor, inkFor, luma, pieceGlyph, pieceLabelText } from '../core/browser/piece-look.js';

test('a label is always shown as one character, with a mark for each round of the alphabet past Z', () => {
  assert.deepEqual(pieceGlyph('A'), { char: 'A', mark: 'none' });
  assert.deepEqual(pieceGlyph('Z'), { char: 'Z', mark: 'none' });
  assert.deepEqual(pieceGlyph('AA'), { char: 'A', mark: 'circle' });
  assert.deepEqual(pieceGlyph('AZ'), { char: 'Z', mark: 'circle' });
  assert.deepEqual(pieceGlyph('BA'), { char: 'A', mark: 'square' });
  assert.deepEqual(pieceGlyph('CA'), { char: 'A', mark: 'disc' });
  assert.deepEqual(pieceGlyph('F'), { char: 'F', mark: 'none' }, 'a hand-written label is kept');
  const seen = new Set();
  for (let i = 0; i < 104; i += 1) {
    const { char, mark } = pieceGlyph(labelFor(i));
    assert.equal(char.length, 1, `label ${labelFor(i)}`);
    seen.add(`${char}|${mark}`);
  }
  assert.equal(seen.size, 104, 'every piece of a set up to 104 pieces looks different');
});

test('the text form encloses the letter the way the board draws it', () => {
  assert.equal(pieceLabelText('C'), 'C');
  assert.equal(pieceLabelText('AA'), 'Ⓐ');
  assert.equal(pieceLabelText('AC'), 'Ⓒ');
  assert.equal(pieceLabelText('BA'), '🄰');
  assert.equal(pieceLabelText('CB'), '🅑');
});

test('the drawn colours keep the stored ones apart on a black-and-white print', () => {
  const drawn = BASE_COLORS.map(displayColor);
  assert.equal(new Set(drawn).size, BASE_COLORS.length, 'one drawn colour per base colour');
  for (let i = 1; i < drawn.length; i += 1) {
    assert.ok(Math.abs(luma(drawn[i]) - luma(drawn[i - 1])) >= 25, `pieces ${labelFor(i - 1)} and ${labelFor(i)} differ in grey`);
  }
  assert.equal(displayColor('#123456'), '#123456', 'a colour that is not a base colour is drawn as stored');
  assert.equal(displayColor('#E6194B'), drawn[0], 'case does not matter');
});

test('the letter is black or white, whichever stands out from the fill in grey', () => {
  for (const fill of [...BASE_COLORS.map(displayColor), '#000000', '#ffffff', '#808080']) {
    const { ink, halo } = inkFor(fill);
    assert.notEqual(ink, halo);
    assert.ok(Math.abs(luma(ink) - luma(fill)) >= 110, `${fill}: ink ${ink}`);
  }
});
