// @ts-check
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { packBoard, parsePack } from '../core/engine/pack.js';
import { progressFingerprint } from '../core/engine/keys.js';
import { MAX_PROGRESS_ENTRIES, NAMESPACE, SAVE_FAILED_MESSAGE, createStorage } from '../core/browser/storage.js';
import defaultStorage, * as storageModule from '../core/browser/storage.js';

const parsed = parsePack(readFileSync(new URL('./fixtures/hand-authored-pack.json', import.meta.url), 'utf8'));
assert.ok(parsed.ok);
const pack = parsed.value;
const FOREIGN = { 'other-app:state': 'foreign-1', 'pentomino:v2:thing': 'foreign-2', theme: 'dark' };

/**
 * In-memory Web Storage with call logs and optional failure modes.
 * @param {Record<string, string>} [seed]
 * @param {{ maxKeys?: number, alwaysQuota?: boolean, deny?: boolean }} [mode]
 */
function fakeStorage(seed = {}, mode = {}) {
  const data = new Map(Object.entries(seed));
  const log = { get: /** @type {string[]} */ ([]), set: /** @type {string[]} */ ([]), remove: /** @type {string[]} */ ([]) };
  const quota = () => Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' });
  const denied = () => Object.assign(new Error('The operation is insecure.'), { name: 'SecurityError' });
  return {
    data,
    log,
    mode,
    get length() {
      if (mode.deny) {
        throw denied();
      }
      return data.size;
    },
    /** @param {number} i */
    key(i) {
      return [...data.keys()][i] ?? null;
    },
    /** @param {string} k */
    getItem(k) {
      log.get.push(k);
      if (mode.deny) {
        throw denied();
      }
      return data.get(k) ?? null;
    },
    /** @param {string} k @param {string} v */
    setItem(k, v) {
      log.set.push(k);
      if (mode.deny) {
        throw denied();
      }
      if (mode.alwaysQuota || (mode.maxKeys !== undefined && !data.has(k) && data.size >= mode.maxKeys)) {
        throw quota();
      }
      data.set(k, v);
    },
    /** @param {string} k */
    removeItem(k) {
      log.remove.push(k);
      if (mode.deny) {
        throw denied();
      }
      data.delete(k);
    },
  };
}

/** @param {number} [start] */
function clock(start = Date.UTC(2026, 9, 22)) {
  let t = start;
  return () => {
    t += 1000;
    return t;
  };
}

const record = (solved = false, moves = 3) => ({
  v: /** @type {1} */ (1),
  placements: [{ piece: 'B', x: 1, y: 0, turn: /** @type {0} */ (0), mirrored: false }],
  elapsedMs: 1234,
  moves,
  solved,
});

test('get/set/remove/list refuse foreign keys and never touch foreign values', () => {
  const fake = fakeStorage(FOREIGN);
  const store = createStorage(fake, clock());
  assert.equal(store.get('theme'), null);
  assert.equal(store.set('theme', 'light').ok, false);
  assert.equal(store.remove('other-app:state').ok, false);
  assert.deepEqual(store.list('other-app:'), []);
  assert.deepEqual(store.list(''), []);
  store.saveProgress('abc123', record());
  store.setPrefs({ straighten: true });
  store.setGeneratorState({ rows: 4 });
  store.getGeneratorState();
  store.loadProgress('abc123');
  assert.deepEqual(store.list(`${NAMESPACE}progress:`), [`${NAMESPACE}progress:abc123`]);
  for (const key of [...fake.log.get, ...fake.log.set, ...fake.log.remove]) {
    assert.ok(key.startsWith(NAMESPACE), `touched ${key}`);
  }
  assert.deepEqual(Object.fromEntries([...fake.data].filter(([k]) => !k.startsWith(NAMESPACE))), FOREIGN);
});

test('quota evicts only namespaced LRU entries and retries once', () => {
  const fake = fakeStorage(FOREIGN);
  const store = createStorage(fake, clock());
  for (let i = 0; i < 10; i += 1) {
    assert.ok(store.saveProgress(`fp${i}`, record()).ok);
  }
  fake.mode.maxKeys = fake.data.size;
  fake.log.set.length = 0;
  const saved = store.saveProgress('fp-new', record());
  assert.ok(saved.ok, JSON.stringify(saved));
  const newKey = `${NAMESPACE}progress:fp-new`;
  assert.equal(fake.log.set.filter((k) => k === newKey).length, 2, 'one retry');
  const left = store.list(`${NAMESPACE}progress:`).map((k) => k.slice(`${NAMESPACE}progress:`.length));
  assert.deepEqual(left.sort(), ['fp-new', 'fp3', 'fp4', 'fp5', 'fp6', 'fp7', 'fp8', 'fp9'], 'oldest quarter evicted');
  assert.equal(store.loadProgress('fp0'), null);
  assert.ok(store.loadProgress('fp9'));
  assert.deepEqual(Object.fromEntries([...fake.data].filter(([k]) => !k.startsWith(NAMESPACE))), FOREIGN);
});

