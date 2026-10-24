// @ts-check
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { chooseLanguage } from '../generator/app.js';
import { AVAILABLE, detect, getLocale, has, keys, normalize, packOf, raw, setLocale, t } from '../generator/i18n.js';
import { batchShortfall } from '../generator/jobs.js';
import { defaultGeneratorState, describeBoard, describeLevels } from '../generator/state.js';
import { formatMessage, formatNotice, levelLabel } from '../generator/strings.js';
import { reachableStep, startStep, stepFromSearch, withStep } from '../generator/ui/wizard.js';

const DESKTOP = { phone: false };

afterEach(() => {
  setLocale('en', null);
});

/** @param {string} key */
const baseKey = (key) => key.replace(/_(one|other)$/, '');
/** @param {string} text */
const placeholders = (text) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();

test('both packs hold the same keys with the same placeholders', () => {
  const english = packOf('en');
  const vietnamese = packOf('vi');
  const englishKeys = new Set(Object.keys(english).map(baseKey));
  const vietnameseKeys = new Set(Object.keys(vietnamese).map(baseKey));
  assert.deepEqual([...englishKeys].filter((key) => !vietnameseKeys.has(key)), [], 'keys missing from Vietnamese');
  assert.deepEqual([...vietnameseKeys].filter((key) => !englishKeys.has(key)), [], 'keys missing from English');
  for (const key of Object.keys(vietnamese)) {
    const counterpart = english[key] ?? english[`${baseKey(key)}_other`] ?? english[baseKey(key)];
    assert.deepEqual(placeholders(vietnamese[key]), placeholders(counterpart), `placeholders of ${key}`);
  }
  for (const [key, text] of Object.entries(vietnamese)) {
    assert.ok(text.trim() !== '', `${key} is empty`);
  }
});

test('every key used by the page and the generator code exists in English', () => {
  const english = packOf('en');
  /** @type {string[]} */
  const used = [];
  const html = readFileSync(new URL('../generator/index.html', import.meta.url), 'utf8');
  for (const match of html.matchAll(/data-i18n="([^"]+)"/g)) {
    used.push(match[1]);
  }
  for (const match of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    used.push(...match[1].split(',').map((pair) => pair.slice(pair.lastIndexOf(':') + 1).trim()));
  }
  const sources = ['app.js', 'jobs.js', 'state.js', 'strings.js', ...readdirSync(new URL('../generator/ui/', import.meta.url)).map((name) => `ui/${name}`)];
  for (const name of sources) {
    const code = readFileSync(new URL(`../generator/${name}`, import.meta.url), 'utf8');
    for (const match of code.matchAll(/\b(?:t|loc|has|setActionLabel)\(\s*'([a-z][\w.-]*)'/g)) {
      used.push(match[1]);
    }
    for (const match of code.matchAll(/'(?:aria-label|title)': '([a-z][\w.]+\.[\w.]+)'/g)) {
      used.push(match[1]);
    }
  }
  assert.ok(used.length > 80, 'the scan finds the keys');
  const missing = used.filter((key) => !(key in english) && !(`${key}_other` in english));
  assert.deepEqual([...new Set(missing)], []);
});

test('language detection: URL, stored choice, browser languages, then English', () => {
  assert.equal(normalize('vi-VN'), 'vi');
  assert.equal(normalize('fr'), null);
  assert.deepEqual([...AVAILABLE], ['en', 'vi']);
  assert.equal(detect({ urlLang: 'vi', stored: 'en', navigator: ['en-US'] }), 'vi');
  assert.equal(detect({ urlLang: 'xx', stored: 'vi', navigator: ['en-US'] }), 'vi');
  assert.equal(detect({ stored: 'xx', navigator: { languages: ['fr-FR', 'vi-VN'], language: 'fr-FR' } }), 'vi');
  assert.equal(detect({ navigator: ['de'] }), 'en');
  assert.equal(detect(), 'en');
  const storage = { getItem: () => 'vi' };
  assert.equal(chooseLanguage({ search: '?lang=en', languageStorage: storage, navigator: { languages: [] } }), 'en');
  assert.equal(chooseLanguage({ search: '', languageStorage: storage, navigator: { languages: ['en'] } }), 'vi');
  assert.equal(chooseLanguage({ search: '', languageStorage: null, navigator: { languages: [] } }), 'en');
});

