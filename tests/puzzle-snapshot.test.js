// @ts-check
// RP05: the immutable print/copy snapshot, the Player target rules and the code/QR preparation with its capacity
// ladder. The modules are imported here without a DOM, a worker or a locale, exactly as RP06 and RP07 need them; the
// code itself is made by the real codec behind a client of the same shape as the worker-backed one.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { decodePuzzleCode, encodePuzzleCode } from '../core/engine/puzzlecode.js';
import { puzzleCodeUrl } from '../core/engine/sharecode.js';
import { puzzleDisplayName } from '../core/browser/puzzle-title.js';
import {
  PUBLIC_PLAYER_URL, PuzzleShareError, isLocalHost, isSameSnapshot, preparePuzzleShare, puzzlePlayerTarget, puzzleSnapshot,
} from '../core/browser/puzzle-snapshot.js';

const require = createRequire(import.meta.url);
/** @type {(data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: string }) => { data: string } | null} */
const jsQR = require('./vendor/jsqr.cjs');

const pack = JSON.parse(readFileSync(new URL('../player/samples/sample-pack.json', import.meta.url), 'utf8'));
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** @param {number} n */
const english = (n) => `Puzzle #${n}`;
/** @param {number} n */
const vietnamese = (n) => `Đề #${n}`;

/**
 * @param {number} [index]
 * @param {Partial<Parameters<typeof puzzleSnapshot>[0]>} [over]
 */
function snapshotOf(index = 0, over = {}) {
  return puzzleSnapshot({
    rows: pack.board.rows, pieces: pack.pieces, puzzle: pack.puzzles[index], index, rotation: 0, untitled: english, ...over,
  });
}

/** A client of the shape of the worker-backed one, running the real codec here. */
const codecClient = {
  /** @param {import('../core/engine/puzzlecode.js').PuzzleCodeSnapshot} data */
  encode: async (data) => ({ ok: /** @type {const} */ (true), value: await encodePuzzleCode(data), warnings: [] }),
};

/**
 * @param {string} C
 * @param {string | null} T
 */
const fixedClient = (C, T) => ({
  encode: async () => ({ ok: /** @type {const} */ (true), value: { C, T, F: T === null ? C : `${C}.${T}`, version: /** @type {const} */ (1) }, warnings: [] }),
});

/** @param {number} length */
const symbols = (length) => ALPHABET.repeat(Math.ceil(length / ALPHABET.length)).slice(0, length);

/** @param {ReadonlyArray<ArrayLike<number>>} rows */
function decodeQr(rows) {
  const scale = 4;
  const quiet = 4;
  const side = (rows.length + quiet * 2) * scale;
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

test('the snapshot is built from injected data, with no DOM, worker or locale in sight', () => {
  assert.equal(typeof document, 'undefined');
  const first = snapshotOf(0);
  assert.equal(first.heading, 'Easy #1');
  assert.equal(first.data.title, 'Easy', 'the first puzzle keeps its stored title');
  assert.equal(first.data.rotation, 0);
  assert.deepEqual(first.data.rows, pack.board.rows);
  assert.equal(first.data.pieces.length, pack.pieces.length);
  assert.equal(first.data.clues.length, pack.puzzles[0].clues.length);
  assert.equal(first.data.solution?.length, pack.pieces.length, 'the stored answer is carried');
  assert.equal(first.data.rating?.level, 'easy');
  assert.equal(first.data.certificate, null);

  const third = snapshotOf(2);
  assert.equal(third.heading, 'Hard #3');
  assert.equal(third.data.title, 'Hard #3', 'at another position the code carries the displayed heading');

  const untitled = puzzleSnapshot({ rows: pack.board.rows, pieces: pack.pieces, puzzle: { clues: pack.puzzles[0].clues }, index: 1, rotation: 90, untitled: vietnamese });
  assert.equal(untitled.heading, 'Đề #2');
  assert.equal(untitled.data.title, 'Đề #2');
  assert.equal(untitled.data.rotation, 90);
  assert.equal(untitled.data.solution, null);
  assert.equal(untitled.data.rating, null);
  const first0 = puzzleSnapshot({ rows: pack.board.rows, pieces: pack.pieces, puzzle: { clues: pack.puzzles[0].clues }, index: 0, rotation: 0 });
  assert.equal(first0.data.title, null, 'an untitled first puzzle encodes no title');
  assert.equal(first0.heading, 'Puzzle #1', 'English without a callback');
});

test('the snapshot is detached and immutable: the source is never touched and cannot change it', () => {
  const source = structuredClone(pack);
  const before = JSON.stringify(source);
  const snapshot = puzzleSnapshot({ rows: source.board.rows, pieces: source.pieces, puzzle: source.puzzles[0], index: 0, rotation: 45 });
  assert.equal(JSON.stringify(source), before, 'the source is unchanged');
  const key = snapshot.key;
  source.board.rows[0] = '.'.repeat(10);
  source.pieces[0].color = '#000000';
  source.pieces[0].cells[0][0] = 99;
  source.puzzles[0].clues[0].x = 9;
  source.puzzles[0].solution.pop();
  source.puzzles[0].rating.score = 99;
  source.puzzles[0].rating.metrics.U = 99;
  assert.equal(snapshot.key, key);
  assert.equal(JSON.stringify(snapshot.data), key, 'the key is the data, so editing the source cannot reach it');
  assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.data) && Object.isFrozen(snapshot.data.pieces[0].cells[0]));
  assert.throws(() => {
    /** @type {any} */ (snapshot.data).title = 'x';
  }, TypeError);
  assert.throws(() => {
    /** @type {any} */ (snapshot.data.clues[0]).x = 3;
  }, TypeError);
});

