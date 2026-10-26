// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PuzzleCodeError, normalizePuzzleCodeInput } from '../core/engine/puzzlecode-input.js';
import {
  MAX_URL_CHARS, isPuzzleHash, parseLocationHash, parseLocationHashResult, puzzleCodeUrl, puzzleListHash, puzzleListUrl,
} from '../core/engine/sharecode.js';

const GOLDEN_CODE = '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE';
const hashCases = /** @type {{ hash: string, ok: boolean, p?: string, normalized?: string, normalizeError?: string, code?: string }[]} */ (
  JSON.parse(readFileSync(new URL('./fixtures/puzzlecode-hashes.json', import.meta.url), 'utf8')).cases);
/** The part of a fixture entry a browser would put in `location.hash`. @param {string} hash */
const locationHashOf = (hash) => (hash.includes('://') ? new URL(hash).hash : hash);

test('every p-bearing fixture hash gives the host parser the mapped outcome of the one route parser', () => {
  let checked = 0;
  for (const c of hashCases) {
    const hash = locationHashOf(c.hash);
    if (!isPuzzleHash(hash)) {
      continue;
    }
    checked += 1;
    const result = parseLocationHashResult(hash);
    if (c.ok) {
      assert.deepEqual(result, { ok: true, value: { p: c.p, index: 0 }, warnings: [] }, c.hash);
      assert.deepEqual(parseLocationHash(hash), { p: c.p, index: 0 }, c.hash);
    } else {
      assert.ok(!result.ok, c.hash);
      assert.equal(result.issues[0].code, c.code === 'index' ? 'invalid-index' : 'invalid-hash', c.hash);
      assert.equal(parseLocationHash(hash), null, c.hash);
    }
  }
  assert.ok(checked >= 30, `${checked} p-bearing cases`);
});

test('the code entry reads the same fixture through the pasted-link normalizer with the route parser\'s own names', () => {
  for (const c of hashCases.filter((x) => x.hash.includes('#') && isPuzzleHash(locationHashOf(x.hash)))) {
    if (!c.ok) {
      assert.throws(() => normalizePuzzleCodeInput(c.hash), (e) => e instanceof PuzzleCodeError && e.code === c.code, c.hash);
    } else if (c.normalizeError !== undefined) {
      assert.throws(() => normalizePuzzleCodeInput(c.hash), (e) => e instanceof PuzzleCodeError && e.code === c.normalizeError, c.hash);
    } else {
      assert.equal(normalizePuzzleCodeInput(c.hash), c.normalized, c.hash);
    }
  }
});

test('p is the only route: any other hash has no puzzle data, and p with another route key is refused', () => {
  assert.equal(isPuzzleHash('#p=C'), true);
  assert.equal(isPuzzleHash('p=C&i=0'), true);
  assert.equal(isPuzzleHash('#i=0&p'), true);
  for (const other of ['', '#', '#P=C', '#pack=1j.abc', '#lib=0123456789abcdef', '#pp=1', '#xp=1', '#a=p=1']) {
    assert.equal(isPuzzleHash(other), false, other);
    assert.equal(/** @type {any} */ (parseLocationHashResult(other)).issues[0].code, 'no-incoming', other);
    assert.equal(parseLocationHash(other), null, other);
  }
  assert.equal(/** @type {any} */ (parseLocationHashResult('#i=0')).issues[0].code, 'no-incoming');
  assert.equal(/** @type {any} */ (parseLocationHashResult(/** @type {any} */ (null))).issues[0].code, 'invalid-hash');
  for (const mixed of ['#p=C&pack=1j.abc', '#pack=1j.abc&p=C', '#p=C&lib=0123456789abcdef', '#lib=0123456789abcdef&p=C']) {
    assert.equal(/** @type {any} */ (parseLocationHashResult(mixed)).issues[0].code, 'invalid-hash', mixed);
  }
  assert.deepEqual(parseLocationHash(`#p=${GOLDEN_CODE}&i=0`), { p: GOLDEN_CODE, index: 0 });
  assert.equal(/** @type {any} */ (parseLocationHashResult(`#p=${GOLDEN_CODE}&i=1`)).issues[0].code, 'invalid-index');
  assert.equal(/** @type {any} */ (parseLocationHashResult(`#p=${GOLDEN_CODE}&i=-1`)).issues[0].code, 'invalid-hash');
  assert.equal(/** @type {any} */ (parseLocationHashResult(`#p=${GOLDEN_CODE}&i=x`)).issues[0].code, 'invalid-hash');
  assert.equal(/** @type {any} */ (parseLocationHashResult(`#p=${GOLDEN_CODE}&i=00`)).issues[0].code, 'invalid-hash');
});

