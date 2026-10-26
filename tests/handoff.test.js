// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parsePack } from '../core/engine/pack.js';
import { decodePuzzleCode, encodePuzzleCode } from '../core/engine/puzzlecode.js';
import { ALPHABET } from '../core/engine/puzzlecode-input.js';
import { MAX_URL_CHARS, WARN_URL_CHARS, isPuzzleHash } from '../core/engine/sharecode.js';
import { copyText, downloadText, el, safeFileName, showToast } from '../core/browser/dom.js';
import {
  HandoffError, PIECE_SET_MESSAGE, openInPlayerTab, preparePlayerLink, readIncoming, readPack, readPuzzleCode,
} from '../core/browser/handoff.js';

const fixtureText = readFileSync(new URL('./fixtures/hand-authored-pack.json', import.meta.url), 'utf8');
const parsed = parsePack(fixtureText);
assert.ok(parsed.ok);
const pack = parsed.value;
const PREFIX_BASE = 'https://tdat00.github.io/pentomino/generator/';

/** @param {number} count A pack of `count` puzzles of the fixture's board and pieces, with their own ids. */
const packOf = (count) => ({ ...pack, puzzles: Array.from({ length: count }, (_, i) => ({ ...pack.puzzles[0], id: `example-${i + 1}` })) });

/** The encoder of a Play link: the real codec, as the worker runs it. */
const realEncoder = async (/** @type {import('../core/engine/puzzlecode.js').PuzzleCodeSnapshot} */ data) => (
  { ok: /** @type {const} */ (true), value: await encodePuzzleCode(data), warnings: [] });

/** The decoder of a link: the real codec, as the worker runs it. */
const realDecoder = async (/** @type {string} */ text) => ({ ok: /** @type {const} */ (true), value: await decodePuzzleCode(text), warnings: [] });

/**
 * An encoder that answers a code of the given length (a valid, distinct one per call) and records its snapshots.
 * @param {number} length
 */
function longEncoder(length) {
  /** @type {import('../core/engine/puzzlecode.js').PuzzleCodeSnapshot[]} */
  const seen = [];
  return {
    seen,
    encodePuzzle: async (/** @type {import('../core/engine/puzzlecode.js').PuzzleCodeSnapshot} */ data) => {
      seen.push(data);
      const F = `${ALPHABET[seen.length % 32]}${'B'.repeat(length - 1)}`;
      return { ok: /** @type {const} */ (true), value: { C: F, T: null, F, version: /** @type {const} */ (1) }, warnings: [] };
    },
  };
}

