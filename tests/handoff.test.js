// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parsePack } from '../core/engine/pack.js';
import { MAX_URL_CHARS, WARN_URL_CHARS } from '../core/engine/sharecode.js';
import { copyText, downloadText, el, safeFileName, showToast } from '../core/browser/dom.js';
import {
  HandoffError, PIECE_SET_MESSAGE, openInPlayerTab, preparePlayerLink, readIncoming, readPack, readPuzzleCode,
} from '../core/browser/handoff.js';
import { createStorage } from '../core/browser/storage.js';
import { isPuzzleHash } from '../core/engine/sharecode.js';

const fixtureText = readFileSync(new URL('./fixtures/hand-authored-pack.json', import.meta.url), 'utf8');
const parsed = parsePack(fixtureText);
assert.ok(parsed.ok);
const pack = parsed.value;
const PREFIX_BASE = 'https://tdat00.github.io/pentomino/generator/';

/**
 * Pack whose provenance carries `bytes` pseudo-random bytes as hex, so it
 * barely compresses and its link length is predictable.
 * @param {number} bytes
 */
function noisy(bytes) {
  let s = 12345;
  let hex = '';
  for (let i = 0; i < bytes; i += 1) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    hex += ((s >>> 16) & 255).toString(16).padStart(2, '0');
  }
  return { ...pack, generation: { noise: hex } };
}

/** @param {Partial<Record<'saveLibraryPack' | 'loadLibraryPack', Function>>} [over] */
function stubStore(over = {}) {
  const calls = { save: 0 };
  return {
    calls,
    saveLibraryPack: /** @type {any} */ (over.saveLibraryPack ?? (() => {
      calls.save += 1;
      return { ok: true, packId: '0123456789abcdef' };
    })),
    loadLibraryPack: /** @type {any} */ (over.loadLibraryPack ?? (() => ({ ok: true, value: pack, warnings: [] }))),
  };
}