test('puzzleCodeUrl puts the canonical code after the selected Player target and adds nothing else', () => {
  const target = 'https://tdat00.github.io/pentomino/player/';
  assert.equal(puzzleCodeUrl(target, GOLDEN_CODE), `${target}#p=${GOLDEN_CODE}`);
  assert.equal(puzzleCodeUrl(target, GOLDEN_CODE.toLowerCase().replace(/(.{4})/g, '$1 ')), `${target}#p=${GOLDEN_CODE}`);
  assert.equal(puzzleCodeUrl(target, '1D0J492G'), `${target}#p=1D0J492G`);
  assert.equal(puzzleCodeUrl('https://example.test/fork/player/index.html?x=1&y=2#old', 'abc'), 'https://example.test/fork/player/index.html#p=ABC');
  assert.equal(puzzleCodeUrl('HTTPS://Example.TEST/Pentomino/Player/', 'abc'), 'https://example.test/Pentomino/Player/#p=ABC', 'host folds, path case stays');
  const instance = new URL('http://localhost:8080/player/?debug=1#x');
  assert.equal(puzzleCodeUrl(instance, 'abc'), 'http://localhost:8080/player/#p=ABC');
  assert.equal(instance.href, 'http://localhost:8080/player/?debug=1#x', 'the target is not modified');
  assert.equal(puzzleCodeUrl('file:///Q:/git/pentomino/player/index.html', 'abc'), 'file:///Q:/git/pentomino/player/index.html#p=ABC');
  assert.ok(!puzzleCodeUrl(target, GOLDEN_CODE).includes('&'), 'no i key');
  const link = puzzleCodeUrl(target, GOLDEN_CODE);
  assert.deepEqual(parseLocationHash(new URL(link).hash), { p: GOLDEN_CODE, index: 0 }, 'it is a route the Player reads back');
});

test('puzzleListHash and puzzleListUrl join the canonical codes with ";" and add i only for a later puzzle', () => {
  const base = 'https://tdat00.github.io/pentomino/generator/';
  const a = '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE';
  assert.equal(puzzleListHash([a, '1d0k 492h']), `#p=${a};1D0K492H`);
  assert.equal(puzzleListHash([a, '1D0K492H', '1D0M492J'], 2), `#p=${a};1D0K492H;1D0M492J&i=2`);
  assert.equal(puzzleListUrl(base, [a, '1d0k 492h']), `https://tdat00.github.io/pentomino/player/#p=${a};1D0K492H`);
  assert.equal(puzzleListUrl(base, [a, '1D0K492H', '1D0M492J'], 2), `https://tdat00.github.io/pentomino/player/#p=${a};1D0K492H;1D0M492J&i=2`);
  assert.equal(puzzleListUrl('http://localhost:8080/generator/', [a]), `http://localhost:8080/player/#p=${a}`, 'one puzzle: the plain one-puzzle address');
  assert.equal(puzzleListUrl(new URL(base), [a], 0), `https://tdat00.github.io/pentomino/player/#p=${a}`);
  const link = puzzleListUrl(base, [a, '1D0K492H'], 1);
  assert.deepEqual(parseLocationHash(new URL(link).hash), { p: `${a};1D0K492H`, index: 1 }, 'the Player reads it back');
  for (const call of [() => puzzleListUrl(base, []), () => puzzleListUrl(base, [a], 1), () => puzzleListUrl(base, [a, a], -1),
    () => puzzleListUrl(base, [a, a], 0.5), () => puzzleListHash([])]) {
    assert.throws(call, RangeError);
  }
  assert.throws(() => puzzleListUrl(base, [a, 'ab!']), PuzzleCodeError);
});

test('puzzleCodeUrl refuses unusable targets and codes; its limit is the caller\'s, not the code\'s', () => {
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://example.test/player/', 'blob:https://example.test/x', 'about:blank',
    '******example.test/player/', 'https://user@example.test/player/', '/player/', '', 'not a url']) {
    assert.throws(() => puzzleCodeUrl(bad, 'abc'), RangeError, bad);
  }
  for (const bad of ['', '   ', 'ab!c', 'AB.CD.EF']) {
    assert.throws(() => puzzleCodeUrl('https://example.test/player/', bad), PuzzleCodeError, bad);
  }
  const longest = puzzleCodeUrl('https://tdat00.github.io/pentomino/player/', 'A'.repeat(16000));
  assert.ok(longest.length > MAX_URL_CHARS, 'a code at its own 16,000-symbol bound is a longer address than a link may be');
  assert.throws(() => puzzleCodeUrl('https://example.test/player/', 'A'.repeat(16001)), (e) => e instanceof PuzzleCodeError && e.code === 'too-long');
});