test('a Play link carries the code of every puzzle, separated by ";", and the puzzle to open', async () => {
  const encoder = longEncoder(40);
  const three = packOf(3);
  const first = await preparePlayerLink(three, 0, { base: PREFIX_BASE, encodePuzzle: encoder.encodePuzzle });
  assert.equal(first.portable, true);
  assert.equal(first.warning, undefined);
  const codes = ['1', '2', '3'].map((c) => `${c}${'B'.repeat(39)}`);
  assert.equal(first.href, `https://tdat00.github.io/pentomino/player/#p=${codes.join(';')}`, 'puzzle 1 needs no number');
  assert.equal(encoder.seen.length, 3, 'one code per puzzle');
  assert.deepEqual(encoder.seen.map((data) => data.rows), [three.board.rows, three.board.rows, three.board.rows]);
  const another = await preparePlayerLink(three, 2, { base: 'http://localhost:8080/generator/', encodePuzzle: longEncoder(40).encodePuzzle });
  assert.match(another.href ?? '', /^http:\/\/localhost:8080\/player\/#p=[0-9A-Z]+;[0-9A-Z]+;[0-9A-Z]+&i=2$/);
  const alone = await preparePlayerLink(pack, 0, { base: PREFIX_BASE, encodePuzzle: realEncoder });
  assert.match(alone.href ?? '', /^https:\/\/tdat00\.github\.io\/pentomino\/player\/#p=[0-9A-Z.]+$/, 'one puzzle is a plain one-puzzle address');
  assert.ok(!(alone.href ?? '').includes(';'));
});

test('a Play link is read back by the Player loader: the same puzzles, the chosen one first', async () => {
  const sampleText = readFileSync(new URL('../player/samples/sample-pack.json', import.meta.url), 'utf8');
  const sample = /** @type {NonNullable<ReturnType<typeof parsePack>['value']>} */ (parsePack(sampleText).value);
  const link = await preparePlayerLink(sample, 1, { base: PREFIX_BASE, encodePuzzle: realEncoder });
  assert.ok(link.href);
  assert.equal(link.href.split(';').length, 3, 'three puzzles');
  const incoming = await readIncoming({ hash: new URL(link.href).hash }, { decodePuzzle: realDecoder });
  assert.ok(incoming.ok);
  assert.equal(incoming.value.index, 1);
  assert.equal(incoming.value.pack.puzzles.length, 3);
  assert.deepEqual(incoming.value.pack.board.rows, sample.board.rows);
  assert.deepEqual(incoming.value.pack.pieces.map((p) => p.id), sample.pieces.map((p) => p.id));
  assert.deepEqual(incoming.value.pack.puzzles.map((p) => p.clues.map((c) => c.piece).sort()), sample.puzzles.map((p) => p.clues.map((c) => c.piece).sort()));
  assert.deepEqual(incoming.value.pack.puzzles.map((p) => p.solution?.length ?? 0), sample.puzzles.map((p) => p.solution?.length ?? 0), 'the stored answers travel');
});

test('links above 4,000 characters warn but stay portable', async () => {
  const link = await preparePlayerLink(packOf(2), 0, { base: PREFIX_BASE, encodePuzzle: longEncoder(2500).encodePuzzle });
  assert.equal(link.portable, true);
  assert.ok((link.href ?? '').length > WARN_URL_CHARS && (link.href ?? '').length <= MAX_URL_CHARS, `${link.href?.length}`);
  assert.match(link.warning ?? '', /^This link is \d+ characters long, and some chat apps cut long links\.$/);
});

test('links over 16,000 characters carry only the puzzle to open, and say so', async () => {
  const link = await preparePlayerLink(packOf(3), 1, { base: PREFIX_BASE, encodePuzzle: longEncoder(6000).encodePuzzle });
  assert.equal(link.only, true);
  assert.equal(link.portable, true);
  assert.match(link.href ?? '', /^https:\/\/tdat00\.github\.io\/pentomino\/player\/#p=[0-9A-Z]+$/, 'one code, no list, no index');
  assert.ok((link.href ?? '').length <= MAX_URL_CHARS);
});

test('a code that cannot be made is no link; a list of more than 100 puzzles carries only the one to open', async () => {
  const failing = { encodePuzzle: async () => ({ ok: /** @type {const} */ (false), issues: [{ code: 'worker-error', path: '$', message: 'm' }] }) };
  const throwing = { encodePuzzle: async () => { throw new Error('no worker'); } };
  for (const encoder of [failing, throwing]) {
    const link = await preparePlayerLink(pack, 0, { base: PREFIX_BASE, encodePuzzle: encoder.encodePuzzle });
    assert.equal(link.href, null);
    assert.equal(link.portable, false);
    assert.equal(link.warning, 'The puzzle codes could not be made.');
  }
  const many = longEncoder(10);
  const link = await preparePlayerLink(packOf(101), 100, { base: PREFIX_BASE, encodePuzzle: many.encodePuzzle });
  assert.equal(link.only, true);
  assert.match(link.href ?? '', /#p=[0-9A-Z]+$/);
  assert.equal(many.seen.length, 1, 'a code is made only for the puzzle that opens');
});

test('no link is claimed when even one puzzle is too long, or the index is invalid', async () => {
  const tooLong = await preparePlayerLink(packOf(3), 0, { base: PREFIX_BASE, encodePuzzle: longEncoder(17000).encodePuzzle });
  assert.equal(tooLong.href, null);
  assert.equal(tooLong.portable, false);
  assert.equal(tooLong.warning, 'This puzzle is too large for a link.');
  for (const [p, i] of /** @type {[typeof pack, number][]} */ ([[pack, 1], [pack, -1], [pack, 0.5], [{ ...pack, kind: 'piece-set', puzzles: [] }, 0]])) {
    const link = await preparePlayerLink(p, i, { base: PREFIX_BASE, encodePuzzle: realEncoder });
    assert.equal(link.href, null);
    assert.equal(link.portable, false);
  }
});

test('openInPlayerTab opens the tab first, points it at the player, and closes it when no link can be made', async () => {
  /** @type {string[]} */
  const visited = [];
  let opened = 0;
  let closed = 0;
  const openTab = () => {
    opened += 1;
    return { location: { assign: (/** @type {string} */ url) => visited.push(url) }, close: () => { closed += 1; }, opener: /** @type {unknown} */ ('generator') };
  };
  const result = await openInPlayerTab(pack, 0, { base: PREFIX_BASE, openTab, encodePuzzle: realEncoder });
  assert.deepEqual(result, { only: false });
  assert.deepEqual([opened, closed, visited.length], [1, 0, 1]);
  assert.match(visited[0], /\/pentomino\/player\/#p=[0-9A-Z.]+$/);

  const partial = await openInPlayerTab(packOf(3), 2, { base: PREFIX_BASE, openTab, encodePuzzle: longEncoder(6000).encodePuzzle });
  assert.deepEqual(partial, { only: true });
  assert.deepEqual([opened, closed, visited.length], [2, 0, 2]);

  await assert.rejects(
    openInPlayerTab(packOf(3), 0, { base: PREFIX_BASE, openTab, encodePuzzle: longEncoder(17000).encodePuzzle }),
    (error) => error instanceof HandoffError && error.code === 'handoff-unavailable',
  );
  assert.deepEqual([opened, closed, visited.length], [3, 1, 2], 'the empty tab is closed and nothing is shown without a link');

  await assert.rejects(
    openInPlayerTab(pack, 0, { base: PREFIX_BASE, openTab: () => null, encodePuzzle: realEncoder }),
    (error) => error instanceof HandoffError && error.code === 'popup-blocked',
  );
});

test('readIncoming reports bad addresses and indexes; #pack= and #lib= are not addresses any more', async () => {
  const cases = /** @type {[string, string][]} */ ([
    ['', 'no-incoming'],
    ['#', 'no-incoming'],
    ['#foo=1', 'no-incoming'],
    ['#pack=1z.AAAA', 'no-incoming'],
    ['#lib=0123456789abcdef&i=0', 'no-incoming'],
    [`#p=${GOLDEN_CODE}&i=1`, 'invalid-index'],
    [`#p=${GOLDEN_CODE}&i=-1`, 'invalid-hash'],
    [`#p=${GOLDEN_CODE}&pack=1z.AAAA`, 'invalid-hash'],
  ]);
  const spy = spyDecoder();
  for (const [hash, expected] of cases) {
    const result = await readIncoming({ hash }, { decodePuzzle: spy.decodePuzzle });
    assert.ok(!result.ok, hash);
    assert.equal(result.issues[0].code, expected, hash);
  }
  assert.deepEqual(spy.calls, [], 'nothing reaches the decoder');
});

const GOLDEN_CODE = '1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE';
const hashCases = /** @type {{ hash: string, ok: boolean, p?: string, normalized?: string, normalizeError?: string, code?: string }[]} */ (
  JSON.parse(readFileSync(new URL('./fixtures/puzzlecode-hashes.json', import.meta.url), 'utf8')).cases);

/**
 * A decoder that records its calls and answers with a canned result.
 * @param {(text: string) => any} [answer]
 */
function spyDecoder(answer = () => ({ ok: true, value: { pack, hasTail: true, tailError: null, code: 'x' }, warnings: [] })) {
  /** @type {string[]} */
  const calls = [];
  return { calls, decodePuzzle: async (/** @type {string} */ text) => (calls.push(text), answer(text)) };
}

test('readIncoming opens #p= through the injected decoder: one puzzle, index 0, nothing saved', async () => {
  const spy = spyDecoder();
  const result = await readIncoming({ hash: `#p=${GOLDEN_CODE}` }, { decodePuzzle: spy.decodePuzzle });
  assert.ok(result.ok);
  assert.equal(result.value.pack, pack);
  assert.equal(result.value.index, 0);
  assert.deepEqual(spy.calls, [GOLDEN_CODE]);
  const withIndex = await readIncoming({ hash: `#p=${GOLDEN_CODE}&i=0` },   { decodePuzzle: spy.decodePuzzle });
  assert.ok(withIndex.ok);
  assert.equal(withIndex.value.index, 0);
  const warned = await readIncoming({ hash: `#p=${GOLDEN_CODE}` }, {
    decodePuzzle: spyDecoder(() => ({ ok: true, value: { pack, hasTail: false, tailError: null, code: 'x' }, warnings: [{ code: 'w', path: '$', message: 'm' }] })).decodePuzzle,
  });
  assert.ok(warned.ok);
  assert.deepEqual(warned.warnings.map((w) => w.code), ['w']);
});

test('the decoder gets the normalized value of p: lower case, grouping and encoded spaces are the decoder\'s input rules', async () => {
  const spy = spyDecoder();
  for (const hash of [`#p=${GOLDEN_CODE.toLowerCase()}`, `#p=${GOLDEN_CODE.replace(/(.{4})/g, '$1-')}`, `#p=${GOLDEN_CODE.replace(/(.{4})/g, '$1%20')}`]) {
    assert.ok((await readIncoming({ hash }, { decodePuzzle: spy.decodePuzzle })).ok, hash);
  }
  assert.deepEqual(spy.calls, [GOLDEN_CODE, GOLDEN_CODE, GOLDEN_CODE]);
});

test('every p-bearing fixture hash: structural failures keep the host names, value problems reach the code as bad-char', async () => {
  let checked = 0;
  for (const c of hashCases) {
    const hash = c.hash.includes('://') ? new URL(c.hash).hash : c.hash;
    if (!isPuzzleHash(hash)) {
      continue;
    }
    checked += 1;
    const spy = spyDecoder();
    const result = await readIncoming({ hash }, { decodePuzzle: spy.decodePuzzle });
    if (!c.ok) {
      assert.ok(!result.ok, c.hash);
      assert.equal(result.issues[0].code, c.code === 'index' ? 'invalid-index' : 'invalid-hash', c.hash);
      assert.deepEqual(spy.calls, [], c.hash);
    } else if (c.normalizeError !== undefined) {
      assert.ok(!result.ok, c.hash);
      assert.equal(result.issues[0].code, c.normalizeError, c.hash);
      assert.deepEqual(spy.calls, [], `${c.hash}: p was not decoded twice or read as a link`);
    } else {
      assert.ok(result.ok, c.hash);
      assert.deepEqual(spy.calls, [c.normalized], c.hash);
    }
  }
  assert.ok(checked >= 30);
});

test('a literal plus and an encoded hash never become a space or a nested route', async () => {
  const spy = spyDecoder();
  const plus = await readIncoming({ hash: '#p=1D0J+492G' }, { decodePuzzle: spy.decodePuzzle });
  assert.ok(!plus.ok);
  assert.equal(plus.issues[0].code, 'bad-char');
  assert.deepEqual(plus.issues[0], { code: 'bad-char', path: '$', message: plus.issues[0].message, params: { char: '+' } });
  const nested = await readIncoming({ hash: '#p=1D0J%23p%3D1D0J' }, { decodePuzzle: spy.decodePuzzle });
  assert.ok(!nested.ok);
  assert.equal(nested.issues[0].code, 'bad-char');
  assert.deepEqual(spy.calls, []);
});

test('a decoder failure keeps its issues, validated core recovery and candidate, and opens nothing', async () => {
  const recovery = { kind: 'core-only', code: 'tail-check', pack };
  const candidate = { normalizedCode: 'x', correctedCode: 'y', component: 'tail', offset: 5, group: 2, position: 2, typed: '0', expected: 'E' };
  const failing = { ok: false, issues: [{ code: 'tail-check', path: '$.tail', message: 'm' }], recovery, candidate };
  const result = await readIncoming({ hash: `#p=${GOLDEN_CODE}` }, { decodePuzzle: spyDecoder(() => failing).decodePuzzle });
  assert.ok(!result.ok);
  assert.equal(result.issues[0].code, 'tail-check');
  assert.equal(/** @type {any} */ (result).recovery, recovery);
  assert.equal(/** @type {any} */ (result).candidate, candidate);
  const viaCode = await readPuzzleCode('abc', { decodePuzzle: spyDecoder(() => failing).decodePuzzle });
  assert.ok(!viaCode.ok);
  assert.equal(/** @type {any} */ (viaCode).recovery.pack, pack);
});

test('readPuzzleCode gives the typed text to the decoder untouched and refuses a piece set', async () => {
  const spy = spyDecoder();
  const link = `https://example.test/pentomino/player/#p=${GOLDEN_CODE}&i=1`;
  const result = await readPuzzleCode(link, { decodePuzzle: spy.decodePuzzle });
  assert.ok(result.ok, 'the decoder, not the loader, judges a pasted link');
  assert.deepEqual(spy.calls, [link]);
  const set = { ...pack, kind: /** @type {'piece-set'} */ ('piece-set'), puzzles: [] };
  const empty = await readPuzzleCode('abc', { decodePuzzle: spyDecoder(() => ({ ok: true, value: { pack: set, hasTail: false, tailError: null, code: 'x' }, warnings: [] })).decodePuzzle });
  assert.ok(!empty.ok);
  assert.equal(empty.issues[0].code, 'piece-set');
});

test('without an injected decoder the loader uses a temporary client: no module workers is worker-unavailable', async (t) => {
  if (typeof globalThis.Worker === 'function') {
    t.skip('this runtime has module workers');
    return;
  }
  const result = await readIncoming({ hash: `#p=${GOLDEN_CODE}` });
  assert.ok(!result.ok);
  assert.equal(result.issues[0].code, 'worker-unavailable');
});

/** One-puzzle packs of the fixture's board and pieces, each with its own puzzle id: what the decoder answers per code. */
const packA = { ...pack, puzzles: [{ ...pack.puzzles[0], id: 'a' }] };
const packB = { ...pack, puzzles: [{ ...pack.puzzles[0], id: 'b' }] };
const packC = { ...pack, puzzles: [{ ...pack.puzzles[0], id: 'c' }] };
const CODE_A = 'AAAA0000';
const CODE_B = 'BBBB1111';
const CODE_C = 'CCCC2222';
/** @param {Record<string, typeof pack>} byCode */
const listDecoder = (byCode) => spyDecoder((text) => ({ ok: true, value: { pack: byCode[text], hasTail: false, tailError: null, code: text }, warnings: [] }));

test('#p= with several codes separated by ";" opens them as one pack, in order, at the puzzle named by i', async () => {
  const spy = listDecoder({ [CODE_A]: packA, [CODE_B]: packB, [CODE_C]: packC });
  const options = { decodePuzzle: spy.decodePuzzle };
  const all = await readIncoming({ hash: `#p=${CODE_A};${CODE_B};${CODE_C}` }, options);
  assert.ok(all.ok);
  assert.deepEqual(all.value.pack.puzzles.map((p) => p.id), ['a', 'b', 'c']);
  assert.equal(all.value.index, 0);
  assert.deepEqual(all.value.pack.board, pack.board);
  assert.deepEqual(spy.calls, [CODE_A, CODE_B, CODE_C], 'each code reaches the decoder normalized, one after the other');

  const second = await readIncoming({ hash: `#p=${CODE_A};${CODE_B};${CODE_C}&i=2` }, options);
  assert.ok(second.ok);
  assert.equal(second.value.index, 2);

  spy.calls.length = 0;
  const loose = await readIncoming({ hash: `#p=${CODE_A.toLowerCase()};%20${CODE_B.replace(/(.{4})/, '$1-')}%3B${CODE_C};` }, options);
  assert.ok(loose.ok, 'lower case, grouping, spaces, an encoded ";" and a trailing ";"');
  assert.deepEqual(spy.calls, [CODE_A, CODE_B, CODE_C]);

  const one = await readIncoming({ hash: `#p=${CODE_A};` }, options);
  assert.ok(one.ok);
  assert.deepEqual(one.value.pack.puzzles.map((p) => p.id), ['a'], 'a trailing ";" leaves one puzzle');
});

test('a list is refused before any decoding when its numbers or texts are wrong', async () => {
  const spy = listDecoder({ [CODE_A]: packA, [CODE_B]: packB });
  const options = { decodePuzzle: spy.decodePuzzle };
  /** @type {[string, string][]} */
  const cases = [
    [`#p=${CODE_A};${CODE_B}&i=2`, 'invalid-index'],
    [`#p=${CODE_A};${CODE_B}&i=999999`, 'invalid-index'],
    [`#p=${CODE_A};${CODE_B}&i=x`, 'invalid-hash'],
    [`#p=${CODE_A};${CODE_B}&pack=1z.a`, 'invalid-hash'],
    [`#p=${CODE_A};${CODE_B}+1`, 'bad-char'],
    [`#p=${CODE_A};B.B.B`, 'dots'],
    ['#p=;;', 'empty'],
    [`#p=${Array.from({ length: 101 }, () => CODE_A).join(';')}`, 'too-long'],
  ];
  for (const [hash, code] of cases) {
    const result = await readIncoming({ hash }, options);
    assert.ok(!result.ok, hash);
    assert.equal(result.issues[0].code, code, hash);
  }
  assert.deepEqual(spy.calls, []);
  const hundred = await readIncoming({ hash: `#p=${Array.from({ length: 100 }, () => CODE_A).join(';')}` }, { decodePuzzle: listDecoder({ [CODE_A]: packA }).decodePuzzle });
  assert.ok(!hundred.ok && hundred.issues[0].code === 'invalid', 'a hundred codes are allowed, but the same puzzle twice is not');
});

test('a code of a list that cannot be opened names its place, offers no recovery and stops the others', async () => {
  const recovery = { kind: 'core-only', code: 'tail-check', pack: packB };
  const candidate = { normalizedCode: 'x', correctedCode: 'y', component: 'tail', offset: 5, group: 2, position: 2, typed: '0', expected: 'E' };
  const spy = spyDecoder((text) => (text === CODE_B
    ? { ok: false, issues: [{ code: 'tail-check', path: '$.tail', message: 'm' }], recovery, candidate }
    : { ok: true, value: { pack: packA, hasTail: false, tailError: null, code: text }, warnings: [] }));
  const result = await readIncoming({ hash: `#p=${CODE_A};${CODE_B};${CODE_C}` }, { decodePuzzle: spy.decodePuzzle });
  assert.ok(!result.ok);
  assert.deepEqual(result.issues.map((i) => [i.code, i.path]), [['tail-check', '$.p[1]']]);
  assert.equal(/** @type {any} */ (result).recovery, undefined);
  assert.equal(/** @type {any} */ (result).candidate, undefined);
  assert.deepEqual(spy.calls, [CODE_A, CODE_B], 'the third code is never decoded');
  // The same code alone keeps its recovery and candidate.
  const alone = await readIncoming({ hash: `#p=${CODE_B}` }, { decodePuzzle: spy.decodePuzzle });
  assert.ok(!alone.ok);
  assert.equal(/** @type {any} */ (alone).recovery, recovery);
});

test('the puzzles of a list must share one board and piece set, and none may repeat', async () => {
  const otherBoard = { ...packB, board: { ...pack.board, rows: [...pack.board.rows.slice(1)] } };
  const otherPieces = { ...packB, pieces: pack.pieces.slice(1) };
  for (const odd of [otherBoard, otherPieces]) {
    const spy = listDecoder({ [CODE_A]: packA, [CODE_B]: /** @type {any} */ (odd) });
    const result = await readIncoming({ hash: `#p=${CODE_A};${CODE_B}` }, { decodePuzzle: spy.decodePuzzle });
    assert.ok(!result.ok);
    assert.deepEqual([result.issues[0].code, result.issues[0].path], ['invalid', '$.p[1]']);
    assert.match(result.issues[0].message, /^Puzzle 2 is for another board or piece set than puzzle 1\.$/);
  }
  const twice = await readIncoming({ hash: `#p=${CODE_A};${CODE_B};${CODE_A}` }, {
    decodePuzzle: listDecoder({ [CODE_A]: packA, [CODE_B]: packB }).decodePuzzle,
  });
  assert.ok(!twice.ok);
  assert.deepEqual([twice.issues[0].code, twice.issues[0].path, twice.issues[0].message], ['invalid', '$.p[2]', 'Puzzle 3 repeats puzzle 1.']);
});

test('readPuzzleCode reads a typed or pasted list too, and still leaves a single code or link to the decoder', async () => {
  const spy = listDecoder({ [CODE_A]: packA, [CODE_B]: packB });
  const typed = await readPuzzleCode(`${CODE_A.toLowerCase()}; ${CODE_B}`, { decodePuzzle: spy.decodePuzzle });
  assert.ok(typed.ok);
  assert.deepEqual(typed.value.pack.puzzles.map((p) => p.id), ['a', 'b']);
  assert.deepEqual(spy.calls, [CODE_A, CODE_B]);
  const pasted = await readPuzzleCode(`https://example.test/pentomino/player/#p=${CODE_A};${CODE_B}&i=1`, { decodePuzzle: spy.decodePuzzle });
  assert.ok(pasted.ok);
  assert.equal(pasted.value.index, 1);
  const refusing = spyDecoder(() => ({ ok: false, issues: [{ code: 'index', path: '$', message: 'm' }] }));
  const badIndex = await readPuzzleCode(`https://example.test/pentomino/player/#p=${CODE_A};${CODE_B}&i=2`, { decodePuzzle: refusing.decodePuzzle });
  assert.ok(!badIndex.ok, 'a puzzle number that names no code is the decoder\'s to refuse, as an address the list reader does not take');
  assert.equal(refusing.calls.length, 1);
  const calls = spy.calls.length;
  const plain = spyDecoder();
  const single = await readPuzzleCode(`https://example.test/pentomino/player/#p=${CODE_A}&i=1`, { decodePuzzle: plain.decodePuzzle });
  assert.ok(single.ok, 'one code: the text goes to the decoder untouched, as before');
  assert.equal(plain.calls.length, 1);
  assert.equal(spy.calls.length, calls);
});

test('without an injected decoder a list uses one temporary client for all its codes', async (t) => {
  if (typeof globalThis.Worker === 'function') {
    t.skip('this runtime has module workers');
    return;
  }
  const result = await readIncoming({ hash: `#p=${GOLDEN_CODE};${GOLDEN_CODE}` });
  assert.ok(!result.ok);
  assert.equal(result.issues[0].code, 'worker-unavailable');
  assert.equal(result.issues[0].path, '$.p[0]');
});

test('readPack opens the first puzzle of pack JSON and rejects the rest', () => {
  const result = readPack(fixtureText);
  assert.ok(result.ok);
  assert.equal(result.value.index, 0);
  assert.equal(result.value.pack.puzzles[0].id, 'example-1');
  for (const text of ['', 'hello world', '{"format":"pentomino-pack"}', '[1,2]']) {
    assert.ok(!readPack(text).ok, text);
  }
  const pieceSet = readPack(JSON.stringify({ ...pack, kind: 'piece-set', puzzles: [] }));
  assert.ok(!pieceSet.ok);
  assert.equal(pieceSet.issues[0].message, PIECE_SET_MESSAGE);
});

/**
 * Minimal DOM stand-in installed on globalThis.
 * @param {(env: { doc: any, urls: { made: Blob[], revoked: string[] }, timers: Function[] }) => Promise<void> | void} fn
 */
async function withFakeDom(fn) {
  /** @param {string} tag */
  const make = (tag) => ({
    tagName: tag,
    className: '',
    textContent: '',
    value: '',
    removed: false,
    clicks: 0,
    attrs: /** @type {Record<string, string>} */ ({}),
    dataset: /** @type {Record<string, string>} */ ({}),
    children: /** @type {any[]} */ ([]),
    listeners: /** @type {Record<string, Function>} */ ({}),
    setAttribute(/** @type {string} */ k, /** @type {string} */ v) {
      this.attrs[k] = v;
    },
    addEventListener(/** @type {string} */ t, /** @type {Function} */ f) {
      this.listeners[t] = f;
    },
    append(/** @type {any[]} */ ...n) {
      this.children.push(...n);
    },
    remove() {
      this.removed = true;
    },
    click() {
      this.clicks += 1;
    },
    select() {},
  });
  const body = make('body');
  const doc = {
    body,
    created: /** @type {any[]} */ ([]),
    copied: 0,
    execCopy: true,
    createElement(/** @type {string} */ tag) {
      const node = make(tag);
      this.created.push(node);
      return node;
    },
    createTextNode: (/** @type {string} */ text) => ({ text }),
    querySelector: (/** @type {string} */ sel) => body.children.find((c) => sel === `.${c.className}`) ?? null,
    execCommand(/** @type {string} */ name) {
      this.copied += name === 'copy' ? 1 : 0;
      return this.execCopy;
    },
  };
  /** @type {Function[]} */
  const timers = [];
  const saved = {
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
    setTimeout: globalThis.setTimeout,
    create: URL.createObjectURL,
    revoke: URL.revokeObjectURL,
  };
  /** @type {{ made: Blob[], revoked: string[] }} */
  const urls = { made: [], revoked: [] };
  Object.defineProperty(globalThis, 'document', { value: doc, configurable: true, writable: true });
  globalThis.setTimeout = /** @type {any} */ ((/** @type {Function} */ f) => timers.push(f));
  URL.createObjectURL = (blob) => {
    urls.made.push(/** @type {Blob} */ (blob));
    return `blob:test/${urls.made.length}`;
  };
  URL.revokeObjectURL = (url) => void urls.revoked.push(url);
  try {
    await fn({ doc, urls, timers });
  } finally {
    if (saved.document) {
      Object.defineProperty(globalThis, 'document', saved.document);
    } else {
      delete (/** @type {any} */ (globalThis)).document;
    }
    globalThis.setTimeout = saved.setTimeout;
    URL.createObjectURL = saved.create;
    URL.revokeObjectURL = saved.revoke;
  }
}

test('downloadText saves through a safe file name and revokes the URL after use', async () => {
  await withFakeDom(async ({ doc, urls, timers }) => {
    downloadText('My: report.json', '{"a":1}');
    downloadText('../evil/name.md', '# x', 'text/markdown');
    downloadText('???', '');
    const links = doc.created.filter((/** @type {any} */ n) => n.tagName === 'a');
    assert.deepEqual(links.map((/** @type {any} */ n) => n.attrs.download), ['My- report.json', 'evil-name.md', 'puzzle']);
    assert.deepEqual(links.map((/** @type {any} */ n) => n.clicks), [1, 1, 1]);
    assert.ok(links.every((/** @type {any} */ n) => n.removed));
    assert.equal(await urls.made[0].text(), '{"a":1}');
    assert.equal(urls.made[1].type, 'text/markdown;charset=utf-8');
    assert.deepEqual(urls.revoked, [], 'revoked after use, not before');
    timers.forEach((f) => f());
    assert.equal(urls.revoked.length, 3);
  });
});

test('dom helpers are text-only: no inline handlers, styles or script URLs', async () => {
  await withFakeDom(async ({ doc, timers }) => {
    const node = el('p', { className: 'note', text: '<img src=x onerror=alert(1)>', dataset: { id: '7' }, on: { click: () => {} } }, 'tail', null);
    assert.equal(node.textContent, '<img src=x onerror=alert(1)>');
    assert.equal(node.className, 'note');
    assert.equal(node.dataset.id, '7');
    assert.deepEqual(/** @type {any} */ (node).children, [{ text: 'tail' }]);
    assert.equal(typeof (/** @type {any} */ (node)).listeners.click, 'function');
    assert.throws(() => el('a', { attrs: { onclick: 'x()' } }), TypeError);
    assert.throws(() => el('a', { attrs: { style: 'color:red' } }), TypeError);
    assert.throws(() => el('a', { attrs: { href: ' JavaScript:alert(1)' } }), TypeError);
    el('a', { attrs: { href: '../player/' } });

    const toast = showToast('<b>saved</b>', { kind: 'warning' });
    assert.equal(toast.textContent, '<b>saved</b>');
    assert.equal(toast.className, 'toast toast-warning');
    showToast('second');
    assert.equal(doc.body.children.filter((/** @type {any} */ c) => c.className === 'toast-host').length, 1, 'one host');
    timers[0]();
    assert.equal(/** @type {any} */ (toast).removed, true);

    assert.equal(safeFileName('a/b\\c:d'), 'a-b-c-d');
    assert.equal(safeFileName('...'), 'puzzle');
    assert.equal(safeFileName('x'.repeat(500)).length, 120);
  });
});

test('copyText prefers the async clipboard and falls back to execCommand, never throwing', async () => {
  await withFakeDom(async ({ doc }) => {
    const navDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    /** @param {unknown} value */
    const setNavigator = (value) => Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
    try {
      /** @type {string[]} */
      const copied = [];
      setNavigator({ clipboard: { writeText: async (/** @type {string} */ t) => void copied.push(t) } });
      assert.equal(await copyText('link'), true);
      assert.deepEqual(copied, ['link']);
      setNavigator({ clipboard: { writeText: async () => { throw new Error('denied'); } } });
      assert.equal(await copyText('link'), true);
      assert.equal(doc.copied, 1);
      const area = doc.created.at(-1);
      assert.equal(area.removed, true);
      assert.equal(area.value, 'link');
      doc.execCopy = false;
      assert.equal(await copyText('link'), false);
      setNavigator(undefined);
      doc.execCommand = undefined;
      assert.equal(await copyText('link'), false);
    } finally {
      if (navDescriptor) {
        Object.defineProperty(globalThis, 'navigator', navDescriptor);
      }
    }
  });
});
