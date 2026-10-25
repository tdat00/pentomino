// @ts-check
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { baseKey } from '../core/browser/i18n.js';
import { choose, getLocale, has, packOf, setLocale, t } from '../player/i18n.js';
import {
  HINT_TEXT, INDEX_MESSAGE, LABELS, PLAY_TEXT, certificateLabel, levelLabel, puzzleStatusLabel, ratingLabel, reasonText, restorationNotice,
  verificationLabel,
} from '../player/strings.js';
import { shortcutList } from '../player/ui/keyboard.js';

afterEach(() => {
  setLocale('en', null);
});

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

test('every key the player code uses exists in English', () => {
  const english = packOf('en');
  /** @type {Set<string>} */
  const used = new Set();
  const files = ['app.js', 'strings.js', ...readdirSync(new URL('../player/ui/', import.meta.url)).map((name) => `ui/${name}`)];
  for (const name of files) {
    const code = readFileSync(new URL(`../player/${name}`, import.meta.url), 'utf8');
    for (const match of code.matchAll(/'((?:ui|keys|level|rating|cert|verify|status|msg|play|reason|hint|live|shell|puzzles|pieces|card|start)\.[\w.-]+)'/g)) {
      used.add(match[1]);
    }
    // Names listed for texts('prefix', [...]) stand for the keys `prefix.name`.
    for (const block of code.matchAll(/texts\('(\w+)', \[([^\]]*)\]/g)) {
      for (const [, word] of block[2].matchAll(/'(\w+)'/g)) {
        used.add(`${block[1]}.${word}`);
      }
    }
  }
  // Keys that the code builds from a value.
  for (const reason of ['outside', 'blocked', 'clue', 'overlap', 'other']) {
    used.add(`reason.${reason}`);
  }
  for (const status of ['new', 'in-progress', 'solved', 'revealed']) {
    used.add(`status.${status}`);
  }
  for (const id of ['very-easy', 'easy', 'normal', 'hard', 'expert', 'master', 'nightmare', 'hell-1', 'hell-2', 'hell-3']) {
    used.add(`level.name.${id}`);
  }
  for (const id of ['tab', 'enter', 'arrows', 'rotate', 'mirror', 'delete', 'escape', 'undo', 'redo', 'help', 'menu']) {
    used.add(`keys.${id}.key`);
    used.add(`keys.${id}.action`);
  }
  assert.ok(used.size > 100, 'the scan finds the keys');
  const missing = [...used].filter((key) => !(key in english) && !(`${key}_other` in english));
  assert.deepEqual(missing, []);
});

test('the language follows ?lang=, then the saved choice, then the browser, then English', () => {
  const storage = { getItem: () => 'vi' };
  assert.equal(choose({ search: '?lang=en', languageStorage: storage, navigator: { languages: [] } }), 'en');
  assert.equal(choose({ search: '?lang=vi', languageStorage: null, navigator: { languages: ['en'] } }), 'vi');
  assert.equal(choose({ search: '', languageStorage: storage, navigator: { languages: ['en'] } }), 'vi');
  assert.equal(choose({ search: '', languageStorage: null, navigator: { languages: ['vi-VN'] } }), 'vi');
  assert.equal(choose({ search: '', languageStorage: null, navigator: { languages: [] } }), 'en');
});

test('texts keep their English wording and follow a language switch', () => {
  assert.equal(t('ui.undo'), 'Undo');
  assert.equal(LABELS.piecesLeft(1), '1 piece left');
  assert.equal(LABELS.piecesLeft(4), '4 pieces left');
  assert.equal(LABELS.moves(0), '0 moves');
  assert.equal(LABELS.toPlace(1), '1 piece to place');
  assert.equal(PLAY_TEXT.cannotPlace('clue'), 'Cannot place here: it would overlap a locked clue');
  assert.equal(PLAY_TEXT.ghostAt(2, 3, null), 'Row 2, column 3. Free');
  assert.equal(PLAY_TEXT.ghostAt(2, 3, 'outside'), 'Row 2, column 3. Not free: it would leave the board');
  assert.equal(HINT_TEXT.place('F'), 'Hint: piece F fits in a complete solution that keeps every piece you placed. It is highlighted on the board. Press “Place it” to put it there.');
  assert.equal(reasonText('anything else'), 'that spot is not free');
  assert.equal(ratingLabel({ model: 'difficulty-v2', score: 20, level: 'hard' }), 'Hard: score 20');
  assert.equal(ratingLabel({ model: 'difficulty-v2', score: 7.25, level: 'very-easy' }), 'Very easy: score 7');
  assert.equal(ratingLabel({ model: 'difficulty-v2', score: 123.4, level: 'expert', saturated: true }), 'Expert: score 123+');
  assert.equal(certificateLabel({ status: 'unique' }), 'Unique solution ✓');
  assert.equal(verificationLabel({ status: 'solvable' }), 'Solvable ✓');
  assert.equal(puzzleStatusLabel('in-progress'), 'In progress');
  assert.equal(INDEX_MESSAGE, 'This pack has no puzzle with that number.');

  assert.equal(setLocale('vi', null), 'vi');
  assert.equal(getLocale(), 'vi');
  assert.equal(t('ui.undo'), 'Hoàn tác');
  assert.equal(t('shell.title'), 'Trình chơi Pentomino');
  assert.equal(LABELS.piecesLeft(1), 'Còn 1 mảnh');
  assert.equal(LABELS.piecesLeft(4), 'Còn 4 mảnh');
  assert.equal(PLAY_TEXT.noRoom, 'Không đủ chỗ để xoay ở đây');
  assert.equal(PLAY_TEXT.ghostAt(2, 3, null), 'Hàng 2, cột 3. Trống');
  assert.equal(ratingLabel({ model: 'difficulty-v2', score: 20, level: 'hard' }), 'Khó: điểm 20');
  assert.equal(levelLabel('hell-2'), 'Địa ngục 2');
  assert.equal(levelLabel('not-a-level'), 'not-a-level');
  assert.equal(verificationLabel({ status: 'solvable' }), 'Giải được ✓');
  assert.equal(puzzleStatusLabel('revealed'), 'Đã xem lời giải');
  assert.equal(INDEX_MESSAGE, 'Gói này không có đề với số thứ tự đó.', 'the messages kept by the controllers are live bindings');
  assert.equal(shortcutList().length, 11);
  assert.ok(shortcutList().every(([key, action]) => key !== '' && action !== ''));
  assert.equal(has('ui.undo'), true);
  assert.equal(t('no.such.key'), 'no.such.key');
});

test('the notice about discarded saved moves reads well in both languages', () => {
  const warning = (/** @type {string} */ code) => ({ code, path: '$', message: 'x' });
  assert.equal(restorationNotice([]), '');
  assert.equal(restorationNotice([warning('bad-move')]), '1 saved move no longer fits this puzzle and was discarded.');
  assert.equal(restorationNotice([warning('bad-move'), warning('bad-move')]), '2 saved moves no longer fit this puzzle and were discarded.');
  assert.equal(restorationNotice([warning('bad-move'), warning('too-many-warnings')]), '1 or more saved moves no longer fit this puzzle and were discarded.');
  assert.equal(restorationNotice([warning('progress-invalid')]), 'Saved progress for this puzzle could not be used and was discarded.');
  setLocale('vi', null);
  assert.equal(restorationNotice([warning('bad-move'), warning('bad-move')]), '2 nước đi đã lưu không còn khớp với đề này nên đã bị bỏ.');
});
