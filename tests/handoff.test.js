// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parsePack } from '../core/engine/pack.js';
import { MAX_URL_CHARS, WARN_URL_CHARS } from '../core/engine/sharecode.js';
import { copyText, el, safeFileName, showToast } from '../core/browser/dom.js';
import {
  HandoffError, PIECE_SET_MESSAGE, downloadPack, loadFromFile, loadFromText, openInPlayerTab, preparePlayerLink, readIncoming,
} from '../core/browser/handoff.js';
import { createStorage } from '../core/browser/storage.js';

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
  assert.match(link.warning ?? '', /Export file/);
});

test('links over 16,000 characters fall back to a labeled local link after readback', async () => {
  const store = stubStore();
  const link = await preparePlayerLink(noisy(14000), 0, { base: PREFIX_BASE, storage: store });
  assert.equal(link.portable, false);
  assert.equal(link.href, `${PREFIX_BASE.replace('generator/', 'player/')}#lib=0123456789abcdef&i=0`);
  assert.match(link.warning ?? '', /not shareable/);
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
  assert.match(failedSave.warning ?? '', /Download/);
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
  assert.equal(store.calls.save, 1, 'best-effort library save for Recent');

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

test('loadFromText and loadFromFile accept links, codes and JSON, and reject the rest', async () => {
  const href = /** @type {string} */ ((await preparePlayerLink(pack, 0, { base: PREFIX_BASE })).href);
  const code = new URL(href).hash.slice(6).split('&')[0];
  for (const text of [href, `Look: ${href} !`, code, ` ${code} `, JSON.stringify(pack), fixtureText]) {
    const result = await loadFromText(text);
    assert.ok(result.ok, text.slice(0, 30));
    assert.equal(result.value.index, 0);
    assert.equal(result.value.pack.puzzles[0].id, 'example-1');
  }
  const lib = await loadFromText('open https://x.test/player/#lib=0123456789abcdef&i=0 now', { storage: stubStore() });
  assert.ok(lib.ok);
  for (const text of ['', 'hello world', '{"format":"pentomino-pack"}', '[1,2]', '1z.AAAA']) {
    const result = await loadFromText(text);
    assert.ok(!result.ok, text);
  }
  const file = (/** @type {number} */ size, /** @type {string} */ text) => ({ size, text: async () => text });
  assert.ok((await loadFromFile(file(10, JSON.stringify(pack)))).ok);
  const big = await loadFromFile(file(512 * 1024 + 1, JSON.stringify(pack)));
  assert.ok(!big.ok);
  assert.equal(big.issues[0].code, 'pack-too-large');
  const unreadable = await loadFromFile({ size: 1, text: async () => { throw new Error('io'); } });
  assert.ok(!unreadable.ok);
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

test('downloadPack writes an importable .pentomino.json, optionally without solutions, and revokes the URL', async () => {
  await withFakeDom(async ({ doc, urls, timers }) => {
    downloadPack(pack, 'My: puzzle?.json');
    downloadPack(pack, '../evil/name.pentomino.json', { omitSolutions: true });
    downloadPack(pack, '???');
    const links = doc.created.filter((/** @type {any} */ n) => n.tagName === 'a');
    assert.deepEqual(links.map((/** @type {any} */ n) => n.attrs.download), ['My- puzzle.pentomino.json', 'evil-name.pentomino.json', 'puzzle.pentomino.json']);
    assert.deepEqual(links.map((/** @type {any} */ n) => n.clicks), [1, 1, 1]);
    assert.ok(links.every((/** @type {any} */ n) => n.removed));
    const full = await urls.made[0].text();
    const bare = await urls.made[1].text();
    assert.ok(full.includes('\n  "format"'), 'readable indentation');
    assert.ok(parsePack(full).ok && parsePack(bare).ok);
    assert.ok(full.includes('"solution"') && !bare.includes('"solution"') && !bare.includes('"witness"'));
    assert.deepEqual(urls.revoked, [], 'revoked after use, not before');
    timers.forEach((f) => f());
    assert.equal(urls.revoked.length, 3);
    assert.throws(() => downloadPack({ ...pack, generation: { filler: 'a'.repeat(600 * 1024) } }, 'x'), /exceeds/);
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