test('the key covers every code-relevant value and nothing else', () => {
  const base = snapshotOf(0);
  assert.equal(snapshotOf(0).key, base.key, 'the same puzzle gives the same key');
  assert.ok(isSameSnapshot(base, snapshotOf(0)));
  const differs = (/** @type {string} */ what, /** @type {ReturnType<typeof snapshotOf>} */ other) => {
    assert.notEqual(other.key, base.key, what);
    assert.equal(isSameSnapshot(base, other), false, what);
  };
  differs('the title', snapshotOf(0, { puzzle: { ...pack.puzzles[0], title: 'Warm-up' } }));
  differs('the angle', snapshotOf(0, { rotation: 45 }));
  differs('the position of a titled puzzle', snapshotOf(0, { index: 3 }));
  differs('the stored answer', snapshotOf(0, { puzzle: { ...pack.puzzles[0], solution: null } }));
  differs('a clue', snapshotOf(0, { puzzle: { ...pack.puzzles[0], clues: pack.puzzles[0].clues.slice(1) } }));
  differs('the rating', snapshotOf(0, { puzzle: { ...pack.puzzles[0], rating: { ...pack.puzzles[0].rating, score: 9 } } }));
  differs('the certificate', snapshotOf(0, { puzzle: { ...pack.puzzles[0], certificate: { status: 'unique', model: 'dlx-v1', rowLimit: 5 } } }));
  differs('a piece colour', snapshotOf(0, { pieces: pack.pieces.map((/** @type {{ color: string }} */ p, /** @type {number} */ i) => (i === 0 ? { ...p, color: '#123456' } : p)) }));
  differs('the board', snapshotOf(0, { rows: ['#'.repeat(10), ...pack.board.rows.slice(1, 5), '#########.'] }));
  // Progress, timers and other state of the app are not part of the puzzle.
  const noisy = { ...pack.puzzles[0], moves: 12, elapsedMs: 99, seed: 'abc', hintsUsed: 2 };
  assert.equal(snapshotOf(0, { puzzle: noisy }).key, base.key);
  // The heading follows the language even where the code does not (an untitled first puzzle).
  const untitled = { clues: pack.puzzles[0].clues };
  const en = snapshotOf(0, { puzzle: untitled, untitled: english });
  const vi = snapshotOf(0, { puzzle: untitled, untitled: vietnamese });
  assert.equal(en.key, vi.key, 'the same code');
  assert.equal(isSameSnapshot(en, vi), false, 'but another printed heading');
  assert.equal(isSameSnapshot(en, null), false);
});

