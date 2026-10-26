// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ALPHABET, MAX_CODE_SYMBOLS, MAX_INPUT_CHARS, MAX_PUZZLE_CODES, PuzzleCodeError, isPuzzleCodeList, isPuzzleListHash,
  normalizePuzzleCodeInput, normalizePuzzleCodeList, normalizePuzzleCodeText, normalizePuzzleCodeValue, parsePuzzleHash,
  splitPuzzleCodes,
} from '../core/engine/puzzlecode-input.js';

const hashes = JSON.parse(readFileSync(new URL('./fixtures/puzzlecode-hashes.json', import.meta.url), 'utf8'));

/**
 * @param {() => unknown} fn
 * @param {string} code
 * @param {Record<string, string | number>} [params]
 */
function throwsCode(fn, code, params) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof PuzzleCodeError, `expected a PuzzleCodeError, got ${String(error)}`);
    assert.equal(error.code, code);
    if (params !== undefined) {
      assert.deepEqual(error.params, params);
    }
    return true;
  });
}

test('parsePuzzleHash follows the structural table', () => {
  for (const item of hashes.cases) {
    const result = parsePuzzleHash(item.hash);
    assert.equal(result.ok, item.ok, `${item.hash}: ${JSON.stringify(result)}`);
    if (result.ok) {
      assert.deepEqual(result.value, { p: item.p, index: 0 }, item.hash);
    } else {
      assert.equal(result.code, item.code, item.hash);
      assert.equal(typeof result.message, 'string');
      assert.ok(result.message.length > 0);
    }
  }
  assert.deepEqual(parsePuzzleHash(/** @type {any} */ (undefined)).ok, false);
});

test('normalizePuzzleCodeInput reads links through the parser and bare codes directly', () => {
  for (const item of hashes.cases) {
    if (!item.ok || !item.hash.includes('#')) {
      continue;
    }
    if (item.normalizeError !== undefined) {
      throwsCode(() => normalizePuzzleCodeInput(item.hash), item.normalizeError);
    } else {
      assert.equal(normalizePuzzleCodeInput(item.hash), item.normalized, item.hash);
    }
  }
  for (const item of hashes.cases) {
    if (!item.ok && item.hash.includes('#')) {
      throwsCode(() => normalizePuzzleCodeInput(item.hash), item.code);
    }
  }
  // Without a # the text is a bare code, never a hash.
  throwsCode(() => normalizePuzzleCodeInput('p=1D0J492G'), 'bad-char', { char: '=' });
  assert.equal(normalizePuzzleCodeInput('  1d0j 492g\t-\r\n18v3we  '), '1D0J492G18V3WE');
  assert.equal(normalizePuzzleCodeInput('1D0J 492G . 18V3'), '1D0J492G.18V3');
});