test('portable link: prefix-hosted and root-hosted bases, no warning when short', async () => {
  const prefixed = await preparePlayerLink(pack, 0, { base: PREFIX_BASE });
  assert.equal(prefixed.portable, true);
  assert.equal(prefixed.warning, undefined);
  assert.match(prefixed.href ?? '', /^https:\/\/tdat00\.github\.io\/pentomino\/player\/#pack=1z\.[A-Za-z0-9_-]+&i=0$/);
  const rooted = await preparePlayerLink(pack, 0, { base: 'http://localhost:8080/generator/' });
  assert.match(rooted.href ?? '', /^http:\/\/localhost:8080\/player\/#pack=1z\./);
  assert.ok((prefixed.href ?? '').length < WARN_URL_CHARS);
  const another = await preparePlayerLink({ ...pack, puzzles: [pack.puzzles[0], pack.puzzles[0]] }, 1, { base: PREFIX_BASE });
  assert.match(another.href ?? '', /&i=1$/);
});

test('portable links above 4,000 characters warn but stay portable', async () => {
  const link = await preparePlayerLink(noisy(3500), 0, { base: PREFIX_BASE });
  assert.equal(link.portable, true);
  assert.ok((link.href ?? '').length > WARN_URL_CHARS && (link.href ?? '').length <= MAX_URL_CHARS, `${link.href?.length}`);
  assert.match(link.warning ?? '', /^This link is \d+ characters long, and some chat apps cut long links\.$/);
});

test('links over 16,000 characters fall back to a labeled local link after readback', async () => {
  const store = stubStore();
  const link = await preparePlayerLink(noisy(14000), 0, { base: PREFIX_BASE, storage: store });
  assert.equal(link.portable, false);
  assert.equal(link.href, `${PREFIX_BASE.replace('generator/', 'player/')}#lib=0123456789abcdef&i=0`);
  assert.equal(link.warning, 'This link only works in this browser and cannot be shared.');
  assert.equal(store.calls.save, 1);
});

test('a share code too big for the decoder also falls back to the library', async () => {
  const store = stubStore();
  const link = await preparePlayerLink({ ...pack, generation: { filler: 'a'.repeat(300 * 1024) } }, 0, { base: PREFIX_BASE, storage: store });
  assert.equal(link.portable, false);
  assert.match(link.href ?? '', /#lib=/);
});

test('no link is claimed when saving or readback fails, or the index is invalid', async () => {
  const big = noisy(14000);
  const failedSave = await preparePlayerLink(big, 0, {
    base: PREFIX_BASE,
    storage: stubStore({ saveLibraryPack: () => ({ ok: false, code: 'quota', message: 'full' }) }),
  });
  assert.equal(failedSave.href, null);
  assert.equal(failedSave.portable, false);
  assert.equal(failedSave.warning, "This puzzle is too large for a link and can't be saved in this browser.");
  const failedReadback = await preparePlayerLink(big, 0, {
    base: PREFIX_BASE,
    storage: stubStore({ loadLibraryPack: () => ({ ok: false, issues: [] }) }),
  });
  assert.equal(failedReadback.href, null);
  for (const [p, i] of /** @type {[typeof pack, number][]} */ ([[pack, 1], [pack, -1], [pack, 0.5], [{ ...pack, kind: 'piece-set', puzzles: [] }, 0]])) {
    const link = await preparePlayerLink(p, i, { base: PREFIX_BASE, storage: stubStore() });
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
  const store = stubStore();
  await openInPlayerTab(pack, 0, { base: PREFIX_BASE, openTab, storage: store });
  assert.deepEqual([opened, closed, visited.length], [1, 0, 1]);
  assert.match(visited[0], /\/pentomino\/player\/#pack=1z\./);
  assert.equal(store.calls.save, 0, 'a portable link needs no saved copy');

  await assert.rejects(
    openInPlayerTab(noisy(14000), 0, {
      base: PREFIX_BASE,
      openTab,
      storage: stubStore({ saveLibraryPack: () => ({ ok: false, code: 'storage-unavailable', message: 'no' }) }),
    }),
    (error) => error instanceof HandoffError && error.code === 'handoff-unavailable',
  );
  assert.deepEqual([opened, closed, visited.length], [2, 1, 1], 'the empty tab is closed and nothing is shown without a link');

  await assert.rejects(
    openInPlayerTab(pack, 0, { base: PREFIX_BASE, openTab: () => null, storage: stubStore() }),
    (error) => error instanceof HandoffError && error.code === 'popup-blocked',
  );
});

test('readIncoming loads portable links and local library links without mutating anything', async () => {
  const link = await preparePlayerLink({ ...pack, puzzles: [pack.puzzles[0], { ...pack.puzzles[0], id: 'example-2' }] }, 1, { base: PREFIX_BASE });
  assert.ok(link.href);
  const incoming = await readIncoming({ hash: new URL(link.href).hash });
  assert.ok(incoming.ok);
  assert.equal(incoming.value.index, 1);
  assert.equal(incoming.value.pack.puzzles[1].id, 'example-2');

  /** @type {Map<string, string>} */
  const data = new Map();
  const writes = { n: 0 };
  const adapter = {
    get length() {
      return data.size;
    },
    key: (/** @type {number} */ i) => [...data.keys()][i] ?? null,
    getItem: (/** @type {string} */ k) => data.get(k) ?? null,
    setItem: (/** @type {string} */ k, /** @type {string} */ v) => {
      writes.n += 1;
      data.set(k, v);
    },
    removeItem: (/** @type {string} */ k) => void data.delete(k),
  };
  const storage = createStorage(adapter, () => 1_800_000_000_000);
  const saved = storage.saveLibraryPack(pack);
  assert.ok(saved.ok);
  const before = writes.n;
  const local = await readIncoming({ hash: `#lib=${saved.packId}&i=0` }, { storage });
  assert.ok(local.ok);
  assert.equal(local.value.pack.puzzles[0].id, 'example-1');
  assert.equal(writes.n, before, 'the loader does not write');
  const stale = await readIncoming({ hash: '#lib=0123456789abcdef&i=0' }, { storage });
  assert.ok(!stale.ok);
  assert.equal(stale.issues[0].code, 'library-missing');
});

test('readIncoming reports bad addresses, indexes, codes and piece sets', async () => {
  const href = /** @type {string} */ ((await preparePlayerLink(pack, 0, { base: PREFIX_BASE })).href);
  const code = new URL(href).hash.slice(6).split('&')[0];
  /** @type {[string, string][]} */
  const cases = [
    ['', 'no-incoming'],
    ['#', 'no-incoming'],
    ['#foo=1', 'no-incoming'],
    [`#pack=${code}&i=1`, 'index-out-of-range'],
    [`#pack=${code}&i=-1`, 'invalid-index'],
    [`#pack=${code}&i=zero`, 'invalid-index'],
    ['#pack=2z.abc', 'invalid-code'],
    ['#pack=1z.AAAA', 'invalid-compression'],
    ['#lib=nothex', 'invalid-hash'],
  ];
  for (const [hash, expected] of cases) {
    const result = await readIncoming({ hash });
    assert.ok(!result.ok, hash);
    assert.equal(result.issues[0].code, expected, hash);
  }
  const set = { ...pack, kind: /** @type {'piece-set'} */ ('piece-set'), puzzles: [] };
  const setStore = stubStore({ loadLibraryPack: () => ({ ok: true, value: set, warnings: [] }) });
  const result = await readIncoming({ hash: '#lib=0123456789abcdef' }, { storage: setStore });
  assert.ok(!result.ok);
  assert.equal(result.issues[0].code, 'piece-set');
  assert.equal(result.issues[0].message, PIECE_SET_MESSAGE);
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

/** A store that must never be touched by a `#p=` load. */
const untouchedStore = /** @type {any} */ (new Proxy({}, { get: (_t, name) => () => assert.fail(`storage.${String(name)} was used`) }));

test('readIncoming opens #p= through the injected decoder: one puzzle, index 0, nothing saved', async () => {
  const spy = spyDecoder();
  const result = await readIncoming({ hash: `#p=${GOLDEN_CODE}` }, { decodePuzzle: spy.decodePuzzle, storage: untouchedStore });
  assert.ok(result.ok);
  assert.equal(result.value.pack, pack);
  assert.equal(result.value.index, 0);
  assert.deepEqual(spy.calls, [GOLDEN_CODE]);
  const withIndex = await readIncoming({ hash: `#p=${GOLDEN_CODE}&i=0` }, { decodePuzzle: spy.decodePuzzle, storage: untouchedStore });
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
    const result = await readIncoming({ hash }, { decodePuzzle: spy.decodePuzzle, storage: untouchedStore });
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
  const result = await readIncoming({ hash: `#p=${GOLDEN_CODE}` }, { decodePuzzle: spyDecoder(() => failing).decodePuzzle, storage: untouchedStore });
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
  const result = await readIncoming({ hash: `#p=${GOLDEN_CODE}` }, { storage: untouchedStore });
  assert.ok(!result.ok);
  assert.equal(result.issues[0].code, 'worker-unavailable');
});

test('#pack= and #lib= keep their loaders and never call the puzzle decoder', async () => {
  const spy = spyDecoder();
  const link = await preparePlayerLink(pack, 0, { base: PREFIX_BASE });
  assert.ok(link.href);
  const portable = await readIncoming({ hash: new URL(link.href).hash }, { decodePuzzle: spy.decodePuzzle });
  assert.ok(portable.ok);
  const local = await readIncoming({ hash: '#lib=0123456789abcdef&i=0' }, {
    decodePuzzle: spy.decodePuzzle, storage: stubStore({ loadLibraryPack: () => ({ ok: true, value: pack, warnings: [] }) }),
  });
  assert.ok(local.ok);
  const mixed = await readIncoming({ hash: `${new URL(link.href).hash}&p=${GOLDEN_CODE}` }, { decodePuzzle: spy.decodePuzzle });
  assert.ok(!mixed.ok);
  assert.equal(mixed.issues[0].code, 'invalid-hash');
  assert.deepEqual(spy.calls, []);
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