test('persistent quota failure keeps working in memory with the user message', () => {
  const fake = fakeStorage(FOREIGN);
  const store = createStorage(fake, clock());
  for (let i = 0; i < 4; i += 1) {
    store.saveProgress(`fp${i}`, record());
  }
  fake.mode.alwaysQuota = true;
  fake.log.set.length = 0;
  const result = store.setPrefs({ straighten: true });
  assert.deepEqual(result, { ok: false, code: 'quota', message: SAVE_FAILED_MESSAGE });
  assert.equal(fake.log.set.filter((k) => k === `${NAMESPACE}prefs`).length, 2, 'exactly one retry');
  assert.equal(store.getPrefs().straighten, true, 'still readable from memory');
  assert.equal(store.lastStorageIssue()?.message, SAVE_FAILED_MESSAGE);
  assert.equal(store.lastStorageIssue()?.code, 'quota');
  store.clearStorageIssue();
  assert.equal(store.lastStorageIssue(), null);
  const bare = fakeStorage({}, { alwaysQuota: true });
  const empty = createStorage(bare, clock());
  assert.equal(empty.setPrefs({ straighten: true }).ok, false);
  assert.equal(bare.log.set.length, 1, 'nothing to evict, no pointless retry');
});

test('denied or missing storage never throws and play continues in memory', () => {
  for (const adapter of [fakeStorage({}, { deny: true }), null, undefined]) {
    const store = createStorage(adapter, clock());
    assert.equal(store.get(`${NAMESPACE}prefs`), null);
    assert.deepEqual(store.getPrefs(), { straighten: false });
    const written = store.setPrefs({ straighten: true });
    assert.equal(written.ok, false);
    assert.equal(/** @type {any} */ (written).code, 'storage-unavailable');
    assert.equal(store.getPrefs().straighten, true);
    assert.equal(store.saveProgress('abc', record(true)).ok, false);
    assert.equal(store.loadProgress('abc')?.solved, true);
    assert.ok(store.list(NAMESPACE).includes(`${NAMESPACE}prefs`), 'unsaved values are still listed');
    assert.ok(store.lastStorageIssue());
    assert.equal(store.remove(`${NAMESPACE}prefs`).ok, adapter ? false : true);
  }
});

test('progress: validation, stamped LRU time, 300-entry LRU and exact-geometry keys', () => {
  const fake = fakeStorage(FOREIGN);
  const now = clock();
  const store = createStorage(fake, now);
  assert.equal(store.saveProgress('abc', /** @type {any} */ ({ ...record(), moves: -1 })).ok, false);
  assert.equal(store.saveProgress('../x', record()).ok, false);
  assert.equal(store.saveProgress('abc', /** @type {any} */ ({ ...record(), placements: [{ piece: 1 }] })).ok, false);
  assert.ok(store.saveProgress('abc', /** @type {any} */ ({ ...record(true, 9), updatedAt: 1 })).ok);
  const loaded = store.loadProgress('abc');
  assert.equal(loaded?.moves, 9);
  assert.equal(JSON.parse(fake.data.get(`${NAMESPACE}progress:abc`) ?? '{}').updatedAt, undefined, 'a retired updatedAt is not written');
  const lru = /** @type {{ fp: string, at: number }[]} */ (store.get(`${NAMESPACE}progress-index`));
  assert.ok((lru.find((e) => e.fp === 'abc')?.at ?? 0) > Date.UTC(2026, 0, 1), 'the LRU index is stamped from the host clock');
  assert.equal(store.loadProgress('missing'), null);
  assert.equal(store.lastStorageIssue(), null, 'a missing entry is not an error');
  fake.data.set(`${NAMESPACE}progress:bad`, '{"v":2}');
  assert.equal(store.loadProgress('bad'), null);
  assert.equal(store.lastStorageIssue()?.code, 'invalid-data');

  for (let i = 0; i < MAX_PROGRESS_ENTRIES + 5; i += 1) {
    store.saveProgress(`fp${String(i).padStart(4, '0')}`, record());
  }
  const keys = store.list(`${NAMESPACE}progress:`);
  assert.equal(keys.length, MAX_PROGRESS_ENTRIES + 1, 'cap plus the unindexed damaged key');
  assert.equal(store.loadProgress('fp0000'), null);
  assert.ok(store.loadProgress('fp0304'));
  assert.equal(store.loadProgress('abc'), null, 'oldest saved was evicted');

  const full = pack.puzzles[0];
  const reduced = { ...full, clues: [full.clues[0]] };
  const other = { ...pack, puzzles: [reduced] };
  const board = packBoard(pack);
  const fpA = progressFingerprint(board, pack.pieces, full.clues);
  const fpB = progressFingerprint(board, other.pieces, reduced.clues);
  assert.equal(full.id, reduced.id);
  assert.notEqual(fpA, fpB);
  store.saveProgress(fpA, record(true));
  assert.equal(store.loadProgress(fpB), null, 'same public ID, different geometry: no shared progress');
});