test('a pasted link and its bare code normalize identically; a nested route cannot appear', () => {
  const bare = '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE';
  const link = `https://tdat00.github.io/pentomino/player/#p=${bare}`;
  assert.equal(normalizePuzzleCodeInput(link), bare);
  assert.equal(normalizePuzzleCodeInput(`${link}&x=1`), bare);
  throwsCode(() => normalizePuzzleCodeInput(`${link}&i=2`), 'index');
  throwsCode(() => normalizePuzzleCodeInput('https://x/#pack=1j.abc'), 'invalid');
  throwsCode(() => normalizePuzzleCodeInput(`#p=${encodeURIComponent(`#p=${bare}`)}`), 'bad-char', { char: '#' });
});

test('normalizePuzzleCodeValue maps aliases, removes grouping and validates the alphabet', () => {
  assert.equal(normalizePuzzleCodeValue('o0O0 iIlL-1'), '000011111');
  assert.equal(normalizePuzzleCodeValue(ALPHABET.toLowerCase()), ALPHABET);
  assert.equal(normalizePuzzleCodeValue('abcd.efgh'), 'ABCD.EFGH');
  assert.equal(normalizePuzzleCodeValue('.1234'), '.1234');
  assert.equal(normalizePuzzleCodeValue('1234.'), '1234.');
  throwsCode(() => normalizePuzzleCodeValue('12U4'), 'bad-char', { char: 'U' });
  throwsCode(() => normalizePuzzleCodeValue('12u4'), 'bad-char', { char: 'u' });
  throwsCode(() => normalizePuzzleCodeValue('12#4'), 'bad-char', { char: '#' });
  throwsCode(() => normalizePuzzleCodeValue('12+4'), 'bad-char', { char: '+' });
  throwsCode(() => normalizePuzzleCodeValue('12%204'), 'bad-char', { char: '%' });
  throwsCode(() => normalizePuzzleCodeValue('12\u00a04'), 'bad-char');
  throwsCode(() => normalizePuzzleCodeValue('12\u0131'), 'bad-char', { char: '\u0131' });
  throwsCode(() => normalizePuzzleCodeValue('12\u{1d7ce}'), 'bad-char', { char: '\u{1d7ce}' });
  throwsCode(() => normalizePuzzleCodeValue('12\ud800'), 'bad-char');
  throwsCode(() => normalizePuzzleCodeValue('1234.5678.9'), 'dots');
  throwsCode(() => normalizePuzzleCodeValue('..'), 'dots');
  throwsCode(() => normalizePuzzleCodeValue(''), 'empty');
  throwsCode(() => normalizePuzzleCodeValue(' \t\r\n-- '), 'empty');
  throwsCode(() => normalizePuzzleCodeValue('.'), 'empty');
  throwsCode(() => normalizePuzzleCodeValue(/** @type {any} */ (null)), 'empty');
  throwsCode(() => normalizePuzzleCodeInput(/** @type {any} */ (7)), 'empty');
});

test('input and code-length bounds apply at both layers before any content work', () => {
  const max = '1'.repeat(MAX_CODE_SYMBOLS);
  assert.equal(normalizePuzzleCodeValue(max), max);
  assert.equal(normalizePuzzleCodeValue(`${max}.`), `${max}.`);
  throwsCode(() => normalizePuzzleCodeValue(`${max}1`), 'too-long');
  throwsCode(() => normalizePuzzleCodeValue('1'.repeat(MAX_CODE_SYMBOLS) + '.' + '1'), 'too-long');
  assert.equal(normalizePuzzleCodeInput(max), max);
  throwsCode(() => normalizePuzzleCodeInput(`${max}1`), 'too-long');
  // Grouping may stretch the text, but never past the text bound.
  const grouped = '1111 '.repeat(3000);
  assert.equal(normalizePuzzleCodeInput(grouped).length, 12000);
  throwsCode(() => normalizePuzzleCodeInput('1'.repeat(MAX_INPUT_CHARS + 1)), 'too-long');
  throwsCode(() => normalizePuzzleCodeValue(' '.repeat(MAX_INPUT_CHARS + 1)), 'too-long');
  throwsCode(() => normalizePuzzleCodeInput(`#p=${'1'.repeat(MAX_INPUT_CHARS)}`), 'too-long');
  assert.equal(normalizePuzzleCodeInput(' '.repeat(MAX_INPUT_CHARS - 4) + '1234'), '1234');
});

test('PuzzleCodeError carries code, params and message', () => {
  const error = new PuzzleCodeError('invalid');
  assert.ok(error instanceof Error);
  assert.equal(error.name, 'PuzzleCodeError');
  assert.equal(error.code, 'invalid');
  assert.equal(error.params, undefined);
  assert.equal(error.candidate, undefined);
  assert.ok(error.message.length > 0);
});

test('the input module and the codec do not depend on the share-code or host modules', () => {
  for (const name of ['puzzlecode-input.js', 'puzzlecode.js', 'puzzlecode-v1.js']) {
    const text = readFileSync(new URL(`../core/engine/${name}`, import.meta.url), 'utf8');
    const imports = [...text.matchAll(/^import[^;]*?from\s+'([^']+)'/gms)].map((m) => m[1]);
    for (const spec of imports) {
      assert.ok(spec.startsWith('./') && !/sharecode|handoff|browser/.test(spec), `${name} imports ${spec}`);
      assert.ok(!spec.startsWith('node:'), `${name} imports ${spec}`);
    }
    assert.ok(!/node:zlib|document\.|window\.|localStorage|fetch\(|Date\.now|Math\.random/.test(text), name);
  }
  const input = readFileSync(new URL('../core/engine/puzzlecode-input.js', import.meta.url), 'utf8');
  assert.ok(!/from\s+'\.\//.test(input), 'the input module has no sibling imports');
});

test('a p value may carry several codes separated by ";", and i then names the puzzle to open', () => {
  const A = '1D0J492G';
  const B = '1D0K492H';
  assert.deepEqual(parsePuzzleHash(`#p=${A};${B}`), { ok: true, value: { p: `${A};${B}`, index: 0 } });
  assert.deepEqual(parsePuzzleHash(`#p=${A};${B}&i=1`), { ok: true, value: { p: `${A};${B}`, index: 1 } });
  assert.deepEqual(parsePuzzleHash(`#i=1&p=${A}%3B${B}`), { ok: true, value: { p: `${A};${B}`, index: 1 } }, 'an encoded ";" separates too');
  assert.deepEqual(parsePuzzleHash(`#p=${A};${B};&i=1`).ok, true, 'a trailing ";" counts no code');
  for (const [hash, code] of /** @type {[string, string][]} */ ([
    [`#p=${A};${B}&i=2`, 'index'],
    [`#p=${A};${B};&i=2`, 'index'],
    [`#p=${A};&i=1`, 'index'],
    [`#p=${A}&i=1`, 'index'],
    [`#p=${A};${B}&i=01`, 'invalid'],
    [`#p=${A};${B}&i=-1`, 'invalid'],
    [`#p=${A};${B}&i=1&i=1`, 'invalid'],
    [`#p=${A};${B}&pack=1z.a`, 'invalid'],
    ['#p=%ZZ;A&i=1', 'invalid'],
  ])) {
    const result = parsePuzzleHash(hash);
    assert.ok(!result.ok, hash);
    assert.equal(result.code, code, hash);
  }
});

test('splitPuzzleCodes, isPuzzleListHash and normalizePuzzleCodeList read the codes of a list', () => {
  assert.deepEqual(splitPuzzleCodes('A;B'), ['A', 'B']);
  assert.deepEqual(splitPuzzleCodes(' A ; ;B;'), ['A', 'B']);
  assert.deepEqual(splitPuzzleCodes(''), []);
  assert.equal(isPuzzleCodeList('A;B'), true);
  assert.equal(isPuzzleCodeList('A'), false);
  assert.equal(isPuzzleListHash('#p=1D0J;1D0K'), true);
  assert.equal(isPuzzleListHash('#p=1D0J;'), false, 'one code with a trailing ";" is one puzzle');
  assert.equal(isPuzzleListHash('#p=1D0J'), false);
  assert.equal(isPuzzleListHash('#pack=1z.a;b'), false);
  assert.equal(isPuzzleListHash('#p=1D0J;1D0K&i=5'), false, 'a malformed address is not a list');
  assert.deepEqual(normalizePuzzleCodeList('1d0j 492g;1d0k-492h.18v3'), ['1D0J492G', '1D0K492H.18V3']);
  throwsCode(() => normalizePuzzleCodeList(' ; ;'), 'empty');
  throwsCode(() => normalizePuzzleCodeList('1D0J;1D0!'), 'bad-char', { char: '!' });
  throwsCode(() => normalizePuzzleCodeList('1D.0J.4;1D0J'), 'dots');
  throwsCode(() => normalizePuzzleCodeList(Array.from({ length: MAX_PUZZLE_CODES + 1 }, () => '1D0J').join(';')), 'too-long');
  assert.equal(normalizePuzzleCodeList(Array.from({ length: MAX_PUZZLE_CODES }, () => '1D0J').join(';')).length, MAX_PUZZLE_CODES);
  throwsCode(() => normalizePuzzleCodeList('1'.repeat(MAX_INPUT_CHARS + 1)), 'too-long');
});

test('normalizePuzzleCodeText gives the codes and the puzzle of a link or of a bare text', () => {
  assert.deepEqual(normalizePuzzleCodeText('1d0j492g'), { codes: ['1D0J492G'], index: 0 });
  assert.deepEqual(normalizePuzzleCodeText('1d0j492g; 1d0k492h'), { codes: ['1D0J492G', '1D0K492H'], index: 0 });
  assert.deepEqual(normalizePuzzleCodeText('https://x.test/player/#p=1D0J492G;1D0K492H&i=1'), { codes: ['1D0J492G', '1D0K492H'], index: 1 });
  throwsCode(() => normalizePuzzleCodeText('https://x.test/player/#p=1D0J492G;1D0K492H&i=2'), 'index');
  throwsCode(() => normalizePuzzleCodeText('https://x.test/player/#p=1D0J492G&i=1'), 'index');
  throwsCode(() => normalizePuzzleCodeText('https://x/#pack=1j.abc'), 'invalid');
  // The one-code normalizer still takes a single code only.
  throwsCode(() => normalizePuzzleCodeInput('1D0J492G;1D0K492H'), 'bad-char', { char: ';' });
});
