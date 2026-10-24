// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { THEMES, effectiveTheme, normalizeTheme } from '../generator/ui/theme.js';

const css = readFileSync(new URL('../generator/theme.css', import.meta.url), 'utf8').replace(/\r/g, '');

/**
 * @param {string} selector The exact selector text of a rule that only declares tokens.
 * @returns {Record<string, string>} Token name -> value of the first such rule.
 */
function tokensOf(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `rule ${selector} exists`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const themes = {
  light: tokensOf(':root,\n:root[data-theme="light"]'),
  dark: tokensOf(':root[data-theme="dark"]'),
  system: tokensOf('  :root:not([data-theme])'),
  'high-contrast': tokensOf(':root[data-theme="high-contrast"]'),
};

/** @param {string} hex */
function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number} WCAG contrast ratio.
 */
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('the dark palette of the system-preference block equals the explicit dark theme', () => {
  assert.deepEqual(themes.system, themes.dark);
});

test('every theme defines the same tokens, all as hex colours except the shadow', () => {
  const names = Object.keys(themes.light).sort();
  for (const [name, tokens] of Object.entries(themes)) {
    assert.deepEqual(Object.keys(tokens).sort(), names, name);
    for (const [token, value] of Object.entries(tokens)) {
      assert.ok(token === '--gen-shadow-1' || /^#[0-9a-f]{6}$/i.test(value), `${name} ${token}: ${value}`);
    }
  }
});

test('text, controls and notices keep their contrast in every theme', () => {
  /** @type {Array<[string, string, number]>} */
  const pairs = [
    ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text-muted', 'surface', 4.5], ['text-muted', 'bg', 4.5],
    ['text', 'surface-2', 4.5], ['text', 'hover', 4.5], ['disabled-text', 'surface-2', 4.5],
    ['accent-text', 'accent', 4.5], ['accent-text', 'accent-hover', 4.5], ['accent', 'surface', 4.5], ['accent', 'accent-soft', 4.5],
    ['text', 'accent-soft', 4.5],
    ['success', 'surface', 4.5], ['warning', 'surface', 4.5], ['danger', 'surface', 4.5], ['success-bg', 'success', 4.5],
    ['border', 'surface', 3], ['focus', 'surface', 3], ['focus', 'bg', 3], ['board-mark', 'board-bg', 3], ['board-mark', 'board-cell', 3],
  ];
  for (const [name, tokens] of Object.entries(themes)) {
    const strict = name === 'high-contrast' ? 7 : 0;
    for (const [fg, bg, needed] of pairs) {
      const ratio = contrast(tokens[`--gen-color-${fg}`] ?? tokens[`--gen-${fg}`], tokens[`--gen-color-${bg}`] ?? tokens[`--gen-${bg}`]);
      const text = needed === 4.5;
      assert.ok(ratio >= Math.max(needed, text ? strict : 0), `${name}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test('theme choice: only the three themes are accepted; without a choice the system decides', () => {
  assert.deepEqual([...THEMES], ['light', 'dark', 'high-contrast']);
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('auto'), null);
  assert.equal(normalizeTheme(null), null);
  assert.equal(effectiveTheme(null, true), 'dark');
  assert.equal(effectiveTheme(null, false), 'light');
  assert.equal(effectiveTheme('high-contrast', false), 'high-contrast');
  assert.equal(effectiveTheme('nonsense', true), 'dark');
});