test('removing progress drops the record and its LRU entry only', () => {
  const fake = fakeStorage(FOREIGN);
  const store = createStorage(fake, clock());
  store.saveProgress('one', record());
  store.saveProgress('two', record());
  assert.ok(store.removeProgress('one').ok);
  assert.equal(store.loadProgress('one'), null);
  assert.ok(store.loadProgress('two'));
  const lru = /** @type {{ fp: string }[]} */ (store.get(`${NAMESPACE}progress-index`));
  assert.deepEqual(lru.map((e) => e.fp), ['two']);
  assert.equal(store.removeProgress('../x').ok, false);
  assert.deepEqual(Object.fromEntries([...fake.data].filter(([k]) => !k.startsWith(NAMESPACE))), FOREIGN);
});

test('a lost progress index is rebuilt from key names only', () => {
  const fake = fakeStorage(FOREIGN);
  const store = createStorage(fake, clock());
  store.saveProgress('one', record());
  store.saveProgress('two', record());
  fake.data.delete(`${NAMESPACE}progress-index`);
  fake.log.get.length = 0;
  fake.mode.maxKeys = fake.data.size;
  assert.equal(store.setPrefs({ straighten: true }).ok, false, 'the rewritten index took the freed slot');
  assert.equal(fake.log.remove.filter((k) => k.startsWith(`${NAMESPACE}progress:`)).length, 1, 'rebuilt index let eviction find an LRU entry');
  assert.ok(fake.log.get.every((k) => k.startsWith(NAMESPACE)));
});

test('preferences default, validate, and drop retired fields', () => {
  const fake = fakeStorage({ [`${NAMESPACE}prefs`]: JSON.stringify({ labels: false, patterns: false, timer: false, largeBoards: true }) });
  const store = createStorage(fake, clock());
  assert.deepEqual(store.getPrefs(), { straighten: false }, 'retired fields are ignored');
  assert.ok(store.setPrefs({ straighten: /** @type {any} */ ('no'), bogus: true }).ok);
  assert.deepEqual(JSON.parse(fake.data.get(`${NAMESPACE}prefs`) ?? ''), { straighten: false }, 'and dropped by the next write');
  assert.ok(store.setPrefs({ straighten: true }).ok);
  assert.equal(createStorage(fake, clock()).getPrefs().straighten, true, 'another instance reads the stored value');
  fake.data.set(`${NAMESPACE}prefs`, '[1,2]');
  assert.equal(store.getPrefs().straighten, false);
  assert.equal(store.lastStorageIssue()?.code, 'invalid-data');
});

test('generator state round-trips arbitrary JSON and reports unserializable values', () => {
  const store = createStorage(fakeStorage(), clock());
  assert.equal(store.getGeneratorState(), null);
  const snapshot = { rows: ['##', '#.'], witness: [{ piece: 'A', x: 0, y: 0, turn: 0, mirrored: false }], seen: ['k1'] };
  assert.ok(store.setGeneratorState(snapshot).ok);
  assert.deepEqual(store.getGeneratorState(), snapshot);
  const cyclic = /** @type {any} */ ({});
  cyclic.self = cyclic;
  assert.equal(store.setGeneratorState(cyclic).ok, false);
  assert.deepEqual(store.getGeneratorState(), snapshot);
  const { set, get } = store;
  assert.ok(set(`${NAMESPACE}x`, 1).ok, 'methods work when destructured');
  assert.equal(get(`${NAMESPACE}x`), 1);
});

test('the default lazy instance works without a browser localStorage', () => {
  assert.deepEqual(defaultStorage.getPrefs(), storageModule.getPrefs());
  assert.equal(storageModule.get(`${NAMESPACE}nothing`), null);
});
