// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deflateRawSync } from 'node:zlib';
import { parsePack } from '../core/engine/pack.js';
import { PuzzleCodeError, normalizePuzzleCodeInput } from '../core/engine/puzzlecode-input.js';
import {
  MAX_CODE_CHARS, MAX_URL_CHARS, NO_DECOMPRESSOR_MESSAGE, ShareCodeError, base64urlDecode, base64urlEncode, decodeShareCode,
  encodeShareCode, isPuzzleHash, parseLocationHash, parseLocationHashResult, playerUrl, puzzleCodeUrl,
} from '../core/engine/sharecode.js';

const fixtureText = readFileSync(new URL('./fixtures/hand-authored-pack.json', import.meta.url), 'utf8');
const parsed = parsePack(fixtureText);
assert.ok(parsed.ok);
const pack = parsed.value;

/**
 * Runs `fn` with a browser global removed.
 * @param {'CompressionStream' | 'DecompressionStream'} name
 * @param {() => Promise<void>} fn
 */
async function without(name, fn) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value: undefined, configurable: true, writable: true });
  try {
    await fn();
  } finally {
    if (saved) {
      Object.defineProperty(globalThis, name, saved);
    } else {
      delete (/** @type {any} */ (globalThis))[name];
    }
  }
}

/** @param {string} text */
const compressedCode = (text) => `1z.${base64urlEncode(deflateRawSync(Buffer.from(text, 'utf8')))}`;

test('base64url round-trips every length and rejects malformed input', () => {
  for (let n = 0; n < 20; n += 1) {
    const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 250) & 255);
    const text = base64urlEncode(bytes);
    assert.doesNotMatch(text, /[+/=]/);
    assert.deepEqual(base64urlDecode(text), bytes);
  }
  assert.equal(base64urlDecode('A'), null);
  assert.equal(base64urlDecode('AB=='), null);
  assert.equal(base64urlDecode('A+/A'), null);
  assert.equal(base64urlDecode('AB'), null, 'non-zero trailing bits');
  assert.equal(base64urlDecode('é'), null);
});

test('compressed code round-trips and uses the 1z prefix', async () => {
  const code = await encodeShareCode(pack);
  assert.match(code, /^1z\.[A-Za-z0-9_-]+$/);
  assert.ok(code.length < fixtureText.length, 'smaller than the file');
  const back = await decodeShareCode(code);
  assert.ok(back.ok);
  assert.deepEqual(back.value.puzzles, pack.puzzles);
  assert.deepEqual(back.value.pieces, pack.pieces);
});

test('uncompressed fallback uses 1j and decodes without a compressor', async () => {
  await without('CompressionStream', async () => {
    const code = await encodeShareCode(pack);
    assert.match(code, /^1j\./);
    await without('DecompressionStream', async () => {
      const back = await decodeShareCode(code);
      assert.ok(back.ok);
      assert.deepEqual(back.value.board, pack.board);
    });
  });
});

test('compressed codes need a decompressor and say so', async () => {
  const code = await encodeShareCode(pack);
  await without('DecompressionStream', async () => {
    const result = await decodeShareCode(code);
    assert.ok(!result.ok);
    assert.equal(result.issues[0].code, 'no-decompressor');
    assert.equal(result.issues[0].message, NO_DECOMPRESSOR_MESSAGE);
  });
});

test('malformed prefix, alphabet, base64, compression, UTF-8 and JSON fail safely', async () => {
  const good = await encodeShareCode(pack);
  const cases = /** @type {[string, string][]} */ ([
    ['', 'invalid-code'],
    ['2z.AAAA', 'invalid-code'],
    ['1x.AAAA', 'invalid-code'],
    ['1z', 'invalid-code'],
    ['1z.AB+/', 'invalid-code'],
    ['1z.AB==', 'invalid-code'],
    ['1j.A', 'invalid-base64'],
    ['1z.A', 'invalid-base64'],
    [`1z.${base64urlEncode(Uint8Array.of(1, 2, 3, 4, 5, 6))}`, 'invalid-compression'],
    [`1j.${base64urlEncode(Uint8Array.of(0xc3, 0x28))}`, 'invalid-utf8'],
    [`1j.${base64urlEncode(new TextEncoder().encode('{"a":'))}`, 'invalid-json'],
    [`1j.${base64urlEncode(new TextEncoder().encode('{"a":1}'))}`, 'unknown-field'],
    ['1j.' + 'A'.repeat(MAX_CODE_CHARS), 'code-too-long'],
  ]);
  for (const [code, expected] of cases) {
    const result = await decodeShareCode(code);
    assert.ok(!result.ok, code.slice(0, 20));
    assert.ok(
      result.issues.some((issue) => issue.code === expected) || expected === 'unknown-field',
      `${code.slice(0, 20)} -> ${JSON.stringify(result.issues[0])}`,
    );
  }
  // Whether bytes after the end of the deflate stream are rejected depends on the runtime
  // (Node 22 ignores them, newer runtimes fail), so both outcomes are acceptable, but never a different pack.
  const trailing = await decodeShareCode(`${good}A`);
  if (trailing.ok) {
    assert.deepEqual(trailing.value, pack);
  } else {
    assert.ok(trailing.issues.some((issue) => issue.code === 'invalid-compression'));
  }
  const truncated = await decodeShareCode(good.slice(0, good.length >> 1));
  assert.ok(!truncated.ok);
  assert.ok(!(await decodeShareCode(/** @type {any} */ (42))).ok);
});

