// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { parsePack } from '../core/engine/pack.js';
import { encodePuzzleCode } from '../core/engine/puzzlecode.js';
import { MAX_URL_CHARS } from '../core/engine/sharecode.js';
import { preparePuzzleListShare, puzzleSnapshot } from '../core/browser/puzzle-snapshot.js';
import { makeListQr } from '../core/browser/qr.js';
import { createShareController, prepareShareLink } from '../core/browser/share-dialog.js';
import { PoolAbortError } from '../core/browser/worker-pool.js';

const require = createRequire(import.meta.url);
/** @type {(data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: string }) => { data: string } | null} */
const jsQR = require('./vendor/jsqr.cjs');

const parsed = parsePack(readFileSync(new URL('../player/samples/sample-pack.json', import.meta.url), 'utf8'));
assert.ok(parsed.ok);
const sample = parsed.value;
const TARGET = 'https://example.test/pentomino/player/';
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** @param {number} rotation */
const snapshots = (rotation = 0) => sample.puzzles.map((puzzle, index) => puzzleSnapshot({ rows: sample.board.rows, pieces: sample.pieces, puzzle, index, rotation }));

/** The real codec, as the worker runs it. */
const realClient = {
  encode: async (/** @type {import('../core/engine/puzzlecode.js').PuzzleCodeSnapshot} */ data) => ({ ok: /** @type {const} */ (true), value: await encodePuzzleCode(data), warnings: [] }),
};

/**
 * A client that answers a valid, distinct code per call: a core of `core` symbols and a tail of `tail` (0 for none).
 * @param {number} core
 * @param {number} tail
 */
function fakeClient(core, tail) {
  let n = 0;
  return {
    encode: async () => {
      n += 1;
      const C = `${ALPHABET[n % 32]}${'B'.repeat(core - 1)}`;
      const T = tail > 0 ? `${ALPHABET[(n + 7) % 32]}${'C'.repeat(tail - 1)}` : null;
      return { ok: /** @type {const} */ (true), value: { C, T, F: T === null ? C : `${C}.${T}`, version: /** @type {const} */ (1) }, warnings: [] };
    },
  };
}

/** @param {ArrayLike<ArrayLike<number>>} rows */
function scan(rows) {
  const scale = 4;
  const quiet = 4;
  const side = (rows.length + 2 * quiet) * scale;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows.length; x += 1) {
      if (rows[y][x] !== 1) {
        continue;
      }
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const at = (((y + quiet) * scale + dy) * side + (x + quiet) * scale + dx) * 4;
          data[at] = 0;
          data[at + 1] = 0;
          data[at + 2] = 0;
        }
      }
    }
  }
  return jsQR(data, side, side, { inversionAttempts: 'dontInvert' });
}

test('makeListQr carries the prefix, every code and the puzzle number, and a scanner reads exactly that address', () => {
  const codes = ['1D0J492G47DMXNG6YCP10HCY05KZW8S4HCN2QR.18V3WE', '1D2KTH4A0GXPKPP0VSJR425KR0JJR03GKGJ0N2', '1DESV14A0GXPKPP0VSJR425KR0EKJ97PGQXMQ.19M0GDB'];
  const made = makeListQr({ urlPrefix: `${TARGET}#p=`, codes, suffix: '&i=2' });
  assert.ok(made.ok);
  const url = `${TARGET}#p=${codes.join(';')}&i=2`;
  assert.equal(made.value.url, url);
  assert.equal(made.value.ec, 'M');
  assert.equal(scan(made.value.rows)?.data, url);
  const plain = makeListQr({ urlPrefix: `${TARGET}#p=`, codes: [codes[0]] });
  assert.ok(plain.ok);
  assert.equal(scan(plain.value.rows)?.data, `${TARGET}#p=${codes[0]}`);
  const low = makeListQr({ urlPrefix: `${TARGET}#p=`, codes, ec: 'L' });
  assert.ok(low.ok && low.value.version <= made.value.version);
});