test('text lookup: placeholders, plural forms, fallback to English and to the key', () => {
  assert.equal(t('set.summary.pieces', { count: 1 }), '1 piece');
  assert.equal(t('set.summary.pieces', { count: 9 }), '9 pieces');
  assert.equal(t('no.such.key'), 'no.such.key');
  assert.equal(has('no.such.key'), false);
  assert.equal(setLocale('vi', null), 'vi');
  assert.equal(getLocale(), 'vi');
  assert.equal(t('set.summary.pieces', { count: 1 }), '1 mảnh');
  assert.equal(t('wizard.step3.title'), 'Tạo đề');
  assert.equal(setLocale('fr', null), 'vi', 'an unsupported code is ignored');
  assert.equal(raw('wizard.locked.set'), 'Hãy tạo một bộ mảnh trước.');
  assert.ok(keys('vi').length > 100);
});

test('notices and messages follow the language and stay strict', () => {
  assert.equal(formatNotice('N-SMALL'), 'A board needs at least 30 playable squares to generate puzzles.');
  setLocale('vi', null);
  assert.equal(formatNotice('N-SMALL'), 'Bàn cần ít nhất 30 ô chơi được để tạo đề.');
  assert.equal(formatMessage('M-NEEDS-SET'), 'Hãy tạo một bộ mảnh trước.');
  assert.throws(() => formatNotice('N-CAP', { area: 500 }), /missing \{max\}/);
  assert.throws(() => formatNotice('N-LEVELS', { highest: 'Master' }), /needs a variant/);
  assert.match(formatNotice('N-LEVELS', { highest: 'Master' }, 'above'), /Master/);
});

test('level names and board descriptions are translated', () => {
  assert.equal(levelLabel('hard'), 'Hard');
  setLocale('vi', null);
  assert.equal(levelLabel('hell-2'), 'Địa ngục 2');
  assert.equal(levelLabel('unknown-level'), 'unknown-level');
  assert.equal(describeLevels(60)[0].label, 'Rất dễ');
  assert.equal(describeBoard(defaultGeneratorState(), DESKTOP).statusText, '60 / 60 ô chơi được · liền một khối');
});

test('a stored notice can be written again in the new language', () => {
  const shown = batchShortfall('time-limit', { n: 2, q: 5, levelId: 'normal' });
  assert.ok(shown?.retext !== undefined);
  assert.match(shown.text, /^Found 2 of 5 different Normal puzzles/);
  setLocale('vi', null);
  assert.match(shown.retext(), /^Chỉ tìm được 2 \/ 5 đề Trung bình khác nhau/);
});

test('the wizard opens step 2 only for a board that can get a piece set, and step 3 only with a piece set', () => {
  const fresh = defaultGeneratorState();
  assert.equal(reachableStep(fresh, DESKTOP), 2);
  assert.equal(startStep(fresh), 1);
  const tiny = defaultGeneratorState({ board: { width: 3, height: 3, active: new Uint8Array(9).fill(1) } });
  assert.equal(reachableStep(tiny, DESKTOP), 1, 'a board below the minimum keeps step 2 closed');
  const withSet = defaultGeneratorState({ set: /** @type {any} */ ({ board: fresh.board, pieces: [], witness: null, carving: 'flat', macroRegion: null }) });
  assert.equal(reachableStep(withSet, DESKTOP), 3);
  assert.equal(startStep(withSet), 2);
  assert.equal(startStep({ ...withSet, puzzles: /** @type {any} */ ([{}]) }), 3);
});

test('the step lives in the address and other parameters stay', () => {
  assert.equal(stepFromSearch('?step=2'), 2);
  assert.equal(stepFromSearch('?lang=vi&step=3'), 3);
  for (const bad of ['', '?step=0', '?step=4', '?step=x', '?step=1.5', '?step=']) {
    assert.equal(stepFromSearch(bad), null, bad);
  }
  assert.equal(withStep('http://h/pentomino/generator/?lang=vi#top', 2), 'http://h/pentomino/generator/?lang=vi&step=2#top');
  assert.equal(withStep('http://h/pentomino/generator/?step=1', 3), 'http://h/pentomino/generator/?step=3');
});