test('claims are whitelisted like the Play link writes them, whichever app they come from', () => {
  const engineStyle = {
    id: 'p1',
    title: 'Easy',
    seed: 'batch-seed',
    clues: pack.puzzles[0].clues,
    solution: pack.puzzles[0].solution,
    rating: { ...pack.puzzles[0].rating, verified: true },
    certificate: { status: 'unique', model: 'dlx-v1', rowLimit: 100, verified: true },
  };
  const claimed = snapshotOf(0, { puzzle: engineStyle });
  assert.deepEqual(claimed.data.certificate, { status: 'unique', model: 'dlx-v1', rowLimit: 100 }, '`verified` is never carried');
  assert.deepEqual(Object.keys(/** @type {object} */ (claimed.data.rating?.metrics)), ['U', 'B', 'branchTrials', 'rowTrials', 'stop', 'R', 'H'], 'a v2 rating keeps all seven metrics');
  const stored = snapshotOf(0, { puzzle: { ...engineStyle, rating: pack.puzzles[0].rating, seed: undefined } });
  assert.equal(stored.key, claimed.key, 'a pack puzzle and an engine puzzle with the same content give the same key');
  const foreign = snapshotOf(0, { puzzle: { ...pack.puzzles[0], rating: { model: 'other-v9', score: 5, level: 'custom', censored: true, metrics: { anything: [1, 2, { deep: true }] } } } });
  assert.deepEqual(foreign.data.rating, { model: 'other-v9', score: 5, level: 'custom', censored: true, metrics: { anything: [1, 2, { deep: true }] } }, 'opaque claims survive');
  assert.equal(snapshotOf(0, { puzzle: { ...pack.puzzles[0], solution: [] } }).data.solution, null, 'an empty answer is no answer');
  assert.equal(snapshotOf(0, { rotation: -45 }).data.rotation, 315);
  assert.throws(() => snapshotOf(0, { rotation: 20 }), 'an angle no pack can hold is refused');
});

test('what the code carries re-creates the printed heading, the angle, the clues and the answer', async () => {
  for (const [index, angle] of /** @type {const} */ ([[0, 0], [1, 135], [2, 270]])) {
    const snapshot = snapshotOf(index, { rotation: angle, untitled: vietnamese });
    const share = await preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client: codecClient });
    assert.equal(share.carried, 'C.T');
    const decoded = await decodePuzzleCode(share.code.F);
    const puzzle = decoded.pack.puzzles[0];
    assert.equal(decoded.pack.presentation?.rotation, angle);
    assert.equal(puzzleDisplayName(puzzle.title, 0, vietnamese), snapshot.heading, 'the re-created puzzle shows the printed heading');
    assert.equal(puzzle.clues.length, pack.puzzles[index].clues.length);
    assert.equal(puzzle.solution?.length, pack.pieces.length);
    assert.deepEqual(decoded.pack.pieces.map((/** @type {{ id: string }} */ p) => p.id), pack.pieces.map((/** @type {{ id: string }} */ p) => p.id), 'piece order');
  }
});

test('hosts: loopback, private, link-local and local names are local; public hosts stay public', () => {
  for (const host of [
    'localhost', 'LocalHost', 'localhost.', 'dev.localhost', 'app.dev.LOCALHOST.', 'printer.local', 'My-Mac.local.',
    '127.0.0.1', '127.255.255.254', '10.0.0.1', '10.255.255.255', '172.16.0.1', '172.31.255.255', '192.168.0.1', '192.168.255.255', '169.254.0.1', '169.254.169.254',
    '[::1]', '::1', '[fc00::1]', 'fd12:3456:789a::1', 'fdff::', '[fe80::1]', 'FE80::ABCD', 'febf::1', '::ffff:7f00:1', '[::ffff:a00:1]', '::ffff:c0a8:101', '::ffff:127.0.0.1', '::ffff:10.1.2.3', '::ffff:169.254.1.1', '::ffff:172.16.0.5',
  ]) {
    assert.equal(isLocalHost(host), true, host);
  }
  for (const host of [
    'example.com', 'tdat00.github.io', 'localhost.example.com', 'notlocal', 'local', 'my.locale',
    '8.8.8.8', '1.1.1.1', '11.0.0.1', '126.0.0.1', '128.0.0.1', '172.15.255.255', '172.32.0.1', '192.167.0.1', '192.169.0.1', '169.253.0.1', '169.255.0.1', '999.1.1.1',
    '[2001:4860:4860::8888]', '2001:db8::1', 'fe00::1', 'fec0::1', 'fbff::1', 'fe7f::1', '::ffff:808:808', '::ffff:ac0f:1', '::2', '::',
  ]) {
    assert.equal(isLocalHost(host), false, host);
  }
});