test('makeListQr refuses what no producer may send and reports a list that does not fit', () => {
  const prefix = `${TARGET}#p=`;
  for (const input of [
    { urlPrefix: 'https://example.test/', codes: ['ABC'] },
    { urlPrefix: prefix, codes: [] },
    { urlPrefix: prefix, codes: ['abc'] },
    { urlPrefix: prefix, codes: ['ABC', 'A;B'] },
    { urlPrefix: prefix, codes: ['ABC'], suffix: '&i=x' },
    { urlPrefix: prefix, codes: ['ABC'], suffix: '#' },
  ]) {
    const made = makeListQr(/** @type {any} */ (input));
    assert.ok(!made.ok && made.code === 'qr-invalid-input', JSON.stringify(input));
  }
  const huge = makeListQr({ urlPrefix: prefix, codes: Array.from({ length: 4 }, () => 'B'.repeat(1500)) });
  assert.ok(!huge.ok && huge.code === 'qr-too-long');
});

test('a list link has the code of every puzzle, in order, with the number of the one to open, and its QR is that very link', async () => {
  const list = snapshots();
  const first = await preparePuzzleListShare(list, { target: TARGET, client: realClient });
  assert.equal(first.carried, 'C.T');
  assert.deepEqual(first.notices, []);
  assert.equal(first.codes.length, 3);
  assert.equal(first.url, `${TARGET}#p=${first.codes.join(';')}`, 'puzzle 1 needs no number');
  assert.ok(first.qr !== null);
  assert.equal(scan(first.qr.rows)?.data, first.url);
  const third = await preparePuzzleListShare(list, { target: TARGET, client: realClient, index: 2 });
  assert.equal(third.url, `${first.url}&i=2`);
  assert.equal(scan(/** @type {NonNullable<typeof third.qr>} */ (third.qr).rows)?.data, third.url);
  // The codes are those of the single-puzzle link: each code decodes to its own puzzle.
  const [only] = await Promise.all([preparePuzzleListShare([list[1]], { target: TARGET, client: realClient })]);
  assert.equal(only.url, `${TARGET}#p=${first.codes[1]}`);
});

test('the list ladder: the stored answers first, then error correction L, then no QR, and no link above 16,000 characters', async () => {
  const list = snapshots();
  const fits = await preparePuzzleListShare(list, { target: TARGET, client: fakeClient(200, 40) });
  assert.deepEqual([fits.notices, fits.carried, fits.qr !== null], [[], 'C.T', true]);
  const noTail = await preparePuzzleListShare(list, { target: TARGET, client: fakeClient(500, 800) });
  assert.deepEqual(noTail.notices, ['noTail']);
  assert.equal(noTail.carried, 'C');
  assert.ok(noTail.qr !== null && noTail.url !== null && !noTail.url.slice(noTail.url.indexOf('#p=')).includes('.'));
  const lowEc = await preparePuzzleListShare(list, { target: TARGET, client: fakeClient(1350, 0) });
  assert.deepEqual(lowEc.notices, ['lowEc']);
  assert.ok(lowEc.qr !== null && lowEc.qr.ec === 'L');
  const none = await preparePuzzleListShare(list, { target: TARGET, client: fakeClient(1500, 0) });
  assert.deepEqual(none.notices, ['none']);
  assert.ok(none.qr === null && none.url !== null && none.url.length <= MAX_URL_CHARS);
  const tooLarge = await preparePuzzleListShare(list, { target: TARGET, client: fakeClient(5500, 0) });
  assert.deepEqual([tooLarge.url, tooLarge.qr], [null, null]);
  const dropsAnswers = await preparePuzzleListShare(list, { target: TARGET, client: fakeClient(3000, 4000) });
  assert.ok(dropsAnswers.url !== null && dropsAnswers.notices.includes('noTail'), 'the answers go before the link is refused');
});

test('a list needs puzzles, a valid number and a target; an encoder failure is not an oversize puzzle', async () => {
  await assert.rejects(preparePuzzleListShare([], { target: TARGET, client: realClient }), RangeError);
  await assert.rejects(preparePuzzleListShare(snapshots(), { target: TARGET, client: realClient, index: 3 }), RangeError);
  await assert.rejects(preparePuzzleListShare(snapshots(), { target: 'javascript:alert(1)', client: realClient }), (e) => /** @type {any} */ (e).code === 'target-invalid');
  const failing = { encode: async () => ({ ok: /** @type {const} */ (false), issues: [{ code: 'worker-error', path: '$', message: 'no worker' }] }) };
  await assert.rejects(preparePuzzleListShare(snapshots(), { target: TARGET, client: failing }), (e) => /** @type {any} */ (e).code === 'encode-failed');
});