test('decoding aborts at the output limit without buffering a bomb', async () => {
  const bomb = compressedCode(`{"x":"${' '.repeat(150 * 1024 * 1024)}"}`);
  assert.ok(bomb.length < MAX_CODE_CHARS, `bomb code is ${bomb.length} characters`);
  const started = Date.now();
  const result = await decodeShareCode(bomb);
  assert.ok(!result.ok);
  assert.equal(result.issues[0].code, 'decoded-too-large');
  assert.ok(Date.now() - started < 5000, 'aborted early');
  const small = await decodeShareCode(await encodeShareCode(pack), { maxBytes: 100 });
  assert.ok(!small.ok);
  assert.equal(small.issues[0].code, 'decoded-too-large');
  const plain = await decodeShareCode(`1j.${base64urlEncode(new Uint8Array(262200))}`);
  assert.ok(!plain.ok);
  assert.equal(plain.issues[0].code, 'decoded-too-large');
});

test('the encoder refuses a pack its decoder would reject, however well it compresses', async () => {
  const big = structuredClone(pack);
  big.generation = { filler: 'a'.repeat(300 * 1024) };
  assert.ok(parsePack(JSON.stringify(big)).ok, 'valid as a file');
  await assert.rejects(encodeShareCode(big), (error) => error instanceof ShareCodeError && error.code === 'share-too-large');
  const giant = structuredClone(pack);
  giant.generation = { filler: 'a'.repeat(600 * 1024) };
  await assert.rejects(encodeShareCode(giant), (error) => error instanceof ShareCodeError && error.code === 'pack-too-large');
});

test('playerUrl resolves ../player/ for prefix-hosted and root-hosted pages', () => {
  const code = '1z.AAAA';
  assert.equal(playerUrl('https://tdat00.github.io/pentomino/generator/', code, 3), 'https://tdat00.github.io/pentomino/player/#pack=1z.AAAA&i=3');
  assert.equal(playerUrl('https://tdat00.github.io/pentomino/generator/index.html?x=1#y', code, 0), 'https://tdat00.github.io/pentomino/player/#pack=1z.AAAA&i=0');
  assert.equal(playerUrl(new URL('http://localhost:8080/generator/'), code, 1), 'http://localhost:8080/player/#pack=1z.AAAA&i=1');
  assert.equal(playerUrl('http://localhost:8080/generator/', '0123456789abcdef', 2), 'http://localhost:8080/player/#lib=0123456789abcdef&i=2');
  assert.throws(() => playerUrl('http://localhost/generator/', code, -1), RangeError);
  assert.throws(() => playerUrl('http://localhost/generator/', code, 1.5), RangeError);
  assert.throws(() => playerUrl('http://localhost/generator/', 'nope', 0), RangeError);
});

test('parseLocationHash accepts pack/lib hashes and rejects bad values', () => {
  assert.deepEqual(parseLocationHash('#pack=1z.abc_-&i=4'), { pack: '1z.abc_-', index: 4 });
  assert.deepEqual(parseLocationHash('pack=1j.abc'), { pack: '1j.abc', index: 0 });
  assert.deepEqual(parseLocationHash('#i=2&lib=0123456789abcdef'), { lib: '0123456789abcdef', index: 2 });
  assert.deepEqual(parseLocationHash('#lib=0123456789abcdef&other=1'), { lib: '0123456789abcdef', index: 0 });
  for (const bad of ['', '#', '#i=1', '#pack=', '#pack=2z.abc', '#pack=1z.a+b', '#lib=ABCDEF0123456789', '#lib=0123', '#pack=1z.a&i=-1',
    '#pack=1z.a&i=1.5', '#pack=1z.a&i=01', '#pack=1z.a&i=x', '#pack=1z.a&i=', '#pack=1z.a&pack=1z.b', '#pack=1z.a&i=1&i=2']) {
    assert.equal(parseLocationHash(bad), null, bad);
  }
  assert.equal(parseLocationHashResult('#pack=1z.a&i=x').ok, false);
  assert.equal(parseLocationHash(/** @type {any} */ (null)), null);
});

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

test('the p route follows the legacy hash rules for everything that is not p', () => {
  assert.equal(isPuzzleHash('#p=C'), true);
  assert.equal(isPuzzleHash('p=C&i=0'), true);
  assert.equal(isPuzzleHash('#i=0&p'), true);
  for (const other of ['', '#', '#P=C', '#pack=1j.abc', '#lib=0123456789abcdef', '#pp=1', '#xp=1', '#a=p=1']) {
    assert.equal(isPuzzleHash(other), false, other);
  }
  assert.deepEqual(parseLocationHashResult('#pack=1j.abc&i=2'), { ok: true, value: { pack: '1j.abc', index: 2 }, warnings: [] });
  assert.equal(/** @type {any} */ (parseLocationHashResult('#P=1D0J')).issues[0].code, 'no-incoming');
  assert.equal(/** @type {any} */ (parseLocationHashResult('#i=0')).issues[0].code, 'no-incoming');
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

test('puzzleCodeUrl refuses unusable targets and codes; its limit is the caller\'s, not the code\'s', () => {
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://example.test/player/', 'blob:https://example.test/x', 'about:blank',
    'https://user:pw@example.test/player/', 'https://user@example.test/player/', '/player/', '', 'not a url']) {
    assert.throws(() => puzzleCodeUrl(bad, 'abc'), RangeError, bad);
  }
  for (const bad of ['', '   ', 'ab!c', 'AB.CD.EF']) {
    assert.throws(() => puzzleCodeUrl('https://example.test/player/', bad), PuzzleCodeError, bad);
  }
  const longest = puzzleCodeUrl('https://tdat00.github.io/pentomino/player/', 'A'.repeat(16000));
  assert.ok(longest.length > MAX_URL_CHARS, 'a code at its own 16,000-symbol bound is a longer address than a link may be');
  assert.throws(() => puzzleCodeUrl('https://example.test/player/', 'A'.repeat(16001)), (e) => e instanceof PuzzleCodeError && e.code === 'too-long');
});