test('the target is the page\'s own Player on the public web and the configured public Player from a local page', () => {
  assert.equal(PUBLIC_PLAYER_URL, 'https://tdat00.github.io/pentomino/player/');
  assert.deepEqual(puzzlePlayerTarget('https://tdat00.github.io/pentomino/generator/index.html?x=1#y'),
    { target: 'https://tdat00.github.io/pentomino/player/', local: false, notice: null });
  assert.deepEqual(puzzlePlayerTarget('https://Example.org/My-Fork/Pentomino/generator/'),
    { target: 'https://example.org/My-Fork/Pentomino/player/', local: false, notice: null }, 'a fork keeps its case-sensitive path');
  assert.deepEqual(puzzlePlayerTarget(new URL('https://example.org/player/')).target, 'https://example.org/player/', 'a URL object works; the Player itself');
  assert.equal(puzzlePlayerTarget('https://8.8.8.8/pentomino/generator/').local, false);
  assert.equal(puzzlePlayerTarget('https://[2001:4860:4860::8888]/pentomino/generator/').local, false);
  const own = 'http://localhost:8705/pentomino/player/';
  for (const page of [
    'http://localhost:8705/pentomino/generator/', 'http://pentomino.localhost:8705/pentomino/generator/', 'http://box.local/pentomino/generator/',
    'http://127.0.0.1:8705/pentomino/generator/', 'http://10.1.2.3/pentomino/generator/', 'http://172.20.0.4/pentomino/generator/',
    'http://192.168.1.20:8080/pentomino/generator/', 'http://169.254.1.1/pentomino/generator/', 'http://[::1]:8705/pentomino/generator/',
    'http://[fd00::5]/pentomino/generator/', 'http://[fe80::1]/pentomino/generator/', 'http://[::ffff:192.168.0.1]/pentomino/generator/', 'http://LOCALHOST./pentomino/generator/',
    'file:///Q:/git/pentomino/generator/index.html', 'ftp://example.org/pentomino/generator/',
  ]) {
    assert.deepEqual(puzzlePlayerTarget(page), { target: PUBLIC_PLAYER_URL, local: true, notice: 'localTarget' }, page);
  }
  assert.deepEqual(puzzlePlayerTarget('http://localhost:8705/pentomino/generator/', { useThisPage: true }), { target: own, local: true, notice: 'devTarget' });
  assert.deepEqual(puzzlePlayerTarget('file:///Q:/git/pentomino/generator/index.html', { useThisPage: true }),
    { target: 'file:///Q:/git/pentomino/player/', local: true, notice: 'devTarget' });
  assert.equal(puzzlePlayerTarget('ftp://example.org/pentomino/generator/', { useThisPage: true }).target, PUBLIC_PLAYER_URL, 'only http, https and file pages can be the override');
  assert.deepEqual(puzzlePlayerTarget('about:blank', { useThisPage: true }), { target: PUBLIC_PLAYER_URL, local: true, notice: 'localTarget' });
  assert.deepEqual(puzzlePlayerTarget('https://example.org/pentomino/generator/', { useThisPage: true }),
    { target: 'https://example.org/pentomino/player/', local: false, notice: null }, 'the override is only for local pages');
  assert.throws(() => puzzlePlayerTarget('not a url'), RangeError);
});

test('the QR the sheet prints decodes to exactly the address Copy would use', async () => {
  const snapshot = snapshotOf(0);
  for (const target of [PUBLIC_PLAYER_URL, 'https://example.org/My-Fork/player/', 'http://192.168.1.20:8705/pentomino/player/']) {
    const share = await preparePuzzleShare(snapshot, { target, client: codecClient });
    assert.equal(share.url, puzzleCodeUrl(target, share.code.F));
    assert.equal(share.qr?.url, share.url);
    assert.equal(share.qr?.ec, 'M');
    assert.equal(share.qr?.code, share.code.F);
    assert.equal(decodeQr(/** @type {NonNullable<typeof share.qr>} */ (share.qr).rows)?.data, share.url, 'an independent decoder reads the same address');
    assert.deepEqual(share.notices, []);
    // Print and Copy call the same function with the same snapshot and target: one result.
    const again = await preparePuzzleShare(snapshotOf(0), { target, client: codecClient });
    assert.deepEqual(again, share);
  }
  const share = await preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client: codecClient, targetNotice: 'localTarget' });
  assert.deepEqual(share.notices, ['localTarget']);
  assert.ok(Object.isFrozen(share) && Object.isFrozen(share.notices) && Object.isFrozen(share.code));
  const dev = await preparePuzzleShare(snapshot, { target: 'file:///Q:/git/pentomino/player/', client: codecClient, targetNotice: 'devTarget' });
  assert.ok(dev.url?.startsWith('file:///Q:/git/pentomino/player/#p='));
  assert.deepEqual(dev.notices, ['devTarget']);
  assert.equal(decodeQr(/** @type {NonNullable<typeof dev.qr>} */ (dev.qr).rows)?.data, dev.url);
});