test('prepareShareLink: one puzzle is the address of the selected puzzle, all is the list', async () => {
  const source = { snapshots: snapshots(), index: 1 };
  const one = await prepareShareLink(source, false, { target: TARGET, client: realClient });
  assert.match(one.url ?? '', /^https:\/\/example\.test\/pentomino\/player\/#p=[0-9A-Z.]+$/);
  assert.ok(!(one.url ?? '').includes(';') && !(one.url ?? '').includes('&i='));
  const all = await prepareShareLink(source, true, { target: TARGET, client: realClient });
  assert.equal(all.url?.split(';').length, 3);
  assert.ok((all.url ?? '').endsWith('&i=1'));
  assert.ok((all.url ?? '').includes((one.url ?? '').slice(one.url?.indexOf('#p=') ?? 0 + 3).replace('#p=', '')));
});

/**
 * A controller over a source the test changes, with an encoder it releases by hand.
 * @param {{ list?: ReturnType<typeof snapshots>, index?: number, clipboard?: (text: string) => Promise<boolean> }} [o]
 */
function harness(o = {}) {
  const source = { snapshots: o.list ?? snapshots(), index: o.index ?? 0 };
  /** @type {import('../core/browser/share-dialog.js').ShareSource | null} */
  let current = source;
  /** @type {Array<{ all: boolean, resolve: (value: import('../core/browser/share-dialog.js').PreparedLink) => void, reject: (e: unknown) => void }>} */
  const pending = [];
  /** @type {import('../core/browser/share-dialog.js').ShareState[]} */
  const states = [];
  const written = /** @type {string[]} */ ([]);
  const controller = createShareController({
    getSource: () => current,
    prepare: (_s, all) => new Promise((resolve, reject) => {
      pending.push({ all, resolve, reject });
    }),
    writeClipboard: o.clipboard ?? (async (text) => {
      written.push(text);
      return true;
    }),
    onChange: (state) => states.push(state),
  });
  return {
    controller,
    pending,
    states,
    written,
    source,
    /** @param {typeof current} next */
    select(next) {
      current = next;
    },
  };
}

/** @param {string} url @returns {import('../core/browser/share-dialog.js').PreparedLink} */
const link = (url) => ({ url, qr: null, notices: [] });
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('the share controller prepares the selected puzzle on open, offers the list only when there is more than one puzzle', async () => {
  const h = harness();
  assert.equal(h.controller.getState().status, 'closed');
  assert.ok(h.controller.open());
  assert.deepEqual([h.controller.getState().status, h.controller.getState().all, h.controller.getState().canAll], ['preparing', false, true]);
  assert.deepEqual(h.pending.map((p) => p.all), [false]);
  h.pending[0].resolve(link('http://x/#p=A'));
  await tick();
  assert.deepEqual([h.controller.getState().status, h.controller.getState().url], ['ready', 'http://x/#p=A']);
  const single = harness({ list: snapshots().slice(0, 1) });
  single.controller.open();
  assert.equal(single.controller.getState().canAll, false);
  single.controller.setAll(true);
  assert.equal(single.controller.getState().all, false, 'a list of one is not a list');
  const none = harness();
  none.select(null);
  assert.equal(none.controller.open(), false);
});

test('the share controller: the list option prepares the list, and going back reuses what was made', async () => {
  const h = harness();
  h.controller.open();
  h.pending[0].resolve(link('http://x/#p=A'));
  await tick();
  h.controller.setAll(true);
  assert.deepEqual([h.controller.getState().status, h.controller.getState().all], ['preparing', true]);
  assert.deepEqual(h.pending.map((p) => p.all), [false, true]);
  h.pending[1].resolve(link('http://x/#p=A;B;C'));
  await tick();
  assert.equal(h.controller.getState().url, 'http://x/#p=A;B;C');
  h.controller.setAll(false);
  assert.deepEqual([h.controller.getState().status, h.controller.getState().url, h.pending.length], ['ready', 'http://x/#p=A', 2], 'no new preparation');
  h.controller.close();
  h.controller.open();
  assert.equal(h.controller.getState().all, false, 'it opens on the selected puzzle again');
});

test('a late answer for an earlier choice or selection is ignored', async () => {
  const h = harness();
  h.controller.open();
  h.controller.setAll(true);
  h.pending[0].resolve(link('http://x/#p=ONE'));
  await tick();
  assert.equal(h.controller.getState().status, 'preparing', 'the answer of the earlier choice is dropped');
  h.pending[1].resolve(link('http://x/#p=ALL'));
  await tick();
  assert.equal(h.controller.getState().url, 'http://x/#p=ALL');
  h.select({ snapshots: h.source.snapshots, index: 2 });
  h.controller.refresh();
  assert.equal(h.controller.getState().status, 'preparing', 'another puzzle is another link');
  h.pending[2].resolve(link('http://x/#p=ALL&i=2'));
  await tick();
  assert.equal(h.controller.getState().url, 'http://x/#p=ALL&i=2');
  h.controller.refresh();
  assert.equal(h.pending.length, 3, 'the same selection is not prepared again');
  h.select({ snapshots: h.source.snapshots, index: 1 });
  h.controller.refresh();
  assert.equal(h.pending.length, 4);
  h.select({ snapshots: h.source.snapshots, index: 0 });
  h.controller.refresh();
  assert.equal(h.controller.getState().url, 'http://x/#p=ALL', 'puzzle 1 was already prepared');
  h.pending[3].resolve(link('http://x/#p=STALE'));
  await tick();
  assert.equal(h.controller.getState().url, 'http://x/#p=ALL', 'the answer for puzzle 2 is not shown for puzzle 1');
});

test('too large, failed and cancelled preparations: no link, a retry, and nothing after close', async () => {
  const h = harness();
  h.controller.open();
  h.pending[0].resolve({ url: null, qr: null, notices: [] });
  await tick();
  assert.deepEqual([h.controller.getState().status, h.controller.getState().tooLarge, h.controller.getState().url], ['ready', true, null]);
  await h.controller.copy();
  assert.deepEqual(h.written, [], 'nothing to copy');
  h.controller.setAll(true);
  h.pending[1].reject(new Error('worker'));
  await tick();
  assert.equal(h.controller.getState().status, 'error');
  h.controller.retry();
  assert.equal(h.controller.getState().status, 'preparing');
  h.controller.close();
  h.pending[2].resolve(link('http://x/#p=LATE'));
  await tick();
  assert.deepEqual([h.controller.getState().status, h.controller.getState().url], ['closed', null], 'a closed dialog ignores a late answer');
  const abort = harness();
  abort.controller.open();
  abort.pending[0].reject(new PoolAbortError('superseded'));
  await tick();
  assert.equal(abort.controller.getState().status, 'preparing', 'an abort is not an error');
});

test('copy writes the link of the choice made, says whether the browser took it, and drops an answer for another link', async () => {
  const h = harness();
  h.controller.open();
  h.pending[0].resolve(link('http://x/#p=A'));
  await tick();
  await h.controller.copy();
  assert.deepEqual([h.written, h.controller.getState().copy], [['http://x/#p=A'], 'copied']);
  h.controller.setAll(true);
  assert.equal(h.controller.getState().copy, null, 'a new link has not been copied');
  const refused = harness({ clipboard: async () => false });
  refused.controller.open();
  refused.pending[0].resolve(link('http://x/#p=A'));
  await tick();
  await refused.controller.copy();
  assert.equal(refused.controller.getState().copy, 'failed');
  const throwing = harness({ clipboard: async () => { throw new Error('denied'); } });
  throwing.controller.open();
  throwing.pending[0].resolve(link('http://x/#p=A'));
  await tick();
  await throwing.controller.copy();
  assert.equal(throwing.controller.getState().copy, 'failed', 'a refusing clipboard never throws');

  /** @type {(value: boolean) => void} */
  let release = () => {};
  const slow = harness({ clipboard: () => new Promise((resolve) => { release = resolve; }) });
  slow.controller.open();
  slow.pending[0].resolve(link('http://x/#p=A'));
  await tick();
  const copying = slow.controller.copy();
  slow.controller.setAll(true);
  release(true);
  await copying;
  assert.equal(slow.controller.getState().copy, null, 'the write finished for a link that is no longer shown');
});
