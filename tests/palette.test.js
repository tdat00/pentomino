// @ts-check
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BASE_COLORS, colorFor, labelFor, patternFor, textColorFor } from '../core/engine/palette.js';

test('base colors are the 20-color palette in order', () => {
  assert.equal(BASE_COLORS.length, 20);
  assert.equal(BASE_COLORS[0], '#e6194b');
  assert.equal(BASE_COLORS[19], '#a9a9a9');
  for (let i = 0; i < 20; i += 1) {
    assert.equal(colorFor(i), BASE_COLORS[i]);
  }
  assert.ok(Object.isFrozen(BASE_COLORS));
});

test('generated colors are deterministic hex, hue-spread and lightness-alternating', () => {
  assert.equal(colorFor(20), colorFor(20));
  const lightness = (/** @type {string} */ hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
  };
  for (let i = 20; i < 60; i += 1) {
    const hex = colorFor(i);
    assert.match(hex, /^#[0-9a-f]{6}$/);
    assert.ok(Math.abs(lightness(hex) - (i % 2 === 0 ? 0.45 : 0.65)) < 0.01, `lightness ${i}`);
  }
  // 20 * 137.508 mod 360 = 230.16 degrees: a blue with a little green.
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(colorFor(20).slice(i, i + 2), 16));
  assert.ok(r < g && g < b);
});

test('colors are valid and distinct across the 128-piece envelope', () => {
  const colors = Array.from({ length: 128 }, (_, i) => colorFor(i));
  for (const c of colors) {
    assert.match(c, /^#[0-9a-f]{6}$/);
  }
  assert.equal(new Set(colors).size, 128);
});

test('labels use spreadsheet numbering with boundaries', () => {
  const cases = new Map([
    [0, 'A'], [1, 'B'], [25, 'Z'], [26, 'AA'], [27, 'AB'], [51, 'AZ'], [52, 'BA'],
    [701, 'ZZ'], [702, 'AAA'], [18277, 'ZZZ'], [18278, 'AAAA'], [475253, 'ZZZZ'],
  ]);
  for (const [index, label] of cases) {
    assert.equal(labelFor(index), label, String(index));
  }
  const labels = Array.from({ length: 1000 }, (_, i) => labelFor(i));
  assert.equal(new Set(labels).size, 1000);
  for (const bad of [-1, 1.5, Number.NaN, Infinity, 475254]) {
    assert.throws(() => labelFor(bad), RangeError, String(bad));
  }
});

test('patterns apply only to indices >= 20 in sets larger than 20', () => {
  for (let i = 0; i < 20; i += 1) {
    assert.equal(patternFor(i, 90), 'none');
  }
  for (let i = 0; i < 60; i += 1) {
    assert.equal(patternFor(i, 20), 'none');
  }
  assert.deepEqual([20, 39, 40, 59, 60, 79, 80, 100].map((i) => patternFor(i, 21)), [
    'hlines', 'hlines', 'vlines', 'vlines', 'dots', 'dots', 'hlines', 'vlines',
  ]);
  assert.equal(patternFor(20, 21), 'hlines');
  assert.throws(() => patternFor(-1, 30), RangeError);
});

test('text color picks the higher WCAG contrast', () => {
  assert.equal(textColorFor('#000000'), '#ffffff');
  assert.equal(textColorFor('#ffffff'), '#000000');
  assert.equal(textColorFor('#ffe119'), '#000000');
  assert.equal(textColorFor('#000075'), '#ffffff');
  assert.equal(textColorFor('#4363d8'), '#ffffff');
  assert.equal(textColorFor('#E6194B'), '#000000');
  assert.equal(textColorFor('#707070'), '#ffffff');
  assert.equal(textColorFor('#777777'), '#000000');
  for (const bad of ['fff', '#fff', '#gggggg', '#12345678', '', /** @type {any} */ (null)]) {
    assert.throws(() => textColorFor(bad), RangeError);
  }
});