test('a puzzle without a stored answer has no tail and no dot', async () => {
  const snapshot = snapshotOf(0, { puzzle: { ...pack.puzzles[0], solution: null } });
  const share = await preparePuzzleShare(snapshot, { target: PUBLIC_PLAYER_URL, client: codecClient });
  assert.equal(share.code.T, null);
  assert.equal(share.code.F, share.code.C);
  assert.equal(share.carried, 'C');
  assert.ok(/#p=[0-9A-Z]+$/.test(share.url ?? ''), 'no dot in the address');
  assert.deepEqual(share.notices, []);
});

test('the capacity ladder: full code, then without the tail, then error correction L, then no QR at all', async () => {
  const prefixBytes = new TextEncoder().encode(`${PUBLIC_PLAYER_URL}#p=`).length;
  assert.equal(prefixBytes, 45);

  const full = await preparePuzzleShare(snapshotOf(), { target: PUBLIC_PLAYER_URL, client: fixedClient(symbols(1000), symbols(200)) });
  assert.equal(full.carried, 'C.T');
  assert.equal(full.qr?.ec, 'M');
  assert.deepEqual(full.notices, []);
  assert.equal(full.code.F.length, 1201);

  // 3,322 code characters is the most a version-40 M symbol holds behind this prefix.
  const edge = await preparePuzzleShare(snapshotOf(), { target: PUBLIC_PLAYER_URL, client: fixedClient(symbols(3000), symbols(321)) });
  assert.equal(edge.carried, 'C.T', 'F of 3,322 characters still fits');
  assert.equal(edge.qr?.version, 40);
  assert.equal(edge.qr?.outerMm, 92.5);

  const noTail = await preparePuzzleShare(snapshotOf(), { target: PUBLIC_PLAYER_URL, client: fixedClient(symbols(3000), symbols(322)) });
  assert.equal(noTail.carried, 'C', 'one more character: the tail is dropped from text and QR');
  assert.deepEqual(noTail.code, { C: symbols(3000), T: null, F: symbols(3000), version: 1 }, 'T = null and F = C, not a hidden richer F');
  assert.equal(noTail.qr?.ec, 'M');
  assert.deepEqual(noTail.notices, ['noTail']);
  assert.equal(noTail.url, `${PUBLIC_PLAYER_URL}#p=${symbols(3000)}`);

  const low = await preparePuzzleShare(snapshotOf(), { target: PUBLIC_PLAYER_URL, client: fixedClient(symbols(3500), symbols(100)) });
  assert.equal(low.carried, 'C');
  assert.equal(low.qr?.ec, 'L');
  assert.equal(low.code.T, null);
  assert.deepEqual(low.notices, ['noTail', 'lowEc']);
  assert.equal(decodeQr(/** @type {NonNullable<typeof low.qr>} */ (low.qr).rows)?.data, low.url);

  const lowOnly = await preparePuzzleShare(snapshotOf(), { target: PUBLIC_PLAYER_URL, client: fixedClient(symbols(4000), null) });
  assert.deepEqual(lowOnly.notices, ['lowEc'], 'nothing to drop: only the error correction notice');
  assert.equal(lowOnly.carried, 'C');

  const none = await preparePuzzleShare(snapshotOf(), { target: PUBLIC_PLAYER_URL, client: fixedClient(symbols(4300), symbols(100)), targetNotice: 'localTarget' });
  assert.equal(none.qr, null, 'neither code nor QR on the sheet');
  assert.equal(none.carried, 'C');
  assert.equal(none.code.T, null);
  assert.deepEqual(none.notices, ['noTail', 'none', 'localTarget']);
  assert.equal(none.url, `${PUBLIC_PLAYER_URL}#p=${symbols(4300)}`, 'a core address within the URL budget can still be copied');

  const noneNoTail = await preparePuzzleShare(snapshotOf(), { target: PUBLIC_PLAYER_URL, client: fixedClient(symbols(5000), null) });
  assert.deepEqual(noneNoTail.notices, ['none']);
  assert.ok(noneNoTail.url !== null && noneNoTail.url.length < 16000);

  const hugeTarget = `https://example.org/${'p'.repeat(16000)}/`;
  const noUrl = await preparePuzzleShare(snapshotOf(), { target: hugeTarget, client: fixedClient(symbols(40), null) });
  assert.equal(noUrl.qr, null);
  assert.equal(noUrl.url, null, 'an address over 16,000 characters is not a working link');
  assert.deepEqual(noUrl.notices, ['none']);
});

test('the Generator prints the displayed heading, no puzzle seed, and carries the same code as the Player', async () => {
  const { printJobOf } = await import('../generator/ui/puzzle-panel.js');
  const { setLocale } = await import('../generator/i18n.js');
  const { packBoard } = await import('../core/engine/pack.js');
  const engine = pack.puzzles.map((/** @type {Record<string, unknown>} */ p, /** @type {number} */ i) => ({
    ...p, id: `g${i}`, title: ['Easy #1', 'Normal #2', 'Hard #3'][i], seed: `seed-${i}`, certificate: { status: 'unique', model: 'dlx-v1', rowLimit: 9, verified: true },
  }));
  const state = /** @type {any} */ ({
    set: { board: packBoard(pack), pieces: pack.pieces, witness: null, carving: 'flat', macroRegion: null },
    puzzles: engine,
    rotation: 90,
    setSeed: 'ABCD-EFGH-JKLM',
    calibrationFor: { levelId: 'expert' },
  });
  const job = /** @type {NonNullable<ReturnType<typeof printJobOf>>} */ (printJobOf(state, 'g2'));
  assert.equal(job.title, 'Hard #3', 'the displayed title, not the card heading "Puzzle #3"');
  assert.equal(job.snapshot?.heading, 'Hard #3');
  assert.equal(job.rotation, 90);
  assert.equal(job.solution?.length, pack.pieces.length, 'the Generator keeps its Print solution option');
  const lines = job.details.map((line) => line.map((part) => part.text).join(''));
  assert.deepEqual(lines, ['Hard: score 21', 'Set: Expert, ABCD-EFGH-JKLM'], 'the rating and the set; the puzzle seed is gone');
  assert.equal(printJobOf(state, 'missing'), null);
  assert.equal(printJobOf({ ...state, set: null }, 'g2'), null);

  // The same puzzle at the same angle gives the same code from the Player's pack puzzle.
  const stored = { ...pack.puzzles[2], title: 'Hard #3', certificate: { status: 'unique', model: 'dlx-v1', rowLimit: 9 } };
  const player = puzzleSnapshot({ rows: pack.board.rows, pieces: pack.pieces, puzzle: stored, index: 2, rotation: 90, untitled: english });
  assert.equal(job.snapshot?.key, player.key);
  const a = await preparePuzzleShare(/** @type {any} */ (job.snapshot), { target: PUBLIC_PLAYER_URL, client: codecClient });
  const b = await preparePuzzleShare(player, { target: PUBLIC_PLAYER_URL, client: codecClient });
  assert.deepEqual(a, b);

  // An untitled puzzle is "Puzzle #n" / "Đề #n" in the language of the sheet.
  const untitled = { ...state, puzzles: [{ ...engine[0], title: undefined }, { ...engine[1], title: undefined }] };
  assert.equal(printJobOf(untitled, 'g1')?.title, 'Puzzle #2');
  setLocale('vi');
  try {
    assert.equal(printJobOf(untitled, 'g1')?.title, 'Đề #2');
    assert.equal(printJobOf(untitled, 'g1')?.snapshot?.data.title, 'Đề #2', 'literal, kind 3, in the language of the sheet');
  } finally {
    setLocale('en');
  }
});

test('a worker or encoder failure is an error, never an oversize puzzle', async () => {
  const failing = { encode: async () => ({ ok: /** @type {const} */ (false), issues: [{ code: 'worker-error', path: '$', message: 'The worker stopped.' }] }) };
  await assert.rejects(preparePuzzleShare(snapshotOf(), { target: PUBLIC_PLAYER_URL, client: failing }), (error) => {
    assert.ok(error instanceof PuzzleShareError);
    assert.equal(error.code, 'encode-failed');
    assert.equal(error.message, 'The worker stopped.');
    assert.equal(error.issues[0].code, 'worker-error');
    return true;
  });
  const aborted = new Error('superseded');
  await assert.rejects(preparePuzzleShare(snapshotOf(), { target: PUBLIC_PLAYER_URL, client: { encode: async () => { throw aborted; } } }), (error) => error === aborted);
  await assert.rejects(preparePuzzleShare(snapshotOf(), { target: 'ftp://example.org/player/', client: fixedClient(symbols(40), null) }),
    (error) => error instanceof PuzzleShareError && error.code === 'target-invalid');
});
